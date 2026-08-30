'use client';

import { useMemo } from 'react';
import type { Node, Edge, Convoy } from '../lib/types';
import { projectNodes, type ProjectedNode } from '../lib/projection';

export interface MapViewProps {
  nodes: Node[];
  edges: Edge[];
  convoys: Convoy[];
}

const VIEW_WIDTH = 900;
const VIEW_HEIGHT = 640;

const NODE_TYPE_STYLE: Record<Node['type'], { fill: string; shape: 'circle' | 'square' | 'diamond'; radius: number }> = {
  depot: { fill: '#1e293b', shape: 'square', radius: 9 },
  shelter: { fill: '#e11d48', shape: 'diamond', radius: 9 },
  village: { fill: '#10b981', shape: 'circle', radius: 6 },
  junction: { fill: '#9ca3af', shape: 'circle', radius: 4 },
};

const EDGE_STATUS_STYLE: Record<Edge['status'], { stroke: string; dashArray?: string }> = {
  clear: { stroke: '#9ca3af' },
  degraded: { stroke: '#f59e0b', dashArray: '6 4' },
  blocked: { stroke: '#ef4444' },
};

const CONVOY_STATUS_COLOR: Partial<Record<Convoy['status'], string>> = {
  enroute: '#3b82f6',
  rerouted: '#3b82f6',
  recalled: '#ef4444',
};

export default function MapView({ nodes, edges, convoys }: MapViewProps) {
  const projected = useMemo(() => projectNodes(nodes, VIEW_WIDTH, VIEW_HEIGHT), [nodes]);

  const positionsById = useMemo(() => {
    const map = new Map<string, ProjectedNode>();
    for (const p of projected) map.set(p.id, p);
    return map;
  }, [projected]);

  const edgesById = useMemo(() => {
    const map = new Map<string, Edge>();
    for (const e of edges) map.set(e.id, e);
    return map;
  }, [edges]);

  return (
    <svg
      viewBox={`0 0 ${VIEW_WIDTH} ${VIEW_HEIGHT}`}
      className="h-full w-full rounded-lg bg-zinc-50 dark:bg-zinc-900"
    >
      <g>
        {edges.map((edge) => {
          const from = positionsById.get(edge.fromNodeId);
          const to = positionsById.get(edge.toNodeId);
          if (!from || !to) return null;
          const style = EDGE_STATUS_STYLE[edge.status];
          return (
            <line
              key={edge.id}
              x1={from.x}
              y1={from.y}
              x2={to.x}
              y2={to.y}
              stroke={style.stroke}
              strokeWidth={2}
              strokeDasharray={style.dashArray}
            />
          );
        })}
      </g>

      <g>
        {nodes.map((node) => {
          const pos = positionsById.get(node.id);
          if (!pos) return null;
          const style = NODE_TYPE_STYLE[node.type];
          return (
            <g key={node.id}>
              {style.shape === 'circle' && (
                <circle cx={pos.x} cy={pos.y} r={style.radius} fill={style.fill} stroke="#fff" strokeWidth={1} />
              )}
              {style.shape === 'square' && (
                <rect
                  x={pos.x - style.radius}
                  y={pos.y - style.radius}
                  width={style.radius * 2}
                  height={style.radius * 2}
                  fill={style.fill}
                  stroke="#fff"
                  strokeWidth={1}
                />
              )}
              {style.shape === 'diamond' && (
                <rect
                  x={pos.x - style.radius}
                  y={pos.y - style.radius}
                  width={style.radius * 2}
                  height={style.radius * 2}
                  fill={style.fill}
                  stroke="#fff"
                  strokeWidth={1}
                  transform={`rotate(45 ${pos.x} ${pos.y})`}
                />
              )}
              <text
                x={pos.x}
                y={pos.y - style.radius - 4}
                textAnchor="middle"
                fontSize={10}
                fill="currentColor"
              >
                {node.name}
              </text>
            </g>
          );
        })}
      </g>

      <g>
        {convoys
          .filter((convoy) => convoy.status !== 'arrived' && convoy.currentEdgeId)
          .map((convoy) => {
            const edge = edgesById.get(convoy.currentEdgeId as string);
            if (!edge) return null;
            const from = positionsById.get(edge.fromNodeId);
            const to = positionsById.get(edge.toNodeId);
            if (!from || !to) return null;

            const t = Math.min(Math.max(convoy.positionProgress, 0), 1);
            const x = from.x + (to.x - from.x) * t;
            const y = from.y + (to.y - from.y) * t;
            const color = CONVOY_STATUS_COLOR[convoy.status] ?? '#6b7280';

            return (
              <circle key={convoy.id} cx={x} cy={y} r={6} fill={color} stroke="#fff" strokeWidth={1.5}>
                <title>{`${convoy.id} (${convoy.cargoType}) — ${convoy.status}`}</title>
              </circle>
            );
          })}
      </g>
    </svg>
  );
}
