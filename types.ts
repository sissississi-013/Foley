export enum AgentRole {
  SPOTTER = 'Spotter',
  DIRECTOR = 'Director',
  ENGINE = 'Hybrid Engine',
  QC = 'QC Reviewer'
}

export enum SoundSource {
  MONGODB = 'MongoDB Atlas (Vector Match)',
  ELEVENLABS = 'ElevenLabs (Generated)',
  PENDING = 'Pending...'
}

export interface SoundLayers {
  spot: string;
  texture: string;
  vibe: string;
}

export interface SoundEvent {
  id: string;
  timestamp: string; // "MM:SS" format or seconds
  description: string;
  layers?: SoundLayers;
  source?: SoundSource;
  status: 'detected' | 'directing' | 'sourcing' | 'ready' | 'reviewing' | 'rejected';
  confidence: number;
  audioUrl?: string; // URL to the generated/retrieved audio file
  qcFeedback?: string; // Feedback from QC reviewer if rejected
  regenerationCount?: number; // How many times this sound was regenerated
  userFeedback?: string; // Manual feedback from user for regeneration
}

export interface LogEntry {
  id: string;
  role: AgentRole;
  message: string;
  timestamp: number;
  type: 'info' | 'success' | 'process';
}

export type ProcessingState = 'idle' | 'uploading' | 'analyzing' | 'directing' | 'generating' | 'reviewing' | 'complete';
