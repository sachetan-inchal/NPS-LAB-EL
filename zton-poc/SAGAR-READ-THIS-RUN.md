# SAGAR-READ-THIS: How to Run the Project

This file details the step-by-step commands to spin up the entire secure zero-trust network environment.

---

## 1. Prerequisites
*   Ensure **Docker Desktop** is open and running on the host machine.
*   Open a terminal (such as PowerShell) and navigate into the `zton-poc` directory.

---

## 2. Environment Lifecycle Commands

### 🧹 Fresh Start & Reset
Before starting the system, execute this command to wipe any cached Docker container states, stale databases, and old configurations:
```powershell
docker compose --profile openziti down -v
```

### 🚀 Launch the Secure Network Stack
To build, compile the dashboard UI, and boot the entire network in the background (detached mode):
```powershell
docker compose --profile openziti up --build -d
```
*(Wait 45-60 seconds for the backend services, controllers, and tunnelers to complete bootstrap registration).*

### 📊 Check Health Status
To verify that all services, nodes, and tunnelers are successfully running:
```powershell
docker compose --profile openziti ps
```

---

## 3. Interactive Web Dashboards
Once all services show a status of `Up`, open these links in separate tabs in your web browser:

*   🌐 **Security Operations Center (SOC) Dashboard (Laptop A Hub):** [http://localhost:8080](http://localhost:8080)
*   💻 **Laptop B Console (Authorized Sender):** [http://localhost:8081](http://localhost:8081)
*   📱 **Phone B Console (Authorized Viewer):** [http://localhost:8082](http://localhost:8082)
*   🚫 **Phone A Console (Blocked Attacker):** [http://localhost:8083](http://localhost:8083)

---

## 4. Live Step-by-Step Demo Guide for Evaluators

### Step 1: Prove Clean State
*   Open the **SOC Dashboard (8080)** and scroll down to the **Validation Checklist** panel on the bottom left.
*   Point out that all checks are green, showing that counters start at zero and there is no fake/seeded history.

### Step 2: Show Encrypted Message Transmission
*   Go to the **Laptop B Console (8081)**. Select **Sensor Data** (or write a custom text), choose **Phone B** as target, and click **Send Encrypted Packet**.
*   Go to **Phone B Console (8082)** and show that the message was received and successfully decrypted.
*   Go back to the **SOC Dashboard (8080)**. Expand the newly arrived packet and show the original size, compressed size, AES-GCM encrypted ciphertext, and the verified Ed25519 signature.

### Step 3: Show Zero-Trust Rule Blocking
*   Go to **Phone A Console (8083)** (unauthorized device). Click **Attempt Send**.
*   Switch to the **SOC Dashboard (8080)** and show that a red **`POLICY DENY`** event was fired and the packet was instantly dropped.

### Step 4: Run Replay Attack Simulation
*   On the **SOC Dashboard (8080)**, go to the **Demonstration / Scenarios** tab.
*   Select **Scenario 2: Replay Attack (10% Replay)** and click **Run**.
*   Watch the live graphs animate. Show the evaluators how the **Replay Blocked** graph spikes as the Hub drops duplicate sequence numbers.
