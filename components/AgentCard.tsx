import React from 'react';
import { AgentRole } from '../types';
import { Eye, Clapperboard, Database, Activity, ShieldCheck } from 'lucide-react';

interface AgentCardProps {
  role: AgentRole;
  isActive: boolean;
  statusMessage: string;
  icon?: React.ReactNode;
}

const AgentCard: React.FC<AgentCardProps> = ({ role, isActive, statusMessage }) => {
  
  const getIcon = () => {
    switch (role) {
      case AgentRole.SPOTTER: return <Eye className="w-5 h-5" />;
      case AgentRole.DIRECTOR: return <Clapperboard className="w-5 h-5" />;
      case AgentRole.ENGINE: return <Database className="w-5 h-5" />;
      case AgentRole.QC: return <ShieldCheck className="w-5 h-5" />;
      default: return <Activity className="w-5 h-5" />;
    }
  };

  const getColor = () => {
    switch (role) {
      case AgentRole.SPOTTER: return 'border-blue-200 text-blue-600 bg-blue-50';
      case AgentRole.DIRECTOR: return 'border-purple-200 text-purple-600 bg-purple-50';
      case AgentRole.ENGINE: return 'border-emerald-200 text-emerald-600 bg-emerald-50';
      case AgentRole.QC: return 'border-amber-200 text-amber-600 bg-amber-50';
      default: return 'border-slate-200 text-slate-500 bg-slate-50';
    }
  };

  const getActiveStyles = () => {
     switch (role) {
      case AgentRole.SPOTTER: return 'shadow-xl shadow-blue-200/50 ring-1 ring-blue-400 border-blue-400';
      case AgentRole.DIRECTOR: return 'shadow-xl shadow-purple-200/50 ring-1 ring-purple-400 border-purple-400';
      case AgentRole.ENGINE: return 'shadow-xl shadow-emerald-200/50 ring-1 ring-emerald-400 border-emerald-400';
      case AgentRole.QC: return 'shadow-xl shadow-amber-200/50 ring-1 ring-amber-400 border-amber-400';
      default: return 'shadow-xl shadow-slate-200';
    }
  }

  return (
    <div className={`
      relative p-3 rounded-xl border bg-white transition-all duration-300 min-w-[140px]
      ${isActive ? `scale-105 ${getActiveStyles()}` : 'border-studio-700 text-slate-400'}
    `}>
      <div className="flex items-center gap-2 mb-1">
        <div className={`p-1.5 rounded-lg ${isActive ? getColor() : 'bg-slate-100 text-slate-400'}`}>
          {getIcon()}
        </div>
        <div>
          <h3 className={`font-bold text-xs tracking-wide uppercase ${isActive ? 'text-slate-800' : 'text-slate-400'}`}>{role}</h3>
          <p className="text-[10px] font-mono opacity-80 text-slate-500">{isActive ? 'ACTIVE' : 'STANDBY'}</p>
        </div>
      </div>
      <div className="h-8 flex items-center">
        <p className={`text-[10px] leading-tight ${isActive ? 'text-slate-700 font-medium' : 'text-slate-400'}`}>
          {isActive ? statusMessage : 'Waiting...'}
        </p>
      </div>

      {/* Active Indicator Line */}
      {isActive && (
        <div className="absolute bottom-0 left-0 w-full h-0.5 bg-gradient-to-r from-transparent via-current to-transparent opacity-50 text-current" />
      )}
    </div>
  );
};

export default AgentCard;