"""Event bus for live dashboard updates."""

import asyncio
import json
from dataclasses import dataclass, asdict
from datetime import datetime
from typing import Any


@dataclass
class OverlayEvent:
    kind: str
    device_id: str
    device_name: str
    message: str
    policy: str = ""
    encrypted: bool = False
    stats: dict | None = None
    timestamp: str = ""

    def __post_init__(self) -> None:
        if not self.timestamp:
            self.timestamp = datetime.utcnow().isoformat() + "Z"

    def to_json(self) -> str:
        return json.dumps(asdict(self))


class EventBus:
    def __init__(self) -> None:
        self._subscribers: list[asyncio.Queue] = []
        self._history: list[dict] = []
        self._max_history = 200

    def subscribe(self) -> asyncio.Queue:
        q: asyncio.Queue = asyncio.Queue(maxsize=100)
        self._subscribers.append(q)
        return q

    def unsubscribe(self, q: asyncio.Queue) -> None:
        if q in self._subscribers:
            self._subscribers.remove(q)

    def _store(self, data: dict) -> None:
        self._history.append(data)
        if len(self._history) > self._max_history:
            self._history = self._history[-self._max_history :]

    def publish_sync(self, event: OverlayEvent) -> None:
        data = json.loads(event.to_json())
        self._store(data)
        for q in list(self._subscribers):
            try:
                q.put_nowait(data)
            except (asyncio.QueueFull, AttributeError):
                pass

    async def publish(self, event: OverlayEvent) -> None:
        data = json.loads(event.to_json())
        self._store(data)
        for q in list(self._subscribers):
            try:
                q.put_nowait(data)
            except asyncio.QueueFull:
                pass

    def history(self) -> list[dict]:
        return list(self._history)

    def stats(self) -> dict[str, Any]:
        packets = [e for e in self._history if e.get("kind") == "packet"]
        denied = [e for e in self._history if e.get("kind") == "deny"]
        return {
            "total_events": len(self._history),
            "packets_forwarded": len([p for p in packets if p.get("policy") == "ALLOW"]),
            "packets_denied": len(denied),
        }
