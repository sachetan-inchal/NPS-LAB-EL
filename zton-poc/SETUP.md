# ZTON Project Setup Guide (Fresh Machine)

This guide provides step-by-step instructions to clone, build, and run the **Zero-Trust UDP Overlay Network (ZTON)** project on a fresh machine with **no prior dependencies or packages installed**.

---

## 🚀 Quick Start: Docker Setup (Recommended)
Using Docker is the **easiest and fastest** method. The project is fully containerized, meaning Docker will compile the React dashboard, install the Python libraries, and boot the OpenZiti network automatically. 
**You do not need to install Python, Node.js, or any packages on your host machine.**

### 1. Install Prerequisites
1. **Git**: Download and install [Git](https://git-scm.com/downloads).
2. **Docker Desktop**: Download and install [Docker Desktop](https://www.docker.com/products/docker-desktop/). Make sure Docker is running before proceeding.

### 2. Clone and Launch the Project
Open a terminal (PowerShell or Bash) and run:

```bash
# Clone the repository
git clone https://github.com/sachetan-inchal/NPS-LAB-EL.git
cd NPS-LAB-EL/zton-poc

# Build and run the entire network stack in the background
docker compose --profile openziti up --build -d
```

### 3. Verify the Running Containers
Wait about **30–45 seconds** for OpenZiti to initialize its PKI, controller databases, and edge routers. Verify they are all running:
```bash
docker compose --profile openziti ps
```

You should see 9 containers with status `Up`:
* `ziti-controller` (OpenZiti Controller API & ZAC)
* `ziti-router` (OpenZiti Edge Router)
* `ziti-tunnel-hub`, `ziti-tunnel-laptop-b`, `ziti-tunnel-phone-b`, `ziti-tunnel-phone-a` (Sidecar tunnelers)
* `zton-laptop-a` (Hub & SOC Dashboard)
* `zton-laptop-b` (Authorized Sender Console)
* `zton-phone-b` (Authorized Viewer Console)
* `zton-phone-a` (Blocked Attacker Console)

---

## 💻 Alternative: Manual Local Setup (Host Python & Node.js)
If you prefer to run the project natively on your host machine without Docker, follow these steps.

### 1. Install Host Prerequisites
1. **Git**: [Git Downloads](https://git-scm.com/downloads).
2. **Python 3.10+**: Download [Python](https://www.python.org/downloads/). 
   *⚠️ **IMPORTANT**: During installation, check the box that says **"Add Python.exe to PATH"**.*
3. **Node.js (LTS)**: Download [Node.js](https://nodejs.org/). This includes `npm`.

### 2. Configure and Run (Windows PowerShell)
Open PowerShell as an Administrator, navigate to the project directory, and execute:

```powershell
# 1. Clone the repository
git clone https://github.com/sachetan-inchal/NPS-LAB-EL.git
cd NPS-LAB-EL/zton-poc

# 2. Build the React Frontend Dashboard
cd dashboard
npm install
npm run build
cd ..

# 3. Install Python Dependencies
pip install -r requirements.txt

# 4. Start the 4-Device Network Simulation
.\start-all.ps1
```

---

## 🌐 Navigating the Dashboards
Once the services are running, open the following URLs in your web browser:

* 📊 **Laptop A (Hub / SOC Dashboard)**: [http://localhost:8080](http://localhost:8080)
* 💻 **Laptop B (Authorized Sender)**: [http://localhost:8081](http://localhost:8081)
* 📱 **Phone B (Authorized Viewer)**: [http://localhost:8082](http://localhost:8082)
* 🚫 **Phone A (Blocked Attacker)**: [http://localhost:8083](http://localhost:8083)
* 🔐 **OpenZiti Admin Console (ZAC)**: [https://localhost:1280/zac/](https://localhost:1280/zac/)
  * *Bypass any browser SSL warnings (click Advanced -> Proceed).*
  * **Username**: `admin`
  * **Password**: `adminpassword`
  * **Controller URL**: `https://localhost:1280`

---

## 🧪 Testing the Setup (Live Verification)
1. Open the **SOC Dashboard (8080)** and the **Laptop B (8081)** console in split tabs.
2. On **Laptop B**, write a custom message, select **Phone B** as the target, and click **Send Encrypted Packet**.
3. On **Phone B (8082)**, check the incoming message list to see the decrypted text.
4. On the **SOC Dashboard (8080)**, verify that the packet was logged as `ACCEPTED`. You can click on the row in the **Packet History** table to inspect its real-time:
   * Compressed footprint savings
   * AES-GCM encrypted ciphertext
   * Verified Ed25519 signature
