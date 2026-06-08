"""OpenZiti fabric observability helpers for the ZTON dashboard."""

from __future__ import annotations

import os
import socket
from dataclasses import dataclass


@dataclass(frozen=True)
class EndpointCheck:
    name: str
    host: str
    port: int
    status: str
    detail: str


def _tcp_check(name: str, host: str, port: int, timeout: float = 1.0) -> EndpointCheck:
    try:
        with socket.create_connection((host, port), timeout=timeout):
            return EndpointCheck(name, host, port, "ONLINE", f"TCP {host}:{port} reachable")
    except OSError as exc:
        return EndpointCheck(name, host, port, "OFFLINE", f"TCP {host}:{port} unreachable: {exc.__class__.__name__}")


def _service_status(check: EndpointCheck) -> dict:
    return {
        "name": check.name,
        "host": check.host,
        "port": check.port,
        "status": check.status,
        "detail": check.detail,
    }


def get_fabric_status() -> dict:
    """Return OpenZiti fabric status without requiring controller credentials."""
    ctrl_host = os.getenv("ZITI_CTRL_HOST", "ziti-controller")
    ctrl_port = int(os.getenv("ZITI_CTRL_PORT", "1280"))
    router_host = os.getenv("ZITI_ROUTER_HOST", "ziti-router")
    router_port = int(os.getenv("ZITI_ROUTER_PORT", "3022"))
    console_url = os.getenv("ZITI_CONSOLE_URL", "https://localhost:1280/zac/")

    controller = _tcp_check("OpenZiti Controller", ctrl_host, ctrl_port)
    router = _tcp_check("OpenZiti Edge Router", router_host, router_port)
    fabric_online = controller.status == "ONLINE" and router.status == "ONLINE"

    return {
        "mode": "openziti-assisted-lab",
        "fabric_online": fabric_online,
        "controller": _service_status(controller),
        "router": _service_status(router),
        "console_url": console_url,
        "zton_transport": "custom-udp-lab",
        "traffic_integration": "observed-side-by-side",
        "truth_model": [
            {
                "id": "fabric",
                "label": "OpenZiti fabric plane",
                "status": "active" if fabric_online else "waiting",
                "description": "Controller and edge router containers provide the production zero-trust fabric plane.",
            },
            {
                "id": "zton",
                "label": "ZTON packet lab",
                "status": "active",
                "description": "The demo packets still use the custom raw UDP path so encryption, signatures, policy, and replay behavior remain inspectable.",
            },
            {
                "id": "next",
                "label": "Full traffic migration",
                "status": "next-step",
                "description": "To make application traffic OpenZiti-native, add identities, services, policies, and an SDK or ziti-edge-tunnel in each app container.",
            },
        ],
        "recommended_run": "docker compose --profile openziti up --build",
    }
