import React from 'react';
import { AgentRole, ProcessingState } from '../types';
import AgentCard from './AgentCard';
import { ArrowRight, FileJson, Database, Zap } from 'lucide-react';

interface AgentOrchestratorProps {
  activeAgent: AgentRole | null;
  state: ProcessingState;
  statusMessage: string;
}

const AgentOrchestrator: React.FC<AgentOrchestratorProps> = ({ activeAgent, state, statusMessage }) => {
  
  // Helper to determine if a connection line should be active
  const isConnectionActive = (from: AgentRole, to: AgentRole) => {
    if (from === AgentRole.SPOTTER && to === AgentRole.DIRECTOR) {
      return state === 'directing';
    }
    if (from === AgentRole.DIRECTOR && to === AgentRole.ENGINE) {
      return state === 'generating';
    }
    return false;
  };

  // Helper to determine if a connection was completed (to keep it lit or styled differently)
  const isConnectionComplete = (targetStage: ProcessingState) => {
    const stages: ProcessingState[] = ['idle', 'uploading', 'analyzing', 'directing', 'generating', 'complete'];
    return stages.indexOf(state) > stages.indexOf(targetStage);
  };

  return (
    <div className="w-full h-full flex items-center justify-center px-8 relative">
      
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
      <div className="flex-1 h-16 flex flex-col items-center justify-center relative -mx-2 z-0">
        {/* The Pipe */}
        <div className={`
          w-full h-2 rounded-full transition-all duration-500
          ${isConnectionActive(AgentRole.SPOTTER, AgentRole.DIRECTOR) ? 'bg-blue-100 data-pipe-active' : 'bg-slate-100'}
          ${isConnectionComplete('directing') ? 'bg-blue-200' : ''}
        `}></div>
        
        {/* The Data Payload Label */}
        <div className={`
            absolute -top-2 bg-white px-2 py-1 rounded-md border text-[10px] font-mono font-bold flex items-center gap-1 transition-all duration-300
            ${isConnectionActive(AgentRole.SPOTTER, AgentRole.DIRECTOR) 
              ? 'border-blue-300 text-blue-600 scale-110 shadow-lg translate-y-0 opacity-100' 
              : 'border-slate-200 text-slate-300 scale-90 translate-y-2 opacity-50'}
        `}>
           <FileJson className="w-3 h-3" />
           <span>EVENTS JSON</span>
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
      <div className="flex-1 h-16 flex flex-col items-center justify-center relative -mx-2 z-0">
         {/* The Pipe */}
         <div className={`
          w-full h-2 rounded-full transition-all duration-500
          ${isConnectionActive(AgentRole.DIRECTOR, AgentRole.ENGINE) ? 'bg-emerald-100 data-pipe-active' : 'bg-slate-100'}
          ${isConnectionComplete('generating') ? 'bg-emerald-200' : ''}
        `}></div>

         {/* The Data Payload Label */}
        <div className={`
            absolute -top-2 bg-white px-2 py-1 rounded-md border text-[10px] font-mono font-bold flex items-center gap-1 transition-all duration-300
            ${isConnectionActive(AgentRole.DIRECTOR, AgentRole.ENGINE) 
              ? 'border-emerald-300 text-emerald-600 scale-110 shadow-lg translate-y-0 opacity-100' 
              : 'border-slate-200 text-slate-300 scale-90 translate-y-2 opacity-50'}
        `}>
           <Database className="w-3 h-3" />
           <span>VECTOR QUERY</span>
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
      </div>

    </div>
  );
};

export default AgentOrchestrator;
