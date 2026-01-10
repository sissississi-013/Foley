import React from 'react';
import { SoundEvent } from '../types';

interface TimelineProps {
  duration: number;
  currentTime: number;
  events: SoundEvent[];
  onSeek: (time: number) => void;
}

const Timeline: React.FC<TimelineProps> = ({ duration, currentTime, events, onSeek }) => {
  // Helper to parse MM:SS to seconds
  const parseTimestamp = (ts: string) => {
    const parts = ts.split(':').map(Number);
    if (parts.length === 2) return parts[0] * 60 + parts[1];
    if (parts.length === 1) return parts[0];
    return 0;
  };

  const handleTimelineClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (duration === 0) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const percentage = Math.max(0, Math.min(1, x / rect.width));
    onSeek(percentage * duration);
  };

  return (
    <div className="w-full mt-4 select-none">
      <div className="flex justify-between text-xs text-slate-400 font-mono mb-1">
        <span>{new Date(currentTime * 1000).toISOString().substr(14, 5)}</span>
        <span>{new Date(duration * 1000).toISOString().substr(14, 5)}</span>
      </div>
      
      <div 
        className="relative h-8 bg-slate-100 rounded-md cursor-pointer border border-slate-200 overflow-hidden group"
        onClick={handleTimelineClick}
      >
        {/* Progress Bar */}
        <div 
          className="absolute top-0 left-0 h-full bg-slate-200/50 transition-all duration-100 ease-linear"
          style={{ width: `${(currentTime / duration) * 100}%` }}
        />

        {/* Playhead Line */}
        <div 
          className="absolute top-0 w-0.5 h-full bg-studio-highlight z-20 shadow-[0_0_10px_rgba(14,165,233,0.5)]"
          style={{ left: `${(currentTime / duration) * 100}%` }}
        />

        {/* Event Markers */}
        {events.map((event) => {
          const time = parseTimestamp(event.timestamp);
          const position = (time / duration) * 100;
          
          if (isNaN(position) || position < 0 || position > 100) return null;

          return (
            <div
              key={event.id}
              className="absolute top-1/2 -translate-y-1/2 w-3 h-3 -ml-1.5 rounded-full z-10 hover:scale-125 transition-transform cursor-help group/marker"
              style={{ 
                left: `${position}%`,
                backgroundColor: event.status === 'ready' ? '#10b981' : '#cbd5e1',
                border: '2px solid white',
                boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
              }}
            >
              {/* Tooltip */}
              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-max max-w-[200px] px-2 py-1 bg-slate-800 text-white text-[10px] rounded opacity-0 group-hover/marker:opacity-100 pointer-events-none transition-opacity z-30">
                <p className="font-bold">{event.timestamp}</p>
                <p className="truncate">{event.description}</p>
                <div className="absolute bottom-[-4px] left-1/2 -translate-x-1/2 border-l-4 border-r-4 border-t-4 border-l-transparent border-r-transparent border-t-slate-800"></div>
              </div>
            </div>
          );
        })}
      </div>
      
      <div className="mt-2 flex items-center justify-center gap-4">
         <div className="flex items-center gap-2 text-[10px] text-slate-400">
            <div className="w-2 h-2 rounded-full bg-emerald-500 border border-white shadow-sm"></div>
            <span>Generated Sound</span>
         </div>
         <div className="flex items-center gap-2 text-[10px] text-slate-400">
            <div className="w-2 h-2 rounded-full bg-slate-300 border border-white shadow-sm"></div>
            <span>Processing</span>
         </div>
      </div>
    </div>
  );
};

export default Timeline;
