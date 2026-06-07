# Quick Demo Guide — 4 Tabs

## Start everything

```powershell
cd zton-poc
.\start-all.ps1
```

Then **hard refresh** each browser tab: `Ctrl + Shift + R`

---

## What each tab shows now

| Tab | URL | What you see | What to do |
|-----|-----|--------------|------------|
| **Hub** | http://localhost:8080 | Full SOC dashboard | Watch traffic, run scenarios |
| **Laptop B** | http://localhost:8081 | **Device Send Console** | Type message → Send |
| **Phone B** | http://localhost:8082 | **Device Send Console** | Receive + optional send |
| **Phone A** | http://localhost:8083 | **Device Send Console** (red) | Attempt send → denied |

---

## Laptop B (8081) — step by step

1. Click **Chat Message** (or Sensor / Video / Voice / File)
2. **Edit the text box** — type anything you want
3. Choose target: **Phone B** or **Hub**
4. Click **Send Encrypted Packet**
5. Switch to **8080** tab — see ACCEPTED in logs

---

## Phone A (8083) — show zero-trust block

1. Type: `ATTACK: unauthorized access attempt`
2. Click **Attempt Send (Denied)**
3. Switch to **8080** — see DENY / CRITICAL event

---

## Hub (8080) — bulk scenarios

Click **Demonstration** tab → Run Scenario 1, 2, 3, or 4

---

## If tabs look wrong

Rebuild and restart:

```powershell
cd zton-poc\dashboard
npm run build
cd ..
# Close all 4 terminal windows, then:
.\start-all.ps1
```

Hard refresh browsers: `Ctrl + Shift + R`
