"""Packet simulation engine for SOC dashboard demonstrations."""

import random
import threading
import time
import uuid
from dataclasses import dataclass, field
from datetime import datetime, timezone

PAYLOAD_TYPES = ["Chat Message", "Sensor Data", "Video Stream", "Voice Stream", "File Transfer"]
SENDERS = [
    {"id": "laptop-b", "name": "Laptop B", "authorized": True},
    {"id": "phone-b", "name": "Phone B", "authorized": True},
    {"id": "phone-a", "name": "Phone A", "authorized": False},
    {"id": "unknown-node", "name": "Unknown Node", "authorized": False},
]
RECEIVERS = ["laptop-a", "laptop-b", "phone-b", "phone-a", "controller", "router"]


@dataclass
class PacketRecord:
    id: str
    timestamp: str
    sender: str
    sender_id: str
    receiver: str
    session_id: str
    nonce: int
    payload_type: str
    encryption: str
    decision: str
    status: str
    payload_size: int
    ciphertext_preview: str

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "timestamp": self.timestamp,
            "sender": self.sender,
            "sender_id": self.sender_id,
            "receiver": self.receiver,
            "session_id": self.session_id,
            "nonce": self.nonce,
            "payload_type": self.payload_type,
            "encryption": self.encryption,
            "decision": self.decision,
            "status": self.status,
            "payload_size": self.payload_size,
            "ciphertext_preview": self.ciphertext_preview,
        }


@dataclass
class SecurityEvent:
    level: str
    message: str
    timestamp: str
    source: str = "zton-overlay"

    def to_dict(self) -> dict:
        return {"level": self.level, "message": self.message, "timestamp": self.timestamp, "source": self.source}


@dataclass
class SimulatorState:
    running: bool = False
    packets_sent: int = 0
    packets_received: int = 0
    packets_accepted: int = 0
    packets_dropped: int = 0
    replay_blocked: int = 0
    active_sessions: int = 3
    packets_per_second: list = field(default_factory=list)
    packet_history: list = field(default_factory=list)
    security_events: list = field(default_factory=list)
    _nonce_counter: int = 1000
    _thread: threading.Thread | None = None
    _stop_event: threading.Event = field(default_factory=threading.Event)
    _lock: threading.Lock = field(default_factory=threading.Lock)

    def reset(self) -> None:
        with self._lock:
            self.running = False
            self._stop_event.set()
            self.packets_sent = 0
            self.packets_received = 0
            self.packets_accepted = 0
            self.packets_dropped = 0
            self.replay_blocked = 0
            self.packets_per_second = []
            self.packet_history = []
            self.security_events = []
            self._nonce_counter = 1000
            self._stop_event = threading.Event()

    def _emit_event(self, level: str, message: str) -> None:
        evt = SecurityEvent(level=level, message=message, timestamp=_now())
        with self._lock:
            self.security_events.insert(0, evt.to_dict())
            if len(self.security_events) > 100:
                self.security_events = self.security_events[:100]

    def _generate_packet(
        self,
        payload_type: str,
        payload_size: int,
        replay_pct: float,
        force_sender: str | None = None,
    ) -> PacketRecord:
        if force_sender:
            sender = next((s for s in SENDERS if s["id"] == force_sender), SENDERS[0])
        else:
            sender = random.choice(SENDERS[:3])

        is_replay = random.random() < replay_pct
        is_unauthorized = not sender["authorized"]
        receiver = random.choice(RECEIVERS)

        self._nonce_counter += 1
        nonce = self._nonce_counter if not is_replay else random.randint(1, self._nonce_counter - 1)

        if is_replay:
            decision, status = "REPLAY DETECTED", "DROPPED"
        elif is_unauthorized:
            decision, status = "POLICY DENY", "DROPPED"
        else:
            decision, status = "ACCEPTED", "ACCEPTED"

        preview = "gAAAAA" + "".join(random.choices("ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789", k=28))

        return PacketRecord(
            id=str(uuid.uuid4())[:8],
            timestamp=_now(),
            sender=sender["name"],
            sender_id=sender["id"],
            receiver=receiver,
            session_id=str(random.randint(100, 999)),
            nonce=nonce,
            payload_type=payload_type,
            encryption="AES-GCM + Ed25519",
            decision=decision,
            status=status,
            payload_size=payload_size,
            ciphertext_preview=preview,
        )

    def _process_packet(self, pkt: PacketRecord) -> None:
        with self._lock:
            self.packets_sent += 1
            self.packets_received += 1
            self.packet_history.insert(0, pkt.to_dict())
            if len(self.packet_history) > 500:
                self.packet_history = self.packet_history[:500]

            if pkt.status == "ACCEPTED":
                self.packets_accepted += 1
            else:
                self.packets_dropped += 1
                if pkt.decision == "REPLAY DETECTED":
                    self.replay_blocked += 1

    def run_batch(
        self,
        count: int,
        payload_type: str,
        payload_size: int,
        replay_pct: float,
        interval_ms: int = 50,
        force_sender: str | None = None,
    ) -> None:
        self._stop_event.clear()
        self.running = True
        batch_start = time.time()
        batch_count = 0

        for i in range(count):
            if self._stop_event.is_set():
                break
            pkt = self._generate_packet(payload_type, payload_size, replay_pct, force_sender)
            self._process_packet(pkt)
            batch_count += 1

            if pkt.decision == "REPLAY DETECTED":
                self._emit_event("WARNING", f"Replay packet detected from {pkt.sender} (nonce={pkt.nonce})")
            elif pkt.decision == "POLICY DENY":
                self._emit_event("CRITICAL", f"Unauthorized access attempt blocked — {pkt.sender} → {pkt.receiver}")
            elif i % 25 == 0:
                self._emit_event("SUCCESS", f"Encrypted {pkt.payload_type} delivered — session {pkt.session_id}")

            if interval_ms > 0:
                time.sleep(interval_ms / 1000.0)

        elapsed = max(time.time() - batch_start, 0.001)
        pps = round(batch_count / elapsed, 1)
        with self._lock:
            self.packets_per_second.append({"time": _now(), "pps": pps, "accepted": self.packets_accepted, "dropped": self.packets_dropped})
            if len(self.packets_per_second) > 60:
                self.packets_per_second = self.packets_per_second[-60:]
        self.running = False

    def start_async(self, **kwargs) -> None:
        if self._thread and self._thread.is_alive():
            self._stop_event.set()
            self._thread.join(timeout=2)
        self._stop_event.clear()
        self._thread = threading.Thread(target=self.run_batch, kwargs=kwargs, daemon=True)
        self._thread.start()

    def stop(self) -> None:
        self._stop_event.set()
        self.running = False

    def snapshot(self) -> dict:
        with self._lock:
            return {
                "running": self.running,
                "packets_sent": self.packets_sent,
                "packets_received": self.packets_received,
                "packets_accepted": self.packets_accepted,
                "packets_dropped": self.packets_dropped,
                "replay_blocked": self.replay_blocked,
                "active_sessions": self.active_sessions,
                "packets_per_second": list(self.packets_per_second),
                "packet_history": list(self.packet_history[:100]),
                "security_events": list(self.security_events[:50]),
            }


def _now() -> str:
    return datetime.now(timezone.utc).strftime("%H:%M:%S.%f")[:-3] + "Z"


simulator = SimulatorState()
