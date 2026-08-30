'use client';

export default function Loading() {
  return (
    <div className="flex h-screen w-screen flex-col items-center justify-center bg-base-cream gap-4 select-none">
      {/* Brand logo */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/drawing.svg" alt="Relay Logo" className="h-16 w-auto animate-pulse" />
      
      {/* Loading Progress Bar Container */}
      <div className="flex flex-col items-center gap-2 w-full max-w-[200px]">
        <div className="w-full h-1.5 bg-struct-line/30 rounded-full overflow-hidden relative">
          <div className="absolute inset-y-0 left-0 w-full bg-signal-accent rounded-full animate-loading-bar" />
        </div>
        <span className="font-display text-[9px] font-black tracking-widest text-base-dark/60 uppercase">
          LOADING TACTICAL COMMAND BOARD...
        </span>
      </div>
    </div>
  );
}
