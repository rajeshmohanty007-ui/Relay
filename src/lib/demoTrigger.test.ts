import assert from 'node:assert/strict';
import fs from 'fs';
import { consumeManualTrigger, TRIGGER_FILE_PATH } from './demoRunner';

let passed = 0;
let failed = 0;

function test(name: string, fn: () => void): void {
  try {
    fn();
    console.log(`  ✔ PASS: ${name}`);
    passed++;
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`  ✖ FAIL: ${name}`);
    console.error(`         ${msg}`);
    failed++;
  }
}

console.log('\n=== Demo Trigger Tests ===\n');

test('Malformed .demo-trigger.json (missing targetEdgeId) is safely ignored, not thrown', () => {
  fs.writeFileSync(
    TRIGGER_FILE_PATH,
    JSON.stringify({ newStatus: 'blocked', description: 'missing targetEdgeId' }),
  );

  let result: ReturnType<typeof consumeManualTrigger>;
  assert.doesNotThrow(() => {
    result = consumeManualTrigger();
  }, 'consumeManualTrigger() must not throw on malformed input');

  assert.equal(result!, null, 'Malformed payload should resolve to null, not a partial object');
});

test('Malformed trigger file is deleted after being consumed (no infinite retry)', () => {
  assert.equal(
    fs.existsSync(TRIGGER_FILE_PATH),
    false,
    '.demo-trigger.json should be deleted even when it fails to parse/validate',
  );
});

test('Absent trigger file returns null without error', () => {
  assert.equal(fs.existsSync(TRIGGER_FILE_PATH), false, 'precondition: file should not exist');
  let result: ReturnType<typeof consumeManualTrigger>;
  assert.doesNotThrow(() => {
    result = consumeManualTrigger();
  });
  assert.equal(result!, null);
});

test('Well-formed trigger file is parsed correctly and then deleted', () => {
  fs.writeFileSync(
    TRIGGER_FILE_PATH,
    JSON.stringify({
      targetEdgeId: 'edge_dn_jnorth',
      newStatus: 'blocked',
      description: 'Test-injected roadblock',
    }),
  );

  const result = consumeManualTrigger();
  assert.deepEqual(result, {
    targetEdgeId: 'edge_dn_jnorth',
    newStatus: 'blocked',
    description: 'Test-injected roadblock',
  });
  assert.equal(fs.existsSync(TRIGGER_FILE_PATH), false, 'file should be deleted after a successful read too');
});

console.log(`\n=== Results: ${passed} passed, ${failed} failed ===\n`);

if (failed > 0) {
  process.exit(1);
} else {
  process.exit(0);
}
