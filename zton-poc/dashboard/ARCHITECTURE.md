# ZTON SOC Dashboard — Frontend Architecture

## Stack

| Layer | Technology |
|-------|-----------|
| Framework | React 18 + TypeScript |
| Styling | TailwindCSS + shadcn/ui patterns |
| Animation | Framer Motion |
| Charts | Recharts |
| Topology | React Flow (`@xyflow/react`) |
| State | Zustand |
| Build | Vite |

## Component Hierarchy

```
App
├── Header (tabs, presentation toggle)
├── OverviewPage
│   ├── SystemStatusPanel
│   ├── StatsPanel (AnimatedCounter)
│   ├── NetworkTopology (React Flow)
│   ├── EncryptionVisualizer
│   ├── TrafficCharts (Recharts)
│   ├── PacketGenerator
│   ├── PacketStream
│   ├── SecurityEvents
│   └── PolicyPanel
├── DemoPage
│   ├── DemoScenarios
│   ├── PacketGenerator
│   ├── EncryptionVisualizer
│   ├── PolicyPanel
│   ├── PacketStream
│   └── SecurityEvents
└── PresentationPage (fullscreen projector layout)
    ├── Hero metrics
    ├── NetworkTopology
    ├── EncryptionVisualizer
    ├── StatsPanel
    ├── DemoScenarios
    └── SecurityEvents
```

## Folder Structure

```
dashboard/src/
├── components/
│   ├── ui/           # shadcn-style primitives (Button, Card, Badge)
│   ├── layout/       # Header, shell
│   ├── dashboard/    # Status, stats panels
│   ├── charts/       # Recharts wrappers
│   ├── topology/     # React Flow network graph
│   └── panels/       # SOC panels (generator, stream, events, policy)
├── pages/            # Route-level views
├── hooks/            # useDashboardData (polling + WebSocket)
├── services/         # api.ts — backend integration
├── store/            # Zustand global state
├── types/            # TypeScript interfaces
└── lib/              # utils (cn, formatNumber)
```

## API Integration

| Endpoint | Purpose |
|----------|---------|
| `GET /api/soc/status` | Controller, router, overlay, encryption status |
| `GET /api/soc/stats` | Live packet counters + traffic time series |
| `GET /api/soc/packets` | Packet stream table |
| `GET /api/soc/events` | SOC security event feed |
| `GET /api/soc/policies` | Zero trust policy rules |
| `GET /api/soc/topology` | React Flow nodes + edges |
| `POST /api/soc/simulate/start` | Packet generator |
| `POST /api/soc/scenarios/:id/run` | One-click demo scenarios |
| `WS /api/soc/ws` | Real-time tick updates |

## Data Flow

1. `useDashboardData` polls REST every 1.5s
2. WebSocket pushes latest packet/event for animation
3. Zustand store feeds all panels
4. Packet generator triggers backend simulation engine
5. Live ZTON hub events merged with simulated packets
