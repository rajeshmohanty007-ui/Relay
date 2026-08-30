# Relay

**Real-time convoy routing and disaster response coordination for flood emergencies.**

Relay is a dispatch and routing platform built around a live flood-crisis scenario: the **Aluva–Periyar River Flood Relief Basin**. It models a 30-node road network (2 depots, 4 shelters, 12 villages, 12 junctions) around a swelling river system, where roads degrade or wash out over the course of the event, and relief convoys carrying insulin, blood, water, and food have to reach shelters and be rerouted — or recalled — as the ground truth changes underneath them in real time.

It's built for the operator who has to make that call in the next thirty seconds, not for a static after-action report.

---

## The problem

During a monsoon flood, the road network itself is the thing failing. Culverts breach, causeways submerge, and travel times double on roads that are still technically passable. A relief convoy that had a clear route ten minutes ago may now be driving into a blocked road — and the dispatcher finding out about it needs three things at once: **where every convoy currently is**, **what just happened to the network**, and **what to do about it**, without re-deriving all of that by hand.

Relay's core problem statement is: given a road network that changes state during an active emergency, keep every in-flight convoy on a valid, shortest-available route to its destination — reroute it the moment a better or only path appears, and recall it to the nearest reachable depot the moment no path to its destination exists at all — while giving both the dispatcher and the general public a live, legible view of the situation.

---

## What it does

### Routing & fleet logic
- A graph-based road network (`fixtures/graph.json`) with per-edge status (`clear` / `degraded` / `blocked`), heavy-vehicle-safety flags, and directionality.
- Dijkstra-based shortest-path routing (`src/lib/routingEngine.ts`), with a separate adjacency builder for relief convoys (which must avoid heavy-vehicle-unsafe roads) versus ordinary citizens (which don't).
- Per-convoy state machine (`pending → enroute/rerouted → arrived`, or `recalled`) that re-evaluates every convoy against the current graph state, reroutes it if a better path exists, and recalls it to the nearest reachable depot if its destination becomes unreachable.
- Fleet-wide evaluation (`evaluateFleet`) that runs this logic across all active convoys and produces a human-readable dispatch log.
- A scripted demo runner (`src/lib/demoRunner.ts`) that plays a real scenario forward against Firestore in real time (or sped up via `--speed=N`), triggering scripted hazard events — a causeway flooding, a culvert breaching — at specific timestamps so the rerouting logic can be watched live rather than only unit-tested.

### Operations dashboard
- A tactical, topographically-styled SVG map (`MapViewTopo.tsx`) with road-aligned river and canal flow channels, bridge/culvert crossings, and interactive hydrological sensor beacons.
- A realistic geographic map (`MapViewGeo.tsx`) built on Leaflet, with routes snapped to real road geometry via the public OSRM API (in-flight request deduplication, memory + session caching), street/satellite basemap toggle, and live node labels.
- A shelter priority panel ranking shelters by critical stock levels (insulin, blood, water, food) and hours of remaining stock, with incoming-fleet tracking.
- A dispatcher flight log surfacing every routing decision — deployments, reroutes, recalls — as they happen.
- A historical replay timeline (`useReplayBuffer.ts`, `ReplayTimeline.tsx`) that captures sequential snapshots of the simulation so the entire incident can be scrubbed back through after the fact.

### Hydrological telemetry
- A simulated sensor network (`src/lib/waterSensors.ts`) across six basin sections (Upper Periyar Catchment, Grand Canal Drainage, Southern Delta & Estuary, etc.), each sensor reporting water level, rate of rise, flow velocity, discharge, and road-submersion depth against normal/advisory/warning/critical thresholds — correlated back to the specific road edges and node names they affect.
- A live sensor dashboard (`SensorMapView.tsx`, `SensorDataTable.tsx`, `SensorStatsOverview.tsx`, `SensorAlertBanner.tsx`) for watching the flood develop independently of the convoy view.

### Citizen-facing tools
- A point-to-point route planner (`RoutePlannerModal.tsx`) for ordinary travelers, using the citizen-specific adjacency graph (private vehicles and two-wheelers aren't bound by the heavy-vehicle-safety constraint relief trucks are), with an animated route overlay on both map views.
- A road hazard grievance form (`GrievanceFormModal.tsx`) letting citizens report a blocked or dangerous road with hazard classification, vehicle ID, and photo evidence, which escalates through a P1/P2/P3 priority scheme and triggers a simulated rescue dispatch.

---

## Architecture

```
Next.js (App Router) + React 19 + TypeScript
        │
        ├── src/lib/routingEngine.ts   — graph adjacency + Dijkstra + convoy state machine
        ├── src/lib/demoRunner.ts      — scripted scenario playback against Firestore
        ├── src/lib/waterSensors.ts    — hydrological sensor network model
        ├── src/lib/validateGraph.ts   — graph reachability/integrity checks
        ├── src/lib/osrmrouting.ts     — real road-geometry snapping via OSRM
        │
        ├── src/components/            — dashboard, maps (tactical + geographic),
        │                                 dispatch panel, event feed, replay timeline,
        │                                 sensor views, route planner, grievance form
        │
        ├── fixtures/graph.json        — the Aluva–Periyar scenario: nodes, edges,
        │                                 hazard events, convoys, demo config
        │
        └── Firebase / Firestore       — data store, seeded from the fixture,
                                          read live by the dashboard, written only
                                          by the Admin SDK (client writes are denied
                                          in firestore.rules)
```

Styling uses a custom earth-tone/tactical palette (deliberately not default Tailwind blue) with status colors shared consistently across convoys, road edges, and sensor telemetry: vibrant tactical emerald (`#059669`) for clear roads, amber ochre (`#D97706`) for degraded/warning, and crimson red (`#DC2626`) for blocked/critical.

---

## Getting started

### Prerequisites
- Node.js
- A Firebase project (for live mode), or the Firestore emulator (for local/offline demo mode)

### Install

```bash
npm install
```

### Environment variables

Create `.env.local` with your Firebase web config:

```env
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=relay-dc0db
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
NEXT_PUBLIC_FIREBASE_APP_ID=
NEXT_PUBLIC_USE_FIRESTORE_EMULATOR=true
```

For server-side scripts (`seed`, `demo`) that write via the Admin SDK, either set `GOOGLE_APPLICATION_CREDENTIALS` to a service account JSON path, or set `FIREBASE_SERVICE_ACCOUNT_KEY` to the JSON contents directly.

### Run against the local emulator (recommended for a demo)

```bash
# Terminal 1 — start the Firestore emulator
npx firebase emulators:start

# Terminal 2 — seed the scenario graph into the emulator
npm run seed

# Terminal 3 — play the scripted scenario forward
npm run demo            # real-time
npm run demo -- --speed=4   # 4x speed

# Terminal 4 — start the Next.js dev server
npm run dev
```

Open [http://localhost:3000/dashboard](http://localhost:3000/dashboard).

### Run against a live Firebase project

Use the `*:live` script variants (`npm run seed:live`, `npm run demo:live`) instead, with your real project credentials set.

### Verify the routing engine and graph

```bash
npm run test:routing   # routing engine test suite
npm run validate       # confirms every node is reachable from a depot
npm run lint
```

---

## Project status

| Layer | Status |
|---|---|
| Graph data model & fixture | Complete — 30 nodes, 46 edges, validated reachable from depots |
| Routing engine (Dijkstra, convoy state machine, fleet evaluation) | Complete — full test suite passing |
| Scripted demo runner | Complete — real-time and sped-up playback with scheduled hazard events |
| Tactical + geographic map views | Complete — Dark tactical slate road network with Leaflet + OSRM snapping |
| Hydrological sensor telemetry | Complete |
| Replay/timeline scrubbing | Complete |
| Citizen route planner & grievance reporting | Complete |

See `STATUS.md` for a more detailed, file-by-file breakdown.

---

## Tech stack

Next.js · React 19 · TypeScript · Tailwind CSS · Firebase / Firestore · Leaflet + react-leaflet · OSRM (public routing API)
