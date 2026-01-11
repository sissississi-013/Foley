import React from 'react';
import { SoundEvent, SoundSource } from '../types';
import { Clock, Volume2, Sparkles, Database, PlayCircle, AlertTriangle, RefreshCw, CheckCircle, Edit3 } from 'lucide-react';

interface EventListProps {
  events: SoundEvent[];
  onPlayPreview: (event: SoundEvent) => void;
  onEditSound?: (event: SoundEvent) => void;
}

const EventList: React.FC<EventListProps> = ({ events, onPlayPreview, onEditSound }) => {
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
        <div key={event.id} className={`
          flex items-start justify-between p-4 bg-white border rounded-lg hover:shadow-sm transition-all group
          ${event.status === 'rejected' ? 'border-red-300 bg-red-50/30' : 'border-studio-700 hover:border-studio-highlight/50'}
          ${event.status === 'reviewing' ? 'border-amber-300 bg-amber-50/30' : ''}
        `}>

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
            {event.status === 'rejected' && (
              <AlertTriangle className="w-6 h-6 text-red-500" />
            )}
            {event.status === 'reviewing' && (
              <RefreshCw className="w-6 h-6 text-amber-500 animate-spin" />
            )}
          </div>

          {/* Description & Layers */}
          <div className="flex-1 px-4">
            <div className="flex items-center gap-2 mb-2">
               <span className="text-md text-slate-800 font-bold">
                 {event.description}
               </span>
               {!event.layers && <span className="text-xs text-slate-400 animate-pulse">(Analyzing...)</span>}
               {event.regenerationCount && event.regenerationCount > 0 && (
                 <span className="text-[10px] bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded font-bold">
                   REGEN x{event.regenerationCount}
                 </span>
               )}
            </div>

            {/* QC Feedback */}
            {event.qcFeedback && event.status === 'rejected' && (
              <div className="mb-2 p-2 bg-red-50 border border-red-200 rounded text-xs text-red-700 flex items-start gap-2">
                <AlertTriangle className="w-3 h-3 mt-0.5 flex-shrink-0" />
                <span>{event.qcFeedback}</span>
              </div>
            )}

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
             {event.status === 'rejected' && (
               <span className="flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-bold bg-red-100 border border-red-200 text-red-700">
                 <AlertTriangle className="w-3 h-3" />
                 REJECTED
               </span>
             )}
             {event.status === 'reviewing' && (
               <span className="flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-bold bg-amber-100 border border-amber-200 text-amber-700">
                 <RefreshCw className="w-3 h-3 animate-spin" />
                 REVIEWING
               </span>
             )}
             {event.source && event.status === 'ready' && (
               <>
                 <span className={`
                   flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold border shadow-sm
                   ${event.source === SoundSource.MONGODB
                     ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                     : 'bg-purple-50 border-purple-200 text-purple-700'}
                 `}>
                   {event.source === SoundSource.MONGODB ? <Database className="w-3 h-3"/> : <Sparkles className="w-3 h-3"/>}
                   {event.source === SoundSource.MONGODB ? 'ATLAS' : 'GEN'}
                 </span>
                 <span className="flex items-center gap-1 text-[10px] text-emerald-600">
                   <CheckCircle className="w-3 h-3" />
                   QC PASS
                 </span>
                 {onEditSound && (
                   <button
                     onClick={() => onEditSound(event)}
                     className="flex items-center gap-1 px-2 py-1 mt-1 rounded text-[10px] font-bold bg-indigo-50 border border-indigo-200 text-indigo-600 hover:bg-indigo-100 transition-colors"
                   >
                     <Edit3 className="w-3 h-3" />
                     EDIT
                   </button>
                 )}
               </>
             )}
             {!event.source && event.status !== 'rejected' && event.status !== 'reviewing' && (
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
