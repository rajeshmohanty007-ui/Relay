'use client';

import { useMemo, useState, useEffect } from 'react';
import type { Node, Edge } from '../lib/types';
import { buildCitizenAdjacency, shortestPath, type PathResult } from '../lib/routingEngine';

export interface RoutePlannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  nodes: Node[];
  edges: Edge[];
  /** Called with the edge IDs of the currently-shown route (or null to clear the highlight). */
  onHighlightRoute: (edgeIds: string[] | null) => void;
}

const NODE_TYPE_LABEL: Record<Node['type'], string> = {
  depot: 'Logistics Depot',
  shelter: 'Relief Shelter',
  village: 'Village',
  junction: 'Junction',
};

export default function RoutePlannerModal({
  isOpen,
  onClose,
  nodes,
  edges,
  onHighlightRoute,
}: RoutePlannerModalProps) {
  const [originId, setOriginId] = useState<string>('');
  const [destId, setDestId] = useState<string>('');

  const edgesById = useMemo(() => new Map(edges.map((e) => [e.id, e])), [edges]);
  const nodesById = useMemo(() => new Map(nodes.map((n) => [n.id, n])), [nodes]);

  // Prefer real destinations (depot/shelter/village) over bare road junctions
  // as sensible defaults, but junctions remain selectable for precision.
  const sortedNodes = useMemo(
    () =>
      [...nodes].sort((a, b) => {
        if (a.type === b.type) return a.name.localeCompare(b.name);
        const rank = (t: Node['type']) => (t === 'junction' ? 1 : 0);
        return rank(a.type) - rank(b.type);
      }),
    [nodes],
  );

  // Fall back to sensible defaults (first two sorted nodes) until the user
  // makes an explicit choice — avoids a setState-in-effect just to seed
  // initial selection.
  const effectiveOriginId = originId || sortedNodes[0]?.id || '';
  const effectiveDestId = destId || sortedNodes[1]?.id || '';

  type RouteOutcome =
    | { kind: 'unselected' }
    | { kind: 'same' }
    | { kind: 'unreachable' }
    | { kind: 'found'; result: PathResult };

  // Recomputed live whenever road conditions change, so a road closure that
  // happens after the trip was planned is reflected immediately.
  const outcome: RouteOutcome = useMemo(() => {
    if (!effectiveOriginId || !effectiveDestId) return { kind: 'unselected' };
    if (effectiveOriginId === effectiveDestId) return { kind: 'same' };
    const adjacency = buildCitizenAdjacency(nodes, edges);
    const result = shortestPath(adjacency, effectiveOriginId, effectiveDestId);
    if (!result) return { kind: 'unreachable' };
    return { kind: 'found', result };
  }, [nodes, edges, effectiveOriginId, effectiveDestId]);

  const degradedCount = useMemo(() => {
    if (outcome.kind !== 'found') return 0;
    return outcome.result.path.filter((edgeId) => edgesById.get(edgeId)?.status === 'degraded').length;
  }, [outcome, edgesById]);

  useEffect(() => {
    if (!isOpen) return;
    if (outcome.kind === 'found' && outcome.result.path.length > 0) {
      onHighlightRoute(outcome.result.path);
    } else {
      onHighlightRoute(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [outcome, isOpen]);

  const handleClose = () => {
    onHighlightRoute(null);
    onClose();
  };

  const handleSwap = () => {
    setOriginId(effectiveDestId);
    setDestId(effectiveOriginId);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 backdrop-blur-md p-3 sm:p-6 animate-in fade-in duration-150">
      <div className="flex max-h-[85vh] w-full max-w-lg flex-col rounded-3xl border border-[#35332C] bg-[#1C1B17] shadow-[0_0_50px_rgba(0,0,0,0.9)] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#35332C] bg-[#24221D] px-6 py-3.5 shrink-0">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-signal-accent bg-signal-accent/15 text-signal-accent shadow-sm">
              <span className="text-base">🧭</span>
            </div>
            <div>
              <h2 className="font-display text-sm font-black tracking-widest text-[#FAF9F6] uppercase">
                PLAN A SAFE ROUTE
              </h2>
              <p className="text-[9px] font-sans text-[#E4E1D8]/70">
                For any traveler — get the best current road route, automatically avoiding closures
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleClose}
            className="rounded-xl border border-[#35332C] bg-[#1C1B17] px-3.5 py-1.5 font-mono text-xs font-bold text-[#E4E1D8] hover:text-white hover:border-signal-accent hover:bg-[#24221D] transition-all"
          >
            ✕ CLOSE
          </button>
        </div>

        <div className="flex flex-col gap-4 overflow-y-auto p-6">
          {/* Origin / Destination selectors */}
          <div className="flex flex-col gap-2">
            <label htmlFor="route-origin" className="font-display text-[10px] font-bold uppercase tracking-wider text-signal-accent">
              FROM
            </label>
            <select
              id="route-origin"
              value={effectiveOriginId}
              onChange={(e) => setOriginId(e.target.value)}
              className="border border-[#35332C] bg-[#24221D] p-3 rounded-xl text-xs font-mono text-white outline-none focus:border-signal-accent transition-all"
            >
              {sortedNodes.map((n) => (
                <option key={n.id} value={n.id}>
                  {n.name} — {NODE_TYPE_LABEL[n.type]}
                </option>
              ))}
            </select>
          </div>

          <div className="flex justify-center">
            <button
              type="button"
              onClick={handleSwap}
              title="Swap origin and destination"
              className="rounded-full border border-[#35332C] bg-[#24221D] px-3 py-1 font-mono text-[10px] text-[#E4E1D8] hover:border-signal-accent hover:text-white transition-all"
            >
              ⇅ SWAP
            </button>
          </div>

          <div className="flex flex-col gap-2">
            <label htmlFor="route-dest" className="font-display text-[10px] font-bold uppercase tracking-wider text-signal-accent">
              TO
            </label>
            <select
              id="route-dest"
              value={effectiveDestId}
              onChange={(e) => setDestId(e.target.value)}
              className="border border-[#35332C] bg-[#24221D] p-3 rounded-xl text-xs font-mono text-white outline-none focus:border-signal-accent transition-all"
            >
              {sortedNodes.map((n) => (
                <option key={n.id} value={n.id}>
                  {n.name} — {NODE_TYPE_LABEL[n.type]}
                </option>
              ))}
            </select>
          </div>

          {/* Result panel */}
          <div className="mt-1 rounded-2xl border border-[#35332C] bg-[#24221D] p-4">
            {outcome.kind === 'unselected' && (
              <p className="font-mono text-xs text-[#E4E1D8]/70">Select a starting point and a destination.</p>
            )}

            {outcome.kind === 'same' && (
              <p className="font-mono text-xs text-[#E4E1D8]/70">Pick two different points to plan a route.</p>
            )}

            {outcome.kind === 'unreachable' && (
              <div className="flex items-center gap-2 text-status-danger">
                <span>🚫</span>
                <p className="font-mono text-xs">
                  No safe route currently available — road closures have cut off every path between these points.
                </p>
              </div>
            )}

            {outcome.kind === 'found' && outcome.result.path.length === 0 && (
              <p className="font-mono text-xs text-[#E4E1D8]/70">You&apos;re already there.</p>
            )}

            {outcome.kind === 'found' && outcome.result.path.length > 0 && (
              <div className="flex flex-col gap-3">
                <div className="flex items-center justify-between border-b border-[#35332C]/60 pb-2.5">
                  <div>
                    <span className="text-[#E4E1D8]/60 block text-[9px] font-mono">ESTIMATED TRAVEL TIME</span>
                    <span className="font-display text-lg font-black text-status-ok">
                      {Math.round(outcome.result.totalTimeMin)} min
                    </span>
                  </div>
                  {degradedCount > 0 && (
                    <div className="text-right">
                      <span className="text-[#E4E1D8]/60 block text-[9px] font-mono">SLOW SEGMENTS</span>
                      <span className="font-mono text-xs font-bold text-status-warn">
                        {degradedCount} degraded road{degradedCount > 1 ? 's' : ''}
                      </span>
                    </div>
                  )}
                </div>

                <div>
                  <span className="text-[#E4E1D8]/60 block text-[9px] font-mono mb-1.5">ROUTE VIA</span>
                  <ol className="flex flex-col gap-1">
                    {outcome.result.nodeSequence.map((nodeId, idx) => (
                      <li key={`${nodeId}-${idx}`} className="flex items-center gap-2 font-mono text-[11px] text-[#FAF9F6]">
                        <span className="text-[#E4E1D8]/40">{idx + 1}.</span>
                        <span>{nodesById.get(nodeId)?.name ?? nodeId}</span>
                      </li>
                    ))}
                  </ol>
                </div>

                <p className="font-mono text-[9px] text-[#E4E1D8]/50 pt-1 border-t border-[#35332C]/40">
                  This route is highlighted on the map and updates automatically if road conditions change.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
