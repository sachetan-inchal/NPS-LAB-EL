"""ZTON demo web server — hub dashboard and per-device endpoints."""

import asyncio
import os
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel

from server.soc_api import router as soc_router
from server.live_api import router as live_router
from server.device_api import router as device_router

from zton.hub import ZtonHub
from zton.node import ZtonNode

WEB_DIR = Path(__file__).resolve().parent.parent / "web"
DASHBOARD_DIR = Path(__file__).resolve().parent.parent / "dashboard" / "dist"

# Global runtime state
hub: ZtonHub | None = None
node: ZtonNode | None = None


class SendRequest(BaseModel):
    message: str
    target_id: str = ""


DEVICE_TOPOLOGY = [
    {
        "device_id": "laptop-a",
        "device_name": "Laptop A",
        "role": "Hub / Controller",
        "icon": "hub",
        "authorized": True,
        "description": "Overlay hub, policy engine, dashboard",
    },
    {
        "device_id": "laptop-b",
        "device_name": "Laptop B",
        "role": "Authorized Sender",
        "icon": "laptop",
        "authorized": True,
        "description": "Sends sensor data and video chunks through overlay",
        "targets": ["phone-b", "hub"],
    },
    {
        "device_id": "phone-b",
        "device_name": "Phone B",
        "role": "Authorized Viewer",
        "icon": "phone",
        "authorized": True,
        "description": "Receives forwarded encrypted streams",
        "targets": ["hub"],
    },
    {
        "device_id": "phone-a",
        "device_name": "Phone A",
        "role": "Unauthorized Client",
        "icon": "phone-blocked",
        "authorized": False,
        "description": "Fails zero-trust policy — packets denied",
        "targets": [],
    },
]


def _init_runtime(loop: asyncio.AbstractEventLoop) -> None:
    global hub, node
    role = os.getenv("ZTON_ROLE", "hub")
    device_id = os.getenv("ZTON_DEVICE_ID", "laptop-a")
    device_name = os.getenv("ZTON_DEVICE_NAME", "Laptop A (Hub)")
    udp_port = int(os.getenv("ZTON_UDP_PORT", "9999"))
    hub_host = os.getenv("ZTON_HUB_HOST", "127.0.0.1")
    authorized = os.getenv("ZTON_AUTHORIZED", "true").lower() == "true"
    targets = [t.strip() for t in os.getenv("ZTON_TARGETS", "").split(",") if t.strip()]

    if role == "hub":
        hub = ZtonHub(device_id=device_id, device_name=device_name, udp_port=udp_port, loop=loop)
        hub.configure_peers([
            {"device_id": "laptop-b", "authorized": True, "targets": ["phone-b", "hub"]},
            {"device_id": "phone-b", "authorized": True, "targets": ["hub"]},
            {"device_id": "phone-a", "authorized": False, "targets": []},
        ])
        hub.start()
    else:
        node = ZtonNode(
            device_id=device_id,
            device_name=device_name,
            hub_host=hub_host,
            hub_port=udp_port,
            authorized=authorized,
            targets=targets,
        )
        node.start()


@asynccontextmanager
async def lifespan(app: FastAPI):
    _init_runtime(asyncio.get_running_loop())
    yield
    if hub:
        hub.stop()
    if node:
        node.stop()


app = FastAPI(title="ZTON SOC Dashboard", lifespan=lifespan)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.include_router(soc_router)
app.include_router(live_router)
app.include_router(device_router)
app.mount("/static", StaticFiles(directory=WEB_DIR), name="static")
if DASHBOARD_DIR.exists():
    app.mount("/assets", StaticFiles(directory=DASHBOARD_DIR / "assets"), name="dashboard-assets")


@app.get("/")
async def index():
    if (DASHBOARD_DIR / "index.html").exists():
        return FileResponse(DASHBOARD_DIR / "index.html")
    return FileResponse(WEB_DIR / "index.html")


@app.get("/soc")
async def soc_dashboard():
    if (DASHBOARD_DIR / "index.html").exists():
        return FileResponse(DASHBOARD_DIR / "index.html")
    return FileResponse(WEB_DIR / "index.html")


@app.get("/api/topology")
async def topology():
    return {"devices": DEVICE_TOPOLOGY, "role": os.getenv("ZTON_ROLE", "hub")}


@app.get("/api/status")
async def status():
    role = os.getenv("ZTON_ROLE", "hub")
    if role == "hub" and hub:
        return {"role": "hub", **hub.status()}
    if node:
        return {"role": "node", **node.status()}
    return {"role": role, "status": "initializing"}


@app.get("/api/events")
async def events():
    if hub:
        return {"events": hub.events.history()}
    if node:
        return {"events": node._last_events}
    return {"events": []}


@app.post("/api/send")
async def send_packet(req: SendRequest):
    if node:
        try:
            stats = node.send_message(req.message, req.target_id)
            return {"ok": True, "stats": stats}
        except Exception as exc:
            return {"ok": False, "error": str(exc)}
    if hub:
        # Hub can inject a test packet as if from laptop-b for demo without all nodes running
        return {"ok": False, "error": "Hub cannot send — use a node device or POST from laptop-b UI"}
    return {"ok": False, "error": "No node running"}


@app.websocket("/ws/events")
async def ws_events(websocket: WebSocket):
    await websocket.accept()
    if not hub:
        await websocket.send_json({"kind": "info", "message": "Node mode — polling /api/events instead"})
        await websocket.close()
        return

    q = hub.events.subscribe()
    try:
        for event in hub.events.history():
            await websocket.send_json(event)
        while True:
            event = await q.get()
            await websocket.send_json(event)
    except WebSocketDisconnect:
        pass
    finally:
        hub.events.unsubscribe(q)


def run():
    import uvicorn
    port = int(os.getenv("ZTON_WEB_PORT", "8080"))
    uvicorn.run("server.app:app", host="0.0.0.0", port=port, reload=False)
