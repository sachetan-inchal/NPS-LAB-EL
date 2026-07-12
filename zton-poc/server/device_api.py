"""Device-local metrics API — works on ports 8081–8083 without cross-origin."""

import asyncio
import json
import urllib.error
import urllib.request

from fastapi import APIRouter

from zton.timeutil import utc_now_iso

router = APIRouter(prefix="/api/device", tags=["device"])

HUB_METRICS_URL = "http://zton-dashboard.openziti:8080/api/live"


def _fetch_hub(path: str) -> dict | list | None:
    try:
        with urllib.request.urlopen(f"{HUB_METRICS_URL}{path}", timeout=1.5) as resp:
            return json.loads(resp.read().decode())
    except (urllib.error.URLError, TimeoutError, json.JSONDecodeError, OSError):
        return None


def _events_to_traffic(events: list[dict]) -> list[dict]:
    points = []
    for e in events:
        ts = e.get("timestamp", "")
        if isinstance(ts, (int, float)):
            from datetime import datetime, timezone
            label = datetime.fromtimestamp(ts, tz=timezone.utc).strftime("%H:%M:%S")
        elif ts:
            label = ts[11:19] if len(ts) >= 19 else ts
        else:
            label = "--"
        kind = e.get("kind", "")
        stats = e.get("stats") or {}
        rep = 0
        if kind == "deny":
            acc, drop, vol = 0, 1, 0
            if "replay" in e.get("message", "").lower():
                rep = 1
        elif kind in ("packet", "sent", "encrypted"):
            acc = 1
            drop = 0
            vol = stats.get("encrypted_bytes", 0)
        elif kind == "auth":
            continue
        else:
            continue
        points.append({
            "time": label,
            "accepted": acc,
            "dropped": drop,
            "volume": vol,
            "replay": rep,
        })
    return points[-30:]


def _events_to_packets(events: list[dict], device_name: str) -> list[dict]:
    rows = []
    for e in reversed(events):
        kind = e.get("kind", "")
        if kind not in ("sent", "packet", "deny", "auth", "encrypted"):
            continue
        stats = e.get("stats") or {}
        status = "DROPPED" if kind == "deny" else "ACCEPTED"
        if kind == "sent":
            status = "SENT"
        rows.append({
            "timestamp": e.get("timestamp", ""),
            "sender": device_name,
            "decision": "DENY" if kind == "deny" else ("SENT" if kind == "sent" else "ACCEPTED"),
            "status": status,
            "message": e.get("message", "")[:100],
            "payload_size": stats.get("original_bytes", 0),
            "nonce": stats.get("sequence", 0),
        })
    return rows[:30]


@router.get("/metrics")
async def device_metrics():
    from server.app import node

    if not node:
        return {"ok": False, "error": "Not a device node"}

    events = list(node._last_events)
    local = {
        "total_sent": node._packets_sent,
        "accepted": node._packets_accepted,
        "dropped": node._packets_denied,
        "replay_blocked": len([e for e in events if e.get("kind") == "deny" and "replay" in e.get("message", "").lower()]),
    }

    hub_stats, hub_traffic, hub_packets = await asyncio.gather(
        asyncio.to_thread(_fetch_hub, f"/stats?device_id={node.device_id}"),
        asyncio.to_thread(_fetch_hub, f"/traffic?device_id={node.device_id}"),
        asyncio.to_thread(_fetch_hub, f"/packets?device_id={node.device_id}&limit=20")
    )

    stats = local
    if isinstance(hub_stats, dict) and hub_stats.get("accepted") is not None:
        stats = {
            "total_sent": max(local["total_sent"], hub_stats.get("total_sent", 0)),
            "accepted": max(local["accepted"], hub_stats.get("accepted", 0)),
            "dropped": max(local["dropped"], hub_stats.get("dropped", 0)),
            "replay_blocked": hub_stats.get("replay_blocked", 0),
        }

    traffic = _events_to_traffic(events)
    if isinstance(hub_traffic, dict) and hub_traffic.get("points"):
        hub_pts = hub_traffic["points"]
        if len(hub_pts) >= len(traffic):
            traffic = hub_pts

    packets = _events_to_packets(events, node.device_name)
    if isinstance(hub_packets, dict) and hub_packets.get("packets"):
        hub_pkts = hub_packets["packets"]
        if len(hub_pkts) > len(packets):
            packets = hub_pkts

    return {
        "ok": True,
        "device_id": node.device_id,
        "device_name": node.device_name,
        "registered": node._registered,
        "authorized": node.authorized,
        "stats": stats,
        "traffic": traffic,
        "packets": packets,
        "events": events[-20:],
        "server_time": utc_now_iso(),
    }
