import type { Node, Edge, Convoy, ConvoyStatus } from './types';



export interface AdjacencyEdge {
  edgeId: string;
  toNodeId: string;
  weight: number;
}


export type AdjacencyList = Map<string, AdjacencyEdge[]>;

export interface PathResult {
  path: string[];
  nodeSequence: string[];
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












export function buildAdjacency(nodes: Node[], edges: Edge[]): AdjacencyList {
  const adj: AdjacencyList = new Map();



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







// ---------------------------------------------------------------------------
// Pathfinding internals
//
// A binary min-heap is implemented inline (rather than pulled in as a
// dependency) to keep the project dependency-light, matching its existing
// style. push/pop are both O(log n); peeking the minimum is O(1).
// ---------------------------------------------------------------------------

/**
 * Binary min-heap keyed on a numeric priority.
 *
 * Complexity: push O(log n), pop O(log n), size O(1).
 *
 * Duplicate entries for the same node are allowed (lazy deletion); stale
 * entries are discarded on pop via the caller's `visited` set, which is the
 * standard "no decrease-key" Dijkstra/A* formulation.
 *
 * Ties on `key` are broken by insertion order (FIFO). That is deliberate: it
 * makes the heap reproduce the exact pop order of the old linear-scan array
 * queue, which also picked the earliest-inserted entry among equal costs. With
 * no heuristic (h = 0) this makes the new code byte-identical to the previous
 * Dijkstra — same paths, not merely same costs.
 */
class MinHeap<T> {
  private items: Array<{ key: number; seq: number; value: T }> = [];
  private counter = 0;

  get size(): number {
    return this.items.length;
  }

  /** True when `a` should sit above `b`: lower key, then earlier insertion. */
  private before(a: { key: number; seq: number }, b: { key: number; seq: number }): boolean {
    return a.key < b.key || (a.key === b.key && a.seq < b.seq);
  }

  push(key: number, value: T): void {
    const items = this.items;
    items.push({ key, seq: this.counter++, value });

    // Sift up.
    let i = items.length - 1;
    while (i > 0) {
      const parent = (i - 1) >> 1;
      if (!this.before(items[i], items[parent])) break;
      const tmp = items[parent];
      items[parent] = items[i];
      items[i] = tmp;
      i = parent;
    }
  }

  pop(): { key: number; value: T } | undefined {
    const items = this.items;
    if (items.length === 0) return undefined;

    const top = items[0];
    const last = items.pop()!;

    if (items.length > 0) {
      items[0] = last;

      // Sift down.
      let i = 0;
      const n = items.length;
      for (; ;) {
        const left = 2 * i + 1;
        const right = left + 1;
        let smallest = i;

        if (left < n && this.before(items[left], items[smallest])) smallest = left;
        if (right < n && this.before(items[right], items[smallest])) smallest = right;
        if (smallest === i) break;

        const tmp = items[smallest];
        items[smallest] = items[i];
        items[i] = tmp;
        i = smallest;
      }
    }

    return { key: top.key, value: top.value };
  }
}

/**
 * Assumed maximum vehicle speed, used to convert the straight-line (haversine)
 * distance heuristic from kilometres into minutes so it is comparable with the
 * `weight` units on AdjacencyEdge (which are minutes).
 *
 * ADMISSIBILITY CONTRACT: this must be greater than or equal to the fastest
 * implied straight-line speed of any edge in the graph
 * (haversine_km(from, to) / (baseTravelTimeMin / 60)). If it is, then for every
 * edge h(u) - h(v) <= dist(u, v) / SPEED <= weight(u, v), so the heuristic is
 * both admissible AND consistent (monotone) — which is what lets A* keep a
 * closed set without ever needing to re-open a settled node, and guarantees it
 * returns exactly the same optimal cost Dijkstra would.
 *
 * The fixture graph's fastest edge implies ~47 km/h, so 80 km/h leaves ample
 * headroom. Degraded edges only ever double their weight and blocked edges are
 * removed entirely, so neither can break the bound.
 */
const HEURISTIC_MAX_SPEED_KMPH = 80;

const EARTH_RADIUS_KM = 6371;

/** Great-circle distance between two lat/lng points, in kilometres. */
function haversineKm(
  aLat: number,
  aLng: number,
  bLat: number,
  bLng: number,
): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;

  const dLat = toRad(bLat - aLat);
  const dLng = toRad(bLng - aLng);

  const sinLat = Math.sin(dLat / 2);
  const sinLng = Math.sin(dLng / 2);

  const h =
    sinLat * sinLat +
    Math.cos(toRad(aLat)) * Math.cos(toRad(bLat)) * sinLng * sinLng;

  return 2 * EARTH_RADIUS_KM * Math.asin(Math.min(1, Math.sqrt(h)));
}

/**
 * Optional geometry supplied by a caller so the search can run as A* rather
 * than plain Dijkstra. Accepts either the raw `Node[]` the rest of the engine
 * already passes around, or a pre-built id -> Node map.
 */
export type NodeGeometry = Node[] | Map<string, Node>;

function toNodeIndex(nodes: NodeGeometry | undefined): Map<string, Node> | null {
  if (!nodes) return null;
  if (nodes instanceof Map) return nodes;
  const index = new Map<string, Node>();
  for (const node of nodes) index.set(node.id, node);
  return index;
}

function hasCoords(node: Node | undefined): node is Node {
  return (
    !!node &&
    typeof node.lat === 'number' &&
    typeof node.lng === 'number' &&
    Number.isFinite(node.lat) &&
    Number.isFinite(node.lng)
  );
}

/**
 * Builds the A* heuristic h(n) = min straight-line time (in minutes) from `n`
 * to the nearest goal in `goalIds`.
 *
 * Returns `null` — meaning "run as plain Dijkstra" — whenever the heuristic
 * cannot be trusted: no geometry supplied, a goal without coordinates, or ANY
 * node in the graph missing coordinates. Falling back wholesale (rather than
 * zeroing the heuristic for just the offending nodes) matters: a partially
 * zeroed heuristic is no longer consistent, and an inconsistent heuristic
 * combined with a closed set can return a sub-optimal path. Degrading to
 * Dijkstra is always correct, just slower.
 */
function buildHeuristic(
  adjacency: AdjacencyList,
  nodeIndex: Map<string, Node> | null,
  goalIds: string[],
): ((nodeId: string) => number) | null {
  if (!nodeIndex || goalIds.length === 0) return null;

  const goals: Array<{ lat: number; lng: number }> = [];
  for (const goalId of goalIds) {
    const goal = nodeIndex.get(goalId);
    if (!hasCoords(goal)) return null;
    goals.push({ lat: goal.lat, lng: goal.lng });
  }

  // Every node the search could touch must have coordinates, or the heuristic
  // stops being consistent. Cheap O(V) validation up front.
  for (const nodeId of adjacency.keys()) {
    if (!hasCoords(nodeIndex.get(nodeId))) return null;
  }

  const cache = new Map<string, number>();

  return (nodeId: string): number => {
    const cached = cache.get(nodeId);
    if (cached !== undefined) return cached;

    const node = nodeIndex.get(nodeId);
    if (!hasCoords(node)) {
      cache.set(nodeId, 0);
      return 0;
    }

    let bestKm = Infinity;
    for (const goal of goals) {
      const km = haversineKm(node.lat, node.lng, goal.lat, goal.lng);
      if (km < bestKm) bestKm = km;
    }

    // km -> minutes at the assumed max speed.
    const minutes = (bestKm / HEURISTIC_MAX_SPEED_KMPH) * 60;
    cache.set(nodeId, minutes);
    return minutes;
  };
}

/** Internal shape shared by the single-goal and multi-goal searches. */
interface SearchOutcome {
  goalId: string;
  dist: Map<string, number>;
  prev: Map<string, { edgeId: string; fromNodeId: string }>;
}

/**
 * Core heap-based A* / Dijkstra. Runs one search from `fromNodeId` and stops
 * the moment the first member of `goalIds` is settled (popped off the heap),
 * which with an admissible+consistent heuristic is provably the cheapest goal.
 *
 * Passing a single goal gives A*-to-a-point; passing every depot gives the
 * multi-source-equivalent "nearest depot" search in ONE pass.
 *
 * Complexity: O((V + E) log V).
 */
function search(
  adjacency: AdjacencyList,
  fromNodeId: string,
  goalIds: string[],
  heuristic: ((nodeId: string) => number) | null,
): SearchOutcome | null {
  const goalSet = new Set(goalIds);
  if (goalSet.size === 0) return null;

  const h = heuristic ?? (() => 0);

  const dist = new Map<string, number>();
  const prev = new Map<string, { edgeId: string; fromNodeId: string }>();
  const visited = new Set<string>();

  const heap = new MinHeap<string>();

  dist.set(fromNodeId, 0);
  heap.push(h(fromNodeId), fromNodeId);

  // Best goal cost found so far, plus every goal tied at exactly that cost.
  let bestCost: number | null = null;
  const tiedGoals: string[] = [];

  while (heap.size > 0) {
    const popped = heap.pop()!;

    // Nodes come off in non-decreasing f order, so once a goal is settled at
    // cost C nothing with f > C can beat or tie it. Stop there.
    if (bestCost !== null && popped.key > bestCost) break;

    const current = popped.value;

    // Lazy deletion: skip stale duplicate heap entries.
    if (visited.has(current)) continue;
    visited.add(current);

    const currentCost = dist.get(current)!;

    if (goalSet.has(current)) {
      if (bestCost === null) bestCost = currentCost;
      if (currentCost === bestCost) tiedGoals.push(current);
      // A goal is never expanded through — routes past it are irrelevant.
      continue;
    }

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
        // f = g + h
        heap.push(newCost + h(neighbor.toNodeId), neighbor.toNodeId);
      }
    }
  }

  if (bestCost === null || tiedGoals.length === 0) return null;

  // Break exact-cost ties by position in `goalIds`. The previous per-depot loop
  // used a strict `<` comparison, so the earliest depot in the caller's array
  // won a tie; preserving that keeps `depotId` byte-identical to before.
  let goalId = tiedGoals[0];
  let bestIndex = goalIds.indexOf(goalId);
  for (const candidate of tiedGoals) {
    const index = goalIds.indexOf(candidate);
    if (index < bestIndex) {
      bestIndex = index;
      goalId = candidate;
    }
  }

  return { goalId, dist, prev };
}

/** Walks the `prev` chain back from `goalId` to `fromNodeId`. */
function reconstruct(
  outcome: SearchOutcome,
  fromNodeId: string,
): PathResult | null {
  const { goalId, dist, prev } = outcome;

  const edgePath: string[] = [];
  const nodeSeq: string[] = [];
  let cursor = goalId;

  while (cursor !== fromNodeId) {
    const step = prev.get(cursor);
    if (!step) return null;
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
    totalTimeMin: dist.get(goalId) ?? 0,
  };
}

/**
 * Shortest (fastest) route between two nodes.
 *
 * COMPLEXITY: O((V + E) log V) — binary-min-heap A*. Previously this used a
 * linear scan over an array "priority queue", which made it O(V^2).
 *
 * ALGORITHM: A* with a haversine straight-line-distance heuristic converted to
 * minutes at HEURISTIC_MAX_SPEED_KMPH. The heuristic is admissible and
 * consistent, so the returned path and totalTimeMin are identical to what plain
 * Dijkstra returns — A* just settles fewer nodes getting there.
 *
 * FALLBACK: if `nodes` is omitted, or any relevant node is missing usable
 * lat/lng, the heuristic is dropped (h = 0) and this degrades gracefully to
 * ordinary heap-based Dijkstra rather than throwing.
 *
 * @param nodes Optional geometry (Node[] or id->Node Map) enabling A*. Callers
 *              that omit it keep the exact previous Dijkstra behaviour.
 */
export function shortestPath(
  adjacency: AdjacencyList,
  fromNodeId: string,
  toNodeId: string,
  nodes?: NodeGeometry,
): PathResult | null {
  if (fromNodeId === toNodeId) {
    return { path: [], nodeSequence: [fromNodeId], totalTimeMin: 0 };
  }

  const heuristic = buildHeuristic(adjacency, toNodeIndex(nodes), [toNodeId]);

  const outcome = search(adjacency, fromNodeId, [toNodeId], heuristic);
  if (!outcome) return null;

  return reconstruct(outcome, fromNodeId);
}

/**
 * Nearest reachable depot from a given node.
 *
 * COMPLEXITY: O((V + E) log V) for the whole call — ONE search total, not one
 * per depot. Previously this ran a full separate Dijkstra per depot, i.e.
 * O(D * V^2) with the old array queue.
 *
 * ALGORITHM: single search outward from `fromNodeId` with every depot id in the
 * goal set, terminating the instant the first depot is settled. Because edges
 * are relaxed in non-decreasing f-order and the heuristic is
 * min-over-depots (itself admissible and consistent, being the pointwise
 * minimum of admissible/consistent heuristics), the first depot popped is
 * provably the cheapest — equivalent to a multi-source pass, one pass total.
 *
 * Returns the same DepotResult | null shape as before: `path`, `nodeSequence`,
 * `totalTimeMin` and `depotId`, or null when no depot is reachable.
 *
 * @param nodes Optional geometry (Node[] or id->Node Map) enabling A*.
 */
export function nearestReachableDepot(
  adjacency: AdjacencyList,
  fromNodeId: string,
  depotNodeIds: string[],
  nodes?: NodeGeometry,
): DepotResult | null {
  if (depotNodeIds.length === 0) return null;

  // Preserve the old behaviour for "already standing on a depot": the loop
  // used to hit shortestPath(from, from) and get a zero-cost self-result.
  if (depotNodeIds.includes(fromNodeId)) {
    return {
      path: [],
      nodeSequence: [fromNodeId],
      totalTimeMin: 0,
      depotId: fromNodeId,
    };
  }

  const heuristic = buildHeuristic(
    adjacency,
    toNodeIndex(nodes),
    depotNodeIds,
  );

  const outcome = search(adjacency, fromNodeId, depotNodeIds, heuristic);
  if (!outcome) return null;

  const result = reconstruct(outcome, fromNodeId);
  if (!result) return null;

  return { ...result, depotId: outcome.goalId };
}


export function evaluateConvoy(
  convoy: Convoy,
  nodes: Node[],
  edges: Edge[],
  depotNodeIds: string[],
): ConvoyEvaluation {

  if (convoy.status === 'arrived') {
    return { updatedConvoy: { ...convoy }, logMessage: '' };
  }


  let effectivePosition: string;
  if (convoy.status === 'pending') {
    effectivePosition = convoy.originNodeId;
  } else {

    if (convoy.currentEdgeId) {
      const currentEdge = edges.find((e) => e.id === convoy.currentEdgeId);
      if (currentEdge) {














        effectivePosition = currentEdge.toNodeId;
      } else {
        effectivePosition = convoy.originNodeId;
      }
    } else {
      effectivePosition = convoy.originNodeId;
    }
  }


  const adjacency = buildAdjacency(nodes, edges);


  const pathToDest = shortestPath(adjacency, effectivePosition, convoy.destNodeId);


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


    return {
      updatedConvoy: { ...convoy },
      logMessage: '',
    };
  }


  if (pathToDest) {

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


    return {
      updatedConvoy: { ...convoy },
      logMessage: '',
    };
  }


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



function arraysEqual(a: string[], b: string[]): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) return false;
  }
  return true;
}
