"""Packet simulation — real crypto + real replay reinjection."""

import random
import threading
import time

from server.packet_store import HUB_ID, PAYLOAD_TYPES, SENDERS, packet_store

__all__ = ["simulator", "PAYLOAD_TYPES"]


class Simulator:
    def __init__(self) -> None:
        self._thread: threading.Thread | None = None
        self._stop = threading.Event()
        self._lock = threading.Lock()
        self._accepted_pool: list[dict] = []

    def reset(self) -> None:
        with self._lock:
            self._stop.set()
            if self._thread and self._thread.is_alive():
                self._thread.join(timeout=2)
            self._stop = threading.Event()
            self._accepted_pool.clear()
        packet_store.reset()
        packet_store._emit("INFO", "Dashboard reset — all counters cleared")

    def stop(self) -> None:
        self._stop.set()
        packet_store.set_running(False)
        packet_store._emit("INFO", "Simulation stopped")

    def start_async(self, **kwargs) -> None:
        if self._thread and self._thread.is_alive():
            self.stop()
            self._thread.join(timeout=2)
        self._stop.clear()
        self._thread = threading.Thread(target=self.run_batch, kwargs=kwargs, daemon=True)
        self._thread.start()

    def run_batch(
        self,
        count: int,
        payload_type: str,
        payload_size: int,
        replay_pct: float,
        interval_ms: int = 30,
        force_sender: str | None = None,
    ) -> None:
        packet_store.set_running(True)
        packet_store._emit("INFO", f"Simulation started — {count} packets, {payload_type}")
        start = time.time()
        processed = 0

        for i in range(count):
            if self._stop.is_set():
                break

            sender_id = force_sender or random.choice([s["id"] for s in SENDERS if s["authorized"]])
            if force_sender == "phone-a":
                sender_id = "phone-a"

            receiver = HUB_ID
            if sender_id == "laptop-b" and random.random() < 0.35:
                receiver = "phone-b"

            is_replay = replay_pct > 0 and random.random() < replay_pct and len(self._accepted_pool) > 0
            if is_replay:
                old = random.choice(self._accepted_pool)
                pkt = packet_store.process_simulated_packet(
                    sender_id=old["sender_id"],
                    payload_type=old.get("payload_type", payload_type),
                    payload_size=old.get("payload_size", payload_size),
                    receiver=old.get("receiver", HUB_ID),
                    force_replay_of=old,
                )
            else:
                pkt = packet_store.process_simulated_packet(
                    sender_id=sender_id,
                    payload_type=payload_type,
                    payload_size=payload_size,
                    receiver=receiver,
                )
                if pkt.status == "ACCEPTED":
                    self._accepted_pool.append(pkt.to_dict())
                    if len(self._accepted_pool) > 200:
                        self._accepted_pool = self._accepted_pool[-200:]

            processed += 1
            if processed % 20 == 0:
                elapsed_so_far = max(time.time() - start, 0.001)
                packet_store.record_pps_bucket(round(processed / elapsed_so_far, 1))
            if interval_ms > 0:
                time.sleep(interval_ms / 1000.0)

        elapsed = max(time.time() - start, 0.001)
        packet_store.record_pps_bucket(round(processed / elapsed, 1))
        packet_store.set_running(False)
        packet_store._emit("INFO", f"Simulation complete — {processed} packets processed")

    def snapshot(self) -> dict:
        return packet_store.snapshot()


simulator = Simulator()
