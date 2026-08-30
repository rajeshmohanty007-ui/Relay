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
    <div className="w-full border border-[#35332C] bg-[#1C1B17] p-3 flex flex-col gap-2.5">
      {/* Top row: controls and state display */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {/* Status banner */}
          <div className="flex items-center border border-[#35332C] px-2 py-0.5 select-none bg-[#24221D]">
            <span 
              className={`h-1.5 w-1.5 rounded-full mr-2 ${mode === 'LIVE' ? 'bg-[#4B7B4E] animate-pulse' : 'bg-[#B8863B]'}`}
              style={{
                boxShadow: mode === 'LIVE' 
                  ? '0 0 6px #4B7B4E' 
                  : '0 0 6px #B8863B'
              }}
            />
            <span className="font-display text-[9px] font-black tracking-widest text-[#FAF9F6]">
              STATUS: {mode === 'LIVE' ? 'LIVE MONITORING' : 'REPLAY REVIEW'}
            </span>
          </div>

          {/* Time indicator */}
          <div className="font-mono text-[10px] text-[#E4E1D8]/80">
            VIEWING TICK <span className="font-bold text-white font-mono">{selectedIndex + 1}</span> of{' '}
            <span className="font-mono text-[#E4E1D8]/50">{availableTimes.length}</span>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2">
          {/* Frame Step Buttons */}
          <div className="flex border border-[#35332C] rounded-none bg-[#24221D] overflow-hidden">
            <button
              onClick={stepBack}
              disabled={!hasData || selectedIndex === 0}
              title="Step frame back"
              className="px-2 py-1 font-mono text-[10px] text-[#E4E1D8] hover:bg-[#2C4A3E] hover:text-[#FAF9F6] disabled:opacity-30 disabled:hover:bg-transparent"
            >
              &lt; STEP
            </button>
            <div className="w-[1px] bg-[#35332C]" />
            <button
              onClick={stepForward}
              disabled={!hasData || selectedIndex === maxIndex}
              title="Step frame forward"
              className="px-2 py-1 font-mono text-[10px] text-[#E4E1D8] hover:bg-[#2C4A3E] hover:text-[#FAF9F6] disabled:opacity-30 disabled:hover:bg-transparent"
            >
              STEP &gt;
            </button>
          </div>

          {/* Jump to Live Button */}
          {mode === 'REPLAY' && (
            <button
              onClick={jumpToLive}
              className="px-2 py-1 border border-[#4B7B4E] bg-[#4B7B4E]/15 text-[#4B7B4E] text-[9px] font-display font-black tracking-widest hover:bg-[#4B7B4E]/30 uppercase transition-colors"
            >
              JUMP TO LIVE
            </button>
          )}
        </div>
      </div>

      {/* Slider scrubbing track */}
      <div className="flex items-center gap-4 w-full">
        {/* Min mark */}
        <span className="font-mono text-[9px] text-[#E4E1D8]/50 select-none">
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
            className="w-full accent-[#2C4A3E] bg-[#24221D] border border-[#35332C] h-2.5 rounded-none cursor-pointer outline-none opacity-90 hover:opacity-100 disabled:opacity-30 transition-all"
            style={{
              WebkitAppearance: 'none',
            }}
          />
        </div>

        {/* Max mark */}
        <span className="font-mono text-[9px] text-[#E4E1D8]/50 select-none">
          {formatTime(latestSimTime)}
        </span>
      </div>

      {/* Detailed telemetry readout */}
      <div className="flex justify-between font-mono text-[8px] text-[#E4E1D8]/60 tracking-wider">
        <span>SCRUBBED TIME: {currentSimTime}s ({formatTime(currentSimTime)})</span>
        <span>LATEST TICKET: {latestSimTime}s ({formatTime(latestSimTime)})</span>
      </div>
    </div>
  );
}
