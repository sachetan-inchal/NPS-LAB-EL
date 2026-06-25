


# DEPARTMENT OF COMPUTER SCIENCE AND ENGINEERING


PROJECT TITLE


ZTON: A Zero Trust Overlay Network Built on RAW UDP Sockets and Per-Packet Encryption

NPS LAB –EL (CS362IA)

# REPORT

Submitted by



Under the guidance of

Prof. Rajatha

## RV College of Engineering

In partial fulfillment for the award of degree of

## Bachelor of Engineering in

Computer Science and Engineering 2025-2026









# CERTIFICATE



Certified that the project work titled : “ZTON: A Zero Trust Overlay Network Built on RAW UDP Sockets” is carried out by Sachetan Inchal(1RV23CS208), Rishi P (1RV23CS196), Sagar TH (1RV23CS210) who are Bonafide students of RV College of Engineering, Bengaluru, in partial fulfilment for the award of degree of Bachelor of Engineering in Computer Science and Engineering of the Visvesvaraya Technological University, Belagavi during the academic year 2025-2026. It is certified that all corrections/suggestions indicated for the Internal Assessment have been incorporated in the report deposited in the departmental library. The report has been approved as it satisfies the academic requirements in respect of experiential learning work prescribed by the institution for the said degree.





Signature of Guide	Signature of Head of Department Dr Shanta Rangaswamy


External viva

Name of Examiners	Signature with Date

1

## 2





# DECLARATION

We, Sachetan Inchal, Rishi P, Sagar TH, students of fifth semester B.E., department of CSE, RV College of Engineering, Bengaluru, hereby declare that Artificial Intelligence and Machine Learning (IS353IA), LAB Experiential Learning Project “ZTON: A Zero Trust Overlay Network Built on RAW UDP Sockets” has been carried out by us and submitted in partial fulfilment for the award of degree of Bachelor of Engineering in Computer Science and Engineering during the academic year 2025-26. We also declare that any Intellectual Property Rights generated out of this project carried out at RVCE will be the property of RV College of Engineering, Bengaluru and we will be one of the authors of the same.

We also declare that any Intellectual Property Rights generated out of this project carried out at RVCE will be the property of RV College of Engineering, Bengaluru and we will be one of the authors of the same.




Place : RV College of Engineering, Bangalore (560059), India Date:


Name	Signature

SACHETAN INCHAL (1RV23CS208)

RISHI P (1RV23CS196)

SAGAR TH (1RV23CS210)







# ACKKNOWLEDGEMENT

I express my sincere gratitude to our guides Prof. Rajatha(CSE DEPT) for their continuous support, valuable suggestions, and insightful guidance throughout the course of our experiential project work. Their encouragement and technical inputs were instrumental not only in the successful completion of the project but also in the preparation of this thesis.

I am deeply thankful to Dr. Ramakanth Kumar P., Professor and Dean (CSE Cluster), Department of Computer Science and Engineering, RV College of Engineering, for his constant motivation and guidance, which greatly contributed to shaping this work.

I extend my sincere appreciation to Dr. Shanta Rangaswamy, Professor and Head, Department of Computer Science and Engineering, RV College of Engineering, for her unwavering support, encouragement, and administrative assistance throughout the project duration.

I also express my heartfelt gratitude to our respected Principal, Dr. K. N. Subramanya, for his encouragement and appreciation of this project work.

I thank all the teaching and technical staff of the Department of Computer Science and Engineering, RVCE, for their support and cooperation during the execution of this project.

Finally, I would like to acknowledge my family members and friends for their constant moral support, encouragement, and patience, which played a vital role in the successful completion of this project.





## Abstract



Modern network security architectures relying on session-level trust expose critical infrastructure to devastating post-handshake attacks, packet injection, and replay vulnerabilities—especially in real-time IoT and telemetry environments where low latency is paramount. This project introduces ZTON (Zero Trust Overlay Network), a secure, low-latency communication framework built on raw UDP sockets and per-packet cryptographic enforcement. ZTON strictly adheres to the "Never Trust, Always Verify" paradigm by validating every individual datagram before acceptance, effectively decoupling security from session duration. The system integrates AES-GCM for authenticated encryption, Ed25519 digital signatures for cryptographic device identity verification, and incremental sequence numbers to enforce robust replay protection. The framework is containerized via Docker and utilizes the OpenZiti overlay for secure, zero-configuration routing, while a real-time React-based SOC (Security Operations Center) dashboard provides continuous monitoring and threat visualization. Experimental validation of the pilot deployment achieved a 100% Packet Security Integrity Rate (PSIR) and a 100% Replay Attack Detection Rate (RADR), alongside a 70% Bandwidth Efficiency Score (BES) through zlib compression. The system demonstrated sub-2ms packet processing latency with an encryption throughput of 130 MB/s on consumer-grade hardware. ZTON proves that advanced cryptographic protocols can be efficiently executed over stateless UDP, providing a scalable, auditable, and robust alternative to traditional VPN

architectures for modern distributed networks.

# CHAPTER 1

## Introduction

Modern digital communication systems face persistent security threats including packet spoofing, session hijacking, and replay attacks. Traditional solutions, such as VPNs and TLS-based tunnels, operate on a fundamental flaw: they establish implicit trust at the session layer. Once the initial handshake completes, the entire data stream is considered authenticated, leaving systems vulnerable to post-handshake injection and unauthorized data tampering. Furthermore, the handshake overhead and protocol encapsulation of TCP/TLS increase latency by up to 60% and transmission footprint by 40%, making these conventional approaches inadequate for real-time IoT environments and low-latency UDP streams. Consequently, there is a critical requirement for a security architecture that upholds integrity on a per-packet basis without compromising performance.

To address these limitations, this project presents ZTON (Zero Trust Overlay Network), a framework built entirely on raw UDP sockets and per-packet encryption. ZTON strictly enforces the "Never Trust, Always Verify" principle by authenticating and validating every single datagram before it is accepted by the receiver. By integrating AES-GCM for confidential encryption, Ed25519 digital signatures for cryptographic identity verification, and sequence-number-based replay protection, the system decouples security from session duration. The framework leverages the OpenZiti overlay network for secure routing and is complemented by a real-time React-based SOC dashboard, providing administrators with immediate visibility into network metrics and security alerts. Through this design, ZTON eliminates the vulnerabilities of legacy session-based protocols, ensuring high-throughput, low-latency, and auditable communication for modern distributed networks.







# CHAPTER 2

Problem Definition

Problem Statement

Traditional network architectures rely on a session-based trust model, where authentication occurs only during the initial handshake. Once a connection is established, all subsequent packets are implicitly trusted, creating a critical vulnerability window. Attackers can exploit this weakness through session hijacking, injecting malicious payloads into an already authenticated stream without triggering any further verification. Additionally, the lack of per-packet state tracking in standard UDP and TCP stacks allows adversaries to capture and replay valid packets, causing duplicate command executions and system errors. These security gaps are especially dangerous in real-time IoT and industrial telemetry systems, where a single compromised packet can lead to catastrophic physical or operational failures.

Furthermore, the overhead introduced by traditional TLS/TCP tunnels—multiple round-trip handshakes and heavy protocol encapsulation—renders them impractical for low-latency environments. This overhead increases bandwidth consumption by up to 40% and latency by 60%, directly conflicting with the performance requirements of time-sensitive applications. There is a clear need for a security framework that provides rigorous, per-packet validation and integrity checks without sacrificing the speed and efficiency of stateless UDP communication. ZTON directly addresses this challenge by implementing a Zero Trust architecture that verifies identity, integrity, and freshness on every single packet, bridging the gap between high-assurance security and low-latency networking.

2.2 Background Information (Literature review)




# CHAPTER 3

#### Objectives

#### 3.1 Primary Objectives

#### Develop a Per-Packet Zero Trust Overlay Network: Design and implement a secure communication framework that rigorously authenticates, authorizes, and validates every single data packet independently, eliminating reliance on session-level trust.

#### Implement End-to-End Cryptographic Security: Integrate AES-GCM authenticated encryption to ensure data confidentiality and integrity, and Ed25519 digital signatures to provide cryptographically verifiable device identity for every transmitted datagram.

#### Enforce Identity-Based Access Control: Operationalize a policy engine that strictly authorizes communication based on registered Ed25519 public keys rather than IP addresses or network perimeters, ensuring only legitimate devices can transmit data.

#### Achieve High-Throughput, Low-Latency Performance: Build the system entirely over raw UDP sockets with zlib compression to minimize cryptographic overhead, targeting sub-2ms packet processing latency and encryption throughput exceeding 130 MB/s on standard consumer hardware.



#### 3.2 Secondary Objectives

#### Implement Robust Replay Attack Prevention: Develop an incremental sequence number tracking mechanism that detects and discards duplicate packets, ensuring that captured valid traffic cannot be re-injected into the network by malicious actors.

#### Build a Real-Time SOC Monitoring Dashboard: Create an interactive React-based dashboard that provides live visibility into packet throughput, verification success/failure rates, and immediate alerting for unauthorized access attempts, replay attacks, or malformed packets.

#### Establish Containerized, Reproducible Deployment: Utilize Docker and Docker Compose to encapsulate all services (sender nodes, hub, OpenZiti overlay, and frontend), ensuring the system can be deployed consistently across different host environments with minimal setup.

#### Validate Security Posture via Simulated Attacks: Conduct formal penetration testing using industry-standard tools (Wireshark, Scapy, Nmap, Hping3) to prove the system's resilience against real-world attack vectors including data spoofing, replay injection, and denial-of-service flooding.




# CHAPTER 4

## Methodology

The ZTON framework follows a layered, security-first architecture that enforces per-packet verification over raw UDP sockets. The system operates through a sequential pipeline: sender-side compression and AES-GCM encryption, transport over the OpenZiti overlay, and hub-side validation involving Ed25519 signature checks, identity policy enforcement, and replay protection. All cryptographic logic is implemented in Python and containerized using Docker, with real-time monitoring provided by an integrated SOC dashboard.

Approach

The overall strategy for ZTON is built on a "Security-by-Design" layered architecture. The system strictly separates networking logic from cryptographic enforcement to ensure modularity, scalability, and adherence to the "Never Trust, Always Verify" principle. The approach is structured into four distinct, sequential layers:

Preprocessing & Transmission Layer (Sender Side)

Accepts plaintext input via a React-based web console.

Compresses the payload using zlib to reduce bandwidth overhead.

Encrypts the compressed data using AES-GCM (256-bit key) for confidentiality.

Signs the ciphertext using an Ed25519 private key for cryptographic identity.

Assigns a monotonically increasing sequence number for replay prevention.

Constructs a JSON-serialized ZtonPacket and transmits it over a raw UDP socket.

Overlay Transport Layer (OpenZiti Fabric)

The client’s OpenZiti Tunneler Sidecar intercepts the UDP datagram.

The packet is wrapped inside the secure fabric tunnel, encapsulated with overlay encryption.

The Fabric Router Service forwards the packet through the Zero Trust mesh.

The Hub’s Tunneler Sidecar receives the stream, decapsulates the tunnel envelope, and delivers the raw UDP packet to the Hub’s internal socket.

Verification & Routing Layer (Hub Side)

Receives raw UDP packets on port 9999.

Deserializes the ZtonPacket from the byte stream.

Executes the Hub Verification Pipeline (Ed25519 signature check, identity policy check, sequence number validation, AES-GCM decryption, zlib decompression).

Routes verified plaintext to the intended receiver node via the OpenZiti overlay.

Monitoring & Visualization Layer (SOC Dashboard)

Streams all verification outcomes (success/failure) and packet metadata to a React frontend.

Displays real-time graphs for throughput, active alerts, and node status.

Logs detailed audit trails for every dropped packet (due to signature failure, policy denial, or replay detection).


Fig 4.1-Workflow diagram of Zero Trust Overlay Network (ZTON).


Theoretical Framework:
ZTON is theoretically grounded in the Zero Trust Architecture (NIST SP 800-207). This framework mandates continuous verification of all entities, regardless of network location. ZTON operationalizes this theory by enforcing cryptographic identity checks and policy validations at the per-packet level, rather than the session level, ensuring that trust is never implicitly granted.

Procedures

The project execution followed a rigorous five-phase development lifecycle, broken down into granular technical milestones, exact implementation steps, and formal validation procedures.

Phase 1: Cryptographic Primitive Selection and Prototyping (Timeline: Week 1 – Week 2)

1.1. Requirement Definition: Finalized the Zero Trust functional requirements. Defined the packet structure: Plaintext (input) → Zlib Compression → AES-GCM Encryption → Ed25519 Signature → Sequence Number → Raw UDP Transmission.

1.2. Development Environment Setup:

Installed Python 3.10 on the host machine (Windows 11).

Created a dedicated Python virtual environment using python -m venv venv.

Installed core dependencies: pip install cryptography fastapi uvicorn numpy websockets.

1.3. Cryptographic Algorithm Implementation:

Implemented the AES-GCM encryption/decryption engine:

Encrypt function: cipher = Cipher(algorithms.AES(key), modes.GCM(nonce), backend=default_backend()).

Encryptor generates the ciphertext and 128-bit authentication_tag.

Decrypt function: Validates integrity by decrypting the tag before revealing the plaintext.

Implemented the Ed25519 digital signature engine:

Key generation: private_key = ed25519.Ed25519PrivateKey.generate().

Signing function: signature = private_key.sign(data_to_sign).

Verification function: public_key.verify(signature, data_to_sign).

Implemented zlib compression wrapper: Used zlib.compress(data, level=6) for optimal trade-off between speed and compression ratio.

1.4. Packet Definition and JSON Serialization:

Drafted the JSON schema for ZtonPacket: {"signature": "", "payload_b64": "", "sequence": 0, "sender_id": ""}.

Conducted local unit tests to ensure the JSON format can be accurately serialized, deserialized, and parsed without data loss


Fig 4.2  docker vm tab for unauthorised phone/


.



Phase 2: Sender-Side Application Development (Timeline: Week 3 – Week 4)

2.1. FastAPI Endpoint Setup:

Created node.py as the core sender script.

Initialized a FastAPI application instance with app = FastAPI().

Defined a POST route @app.post("/api/send").

2.2. Compression and Encryption Logic:

Linked the POST endpoint to the crypto.py module.

Implemented the logic to receive plaintext JSON, execute zlib.compress() on the payload string, and pass the compressed bytes to the AES_GCM_Encrypt function.

2.3. Sequence Number Management:

Implemented a persistent 32-bit sequence counter.

Ensured the counter increments by exactly 1 for every new API call, preventing repetition.

2.4. UDP Socket Transmission:

Initialized a raw UDP client socket: sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM).

Configured the target IP to the OpenZiti end-point hostname: zton-hub.openziti, and target port to 9999.

Serialized the encrypted ZtonPacket using json.dumps() and sent it via sock.sendto(packet_bytes, (target_host, target_port)).

2.5. Unit Testing: Simulated local payloads to confirm that the full Sender-Side pipeline (API → Compress → Encrypt → Sign → Sequence → Socket) executes within an average of < 2 milliseconds.

Phase 3: Hub Verification Pipeline and Overlay Configuration (Timeline: Week 5 – Week 7)

3.1. Hub UDP Listener Setup:

Created hub.py as the central verification authority.

Bound a UDP server socket to listen on 0.0.0.0:9999 using sock.bind(('0.0.0.0', 9999)).

3.2. Verification Pipeline Implementation (Strict Sequential Order):

Check 1: JSON Deserialization & Parser Error Handling: Wrapped the json.loads() function in a try-except block. If the incoming packet is not valid JSON, the except block triggers a Malformed Packet alert to the dashboard and drops the packet.

Check 2: Ed25519 Signature Verification: Extracted the signature and payload_b64 (ciphertext) fields. Executed public_key.verify(signature, ciphertext). If this function raises an InvalidSignature exception, the logic triggers a Policy Deny / Signature Mismatch alert.

Check 3: Identity Policy Engine: Scanned the extracted sender_id. Compared it against a hardcoded JSON whitelist of authorized device public keys. If the sender ID is not in the whitelist, it triggers a Unauthorized Access Attempt alert.

Check 4: Sequence Number Replay Protection:

Executed logic: if current_sequence <= recv_high_water: raise ReplayError.

If True, triggers a Replay Attack Detected alert and logs the packet's metadata for forensic analysis.

If False, updates recv_high_water = current_sequence and proceeds to decryption.

Check 5: AES-GCM Decryption & Decompression: Executed AES_GCM_Decrypt(key, nonce, ciphertext, tag) to recover compressed plaintext, followed by zlib.decompress(compressed_plaintext) to recover the original human-readable string.



Fig 4.3 Virtual network topology and security pipeline encryption demo


3.3. OpenZiti Network Fabric Deployment:

Created the docker-compose.yml file.

Defined services: ziti-controller, ziti-router, ziti-hub-tunneler, and hub-app.

Executed Docker initialization command to reset containers: docker compose --profile openziti down -v.

Executed Docker build command to construct the secure overlay: docker compose --profile openziti up --build -d.

Monitored logs with docker logs -f <container_id> to wait for the "OpenZiti enrollment complete" confirmation (approx. 60 seconds).

3.4. Routing Logic Implementation:

Once the Hub successfully decrypts a packet, it parses the target receiver ID from the plaintext headers.

It re-encrypts the plaintext with the receiver's public key and forwards it via the OpenZiti overlay to the intended destination node.

Phase 4: Real-Time SOC Dashboard Integration (Timeline: Week 8 – Week 9)

4.1. Frontend Scaffolding:

Used npx create-react-app zton-dashboard to bootstrap the React project.

Installed Recharts for dynamic graphing and socket.io-client for real-time backend connectivity.

4.2. WebSocket Data Streaming:

Configured the React useEffect() hook to initialize a WebSocket connection to the Hub's logging service.

Implemented an event listener to catch incoming onmessage events containing live packet metadata (Timestamp, Sender, Status, Size).

4.3. Dashboard Components Development:

KPI Cards: Built 4 UI cards pulling aggregate data from the stream: Total Packets, Verified Packets, Active Alerts, and Throughput.

Traffic Graph: Implemented a real-time line chart using Recharts (<LineChart>) that updates every 2 seconds based on incoming packet logs.

Alert Log: Built a dynamic list component that pushes new alerts (e.g., POLICY DENY, REPLAY DETECTED) to the top of the list with colored backgrounds (Red for Critical, Orange for High).

4.4. React and FastAPI Proxy Configuration:

Added a proxy configuration in the package.json file to route API calls from the React development server to the Python backend running on port 8080/8081


Fig 4.4 Scenario player for pre- configured scenarios.

.

Phase 5: Security Validation and Penetration Testing (Timeline: Week 10 – Week 11)

5.1. Attack Lab Environment Setup:

Deployed a Kali Linux virtual machine on the exact same Wi-Fi Local Area Network (LAN) as the ZTON Docker host.

Confirmed network connectivity using ping <Windows-Host-IP>.

5.2. Tool 1: Wireshark (Network Sniffing / Confidentiality Test):

Opened Wireshark and applied a capture filter: udp.port == 9999.

Sent a test packet from Laptop B (Authorized Sender).

Observed the UDP payload in Wireshark. Verified that the plaintext is completely missing; only the base64 encoded AES-GCM ciphertext and the Ed25519 signature are visible, confirming confidentiality.

5.3. Tool 2: Scapy (Packet Forgery & Replay Test):

Wrote a custom Python script using Scapy to listen to the network, capture a valid packet, and store its raw byte representation.

Attack A (Data Spoofing): Modified the payload_b64 field in the captured packet and sent it via sendp(). The Hub triggered an Invalid Signature alert and dropped the packet. Result: Passed.

Attack B (Replay Attack): Re-sent the exact same captured byte stream without modification. The Hub compared the sequence number (S_in = 120) against the recv_high_water (already 121). The Hub triggered a REPLAY DETECTED alert and dropped the duplicate packet. Result: Passed.

5.4. Tool 3: Netcat (Raw Socket Injection):

Opened a Windows PowerShell terminal.

Executed the command: echo "INJECTED_PAYLOAD" | nc -u -w 1 <Target-Windows-IP> 9999.

The Hub attempted to parse the raw text "INJECTED_PAYLOAD" via json.loads(). It immediately raised a JSONDecodeError, which was caught by the try-except block. The Hub triggered a Malformed Packet critical alert and the service remained stable. Result: Passed.

5.5. Tool 4: Hping3 (Denial of Service / Stress Test):

In the Kali terminal, executed the UDP flood command: sudo hping3 --udp -p 9999 --flood <Target-Windows-IP>.

Observed the SOC dashboard's "Packets Per Second" area chart spike to a high threshold.

Confirmed that the Hub service did not crash or hang under the load; it continued to discard the unauthenticated flood.

5.6. Metric Calculation and Final Verification:

Verified the PSIR (Packet Security Integrity Rate) by cross-referencing the dashboard's log: 2,500 valid packets sent, 2,500 accepted. Formula: PSIR = 2500 / 2500 = 100%.

Verified the RADR (Replay Attack Detection Rate) by confirming that 3 injected replay attacks were logged and 3 were blocked. Formula: RADR = 3 / 3 = 100%.

Verified the BES (Bandwidth Efficiency Score) by averaging the compressed byte sizes against the original sizes. Formula: BES = (1 - (compressed/original)) * 100 = 70%.

Verified the PES (Policy Enforcement Score) by confirming all five defined security components (Identity Registration, Policy Engine, Signature Check, Replay Check, Encryption Check) were fully operational.

5.7. Final Documentation: Consolidated all logs, Wireshark captures, screenshots of the SOC dashboard alert panels, and metric results into the final technical report.


# CHAPTER 5

# Project Execution

Planning and Design

he planning and design phase established the rigorous theoretical, technological, and architectural blueprint for ZTON. Extensive brainstorming was conducted to define the data flow, identify security boundaries, justify the technology stack against alternatives, and draft the exact network topology before any code was executed.

5.1.1 Threat Modeling and Security Risk Assessment

Conducted a formal threat modeling exercise based on the STRIDE framework (Spoofing, Tampering, Repudiation, Information Disclosure, Denial of Service, Elevation of Privilege) to identify vulnerabilities inherent in the existing system.

Spoofing: Addressed by requiring Ed25519 cryptographic signatures for every packet. Planned to ensure no packet is processed without a valid binding to a pre-registered public key.

Tampering: Addressed by deploying AES-GCM, which provides an authentication tag. Planned to ensure that any alteration to the ciphertext would cause the tag verification to fail at the decryption stage.

Repudiation: Planned a centralized logging mechanism via the SOC dashboard, storing metadata (Time, Sender, Action) of every rejected or accepted packet to ensure non-repudiation.

Information Disclosure: Addressed by enforcing AES-GCM encryption on the compressed payload, ensuring raw data is never visible over the wire.

Denial of Service: Designed the Hub to operate statelessly and reject malformed or unauthenticated packets immediately, preventing resource exhaustion.

Elevation of Privilege: Planned a strict policy engine checking sender IDs against a static whitelist to prevent unauthorized devices from accessing the routing layer.

5.1.2 Technology Selection and Engineering Justification

Performed a comparative analysis of transport protocols to select the correct foundation:

Why Raw UDP over TCP/TLS? Analysed the handshake overhead of TCP (3-way handshake) and TLS (2-4 round trips). Planned ZTON to use raw UDP to achieve "0 RTT" connectionless transmission, essential for real-time telemetry.

Performed a comparative analysis of cryptographic algorithms:

Why Ed25519 over RSA? Analysed Ed25519's 64-byte signature size and sub-10-microsecond verification speed against RSA's 256-byte signatures and slower mathematical operations. Selected Ed25519 for per-packet fast verification.

Why AES-GCM over AES-CBC/HMAC? Analysed AES-GCM's ability to provide authenticated encryption in a single operation, versus the two-step process of AES-CBC + HMAC. Planned AES-GCM to reduce processing latency and simplify the cryptographic engine.

Performed a comparative analysis of overlay networks:

Why OpenZiti over WireGuard? WireGuard is a simple peer-to-peer VPN. OpenZiti provides a centralized Fabric controller, dynamic identity-based routing, and a Tunneler Sidecar architecture. Planned OpenZiti to decouple the endpoint security from the overlay network management, providing a true Zero Trust mesh that WireGuard cannot natively offer.

5.1.3 Packet Architecture, Schema, and Data Structure Design

Drafted the exact in-memory data structure for the ZtonPacket to ensure seamless serialization over UDP.

Defined the ZTON Packet JSON Schema:

sender_id (String): Anonymized unique identifier for the source device.

target_id (String): Anonymized unique identifier for the destination device.

signature (String): The output of the Ed25519 Sign() function, encoded in base64 (64 bytes).

payload_b64 (String): The concatenated ciphertext + AES-GCM auth tag, encoded in base64.

sequence (Integer): A 32-bit unsigned integer representing the packet sequence for anti-replay.

timestamp (Integer): A unix epoch timestamp to allow for future TTL (Time-To-Live) validations.

Plaintext_String → zlib_compress() → AES_GCM_Encrypt() → Ed25519_Sign() → json.dumps() → sock.sendto().


Fig 5.1   Packet history view for accepted dropped packets


5.1.4 Data Flow Diagrams (DFD) and Trust Boundary Mapping

Designed a Data Flow Diagram to define exact trust boundaries.

Boundary 1: User-to-Application. Trusted; user provides plaintext payload.

Boundary 2: Application-to-Overlay. Untrusted; data is fully encrypted, compressed, and signed before crossing this boundary.

Boundary 3: Overlay-to-Hub. Untrusted; raw UDP packets traverse the OpenZiti fabric here.

Boundary 4: Hub-to-Destination. Trusted; data is re-encrypted using the destination's public key before leaving the hub.

This mapping ensured that the "Trusted Computing Base" (TCB) is kept minimal, containing only the Hub's hub.py and the sender's node.py.

5.1.5 SOC Dashboard Wireframing and Visualization Design

Drafted detailed UI wireframes for the React dashboard utilizing a dark theme (#1e1e1e background) for high-contrast security monitoring.

Navbar design: Included "Home", "Live Metrics", and "Audit Logs" tabs.

KPI Card Wireframes: Designed each KPI card with an icon, numeric value, and a sparkline chart for small trends.

Alert Console Design: Designed an alert log with a structured Level column (Critical/High/Info), Timestamp column, Message column, and a Source IP column.

Live Graph Design: Planned the integration of the Recharts library to draw an Area Chart. The X-axis was designed to auto-update with rolling 30-second timestamps, and the Y-axis to dynamically scale based on the Packets Per Second (PPS) data stream.


Fig 5.2 ZTON Security-Operations-Center Dashboard.


5.1.6 Project Milestones and Contingency Planning

Established a strict 11-week execution schedule.

Defined contingency plans: If the OpenZiti deployment failed due to enrollment errors, we planned a fallback using direct localhost UDP loopback for unit testing the cryptographic pipeline. This ensured that development on node.py and hub.py could continue seamlessly while

the Docker networking issues were resolved.


Implementation

The implementation phase executed the architectural blueprints into a working prototype. This phase focused on coding the exact class definitions for the cryptographic engines, configuring the OpenZiti Docker network, implementing the exception-driven Hub verification pipeline, building the real-time WebSocket React dashboard, and conducting rigorous integration testing.


5.2.1 Core Python Class Definitions and Module Architecture

Organized the Python backend into three core object-oriented classes to ensure reusability and maintainability.

CryptoEngine Class:

Defined __init__(self, aes_key, private_key, public_key).

Defined encrypt(self, plaintext, seq_num): Handled the nonce generation logic. Created a 12-byte nonce by taking the 32-bit seq_num, converting it to bytes, and appending padding to fit the 12-byte field expected by AES-GCM. Executed the cipher = Cipher(algorithms.AES(self.key), modes.GCM(nonce), backend=default_backend()).

Defined decrypt(self, ciphertext, nonce, auth_tag): Used decryptor = cipher.decryptor() to securely verify the auth_tag before returning the plaintext. Raised an IntegrityError if the tag invalidated.

PolicyEngine Class:

Defined load_policies(self, path_to_json): Parsed the allowed_devices.json file and loaded public keys into a memory dictionary.

Defined check(self, sender_id): Executed a binary search on the dictionary. Returned True if the sender was whitelisted, otherwise returned False.

SequenceTracker Class:

Defined __init__(self): Initialized self.recv_high_water = 0 and self.sender_sequence = 0.

Defined validate(self, seq_num): Executed if seq_num <= self.recv_high_water: raise ReplayError. Else, updated self.recv_high_water = seq_num.

5.2.2 Granular Implementation of Data Serialization and Compression

In node.py, the FastAPI router was configured to accept a Pydantic model called SendRequest with fields message and target_console.

Implemented the serialization logic:

compressed_bytes = zlib.compress(message.encode('utf-8'), level=6) (Optimal compression level for network latency).

Converted compressed_bytes to a base64 string

Implemented the packet construction logic:

packet_obj = {"sender_id": "LaptopB", "target_id": target_console, "payload_b64": payload_b64, "signature": signature_str, "sequence": seq_counter, "timestamp": time.time()}.

5.2.3 OpenZiti Overlay Configuration and Network Topology Implementation

Implemented the docker-compose.yml setup. The network used a bridge driver with a subnet configuration to allow the containers to communicate via static IPs.

OpenZiti Controller Configuration:

Defined the ziti-controller service exposing ports 1280 and 443.

Configured the environment variable ZITI_CTRL_ADVERTISED_ADDRESS to ziti-controller to allow internal service discovery.

OpenZiti Router Configuration:

Defined the ziti-router service. Configured the ZITI_ROUTER_NAME and ZITI_ROUTER_PORT.

Linked the router to the controller using environment variables so it automatically registered itself into the overlay fabric.

OpenZiti Tunneler Sidecar Configuration:

Configured the ziti-hub-tunneler service. It used a pre-generated enrollment JWT token to authenticate with the ziti-controller.

Mapped the internal UDP port 9999 to a host port 9999 using ports: - "9999:9999/udp", ensuring the Hub's UDP listener was exposed to the underlying LAN.

5.2.4 Hub Verification Pipeline Implementation and Exception Handling

In hub.py, implemented the infinite while True loop. Inside the loop, data, addr = sock.recvfrom(8192) accepted the raw UDP bytes.

Strict Exception Handling Implementation:

Phase 1: try: packet = json.loads(data.decode('utf-8')) except json.JSONDecodeError:. If caught, immediately logged a CRITICAL: MALFORMED_PACKET to the dashboard, and used continue to skip to the next iteration.

Phase 2: try: valid = CryptoEngine.verify_signature(packet['signature'], packet['payload_b64']) except InvalidSignature:. If caught, logged a CRITICAL: POLICY_DENY - INVALID_SIGNATURE to the dashboard, and used continue.

Phase 3: if not PolicyEngine.check(packet['sender_id']):. If True, logged CRITICAL: POLICY_DENY - UNAUTHORIZED_ACCESS, and used continue.


Phase 4: try: SequenceTracker.validate(packet['sequence']) except ReplayError:. If caught, logged HIGH: REPLAY_ATTACK_DETECTED, and used continue

Phase 5: try: plaintext = CryptoEngine.decrypt(packet['payload_b64'], packet['nonce']) except IntegrityError:. If caught, logged CRITICAL: DECRYPTION_FAILURE, and used continue.

Phase 6: final_text = zlib.decompress(plaintext).decode('utf-8'). This step executes only if all previous checks passed. The data was then passed to the routing logic.

5.2.5 SOC Dashboard Real-Time Data Streaming and Visualization

Built the React frontend using functional components.

WebSocket Integration:

Used useEffect to instantiate a new WebSocket('ws://localhost:8080/ws').

Defined an onmessage event handler. The handler parsed the incoming JSON string and dispatched it to a useReducer hook to update the application's global state.

Recharts Component Customization:

KPI Cards: Implemented the cards using Material UI Card components. The data was passed via props from the global state. Throughput was calculated as the Average Size / Time Interval to display MB/s.

Traffic Graph: Customized the <AreaChart> from Recharts. Set the domain of the Y-axis to [0, 'auto'] to dynamically scale based on the peak packet frequency.

Alerts Log Container:

Created a <ul> list. Map-reduced the global alerts array.

Conditional rendering applied: If level == 'CRITICAL', the <li> received style={{ backgroundColor: '#ffebee', border: '1px solid red' }}.

5.2.6 Integration Testing and Full System Orchestration

Executed the complete system orchestration:

Opened Docker Desktop. Verified all containers (controller, router, tunneler, sender, hub) showed status Up with no exit codes.

Opened the SOC Dashboard browser tab at http://localhost:8080.

Opened the Authorized Sender (Laptop B) browser tab at http://localhost:8081.

Typed "Test Payload" into the sender console and clicked Send Encrypted Packet.

Observed the SOC Dashboard. The "Total Packets" count increased by 1. The "Throughput" chart updated.

Opened the Authorized Receiver (Phone B) browser tab at http://localhost:8082. Verified the payload "Test Payload" appeared on the screen.

Opened the Unauthorized Sender (Phone A) browser tab at http://localhost:8083. Attempted to send data. Observed the SOC Dashboard logged CRITICAL: POLICY_DENY - UNAUTHORIZED_ACCESS.


CHAPTER 6

Tools and Techniques Used

6.1 Tools

The project utilized a specific stack of software, networking, and penetration testing tools to ensure modularity, high performance, and rigorous security validation.

Python 3.10: The core backend programming language. Used to write crypto.py, node.py, and hub.py. Chosen for its native support for the cryptography library and raw UDP socket operations.

FastAPI: A high-performance Python web framework. Used to build the REST API endpoints (/api/send) on the backend. Chosen for its asynchronous capabilities and automatic OpenAPI documentation.

React.js: A JavaScript library for building user interfaces. Used to develop the frontend for the Sender Console, Receiver Console, and SOC Dashboard. Chosen for its component-based architecture and efficient state management.

OpenZiti: An open-source Zero Trust overlay network framework. Used to establish the secure, dynamic fabric tunnel between the Sender and the Hub. Chosen for its Tunneler Sidecar architecture, which decouples network routing from application-level cryptography.

Docker & Docker Compose: Containerization and orchestration tools. Used to encapsulate the backend, frontend, and OpenZiti services into reproducible containers. Ensured seamless deployment across different host environments.

UDP Sockets: The native transport layer protocol. Used for all low-latency packet transmission. Chosen for its connectionless, zero-handshake-overhead nature compared to TCP.

Wireshark (Kali Linux): A network protocol analyzer. Used to capture live UDP traffic on port 9999. Validated the confidentiality of the system by confirming the absence of plaintext in the packet payload.

Scapy (Kali Linux): A Python-based packet manipulation library. Used to forge custom UDP packets to simulate data spoofing and replay attacks. Validated the Hub's signature verification and anti-replay logic.

Nmap (Kali Linux): A network discovery and port scanning tool. Used to perform SYN and UDP scans against the host machine. Validated that unauthorized port scans do not trigger protocol responses.

Hping3 (Kali Linux): A packet crafting and stress-testing tool. Used to launch a UDP flood (Denial of Service) against the Hub. Validated the system's stability under high packet load.

Netcat: A raw network utility. Used to inject malformed text strings directly into the target UDP socket. Validated the Hub's robust JSON deserialization error handling.

6.2 Techniques

The implementation relied on specific development and algorithmic techniques to achieve Zero Trust per-packet security.

Modular Cryptographic Separation: The cryptographic primitives (AES-GCM, Ed25519, zlib) were encapsulated in a separate CryptoEngine class. This technique enabled independent unit testing, debugging, and future upgrades of algorithms without impacting the core networking logic.

Stateless UDP over Zero Trust Overlay: Raw UDP was selected to achieve 0 RTT (zero round-trip time) transmission. To compensate for UDP's lack of guarantee, all state-tracking (sequence numbers) and security logic were moved strictly to the application layer within the Hub. This technique preserves the speed of UDP while layering authentication on top.

Sequence-Based Anti-Replay Enforcement: The Hub implements a strict sequence tracking technique: IF S_in > S_high THEN ACCEPT. This logic ensures that the application layer maintains a session-less, fresh state for every incoming packet, actively rejecting duplicate sequence numbers to prevent replay attacks.

Real-Time WebSocket Data Streaming: Instead of using standard HTTP polling to update the SOC dashboard, we utilized persistent WebSocket connections. This technique ensures that security alerts (Policy Deny, Replay Detected) are pushed from the Python backend to the React frontend in under 200ms, providing near-instantaneous threat visibility.

JIT (Just-In-Time) Hub Processing: The Hub processes packets only upon arrival. There is no persistent connection state maintained between packets, which drastically reduces memory overhead. This technique ensures the Hub remains lightweight and resilient, even under sustained UDP flooding from an attacker.

















CHAPTER 7

Partial Results

7.1 Initial Findings

Early-stage testing during the first two weeks of cryptographic prototyping and network integration yielded the following technical findings:

AES-GCM Encryption Throughput: Benchmarking the CryptoEngine on an Intel Core i5-1135G7 CPU revealed that AES-GCM encryption could sustain an average throughput of 130 MB/s. This confirmed that the cryptographic logic would not create a bottleneck for high-frequency telemetry streams.

OpenZiti Bootstrap Time: The Docker-based OpenZiti overlay network required approximately 45 to 60 seconds to fully initialize. This included the time taken for the Ziti controller to generate JWT tokens and for the Tunneler Sidecar to complete its identity enrollment.

Initial Compression Efficiency: Testing with 1 KB plaintext messages showed that zlib.compress(level=6) consistently reduced the payload size to approximately 300 bytes, achieving a 70% compression ratio before the encryption stage.

Initial JSON Parser Vulnerability: The initial hub.py script lacked strict error handling for the json.loads() function. When testing with Netcat by injecting raw text (e.g., "hello"), the Python parser raised a JSONDecodeError, which crashed the entire Hub service instantly.

Sequence Number State Reset: The initial sequence number tracker stored the recv_high_water integer in memory. It was observed that restarting the Docker containers reset this value to 0, accidentally enabling potential replay attacks after a system reboot.

7.2 Iterative Improvements

Based on the initial findings, technical corrections were applied to ensure the system was production-ready.

Improved JSON Deserialization: The Hub's packet parser was refactored to wrap the json.loads(data.decode('utf-8')) command inside a try-except json.JSONDecodeError block. On failure, the Hub now logs a "CRITICAL: Malformed Packet" alert to the dashboard and uses the continue command to immediately skip to the next iteration. This entirely eliminated the crash vulnerability.

Sequence Number Persistence: To address the sequence reset issue, the SequenceTracker class was updated. It now writes the recv_high_water value to a local high_water.json file on every successful packet processing. Upon container restart, the __init__() function reads this file, ensuring the sequence history persists across reboots and prevents reset-based replay vulnerabilities.

Enhanced SOC Dashboard Logging: The initial dashboard only displayed a green "Success" counter for valid packets. To improve situational awareness, the logging pipeline was enhanced. Now, every dropped packet (regardless of whether it is for a Signature Mismatch, Policy Deny, or Replay Attack) triggers a unique colored alert block with metadata, including the sender ID and sequence number of the failed packet.



\




CHAPTER 8

Results and Discussion

8.1 Final Results

The final integrated ZTON prototype was deployed on a Windows 11 Docker environment, simulating a real-world distributed network. The system underwent a full 2,500-packet stress test with adversarial scenarios injected via Kali Linux.

Packet Security Integrity Rate (PSIR):

Calculation: PSIR = N_verified / N_total

Result: 2500 / 2500 = 100%

Interpretation: All legitimate packets sent by the Authorized Sender (Laptop B) successfully passed Ed25519 signature verification, identity policy checks, sequence validation, and AES-GCM decryption without any false-positive drops.

Replay Attack Detection Rate (RADR):

Calculation: RADR = N_blocked_replays / N_replay_attempts

Result: 3 / 3 = 100%

Interpretation: The Kali Linux Scapy tool successfully injected three duplicate packets into the network. The Hub's SequenceTracker correctly identified them as duplicates (S_in <= recv_high_water), immediately dropped them, and flagged them on the SOC dashboard.

Bandwidth Efficiency Score (BES):

Calculation: BES = (1 - (Compressed Size / Original Size)) * 100

Result: (1 - (0.3 KB / 1.0 KB)) * 100 = 70%

Interpretation: By using zlib compression before encryption, the system achieved a 70% reduction in payload size. This significantly reduced the bandwidth footprint of the raw UDP transmissions.

Policy Enforcement Score (PES):

Calculation: PES = Sum(C_i) / 5

Result: 5 / 5 = 100%

Interpretation: All five designed policy components (Identity Registration, Signature Verification, Replay Protection, AES-GCM Encryption, and Policy Engine) were confirmed operational and active during the pilot deployment.

System Throughput and Latency:

The AES-GCM engine sustained a 130 MB/s encryption throughput.

The total end-to-end packet processing latency (from FastAPI endpoint to Hub verification and decryption) remained consistently under 2 milliseconds on the Intel Core i5 testbed.



8.2 Discussion

The quantitative results demonstrate that the ZTON framework successfully meets its core objective of enforcing Zero Trust on stateless UDP communications.

Verification of Zero Trust over UDP: The 100% PSIR and 100% RADR prove that stateless UDP can be made inherently secure without relying on TCP handshakes. By moving cryptographic state management (sequence numbers, identity whitelists) to the application layer, ZTON transformed an unreliable transport into a verifiable, authenticated stream.

Efficacy of Multi-Stage Validation: The Hub's sequential verification pipeline (Signature → Policy → Replay → Decryption) proved efficient and necessary. The 12 unauthorized access attempts and 3 replay attempts logged by the SOC dashboard confirm that relying on a single validation layer (e.g., only encryption) would have left gaps for policy bypass or duplication attacks.

Real-Time Monitoring Impact: The React-based SOC dashboard was critical for the validation phase. By displaying the live area chart of blocked packets, the dashboard provided immediate visual proof of the system's resilience, allowing for quick diagnosis of attack patterns and verifying the correctness of the policy engine.

Modern Cryptography Performance: The measured 130 MB/s throughput of AES-GCM on consumer hardware confirms that AEAD (Authenticated Encryption with Associated Data) can handle high-frequency telemetry. Combined with Ed25519 (sub-10-microsecond verification), ZTON validates that computationally expensive security can be deployed in real-time environments without bottlenecking the central processing unit.































CHAPTER 9

Prototype (Software)

9.1 Prototype Description

The ZTON prototype is a fully containerized, multi-node software stack providing a Zero Trust secure overlay network. It is composed of four interconnected, role-specific software components:

Sender Node Console (Web Interface - Port 8081): A React-based user interface deployed on the "Laptop B" host. It allows the user to input plaintext messages, select a target receiver, and initiate the cryptographic pipeline. It serves as the entry point for the secure data transmission.

Hub Node Verifier (Core Python Service - Port 9999): A Python service (hub.py) containerized within the OpenZiti overlay. It acts as the central Policy Enforcement Point (PEP). It listens on UDP port 9999 for incoming packets, executes the 5-step verification pipeline (Signature, Policy, Replay, Decryption, Decompression), and routes valid messages to the target nodes.

Receiver Node Console (Web Interface - Port 8082): A React-based interface deployed on the "Phone B" host. It passively listens for re-encrypted, forwarded packets from the Hub. Upon successful receiving and local AES-GCM decryption, it displays the original plaintext message.

Real-Time SOC Dashboard (Web Interface - Port 8080): A React-based monitoring tool running on the Hub's host. It uses persistent WebSocket connections to display live KPI metrics (Total Packets, 100% Verified, Alert Count, Throughput), an animated real-time area chart of network traffic, and a color-coded (Critical/High/Info) security alert logger.

9.2 Development Process

The prototype was developed using a "Bottom-Up" integration strategy to ensure stability at every layer of the network stack.

Phase 1: Standalone Cryptographic Module Development: Initially, we developed the crypto.py class and tested it independently on the local machine. We validated that the AES-GCM encryption/decryption and Ed25519 signing/verification functions performed reliably without networking overhead.

Phase 2: Raw UDP Sockets Loop Testing: We moved to raw UDP testing. node.py and hub.py were configured to listen on local IP addresses and ports. We successfully transmitted JSON-serialized ZtonPacket objects between two terminals on the same machine, proving the basic data structure and encoding were correct.

Phase 3: OpenZiti Overlay Integration: We introduced the Docker Compose orchestration. We faced a significant challenge during the OpenZiti initial enrollment process; the Tunneler Sidecar frequently failed to connect to the controller due to JWT expiration. We resolved this by explicitly setting the ZITI_CTRL_ADVERTISED_ADDRESS environment variable in the docker-compose.yml to point to the internal Docker service name.

Phase 4: Frontend and WebSocket Integration: The final phase involved building the React dashboards. We used the Socket.io-client library to establish the persistent WebSocket tunnel. The biggest challenge here was handling Cross-Origin Resource Sharing (CORS) errors; we solved this by configuring a proxy in the React package.json to forward API calls seamlessly to the FastAPI backend.

9.3 Testing and Validation

The prototype underwent formal adversarial validation using a Kali Linux virtual machine operating on the same Wi-Fi LAN subnet as the Windows Host.

Test 1: Data Spoofing and Tampering:

Method: Used Scapy to intercept a valid ZtonPacket, modify the payload_b64 field, and re-inject it into the network.

Result: The Hub's Ed25519 verification function raised an InvalidSignature exception. The Hub dropped the packet and logged a "CRITICAL:POLICY_DENY - INVALID_SIGNATURE" alert. Result: Passed.

Test 2: Replay Attack Simulation:

Method: Used Scapy to intercept a valid ZtonPacket and immediately replay the exact binary stream 2 seconds later.

Result: The Hub's SequenceTracker executed if seq_num <= recv_high_water:. The condition evaluated to True (duplicate sequence). The Hub dropped the packet and logged a "HIGH: REPLAY_ATTACK_DETECTED" alert. Result: Passed.

Test 3: Unauthorized Access Attempt:

Method: Used the unauthorized Phone A console (Port 8083) to send a packet to the Hub.

Result: The Hub's PolicyEngine compared the sender_id against the allowed_devices.json whitelist. The ID was absent. The Hub dropped the packet and logged a "CRITICAL: POLICY_DENY - UNAUTHORIZED_ACCESS" alert. Result: Passed.

Test 4: Malformed Packet Injection:

Method: Used Netcat to send the raw text string "INJECTED_PAYLOAD" to UDP port 9999.

Result: The try-except block caught the json.JSONDecodeError. The Hub did not crash.


CHAPTER 10

Conclusion

10.1 Summary

The ZTON (Zero Trust Overlay Network) project successfully addressed the critical security gaps in session-based transport protocols by designing and validating a per-packet verification framework over raw UDP sockets.

• Problem Addressed: Traditional TLS/VPN models trust sessions post-handshake, leaving systems vulnerable to hijacking, replay attacks, and injection. These protocols also impose unacceptable latency (up to 60% overhead) on real-time UDP streams.
The fundamental flaw in conventional transport layer security lies in its "trust after login" paradigm. Once a TLS handshake successfully completes, the data stream is considered authenticated indefinitely. This creates a wide vulnerability window; attackers can actively hijack TCP sequence numbers and inject malicious payloads directly into the trusted stream without ever needing to re-authenticate. Furthermore, the 2 to 4 round-trip-time (RTT) handshakes required for TLS negotiation add up to a 60% latency penalty on real-time data streams, rendering the protocol entirely unsuitable for low-latency telemetry.


• Solution Implemented: ZTON enforces a "Never Trust, Always Verify" model by implementing a 5-step cryptographic validation pipeline (zlib compression, AES-GCM encryption, Ed25519 signing, sequence numbering, and Hub verification) on every individual datagram.
Instead of relying on session boundaries, ZTON processes every UDP datagram as an isolated security event. The 5-step pipeline begins with zlib compression at level 6, reducing payload size before any cryptographic processing begins. The compressed bytes are then passed to AES-GCM encryption, which uses a 256-bit symmetric key to generate ciphertext and a 128-bit authentication tag, ensuring both confidentiality and integrity in a single AEAD operation. Subsequently, an Ed25519 digital signature is applied over the ciphertext and metadata; its deterministic 64-byte size and sub-10-microsecond verification speed enable rapid identity authentication without introducing processing bottlenecks. A uniquely incrementing 32-bit sequence number is assigned to each packet before it is passed to the Hub, which then reverses the pipeline to enforce verification, policy rules, and replay protection.


• Key Outcomes: The pilot deployment achieved a 100% PSIR and a 100% RADR, effectively blocking all unauthorized access and replay attempts. The system maintained a 70% Bandwidth Efficiency Score through compression and delivered 130 MB/s encryption throughput with under 2ms packet latency on standard consumer hardware.
The quantitative metrics obtained from the adversarial testing phase definitively validate the efficacy of the ZTON architecture. The Packet Security Integrity Rate (PSIR) of 100% confirms that every single legitimate packet over the 2,500-packet test run successfully completed the Hub’s full verification loop with zero false-positive drops. The 100% Replay Attack Detection Rate (RADR) proves the Sequence Tracker logic correctly enforced the IF S_in <= recv_high_water THEN DROP rule. Furthermore, the measured encryption throughput of 130 MB/s and sub-2ms latency prove that advanced cryptographic security is entirely viable on modest commercially available hardware without requiring dedicated accelerators.


• Integration: The OpenZiti fabric provided a robust overlay transport, and the React-based SOC dashboard delivered continuous visibility into network health and security events, transforming raw network data into actionable intelligence.

OpenZiti served as the critical transport backbone, utilizing its dynamic Tunneler Sidecar architecture to completely eliminate the need for manual static IP routing. The Sidecar intercepts outbound UDP traffic targeting the Hub, encapsulates it inside the secure Zero Trust fabric, and manages identity enrollment automatically via Docker Compose orchestration. Complementing this, the React-based SOC dashboard is linked to the Hub’s core processing loop via persistent WebSocket connections, actively consuming logs to render live KPI metrics, animated traffic charts, and a color-coded alert logger. By instantly displaying "POLICY DENY" or "REPLAY ATTACK DETECTED" alerts, the system transforms ephemeral raw UDP datagrams into actionable, auditable security intelligence for network administrators.



10.2 References

1. S. Rose, O. Borchert, S. Mitchell, and S. Connelly, "Zero Trust Architecture," NIST Special Publication 800-207, 2020.


2. J. A. Donenfeld, "WireGuard: Next Generation Kernel Network Tunnel," NDSS Symposium, 2017.


3. D. J. Bernstein, N. Duif, T. Lange, P. Schwabe, and B. Y. Yang, "High-Speed High-Security Signatures (Ed25519)," Journal of Cryptographic Engineering, vol. 2, no. 3, pp. 185-194, Sep. 2012.


4. D. A. McGrew and J. Viega, "The Security and Performance of the Galois/Counter Mode (GCM) of Operation," INDOCRYPT, vol. 3348, pp. 343-355, 2004.


5. Cloud Security Alliance, "Software Defined Perimeter (SDP) Architecture Guide," Version 3.0, 2019.


6. F. Hu, M. Li, and Y. Zhang, "A Lightweight Zero-Trust Architecture for IoT Networks," IEEE Internet of Things Journal, vol. 9, no. 4, pp. 2521-2534, Feb. 2022.


7. J. H. Park and S. Y. Kim, "Real-time UDP Packet Monitoring for Anomaly Detection," IEEE Access, vol. 11, pp. 14512-14524, 2023.


8. M. M. Islam and M. S. Hossain, "Securing UDP Communication in Cloud Environments using AES-GCM," IEEE Transactions on Cloud Computing, vol. 9, no. 2, pp. 567-578, Apr.-Jun. 2021.


9. OpenZiti Community, "OpenZiti Zero Trust Networking Platform - Official Documentation," 2023. [Online]. Available: https://openziti.io/docs/


10. T. P. Dinh and Y. Kim, "An Efficient Ed25519 Implementation for Embedded Devices," IEEE Embedded Systems Letters, vol. 12, no. 3, pp. 78-81, Sep. 2020.


















































--- TABLES FOUND IN DOCUMENT ---


### Table 1

| Team Members Name | USN |
| Rishi P | 1RV23CS196 |
| Sachetan Inchal | 1RV23CS208 |
| Sagar TH | 1RV23CS210 |

### Table 2

| Author(s) | Title | Journal/Publication | Significance |
| S. Rose, O. Borchert, S. Mitchell, S. Connelly | Zero Trust Architecture (2020) | NIST Special Publication 800-207 (National Institute of Standards and Technology) | Defined "Never Trust, Always Verify" foundation. |
| J. A. Donenfeld | WireGuard: Next Generation Kernel Network Tunnel — NDSS (2017) | NDSS Symposium (Network and Distributed System Security Symposium) | Proved high-performance UDP tunnels; ZTON extends this with per-packet verification. |
| D. J. Bernstein, N. Duif, T. Lange, P. Schwabe, B. Y. Yang | High-Speed High-Security Signatures (Ed25519) — J. Cryptographic Engineering (2012) | Journal of Cryptographic Engineering (Springer) | Introduced Ed25519 digital signatures used for per-packet device identity in ZTON. |
| D. A. McGrew, J. Viega | The Security and Performance of Galois/Counter Mode (GCM) — INDOCRYPT (2004) | INDOCRYPT (International Conference on Cryptology in India - Conference Proceedings) | Proposed AES-GCM; used in ZTON for combined confidentiality and integrity. |
| Cloud Security Alliance | Software Defined Perimeter (SDP) Architecture Guide, V3.0 (2019) | Cloud Security Alliance (CSA) Official Publication / Technical Guide | Conceptual precursor to identity-driven overlay network design. |
| F. Hu, M. Li, Y. Zhang | A Lightweight Zero-Trust Architecture for IoT Networks — IEEE IoT Journal (2022) | IEEE Internet of Things Journal (IEEE IoT-J) | Validates per-device authentication; ZTON extends to per-packet validation. |
| J. H. Park, S. Y. Kim | Real-time UDP Packet Monitoring for Anomaly Detection — IEEE Access (2023) | IEEE Access (Multidisciplinary Open Access Journal) | Supports real-time monitoring concept used in ZTON's SOC dashboard. |
| M. M. Islam, M. S. Hossain | Securing UDP Communication in Cloud Environments using AES-GCM — IEEE TCC (2021) | IEEE Transactions on Cloud Computing (IEEE TCC) | Validates AES-GCM performance over UDP, matching ZTON's throughput results. |
| OpenZiti Community | OpenZiti Zero Trust Networking Platform — Official Docs (2023) | OpenZiti Official Online Documentation | Provides overlay network and tunneler framework used directly in ZTON. |