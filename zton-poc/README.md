# ZTON — Zero Trust Overlay Network Demo

**An OpenZiti-assisted zero-trust lab with an inspectable raw-UDP packet overlay demo**

Enterprise-grade **SOC (Security Operations Center) dashboard** for final-year engineering evaluation. No third-party console logos.

## SOC Dashboard (Primary UI)

### Windows (PowerShell) — use these commands

```powershell
cd zton-poc
.\start-hub.ps1
# Open http://localhost:8080
```

Or set env vars manually in PowerShell:

```powershell
cd zton-poc
$env:ZTON_ROLE = "hub"
python main.py
```

**Do not use** `ZTON_ROLE=hub python main.py` — that syntax is Linux/Mac only.

### Windows CMD

```cmd
cd zton-poc
start-hub.bat
```

### 4 devices (4 PowerShell windows)

```powershell
cd zton-poc
.\start-all.ps1
```

### Linux / Mac

```bash
cd zton-poc
ZTON_ROLE=hub python main.py
```

### Build dashboard manually

```powershell
cd zton-poc\dashboard
npm install
npm run build
cd ..
.\start-hub.ps1
```

Or with Docker (builds dashboard automatically):

```bash
docker compose up --build laptop-a
# Open http://localhost:8080
```

### Realistic OpenZiti Fabric Mode

Run the upgraded stack with OpenZiti controller and edge router containers beside the ZTON packet lab:

```bash
docker compose --profile openziti up --build
```

Then open:

- http://localhost:8080 - SOC dashboard and OpenZiti fabric status
- https://localhost:1280/zac/ - OpenZiti Admin Console
- http://localhost:8081 - Laptop B packet sender
- http://localhost:8082 - Phone B packet viewer
- http://localhost:8083 - Phone A blocked client

The dashboard now separates the project into two honest layers:

| Layer | What runs | What it proves |
|-------|-----------|----------------|
| OpenZiti fabric plane | `openziti/quickstart` controller + edge router Docker containers | Production-style controller/router presence, admin console, fabric readiness |
| OpenZiti ZTON service layer | Bootstrap job creates ZTON identities, UDP/dashboard services, bind/dial policies | Concrete OpenZiti model for authorized access; Phone A has no dial access |
| ZTON packet lab | Python UDP hub/nodes | Inspectable encryption, signatures, replay blocking, per-packet policy decisions |
| Tunnel/SDK attachment | Next implementation step | Attach `ziti-edge-tunnel` sidecars or SDK clients so app packets traverse the provisioned OpenZiti services |

### Dashboard Features

| Panel | Description |
|-------|-------------|
| **System Status** | Controller, Router, Overlay, Encryption, Connected Nodes |
| **Packet Statistics** | Live animated counters (sent, accepted, dropped, replay blocked) |
| **Traffic Analytics** | Recharts: PPS, accepted vs dropped, replay attempts, volume |
| **Network Topology** | React Flow interactive graph with animated packet flows |
| **Packet Generator** | Configurable load test (count, payload type, size, replay %) |
| **Live Packet Stream** | Real-time SOC table with encryption decisions |
| **Security Events** | SOC-style feed (INFO / SUCCESS / WARNING / CRITICAL) |
| **Encryption Visualizer** | Animated plaintext → ciphertext → UDP → receiver pipeline |
| **Zero Trust Policies** | Visual allow/deny policy engine |
| **Demo Scenarios** | One-click: Normal Traffic, Replay Attack, Video Stream, Unauthorized User |
| **Presentation Mode** | Fullscreen projector layout with large metrics |

Dev mode (hot reload):

```bash
# Terminal 1: backend
ZTON_ROLE=hub python main.py
# Terminal 2: frontend
cd dashboard && npm run dev   # http://localhost:5173
```

## 4-Device Scenario

| Device | Role | URL (local) | Policy |
|--------|------|-------------|--------|
| **Laptop A** | Hub / Controller / Dashboard | http://localhost:8080 | Always allowed |
| **Laptop B** | Authorized sender (sensor, video, voice) | http://localhost:8081 | Allowed → can route to Phone B |
| **Phone B** | Authorized viewer (receives streams) | http://localhost:8082 | Allowed |
| **Phone A** | Unauthorized attacker | http://localhost:8083 | **Denied** by policy engine |

## Quick Start (1 laptop, 4 browser tabs)

```bash
cd zton-poc
docker compose up --build
```

Then open:

- http://localhost:8080 — Hub dashboard (watch all traffic live)
- http://localhost:8081 — Send as Laptop B (authorized)
- http://localhost:8082 — View as Phone B (receives forwarded packets)
- http://localhost:8083 — Try as Phone A (packets denied)

### Demo script for viva

1. **Hub dashboard** (`:8080`) — show architecture stack and 4-device topology.
2. **Laptop B** (`:8081`) — click "Sensor Data" or "Video Chunk" → watch hub log show `compress → encrypt → forward`.
3. **Phone B** (`:8082`) — confirm received decrypted payload in its log.
4. **Phone A** (`:8083`) — click "Attempt Send" → hub shows `DENY` (zero-trust policy block).
5. Point out stats: original vs compressed vs encrypted bytes, packets denied counter.

## 4 Physical Devices on a LAN

Run the **hub** on Laptop A. Run each **node** on the other three devices.

### Laptop A (Hub)

```bash
docker compose up laptop-a --build
# Or without Docker:
pip install -r requirements.txt
ZTON_ROLE=hub ZTON_WEB_PORT=8080 python main.py
```

Ensure UDP **9999** and TCP **8080** are reachable from the LAN (firewall rules).

Find Laptop A's LAN IP: `ipconfig` (Windows) or `ip addr` (Linux).

### Laptop B / Phone B / Phone A (Nodes)

On each device, set `ZTON_HUB_HOST` to Laptop A's IP (e.g. `192.168.1.10`):

```bash
# Laptop B
ZTON_ROLE=node ZTON_DEVICE_ID=laptop-b ZTON_DEVICE_NAME="Laptop B" \
  ZTON_HUB_HOST=192.168.1.10 ZTON_AUTHORIZED=true ZTON_TARGETS=phone-b,hub \
  ZTON_WEB_PORT=8081 python main.py

# Phone B
ZTON_ROLE=node ZTON_DEVICE_ID=phone-b ZTON_DEVICE_NAME="Phone B" \
  ZTON_HUB_HOST=192.168.1.10 ZTON_AUTHORIZED=true ZTON_WEB_PORT=8082 python main.py

# Phone A (unauthorized)
ZTON_ROLE=node ZTON_DEVICE_ID=phone-a ZTON_DEVICE_NAME="Phone A" \
  ZTON_HUB_HOST=192.168.1.10 ZTON_AUTHORIZED=false ZTON_WEB_PORT=8083 python main.py
```

Open each device's browser to `http://<device-ip>:<port>`.

## Architecture

```
Application
     ↓
Compression (zlib)
     ↓
Policy Engine (identity allow/deny + route rules)
     ↓
Per-Packet Encryption (AES-GCM)
     ↓
Mutual Authentication (Ed25519 signatures)
     ↓
Raw UDP Transport
     ↓
Internet / LAN
```

## What Each Layer Does

| Layer | Implementation |
|-------|----------------|
| UDP transport | Python `socket.SOCK_DGRAM` — no TCP overhead |
| Mutual auth | Ed25519 signature on every packet |
| Per-packet encryption | AES-GCM with monotonic sequence (replay protection) |
| Compression | zlib before encryption — dashboard shows byte savings |
| Policy engine | Allow-list identities, deny-list, per-route rules |
| Web UI | FastAPI + WebSocket live log — custom ZTON branding |

## Relation to OpenZiti (parent repo)

This repo also contains **OpenZiti** — a production zero-trust overlay platform. ZTON is a focused lab demo that implements the same *concepts* (UDP overlay, identity policy, encryption) in a minimal, presenter-friendly stack. The official Ziti Admin Console (`/zac/`) is **not used** in this demo.

## Legacy CLI demo

The original replay-detection CLI is still available:

```bash
python zton_demo.py server --port 9999
python zton_demo.py client --port 9999 --replay-nonce
```

## Optional: OpenZiti backend

To run OpenZiti controller alongside (separate stack):

```bash
docker compose -f docker-compose.ziti.yml up -d
```

Console at https://localhost:1280/zac/ — only if you need the full OpenZiti management plane.
