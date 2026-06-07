"""ZTON wire format for UDP overlay packets."""

import base64
import json
import time
from dataclasses import dataclass, asdict
from enum import Enum
from typing import Any


class PacketType(str, Enum):
    HELLO = "HELLO"
    HELLO_ACK = "HELLO_ACK"
    DATA = "DATA"
    DENY = "DENY"
    HEARTBEAT = "HEARTBEAT"


@dataclass
class ZtonPacket:
    type: str
    device_id: str
    device_name: str
    session_id: str
    sequence: int
    timestamp: float
    public_key: str
    signature: str
    payload_b64: str
    target_id: str = ""
    policy_result: str = ""
    stats: dict | None = None

    def signing_bytes(self) -> bytes:
        core = {
            "type": self.type,
            "device_id": self.device_id,
            "session_id": self.session_id,
            "sequence": self.sequence,
            "timestamp": self.timestamp,
            "payload_b64": self.payload_b64,
            "target_id": self.target_id,
        }
        return json.dumps(core, sort_keys=True, separators=(",", ":")).encode()

    def to_bytes(self) -> bytes:
        return json.dumps(asdict(self), separators=(",", ":")).encode()

    @staticmethod
    def from_bytes(data: bytes) -> "ZtonPacket":
        obj = json.loads(data.decode())
        return ZtonPacket(**{k: obj[k] for k in ZtonPacket.__dataclass_fields__ if k in obj})

    @staticmethod
    def build(
        packet_type: PacketType,
        device_id: str,
        device_name: str,
        session_id: str,
        sequence: int,
        public_key_b64: str,
        payload: bytes = b"",
        target_id: str = "",
        sign_fn=None,
    ) -> "ZtonPacket":
        pkt = ZtonPacket(
            type=packet_type.value,
            device_id=device_id,
            device_name=device_name,
            session_id=session_id,
            sequence=sequence,
            timestamp=time.time(),
            public_key=public_key_b64,
            signature="",
            payload_b64=base64.b64encode(payload).decode(),
            target_id=target_id,
        )
        if sign_fn:
            sig = sign_fn(pkt.signing_bytes())
            pkt.signature = base64.b64encode(sig).decode()
        return pkt
