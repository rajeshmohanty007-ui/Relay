'use client';

import { useMemo, useState } from 'react';
import type { NetworkNode } from '../lib/networkConnectivity';

interface NetworkMapViewProps {
  nodes: NetworkNode[];
  selectedNodeId: string | null;
  onSelectNode: (node: NetworkNode | null) => void;
  showMeshLinks?: boolean;
}

const VIEW_WIDTH = 920;
const VIEW_HEIGHT = 650;
const PADDING_RATIO = 0.08;


const MIN_LAT = 10.075;
const MAX_LAT = 10.245;
const MIN_LNG = 76.255;
const MAX_LNG = 76.495;

function projectCoord(lat: number, lng: number): { x: number; y: number } {
  const latRange = MAX_LAT - MIN_LAT;
  const lngRange = MAX_LNG - MIN_LNG;
  const paddingX = VIEW_WIDTH * PADDING_RATIO;
  const paddingY = VIEW_HEIGHT * PADDING_RATIO;
  const usableWidth = VIEW_WIDTH - paddingX * 2;
  const usableHeight = VIEW_HEIGHT - paddingY * 2;

  const xFrac = (lng - MIN_LNG) / lngRange;
  const yFrac = 1 - (lat - MIN_LAT) / latRange;

  return {
    x: paddingX + xFrac * usableWidth,
    y: paddingY + yFrac * usableHeight,
  };
}

const STATUS_STYLE: Record<
  NetworkNode['status'],
  { fill: string; stroke: string; ringColor: string; label: string }
> = {
  optimal: { fill: '#10b981', stroke: '#059669', ringColor: 'rgba(16, 185, 129, 0.3)', label: 'Optimal 5G/Sat Link' },
  degraded: { fill: '#f59e0b', stroke: '#d97706', ringColor: 'rgba(245, 158, 11, 0.4)', label: 'Degraded Latency' },
  critical_drop: { fill: '#f97316', stroke: '#ea580c', ringColor: 'rgba(249, 115, 22, 0.6)', label: 'Critical Packet Loss' },
  blackout: { fill: '#ef4444', stroke: '#991b1b', ringColor: 'rgba(239, 68, 68, 0.85)', label: 'Total Blackout / Failed' },
};

const NODE_TYPE_SHAPE: Record<NetworkNode['type'], { shape: 'square' | 'diamond' | 'circle'; size: number }> = {
  depot: { shape: 'square', size: 10 },
  shelter: { shape: 'diamond', size: 10 },
  village: { shape: 'circle', size: 7 },
  junction: { shape: 'circle', size: 5 },
};

export default function NetworkMapView({
  nodes,
  selectedNodeId,
  onSelectNode,
  showMeshLinks = true,
}: NetworkMapViewProps) {
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);

  const projectedNodes = useMemo(() => {
    return nodes.map((n) => ({
      ...n,
      pos: projectCoord(n.lat, n.lng),
    }));
  }, [nodes]);

  const nodesById = useMemo(() => {
    const map = new Map<string, typeof projectedNodes[0]>();
    for (const p of projectedNodes) map.set(p.id, p);
    return map;
  }, [projectedNodes]);

  const activeNode = useMemo(() => {
    const targetId = hoveredNodeId ?? selectedNodeId;
    return projectedNodes.find((n) => n.id === targetId) ?? null;
  }, [hoveredNodeId, selectedNodeId, projectedNodes]);

  
  const meshLines = useMemo(() => {
    const lines: Array<{ from: { x: number; y: number }; to: { x: number; y: number }; key: string; status: NetworkNode['status'] }> = [];
    const seen = new Set<string>();

    for (const node of projectedNodes) {
      for (const peerId of node.meshPeers) {
        const peer = nodesById.get(peerId);
        if (!peer) continue;
        const pairKey = [node.id, peerId].sort().join('__');
        if (seen.has(pairKey)) continue;
        seen.add(pairKey);

        const worstStatus =
          node.status === 'blackout' || peer.status === 'blackout'
            ? 'blackout'
            : node.status === 'critical_drop' || peer.status === 'critical_drop'
            ? 'critical_drop'
            : node.status === 'degraded' || peer.status === 'degraded'
            ? 'degraded'
            : 'optimal';

        lines.push({
          from: node.pos,
          to: peer.pos,
          key: pairKey,
          status: worstStatus,
        });
      }
    }
    return lines;
  }, [projectedNodes, nodesById]);

  return (
    <div className="relative h-full w-full overflow-hidden rounded-xl border border-zinc-200 bg-slate-950 p-2 shadow-inner dark:border-zinc-800">
      <svg viewBox={`0 0 ${VIEW_WIDTH} ${VIEW_HEIGHT}`} className="h-full w-full select-none">
        <defs>
          <pattern id="telecomGrid" width="30" height="30" patternUnits="userSpaceOnUse">
            <path d="M 30 0 L 0 0 0 30" fill="none" stroke="rgba(14, 165, 233, 0.06)" strokeWidth="0.8" />
          </pattern>

          <linearGradient id="optMeshGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#10b981" stopOpacity="0.6" />
            <stop offset="100%" stopColor="#06b6d4" stopOpacity="0.4" />
          </linearGradient>

          <filter id="netGlow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
        </defs>

        <rect width={VIEW_WIDTH} height={VIEW_HEIGHT} fill="#0b0f19" />
        <rect width={VIEW_WIDTH} height={VIEW_HEIGHT} fill="url(#telecomGrid)" />

        {}
        {showMeshLinks && (
          <g>
            {meshLines.map((link) => {
              const isCut = link.status === 'blackout';
              const isCrit = link.status === 'critical_drop';
              const stroke = isCut ? '#ef4444' : isCrit ? '#f97316' : link.status === 'degraded' ? '#f59e0b' : '#0284c7';
              const opacity = isCut ? 0.35 : isCrit ? 0.5 : 0.6;

              return (
                <line
                  key={link.key}
                  x1={link.from.x}
                  y1={link.from.y}
                  x2={link.to.x}
                  y2={link.to.y}
                  stroke={stroke}
                  strokeWidth={isCut ? 1.5 : 2}
                  strokeDasharray={isCut ? '4 6' : isCrit ? '6 4' : undefined}
                  opacity={opacity}
                />
              );
            })}
          </g>
        )}

        {}
        <g>
          {projectedNodes.map((node) => {
            const isSelected = node.id === selectedNodeId;
            const isHovered = node.id === hoveredNodeId;
            const style = STATUS_STYLE[node.status];
            const shapeInfo = NODE_TYPE_SHAPE[node.type];
            const isBlackout = node.status === 'blackout';
            const isCrit = node.status === 'critical_drop';

            return (
              <g
                key={node.id}
                className="cursor-pointer transition-all duration-200"
                onClick={() => onSelectNode(node)}
                onMouseEnter={() => setHoveredNodeId(node.id)}
                onMouseLeave={() => setHoveredNodeId(null)}
              >
                {}
                {(isBlackout || isCrit) && (
                  <circle
                    cx={node.pos.x}
                    cy={node.pos.y}
                    r={isSelected || isHovered ? 26 : 18}
                    fill={style.ringColor}
                    className="animate-ping"
                    style={{ transformOrigin: `${node.pos.x}px ${node.pos.y}px` }}
                  />
                )}

                {}
                <circle
                  cx={node.pos.x}
                  cy={node.pos.y}
                  r={isSelected ? 22 : 14}
                  fill="none"
                  stroke={style.fill}
                  strokeWidth={1}
                  strokeDasharray={isBlackout ? '2 2' : undefined}
                  opacity={0.35}
                />

                {}
                {(isSelected || isHovered) && (
                  <circle
                    cx={node.pos.x}
                    cy={node.pos.y}
                    r={18}
                    fill="none"
                    stroke="#ffffff"
                    strokeWidth={2}
                    strokeDasharray={isSelected ? '3 3' : undefined}
                    filter="url(#netGlow)"
                  />
                )}

                {}
                {shapeInfo.shape === 'circle' && (
                  <circle
                    cx={node.pos.x}
                    cy={node.pos.y}
                    r={shapeInfo.size}
                    fill={style.fill}
                    stroke="#ffffff"
                    strokeWidth={1.5}
                    filter="url(#netGlow)"
                  />
                )}

                {shapeInfo.shape === 'square' && (
                  <rect
                    x={node.pos.x - shapeInfo.size}
                    y={node.pos.y - shapeInfo.size}
                    width={shapeInfo.size * 2}
                    height={shapeInfo.size * 2}
                    fill={style.fill}
                    stroke="#ffffff"
                    strokeWidth={1.5}
                    filter="url(#netGlow)"
                  />
                )}

                {shapeInfo.shape === 'diamond' && (
                  <rect
                    x={node.pos.x - shapeInfo.size}
                    y={node.pos.y - shapeInfo.size}
                    width={shapeInfo.size * 2}
                    height={shapeInfo.size * 2}
                    fill={style.fill}
                    stroke="#ffffff"
                    strokeWidth={1.5}
                    transform={`rotate(45 ${node.pos.x} ${node.pos.y})`}
                    filter="url(#netGlow)"
                  />
                )}

                {}
                <g transform={`translate(${node.pos.x}, ${node.pos.y - 14})`}>
                  <rect
                    x={-26}
                    y={-13}
                    width={52}
                    height={15}
                    rx={7}
                    fill="rgba(15, 23, 42, 0.85)"
                    stroke={style.stroke}
                    strokeWidth={1}
                  />
                  <text
                    x={0}
                    y={-2}
                    textAnchor="middle"
                    fill="#f8fafc"
                    fontSize={9}
                    fontWeight={700}
                    fontFamily="monospace"
                  >
                    {isBlackout ? 'OFFLINE' : `${node.latencyMs}ms`}
                  </text>
                </g>

                {}
                {(isSelected || isHovered || isBlackout || isCrit) && (
                  <text
                    x={node.pos.x}
                    y={node.pos.y + 20}
                    textAnchor="middle"
                    fill="#e2e8f0"
                    fontSize={10}
                    fontWeight={600}
                    className="select-none drop-shadow"
                  >
                    {node.name}
                  </text>
                )}
              </g>
            );
          })}
        </g>
      </svg>

      {}
      {activeNode && (
        <div className="pointer-events-none absolute bottom-4 left-4 z-20 w-84 rounded-lg border border-slate-700 bg-slate-900/95 p-3.5 text-xs text-white shadow-2xl backdrop-blur-md">
          <div className="flex items-center justify-between border-b border-slate-700/80 pb-2">
            <div>
              <span className="font-mono text-[10px] font-bold text-sky-400">{activeNode.code}</span>
              <h4 className="font-semibold text-slate-100">{activeNode.name}</h4>
            </div>
            <span
              className="rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider"
              style={{
                backgroundColor: STATUS_STYLE[activeNode.status].fill + '33',
                color: STATUS_STYLE[activeNode.status].fill,
                border: `1px solid ${STATUS_STYLE[activeNode.status].fill}`,
              }}
            >
              {activeNode.status.replace('_', ' ')}
            </span>
          </div>

          <div className="mt-2.5 grid grid-cols-3 gap-2 text-center">
            <div className="rounded bg-slate-800/80 p-1.5">
              <div className="text-[10px] text-slate-400">Latency</div>
              <div className="font-mono text-sm font-bold text-sky-300">{activeNode.latencyMs} ms</div>
            </div>
            <div className="rounded bg-slate-800/80 p-1.5">
              <div className="text-[10px] text-slate-400">Packet Loss</div>
              <div
                className={`font-mono text-sm font-bold ${
                  activeNode.packetLossPct > 10 ? 'text-red-400' : activeNode.packetLossPct > 2 ? 'text-amber-400' : 'text-emerald-400'
                }`}
              >
                {activeNode.packetLossPct}%
              </div>
            </div>
            <div className="rounded bg-slate-800/80 p-1.5">
              <div className="text-[10px] text-slate-400">Throughput</div>
              <div className="font-mono text-sm font-bold text-slate-200">{activeNode.bandwidthMbps} Mbps</div>
            </div>
          </div>

          <div className="mt-2.5 flex flex-col gap-1 text-[11px] text-slate-300">
            <div>
              <span className="text-slate-400">Active Link:</span> <span className="font-medium text-sky-300">{activeNode.activeChannel}</span>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <span className="text-slate-400">Power:</span> {activeNode.powerSource}
              </div>
              <div className="font-mono text-amber-400 font-semibold flex items-center gap-1">
                <svg className="w-3.5 h-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" fill="currentColor" />
                </svg>
                <span>{activeNode.batteryHoursRemaining}h remaining</span>
              </div>
            </div>
          </div>

          {activeNode.status === 'blackout' && (
            <div className="mt-2 rounded bg-red-950/70 p-1.5 text-[11px] font-medium text-red-200 border border-red-800/50 flex items-center gap-1.5">
              <svg className="w-4 h-4 shrink-0 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <span>Telecommunication Blackout: Convoy transceivers cannot reach dispatch server from this node!</span>
            </div>
          )}
        </div>
      )}

      {}
      <div className="absolute right-4 top-4 flex flex-col gap-1.5 rounded-lg border border-slate-800 bg-slate-900/90 p-2.5 text-[11px] text-slate-300 backdrop-blur-md">
        <span className="font-semibold text-slate-200">Network Telemetry Legend</span>
        <div className="flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-full bg-emerald-500 shadow-[0_0_8px_#10b981]" />
          <span>Optimal (&lt; 50ms, 0% loss)</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-full bg-amber-500 shadow-[0_0_8px_#f59e0b]" />
          <span>Degraded (50-120ms)</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-full bg-orange-500 shadow-[0_0_8px_#f97316]" />
          <span>Critical Loss (&gt; 15% loss)</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-full bg-red-500 shadow-[0_0_8px_#ef4444]" />
          <span>Blackout / Power Cut</span>
        </div>
      </div>
    </div>
  );
}
