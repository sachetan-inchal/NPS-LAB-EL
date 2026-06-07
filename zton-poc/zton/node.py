"""ZTON overlay node — lightweight UDP client for edge devices."""

import base64
import socket
import threading
import time
import uuid

from zton.crypto import SessionCrypto, load_or_create_keypair, derive_session_key
from zton.packet import ZtonPacket, PacketType


class ZtonNode:
    def __init__(
        self,
        device_id: str,
        device_name: str,
        hub_host: str,
        hub_port: int = 9999,
        authorized: bool = True,
        targets: list[str] | None = None,
        key_path: str | None = None,
    ) -> None:
        self.device_id = device_id
        self.device_name = device_name
        self.hub_host = hub_host
        self.hub_port = hub_port
        self.authorized = authorized
        self.targets = targets or []
        import os
        if key_path is None:
            keys_dir = os.getenv("ZTON_KEYS_DIR", ".")
            key_path = os.path.join(keys_dir, f"zton_{device_id}.key")
        self.keypair = load_or_create_keypair(key_path)
        self.session_id = str(uuid.uuid4())[:8]
        self._session: SessionCrypto | None = None
        self._sequence = 0
        self._sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        self._sock.bind(("0.0.0.0", 0))
        self._running = False
        self._thread: threading.Thread | None = None
        self._last_events: list[dict] = []
        self._registered = False
        self._policy_result = "PENDING"
        self._hub_public_key: bytes | None = None

    @property
    def local_port(self) -> int:
        return self._sock.getsockname()[1]

    def start(self) -> None:
        self._running = True
        self._thread = threading.Thread(target=self._recv_loop, daemon=True)
        self._thread.start()
        self.register()

    def stop(self) -> None:
        self._running = False
        self._sock.close()

    def register(self) -> None:
        pkt = ZtonPacket.build(
            PacketType.HELLO,
            self.device_id,
            self.device_name,
            self.session_id,
            0,
            base64.b64encode(self.keypair.public_bytes()).decode(),
            sign_fn=self.keypair.sign,
        )
        self._send(pkt)

    def send_message(self, text: str, target_id: str = "") -> dict:
        if not self._session:
            if not self._hub_public_key:
                raise RuntimeError("Not registered with hub yet")
            session_key = derive_session_key(self.keypair.public_bytes(), self._hub_public_key)
            self._session = SessionCrypto(key=session_key)

        self._sequence += 1
        ciphertext, stats = self._session.encrypt_payload(text.encode())

        pkt = ZtonPacket.build(
            PacketType.DATA,
            self.device_id,
            self.device_name,
            self.session_id,
            self._sequence,
            base64.b64encode(self.keypair.public_bytes()).decode(),
            payload=ciphertext,
            target_id=target_id,
            sign_fn=self.keypair.sign,
        )
        pkt.stats = stats
        self._send(pkt)
        return stats

    def _send(self, pkt: ZtonPacket) -> None:
        self._sock.sendto(pkt.to_bytes(), (self.hub_host, self.hub_port))

    def _recv_loop(self) -> None:
        while self._running:
            try:
                self._sock.settimeout(2.0)
                data, _ = self._sock.recvfrom(65535)
                self._handle_packet(data)
            except socket.timeout:
                self._send_heartbeat()
            except OSError:
                break

    def _send_heartbeat(self) -> None:
        pkt = ZtonPacket.build(
            PacketType.HEARTBEAT,
            self.device_id,
            self.device_name,
            self.session_id,
            0,
            base64.b64encode(self.keypair.public_bytes()).decode(),
            sign_fn=self.keypair.sign,
        )
        self._send(pkt)

    def _handle_packet(self, data: bytes) -> None:
        pkt = ZtonPacket.from_bytes(data)
        if pkt.type == PacketType.HELLO_ACK.value:
            self._registered = True
            self._policy_result = pkt.policy_result
            self._hub_public_key = base64.b64decode(pkt.public_key)
            session_key = derive_session_key(self.keypair.public_bytes(), self._hub_public_key)
            self._session = SessionCrypto(key=session_key)
            self._add_event("auth", f"Registered with hub — policy: {pkt.policy_result}")
        elif pkt.type == PacketType.DENY.value:
            reason = base64.b64decode(pkt.payload_b64).decode()
            self._add_event("deny", reason)
        elif pkt.type == PacketType.DATA.value:
            if self._session:
                ciphertext = base64.b64decode(pkt.payload_b64)
                try:
                    plaintext, stats = self._session.decrypt_payload(ciphertext, pkt.sequence)
                    self._add_event("packet", plaintext.decode(), stats=stats)
                except Exception as e:
                    self._add_event("deny", str(e))

    def _add_event(self, kind: str, message: str, stats: dict | None = None) -> None:
        self._last_events.append({
            "kind": kind,
            "message": message,
            "stats": stats,
            "timestamp": time.time(),
        })
        if len(self._last_events) > 50:
            self._last_events = self._last_events[-50:]

    def status(self) -> dict:
        return {
            "device_id": self.device_id,
            "device_name": self.device_name,
            "hub": f"{self.hub_host}:{self.hub_port}",
            "authorized": self.authorized,
            "registered": self._registered,
            "policy_result": self._policy_result,
            "local_port": self.local_port,
            "targets": self.targets,
            "events": self._last_events[-10:],
        }
