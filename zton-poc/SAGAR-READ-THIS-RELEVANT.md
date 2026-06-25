# SAGAR-READ-THIS: Methodology, Tools, and Techniques Report

This document reports the testing methodologies, penetration tools, and validation techniques used to prove the security posture of ZTON.

---

## 1. Security Testing Methodology
To verify that the Zero-Trust Overlay is properly protecting traffic, we execute a security audit using a Kali Linux penetration testing machine connected to the same local subnet (LAN Wi-Fi).

```
  +----------------------+             +-------------------------+
  |  Kali Linux Laptop   |             | Windows Host (Docker)   |
  |                      |  Wi-Fi LAN  |                         |
  |  - Sniffs w/ TShark  | <=========> |  - Runs Hub Dashboard   |
  |  - Injects w/ Scapy  |             |  - Runs Node Tunnels    |
  +----------------------+             +-------------------------+
```

---

## 2. Tools and Techniques Report

### 🔍 Tool 1: Wireshark (Network Sniffing)
*   **Technique:** Capturing raw frame buffers on the network interface card.
*   **Filter Syntax:** `udp.port == 9999`
*   **Verification:** Open Laptop B and send a message. Inspect the UDP payload in Wireshark. You will observe that the plaintext is absent; only base64 ciphertext (`payload_b64`) and the signature metadata are visible on the wire. This proves **Confidentiality** against active sniffing.

### 🗺️ Tool 2: Nmap (Port Scanning & Footprinting)
*   **Technique:** Syn Stealth Scan (`-sS`) and UDP Scan (`-sU`) to locate active listeners on the host machine.
*   **Command:**
    ```bash
    nmap -sS -sU -p 8080,8081,8082,8083,9999 <Target-Windows-IP>
    ```
*   **Verification:** Shows that ports are visible, but trying to query the UDP port directly yields no protocol information because unauthenticated scans do not trigger responses.

### 🐍 Tool 3: Scapy (Active Packet Forgery & Tampering)
*   **Technique:** Python-based raw socket injection to forge custom UDP structures.
*   **Verification Scenario A (Data Spoofing):**
    The attacker intercepts a packet, modifies the message content string, and sends it.
    *   *Result:* The Hub's signature check fails. The packet is dropped immediately, and a **`Mutual auth failed`** critical event is registered.
*   **Verification Scenario B (Replay Attack):**
    The attacker captures a valid signed packet and sends the exact same packet hex stream again.
    *   *Result:* The Hub detects that the sequence number is duplicate (`sequence <= recv_high_water`). It drops the packet, registers a **`REPLAY DETECTED`** warning, and increments the **Dropped** packet count.

### 🔨 Tool 4: Netcat / Nping (Raw Socket Injection)
*   **Technique:** Injecting raw text directly to the socket port.
*   **Command:**
    ```bash
    echo "INJECTED_PAYLOAD" | nc -u -w 1 <Target-Windows-IP> 9999
    ```
*   **Verification:** The Hub parses the input. Since it is not a valid JSON structure, the parser throws an exception, logs **`Malformed packet`**, and drops it.

### 🌊 Tool 5: Hping3 (UDP Stress / Denial of Service)
*   **Technique:** Flooding the target UDP socket port with raw packets to evaluate service stability.
*   **Command:**
    ```bash
    sudo hping3 --udp -p 9999 --flood <Target-Windows-IP>
    ```
*   **Verification:** The SOC dashboard's Packets Per Second (PPS) area chart spikes, showing real-time load, while the Hub discards the flood of unauthenticated packets.
