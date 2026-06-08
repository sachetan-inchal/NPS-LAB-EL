# OpenZiti Integration Status

## Current upgraded mode

Run:

```bash
docker compose --profile openziti up --build
```

This starts:

- OpenZiti controller: `ziti-controller`, exposed on `1280` and `8443`
- OpenZiti edge router: `ziti-router`
- ZTON hub and node containers: `laptop-a`, `laptop-b`, `phone-b`, `phone-a`

The SOC dashboard probes the OpenZiti controller/router from inside Docker and shows their status in the OpenZiti Fabric Reality panel.

## What is realistic now

- OpenZiti Docker containers are part of the main stack.
- The dashboard distinguishes the OpenZiti fabric plane from the ZTON custom UDP packet lab.
- The topology shows the OpenZiti controller/router and the separate custom UDP data path.
- The ZTON packet lab still performs inspectable AES-GCM encryption, Ed25519 signatures, replay blocking, and identity/route policy checks.

## What is not OpenZiti-native yet

The ZTON UDP packets are not yet carried through OpenZiti services. They still use Python `socket.SOCK_DGRAM` between the ZTON node containers and the ZTON hub.

To make traffic fully OpenZiti-native, add:

1. OpenZiti identities for `laptop-a`, `laptop-b`, `phone-b`, and `phone-a`.
2. OpenZiti services for the FastAPI dashboard and, if required, the UDP packet service.
3. Service policies binding authorized identities to those services.
4. `ziti-edge-tunnel` sidecars or OpenZiti SDK integration in each application container.
5. A test that proves the ZTON app path fails when the OpenZiti router/controller path is unavailable.

## Demo wording

Use this precise explanation:

> This project now runs an OpenZiti production-style fabric plane in Docker and an inspectable ZTON packet lab beside it. The lab traffic is still custom UDP so packet encryption, signatures, replay blocking, and policy decisions are visible for evaluation. The next milestone is to enroll the containers as OpenZiti identities and route the application traffic through OpenZiti services.
