import fs from 'fs';
import path from 'path';
import { GraphFixtureData, Node, Edge } from './types';

export interface ValidationResult {
  isValid: boolean;
  totalNodes: number;
  totalEdges: number;
  depotCount: number;
  shelterCount: number;
  villageCount: number;
  junctionCount: number;
  reachableNodeIds: string[];
  unreachableNodes: Node[];
  errors: string[];
}





export function validateGraphReachability(data: GraphFixtureData): ValidationResult {
  const errors: string[] = [];
  const nodeMap = new Map<string, Node>();
  const depots: Node[] = [];

  let shelterCount = 0;
  let villageCount = 0;
  let junctionCount = 0;

  for (const node of data.nodes) {
    if (nodeMap.has(node.id)) {
      errors.push(`Duplicate node ID detected: "${node.id}"`);
    }
    nodeMap.set(node.id, node);

    if (node.type === 'depot') {
      depots.push(node);
    } else if (node.type === 'shelter') {
      shelterCount++;
    } else if (node.type === 'village') {
      villageCount++;
    } else if (node.type === 'junction') {
      junctionCount++;
    }
  }

  if (depots.length === 0) {
    errors.push('No depot nodes found in the graph. At least one depot is required for reachability validation.');
  }

  
  const adjacencyList = new Map<string, string[]>();
  for (const nodeId of nodeMap.keys()) {
    adjacencyList.set(nodeId, []);
  }

  for (const edge of data.edges) {
    if (!nodeMap.has(edge.fromNodeId)) {
      errors.push(`Edge "${edge.id}" references non-existent fromNodeId: "${edge.fromNodeId}"`);
      continue;
    }
    if (!nodeMap.has(edge.toNodeId)) {
      errors.push(`Edge "${edge.id}" references non-existent toNodeId: "${edge.toNodeId}"`);
      continue;
    }

    
    if (edge.status !== 'blocked') {
      adjacencyList.get(edge.fromNodeId)?.push(edge.toNodeId);
      if (edge.bidirectional) {
        adjacencyList.get(edge.toNodeId)?.push(edge.fromNodeId);
      }
    }
  }

  
  const visited = new Set<string>();
  const queue: string[] = [];

  for (const depot of depots) {
    visited.add(depot.id);
    queue.push(depot.id);
  }

  while (queue.length > 0) {
    const currentId = queue.shift()!;
    const neighbors = adjacencyList.get(currentId) || [];

    for (const neighborId of neighbors) {
      if (!visited.has(neighborId)) {
        visited.add(neighborId);
        queue.push(neighborId);
      }
    }
  }

  const unreachableNodes = data.nodes.filter((node) => !visited.has(node.id));
  const isValid = errors.length === 0 && unreachableNodes.length === 0;

  return {
    isValid,
    totalNodes: data.nodes.length,
    totalEdges: data.edges.length,
    depotCount: depots.length,
    shelterCount,
    villageCount,
    junctionCount,
    reachableNodeIds: Array.from(visited),
    unreachableNodes,
    errors,
  };
}




export function runValidatorCli(): void {
  const fixturePath =
    process.argv[2] ||
    path.resolve(process.cwd(), 'fixtures', 'graph.json');

  console.log(`[Graph Validator] Reading fixture from: ${fixturePath}`);

  if (!fs.existsSync(fixturePath)) {
    console.error(`[Graph Validator] ERROR: Fixture file not found at ${fixturePath}`);
    process.exit(1);
  }

  try {
    const rawContent = fs.readFileSync(fixturePath, 'utf-8');
    const fixtureData: GraphFixtureData = JSON.parse(rawContent);

    console.log(`[Graph Validator] Loaded scenario: "${fixtureData.demoConfig?.scenarioName || 'Unnamed'}"`);
    console.log(`[Graph Validator] Validating graph reachability across ${fixtureData.nodes.length} nodes and ${fixtureData.edges.length} edges...`);

    const result = validateGraphReachability(fixtureData);

    console.log('\n--- Graph Topology Summary ---');
    console.log(`  Total Nodes:       ${result.totalNodes}`);
    console.log(`    - Depots:        ${result.depotCount}`);
    console.log(`    - Shelters:      ${result.shelterCount}`);
    console.log(`    - Villages:      ${result.villageCount}`);
    console.log(`    - Junctions:     ${result.junctionCount}`);
    console.log(`  Total Edges:       ${result.totalEdges}`);
    console.log(`  Reachable Nodes:   ${result.reachableNodeIds.length} / ${result.totalNodes}`);

    if (result.errors.length > 0) {
      console.error('\n[Graph Validator] Validation Errors Detected:');
      for (const err of result.errors) {
        console.error(`  ✖ ${err}`);
      }
    }

    if (result.unreachableNodes.length > 0) {
      console.error(`\n[Graph Validator] FAILURE: Found ${result.unreachableNodes.length} UNREACHABLE node(s) from any depot via non-blocked edges:`);
      console.table(
        result.unreachableNodes.map((n) => ({
          'Node ID': n.id,
          Name: n.name,
          Type: n.type,
          Latitude: n.lat,
          Longitude: n.lng,
        }))
      );
      process.exit(1);
    }

    console.log('\n✔ [Graph Validator] SUCCESS: All nodes are reachable from at least one depot via non-blocked edges.');
    process.exit(0);
  } catch (err) {
    console.error('[Graph Validator] Unexpected error during validation:', err);
    process.exit(1);
  }
}


if (require.main === module || (typeof process !== 'undefined' && process.argv[1]?.includes('validateGraph'))) {
  runValidatorCli();
}
