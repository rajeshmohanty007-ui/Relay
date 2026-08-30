import fs from 'fs';
import path from 'path';
import * as admin from 'firebase-admin';
import dotenv from 'dotenv';
import type {
  Node,
  Edge,
  Convoy,
  HazardEvent,
  DemoConfig,
  DemoLogEntry,
} from './types';
import { evaluateConvoy, evaluateFleet } from './routingEngine';

// Load environment variables from .env / .env.local if present
dotenv.config();
dotenv.config({ path: '.env.local' });

/**
 * Initializes Firebase Admin SDK using available environment credentials.
 * Mirrors the init logic in seed.ts (kept separate since seed.ts does not
 * export it).
 */
function initFirebaseAdmin(): admin.firestore.Firestore {
  if (admin.apps.length > 0) {
    return admin.firestore();
  }

  const serviceAccountPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
  const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || process.env.FIREBASE_PROJECT_ID;

  if (serviceAccountPath && fs.existsSync(serviceAccountPath)) {
    const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf-8'));
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      projectId: serviceAccount.project_id || projectId,
    });
  } else if (process.env.FIREBASE_SERVICE_ACCOUNT_KEY) {
    const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY);
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      projectId: serviceAccount.project_id || projectId,
    });
  } else {
    // Falls back to Google Application Default Credentials or Firestore Emulator
    admin.initializeApp({
      projectId: projectId || 'demo-disaster-relief',
    });
  }

  const db = admin.firestore();
  db.settings({ ignoreUndefinedProperties: true });
  return db;
}

// ─── CLI args ───────────────────────────────────────────────────────────────

function parseSpeed(argv: string[]): number {
  const arg = argv.find((a) => a.startsWith('--speed='));
  if (!arg) return 4;
  const value = Number(arg.slice('--speed='.length));
  return Number.isFinite(value) && value > 0 ? value : 4;
}

// ─── Small helpers ──────────────────────────────────────────────────────────

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

let logSeq = 0;
function nextLogId(): string {
  logSeq += 1;
  return `log_${Date.now()}_${logSeq}`;
}

/** Every logMessage produced by routingEngine.ts starts with "Convoy <id> ...". */
function extractConvoyId(message: string): string | undefined {
  const match = /^Convoy (\S+)/.exec(message);
  return match ? match[1] : undefined;
}

// A file-based stop request, checked between ticks. Does not depend on OS
// signal delivery — taskkill /F on Windows does not reliably reach the
// SIGINT handler below, so this is the primary controlled-stop mechanism.
const STOP_FILE_PATH = path.resolve(process.cwd(), '.demo-stop');

// A file-based manual event injection request, checked alongside the stop
// file. Lets a rehearsal operator force a hazard event outside the
// scheduled /events timeline without restarting the simulation.
export const TRIGGER_FILE_PATH = path.resolve(process.cwd(), '.demo-trigger.json');

export interface ManualTriggerPayload {
  targetEdgeId: string;
  newStatus: Edge['status'];
  description: string;
}

const VALID_EDGE_STATUSES: ReadonlySet<string> = new Set<Edge['status']>(['clear', 'degraded', 'blocked']);

function isManualTriggerPayload(value: unknown): value is ManualTriggerPayload {
  if (typeof value !== 'object' || value === null) return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v.targetEdgeId === 'string' &&
    typeof v.description === 'string' &&
    typeof v.newStatus === 'string' &&
    VALID_EDGE_STATUSES.has(v.newStatus)
  );
}

/**
 * Reads and immediately deletes .demo-trigger.json if present — same
 * check-before-writes ordering as the stop file, so it can't double-fire.
 * A missing, unparsable, or incomplete file is logged and discarded rather
 * than retried on the next tick.
 */
export function consumeManualTrigger(): ManualTriggerPayload | null {
  if (!fs.existsSync(TRIGGER_FILE_PATH)) return null;

  let payload: ManualTriggerPayload | null = null;
  try {
    const raw = fs.readFileSync(TRIGGER_FILE_PATH, 'utf-8');
    const parsed: unknown = JSON.parse(raw);
    if (!isManualTriggerPayload(parsed)) {
      throw new Error(
        'missing or invalid required field(s) — expected { targetEdgeId: string, newStatus: "clear"|"degraded"|"blocked", description: string }',
      );
    }
    payload = parsed;
  } catch (err: unknown) {
    console.error(
      `[Demo Runner] Ignoring malformed .demo-trigger.json: ${err instanceof Error ? err.message : String(err)}`,
    );
  } finally {
    fs.unlinkSync(TRIGGER_FILE_PATH);
  }

  return payload;
}

// ─── Main ───────────────────────────────────────────────────────────────────

async function main() {
  const speed = parseSpeed(process.argv);
  console.log(`[Demo Runner] Starting with speed=${speed} (1 real second = ${speed} sim seconds)`);

  const db = initFirebaseAdmin();

  console.log('[Demo Runner] Loading /nodes, /edges, /convoys, /events, /demoConfig/current ...');
  const [nodesSnap, edgesSnap, convoysSnap, eventsSnap, configSnap] = await Promise.all([
    db.collection('nodes').get(),
    db.collection('edges').get(),
    db.collection('convoys').get(),
    db.collection('events').get(),
    db.collection('demoConfig').doc('current').get(),
  ]);

  if (!configSnap.exists) {
    throw new Error('Missing /demoConfig/current — run `npm run seed` first.');
  }

  const nodes: Node[] = nodesSnap.docs.map((d) => d.data() as Node);
  const edgesById = new Map<string, Edge>(
    edgesSnap.docs.map((d) => [d.id, d.data() as Edge]),
  );
  const convoysById = new Map<string, Convoy>(
    convoysSnap.docs.map((d) => [d.id, d.data() as Convoy]),
  );
  const events: HazardEvent[] = eventsSnap.docs
    .map((d) => d.data() as HazardEvent)
    .sort((a, b) => a.timestampOffsetSec - b.timestampOffsetSec);
  const demoConfig = configSnap.data() as DemoConfig;

  console.log(
    `[Demo Runner] Loaded scenario "${demoConfig.scenarioName}": ` +
      `${nodes.length} nodes, ${edgesById.size} edges, ${convoysById.size} convoys, ${events.length} events. ` +
      `Total duration: ${demoConfig.totalDurationSec}s sim time.`,
  );

  const depotNodeIds = nodes.filter((n) => n.type === 'depot').map((n) => n.id);

  let simTimeSec = 0;
  let eventCursor = 0;
  let stopped = false;

  process.on('SIGINT', () => {
    if (stopped) return;
    stopped = true;
    console.log(`\n[Demo Runner] Interrupted at t=${simTimeSec}s. Shutting down cleanly...`);
    admin
      .app()
      .delete()
      .finally(() => process.exit(0));
  });

  async function tick(): Promise<void> {
    // Check for a stop request BEFORE this tick's Firestore writes begin,
    // so a stop never interrupts an in-flight batch.commit().
    if (fs.existsSync(STOP_FILE_PATH)) {
      stopped = true;
      console.log(`\n[Demo Runner] Stop file detected at t=${simTimeSec}s. Shutting down cleanly...`);
      await admin.app().delete();
      fs.unlinkSync(STOP_FILE_PATH);
      process.exit(0);
    }

    // Check for a manual event-injection request, same ordering guarantee
    // as the stop check above: read + delete before this tick's writes
    // begin, so a trigger file can't be consumed twice.
    const manualTrigger = consumeManualTrigger();

    simTimeSec += speed;

    const batch = db.batch();
    let batchOps = 0;
    let edgesChangedThisTick = false;
    const dirtyConvoyIds = new Set<string>();

    function queueLog(message: string, convoyId?: string): void {
      const entry: DemoLogEntry = {
        id: nextLogId(),
        simTimeSec,
        message,
        ...(convoyId ? { convoyId } : {}),
      };
      batch.set(db.collection('demoLog').doc(entry.id), entry);
      batchOps++;
      console.log(`  [t=${simTimeSec}s] ${message}`);
    }

    // b. Apply any hazard events whose threshold was just crossed.
    while (eventCursor < events.length && events[eventCursor].timestampOffsetSec <= simTimeSec) {
      const event = events[eventCursor];
      eventCursor++;

      const edge = edgesById.get(event.targetEdgeId);
      if (edge) {
        edge.status = event.newStatus;
        edgesChangedThisTick = true;
        batch.set(db.collection('edges').doc(edge.id), edge);
        batchOps++;
      }

      queueLog(event.description);
    }

    // b2. Apply a manually-injected event, exactly like a scheduled one.
    if (manualTrigger) {
      const edge = edgesById.get(manualTrigger.targetEdgeId);
      if (edge) {
        edge.status = manualTrigger.newStatus;
        edgesChangedThisTick = true;
        batch.set(db.collection('edges').doc(edge.id), edge);
        batchOps++;
      }

      queueLog(`[MANUAL] ${manualTrigger.description}`);
    }

    const currentEdges = Array.from(edgesById.values());

    // c. Deploy any 'pending' convoy whose departure time was just crossed.
    for (const convoy of convoysById.values()) {
      if (convoy.status !== 'pending') continue;
      if (convoy.departTimestampOffsetSec > simTimeSec) continue;

      const { updatedConvoy, logMessage } = evaluateConvoy(
        convoy,
        nodes,
        currentEdges,
        depotNodeIds,
      );
      convoysById.set(updatedConvoy.id, updatedConvoy);
      dirtyConvoyIds.add(updatedConvoy.id);

      if (logMessage) {
        queueLog(logMessage, updatedConvoy.id);
      }
    }

    // d. Advance 'enroute'/'rerouted' convoys along their current edge.
    for (const convoy of Array.from(convoysById.values())) {
      if (convoy.status !== 'enroute' && convoy.status !== 'rerouted') continue;
      if (!convoy.currentEdgeId) continue;

      let working: Convoy = { ...convoy };
      let remainingSimSec = speed;

      while (remainingSimSec > 0 && working.currentEdgeId) {
        const edge = edgesById.get(working.currentEdgeId);
        if (!edge) break;

        const durationSimSec = edge.baseTravelTimeMin * 60 * (edge.status === 'degraded' ? 2 : 1);
        const simSecToFinishEdge = (1 - working.positionProgress) * durationSimSec;

        if (remainingSimSec < simSecToFinishEdge) {
          working.positionProgress += remainingSimSec / durationSimSec;
          remainingSimSec = 0;
        } else {
          remainingSimSec -= simSecToFinishEdge;

          const idx = working.currentRoute.indexOf(working.currentEdgeId);
          const nextEdgeId = idx >= 0 ? working.currentRoute[idx + 1] : undefined;

          if (nextEdgeId) {
            working.currentEdgeId = nextEdgeId;
            working.positionProgress = 0;
          } else {
            working.status = 'arrived';
            working.currentEdgeId = null;
            working.positionProgress = 1;
            remainingSimSec = 0;
          }
        }
      }

      convoysById.set(working.id, working);
      dirtyConvoyIds.add(working.id);
    }

    // e. If any edge changed this tick, re-evaluate the whole active fleet.
    if (edgesChangedThisTick) {
      const activeConvoys = Array.from(convoysById.values()).filter(
        (c) => c.status !== 'arrived',
      );
      const { updatedConvoys, log } = evaluateFleet(activeConvoys, nodes, currentEdges);

      for (const updated of updatedConvoys) {
        convoysById.set(updated.id, updated);
        dirtyConvoyIds.add(updated.id);
      }
      for (const message of log) {
        queueLog(message, extractConvoyId(message));
      }
    }

    // Flush every convoy touched this tick.
    for (const convoyId of dirtyConvoyIds) {
      batch.set(db.collection('convoys').doc(convoyId), convoysById.get(convoyId)!);
      batchOps++;
    }

    if (batchOps > 0) {
      await batch.commit();
    }

    // f. One-line console summary.
    const statusSummary = Array.from(convoysById.values())
      .map((c) => `${c.id}=${c.status}`)
      .join(' ');
    console.log(`[t=${simTimeSec}s/${demoConfig.totalDurationSec}s] ${statusSummary}`);
  }

  while (!stopped && simTimeSec < demoConfig.totalDurationSec) {
    await sleep(1000);
    if (stopped) break;
    await tick();
  }

  if (!stopped) {
    console.log('\n[Demo Runner] === Final Summary ===');
    console.log(`  Simulated time: ${simTimeSec}s / ${demoConfig.totalDurationSec}s`);
    for (const convoy of convoysById.values()) {
      console.log(`  ${convoy.id}: ${convoy.status} (cargo=${convoy.cargoType}, progress=${convoy.positionProgress.toFixed(2)})`);
    }
    await admin.app().delete();
    process.exit(0);
  }
}

if (require.main === module) {
  main().catch((err: unknown) => {
    console.error('\n[Demo Runner] Fatal error:', err instanceof Error ? err.message : err);
    process.exit(1);
  });
}
