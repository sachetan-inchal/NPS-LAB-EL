"""SOC dashboard API routes."""

import os
import socket
from typing import Any

from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from pydantic import BaseModel, Field

from server.simulator import simulator, PAYLOAD_TYPES

router = APIRouter(prefix="/api/soc", tags=["soc"])

POLICIES = [
    {"id": "p1", "effect": "allow", "source": "Laptop B", "target": "Video Service", "rule": "service-policy"},
    {"id": "p2", "effect": "allow", "source": "Phone B", "target": "Sensor Service", "rule": "service-policy"},
    {"id": "p3", "effect": "deny", "source": "Phone A", "target": "Video Service", "rule": "identity-policy"},
    {"id": "p4", "effect": "deny", "source": "Unknown Node", "target": "Any Service", "rule": "default-deny"},
]

SCENARIOS = [
    {"id": "s1", "name": "Normal Traffic", "description": "100 packets, 0 attacks", "count": 100, "replay_pct": 0, "payload_type": "Chat Message", "payload_size": 1024},
    {"id": "s2", "name": "Replay Attack", "description": "100 packets, 10% replay attempts", "count": 100, "replay_pct": 0.10, "payload_type": "Sensor Data", "payload_size": 4096},
    {"id": "s3", "name": "Video Stream", "description": "500 encrypted video frames", "count": 500, "replay_pct": 0, "payload_type": "Video Stream", "payload_size": 65536},
    {"id": "s4", "name": "Unauthorized User", "description": "Access denied by policy", "count": 50, "replay_pct": 0, "payload_type": "Video Stream", "payload_size": 10240, "force_sender": "phone-a"},
]

TOPOLOGY_NODES = [
    {"id": "controller", "label": "Controller", "type": "controller", "status": "online"},
    {"id": "router", "label": "Router", "type": "router", "status": "online"},
    {"id": "laptop-a", "label": "Laptop A", "type": "endpoint", "status": "online"},
    {"id": "laptop-b", "label": "Laptop B", "type": "endpoint", "status": "online"},
    {"id": "phone-a", "label": "Phone A", "type": "endpoint", "status": "warning"},
    {"id": "phone-b", "label": "Phone B", "type": "endpoint", "status": "online"},
]

TOPOLOGY_EDGES = [
    {"id": "e1", "source": "controller", "target": "router"},
    {"id": "e2", "source": "router", "target": "laptop-a"},
    {"id": "e3", "source": "laptop-a", "target": "laptop-b"},
    {"id": "e4", "source": "laptop-a", "target": "phone-b"},
    {"id": "e5", "source": "laptop-a", "target": "phone-a"},
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


def _system_status(hub: Any) -> dict:
    ziti_ctrl = os.getenv("ZITI_CTRL_HOST", "127.0.0.1")
    ziti_port = int(os.getenv("ZITI_CTRL_PORT", "1280"))
    ctrl_status = _check_port(ziti_ctrl, ziti_port)

    peers = []
    if hub:
        peers = [p["device_id"] for p in hub.status().get("peers", [])]

    return {
        "controller": {"status": ctrl_status.upper(), "label": "OpenZiti Controller"},
        "router": {"status": "ONLINE" if ctrl_status == "online" else "WARNING", "label": "OpenZiti Router"},
        "overlay": {"status": "ONLINE" if hub else "WARNING", "label": "ZTON UDP Overlay"},
        "encryption": {"status": "ONLINE", "label": "AES-GCM + Ed25519"},
        "connected_nodes": {"count": max(len(peers), 3), "status": "ONLINE", "peers": peers},
    }


@router.get("/status")
async def soc_status():
    from server.app import hub
    return _system_status(hub)


@router.get("/stats")
async def soc_stats():
    from server.app import hub
    sim = simulator.snapshot()
    hub_stats = hub.status().get("stats", {}) if hub else {}
    return {
        "total_sent": sim["packets_sent"] + hub_stats.get("packets_total", 0),
        "total_received": sim["packets_received"] + hub_stats.get("packets_total", 0),
        "accepted": sim["packets_accepted"] + hub_stats.get("packets_forwarded", 0),
        "dropped": sim["packets_dropped"] + hub_stats.get("packets_denied", 0),
        "replay_blocked": sim["replay_blocked"],
        "active_sessions": sim["active_sessions"],
        "running": sim["running"],
        "traffic": sim["packets_per_second"],
    }


@router.get("/packets")
async def soc_packets(limit: int = 100):
    sim = simulator.snapshot()
    from server.app import hub
    live = []
    if hub:
        for e in hub.events.history():
            if e.get("kind") in ("packet", "deny", "forward"):
                live.append(_hub_event_to_packet(e))
    combined = live + sim["packet_history"]
    return {"packets": combined[:limit]}


@router.get("/events")
async def soc_events(limit: int = 50):
    sim = simulator.snapshot()
    from server.app import hub
    events = list(sim["security_events"])
    if hub:
        for e in hub.events.history():
            events.append(_hub_event_to_security(e))
    return {"events": events[:limit]}


@router.get("/policies")
async def soc_policies():
    from server.app import hub
    policies = list(POLICIES)
    if hub:
        snap = hub.policy.snapshot()
        policies.append({"id": "live", "effect": "info", "source": "Live Policy", "target": str(snap), "rule": "runtime"})
    return {"policies": policies}


@router.get("/topology")
async def soc_topology():
    from server.app import hub
    nodes = [dict(n) for n in TOPOLOGY_NODES]
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
    simulator._emit_event("INFO", f"Simulation started — {req.count} packets, {req.payload_type}")
    return {"ok": True, "running": True}


@router.post("/simulate/stop")
async def simulate_stop():
    simulator.stop()
    simulator._emit_event("INFO", "Simulation stopped")
    return {"ok": True, "running": False}


@router.post("/simulate/reset")
async def simulate_reset():
    simulator.reset()
    simulator._emit_event("INFO", "Dashboard metrics reset")
    return {"ok": True}


@router.post("/scenarios/{scenario_id}/run")
async def run_scenario(scenario_id: str):
    scenario = next((s for s in SCENARIOS if s["id"] == scenario_id), None)
    if not scenario:
        return {"ok": False, "error": "Unknown scenario"}
    simulator.start_async(
        count=scenario["count"],
        payload_type=scenario["payload_type"],
        payload_size=scenario["payload_size"],
        replay_pct=scenario.get("replay_pct", 0),
        interval_ms=20,
        force_sender=scenario.get("force_sender"),
    )
    simulator._emit_event("INFO", f"Scenario started: {scenario['name']}")
    return {"ok": True, "scenario": scenario}


def _hub_event_to_packet(e: dict) -> dict:
    kind = e.get("kind", "")
    status = "DROPPED" if kind == "deny" else "ACCEPTED"
    return {
        "id": e.get("timestamp", "")[:8],
        "timestamp": e.get("timestamp", ""),
        "sender": e.get("device_name", ""),
        "sender_id": e.get("device_id", ""),
        "receiver": "hub",
        "session_id": "live",
        "nonce": e.get("stats", {}).get("sequence", 0) if e.get("stats") else 0,
        "payload_type": "Live Traffic",
        "encryption": "AES-GCM + Ed25519",
        "decision": e.get("policy", status),
        "status": status,
        "payload_size": e.get("stats", {}).get("original_bytes", 0) if e.get("stats") else 0,
        "ciphertext_preview": "gAAAAA...",
        "live": True,
    }


def _hub_event_to_security(e: dict) -> dict:
    kind = e.get("kind", "info")
    level_map = {"auth": "INFO", "packet": "SUCCESS", "deny": "CRITICAL", "forward": "SUCCESS"}
    return {
        "level": level_map.get(kind, "INFO"),
        "message": e.get("message", ""),
        "timestamp": e.get("timestamp", ""),
        "source": e.get("device_name", "zton"),
    }


@router.websocket("/ws")
async def soc_ws(websocket: WebSocket):
    await websocket.accept()
    try:
        while True:
            import asyncio
            snap = simulator.snapshot()
            from server.app import hub
            await websocket.send_json({
                "type": "tick",
                "stats": {
                    "total_sent": snap["packets_sent"],
                    "accepted": snap["packets_accepted"],
                    "dropped": snap["packets_dropped"],
                    "replay_blocked": snap["replay_blocked"],
                    "running": snap["running"],
                },
                "latest_packet": snap["packet_history"][0] if snap["packet_history"] else None,
                "latest_event": snap["security_events"][0] if snap["security_events"] else None,
                "hub_peers": hub.status().get("peers", []) if hub else [],
            })
            await asyncio.sleep(0.5)
    except WebSocketDisconnect:
        pass
