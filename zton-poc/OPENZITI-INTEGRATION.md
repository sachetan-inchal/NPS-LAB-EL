# OpenZiti Integration Status

## Current upgraded mode

Run:

```bash
docker compose --profile openziti up --build
```

This starts:

- OpenZiti controller: `ziti-controller`, exposed on `1280` and `8443`
- OpenZiti edge router: `ziti-router`
- OpenZiti bootstrap job: `ziti-bootstrap`
- ZTON hub and node containers: `laptop-a`, `laptop-b`, `phone-b`, `phone-a`

The SOC dashboard probes the OpenZiti controller/router from inside Docker and shows their status in the OpenZiti Fabric Reality panel. The bootstrap job provisions ZTON identities, OpenZiti services, and service policies.

## What is realistic now

- OpenZiti Docker containers are part of the main stack.
- The OpenZiti layer provisions a UDP service for `laptop-a:9999` and a TCP dashboard service for `laptop-a:8080`.
- `zton-laptop-b-client` and `zton-phone-b-client` receive dial access; `zton-phone-a-client` is enrolled without dial access.
- `zton-hub-host` receives bind access for the ZTON services.
- The dashboard distinguishes the OpenZiti fabric plane from the ZTON custom UDP packet lab.
- The topology shows the OpenZiti controller/router and the separate custom UDP data path.
- The ZTON packet lab still performs inspectable AES-GCM encryption, Ed25519 signatures, replay blocking, and identity/route policy checks.

## Provisioned OpenZiti services

| Service | Intercept | Hosted endpoint | Access |
|---------|-----------|-----------------|--------|
| `zton-udp-9999` | `udp://zton-hub.openziti:9999` | `udp://laptop-a:9999` | Dial: Laptop B + Phone B, Bind: Hub |
| `zton-dashboard-8080` | `tcp://zton-dashboard.openziti:8080` | `tcp://laptop-a:8080` | Dial: Laptop B + Phone B, Bind: Hub |

## What still needs tunnel attachment

The ZTON UDP packets are not automatically carried through OpenZiti until the app containers run `ziti-edge-tunnel` sidecars or use an OpenZiti SDK. The OpenZiti services and policies now exist; the remaining work is to attach the Python containers to those services.

To make traffic fully OpenZiti-native, add:

1. Enroll the generated JWTs from the `ziti-data` volume into tunnel identities.
2. Run `ziti-edge-tunnel` sidecars for hub/client containers, or replace raw socket calls with an OpenZiti SDK path.
3. Point client traffic at `zton-hub.openziti:9999` through the tunnel DNS/intercept path.
4. Add a test that proves the ZTON app path fails when the OpenZiti router/controller path is unavailable.

## Demo wording

Use this precise explanation:

> This project now runs an OpenZiti production-style fabric plane in Docker and an inspectable ZTON packet lab beside it. The lab traffic is still custom UDP so packet encryption, signatures, replay blocking, and policy decisions are visible for evaluation. The next milestone is to enroll the containers as OpenZiti identities and route the application traffic through OpenZiti services.

Updated wording after this integration:

> This project provisions an OpenZiti controller, edge router, ZTON identities, ZTON UDP/dashboard services, and OpenZiti bind/dial policies. The default Python demo path remains raw UDP for packet inspection, and the next step is attaching `ziti-edge-tunnel` sidecars or SDK clients so packets traverse those provisioned OpenZiti services.
