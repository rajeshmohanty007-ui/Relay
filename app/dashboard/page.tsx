'use client';

import { useFirestoreCollection } from '../../src/hooks/useFirestoreCollection';
import type { Node, Edge, Convoy, DemoLogEntry } from '../../src/lib/types';
import MapView from '../../src/components/MapView';
import DispatchPanel from '../../src/components/DispatchPanel';
import EventFeed from '../../src/components/EventFeed';

export default function DashboardPage() {
  const { data: nodes, loading: nodesLoading } = useFirestoreCollection<Node>('nodes');
  const { data: edges, loading: edgesLoading } = useFirestoreCollection<Edge>('edges');
  const { data: convoys, loading: convoysLoading } = useFirestoreCollection<Convoy>('convoys');
  const { data: demoLog, loading: demoLogLoading } = useFirestoreCollection<DemoLogEntry>('demoLog', 'simTimeSec');

  const mapReady = !nodesLoading && !edgesLoading && !convoysLoading;

  return (
    <div className="flex h-screen w-screen flex-col bg-zinc-50 text-zinc-900 dark:bg-black dark:text-zinc-50">
      <header className="border-b border-zinc-200 px-4 py-2 dark:border-zinc-800">
        <h1 className="text-lg font-semibold">Disaster Relief Convoy Dashboard</h1>
      </header>

      <div className="flex min-h-0 flex-1">
        <main className="min-w-0 flex-1 p-4">
          {mapReady ? (
            <MapView nodes={nodes} edges={edges} convoys={convoys} />
          ) : (
            <p className="text-sm text-zinc-400">Loading map...</p>
          )}
        </main>

        <aside className="flex w-80 shrink-0 flex-col gap-4 overflow-hidden border-l border-zinc-200 p-4 dark:border-zinc-800">
          <div className="min-h-0 flex-1 overflow-y-auto">
            <DispatchPanel nodes={nodes} convoys={convoys} demoLog={demoLog} />
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto border-t border-zinc-200 pt-4 dark:border-zinc-800">
            <EventFeed entries={demoLog} loading={demoLogLoading} />
          </div>
        </aside>
      </div>
    </div>
  );
}
