'use client';

import { useEffect, useSyncExternalStore, useCallback } from 'react';
import type { Node, Edge, Convoy } from '../lib/types';

export interface SnapshotEntry {
  simTimeSec: number;
  nodes: Node[];
  edges: Edge[];
  convoys: Convoy[];
}

const MAX_BUFFER_SIZE = 500;
const EMPTY_SNAPSHOTS: SnapshotEntry[] = [];
const getServerSnapshot = () => EMPTY_SNAPSHOTS;


function deepClone<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj));
}


class ReplayStore {
  private snapshots: SnapshotEntry[] = [];
  private listeners = new Set<() => void>();

  subscribe = (listener: () => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };

  getSnapshot = (): SnapshotEntry[] => {
    return this.snapshots;
  };

  record(nodes: Node[], edges: Edge[], convoys: Convoy[], currentSimTime: number) {
    if (nodes.length === 0 && edges.length === 0 && convoys.length === 0) {
      return;
    }

    const last = this.snapshots[this.snapshots.length - 1];
    const convoysSummary = convoys
      .map((c) => `${c.id}:${c.status}:${c.currentEdgeId}:${c.positionProgress.toFixed(3)}`)
      .join('|');
    const edgesSummary = edges.map((e) => `${e.id}:${e.status}`).join('|');

    if (last) {
      const lastConvoysSummary = last.convoys
        .map((c) => `${c.id}:${c.status}:${c.currentEdgeId}:${c.positionProgress.toFixed(3)}`)
        .join('|');
      const lastEdgesSummary = last.edges.map((e) => `${e.id}:${e.status}`).join('|');

      if (
        last.simTimeSec === currentSimTime &&
        lastConvoysSummary === convoysSummary &&
        lastEdgesSummary === edgesSummary
      ) {
        return;
      }
    }

    const newSnapshot: SnapshotEntry = {
      simTimeSec: currentSimTime,
      nodes: deepClone(nodes),
      edges: deepClone(edges),
      convoys: deepClone(convoys),
    };

    this.snapshots = [...this.snapshots, newSnapshot];
    if (this.snapshots.length > MAX_BUFFER_SIZE) {
      this.snapshots = this.snapshots.slice(this.snapshots.length - MAX_BUFFER_SIZE);
    }

    this.listeners.forEach((listener) => listener());
  }
}

const replayStore = new ReplayStore();





export function useReplayBuffer(
  nodes: Node[],
  edges: Edge[],
  convoys: Convoy[],
  currentSimTime: number,
) {
  
  useEffect(() => {
    replayStore.record(nodes, edges, convoys, currentSimTime);
  }, [nodes, edges, convoys, currentSimTime]);

  
  const snapshots = useSyncExternalStore(
    replayStore.subscribe,
    replayStore.getSnapshot,
    getServerSnapshot,
  );

  const availableTimes = snapshots.map((s) => s.simTimeSec);

  


  const getSnapshotByIndex = useCallback(
    (index: number): SnapshotEntry | null => {
      if (index < 0 || index >= snapshots.length) return null;
      return snapshots[index];
    },
    [snapshots],
  );

  


  const getSnapshot = useCallback(
    (simTime: number): SnapshotEntry | null => {
      for (let i = snapshots.length - 1; i >= 0; i--) {
        if (snapshots[i].simTimeSec <= simTime) {
          return snapshots[i];
        }
      }
      return snapshots[0] || null;
    },
    [snapshots],
  );

  

  return {
    snapshots,
    availableTimes,
    getSnapshot,
    getSnapshotByIndex,
    bufferSize: snapshots.length,
  };
}
