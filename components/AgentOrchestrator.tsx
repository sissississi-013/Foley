import React from 'react';
import { AgentRole, ProcessingState } from '../types';
import AgentCard from './AgentCard';
import { FileJson, Database, CheckCircle, RotateCcw } from 'lucide-react';

interface AgentOrchestratorProps {
  activeAgent: AgentRole | null;
  state: ProcessingState;
  statusMessage: string;
  rejectedCount?: number; // Number of sounds that failed QC
}

const AgentOrchestrator: React.FC<AgentOrchestratorProps> = ({
  activeAgent,
  state,
  statusMessage,
  rejectedCount = 0
}) => {

  // Helper to determine if a connection line should be active
  const isConnectionActive = (from: AgentRole, to: AgentRole) => {
    if (from === AgentRole.SPOTTER && to === AgentRole.DIRECTOR) {
      return state === 'directing';
    }
    if (from === AgentRole.DIRECTOR && to === AgentRole.ENGINE) {
      return state === 'generating';
    }
    if (from === AgentRole.ENGINE && to === AgentRole.QC) {
      return state === 'reviewing';
    }
    return false;
  };

  // Helper to determine if a connection was completed
  const isConnectionComplete = (targetStage: ProcessingState) => {
    const stages: ProcessingState[] = ['idle', 'uploading', 'analyzing', 'directing', 'generating', 'reviewing', 'complete'];
    return stages.indexOf(state) > stages.indexOf(targetStage);
  };

  // Check if QC is sending back to Engine (rejection loop)
  const isRejectionLoop = state === 'generating' && rejectedCount > 0;

  return (
    <div className="w-full h-full flex items-center justify-center px-6 relative">

      {/* 1. SPOTTER NODE */}
      <div className="relative z-10">
        <AgentCard
          role={AgentRole.SPOTTER}
          isActive={activeAgent === AgentRole.SPOTTER}
          statusMessage={activeAgent === AgentRole.SPOTTER ? statusMessage : 'Ready'}
        />
        {state === 'analyzing' && (
          <div className="absolute -top-3 -right-3">
             <span className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-blue-500"></span>
            </span>
          </div>
        )}
      </div>

      {/* CONNECTION: SPOTTER -> DIRECTOR */}
      <div className="flex-1 h-16 flex flex-col items-center justify-center relative -mx-1 z-0 max-w-[80px]">
        <div className={`
          w-full h-1.5 rounded-full transition-all duration-500
          ${isConnectionActive(AgentRole.SPOTTER, AgentRole.DIRECTOR) ? 'bg-blue-100 data-pipe-active' : 'bg-slate-100'}
          ${isConnectionComplete('directing') ? 'bg-blue-200' : ''}
        `}></div>

        <div className={`
            absolute -top-1 bg-white px-1.5 py-0.5 rounded border text-[8px] font-mono font-bold flex items-center gap-1 transition-all duration-300
            ${isConnectionActive(AgentRole.SPOTTER, AgentRole.DIRECTOR)
              ? 'border-blue-300 text-blue-600 scale-110 shadow-lg'
              : 'border-slate-200 text-slate-300 scale-90 opacity-50'}
        `}>
           <FileJson className="w-2.5 h-2.5" />
           <span>EVENTS</span>
        </div>
      </div>

      {/* 2. DIRECTOR NODE */}
      <div className="relative z-10">
        <AgentCard
          role={AgentRole.DIRECTOR}
          isActive={activeAgent === AgentRole.DIRECTOR}
          statusMessage={activeAgent === AgentRole.DIRECTOR ? statusMessage : 'Waiting'}
        />
        {state === 'directing' && (
          <div className="absolute -top-3 -right-3">
             <span className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-purple-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-purple-500"></span>
            </span>
          </div>
        )}
      </div>

      {/* CONNECTION: DIRECTOR -> ENGINE */}
      <div className="flex-1 h-16 flex flex-col items-center justify-center relative -mx-1 z-0 max-w-[80px]">
         <div className={`
          w-full h-1.5 rounded-full transition-all duration-500
          ${isConnectionActive(AgentRole.DIRECTOR, AgentRole.ENGINE) ? 'bg-emerald-100 data-pipe-active' : 'bg-slate-100'}
          ${isConnectionComplete('generating') ? 'bg-emerald-200' : ''}
        `}></div>

        <div className={`
            absolute -top-1 bg-white px-1.5 py-0.5 rounded border text-[8px] font-mono font-bold flex items-center gap-1 transition-all duration-300
            ${isConnectionActive(AgentRole.DIRECTOR, AgentRole.ENGINE)
              ? 'border-emerald-300 text-emerald-600 scale-110 shadow-lg'
              : 'border-slate-200 text-slate-300 scale-90 opacity-50'}
        `}>
           <Database className="w-2.5 h-2.5" />
           <span>QUERY</span>
        </div>
      </div>

      {/* 3. ENGINE NODE */}
      <div className="relative z-10">
        <AgentCard
          role={AgentRole.ENGINE}
          isActive={activeAgent === AgentRole.ENGINE}
          statusMessage={activeAgent === AgentRole.ENGINE ? statusMessage : 'Standby'}
        />
        {state === 'generating' && (
          <div className="absolute -top-3 -right-3">
             <span className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
            </span>
          </div>
        )}
        {/* Rejection indicator */}
        {isRejectionLoop && (
          <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 bg-amber-100 text-amber-700 text-[8px] px-2 py-0.5 rounded-full font-bold flex items-center gap-1 border border-amber-300">
            <RotateCcw className="w-2.5 h-2.5" />
            REGEN
          </div>
        )}
      </div>

      {/* CONNECTION: ENGINE -> QC */}
      <div className="flex-1 h-16 flex flex-col items-center justify-center relative -mx-1 z-0 max-w-[80px]">
         <div className={`
          w-full h-1.5 rounded-full transition-all duration-500
          ${isConnectionActive(AgentRole.ENGINE, AgentRole.QC) ? 'bg-amber-100 data-pipe-active' : 'bg-slate-100'}
          ${isConnectionComplete('reviewing') ? 'bg-amber-200' : ''}
        `}></div>

        <div className={`
            absolute -top-1 bg-white px-1.5 py-0.5 rounded border text-[8px] font-mono font-bold flex items-center gap-1 transition-all duration-300
            ${isConnectionActive(AgentRole.ENGINE, AgentRole.QC)
              ? 'border-amber-300 text-amber-600 scale-110 shadow-lg'
              : 'border-slate-200 text-slate-300 scale-90 opacity-50'}
        `}>
           <CheckCircle className="w-2.5 h-2.5" />
           <span>REVIEW</span>
        </div>
      </div>

      {/* 4. QC REVIEWER NODE */}
      <div className="relative z-10">
        <AgentCard
          role={AgentRole.QC}
          isActive={activeAgent === AgentRole.QC}
          statusMessage={activeAgent === AgentRole.QC ? statusMessage : 'Standby'}
        />
        {state === 'reviewing' && (
          <div className="absolute -top-3 -right-3">
             <span className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-amber-500"></span>
            </span>
          </div>
        )}
        {/* Show rejected count badge */}
        {rejectedCount > 0 && state === 'reviewing' && (
          <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 bg-red-100 text-red-700 text-[8px] px-2 py-0.5 rounded-full font-bold border border-red-300">
            {rejectedCount} REJECTED
          </div>
        )}
      </div>

    </div>
  );
};

export default AgentOrchestrator;
