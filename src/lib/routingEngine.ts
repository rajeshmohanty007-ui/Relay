import type { Node, Edge, Convoy, ConvoyStatus } from './types';

// ─── Adjacency Types ────────────────────────────────────────────────────────

export interface AdjacencyEdge {
  edgeId: string;
  toNodeId: string;
  weight: number; // minutes
}

/** nodeId → list of outgoing adjacency edges (filtered, weighted) */
export type AdjacencyList = Map<string, AdjacencyEdge[]>;

export interface PathResult {
  path: string[];          // edge IDs along the route
  nodeSequence: string[];  // node IDs in traversal order
  totalTimeMin: number;
}

export interface DepotResult extends PathResult {
  depotId: string;
}

export interface ConvoyEvaluation {
  updatedConvoy: Convoy;
  logMessage: string;
}

export interface FleetEvaluation {
  updatedConvoys: Convoy[];
  log: string[];
}

// ─── buildAdjacency ─────────────────────────────────────────────────────────

/**
 * Builds an adjacency list from nodes and edges.
 *
 * Rules:
 *  - Exclude edges with status === 'blocked'
 *  - Exclude edges with heavyVehicleSafe === false
 *  - Weight = baseTravelTimeMin for 'clear', baseTravelTimeMin * 2 for 'degraded'
 *  - Bidirectional edges produce entries in both directions
 */
export function buildAdjacency(nodes: Node[], edges: Edge[]): AdjacencyList {
  const adj: AdjacencyList = new Map();

  // Pre-populate every node with an empty neighbor list so isolated nodes
  // still exist as keys — important for Dijkstra start/end validation.
  for (const node of nodes) {
    adj.set(node.id, []);
  }

  for (const edge of edges) {
    if (edge.status === 'blocked') continue;
    if (!edge.heavyVehicleSafe) continue;

    const weight =
      edge.status === 'degraded'
        ? edge.baseTravelTimeMin * 2
        : edge.baseTravelTimeMin;

    // Forward direction
    adj.get(edge.fromNodeId)?.push({
      edgeId: edge.id,
      toNodeId: edge.toNodeId,
      weight,
    });

    // Reverse direction (if bidirectional)
    if (edge.bidirectional) {
      adj.get(edge.toNodeId)?.push({
        edgeId: edge.id,
        toNodeId: edge.fromNodeId,
        weight,
      });
    }
  }

  return adj;
}

// ─── buildCitizenAdjacency ──────────────────────────────────────────────────

/**
 * Builds an adjacency list for ordinary travelers (car/bike/on foot), as
 * opposed to `buildAdjacency` which is convoy-specific.
 *
 * Differs from `buildAdjacency` in one way: it does NOT exclude edges with
 * heavyVehicleSafe === false — a road unsafe for a loaded relief truck may
 * still be perfectly fine for a private car or two-wheeler. Blocked edges
 * are still excluded, and the same clear/degraded weighting applies.
 */
export function buildCitizenAdjacency(nodes: Node[], edges: Edge[]): AdjacencyList {
  const adj: AdjacencyList = new Map();

  for (const node of nodes) {
    adj.set(node.id, []);
  }

  for (const edge of edges) {
    if (edge.status === 'blocked') continue;

    const weight =
      edge.status === 'degraded'
        ? edge.baseTravelTimeMin * 2
        : edge.baseTravelTimeMin;

    adj.get(edge.fromNodeId)?.push({
      edgeId: edge.id,
      toNodeId: edge.toNodeId,
      weight,
    });

    if (edge.bidirectional) {
      adj.get(edge.toNodeId)?.push({
        edgeId: edge.id,
        toNodeId: edge.fromNodeId,
        weight,
      });
    }
  }

  return adj;
}

// ─── shortestPath (Dijkstra) ────────────────────────────────────────────────

/**
 * Dijkstra's algorithm returning the shortest path as edge IDs, node sequence,
 * and total travel time in minutes.  Returns null when no path exists.
 */
export function shortestPath(
  adjacency: AdjacencyList,
  fromNodeId: string,
  toNodeId: string,
): PathResult | null {
  if (fromNodeId === toNodeId) {
    return { path: [], nodeSequence: [fromNodeId], totalTimeMin: 0 };
  }

  // dist[nodeId] = best-known cost from source
  const dist = new Map<string, number>();
  // prev[nodeId] = { via edge, from node }
  const prev = new Map<string, { edgeId: string; fromNodeId: string }>();
  const visited = new Set<string>();

  // Simple priority queue backed by an array (adequate for ≤ hundreds of nodes)
  const pq: Array<{ nodeId: string; cost: number }> = [];

  dist.set(fromNodeId, 0);
  pq.push({ nodeId: fromNodeId, cost: 0 });

  while (pq.length > 0) {
    // Extract min
    let minIdx = 0;
    for (let i = 1; i < pq.length; i++) {
      if (pq[i].cost < pq[minIdx].cost) minIdx = i;
    }
    const { nodeId: current, cost: currentCost } = pq.splice(minIdx, 1)[0];

    if (visited.has(current)) continue;
    visited.add(current);

    if (current === toNodeId) break; // found shortest path

    const neighbors = adjacency.get(current);
    if (!neighbors) continue;

    for (const neighbor of neighbors) {
      if (visited.has(neighbor.toNodeId)) continue;

      const newCost = currentCost + neighbor.weight;
      const prevCost = dist.get(neighbor.toNodeId);

      if (prevCost === undefined || newCost < prevCost) {
        dist.set(neighbor.toNodeId, newCost);
        prev.set(neighbor.toNodeId, {
          edgeId: neighbor.edgeId,
          fromNodeId: current,
        });
        pq.push({ nodeId: neighbor.toNodeId, cost: newCost });
      }
    }
  }

  // Reconstruct path
  if (!prev.has(toNodeId) && fromNodeId !== toNodeId) {
    return null; // unreachable
  }

  const edgePath: string[] = [];
  const nodeSeq: string[] = [];
  let cursor = toNodeId;

  while (cursor !== fromNodeId) {
    const step = prev.get(cursor);
    if (!step) return null; // safety
    edgePath.push(step.edgeId);
    nodeSeq.push(cursor);
    cursor = step.fromNodeId;
  }
  nodeSeq.push(fromNodeId);

  edgePath.reverse();
  nodeSeq.reverse();

  return {
    path: edgePath,
    nodeSequence: nodeSeq,
    totalTimeMin: dist.get(toNodeId) ?? 0,
  };
}

// ─── nearestReachableDepot ──────────────────────────────────────────────────

/**
 * Returns the shortest path from `fromNodeId` to the nearest reachable depot,
 * or null if no depot is reachable.
 */
export function nearestReachableDepot(
  adjacency: AdjacencyList,
  fromNodeId: string,
  depotNodeIds: string[],
): DepotResult | null {
  let best: DepotResult | null = null;

  for (const depotId of depotNodeIds) {
    const result = shortestPath(adjacency, fromNodeId, depotId);
    if (result && (best === null || result.totalTimeMin < best.totalTimeMin)) {
      best = { ...result, depotId };
    }
  }

  return best;
}

// ─── evaluateConvoy ─────────────────────────────────────────────────────────

/**
 * Evaluates a single convoy against the current graph state and returns the
 * (potentially updated) convoy plus a human-readable log message.
 */
export function evaluateConvoy(
  convoy: Convoy,
  nodes: Node[],
  edges: Edge[],
  depotNodeIds: string[],
): ConvoyEvaluation {
  // Rule 1: arrived convoys are untouched
  if (convoy.status === 'arrived') {
    return { updatedConvoy: { ...convoy }, logMessage: '' };
  }

  // Rule 2: determine effective current position
  let effectivePosition: string;
  if (convoy.status === 'pending') {
    effectivePosition = convoy.originNodeId;
  } else {
    // 'enroute' or 'rerouted' — finish the current edge first
    if (convoy.currentEdgeId) {
      const currentEdge = edges.find((e) => e.id === convoy.currentEdgeId);
      if (currentEdge) {
        // The TO-node depends on direction of travel. We need to figure out
        // which direction the convoy is travelling on this edge.  We look at
        // the convoy's currentRoute (edge IDs) and nodeSequence to decide,
        // but we only have edge IDs in currentRoute at this point.  The safest
        // approach: determine which endpoint we're heading towards based on
        // the previous node in the route or the convoy's origin.
        //
        // Simple heuristic: if the convoy was at fromNodeId, it's heading to
        // toNodeId; if at toNodeId, it's heading to fromNodeId (bidirectional).
        // Since we don't track direction explicitly, use the convoy's
        // originNodeId and destination to infer via the currentRoute.
        //
        // For correctness, just pick toNodeId of the edge by default (the
        // spec says "the TO-node of convoy.currentEdgeId").
        effectivePosition = currentEdge.toNodeId;
      } else {
        effectivePosition = convoy.originNodeId;
      }
    } else {
      effectivePosition = convoy.originNodeId;
    }
  }

  // Rule 3: build adjacency from current graph state
  const adjacency = buildAdjacency(nodes, edges);

  // Rule 4: attempt path to destination
  const pathToDest = shortestPath(adjacency, effectivePosition, convoy.destNodeId);

  // ── Branch A: convoy is 'pending' — initial deployment ──
  if (convoy.status === 'pending') {
    if (pathToDest) {
      return {
        updatedConvoy: {
          ...convoy,
          status: 'enroute',
          currentRoute: pathToDest.path,
          currentEdgeId: pathToDest.path[0] ?? null,
          positionProgress: 0,
        },
        logMessage: `Convoy ${convoy.id} deployed, ETA ${pathToDest.totalTimeMin} min`,
      };
    }

    // No path at deployment time
    return {
      updatedConvoy: {
        ...convoy,
        status: 'recalled',
        currentRoute: [],
        currentEdgeId: null,
        positionProgress: 0,
      },
      logMessage: `Convoy ${convoy.id} cannot deploy \u2014 no safe path at start`,
    };
  }

  // ── Branch B: convoy is 'recalled' — check whether it can resume ──
  if (convoy.status === 'recalled') {
    if (pathToDest) {
      return {
        updatedConvoy: {
          ...convoy,
          status: 'enroute',
          currentRoute: pathToDest.path,
          currentEdgeId: pathToDest.path[0] ?? null,
          positionProgress: 0,
        },
        logMessage: `Convoy ${convoy.id} redeployed — road cleared, resuming to destination, ETA ${pathToDest.totalTimeMin} min`,
      };
    }

    // Still stranded — remain recalled, no repeated log spam
    return {
      updatedConvoy: { ...convoy },
      logMessage: '',
    };
  }

  // ── Branch C: convoy is 'enroute' or 'rerouted' — reroute check ──
  if (pathToDest) {
    // Check whether the new path differs from the planned remaining route
    const routesDiffer = !arraysEqual(pathToDest.path, convoy.currentRoute);

    if (routesDiffer) {
      return {
        updatedConvoy: {
          ...convoy,
          status: 'rerouted',
          currentRoute: pathToDest.path,
          currentEdgeId: pathToDest.path[0] ?? null,
          positionProgress: 0,
        },
        logMessage: `Convoy ${convoy.id} rerouted, new ETA ${pathToDest.totalTimeMin} min`,
      };
    }

    // Path matches current plan — no change needed
    return {
      updatedConvoy: { ...convoy },
      logMessage: '',
    };
  }

  // Rule 5: no path to destination — attempt recall to nearest depot
  const depotResult = nearestReachableDepot(
    adjacency,
    effectivePosition,
    depotNodeIds,
  );

  if (depotResult) {
    return {
      updatedConvoy: {
        ...convoy,
        status: 'recalled',
        currentRoute: depotResult.path,
        currentEdgeId: depotResult.path[0] ?? null,
        positionProgress: 0,
      },
      logMessage:
        `Convoy ${convoy.id} RECALLED \u2014 no safe path to destination, returning to depot (ETA ${depotResult.totalTimeMin} min)`,
    };
  }

  // Stranded — no depot reachable either
  return {
    updatedConvoy: {
      ...convoy,
      status: 'recalled',
      currentRoute: [],
      currentEdgeId: null,
      positionProgress: 0,
    },
    logMessage:
      `Convoy ${convoy.id} RECALLED \u2014 stranded, no reachable depot`,
  };
}

// ─── evaluateFleet ──────────────────────────────────────────────────────────

/**
 * Evaluates every convoy against the current graph state.
 * Returns updated convoys and a filtered log (empty messages omitted).
 */
export function evaluateFleet(
  convoys: Convoy[],
  nodes: Node[],
  edges: Edge[],
): FleetEvaluation {
  const depotNodeIds = nodes
    .filter((n) => n.type === 'depot')
    .map((n) => n.id);

  const updatedConvoys: Convoy[] = [];
  const log: string[] = [];

  for (const convoy of convoys) {
    const { updatedConvoy, logMessage } = evaluateConvoy(
      convoy,
      nodes,
      edges,
      depotNodeIds,
    );
    updatedConvoys.push(updatedConvoy);
    if (logMessage) {
      log.push(logMessage);
    }
  }

  return { updatedConvoys, log };
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function arraysEqual(a: string[], b: string[]): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) return false;
  }
  return true;
}
