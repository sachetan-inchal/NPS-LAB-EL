"""Mutual authentication and per-packet encryption for ZTON."""

import os
import zlib
from dataclasses import dataclass

from cryptography.hazmat.primitives.asymmetric.ed25519 import (
    Ed25519PrivateKey,
    Ed25519PublicKey,
)
from cryptography.hazmat.primitives.ciphers.aead import AESGCM
from cryptography.hazmat.primitives import serialization


@dataclass
class KeyPair:
    private_key: Ed25519PrivateKey
    public_key: Ed25519PublicKey

    def public_bytes(self) -> bytes:
        return self.public_key.public_bytes(
            encoding=serialization.Encoding.Raw,
            format=serialization.PublicFormat.Raw,
        )

    def sign(self, data: bytes) -> bytes:
        return self.private_key.sign(data)

    @staticmethod
    def generate() -> "KeyPair":
        private_key = Ed25519PrivateKey.generate()
        return KeyPair(private_key=private_key, public_key=private_key.public_key())

    @staticmethod
    def from_private_bytes(data: bytes) -> "KeyPair":
        private_key = Ed25519PrivateKey.from_private_bytes(data)
        return KeyPair(private_key=private_key, public_key=private_key.public_key())


@dataclass
class SessionCrypto:
    """Per-session AES-GCM encryptor with monotonic sequence numbers."""

    key: bytes
    send_seq: int = 0
    recv_high_water: int = -1

    def __post_init__(self) -> None:
        self._aes = AESGCM(self.key)

    def encrypt_payload(self, plaintext: bytes, compress: bool = True) -> tuple[bytes, dict]:
        original_size = len(plaintext)
        if compress:
            payload = zlib.compress(plaintext, level=6)
        else:
            payload = plaintext
        compressed_size = len(payload)

        self.send_seq += 1
        nonce = self.send_seq.to_bytes(12, "big")
        ciphertext = self._aes.encrypt(nonce, payload, None)

        stats = {
            "original_bytes": original_size,
            "compressed_bytes": compressed_size,
            "encrypted_bytes": len(ciphertext),
            "sequence": self.send_seq,
            "compressed": compress,
        }
        return ciphertext, stats

    def decrypt_payload(self, ciphertext: bytes, sequence: int) -> tuple[bytes, dict]:
        if sequence <= self.recv_high_water:
            raise ReplayError(f"Replay detected: seq {sequence} <= {self.recv_high_water}")

        nonce = sequence.to_bytes(12, "big")
        compressed = self._aes.decrypt(nonce, ciphertext, None)
        self.recv_high_water = sequence

        try:
            plaintext = zlib.decompress(compressed)
            was_compressed = True
        except zlib.error:
            plaintext = compressed
            was_compressed = False

        stats = {
            "original_bytes": len(plaintext),
            "compressed_bytes": len(compressed),
            "encrypted_bytes": len(ciphertext),
            "sequence": sequence,
            "compressed": was_compressed,
        }
        return plaintext, stats


class ReplayError(Exception):
    pass


def verify_signature(public_key_bytes: bytes, signature: bytes, data: bytes) -> bool:
    try:
        public_key = Ed25519PublicKey.from_public_bytes(public_key_bytes)
        public_key.verify(signature, data)
        return True
    except Exception:
        return False


def private_key_bytes(keypair: KeyPair) -> bytes:
    return keypair.private_key.private_bytes(
        encoding=serialization.Encoding.Raw,
        format=serialization.PrivateFormat.Raw,
        encryption_algorithm=serialization.NoEncryption(),
    )


def derive_session_key(local_public: bytes, peer_public: bytes) -> bytes:
    """Derive a shared 256-bit session key from both parties' public keys."""
    import hashlib
    keys = sorted([local_public, peer_public])
    material = keys[0] + keys[1] + b"zton-session-v1"
    return hashlib.sha256(material).digest()


def load_or_create_keypair(path: str) -> KeyPair:
    if os.path.exists(path):
        with open(path, "rb") as f:
            return KeyPair.from_private_bytes(f.read())
    kp = KeyPair.generate()
    with open(path, "wb") as f:
        f.write(kp.private_key.private_bytes(
            encoding=serialization.Encoding.Raw,
            format=serialization.PrivateFormat.Raw,
            encryption_algorithm=serialization.NoEncryption(),
        ))
    return kp
