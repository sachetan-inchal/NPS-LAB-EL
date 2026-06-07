"""Zero-trust policy engine for ZTON overlay."""

from dataclasses import dataclass, field


@dataclass
class PolicyDecision:
    allowed: bool
    reason: str
    rule: str


@dataclass
class PolicyEngine:
    """Identity-aware forwarding policy."""

    authorized_devices: set[str] = field(default_factory=set)
    blocked_devices: set[str] = field(default_factory=set)
    allowed_targets: dict[str, set[str]] = field(default_factory=dict)

    def register_device(self, device_id: str, authorized: bool, targets: list[str] | None = None) -> None:
        if authorized:
            self.authorized_devices.add(device_id)
            self.blocked_devices.discard(device_id)
            if targets:
                self.allowed_targets[device_id] = set(targets)
        else:
            self.blocked_devices.add(device_id)
            self.authorized_devices.discard(device_id)

    def can_send(self, device_id: str) -> PolicyDecision:
        if device_id in self.blocked_devices:
            return PolicyDecision(False, "Device is explicitly unauthorized", "deny-list")
        if device_id not in self.authorized_devices:
            return PolicyDecision(False, "Device not in authorized identity set", "identity-policy")
        return PolicyDecision(True, "Identity verified and authorized", "allow-list")

    def can_forward(self, sender_id: str, target_id: str) -> PolicyDecision:
        send_decision = self.can_send(sender_id)
        if not send_decision.allowed:
            return send_decision
        if not target_id:
            return PolicyDecision(True, "Broadcast to hub permitted", "hub-relay")
        allowed = self.allowed_targets.get(sender_id, set())
        if target_id in allowed or target_id == "hub":
            return PolicyDecision(True, f"Route {sender_id} → {target_id} permitted", "route-policy")
        return PolicyDecision(False, f"Route {sender_id} → {target_id} denied by policy", "route-policy")

    def snapshot(self) -> dict:
        return {
            "authorized": sorted(self.authorized_devices),
            "blocked": sorted(self.blocked_devices),
            "routes": {k: sorted(v) for k, v in self.allowed_targets.items()},
        }
