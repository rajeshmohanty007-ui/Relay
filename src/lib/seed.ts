import fs from 'fs';
import path from 'path';
import * as admin from 'firebase-admin';
import dotenv from 'dotenv';
import { GraphFixtureData } from './types';

// Load environment variables from .env / .env.local if present
dotenv.config();
dotenv.config({ path: '.env.local' });

/**
 * Initializes Firebase Admin SDK using available environment credentials
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

/**
 * Deletes every document in /demoLog. The simulation in demoRunner.ts is
 * deterministic, so re-running it against a re-seeded graph reproduces the
 * exact same (simTimeSec, message) entries — without clearing old log
 * history first, every re-run doubles up the event feed with duplicates.
 */
async function clearDemoLog(db: admin.firestore.Firestore): Promise<number> {
  const snapshot = await db.collection('demoLog').get();
  if (snapshot.empty) return 0;

  const BATCH_LIMIT = 450;
  let batch = db.batch();
  let opCount = 0;
  let deleted = 0;

  for (const doc of snapshot.docs) {
    batch.delete(doc.ref);
    opCount++;
    deleted++;
    if (opCount >= BATCH_LIMIT) {
      await batch.commit();
      batch = db.batch();
      opCount = 0;
    }
  }

  if (opCount > 0) {
    await batch.commit();
  }

  return deleted;
}

/**
 * Executes Firestore seed operation with batching
 */
export async function seedFirestore(
  fixturePath?: string,
  options: { dryRun?: boolean } = {}
): Promise<void> {
  const resolvedPath =
    fixturePath || path.resolve(process.cwd(), 'fixtures', 'graph.json');

  console.log(`[Seed Script] Reading fixture file from: ${resolvedPath}`);

  if (!fs.existsSync(resolvedPath)) {
    throw new Error(`Fixture file not found at: ${resolvedPath}`);
  }

  const raw = fs.readFileSync(resolvedPath, 'utf-8');
  const data: GraphFixtureData = JSON.parse(raw);

  console.log(`[Seed Script] Scenario: "${data.demoConfig.scenarioName}"`);
  console.log(`[Seed Script] Prepared documents to seed:`);
  console.log(`  - /nodes/       (${data.nodes.length} nodes)`);
  console.log(`  - /edges/       (${data.edges.length} edges)`);
  console.log(`  - /events/      (${data.hazardEvents.length} hazard events)`);
  console.log(`  - /convoys/     (${data.convoys.length} convoys)`);
  console.log(`  - /demoConfig/  (1 document -> /demoConfig/current)`);

  const totalDocs =
    data.nodes.length +
    data.edges.length +
    data.hazardEvents.length +
    data.convoys.length +
    1;

  console.log(`[Seed Script] Total documents: ${totalDocs}`);

  if (options.dryRun) {
    console.log('\n[Seed Script] --dry-run active: Verified JSON fixture successfully without writing to Firestore.');
    return;
  }

  console.log('\n[Seed Script] Connecting to Firestore via Firebase Admin SDK...');
  const db = initFirebaseAdmin();

  console.log('[Seed Script] Clearing existing /demoLog entries...');
  const clearedLogCount = await clearDemoLog(db);
  console.log(`[Seed Script] Cleared ${clearedLogCount} existing /demoLog document(s).`);

  // Firestore batch limit is 500 ops per commit
  const BATCH_LIMIT = 450;
  let currentBatch = db.batch();
  let currentOpCount = 0;
  let totalBatchesCommitted = 0;

  async function commitBatchIfNeeded(force = false) {
    if (currentOpCount > 0 && (currentOpCount >= BATCH_LIMIT || force)) {
      await currentBatch.commit();
      totalBatchesCommitted++;
      currentBatch = db.batch();
      currentOpCount = 0;
    }
  }

  // 1. Seed Nodes: /nodes/{nodeId}
  for (const node of data.nodes) {
    const ref = db.collection('nodes').doc(node.id);
    currentBatch.set(ref, node);
    currentOpCount++;
    await commitBatchIfNeeded();
  }

  // 2. Seed Edges: /edges/{edgeId}
  for (const edge of data.edges) {
    const ref = db.collection('edges').doc(edge.id);
    currentBatch.set(ref, edge);
    currentOpCount++;
    await commitBatchIfNeeded();
  }

  // 3. Seed Hazard Events: /events/{eventId}
  for (const event of data.hazardEvents) {
    const ref = db.collection('events').doc(event.id);
    currentBatch.set(ref, event);
    currentOpCount++;
    await commitBatchIfNeeded();
  }

  // 4. Seed Convoys: /convoys/{id}
  for (const convoy of data.convoys) {
    const ref = db.collection('convoys').doc(convoy.id);
    currentBatch.set(ref, convoy);
    currentOpCount++;
    await commitBatchIfNeeded();
  }

  // 5. Seed DemoConfig: /demoConfig/current
  const configRef = db.collection('demoConfig').doc('current');
  currentBatch.set(configRef, data.demoConfig);
  currentOpCount++;

  // Commit remaining
  await commitBatchIfNeeded(true);

  console.log(`\n✔ [Seed Script] SUCCESS: Successfully seeded ${totalDocs} documents across ${totalBatchesCommitted} batch commit(s) into Firestore.`);
}

/**
 * CLI Entrypoint
 */
async function main() {
  const isDryRun = process.argv.includes('--dry-run');
  const customFixture = process.argv.find((arg) => arg.endsWith('.json'));

  try {
    await seedFirestore(customFixture, { dryRun: isDryRun });
    process.exit(0);
  } catch (err: unknown) {
    console.error('\n✖ [Seed Script] Seeding failed:', err instanceof Error ? err.message : err);
    if (!isDryRun && (err as { code?: string })?.code === 'app/no-app') {
      console.error('\nHint: Ensure Google Cloud / Firebase credentials are set via GOOGLE_APPLICATION_CREDENTIALS or use FIRESTORE_EMULATOR_HOST for local emulator.');
    }
    process.exit(1);
  }
}

if (require.main === module || (typeof process !== 'undefined' && process.argv[1]?.includes('seed'))) {
  main();
}
