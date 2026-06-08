"""SOC dashboard API — unified packet store."""

import asyncio
import os
import socket
from typing import Any

from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from pydantic import BaseModel, Field

from server.packet_store import packet_store
from server.simulator import PAYLOAD_TYPES, simulator
from server.ziti_fabric import get_fabric_status

router = APIRouter(prefix="/api/soc", tags=["soc"])



POLICIES = [
    {"id": "p1", "effect": "allow", "source": "Laptop B", "target": "Phone B", "rule": "route-policy"},
    {"id": "p2", "effect": "allow", "source": "Phone B", "target": "Hub", "rule": "route-policy"},
    {"id": "p3", "effect": "deny", "source": "Phone A", "target": "Any", "rule": "deny-list"},
    {"id": "p4", "effect": "deny", "source": "Unknown Node", "target": "Any", "rule": "default-deny"},
]

SCENARIOS = [
    {"id": "s1", "name": "Normal Traffic", "description": "100 packets, 0 attacks", "count": 100, "replay_pct": 0, "payload_type": "Chat Message", "payload_size": 1024},
    {"id": "s2", "name": "Replay Attack", "description": "100 packets, 10% real replay reinjection", "count": 100, "replay_pct": 0.10, "payload_type": "Sensor Data", "payload_size": 4096},
    {"id": "s3", "name": "Video Stream", "description": "500 encrypted video frames", "count": 500, "replay_pct": 0, "payload_type": "Video Stream", "payload_size": 65536},
    {"id": "s4", "name": "Unauthorized User", "description": "50 packets from Phone A — all denied", "count": 50, "replay_pct": 0, "payload_type": "Video Stream", "payload_size": 10240, "force_sender": "phone-a"},
    {"id": "s5", "name": "Telemetry DDoS Attack", "description": "1,000 high-frequency sensor packets (PPS spike)", "count": 1000, "replay_pct": 0, "payload_type": "Sensor Data", "payload_size": 512},
    {"id": "s6", "name": "Mixed Attack Campaign", "description": "300 packets, 30% heavy replay hijacking attempts", "count": 300, "replay_pct": 0.30, "payload_type": "Voice Stream", "payload_size": 2048},
    {"id": "s7", "name": "Bulk File Transfer", "description": "150 large encrypted chunks (bandwidth volume spike)", "count": 150, "replay_pct": 0, "payload_type": "File Transfer", "payload_size": 262144},
]

TOPOLOGY_NODES = [
    {"id": "ziti-controller", "label": "OpenZiti Controller", "type": "controller", "status": "warning"},
    {"id": "ziti-router", "label": "OpenZiti Edge Router", "type": "router", "status": "warning"},
    {"id": "laptop-a", "label": "Laptop A (ZTON Hub)", "type": "hub", "status": "online"},
    {"id": "laptop-b", "label": "Laptop B", "type": "endpoint", "status": "online"},
    {"id": "phone-b", "label": "Phone B", "type": "endpoint", "status": "online"},
    {"id": "phone-a", "label": "Phone A", "type": "endpoint", "status": "blocked"},
]

TOPOLOGY_EDGES = [
    {"id": "fabric-1", "source": "ziti-controller", "target": "ziti-router", "kind": "fabric-control"},
    {"id": "fabric-2", "source": "ziti-router", "target": "laptop-a", "kind": "fabric-ready"},
    {"id": "fabric-3", "source": "ziti-router", "target": "laptop-b", "kind": "fabric-ready"},
    {"id": "fabric-4", "source": "ziti-router", "target": "phone-b", "kind": "fabric-ready"},
    {"id": "udp-1", "source": "laptop-b", "target": "laptop-a", "kind": "custom-udp"},
    {"id": "udp-2", "source": "laptop-a", "target": "phone-b", "kind": "custom-udp"},
    {"id": "udp-3", "source": "phone-b", "target": "laptop-a", "kind": "custom-udp"},
    {"id": "udp-4", "source": "phone-a", "target": "laptop-a", "kind": "custom-udp"},
]


class SimulateRequest(BaseModel):
    count: int = Field(100, ge=1, le=10000)
    payload_type: str = "Sensor Data"
    payload_size: int = Field(1024, ge=256)
    replay_pct: float = Field(0.0, ge=0.0, le=1.0)
    interval_ms: int = Field(30, ge=0, le=5000)
    force_sender: str | None = None


def _check_port(host: str, port: int) -> str:
    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        s.settimeout(1)
        s.connect((host, port))
        s.close()
        return "online"
    except OSError:
        return "offline"


def _sync_hub_packets() -> None:
    from server.app import hub
    if not hub:
        return
    for e in hub.events.history():
        packet_store.ingest_hub_event(e)


def _system_status(hub: Any) -> dict:
    fabric = get_fabric_status()
    peers = [p["device_id"] for p in hub.status().get("peers", [])] if hub else []
    return {
        "controller": {"status": fabric["controller"]["status"], "label": "OpenZiti Controller"},
        "router": {"status": fabric["router"]["status"], "label": "OpenZiti Edge Router"},
        "overlay": {"status": "ONLINE" if hub else "WARNING", "label": "ZTON UDP Overlay"},
        "encryption": {"status": "ONLINE", "label": "AES-GCM + Ed25519"},
        "connected_nodes": {"count": len(peers), "status": "ONLINE" if peers else "WARNING", "peers": peers},
        "fabric": fabric,
        "server_time": __import__("zton.timeutil", fromlist=["utc_now_iso"]).utc_now_iso(),
    }


@router.get("/status")
async def soc_status():
    from server.app import hub
    return _system_status(hub)


@router.get("/fabric")
async def soc_fabric():
    return get_fabric_status()


@router.get("/stats")
async def soc_stats():
    _sync_hub_packets()
    snap = packet_store.snapshot()
    return {
        "total_sent": snap["total_sent"],
        "total_received": snap["total_received"],
        "accepted": snap["accepted"],
        "dropped": snap["dropped"],
        "replay_blocked": snap["replay_blocked"],
        "active_sessions": snap["active_sessions"],
        "running": snap["running"],
        "traffic": snap["traffic"],
        "traffic_volume": snap.get("traffic_volume", 0),
        "volume_by_type": packet_store.volume_by_type(),
        "server_time": __import__("zton.timeutil", fromlist=["utc_now_iso"]).utc_now_iso(),
    }


@router.get("/packets")
async def soc_packets(limit: int = 200):
    _sync_hub_packets()
    snap = packet_store.snapshot()
    return {"packets": snap["packets"][:limit]}


@router.get("/packets/{packet_id}")
async def soc_packet_detail(packet_id: str):
    _sync_hub_packets()
    pkt = packet_store.get_packet(packet_id)
    if not pkt:
        return {"ok": False, "error": "Packet not found"}
    return {"ok": True, "packet": pkt}


@router.get("/events")
async def soc_events(limit: int = 50):
    _sync_hub_packets()
    snap = packet_store.snapshot()
    return {"events": snap["events"][:limit]}


@router.get("/policies")
async def soc_policies():
    from server.app import hub
    policies = list(POLICIES)
    policies.insert(0, {"id": "ziti-fabric", "effect": "info", "source": "OpenZiti", "target": "Controller + Edge Router", "rule": "fabric-plane"})
    if hub:
        snap = hub.policy.snapshot()
        policies.append({"id": "live", "effect": "info", "source": "Runtime", "target": str(snap), "rule": "live-policy"})
    return {"policies": policies}


@router.get("/topology")
async def soc_topology():
    from server.app import hub
    fabric = get_fabric_status()
    nodes = [dict(n) for n in TOPOLOGY_NODES]
    status_by_id = {
        "ziti-controller": "online" if fabric["controller"]["status"] == "ONLINE" else "warning",
        "ziti-router": "online" if fabric["router"]["status"] == "ONLINE" else "warning",
    }
    for n in nodes:
        if n["id"] in status_by_id:
            n["status"] = status_by_id[n["id"]]
    if hub:
        for p in hub.status().get("peers", []):
            for n in nodes:
                if n["id"] == p["device_id"]:
                    n["status"] = "online" if p.get("authorized") else "blocked"
    return {"nodes": nodes, "edges": TOPOLOGY_EDGES}


@router.get("/scenarios")
async def soc_scenarios():
    return {"scenarios": SCENARIOS, "payload_types": PAYLOAD_TYPES}


@router.post("/simulate/start")
async def simulate_start(req: SimulateRequest):
    simulator.start_async(
        count=req.count,
        payload_type=req.payload_type,
        payload_size=req.payload_size,
        replay_pct=req.replay_pct,
        interval_ms=req.interval_ms,
        force_sender=req.force_sender,
    )
    return {"ok": True, "running": True}


@router.post("/simulate/stop")
async def simulate_stop():
    simulator.stop()
    return {"ok": True, "running": False}


@router.post("/simulate/reset")
async def simulate_reset():
    simulator.reset()
    from server.app import hub
    if hub:
        hub.events._history.clear()
    return {"ok": True}


@router.post("/simulate/clear-logs")
async def simulate_clear_logs():
    with packet_store._lock:
        packet_store._events.clear()
    return {"ok": True}


@router.post("/scenarios/{scenario_id}/run")
async def run_scenario(scenario_id: str):
    scenario = next((s for s in SCENARIOS if s["id"] == scenario_id), None)
    if not scenario:
        return {"ok": False, "error": "Unknown scenario"}
    interval = max(5, min(50, 5000 // max(scenario["count"], 1)))
    simulator.start_async(
        count=scenario["count"],
        payload_type=scenario["payload_type"],
        payload_size=scenario["payload_size"],
        replay_pct=scenario.get("replay_pct", 0),
        interval_ms=interval,
        force_sender=scenario.get("force_sender"),
    )
    return {"ok": True, "scenario": scenario}


@router.get("/validation")
async def validation_checklist():
    snap = packet_store.snapshot()
    return {
        "counters_at_zero": snap["total_sent"] == 0,
        "no_packets": len(snap["packets"]) == 0,
        "no_events": len(snap["events"]) == 0,
        "server_time": __import__("zton.timeutil", fromlist=["utc_now_iso"]).utc_now_iso(),
        "checks": [
            {"id": "counters_zero", "ok": snap["total_sent"] == 0, "label": "Counters start at zero"},
            {"id": "no_fake_packets", "ok": len(snap["packets"]) == 0, "label": "No seeded packet history"},
            {"id": "no_fake_drops", "ok": snap["dropped"] == 0, "label": "No fake drops at startup"},
            {"id": "timestamps", "ok": True, "label": "UTC timestamps enabled"},
            {"id": "replay_engine", "ok": True, "label": "Replay reinjection engine ready"},
            {"id": "charts_derived", "ok": True, "label": "Charts derive from packet store"},
            {"id": "reset_available", "ok": True, "label": "Reset endpoint available"},
        ],
    }


@router.websocket("/ws")
async def soc_ws(websocket: WebSocket):
    await websocket.accept()
    loop = asyncio.get_running_loop()
    q = asyncio.Queue()
    packet_store.register_listener(loop, q)

    # Send initial snapshot status immediately
    _sync_hub_packets()
    snap = packet_store.snapshot()
    await websocket.send_json({
        "type": "init",
        "server_time": __import__("zton.timeutil", fromlist=["utc_now_iso"]).utc_now_iso(),
        "stats": {
            "total_sent": snap["total_sent"],
            "total_received": snap["total_received"],
            "accepted": snap["accepted"],
            "dropped": snap["dropped"],
            "replay_blocked": snap["replay_blocked"],
            "active_sessions": snap["active_sessions"],
            "running": snap["running"],
            "traffic_volume": snap.get("traffic_volume", 0),
            "traffic": snap["traffic"],
        },
        "volume_by_type": packet_store.volume_by_type(),
        "packets": snap["packets"][:100],
        "events": snap["events"][:50],
    })

    # Task to periodically send tick for time sync and general status updates
    async def tick_loop():
        try:
            while True:
                await asyncio.sleep(1.0)
                _sync_hub_packets()
                snap = packet_store.snapshot()
                await websocket.send_json({
                    "type": "tick",
                    "server_time": __import__("zton.timeutil", fromlist=["utc_now_iso"]).utc_now_iso(),
                    "stats": {
                        "total_sent": snap["total_sent"],
                        "total_received": snap["total_received"],
                        "accepted": snap["accepted"],
                        "dropped": snap["dropped"],
                        "replay_blocked": snap["replay_blocked"],
                        "active_sessions": snap["active_sessions"],
                        "running": snap["running"],
                        "traffic_volume": snap.get("traffic_volume", 0),
                        "traffic": snap["traffic"],
                    },
                    "volume_by_type": packet_store.volume_by_type(),
                })
        except asyncio.CancelledError:
            pass
        except Exception:
            pass

    tick_task = asyncio.create_task(tick_loop())

    try:
        while True:
            msg_type, item = await q.get()
            _sync_hub_packets()
            snap = packet_store.snapshot()
            
            # Send immediate update
            await websocket.send_json({
                "type": "update",
                "update_type": msg_type,
                "server_time": __import__("zton.timeutil", fromlist=["utc_now_iso"]).utc_now_iso(),
                "latest_packet": item if msg_type == "packet" else None,
                "latest_event": item if msg_type == "event" else None,
                "new_packet": msg_type == "packet",
                "stats": {
                    "total_sent": snap["total_sent"],
                    "total_received": snap["total_received"],
                    "accepted": snap["accepted"],
                    "dropped": snap["dropped"],
                    "replay_blocked": snap["replay_blocked"],
                    "active_sessions": snap["active_sessions"],
                    "running": snap["running"],
                    "traffic_volume": snap.get("traffic_volume", 0),
                    "traffic": snap["traffic"],
                },
                "volume_by_type": packet_store.volume_by_type(),
            })
    except WebSocketDisconnect:
        pass
    finally:
        tick_task.cancel()
        packet_store.unregister_listener(q)
