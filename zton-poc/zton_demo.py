import os
import sys
import json
import time
import socket
import argparse
from cryptography.fernet import Fernet

# Key management: Simple symmetric key generated or read from local file/env
KEY_FILE = "zton_secret.key"

def load_or_create_key():
    if os.path.exists(KEY_FILE):
        with open(KEY_FILE, "rb") as f:
            return f.read()
    else:
        key = Fernet.generate_key()
        with open(KEY_FILE, "wb") as f:
            f.write(key)
        return key

class ZTONPacket:
    def __init__(self, packet_type, session_id, sender_id, nonce, payload):
        self.type = packet_type
        self.session_id = session_id
        self.sender_id = sender_id
        self.nonce = nonce
        self.payload = payload

    def to_json(self):
        return json.dumps({
            "type": self.type,
            "session_id": self.session_id,
            "sender_id": self.sender_id,
            "nonce": self.nonce,
            "payload": self.payload
        })

    @staticmethod
    def from_json(json_str):
        data = json.loads(json_str)
        return ZTONPacket(
            packet_type=data["type"],
            session_id=data["session_id"],
            sender_id=data["sender_id"],
            nonce=data["nonce"],
            payload=data["payload"]
        )

def run_server(port):
    key = load_or_create_key()
    fernet = Fernet(key)
    print(f"[*] ZTON Server starting on UDP port {port}")
    print(f"[*] Loaded key: {key.decode()}")

    sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    sock.bind(("127.0.0.1", port))

    highest_nonce = -1

    while True:
        data, addr = sock.recvfrom(4096)
        try:
            packet_str = data.decode("utf-8")
            packet = ZTONPacket.from_json(packet_str)

            print(f"\n[IN] type={packet.type} session={packet.session_id} sender={packet.sender_id} nonce={packet.nonce}")
            print(f"Ciphertext:\n{packet.payload}")

            # Replay protection check
            if packet.nonce <= highest_nonce:
                print(f"Replay Detected -> Dropped (Received nonce {packet.nonce} <= Highest {highest_nonce})")
                continue
            
            # Update highest seen nonce
            highest_nonce = packet.nonce
            print("Packet Accepted")

            # Decrypt payload
            try:
                decrypted = fernet.decrypt(packet.payload.encode("utf-8")).decode("utf-8")
                print(f"Plaintext:\n{decrypted}")
            except Exception as dec_err:
                print(f"Decryption Error: {dec_err}")

        except Exception as e:
            print(f"[-] Failed to process packet: {e}")

def run_client(port, session_id, sender_id, payload_text, duplicate_nonce=False):
    key = load_or_create_key()
    fernet = Fernet(key)
    print(f"[*] ZTON Client targeting UDP port {port}")

    # Encrypt the payload
    ciphertext = fernet.encrypt(payload_text.encode("utf-8")).decode("utf-8")

    sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)

    # Packet 1
    p1 = ZTONPacket(packet_type="DATA", session_id=session_id, sender_id=sender_id, nonce=1, payload=ciphertext)
    payload_str1 = p1.to_json()
    sock.sendto(payload_str1.encode("utf-8"), ("127.0.0.1", port))
    print(f"\n[OUT] session={p1.session_id} nonce={p1.nonce}")
    print(f"Ciphertext:\n{p1.payload}")
    print(f"Plaintext:\n{payload_text}")

    time.sleep(1)

    # Packet 2 (Next nonce)
    p2 = ZTONPacket(packet_type="DATA", session_id=session_id, sender_id=sender_id, nonce=2, payload=ciphertext)
    payload_str2 = p2.to_json()
    sock.sendto(payload_str2.encode("utf-8"), ("127.0.0.1", port))
    print(f"\n[OUT] session={p2.session_id} nonce={p2.nonce}")

    time.sleep(1)

    # Packet 3 (Replayed Nonce 1 or 2)
    replay_nonce = 1 if duplicate_nonce else 2
    p3 = ZTONPacket(packet_type="DATA", session_id=session_id, sender_id=sender_id, nonce=replay_nonce, payload=ciphertext)
    payload_str3 = p3.to_json()
    sock.sendto(payload_str3.encode("utf-8"), ("127.0.0.1", port))
    print(f"\n[OUT] (REPLAY TEST) session={p3.session_id} nonce={p3.nonce}")

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="ZTON Security Demonstration Utility")
    subparsers = parser.add_subparsers(dest="mode", required=True)

    server_parser = subparsers.add_parser("server", help="Run in Server Mode")
    server_parser.add_argument("--port", type=int, default=9999, help="UDP port to listen on")

    client_parser = subparsers.add_parser("client", help="Run in Client Mode")
    client_parser.add_argument("--port", type=int, default=9999, help="Target UDP port")
    client_parser.add_argument("--session", type=int, default=100, help="Session ID")
    client_parser.add_argument("--sender", type=str, default="client-01", help="Sender identity name")
    client_parser.add_argument("--payload", type=str, default="HELLO ZTON", help="Plaintext payload to encrypt")
    client_parser.add_argument("--replay-nonce", action="store_true", help="Send a packet with an already used nonce to test replay detection")

    args = parser.parse_args()

    if args.mode == "server":
        run_server(args.port)
    elif args.mode == "client":
        run_client(args.port, args.session, args.sender, args.payload, args.replay_nonce)
