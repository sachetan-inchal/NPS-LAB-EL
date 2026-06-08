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
- OpenZiti tunnel sidecars: `ziti-tunnel-hub`, `ziti-tunnel-laptop-b`, `ziti-tunnel-phone-b`, `ziti-tunnel-phone-a`
- ZTON hub and node containers: `laptop-a`, `laptop-b`, `phone-b`, `phone-a`

The SOC dashboard probes the OpenZiti controller/router from inside Docker and shows their status in the OpenZiti Fabric Reality panel. The bootstrap job provisions ZTON identities, OpenZiti services, and service policies. The tunnel sidecars enroll those identities and attach the Python containers to the OpenZiti services.

## What is realistic now

- OpenZiti Docker containers are part of the main stack.
- The OpenZiti layer provisions a UDP service for `laptop-a:9999` and a TCP dashboard service for `laptop-a:8080`.
- `zton-laptop-b-client` and `zton-phone-b-client` receive dial access; `zton-phone-a-client` is enrolled without dial access.
- `zton-hub-host` receives bind access for the ZTON services.
- `ziti-tunnel-hub` hosts `zton-udp-9999` and `zton-dashboard-8080` from the Laptop A network namespace.
- `ziti-tunnel-laptop-b` and `ziti-tunnel-phone-b` install intercepts for `zton-hub.openziti` and `zton-dashboard.openziti`.
- `ziti-tunnel-phone-a` enrolls and connects to the router, but receives no service intercepts because it lacks the `zton-authorized` role.
- The dashboard distinguishes the OpenZiti fabric plane from the ZTON custom UDP packet lab.
- The topology shows the OpenZiti controller/router and the separate custom UDP data path.
- The ZTON packet lab still performs inspectable AES-GCM encryption, Ed25519 signatures, replay blocking, and identity/route policy checks.

## Provisioned OpenZiti services

| Service | Intercept | Hosted endpoint | Access |
|---------|-----------|-----------------|--------|
| `zton-udp-9999` | `udp://zton-hub.openziti:9999` | `udp://laptop-a:9999` | Dial: Laptop B + Phone B, Bind: Hub |
| `zton-dashboard-8080` | `tcp://zton-dashboard.openziti:8080` | `tcp://laptop-a:8080` | Dial: Laptop B + Phone B, Bind: Hub |

## Tunnel attachment

The default Docker OpenZiti profile now attaches the app containers with `ziti-edge-tunnel` sidecars. Authorized nodes use `ZTON_HUB_HOST=zton-hub.openziti`, so their UDP packets flow through OpenZiti's intercept/terminator path before reaching the ZTON hub.

To go further, replace sidecar tunneling with SDK-native application traffic:

1. Replace Python `socket.SOCK_DGRAM` calls with an OpenZiti SDK dial/listen path.
2. Keep the same OpenZiti services and policies, or split dashboard and UDP policies further.
3. Add a test that proves the ZTON app path fails when the OpenZiti router/controller/tunnel path is unavailable.

## Demo wording

Use this precise explanation:

> This project now runs an OpenZiti production-style fabric plane in Docker and an inspectable ZTON packet lab beside it. The lab traffic is still custom UDP so packet encryption, signatures, replay blocking, and policy decisions are visible for evaluation. The next milestone is to enroll the containers as OpenZiti identities and route the application traffic through OpenZiti services.

Updated wording after this integration:

> This project provisions an OpenZiti controller, edge router, ZTON identities, ZTON UDP/dashboard services, and OpenZiti bind/dial policies. The default Python demo path remains raw UDP for packet inspection, and the next step is attaching `ziti-edge-tunnel` sidecars or SDK clients so packets traverse those provisioned OpenZiti services.

Updated wording after tunnel attachment:

> This project runs an OpenZiti controller, edge router, ZTON identities, ZTON UDP/dashboard services, bind/dial policies, and ziti-edge-tunnel sidecars. Laptop B and Phone B reach the hub through the private `zton-hub.openziti` intercept, while Phone A has an enrolled identity but no dial policy, so it cannot resolve or dial the private service.
