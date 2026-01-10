import React from 'react';
import { SoundEvent, SoundSource } from '../types';
import { Clock, Volume2, Sparkles, Database, Layers, PlayCircle } from 'lucide-react';

interface EventListProps {
  events: SoundEvent[];
  onPlayPreview: (event: SoundEvent) => void;
}

const EventList: React.FC<EventListProps> = ({ events, onPlayPreview }) => {
  if (events.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-slate-400 border border-dashed border-studio-700 rounded-xl p-8 bg-white/50">
        <Volume2 className="w-12 h-12 mb-4 opacity-30" />
        <p>No sound events detected yet.</p>
      </div>
    );
  }

  return (
    <div className="w-full space-y-3 pb-20">
      {events.map((event) => (
        <div key={event.id} className="flex items-start justify-between p-4 bg-white border border-studio-700 rounded-lg hover:border-studio-highlight/50 hover:shadow-sm transition-all group">
          
          {/* Timestamp */}
          <div className="flex flex-col items-center gap-2 min-w-[60px] mt-1">
            <div className="flex items-center gap-1 text-studio-highlight font-mono font-bold">
              <Clock className="w-3 h-3" />
              <span>{event.timestamp}</span>
            </div>
            {event.status === 'ready' && (
              <button 
                onClick={() => onPlayPreview(event)}
                className="text-slate-300 hover:text-emerald-500 transition-colors"
                title="Preview Sound"
              >
                <PlayCircle className="w-8 h-8" />
              </button>
            )}
          </div>

          {/* Description & Layers */}
          <div className="flex-1 px-4">
            <div className="flex items-center gap-2 mb-2">
               <span className="text-md text-slate-800 font-bold">
                 {event.description}
               </span>
               {!event.layers && <span className="text-xs text-slate-400 animate-pulse">(Analyzing...)</span>}
            </div>
            
            {event.layers && (
              <div className="grid gap-2 p-3 bg-slate-50 rounded-md border border-slate-100">
                <div className="flex items-center gap-3">
                   <span className="w-16 text-[10px] uppercase font-bold text-slate-400 tracking-wider text-right">Spot</span>
                   <span className="text-xs font-semibold text-slate-700">{event.layers.spot}</span>
                </div>
                <div className="flex items-center gap-3">
                   <span className="w-16 text-[10px] uppercase font-bold text-slate-400 tracking-wider text-right">Texture</span>
                   <span className="text-xs italic text-slate-600 font-serif">{event.layers.texture}</span>
                </div>
                <div className="flex items-center gap-3">
                   <span className="w-16 text-[10px] uppercase font-bold text-slate-400 tracking-wider text-right">Vibe</span>
                   <span className="text-[10px] font-bold text-purple-600 bg-purple-50 px-2 py-0.5 rounded-full border border-purple-100">
                     {event.layers.vibe}
                   </span>
                </div>
              </div>
            )}
          </div>

          {/* Source/Status Badge */}
          <div className="min-w-[100px] flex flex-col items-end gap-2 mt-1">
             {event.source ? (
               <span className={`
                 flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold border shadow-sm
                 ${event.source === SoundSource.MONGODB 
                   ? 'bg-emerald-50 border-emerald-200 text-emerald-700' 
                   : 'bg-purple-50 border-purple-200 text-purple-700'}
               `}>
                 {event.source === SoundSource.MONGODB ? <Database className="w-3 h-3"/> : <Sparkles className="w-3 h-3"/>}
                 {event.source === SoundSource.MONGODB ? 'ATLAS' : 'GEN'}
               </span>
             ) : (
               <div className="flex items-center gap-1 text-xs text-slate-400">
                  <div className="w-2 h-2 rounded-full bg-slate-300 animate-pulse"></div>
                  processing
               </div>
             )}
          </div>
        </div>
      ))}
    </div>
  );
};

export default EventList;
