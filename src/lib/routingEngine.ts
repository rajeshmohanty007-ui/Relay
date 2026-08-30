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







export function shortestPath(
  adjacency: AdjacencyList,
  fromNodeId: string,
  toNodeId: string,
): PathResult | null {
  if (fromNodeId === toNodeId) {
    return { path: [], nodeSequence: [fromNodeId], totalTimeMin: 0 };
  }

  
  const dist = new Map<string, number>();
  
  const prev = new Map<string, { edgeId: string; fromNodeId: string }>();
  const visited = new Set<string>();

  
  const pq: Array<{ nodeId: string; cost: number }> = [];

  dist.set(fromNodeId, 0);
  pq.push({ nodeId: fromNodeId, cost: 0 });

  while (pq.length > 0) {
    
    let minIdx = 0;
    for (let i = 1; i < pq.length; i++) {
      if (pq[i].cost < pq[minIdx].cost) minIdx = i;
    }
    const { nodeId: current, cost: currentCost } = pq.splice(minIdx, 1)[0];

    if (visited.has(current)) continue;
    visited.add(current);

    if (current === toNodeId) break; 

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

  
  if (!prev.has(toNodeId) && fromNodeId !== toNodeId) {
    return null; 
  }

  const edgePath: string[] = [];
  const nodeSeq: string[] = [];
  let cursor = toNodeId;

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
    totalTimeMin: dist.get(toNodeId) ?? 0,
  };
}







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
