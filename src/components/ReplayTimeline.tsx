'use client';

import React from 'react';

export interface ReplayTimelineProps {
  availableTimes: number[];
  selectedIndex: number;
  mode: 'LIVE' | 'REPLAY';
  onSelectIndex: (index: number) => void;
  onToggleMode: (mode: 'LIVE' | 'REPLAY') => void;
}

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

export default function ReplayTimeline({
  availableTimes,
  selectedIndex,
  mode,
  onSelectIndex,
  onToggleMode,
}: ReplayTimelineProps) {
  const hasData = availableTimes.length > 0;
  const maxIndex = hasData ? availableTimes.length - 1 : 0;
  const currentSimTime = hasData ? availableTimes[selectedIndex] : 0;
  const latestSimTime = hasData ? availableTimes[availableTimes.length - 1] : 0;

  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const idx = parseInt(e.target.value, 10);
    if (!isNaN(idx)) {
      onSelectIndex(idx);
      if (mode === 'LIVE') {
        onToggleMode('REPLAY');
      }
    }
  };

  const stepBack = () => {
    if (selectedIndex > 0) {
      onSelectIndex(selectedIndex - 1);
      if (mode === 'LIVE') onToggleMode('REPLAY');
    }
  };

  const stepForward = () => {
    if (selectedIndex < maxIndex) {
      onSelectIndex(selectedIndex + 1);
      if (mode === 'LIVE') onToggleMode('REPLAY');
    }
  };

  const jumpToLive = () => {
    onSelectIndex(maxIndex);
    onToggleMode('LIVE');
  };

  return (
    <div className="w-full border border-struct-line bg-brand-bg p-3.5 rounded-2xl flex flex-col gap-2.5 shadow-md">
      {/* Top row: controls and state display */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {/* Status banner */}
          <div className="flex items-center border border-struct-line px-3 py-1 rounded-full select-none bg-base-cream">
            <span 
              className={`h-2 w-2 rounded-full mr-2 ${mode === 'LIVE' ? 'bg-status-ok animate-pulse' : 'bg-status-warn'}`}
              style={{
                boxShadow: mode === 'LIVE' 
                  ? '0 0 8px #206E6B' 
                  : '0 0 8px #6AADAB'
              }}
            />
            <span className="font-display text-[9px] font-black tracking-widest text-base-dark">
              STATUS: {mode === 'LIVE' ? 'LIVE MONITORING' : 'REPLAY REVIEW'}
            </span>
          </div>

          {/* Time indicator */}
          <div className="font-mono text-[10px] text-base-dark/80 bg-base-cream px-2.5 py-0.5 rounded-full border border-struct-line">
            TICK <span className="font-bold text-base-dark font-mono">{selectedIndex + 1}</span> /{' '}
            <span className="font-mono text-base-dark/50">{availableTimes.length}</span>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2">
          {/* Frame Step Buttons */}
          <div className="flex border border-struct-line rounded-xl bg-base-cream overflow-hidden p-0.5 gap-0.5">
            <button
              onClick={stepBack}
              disabled={!hasData || selectedIndex === 0}
              title="Step frame back"
              className="px-2.5 py-1 rounded-lg font-mono text-[10px] text-base-dark/80 hover:bg-status-ok hover:text-white disabled:opacity-30 disabled:hover:bg-transparent transition-all cursor-pointer"
            >
              ◀ STEP
            </button>
            <button
              onClick={stepForward}
              disabled={!hasData || selectedIndex === maxIndex}
              title="Step frame forward"
              className="px-2.5 py-1 rounded-lg font-mono text-[10px] text-base-dark/80 hover:bg-status-ok hover:text-white disabled:opacity-30 disabled:hover:bg-transparent transition-all cursor-pointer"
            >
              STEP ▶
            </button>
          </div>

          {/* Jump to Live Button */}
          {mode === 'REPLAY' && (
            <button
              onClick={jumpToLive}
              className="px-3 py-1 rounded-xl border border-status-ok bg-status-ok/15 text-status-ok text-[9px] font-display font-black tracking-widest hover:bg-status-ok/30 uppercase transition-all shadow-sm cursor-pointer"
            >
              JUMP TO LIVE
            </button>
          )}
        </div>
      </div>

      {/* Slider scrubbing track */}
      <div className="flex items-center gap-4 w-full">
        {/* Min mark */}
        <span className="font-mono text-[9px] text-base-dark/70 bg-base-cream px-2 py-0.5 rounded-full border border-struct-line select-none">
          {formatTime(availableTimes[0] || 0)}
        </span>

        {/* Custom styled range slider */}
        <div className="flex-1 relative flex items-center">
          <input
            type="range"
            min={0}
            max={maxIndex}
            value={selectedIndex}
            onChange={handleSliderChange}
            disabled={!hasData}
            className="w-full accent-status-ok bg-base-cream border border-struct-line h-3 rounded-full cursor-pointer outline-none opacity-90 hover:opacity-100 disabled:opacity-30 transition-all shadow-inner"
            style={{
              WebkitAppearance: 'none',
            }}
          />
        </div>

        {/* Max mark */}
        <span className="font-mono text-[9px] text-base-dark/70 bg-base-cream px-2 py-0.5 rounded-full border border-struct-line select-none">
          {formatTime(latestSimTime)}
        </span>
      </div>

      {/* Detailed telemetry readout */}
      <div className="flex justify-between font-mono text-[8px] text-base-dark/60 tracking-wider px-1">
        <span>SCRUBBED TIME: {currentSimTime}s ({formatTime(currentSimTime)})</span>
        <span>LATEST TICKET: {latestSimTime}s ({formatTime(latestSimTime)})</span>
      </div>
    </div>
  );
}
