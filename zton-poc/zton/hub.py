"""ZTON overlay hub — UDP relay with policy and mutual authentication."""

import asyncio
import base64
import socket
import threading
import time
from dataclasses import dataclass, field

from zton.crypto import SessionCrypto, ReplayError, verify_signature, load_or_create_keypair, derive_session_key
from zton.events import EventBus, OverlayEvent
from zton.packet import ZtonPacket, PacketType
from zton.policy import PolicyEngine


@dataclass
class PeerState:
    device_id: str
    device_name: str
    addr: tuple[str, int]
    public_key: bytes
    session: SessionCrypto | None = None
    last_seen: float = 0.0
    authorized: bool = True


class ZtonHub:
    def __init__(
        self,
        device_id: str = "laptop-a",
        device_name: str = "Laptop A (Hub)",
        udp_port: int = 9999,
        key_path: str | None = None,
        loop: asyncio.AbstractEventLoop | None = None,
    ) -> None:
        self.device_id = device_id
        self.device_name = device_name
        self.udp_port = udp_port
        import os
        if key_path is None:
            keys_dir = os.getenv("ZTON_KEYS_DIR", ".")
            key_path = os.path.join(keys_dir, "zton_hub.key")
        self.keypair = load_or_create_keypair(key_path)
        self.policy = PolicyEngine()
        self.events = EventBus()
        self.peers: dict[str, PeerState] = {}
        self._sessions: dict[str, SessionCrypto] = {}
        self._loop = loop
        self._sock: socket.socket | None = None
        self._thread: threading.Thread | None = None
        self._running = False
        self._packets_total = 0
        self._packets_denied = 0

    def configure_peers(self, peer_configs: list[dict]) -> None:
        for cfg in peer_configs:
            self.policy.register_device(
                cfg["device_id"],
                cfg.get("authorized", True),
                cfg.get("targets", []),
            )

    def start(self) -> None:
        self._sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        self._sock.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
        self._sock.bind(("0.0.0.0", self.udp_port))
        self._running = True
        self._thread = threading.Thread(target=self._recv_loop, daemon=True)
        self._thread.start()

    def stop(self) -> None:
        self._running = False
        if self._sock:
            self._sock.close()

    def _emit(self, kind: str, device_id: str, device_name: str, message: str, **kwargs) -> None:
        event = OverlayEvent(kind=kind, device_id=device_id, device_name=device_name, message=message, **kwargs)
        if self._loop and self._loop.is_running():
            asyncio.run_coroutine_threadsafe(self.events.publish(event), self._loop)
        else:
            self.events.publish_sync(event)

    def _recv_loop(self) -> None:
        assert self._sock
        while self._running:
            try:
                data, addr = self._sock.recvfrom(65535)
                self._handle_packet(data, addr)
            except OSError:
                break

    def _handle_packet(self, data: bytes, addr: tuple[str, int]) -> None:
        try:
            pkt = ZtonPacket.from_bytes(data)
        except Exception as exc:
            self._emit("deny", "unknown", "unknown", f"Malformed packet: {exc}", policy="DENY")
            return

        pub_key = base64.b64decode(pkt.public_key)
        sig = base64.b64decode(pkt.signature)
        if not verify_signature(pub_key, sig, pkt.signing_bytes()):
            self._packets_denied += 1
            self._emit("deny", pkt.device_id, pkt.device_name, "Mutual auth failed — invalid signature", policy="DENY")
            self._send_deny(addr, pkt, "Invalid Ed25519 signature")
            return

        if pkt.type == PacketType.HELLO.value:
            self._handle_hello(pkt, addr, pub_key)
        elif pkt.type == PacketType.DATA.value:
            self._handle_data(pkt, addr, pub_key)
        elif pkt.type == PacketType.HEARTBEAT.value:
            if pkt.device_id in self.peers:
                self.peers[pkt.device_id].last_seen = time.time()

    def _handle_hello(self, pkt: ZtonPacket, addr: tuple[str, int], pub_key: bytes) -> None:
        decision = self.policy.can_send(pkt.device_id)
        session_key = derive_session_key(self.keypair.public_bytes(), pub_key)
        session = SessionCrypto(key=session_key)

        self.peers[pkt.device_id] = PeerState(
            device_id=pkt.device_id,
            device_name=pkt.device_name,
            addr=addr,
            public_key=pub_key,
            session=session,
            last_seen=time.time(),
            authorized=decision.allowed,
        )
        self._sessions[pkt.device_id] = session

        if decision.allowed:
            self._emit("auth", pkt.device_id, pkt.device_name,
                       f"Mutual authentication succeeded — {decision.reason}", policy="ALLOW")
        else:
            self._emit("deny", pkt.device_id, pkt.device_name,
                       f"Authentication OK but policy denied — {decision.reason}", policy="DENY")

        ack = ZtonPacket.build(
            PacketType.HELLO_ACK,
            self.device_id,
            self.device_name,
            pkt.session_id,
            0,
            base64.b64encode(self.keypair.public_bytes()).decode(),
            sign_fn=self.keypair.sign,
        )
        ack.policy_result = "ALLOW" if decision.allowed else "DENY"
        self._send(ack, addr)

    def _handle_data(self, pkt: ZtonPacket, addr: tuple[str, int], pub_key: bytes) -> None:
        self._packets_total += 1
        send_decision = self.policy.can_send(pkt.device_id)
        if not send_decision.allowed:
            self._packets_denied += 1
            self._emit("deny", pkt.device_id, pkt.device_name,
                       f"Per-packet policy deny — {send_decision.reason}", policy="DENY")
            self._send_deny(addr, pkt, send_decision.reason)
            return

        route_decision = self.policy.can_forward(pkt.device_id, pkt.target_id)
        if not route_decision.allowed:
            self._packets_denied += 1
            self._emit("deny", pkt.device_id, pkt.device_name,
                       f"Route denied — {route_decision.reason}", policy="DENY")
            self._send_deny(addr, pkt, route_decision.reason)
            return

        session = self._sessions.get(pkt.device_id)
        if not session:
            self._emit("deny", pkt.device_id, pkt.device_name, "No session — HELLO required", policy="DENY")
            return

        ciphertext = base64.b64decode(pkt.payload_b64)
        try:
            plaintext, stats = session.decrypt_payload(ciphertext, pkt.sequence)
        except ReplayError as e:
            self._packets_denied += 1
            self._emit("deny", pkt.device_id, pkt.device_name, str(e), policy="DENY")
            return
        except Exception as e:
            self._packets_denied += 1
            self._emit("deny", pkt.device_id, pkt.device_name, f"Decryption failed — {e}", policy="DENY")
            return

        message_text = plaintext.decode("utf-8", errors="replace")
        self._emit(
            "packet",
            pkt.device_id,
            pkt.device_name,
            message_text,
            policy="ALLOW",
            encrypted=True,
            stats=stats,
        )

        if pkt.target_id and pkt.target_id in self.peers:
            target = self.peers[pkt.target_id]
            if target.authorized:
                forward_pkt = ZtonPacket.build(
                    PacketType.DATA,
                    self.device_id,
                    self.device_name,
                    pkt.session_id,
                    pkt.sequence,
                    base64.b64encode(self.keypair.public_bytes()).decode(),
                    payload=ciphertext,
                    target_id=pkt.target_id,
                    sign_fn=self.keypair.sign,
                )
                forward_pkt.stats = stats
                self._send(forward_pkt, target.addr)
                self._emit("forward", pkt.device_id, target.device_name,
                           f"Forwarded encrypted packet → {target.device_name}", policy="ALLOW", encrypted=True, stats=stats)

    def _send_deny(self, addr: tuple[str, int], orig: ZtonPacket, reason: str) -> None:
        deny = ZtonPacket.build(
            PacketType.DENY,
            self.device_id,
            self.device_name,
            orig.session_id,
            orig.sequence,
            base64.b64encode(self.keypair.public_bytes()).decode(),
            payload=reason.encode(),
            sign_fn=self.keypair.sign,
        )
        deny.policy_result = "DENY"
        self._send(deny, addr)

    def _send(self, pkt: ZtonPacket, addr: tuple[str, int]) -> None:
        if self._sock:
            self._sock.sendto(pkt.to_bytes(), addr)

    def status(self) -> dict:
        return {
            "hub_id": self.device_id,
            "hub_name": self.device_name,
            "udp_port": self.udp_port,
            "public_key": base64.b64encode(self.keypair.public_bytes()).decode(),
            "peers": [
                {
                    "device_id": p.device_id,
                    "device_name": p.device_name,
                    "addr": f"{p.addr[0]}:{p.addr[1]}",
                    "authorized": p.authorized,
                    "last_seen": p.last_seen,
                }
                for p in self.peers.values()
            ],
            "policy": self.policy.snapshot(),
            "stats": {
                "packets_total": self._packets_total,
                "packets_denied": self._packets_denied,
                **self.events.stats(),
            },
        }
