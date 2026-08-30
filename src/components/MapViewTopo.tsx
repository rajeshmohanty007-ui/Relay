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

// Returns status color for a shelter node based on remaining stock hours
function getShelterStatusColor(node: Node): string {
  if (!node.criticalSupplyNeed) return '#4CAF6D'; // Green
  const hoursLeft = node.criticalSupplyNeed.hoursOfStockRemaining;
  if (hoursLeft <= 3.0) return '#C6423B'; // Red: Critical
  if (hoursLeft <= 5.0) return '#E8A33D'; // Amber: Degraded
  return '#4CAF6D'; // Green: Stable
}

// Tactical style configuration matching NDMA alerts
const EDGE_STYLE: Record<Edge['status'], { stroke: string; strokeWidth: number; dashArray?: string }> = {
  clear: { stroke: '#3A4552', strokeWidth: 1.5 }, // Structural line color, inactive
  degraded: { stroke: '#E8A33D', strokeWidth: 2, dashArray: '4 4' }, // Amber warning dash
  blocked: { stroke: '#C6423B', strokeWidth: 3 }, // Thick Red placard alert
};

const CONVOY_COLOR: Record<Exclude<Convoy['status'], 'pending' | 'arrived'>, string> = {
  enroute: '#4CAF6D',   // Active, operating green
  rerouted: '#E8A33D',  // Rerouted watch amber
  recalled: '#C6423B',  // Recalled/retracting red
};

export default function MapViewTopo({ nodes, edges, convoys }: MapViewProps) {
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

  // Generate grid points for background instrumentation panel theme
  const gridPoints = useMemo(() => {
    const points = [];
    const step = 60;
    for (let x = step; x < VIEW_WIDTH; x += step) {
      for (let y = step; y < VIEW_HEIGHT; y += step) {
        points.push({ x, y });
      }
    }
    return points;
  }, []);

  return (
    <svg
      viewBox={`0 0 ${VIEW_WIDTH} ${VIEW_HEIGHT}`}
      className="h-full w-full bg-[#0B0F14] border border-struct-line select-none"
    >
      {/* 1. Tactical Grid Lines/Dots */}
      <g opacity="0.15">
        {gridPoints.map((p, i) => (
          <path
            key={i}
            d={`M ${p.x - 2} ${p.y} L ${p.x + 2} ${p.y} M ${p.x} ${p.y - 2} L ${p.x} ${p.y + 2}`}
            stroke="#4FB3BF"
            strokeWidth={1}
          />
        ))}
      </g>

      {/* 2. Topographic Contour Line Texture (Under the graph) */}
      <g opacity="0.08" stroke="#3A4552" strokeWidth="0.75" fill="none">
        {/* Ridge Hills North */}
        <path d="M 100,50 C 200,40 300,90 350,150 C 380,200 280,280 180,260 C 100,240 50,150 100,50 Z" />
        <path d="M 120,70 C 200,60 280,100 320,150 C 350,190 260,260 170,240 C 100,220 70,150 120,70 Z" />
        <path d="M 140,90 C 200,80 260,110 290,150 C 320,180 240,240 160,220 C 100,200 90,150 140,90 Z" />

        {/* River Basin Delta (Lower-middle) */}
        <path d="M 0,350 Q 250,300 450,420 T 900,380" />
        <path d="M 0,370 Q 250,320 450,440 T 900,400" />
        <path d="M 0,330 Q 250,280 450,400 T 900,360" />

        {/* Southern Elevations */}
        <path d="M 600,450 C 700,420 850,450 880,520 C 900,580 800,630 680,610 C 600,590 550,500 600,450 Z" />
        <path d="M 620,470 C 700,445 830,470 850,525 C 870,575 780,615 670,595 C 600,575 570,505 620,470 Z" />
        <path d="M 640,490 C 700,470 810,490 830,530 C 840,570 760,600 660,580 C 600,560 590,510 640,490 Z" />
      </g>

      {/* 3. Edges (Roads) */}
      <g>
        {edges.map((edge) => {
          const from = positionsById.get(edge.fromNodeId);
          const to = positionsById.get(edge.toNodeId);
          if (!from || !to) return null;
          const style = EDGE_STYLE[edge.status];
          return (
            <g key={edge.id}>
              {/* Underlying glowing track line for degraded or blocked roads */}
              {edge.status !== 'clear' && (
                <line
                  x1={from.x}
                  y1={from.y}
                  x2={to.x}
                  y2={to.y}
                  stroke={style.stroke}
                  strokeWidth={style.strokeWidth + 4}
                  opacity="0.15"
                />
              )}
              <line
                x1={from.x}
                y1={from.y}
                x2={to.x}
                y2={to.y}
                stroke={style.stroke}
                strokeWidth={style.strokeWidth}
                strokeDasharray={style.dashArray}
              />
            </g>
          );
        })}
      </g>

      {/* 4. Nodes (Depots, Shelters, Villages, Junctions) */}
      <g>
        {nodes.map((node) => {
          const pos = positionsById.get(node.id);
          if (!pos) return null;

          let nodeElement = null;
          let labelColor = 'text-zinc-400';

          if (node.type === 'depot') {
            // Signal Accent Solid Square
            labelColor = 'text-signal-accent';
            nodeElement = (
              <rect
                x={pos.x - 7}
                y={pos.y - 7}
                width={14}
                height={14}
                fill="none"
                stroke="#4FB3BF"
                strokeWidth={2}
                className="filter drop-shadow-[0_0_3px_rgba(79,179,191,0.5)]"
              />
            );
          } else if (node.type === 'shelter') {
            // Diamond colored by stock alert level
            const alertColor = getShelterStatusColor(node);
            nodeElement = (
              <rect
                x={pos.x - 7}
                y={pos.y - 7}
                width={14}
                height={14}
                fill={alertColor}
                stroke="#0B0F14"
                strokeWidth={1.5}
                transform={`rotate(45 ${pos.x} ${pos.y})`}
                className="filter drop-shadow-[0_0_4px_rgba(0,0,0,0.6)]"
              />
            );
          } else if (node.type === 'village') {
            // Quiet structural dot
            nodeElement = (
              <circle
                cx={pos.x}
                cy={pos.y}
                r={4}
                fill="#161E29"
                stroke="#3A4552"
                strokeWidth={1.5}
              />
            );
          } else {
            // Junction: Small crosshair point
            nodeElement = (
              <circle
                cx={pos.x}
                cy={pos.y}
                r={2.5}
                fill="#3A4552"
              />
            );
          }

          return (
            <g key={node.id}>
              {/* Node shape */}
              {nodeElement}

              {/* Node label text */}
              <text
                x={pos.x}
                y={pos.y - 10}
                textAnchor="middle"
                className={`font-display text-[8px] font-bold tracking-wider uppercase ${labelColor}`}
                fill="currentColor"
              >
                {node.name.replace(' Relief Shelter', '').replace(' Logistics Depot', '').replace(' Emergency Shelter', '')}
              </text>
            </g>
          );
        })}
      </g>

      {/* 5. Convoys (Active Operations) */}
      <g>
        {convoys
          .filter((convoy) => convoy.status !== 'arrived' && convoy.status !== 'pending' && convoy.currentEdgeId)
          .map((convoy) => {
            const edge = edgesById.get(convoy.currentEdgeId as string);
            if (!edge) return null;
            const from = positionsById.get(edge.fromNodeId);
            const to = positionsById.get(edge.toNodeId);
            if (!from || !to) return null;

            const t = Math.min(Math.max(convoy.positionProgress, 0), 1);
            const x = from.x + (to.x - from.x) * t;
            const y = from.y + (to.y - from.y) * t;
            const color = CONVOY_COLOR[convoy.status as keyof typeof CONVOY_COLOR] ?? '#4FB3BF';

            return (
              <g key={convoy.id} className="cursor-pointer">
                {/* Outer pulsing ping */}
                <circle
                  cx={x}
                  cy={y}
                  r={8}
                  fill="none"
                  stroke={color}
                  strokeWidth={1}
                  opacity="0.6"
                  className="animate-ping"
                />
                
                {/* Solid Core Convoy Marker */}
                <circle 
                  cx={x} 
                  cy={y} 
                  r={5} 
                  fill={color} 
                  stroke="#0B0F14" 
                  strokeWidth={1.5}
                  className="filter drop-shadow-[0_0_3px_rgba(0,0,0,0.8)]"
                >
                  <title>{`${convoy.id} (${convoy.cargoType.toUpperCase()}) — ${convoy.status.toUpperCase()}`}</title>
                </circle>
                
                {/* Tactical tag */}
                <text
                  x={x}
                  y={y + 11}
                  textAnchor="middle"
                  className="font-mono text-[7px] font-bold text-zinc-100 bg-[#0B0F14]/80 px-0.5 rounded-sm"
                  fill="currentColor"
                >
                  {convoy.id}
                </text>
              </g>
            );
          })}
      </g>
    </svg>
  );
}
