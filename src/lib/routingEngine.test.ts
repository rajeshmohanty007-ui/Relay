import assert from 'node:assert/strict';
import fs from 'fs';
import path from 'path';
import type { Node, Edge, Convoy, GraphFixtureData } from './types';
import {
  buildAdjacency,
  shortestPath,
  nearestReachableDepot,
  evaluateConvoy,
  evaluateFleet,
} from './routingEngine';



const fixturePath = path.resolve(process.cwd(), 'fixtures', 'graph.json');
const fixture: GraphFixtureData = JSON.parse(fs.readFileSync(fixturePath, 'utf-8'));
const { nodes, edges } = fixture;
const depotIds = nodes.filter((n) => n.type === 'depot').map((n) => n.id);



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



function cloneEdges(overrides: Record<string, Partial<Edge>>): Edge[] {
  return edges.map((e) => {
    const override = overrides[e.id];
    return override ? { ...e, ...override } : { ...e };
  });
}


console.log('\n=== Routing Engine Tests ===\n');
console.log('--- buildAdjacency ---');


test('Excludes blocked edges from adjacency', () => {
  const modEdges = cloneEdges({ edge_dn_jnorth: { status: 'blocked' } });
  const adj = buildAdjacency(nodes, modEdges);

  const fromDepotNorth = adj.get('depot_north')!;
  const hasBlockedEdge = fromDepotNorth.some((e) => e.edgeId === 'edge_dn_jnorth');
  assert.equal(hasBlockedEdge, false, 'Blocked edge should not appear in adjacency');

  
  const fromJuncNorthFork = adj.get('junc_north_fork')!;
  const hasBlockedReverse = fromJuncNorthFork.some((e) => e.edgeId === 'edge_dn_jnorth');
  assert.equal(hasBlockedReverse, false, 'Blocked edge reverse should not appear');
});

test('Excludes heavyVehicleSafe=false edges from adjacency', () => {
  
  const adj = buildAdjacency(nodes, edges);

  const fromJuncDam = adj.get('junc_dam_road')!;
  const hasUnsafeEdge = fromJuncDam.some((e) => e.edgeId === 'edge_jdam_vhighland');
  assert.equal(hasUnsafeEdge, false, 'Heavy-vehicle-unsafe edge should be excluded');
});

test('Degraded edges have doubled weight', () => {
  
  const modEdges = cloneEdges({ edge_jrbn_jcentral: { status: 'degraded' } });
  const adj = buildAdjacency(nodes, modEdges);

  const fromBridge = adj.get('junc_river_bridge_n')!;
  const degradedEntry = fromBridge.find((e) => e.edgeId === 'edge_jrbn_jcentral');
  assert.ok(degradedEntry, 'Degraded edge should exist in adjacency');
  assert.equal(degradedEntry!.weight, 22, 'Degraded weight should be baseTravelTimeMin * 2');
});

test('Bidirectional edges appear in both directions', () => {
  const adj = buildAdjacency(nodes, edges);

  
  const forward = adj.get('depot_north')!.some((e) => e.edgeId === 'edge_dn_jnorth');
  const reverse = adj.get('junc_north_fork')!.some((e) => e.edgeId === 'edge_dn_jnorth');
  assert.ok(forward, 'Forward direction should exist');
  assert.ok(reverse, 'Reverse direction should exist');
});


console.log('\n--- shortestPath ---');


test('Finds shortest path and avoids a blocked edge', () => {
  
  
  const modEdges = cloneEdges({ edge_jeast_svalley: { status: 'blocked' } });
  const adj = buildAdjacency(nodes, modEdges);

  const result = shortestPath(adj, 'depot_north', 'shelter_valley_school');
  assert.ok(result, 'Path should still exist via alternative route');
  assert.ok(!result!.path.includes('edge_jeast_svalley'), 'Path must not include blocked edge');
  assert.ok(result!.nodeSequence[0] === 'depot_north', 'Should start at origin');
  assert.ok(
    result!.nodeSequence[result!.nodeSequence.length - 1] === 'shelter_valley_school',
    'Should end at destination',
  );
  assert.ok(result!.totalTimeMin > 0, 'Travel time should be positive');
});

test('Same source and destination returns empty path with zero cost', () => {
  const adj = buildAdjacency(nodes, edges);
  const result = shortestPath(adj, 'depot_north', 'depot_north');
  assert.ok(result, 'Self-path should not be null');
  assert.deepEqual(result!.path, [], 'Edge path should be empty');
  assert.deepEqual(result!.nodeSequence, ['depot_north'], 'Node sequence should be just the node');
  assert.equal(result!.totalTimeMin, 0, 'Cost should be zero');
});

test('Returns null when destination is unreachable', () => {
  
  
  
  
  
  
  
  const adj = buildAdjacency(nodes, edges);
  const result = shortestPath(adj, 'village_highland_reach', 'depot_north');
  assert.equal(result, null, 'Should return null — node isolated for heavy vehicles');
});

test('Degraded edge used when it is still the fastest option', () => {
  
  
  
  
  
  
  
  const modEdges = cloneEdges({
    edge_jrbn_jcentral: { status: 'degraded' },
    edge_vpaddy_jcentral: { status: 'blocked' },
    edge_vcoconut_jcentral: { status: 'blocked' },
  });
  const adj = buildAdjacency(nodes, modEdges);

  const result = shortestPath(adj, 'junc_river_bridge_n', 'junc_central_cross');
  assert.ok(result, 'Path should exist via degraded edge');
  assert.ok(
    result!.path.includes('edge_jrbn_jcentral'),
    'Should use the degraded edge when no better alternative exists',
  );
  assert.equal(result!.totalTimeMin, 22, 'Weight should reflect degraded penalty (11*2=22)');
});

test('Degraded edge avoided when a clear alternative is faster', () => {
  
  
  
  const modEdges = cloneEdges({
    edge_jrbn_jcentral: { status: 'degraded' },
  });
  const adj = buildAdjacency(nodes, modEdges);

  const result = shortestPath(adj, 'junc_river_bridge_n', 'junc_central_cross');
  assert.ok(result, 'Path should exist');
  assert.ok(
    !result!.path.includes('edge_jrbn_jcentral'),
    'Should avoid degraded edge when clear alternative is faster',
  );
  assert.ok(result!.totalTimeMin < 22, 'Alternative should be cheaper than degraded path');
});


console.log('\n--- nearestReachableDepot ---');


test('Returns the nearest depot', () => {
  const adj = buildAdjacency(nodes, edges);

  
  const result = nearestReachableDepot(adj, 'junc_south_express', depotIds);
  assert.ok(result, 'Should find a depot');
  assert.equal(result!.depotId, 'depot_south', 'Nearest depot should be depot_south');
  assert.equal(result!.totalTimeMin, 6, 'ETA should be 6 min');
});

test('Returns null when no depot reachable', () => {
  
  const adj = buildAdjacency(nodes, edges);
  const result = nearestReachableDepot(adj, 'village_highland_reach', depotIds);
  assert.equal(result, null, 'Should return null — node isolated for heavy vehicles');
});


console.log('\n--- evaluateConvoy ---');


test('Arrived convoy is untouched', () => {
  const arrivedConvoy: Convoy = {
    id: 'test_arrived',
    cargoType: 'water',
    originNodeId: 'depot_north',
    destNodeId: 'shelter_valley_school',
    departTimestampOffsetSec: 0,
    status: 'arrived',
    currentRoute: [],
    currentEdgeId: null,
    positionProgress: 1,
  };

  const { updatedConvoy, logMessage } = evaluateConvoy(
    arrivedConvoy, nodes, edges, depotIds,
  );
  assert.equal(updatedConvoy.status, 'arrived', 'Status should remain arrived');
  assert.equal(logMessage, '', 'Log message should be empty');
});

test('Pending convoy deploys with correct log message', () => {
  const pendingConvoy: Convoy = {
    id: 'test_pending',
    cargoType: 'insulin',
    originNodeId: 'depot_north',
    destNodeId: 'shelter_east_hospital',
    departTimestampOffsetSec: 0,
    status: 'pending',
    currentRoute: [],
    currentEdgeId: null,
    positionProgress: 0,
  };

  const { updatedConvoy, logMessage } = evaluateConvoy(
    pendingConvoy, nodes, edges, depotIds,
  );
  assert.equal(updatedConvoy.status, 'enroute', 'Should transition to enroute');
  assert.ok(updatedConvoy.currentRoute.length > 0, 'Should have a computed route');
  assert.ok(logMessage.includes('deployed'), 'Log should say deployed, not rerouted');
  assert.ok(logMessage.includes('ETA'), 'Log should include ETA');
  assert.ok(!logMessage.includes('rerouted'), 'Log should NOT say rerouted for initial deploy');
});

test('Pending convoy with no safe path logs cannot deploy', () => {
  
  const modEdges = cloneEdges({
    edge_vtea_seast: { status: 'blocked' },
    edge_jvalleylink_seast: { status: 'blocked' },
  });

  const convoy: Convoy = {
    id: 'test_no_deploy',
    cargoType: 'insulin',
    originNodeId: 'depot_north',
    destNodeId: 'shelter_east_hospital',
    departTimestampOffsetSec: 0,
    status: 'pending',
    currentRoute: [],
    currentEdgeId: null,
    positionProgress: 0,
  };

  const { updatedConvoy, logMessage } = evaluateConvoy(
    convoy, nodes, modEdges, depotIds,
  );
  assert.equal(updatedConvoy.status, 'recalled', 'Should be recalled');
  assert.ok(logMessage.includes('cannot deploy'), 'Log should say cannot deploy');
  assert.ok(!logMessage.includes('RECALLED'), 'Should NOT use RECALLED label for pending');
});

test('Convoy reroutes when its planned edge becomes blocked', () => {
  
  
  const convoy: Convoy = {
    ...fixture.convoys[2],  
    status: 'enroute',
    currentRoute: ['edge_dn_jnorth', 'edge_jnf_vriver', 'edge_vriver_jeast', 'edge_jeast_svalley'],
    currentEdgeId: 'edge_dn_jnorth',
  };

  const modEdges = cloneEdges({ edge_jeast_svalley: { status: 'blocked' } });

  const { updatedConvoy, logMessage } = evaluateConvoy(
    convoy, nodes, modEdges, depotIds,
  );

  assert.equal(updatedConvoy.status, 'rerouted', 'Should be rerouted');
  assert.ok(
    !updatedConvoy.currentRoute.includes('edge_jeast_svalley'),
    'New route should not include the blocked edge',
  );
  assert.ok(logMessage.includes('rerouted'), 'Log should mention reroute');
  assert.ok(logMessage.includes('ETA'), 'Log should mention ETA');
});

test('Enroute convoy recalled when destination fully unreachable, targets nearest depot', () => {
  
  
  const modEdges = cloneEdges({
    edge_vtea_seast: { status: 'blocked' },
    edge_jvalleylink_seast: { status: 'blocked' },
  });

  const convoy: Convoy = {
    id: 'test_recall',
    cargoType: 'insulin',
    originNodeId: 'depot_north',
    destNodeId: 'shelter_east_hospital',
    departTimestampOffsetSec: 0,
    status: 'enroute',
    currentRoute: ['edge_dn_jdam', 'edge_jdam_vtea', 'edge_vtea_seast'],
    currentEdgeId: 'edge_dn_jdam',
    positionProgress: 0.5,
  };

  const { updatedConvoy, logMessage } = evaluateConvoy(
    convoy, nodes, modEdges, depotIds,
  );

  assert.equal(updatedConvoy.status, 'recalled', 'Should be recalled');
  assert.ok(logMessage.includes('RECALLED'), 'Log should mention RECALLED');
  assert.ok(
    logMessage.includes('returning to depot') || logMessage.includes('stranded'),
    'Log should mention depot return or stranded status',
  );

  
  if (updatedConvoy.currentRoute.length > 0) {
    assert.ok(
      logMessage.includes('ETA'),
      'Should include ETA if a depot is reachable',
    );
  }
});

test('Enroute convoy stranded when no depot is reachable either', () => {
  
  
  const convoy: Convoy = {
    id: 'test_stranded',
    cargoType: 'blood',
    originNodeId: 'village_highland_reach',
    destNodeId: 'shelter_valley_school',
    departTimestampOffsetSec: 0,
    status: 'enroute',
    currentRoute: ['fake_edge'],
    currentEdgeId: null,
    positionProgress: 0,
  };

  const { updatedConvoy, logMessage } = evaluateConvoy(
    convoy, nodes, edges, depotIds,
  );

  assert.equal(updatedConvoy.status, 'recalled', 'Should be recalled');
  assert.deepEqual(updatedConvoy.currentRoute, [], 'Route should be empty');
  assert.ok(logMessage.includes('stranded'), 'Log should mention stranded');
});

test('Recalled convoy with destination still unreachable stays recalled and does not re-log', () => {
  
  
  const recalledConvoy: Convoy = {
    id: 'test_recalled_stranded',
    cargoType: 'blood',
    originNodeId: 'village_highland_reach',
    destNodeId: 'shelter_valley_school',
    departTimestampOffsetSec: 0,
    status: 'recalled',
    currentRoute: [],
    currentEdgeId: null,
    positionProgress: 0,
  };

  const first = evaluateConvoy(recalledConvoy, nodes, edges, depotIds);
  assert.equal(first.updatedConvoy.status, 'recalled', 'Should remain recalled');
  assert.equal(first.logMessage, '', 'Should not emit a log while still stranded');

  const second = evaluateConvoy(first.updatedConvoy, nodes, edges, depotIds);
  assert.equal(second.updatedConvoy.status, 'recalled', 'Should still be recalled on second call');
  assert.equal(second.logMessage, '', 'Should not re-emit a log on the second call either');
});

test('Recalled convoy resumes to destination when blocking edge reverts to clear', () => {
  const recalledConvoy: Convoy = {
    id: 'test_recalled_resume',
    cargoType: 'insulin',
    originNodeId: 'depot_north',
    destNodeId: 'shelter_east_hospital',
    departTimestampOffsetSec: 0,
    status: 'recalled',
    currentRoute: [],
    currentEdgeId: null,
    positionProgress: 0,
  };

  
  
  const { updatedConvoy, logMessage } = evaluateConvoy(
    recalledConvoy, nodes, edges, depotIds,
  );

  assert.equal(updatedConvoy.status, 'enroute', 'Should resume as enroute, not rerouted');
  assert.ok(updatedConvoy.currentRoute.length > 0, 'Should have a computed route');
  assert.ok(logMessage.includes('redeployed'), 'Log should say redeployed');
  assert.ok(logMessage.includes('ETA'), 'Log should include ETA');
  assert.ok(!logMessage.includes('rerouted'), 'Log should NOT say rerouted for a resume');
});


console.log('\n--- evaluateFleet ---');


test('evaluateFleet processes all convoys and filters empty logs', () => {
  const testConvoys: Convoy[] = [
    {
      id: 'fleet_a',
      cargoType: 'water',
      originNodeId: 'depot_north',
      destNodeId: 'shelter_valley_school',
      departTimestampOffsetSec: 0,
      status: 'pending',
      currentRoute: [],
      currentEdgeId: null,
      positionProgress: 0,
    },
    {
      id: 'fleet_b',
      cargoType: 'food',
      originNodeId: 'depot_south',
      destNodeId: 'shelter_delta_stadium',
      departTimestampOffsetSec: 0,
      status: 'arrived',
      currentRoute: [],
      currentEdgeId: null,
      positionProgress: 1,
    },
  ];

  const { updatedConvoys, log } = evaluateFleet(testConvoys, nodes, edges);

  assert.equal(updatedConvoys.length, 2, 'Should return all convoys');
  assert.equal(updatedConvoys[1].status, 'arrived', 'Arrived convoy unchanged');
  assert.ok(
    !log.some((l) => l.includes('fleet_b')),
    'Arrived convoy should not appear in log',
  );
  
  assert.ok(updatedConvoys[0].currentRoute.length > 0, 'Active convoy should get a route');
});





console.log(`\n=== Results: ${passed} passed, ${failed} failed ===\n`);

if (failed > 0) {
  process.exit(1);
} else {
  process.exit(0);
}
