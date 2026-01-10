export enum AgentRole {
  SPOTTER = 'Spotter',
  DIRECTOR = 'Director',
  ENGINE = 'Hybrid Engine'
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
  status: 'detected' | 'directing' | 'sourcing' | 'ready';
  confidence: number;
  audioUrl?: string; // URL to the generated/retrieved audio file
}

export interface LogEntry {
  id: string;
  role: AgentRole;
  message: string;
  timestamp: number;
  type: 'info' | 'success' | 'process';
}

export type ProcessingState = 'idle' | 'uploading' | 'analyzing' | 'directing' | 'generating' | 'complete';
