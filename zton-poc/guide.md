# ZTON Zero-Trust Overlay Network: Demonstration & Commands Guide

This guide contains all the essential commands and step-by-step instructions to reset, launch, test, and demonstrate the **Zero-Trust Overlay Network (ZTON)** project.

---

## 1. Environment Lifecycle Commands

Run these commands in PowerShell or CMD within the `zton-poc` folder.

### 🧹 Fresh Start / Complete Reset
To wipe all container states, persistent databases, generated OpenZiti keys, and start completely clean:
```bash
# Stop all containers and remove all persistent volumes
docker compose --profile openziti down -v
```

### 🚀 Start the Entire Stack Fresh
To build and start the OpenZiti Fabric Plane, Tunnel Sidecars, and the ZTON Nodes:
```bash
# Build & start all containers in detached mode
docker compose --profile openziti up --build -d
```

### 📊 Check Live Container Status
To verify that all nodes and routing tunnelers are online and healthy:
```bash
# Check container status
docker compose --profile openziti ps
```

### 📜 View Logs
To view logs for the dashboard server or any specific service:
```bash
# View dashboard/hub logs
docker compose --profile openziti logs laptop-a --tail 100 -f

# View OpenZiti controller logs
docker compose --profile openziti logs ziti-controller --tail 100 -f
```

---

## 2. Interactive Browser Links

Once started, open these links in your browser to interact with the project:

*   🌐 **Laptop A (Hub Dashboard):** [http://localhost:8080](http://localhost:8080)
    *   *Role:* Main Security Operations Center (SOC) dashboard.
*   💻 **Laptop B (Authorized Node):** [http://localhost:8081](http://localhost:8081)
    *   *Role:* Authorized client. Can send encrypted messages and stream data.
*   📱 **Phone B (Authorized Node):** [http://localhost:8082](http://localhost:8082)
    *   *Role:* Authorized receiver. Receives and decrypts data.
*   🚫 **Phone A (Unauthorized Attacker):** [http://localhost:8083](http://localhost:8083)
    *   *Role:* Unauthorized node. Blocks access using Zero-Trust policies.
*   🔐 **OpenZiti Admin Console (ZAC):** [https://localhost:1280/zac/](https://localhost:1280/zac/)
    *   *Role:* Production OpenZiti controller management interface.

---

## 3. Step-by-Step Viva Demonstration Plan

Follow these steps to show the project's zero-trust architecture to evaluators:

### Step 1: Prove Clean State (Dashboard)
1. Open **Laptop A Dashboard** ([http://localhost:8080](http://localhost:8080)).
2. Point to the **Validation Checklist** panel on the bottom left:
   * Show that all checks are green, showing that counters start at zero and there is **no seeded history**.

### Step 2: Show Successful Secure Transmission
1. Open **Laptop B Console** ([http://localhost:8081](http://localhost:8081)).
2. Select the **Sensor Data** option, type a custom message (e.g. `TEMP: 26.8 C`), choose target **Phone B**, and click **Send Encrypted Packet**.
3. Open **Phone B Console** ([http://localhost:8082](http://localhost:8082)) and show that the message was received and **successfully decrypted**.
4. Go back to the **Dashboard** ([http://localhost:8080](http://localhost:8080)), click the packet in the log, and show the evaluators:
   * **Original size vs Compressed size** (proving bandwidth compression).
   * **Ciphertext preview** (proving data cannot be read on the wire).
   * **Ed25519 Signature** (proving cryptographic identity verification).

### Step 3: Show Zero-Trust Policy Engine Blocking An Attacker
1. Open **Phone A Console** ([http://localhost:8083](http://localhost:8083)). Phone A is an unauthorized device.
2. Type a message and click **Attempt Send (Denied)**.
3. Switch back to the **Dashboard** ([http://localhost:8080](http://localhost:8080)) and point to the red **`POLICY DENY`** log. Explain that the zero-trust engine refuses traffic from unrecognized/unauthorized sources even if they are connected to the physical overlay network.

### Step 4: Show Bulk Simulation & Anti-Replay Detection
1. On the **Dashboard** ([http://localhost:8080](http://localhost:8080)), go to the **Demonstration / Scenarios** tab.
2. Select **Scenario 2: Replay Attack (10% Replay)** and click **Run**.
3. Point to the live charts animating:
   * Explain how the **Replay Blocked** count is incrementing.
   * Explain the mathematics: the Hub tracks sequence numbers using a high-water mark (`sequence <= recv_high_water`). If an attacker intercepts a packet and injects/replays it, the Hub drops it immediately.
