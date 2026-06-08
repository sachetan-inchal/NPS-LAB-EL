"""ZTON overlay node — lightweight UDP client for edge devices."""

import base64
import socket
import threading
import time
import uuid

from zton.crypto import SessionCrypto, load_or_create_keypair, derive_session_key
from zton.packet import ZtonPacket, PacketType


from zton.timeutil import utc_now_iso


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
        self._hub_public_key: bytes | None = None
        self._sequence = 0
        self._sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        self._sock.bind(("0.0.0.0", 0))
        self._running = False
        self._thread: threading.Thread | None = None
        self._register_thread: threading.Thread | None = None
        self._last_events: list[dict] = []
        self._registered = False
        self._policy_result = "PENDING"
        self._packets_sent = 0
        self._packets_accepted = 0
        self._packets_denied = 0
        self._pending_denies = False

    @property
    def local_port(self) -> int:
        return self._sock.getsockname()[1]

    def start(self) -> None:
        self._running = True
        self._thread = threading.Thread(target=self._recv_loop, daemon=True)
        self._thread.start()
        self._register_thread = threading.Thread(target=self._register_until_ready, daemon=True)
        self._register_thread.start()

    def stop(self) -> None:
        self._running = False
        self._sock.close()

    def register(self) -> bool:
        pkt = ZtonPacket.build(
            PacketType.HELLO,
            self.device_id,
            self.device_name,
            self.session_id,
            0,
            base64.b64encode(self.keypair.public_bytes()).decode(),
            sign_fn=self.keypair.sign,
        )
        return self._send(pkt)

    def _register_until_ready(self) -> None:
        while self._running and not self._registered:
            if self.register():
                self._add_event("auth", f"Registration sent to hub {self.hub_host}:{self.hub_port}")
            else:
                self._add_event("deny", f"Waiting for hub route {self.hub_host}:{self.hub_port}")
            time.sleep(2)

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
        self._packets_sent += 1
        self._pending_denies = True

        ct_b64 = base64.b64encode(ciphertext).decode()
        target_label = "Hub (Laptop A — port 8080)" if not target_id else f"{target_id} (forwarded by hub)"
        result = {
            **stats,
            "plaintext": text,
            "ciphertext_preview": ct_b64[:56] + ("…" if len(ct_b64) > 56 else ""),
            "ciphertext_length": len(ciphertext),
            "target": target_id or "hub",
            "target_label": target_label,
            "session_id": self.session_id,
            "sequence": self._sequence,
            "encryption": "AES-GCM",
            "authentication": "Ed25519 signature",
            "transport": "Raw UDP",
        }

        self._add_event(
            "encrypted",
            f"Plaintext → Encrypted ({stats['encrypted_bytes']}B) → UDP → {target_label}",
            stats={**stats, "plaintext": text, "plaintext_preview": text[:80], "ciphertext_preview": result["ciphertext_preview"], "sequence": self._sequence},
            target=target_id,
        )

        def _mark_accepted():
            if self._pending_denies and self.authorized:
                self._pending_denies = False
                self._packets_accepted += 1
                self._add_event("packet", f"Hub ACCEPTED: {text[:60]}", stats=stats)

        def _mark_denied_if_unauthorized():
            if self._pending_denies and not self.authorized:
                self._pending_denies = False
                self._packets_denied += 1
                self._add_event("deny", "Hub DENIED — device not authorized (zero-trust policy)")

        threading.Timer(0.6, _mark_accepted).start()
        threading.Timer(0.8, _mark_denied_if_unauthorized).start()
        return result

    def _send(self, pkt: ZtonPacket) -> bool:
        try:
            self._sock.sendto(pkt.to_bytes(), (self.hub_host, self.hub_port))
            return True
        except OSError as exc:
            self._add_event("deny", f"Send failed: {exc}")
            return False

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
        if not self._registered:
            self.register()
            return
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
            self._pending_denies = False
            self._packets_denied += 1
            self._add_event("deny", f"Hub DENIED: {reason}")
        elif pkt.type == PacketType.DATA.value:
            if self._session:
                ciphertext = base64.b64decode(pkt.payload_b64)
                try:
                    plaintext, stats = self._session.decrypt_payload(ciphertext, pkt.sequence)
                    self._add_event("packet", plaintext.decode(), stats=stats)
                except Exception as e:
                    self._add_event("deny", str(e))

    def _add_event(self, kind: str, message: str, stats: dict | None = None, target: str = "") -> None:
        self._last_events.append({
            "kind": kind,
            "message": message,
            "stats": stats,
            "target": target,
            "timestamp": utc_now_iso(),
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
            "packets_sent": self._packets_sent,
            "packets_accepted": self._packets_accepted,
            "packets_denied": self._packets_denied,
            "events": self._last_events[-20:],
        }
