'use client';

import React from 'react';
import type { MapLayer } from './MapViewTopo';

export interface MapLayerToggleProps {
  visibleLayers: Set<MapLayer>;
  onChange: (layers: Set<MapLayer>) => void;
}

interface LayerOption {
  id: MapLayer;
  label: string;
  shortKey: string;
}

const LAYERS: LayerOption[] = [
  { id: 'grid', label: 'GRID', shortKey: 'G' },
  { id: 'contours', label: 'TOPO', shortKey: 'T' },
  { id: 'edges', label: 'ROADS', shortKey: 'R' },
  { id: 'nodes', label: 'NODES', shortKey: 'N' },
  { id: 'convoys', label: 'CONVOYS', shortKey: 'C' },
];

export default function MapLayerToggle({ visibleLayers, onChange }: MapLayerToggleProps) {
  const toggleLayer = (layer: MapLayer) => {
    const next = new Set(visibleLayers);
    if (next.has(layer)) {
      next.delete(layer);
    } else {
      next.add(layer);
    }
    onChange(next);
  };

  return (
    <div className="flex flex-col gap-2 border border-struct-line bg-[#080C10] p-2.5 select-none">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-xs font-bold uppercase tracking-wider text-signal-accent">
          MAP LAYERS & OVERLAYS
        </h2>
        <span className="font-mono text-[9px] text-zinc-500">
          {visibleLayers.size}/{LAYERS.length} ACTIVE
        </span>
      </div>
      <div className="grid grid-cols-5 gap-1">
        {LAYERS.map((layer) => {
          const isVisible = visibleLayers.has(layer.id);
          return (
            <button
              key={layer.id}
              type="button"
              onClick={() => toggleLayer(layer.id)}
              className={`flex flex-col items-center justify-center py-1.5 px-1 font-mono text-[8px] tracking-wider transition-all duration-150 border ${
                isVisible
                  ? 'border-signal-accent/60 bg-[#0E1B26] text-signal-accent shadow-[0_0_6px_rgba(79,179,191,0.25)] font-bold'
                  : 'border-struct-line/30 bg-[#0A0E14]/60 text-zinc-500 hover:text-zinc-300 hover:border-struct-line opacity-50'
              }`}
              title={`Toggle ${layer.label} layer (${isVisible ? 'Active' : 'Hidden'})`}
            >
              <span
                className={`h-1.5 w-1.5 rounded-full mb-1 transition-colors ${
                  isVisible ? 'bg-signal-accent shadow-[0_0_4px_#4FB3BF]' : 'bg-zinc-700'
                }`}
              />
              <span>{layer.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
