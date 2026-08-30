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
    <div className="w-full border border-struct-line bg-[#080C10] p-3 flex flex-col gap-2.5">
      {/* Top row: controls and state display */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {/* Status banner */}
          <div className="flex items-center border border-struct-line px-2 py-0.5 select-none">
            <span 
              className={`h-1.5 w-1.5 rounded-full mr-2 ${mode === 'LIVE' ? 'bg-status-ok animate-pulse' : 'bg-status-warn'}`}
              style={{
                boxShadow: mode === 'LIVE' 
                  ? '0 0 6px #4CAF6D' 
                  : '0 0 6px #E8A33D'
              }}
            />
            <span className="font-display text-[9px] font-black tracking-widest text-zinc-300">
              STATUS: {mode === 'LIVE' ? 'LIVE MONITORING' : 'REPLAY REVIEW'}
            </span>
          </div>

          {/* Time indicator */}
          <div className="font-mono text-[10px] text-zinc-400">
            VIEWING TICK <span className="font-bold text-white font-mono">{selectedIndex + 1}</span> of{' '}
            <span className="font-mono text-zinc-500">{availableTimes.length}</span>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2">
          {/* Frame Step Buttons */}
          <div className="flex border border-struct-line rounded-none bg-[#0E131A] overflow-hidden">
            <button
              onClick={stepBack}
              disabled={!hasData || selectedIndex === 0}
              title="Step frame back"
              className="px-2 py-1 font-mono text-[10px] text-zinc-400 hover:bg-[#1C2430] hover:text-signal-accent disabled:opacity-30 disabled:hover:bg-transparent"
            >
              &lt; STEP
            </button>
            <div className="w-[1px] bg-struct-line/30" />
            <button
              onClick={stepForward}
              disabled={!hasData || selectedIndex === maxIndex}
              title="Step frame forward"
              className="px-2 py-1 font-mono text-[10px] text-zinc-400 hover:bg-[#1C2430] hover:text-signal-accent disabled:opacity-30 disabled:hover:bg-transparent"
            >
              STEP &gt;
            </button>
          </div>

          {/* Jump to Live Button */}
          {mode === 'REPLAY' && (
            <button
              onClick={jumpToLive}
              className="px-2 py-1 border border-status-ok bg-status-ok/10 text-status-ok text-[9px] font-display font-black tracking-widest hover:bg-status-ok/20 uppercase transition-colors"
            >
              JUMP TO LIVE
            </button>
          )}
        </div>
      </div>

      {/* Slider scrubbing track */}
      <div className="flex items-center gap-4 w-full">
        {/* Min mark */}
        <span className="font-mono text-[9px] text-zinc-500 select-none">
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
            className="w-full accent-signal-accent bg-zinc-900 border border-struct-line h-2.5 rounded-none cursor-pointer outline-none opacity-80 hover:opacity-100 disabled:opacity-30 transition-all"
            style={{
              WebkitAppearance: 'none',
            }}
          />
        </div>

        {/* Max mark */}
        <span className="font-mono text-[9px] text-zinc-500 select-none">
          {formatTime(latestSimTime)}
        </span>
      </div>

      {/* Detailed telemetry readout */}
      <div className="flex justify-between font-mono text-[8px] text-zinc-500 tracking-wider">
        <span>SCRUBBED TIME: {currentSimTime}s ({formatTime(currentSimTime)})</span>
        <span>LATEST TICKET: {latestSimTime}s ({formatTime(latestSimTime)})</span>
      </div>
    </div>
  );
}
