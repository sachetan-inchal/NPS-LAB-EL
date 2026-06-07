"""Live metrics from hub event history — for device dashboards."""

from collections import deque
from datetime import datetime, timezone

from fastapi import APIRouter, Query

router = APIRouter(prefix="/api/live", tags=["live"])


def _parse_ts(ts: str) -> datetime | None:
    if not ts:
        return None
    try:
        return datetime.fromisoformat(ts.replace("Z", "+00:00"))
    except ValueError:
        return None


@router.get("/stats")
async def live_stats(device_id: str | None = Query(None)):
    from server.app import hub
    if not hub:
        return {"role": "node", "message": "Hub not available on this port"}

    events = hub.events.history()
    if device_id:
        events = [e for e in events if e.get("device_id") == device_id]

    accepted = [e for e in events if e.get("kind") == "packet" and e.get("policy") == "ALLOW"]
    denied = [e for e in events if e.get("kind") == "deny"]
    forwarded = [e for e in events if e.get("kind") == "forward"]

    return {
        "device_id": device_id,
        "total_sent": len(accepted) + len(denied),
        "accepted": len(accepted),
        "dropped": len(denied),
        "forwarded": len(forwarded),
        "replay_blocked": len([e for e in denied if "replay" in e.get("message", "").lower()]),
        "active_sessions": len(hub.peers),
        "peers_online": len(hub.status().get("peers", [])),
    }


@router.get("/events")
async def live_events(device_id: str | None = Query(None), limit: int = 50):
    from server.app import hub
    if not hub:
        return {"events": []}

    events = list(reversed(hub.events.history()))
    if device_id:
        events = [e for e in events if e.get("device_id") == device_id]
    return {"events": events[:limit]}


@router.get("/traffic")
async def live_traffic(device_id: str | None = Query(None)):
    from server.app import hub
    if not hub:
        return {"points": []}

    events = hub.events.history()
    if device_id:
        events = [e for e in events if e.get("device_id") == device_id]

    # Bucket into ~10 second windows for chart
    buckets: dict[str, dict] = {}
    for e in events:
        ts = _parse_ts(e.get("timestamp", ""))
        if not ts:
            continue
        key = ts.strftime("%H:%M:%S")
        if key not in buckets:
            buckets[key] = {"time": key, "accepted": 0, "dropped": 0, "volume": 0}
        if e.get("kind") == "deny":
            buckets[key]["dropped"] += 1
        elif e.get("kind") in ("packet", "forward"):
            buckets[key]["accepted"] += 1
            stats = e.get("stats") or {}
            buckets[key]["volume"] += stats.get("encrypted_bytes", 0)

    points = list(buckets.values())[-20:]
    return {"points": points}


@router.get("/packets")
async def live_packets(device_id: str | None = Query(None), limit: int = 30):
    from server.app import hub
    if not hub:
        return {"packets": []}

    rows = []
    for e in reversed(hub.events.history()):
        if device_id and e.get("device_id") != device_id:
            continue
        if e.get("kind") not in ("packet", "deny", "forward", "auth"):
            continue
        stats = e.get("stats") or {}
        status = "DROPPED" if e.get("kind") == "deny" else "ACCEPTED"
        decision = e.get("policy", status)
        if e.get("kind") == "deny":
            decision = "POLICY DENY" if "policy" in e.get("message", "").lower() else "DENY"
        rows.append({
            "timestamp": e.get("timestamp", ""),
            "sender": e.get("device_name", ""),
            "sender_id": e.get("device_id", ""),
            "session_id": "live",
            "nonce": stats.get("sequence", 0),
            "payload_type": "Live UDP",
            "encryption": "AES-GCM + Ed25519",
            "decision": decision,
            "status": status,
            "payload_size": stats.get("original_bytes", 0),
            "message": e.get("message", "")[:80],
        })
        if len(rows) >= limit:
            break
    return {"packets": rows}
