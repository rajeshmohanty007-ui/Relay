# Rehearsal Runbook

Exact commands, in order, for a full clean run against the Firestore
emulator using `relay-dc0db` as the project ID throughout (not
`demo-avinya-relay`, which was a stale placeholder from earlier testing
and is no longer used).

Run everything from the project root. Commands are given for Git Bash;
where Windows `cmd`/PowerShell syntax differs it's noted inline.

## 1. Start the emulator

```bash
firebase emulators:start --project=relay-dc0db --only firestore
```

Wait for `✔ All emulators ready!` before continuing. Leave this running in
its own terminal — Firestore is served on `localhost:8080`, the Emulator
UI on `localhost:4000`.

## 2. Confirm `.env.local`

Open `.env.local` and confirm these two lines are present:

```
NEXT_PUBLIC_FIREBASE_PROJECT_ID=relay-dc0db
NEXT_PUBLIC_USE_FIRESTORE_EMULATOR=true
```

Without the second line, the dashboard connects to the **live** project
instead of the emulator.

## 3. Reseed (safe to rerun anytime — clears `/demoLog` automatically)

```bash
npm run seed
```

`npm run seed` always targets `localhost:8080` — the emulator host is
baked into the script itself (`cross-env FIRESTORE_EMULATOR_HOST=...`), so
it can't accidentally hit live Firestore no matter what is or isn't
exported in the terminal running it. `seed.ts` also clears every existing
`/demoLog` document before writing fresh `/nodes`, `/edges`, `/convoys`,
`/events`, and `/demoConfig/current` — so rerunning this never leaves
stale or duplicate log entries behind.

> **Live Firestore, deliberately**: `npm run seed:live` and
> `npm run demo:live` run the same scripts against whatever real
> credentials `.env.local` / `GOOGLE_APPLICATION_CREDENTIALS` resolve to —
> no emulator override. Only use these on purpose (e.g. seeding
> production once before an actual live demo), never as a default.

## 4. Start the dashboard

```bash
npm run dev
```

Then open **http://localhost:3000/dashboard** in a browser. With step 2
confirmed, the dev server log should print:

```
[firebaseClient] Connected to Firestore emulator at localhost:8080
```

## 5. Start the simulation

```bash
npm run demo -- --speed=<N>
```

Same as `seed`, this always targets `localhost:8080` regardless of the
environment it's run in.

`<N>` is how many simulated seconds pass per real second (default `4`;
`20`–`40` is a reasonable rehearsal pace — the full 1200s scenario takes
`1200/N` real seconds).

## 6. Manually trigger an event early

While the demo is running, drop a JSON file named `.demo-trigger.json` in
the project root. It's picked up and deleted on the next tick (checked
every real second), applied exactly like a scheduled `/events` entry, and
logged to `/demoLog` prefixed `[MANUAL]`.

Example — force-block the Depot North ↔ North Highway Fork road
(`edge_dn_jnorth` in `fixtures/graph.json`):

```bash
cat > .demo-trigger.json << 'EOF'
{
  "targetEdgeId": "edge_dn_jnorth",
  "newStatus": "blocked",
  "description": "Rehearsal-injected rockslide blocks the North Highway Fork approach."
}
EOF
```

Required fields: `targetEdgeId` (string, must match a real edge id),
`newStatus` (`"clear"` | `"degraded"` | `"blocked"`), `description`
(string). A missing/malformed file is logged to the demo runner's console
and discarded — it will not crash the simulation or retry.

## 7. Stop the simulation cleanly

```bash
touch .demo-stop
```

The demo runner detects this at the top of its next tick (before that
tick's Firestore writes begin), logs `Stop file detected...`, closes its
Firestore connection, deletes `.demo-stop` itself, and exits — no
`Ctrl+C`/`taskkill` needed.

## 8. Full reset between rehearsal attempts

```bash
touch .demo-stop        # stop the currently-running demoRunner cleanly
# wait for it to exit, then:
npm run seed             # clears /demoLog and resets /nodes /edges /convoys /demoConfig
```

The dashboard and emulator can stay running across resets — only the demo
runner needs to be stopped and the data reseeded.
