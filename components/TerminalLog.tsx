import React, { useEffect, useRef } from 'react';
import { LogEntry, AgentRole } from '../types';

interface TerminalLogProps {
  logs: LogEntry[];
}

const TerminalLog: React.FC<TerminalLogProps> = ({ logs }) => {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  const getRoleColor = (role: AgentRole) => {
    switch (role) {
      case AgentRole.SPOTTER: return 'text-blue-600';
      case AgentRole.DIRECTOR: return 'text-purple-600';
      case AgentRole.ENGINE: return 'text-emerald-600';
      default: return 'text-slate-500';
    }
  };

  return (
    <div className="h-full flex flex-col font-mono text-xs bg-white rounded-lg border border-studio-700 shadow-sm overflow-hidden">
      <div className="px-4 py-2 bg-slate-50 border-b border-studio-700 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
        System Logs
      </div>
      <div className="flex-1 overflow-y-auto p-4 space-y-2 scrollbar-hide">
        {logs.map((log) => (
          <div key={log.id} className="flex gap-3 animate-in fade-in slide-in-from-bottom-2 duration-300">
            <span className="text-slate-400 shrink-0 select-none">
              [{new Date(log.timestamp).toLocaleTimeString([], { hour12: false, hour: '2-digit', minute:'2-digit', second:'2-digit' })}]
            </span>
            <span className={`font-bold shrink-0 w-24 ${getRoleColor(log.role)}`}>
              {log.role}:
            </span>
            <span className="text-slate-700 break-words">
              {log.message}
            </span>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>
    </div>
  );
};

export default TerminalLog;