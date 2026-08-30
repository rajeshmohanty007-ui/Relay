'use client';

import { useMemo, useEffect } from 'react';
import type { Node, Edge } from '../lib/types';
import { buildCitizenAdjacency, shortestPath, type PathResult } from '../lib/routingEngine';
import { saveCitizenRoute, clearSavedCitizenRoute } from '../lib/CitizenRouteStorage';

export interface RoutePlannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** Re-opens the planner panel — used by the floating summary chip's "Edit" action. */
  onOpen: () => void;
  nodes: Node[];
  edges: Edge[];
  originId: string;
  destId: string;
  onChangeOrigin: (id: string) => void;
  onChangeDest: (id: string) => void;
  /** Called with the edge IDs and node sequence of the currently-active route. */
  onHighlightRoute: (edgeIds: string[] | null, nodeSequence: string[] | null) => void;
}

const NODE_TYPE_LABEL: Record<Node['type'], string> = {
  depot: 'Logistics Depot',
  shelter: 'Relief Shelter',
  village: 'Village',
  junction: 'Junction',
};

type RouteOutcome =
  | { kind: 'unselected' }
  | { kind: 'same' }
  | { kind: 'unreachable' }
  | { kind: 'found'; result: PathResult };

export default function RoutePlannerModal({
  isOpen,
  onClose,
  onOpen,
  nodes,
  edges,
  originId,
  destId,
  onChangeOrigin,
  onChangeDest,
  onHighlightRoute,
}: RoutePlannerModalProps) {

  const nodesById = useMemo(() => new Map(nodes.map((n) => [n.id, n])), [nodes]);
  const edgesById = useMemo(() => new Map(edges.map((e) => [e.id, e])), [edges]);

  // Prefer real destinations (depot/shelter/village) over bare road junctions
  // in the dropdown ordering, but junctions remain selectable for precision.
  const sortedNodes = useMemo(
    () =>
      [...nodes].sort((a, b) => {
        if (a.type === b.type) return a.name.localeCompare(b.name);
        const rank = (t: Node['type']) => (t === 'junction' ? 1 : 0);
        return rank(a.type) - rank(b.type);
      }),
    [nodes],
  );

  // Guards against a stale saved ID from an older graph — falls back to
  // "nothing selected" rather than silently picking a different node.
  const effectiveOriginId = nodesById.has(originId) ? originId : '';
  const effectiveDestId = nodesById.has(destId) ? destId : '';

  // Recomputed live whenever road conditions change, so a closure that
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

  const hasActiveRoute = outcome.kind === 'found' && outcome.result.path.length > 0;

  // The highlight is driven purely by what's currently selected — it stays
  // lit on the map whether this panel is open or closed, and disappears
  // only when the route is cleared or becomes genuinely invalid.
  useEffect(() => {
    if (hasActiveRoute) {
      const found = outcome as { kind: 'found'; result: PathResult };
      onHighlightRoute(found.result.path, found.result.nodeSequence);
    } else {
      onHighlightRoute(null, null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [outcome, hasActiveRoute]);

  const pickOrigin = (id: string) => {
    onChangeOrigin(id);
    saveCitizenRoute(id, effectiveDestId);
  };

  const pickDest = (id: string) => {
    onChangeDest(id);
    saveCitizenRoute(effectiveOriginId, id);
  };

  const handleSwap = () => {
    onChangeOrigin(effectiveDestId);
    onChangeDest(effectiveOriginId);
    saveCitizenRoute(effectiveDestId, effectiveOriginId);
  };

  const handleClearRoute = () => {
    onChangeOrigin('');
    onChangeDest('');
    clearSavedCitizenRoute();
    onHighlightRoute(null, null);
  };

  // Small always-visible reminder once a route is active but the panel is
  // closed, so the highlighted line on the map isn't the only cue — and
  // nobody has to reopen the panel or read a turn list to know what's
  // planned.
  if (!isOpen) {
    if (!hasActiveRoute) return null;
    const originName = nodesById.get(effectiveOriginId)?.name ?? effectiveOriginId;
    const destName = nodesById.get(effectiveDestId)?.name ?? effectiveDestId;
    return (
      <div className="fixed bottom-6 left-1/2 z-40 flex -translate-x-1/2 items-center gap-3 rounded-2xl border border-signal-accent bg-[#1C1B17]/95 px-4 py-2.5 shadow-[0_0_25px_rgba(0,0,0,0.6)] backdrop-blur-sm">
        <span className="h-2 w-2 shrink-0 rounded-full bg-[#EC4899] shadow-[0_0_8px_#EC4899]" />
        <span className="font-mono text-[11px] text-[#FAF9F6]">
          <span className="font-bold">{originName}</span> → <span className="font-bold">{destName}</span>
          <span className="text-[#E4E1D8]/60"> · {Math.round((outcome as { kind: 'found'; result: PathResult }).result.totalTimeMin)} min</span>
        </span>
        <button
          type="button"
          onClick={onOpen}
          className="rounded-lg border border-[#35332C] bg-[#24221D] px-2.5 py-1 font-mono text-[9px] font-bold text-[#E4E1D8] hover:border-signal-accent hover:text-white transition-all"
        >
          EDIT
        </button>
        <button
          type="button"
          onClick={handleClearRoute}
          title="Clear this route"
          className="rounded-lg border border-[#35332C] bg-[#24221D] px-2.5 py-1 font-mono text-[9px] font-bold text-[#E4E1D8] hover:border-status-danger hover:text-status-danger transition-all"
        >
          ✕
        </button>
      </div>
    );
  }

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
            onClick={onClose}
            className="rounded-xl border border-[#35332C] bg-[#1C1B17] px-3 py-1.5 font-mono text-xs font-bold text-[#E4E1D8] hover:text-white hover:border-signal-accent hover:bg-[#24221D] transition-all flex items-center justify-center"
          >
            ✕
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
              onChange={(e) => pickOrigin(e.target.value)}
              className="border border-[#35332C] bg-[#24221D] p-3 rounded-xl text-xs font-mono text-white outline-none focus:border-signal-accent transition-all"
            >
              <option value="" disabled>
                Select a starting point…
              </option>
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
              onChange={(e) => pickDest(e.target.value)}
              className="border border-[#35332C] bg-[#24221D] p-3 rounded-xl text-xs font-mono text-white outline-none focus:border-signal-accent transition-all"
            >
              <option value="" disabled>
                Select a destination…
              </option>
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
                    <span className="font-display text-lg font-black text-[#EC4899] drop-shadow-[0_0_8px_rgba(236,72,153,0.3)]">
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

                <div className="flex flex-col gap-2.5">
                  <button
                    type="button"
                    onClick={onClose}
                    className="w-full rounded-xl border border-[#EC4899] bg-[#EC4899]/15 px-4 py-2.5 font-display text-xs font-black tracking-wider uppercase text-[#FAF9F6] hover:bg-[#EC4899]/30 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2 shadow-[0_0_12px_rgba(236,72,153,0.2)]"
                  >
                    <span>🧭 SHOW ROUTE ON MAP</span>
                  </button>

                  <div className="flex items-center gap-2 rounded-xl border border-[#EC4899]/40 bg-[#EC4899]/5 px-3 py-2.5">
                    <span className="h-2 w-2 shrink-0 rounded-full bg-[#EC4899] shadow-[0_0_8px_#EC4899]" />
                    <p className="font-mono text-[9px] text-[#E4E1D8]/70 leading-normal">
                      Your safe road route is highlighted in <span className="font-bold text-[#EC4899] uppercase">Pink</span> on the map.
                      It updates dynamically if road blockages occur.
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleClearRoute}
                  className="self-start font-mono text-[9px] text-[#E4E1D8]/50 underline decoration-dotted hover:text-status-danger transition-all mt-1"
                >
                  Clear this route
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
