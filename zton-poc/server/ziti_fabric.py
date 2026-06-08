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
        "zton_transport": "openziti-tunnel-attached-udp",
        "traffic_integration": "ziti-edge-tunnel-sidecars",
        "provisioned_services": [
            {
                "name": "zton-udp-9999",
                "protocol": "udp",
                "intercept": "zton-hub.openziti:9999",
                "host": "laptop-a:9999",
            },
            {
                "name": "zton-dashboard-8080",
                "protocol": "tcp",
                "intercept": "zton-dashboard.openziti:8080",
                "host": "laptop-a:8080",
            },
        ],
        "provisioned_identities": [
            {"name": "zton-hub-host", "role": "Bind services"},
            {"name": "zton-laptop-b-client", "role": "Dial services"},
            {"name": "zton-phone-b-client", "role": "Dial services"},
            {"name": "zton-phone-a-client", "role": "Enrolled but no dial access"},
        ],
        "truth_model": [
            {
                "id": "fabric",
                "label": "OpenZiti fabric plane",
                "status": "active" if fabric_online else "waiting",
                "description": "Controller, edge router, identities, services, and policies provide the OpenZiti fabric layer.",
            },
            {
                "id": "zton",
                "label": "ZTON packet lab",
                "status": "active",
                "description": "Authorized ZTON node traffic targets the OpenZiti intercept host zton-hub.openziti and is carried by ziti-edge-tunnel sidecars.",
            },
            {
                "id": "next",
                "label": "SDK migration",
                "status": "optional-next-step",
                "description": "A future SDK migration could remove the TUN sidecars and call OpenZiti directly from the Python application.",
            },
        ],
        "recommended_run": "docker compose --profile openziti up --build",
    }
