"""Unified packet + security event store — all SOC metrics derived from history."""

from __future__ import annotations

import base64
import threading
import uuid
from collections import defaultdict
from dataclasses import dataclass, field
from typing import Any

from zton.crypto import KeyPair, ReplayError, SessionCrypto, derive_session_key
from zton.timeutil import utc_now_iso

PAYLOAD_TYPES = ["Chat Message", "Sensor Data", "Video Stream", "Voice Stream", "File Transfer"]

SENDERS = [
    {"id": "laptop-b", "name": "Laptop B", "authorized": True, "targets": ["phone-b", "laptop-a"]},
    {"id": "phone-b", "name": "Phone B", "authorized": True, "targets": ["laptop-a"]},
    {"id": "phone-a", "name": "Phone A", "authorized": False, "targets": []},
]

HUB_ID = "laptop-a"
HUB_NAME = "Laptop A (Hub)"


@dataclass
class SecurityEvent:
    level: str
    message: str
    timestamp: str
    source: str = "zton-overlay"
    packet_id: str = ""

    def to_dict(self) -> dict:
        return {
            "level": self.level,
            "message": self.message,
            "timestamp": self.timestamp,
            "source": self.source,
            "packet_id": self.packet_id,
        }


@dataclass
class PacketRecord:
    packet_id: str
    timestamp: str
    sender: str
    sender_id: str
    receiver: str
    session_id: str
    sequence_number: int
    payload_type: str
    payload_size: int
    plaintext: str
    compressed_data_b64: str
    encrypted_payload: str
    signature_b64: str
    decision: str
    status: str
    reason: str
    is_replay: bool = False
    live: bool = False

    def to_dict(self) -> dict:
        return {
            "packet_id": self.packet_id,
            "id": self.packet_id,
            "timestamp": self.timestamp,
            "sender": self.sender,
            "sender_id": self.sender_id,
            "receiver": self.receiver,
            "session_id": self.session_id,
            "sequence_number": self.sequence_number,
            "nonce": self.sequence_number,
            "payload_type": self.payload_type,
            "payload_size": self.payload_size,
            "plaintext": self.plaintext,
            "compressed_data_b64": self.compressed_data_b64,
            "encrypted_payload": self.encrypted_payload,
            "ciphertext_preview": self.encrypted_payload[:56] + ("…" if len(self.encrypted_payload) > 56 else ""),
            "signature_b64": self.signature_b64,
            "encryption": "AES-GCM + Ed25519",
            "decision": self.decision,
            "status": self.status,
            "reason": self.reason,
            "is_replay": self.is_replay,
            "live": self.live,
        }


@dataclass
class SessionState:
    session_id: str
    device_id: str
    device_name: str
    authorized: bool
    crypto: SessionCrypto
    keypair: KeyPair
    send_seq: int = 0
    recv_high_water: int = -1
    accepted_packets: list[dict] = field(default_factory=list)


class PacketStore:
  def __init__(self) -> None:
      self._lock = threading.RLock()
      self._packets: list[dict] = []
      self._events: list[dict] = []
      self._sessions: dict[str, SessionState] = {}
      self._ingested_live: set[str] = set()
      self._hub_keypair = KeyPair.generate()
      self._running = False
      self._pps_buckets: list[dict] = []
      self._listeners: list[tuple[Any, Any]] = []
      self.reset()

  def reset(self) -> None:
      with self._lock:
          self._packets.clear()
          self._events.clear()
          self._sessions.clear()
          self._pps_buckets.clear()
          self._ingested_live.clear()
          self._running = False
          self._hub_keypair = KeyPair.generate()

  def register_listener(self, loop: Any, q: Any) -> None:
      with self._lock:
          self._listeners.append((loop, q))

  def unregister_listener(self, q: Any) -> None:
      with self._lock:
          self._listeners = [item for item in self._listeners if item[1] != q]

  def _broadcast(self, msg_type: str, data: dict) -> None:
      with self._lock:
          for loop, q in self._listeners:
              try:
                  if loop.is_running():
                      loop.call_soon_threadsafe(q.put_nowait, (msg_type, data))
              except Exception:
                  pass

  def _ensure_session(self, device_id: str, device_name: str, authorized: bool) -> SessionState:
      if device_id in self._sessions:
          return self._sessions[device_id]
      kp = KeyPair.generate()
      session_key = derive_session_key(kp.public_bytes(), self._hub_keypair.public_bytes())
      st = SessionState(
          session_id=f"sess-{device_id}",
          device_id=device_id,
          device_name=device_name,
          authorized=authorized,
          crypto=SessionCrypto(key=session_key),
          keypair=kp,
      )
      self._sessions[device_id] = st
      return st

  def _emit(self, level: str, message: str, source: str = "zton-overlay", packet_id: str = "") -> None:
      evt = SecurityEvent(level=level, message=message, timestamp=utc_now_iso(), source=source, packet_id=packet_id)
      d = evt.to_dict()
      self._events.insert(0, d)
      if len(self._events) > 200:
          self._events = self._events[:200]
      self._broadcast("event", d)

  def _record_packet(self, pkt: PacketRecord) -> None:
      d = pkt.to_dict()
      self._packets.insert(0, d)
      if len(self._packets) > 2000:
          self._packets = self._packets[:2000]
      self._broadcast("packet", d)

  def _build_plaintext(self, payload_type: str, payload_size: int, seq: int) -> str:
      body = "X" * max(16, min(payload_size, 256))
      return f"{payload_type.upper().replace(' ', '_')}: seq={seq} size={payload_size} data={body[:64]}"

  def process_simulated_packet(
      self,
      sender_id: str,
      payload_type: str,
      payload_size: int,
      receiver: str = HUB_ID,
      force_replay_of: dict | None = None,
  ) -> PacketRecord:
      sender = next((s for s in SENDERS if s["id"] == sender_id), SENDERS[0])
      session = self._ensure_session(sender_id, sender["name"], sender["authorized"])
      packet_id = str(uuid.uuid4())[:12]
      ts = utc_now_iso()

      if force_replay_of:
          return self._process_replay(force_replay_of, sender, session, packet_id, ts)

      if not sender["authorized"]:
          plaintext = self._build_plaintext(payload_type, payload_size, session.send_seq + 1)
          pkt = PacketRecord(
              packet_id=packet_id,
              timestamp=ts,
              sender=sender["name"],
              sender_id=sender_id,
              receiver=receiver,
              session_id=session.session_id,
              sequence_number=session.send_seq + 1,
              payload_type=payload_type,
              payload_size=payload_size,
              plaintext=plaintext,
              compressed_data_b64="",
              encrypted_payload="",
              signature_b64="",
              decision="POLICY DENY",
              status="DROPPED",
              reason="Device is explicitly unauthorized (deny-list)",
          )
          self._record_packet(pkt)
          self._emit("CRITICAL", f"Unauthorized device denied — {sender['name']} → {receiver}", sender["name"], packet_id)
          return pkt

      session.send_seq += 1
      seq = session.send_seq
      plaintext = self._build_plaintext(payload_type, payload_size, seq)
      ciphertext, stats = session.crypto.encrypt_payload(plaintext.encode())
      import zlib
      compressed = zlib.compress(plaintext.encode(), level=6)
      signature = session.keypair.sign(ciphertext)
      ct_b64 = base64.b64encode(ciphertext).decode()

      try:
          hub_crypto = SessionCrypto(key=session.crypto.key)
          hub_crypto.recv_high_water = session.recv_high_water
          hub_crypto.decrypt_payload(ciphertext, seq)
          session.recv_high_water = seq
          decision, status, reason = "ACCEPTED", "ACCEPTED", "Identity verified, decrypted successfully"
          session.accepted_packets.append({"seq": seq, "ciphertext": ciphertext, "plaintext": plaintext, "stats": stats})
          route_ok = receiver == HUB_ID or receiver in sender.get("targets", [])
          if receiver != HUB_ID and not route_ok:
              decision, status, reason = "ROUTE DENY", "DROPPED", f"Route {sender_id} → {receiver} denied by policy"
              self._emit("WARNING", reason, HUB_NAME, packet_id)
          else:
              self._emit("SUCCESS", f"Packet accepted — {sender['name']} → {receiver} (seq {seq})", sender["name"], packet_id)
      except ReplayError as e:
          decision, status, reason = "REPLAY DETECTED", "DROPPED", str(e)
          self._emit("WARNING", f"Replay blocked — {reason}", HUB_NAME, packet_id)
      except Exception as e:
          decision, status, reason = "DECRYPT FAIL", "DROPPED", str(e)
          self._emit("CRITICAL", reason, HUB_NAME, packet_id)

      pkt = PacketRecord(
          packet_id=packet_id,
          timestamp=ts,
          sender=sender["name"],
          sender_id=sender_id,
          receiver=receiver,
          session_id=session.session_id,
          sequence_number=seq,
          payload_type=payload_type,
          payload_size=stats.get("original_bytes", payload_size) if sender["authorized"] else payload_size,
          plaintext=plaintext,
          compressed_data_b64=base64.b64encode(compressed).decode(),
          encrypted_payload=ct_b64,
          signature_b64=base64.b64encode(signature).decode(),
          decision=decision,
          status=status,
          reason=reason,
      )
      self._record_packet(pkt)
      return pkt

  def _process_replay(self, old: dict, sender: dict, session: SessionState, packet_id: str, ts: str) -> PacketRecord:
      seq = old.get("sequence_number", old.get("nonce", 0))
      reason = f"Sequence {seq} already processed"
      pkt = PacketRecord(
          packet_id=packet_id,
          timestamp=ts,
          sender=sender["name"],
          sender_id=sender["id"],
          receiver=old.get("receiver", HUB_ID),
          session_id=session.session_id,
          sequence_number=seq,
          payload_type=old.get("payload_type", "Replay"),
          payload_size=old.get("payload_size", 0),
          plaintext=old.get("plaintext", ""),
          compressed_data_b64=old.get("compressed_data_b64", ""),
          encrypted_payload=old.get("encrypted_payload", old.get("ciphertext_preview", "")),
          signature_b64=old.get("signature_b64", ""),
          decision="REPLAY DETECTED",
          status="DROPPED",
          reason=reason,
          is_replay=True,
      )
      self._record_packet(pkt)
      self._emit("WARNING", f"Replay packet blocked — {reason}", sender["name"], packet_id)
      return pkt

  def ingest_hub_event(self, e: dict) -> None:
      kind = e.get("kind", "")
      if kind not in ("packet", "deny", "forward", "auth"):
          return
      live_key = f"{e.get('timestamp','')}-{e.get('device_id','')}-{kind}-{e.get('message','')[:40]}"
      if live_key in self._ingested_live:
          return
      self._ingested_live.add(live_key)
      stats = e.get("stats") or {}
      seq = stats.get("sequence", 0)
      status = "DROPPED" if kind == "deny" else "ACCEPTED"
      decision = "POLICY DENY" if kind == "deny" else "ACCEPTED"
      reason = e.get("message", "")
      if "replay" in reason.lower():
          decision = "REPLAY DETECTED"
      pkt = PacketRecord(
          packet_id=f"live-{e.get('timestamp', '')[:19]}-{seq}",
          timestamp=e.get("timestamp", utc_now_iso()),
          sender=e.get("device_name", ""),
          sender_id=e.get("device_id", ""),
          receiver="laptop-a" if kind != "forward" else e.get("message", "").split("→")[-1].strip(),
          session_id="live",
          sequence_number=seq,
          payload_type="Live Traffic",
          payload_size=stats.get("original_bytes", 0),
          plaintext=e.get("message", "") if kind == "packet" else "",
          compressed_data_b64="",
          encrypted_payload=stats.get("ciphertext_preview", "gAAAAA…"),
          signature_b64="",
          decision=decision,
          status=status,
          reason=reason,
          live=True,
      )
      is_data_packet = False
      if kind in ("packet", "forward"):
          is_data_packet = True
      elif kind == "deny":
          msg_lower = reason.lower()
          if "authentication ok but policy denied" not in msg_lower and "mutual auth failed" not in msg_lower and "malformed packet" not in msg_lower:
              is_data_packet = True

      with self._lock:
          if is_data_packet:
              self._record_packet(pkt)
          if kind == "auth":
              self._emit("INFO", f"Session established — {e.get('device_name', '')}", e.get("device_name", ""), pkt.packet_id)
          elif kind == "deny":
              lvl = "WARNING" if "replay" in reason.lower() else "CRITICAL"
              self._emit(lvl, reason, e.get("device_name", ""), pkt.packet_id)
          elif kind == "packet":
              self._emit("SUCCESS", f"Packet accepted — {e.get('device_name', '')}", e.get("device_name", ""), pkt.packet_id)

  def record_pps_bucket(self, pps: float) -> None:
      stats = self.compute_stats()
      self._pps_buckets.append({
          "time": utc_now_iso(),
          "pps": pps,
          "accepted": stats["accepted"],
          "dropped": stats["dropped"],
          "replay": stats["replay_blocked"],
          "volume": stats["traffic_volume"],
      })
      if len(self._pps_buckets) > 120:
          self._pps_buckets = self._pps_buckets[-120:]

  def compute_stats(self) -> dict:
      with self._lock:
          packets = list(self._packets)
          sessions = list(self._sessions.values())
      accepted = sum(1 for p in packets if p.get("status") == "ACCEPTED")
      dropped = sum(1 for p in packets if p.get("status") == "DROPPED")
      replay = sum(1 for p in packets if p.get("decision") == "REPLAY DETECTED" or p.get("is_replay"))
      volume = sum(p.get("payload_size", 0) for p in packets if p.get("status") == "ACCEPTED")
      active = sum(1 for s in sessions if s.recv_high_water >= 0)
      return {
          "total_sent": len(packets),
          "total_received": len(packets),
          "accepted": accepted,
          "dropped": dropped,
          "replay_blocked": replay,
          "active_sessions": active,
          "traffic_volume": volume,
          "running": self._running,
      }

  def volume_by_type(self) -> list[dict]:
      with self._lock:
          packets = list(self._packets)
      counts: dict[str, int] = defaultdict(int)
      for p in packets:
          if p.get("status") == "ACCEPTED":
              counts[p.get("payload_type", "Other")] += p.get("payload_size", 0)
      return [{"type": k, "volume": v} for k, v in sorted(counts.items())]

  def get_packet(self, packet_id: str) -> dict | None:
      with self._lock:
          for p in self._packets:
              if p.get("packet_id") == packet_id or p.get("id") == packet_id:
                  return dict(p)
      return None

  def snapshot(self) -> dict:
      with self._lock:
          return {
              "running": self._running,
              "packets": list(self._packets[:500]),
              "events": list(self._events[:100]),
              "traffic": list(self._pps_buckets),
              **self.compute_stats(),
          }

  def set_running(self, v: bool) -> None:
      self._running = v


packet_store = PacketStore()
