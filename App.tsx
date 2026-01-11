import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Upload, Play, ArrowRight, Video,
  Wand2, Settings, Download, RefreshCw, FileAudio, FileVideo
} from 'lucide-react';
import { AgentRole, SoundEvent, LogEntry, ProcessingState, SoundSource } from './types';
import AgentOrchestrator from './components/AgentOrchestrator';
import EventList from './components/EventList';
import EditSoundModal from './components/EditSoundModal';
import TerminalLog from './components/TerminalLog';
import Timeline from './components/Timeline';
import { runSpotterAgent, runDirectorAgent, runQCReviewerAgent, fileToGenerativePart } from './services/geminiService';
import { produceSoundAsset } from './services/soundEngine';

const MAX_REGENERATION_ATTEMPTS = 2; // Max times to regenerate a rejected sound

const App: React.FC = () => {
  // State
  const [state, setState] = useState<ProcessingState>('idle');
  const [file, setFile] = useState<File | null>(null);
  const [vibe, setVibe] = useState<string>("Cinematic Realism");
  const [events, setEvents] = useState<SoundEvent[]>([]);
  const [spottedCache, setSpottedCache] = useState<SoundEvent[] | null>(null); // Cache for rapid re-directing
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [activeAgent, setActiveAgent] = useState<AgentRole | null>(null);
  const [agentMessage, setAgentMessage] = useState<string>("");
  const [videoPreview, setVideoPreview] = useState<string | null>(null);
  const [rejectedCount, setRejectedCount] = useState<number>(0);
  
  // Video Player State
  const videoRef = useRef<HTMLVideoElement>(null);
  const [videoDuration, setVideoDuration] = useState<number>(0);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);

  // Edit Modal State
  const [editingEvent, setEditingEvent] = useState<SoundEvent | null>(null);
  const [isRegenerating, setIsRegenerating] = useState<boolean>(false);

  // Helper to add logs
  const addLog = useCallback((role: AgentRole, message: string) => {
    setLogs(prev => [...prev, {
      id: Math.random().toString(36).substr(2, 9),
      role,
      message,
      timestamp: Date.now(),
      type: 'info'
    }]);
    setAgentMessage(message);
    setActiveAgent(role);
  }, []);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      setFile(selectedFile);
      setVideoPreview(URL.createObjectURL(selectedFile));
      
      // Full Reset
      setState('idle');
      setEvents([]);
      setSpottedCache(null); // Clear cache on new file
      setLogs([]);
      addLog(AgentRole.SPOTTER, `Video loaded: ${selectedFile.name}`);
      setActiveAgent(null);
    }
  };

  const startProcessing = async () => {
    if (!file) return;

    try {
      let currentEvents = events;

      // 1. SPOTTING PHASE (Skip if cached)
      if (!spottedCache) {
        setState('analyzing');
        addLog(AgentRole.SPOTTER, "Initializing visual analysis pipeline...");
        addLog(AgentRole.SPOTTER, "Scanning for: movements, interactions, environmental sounds, emotional beats...");

        const base64Data = await fileToGenerativePart(file);
        const spottedEvents = await runSpotterAgent(base64Data, file.type);

        setSpottedCache(spottedEvents); // Save to cache
        currentEvents = spottedEvents;
        setEvents(spottedEvents);
        addLog(AgentRole.SPOTTER, `Analysis complete. Detected ${spottedEvents.length} sound events.`);
        addLog(AgentRole.SPOTTER, `→ DIRECTOR: Sending ${spottedEvents.length} events for creative direction.`);
      } else {
        // Use Cache
        addLog(AgentRole.SPOTTER, "→ DIRECTOR: Using cached analysis. Sending events directly.");
        currentEvents = [...spottedCache];
      }

      // 2. DIRECTING PHASE
      setState('directing');
      addLog(AgentRole.DIRECTOR, `← SPOTTER: Received ${currentEvents.length} events.`);
      addLog(AgentRole.DIRECTOR, `Applying "${vibe}" creative direction...`);
      addLog(AgentRole.DIRECTOR, `Generating 3-layer audio plan: Spot + Texture + Vibe...`);

      const refinedEvents = await runDirectorAgent(currentEvents, vibe);
      setEvents(refinedEvents);
      addLog(AgentRole.DIRECTOR, `Creative direction complete. Theme: "${vibe}" applied.`);
      addLog(AgentRole.DIRECTOR, `→ ENGINE: Sending ${refinedEvents.length} sound requests.`);

      // 3. ENGINE PHASE (Real Implementation)
      setState('generating');
      setActiveAgent(AgentRole.ENGINE);
      setRejectedCount(0);

      let finalEvents = [...refinedEvents];

      addLog(AgentRole.ENGINE, `← DIRECTOR: Received ${finalEvents.length} sound requests.`);
      addLog(AgentRole.ENGINE, `Initializing Hybrid Engine: MongoDB Atlas + ElevenLabs...`);

      // Generate sounds for all events
      for (let i = 0; i < finalEvents.length; i++) {
        const evt = finalEvents[i];

        const primarySound = evt.layers?.spot || evt.description;
        addLog(AgentRole.ENGINE, `[${i+1}/${finalEvents.length}] Producing: "${primarySound}"`);
        setAgentMessage(`Processing Event ${i+1}/${finalEvents.length}`);

        // Call the Hybrid Engine Service
        const result = await produceSoundAsset(primarySound, vibe);

        addLog(AgentRole.ENGINE, result.log);

        finalEvents[i].source = result.source;
        finalEvents[i].audioUrl = result.audioUrl;
        finalEvents[i].status = 'ready';
        finalEvents[i].regenerationCount = 0;

        setEvents([...finalEvents]); // Update UI progressively
      }

      // 4. QC REVIEW PHASE
      setState('reviewing');
      setActiveAgent(AgentRole.QC);
      addLog(AgentRole.ENGINE, `→ QC: Sending ${finalEvents.length} sounds for quality review.`);
      addLog(AgentRole.QC, `← ENGINE: Received ${finalEvents.length} generated sounds.`);
      addLog(AgentRole.QC, `Analyzing coherence, continuity, and "${vibe}" theme adherence...`);
      setAgentMessage("Analyzing sound quality...");

      const qcResults = await runQCReviewerAgent(finalEvents, vibe);

      // Find rejected events
      let rejectedEvents = qcResults.filter(r => !r.passed);
      setRejectedCount(rejectedEvents.length);

      if (rejectedEvents.length > 0) {
        addLog(AgentRole.QC, `Found ${rejectedEvents.length} sounds that need improvement.`);

        // Log each rejection
        rejectedEvents.forEach(r => {
          const evt = finalEvents[r.eventIndex];
          addLog(AgentRole.QC, `⚠️ [${evt.timestamp}] ${r.feedback}`);
          finalEvents[r.eventIndex].status = 'rejected';
          finalEvents[r.eventIndex].qcFeedback = r.feedback;
        });
        setEvents([...finalEvents]);

        // 5. REGENERATION LOOP
        let regenerationRound = 0;

        while (rejectedEvents.length > 0 && regenerationRound < MAX_REGENERATION_ATTEMPTS) {
          regenerationRound++;
          addLog(AgentRole.QC, `→ ENGINE: Requesting regeneration for ${rejectedEvents.length} sounds.`);

          // Switch back to Engine for regeneration
          setState('generating');
          setActiveAgent(AgentRole.ENGINE);
          addLog(AgentRole.ENGINE, `← QC: Received ${rejectedEvents.length} rejection(s). Starting round ${regenerationRound}...`);

          for (const rejection of rejectedEvents) {
            const idx = rejection.eventIndex;
            const evt = finalEvents[idx];

            // Skip if already regenerated too many times
            if ((evt.regenerationCount || 0) >= MAX_REGENERATION_ATTEMPTS) {
              addLog(AgentRole.ENGINE, `Skipping Event ${idx+1} (max attempts reached)`);
              continue;
            }

            // Use the suggested fix or modify the original query
            const improvedQuery = rejection.suggestedFix ||
              `${evt.layers?.spot || evt.description} - more ${vibe.toLowerCase()}, clearer`;

            addLog(AgentRole.ENGINE, `Regenerating Event ${idx+1}: "${improvedQuery}"...`);
            setAgentMessage(`Regenerating ${idx+1}/${rejectedEvents.length}`);

            const result = await produceSoundAsset(improvedQuery, vibe);
            addLog(AgentRole.ENGINE, result.log);

            finalEvents[idx].source = result.source;
            finalEvents[idx].audioUrl = result.audioUrl;
            finalEvents[idx].status = 'reviewing';
            finalEvents[idx].regenerationCount = (evt.regenerationCount || 0) + 1;

            setEvents([...finalEvents]);
          }

          // Re-review regenerated sounds
          setState('reviewing');
          setActiveAgent(AgentRole.QC);
          addLog(AgentRole.QC, `Re-reviewing regenerated sounds...`);

          const reReviewResults = await runQCReviewerAgent(finalEvents, vibe);
          rejectedEvents = reReviewResults.filter(r => !r.passed && finalEvents[r.eventIndex].status === 'reviewing');
          setRejectedCount(rejectedEvents.length);

          if (rejectedEvents.length === 0) {
            addLog(AgentRole.QC, `✓ All sounds now pass quality check!`);
          } else {
            addLog(AgentRole.QC, `${rejectedEvents.length} sounds still need work.`);
          }
        }

        // Mark remaining as ready (even if not perfect after max attempts)
        finalEvents = finalEvents.map(e => ({
          ...e,
          status: 'ready' as const
        }));
        setEvents([...finalEvents]);
      } else {
        addLog(AgentRole.QC, `✓ All ${finalEvents.length} sounds pass coherence check!`);
      }

      setState('complete');
      setActiveAgent(null);
      setRejectedCount(0);
      setAgentMessage("Production complete.");
      addLog(AgentRole.QC, "✓ Quality review complete. All sounds approved.");
      addLog(AgentRole.QC, `→ OUTPUT: ${finalEvents.length} sounds ready for export.`);

    } catch (error) {
      console.error(error);
      addLog(AgentRole.SPOTTER, "Critical Error in processing pipeline.");
      setState('idle');
      setActiveAgent(null);
    }
  };

  const handleReset = () => {
    setState('idle');
    setLogs([]);
    // We keep spottedCache and file, but reset visible events to the cached version
    if (spottedCache) {
      setEvents(spottedCache.map(e => ({ ...e, status: 'detected', layers: undefined, source: undefined })));
      addLog(AgentRole.SPOTTER, "Resetting for new direction. Visual analysis retained.");
    }
  };

  // --- DOWNLOADS ---
  const [isExporting, setIsExporting] = useState(false);

  const handleDownloadVideo = () => {
    if (file && videoPreview) {
       const a = document.createElement('a');
       a.href = videoPreview;
       a.download = `foley_source_${file.name}`;
       document.body.appendChild(a);
       a.click();
       document.body.removeChild(a);
    }
  }

  const handleExportCueSheet = () => {
     if (events.length === 0) return;

     const exportData = {
       project: "Foley Agent Session",
       source_file: file?.name,
       vibe: vibe,
       generated_at: new Date().toISOString(),
       events: events
     };

     const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
     const url = URL.createObjectURL(blob);
     const a = document.createElement('a');
     a.href = url;
     a.download = `foley_cuesheet_${Date.now()}.json`;
     document.body.appendChild(a);
     a.click();
     document.body.removeChild(a);
     URL.revokeObjectURL(url);
  };

  /**
   * Export video with mixed audio
   * Creates a new video file with all Foley sounds mixed in at their timestamps
   */
  const handleExportVideoWithAudio = async () => {
    if (!videoRef.current || events.length === 0 || !file) return;

    setIsExporting(true);
    addLog(AgentRole.ENGINE, "Starting video export with audio...");

    try {
      const video = videoRef.current;
      const duration = video.duration;

      // Create AudioContext for mixing
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const destination = audioCtx.createMediaStreamDestination();

      // Create offline context for rendering
      const offlineCtx = new OfflineAudioContext(2, audioCtx.sampleRate * duration, audioCtx.sampleRate);

      // Load and schedule all sound events
      const loadPromises = events.map(async (evt) => {
        if (!evt.audioUrl || evt.audioUrl === 'placeholder') return null;

        try {
          // Fetch audio data
          const response = await fetch(evt.audioUrl);
          const arrayBuffer = await response.arrayBuffer();
          const audioBuffer = await offlineCtx.decodeAudioData(arrayBuffer);

          // Schedule at the right time
          const source = offlineCtx.createBufferSource();
          source.buffer = audioBuffer;
          source.connect(offlineCtx.destination);

          const startTime = parseTimestamp(evt.timestamp);
          source.start(startTime);

          return { evt, startTime };
        } catch (e) {
          console.warn(`Failed to load audio for ${evt.timestamp}:`, e);
          return null;
        }
      });

      await Promise.all(loadPromises);
      addLog(AgentRole.ENGINE, `Loaded ${events.length} audio tracks. Rendering mix...`);

      // Render the audio mix
      const renderedBuffer = await offlineCtx.startRendering();

      // Convert to WAV
      const wavBlob = audioBufferToWav(renderedBuffer);

      // Create download link for audio (video mixing requires server-side processing)
      const audioUrl = URL.createObjectURL(wavBlob);
      const a = document.createElement('a');
      a.href = audioUrl;
      a.download = `foley_audio_${Date.now()}.wav`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(audioUrl);

      addLog(AgentRole.ENGINE, "✓ Audio track exported! Use a video editor to merge with source video.");
      addLog(AgentRole.ENGINE, "Tip: Import both files into a video editor and sync at 0:00.");

    } catch (error) {
      console.error("Export failed:", error);
      addLog(AgentRole.ENGINE, "Export failed. Check console for details.");
    } finally {
      setIsExporting(false);
    }
  };

  // Helper: Convert AudioBuffer to WAV Blob
  const audioBufferToWav = (buffer: AudioBuffer): Blob => {
    const numChannels = buffer.numberOfChannels;
    const sampleRate = buffer.sampleRate;
    const format = 1; // PCM
    const bitDepth = 16;

    const bytesPerSample = bitDepth / 8;
    const blockAlign = numChannels * bytesPerSample;

    const dataLength = buffer.length * blockAlign;
    const bufferLength = 44 + dataLength;

    const arrayBuffer = new ArrayBuffer(bufferLength);
    const view = new DataView(arrayBuffer);

    // WAV header
    const writeString = (offset: number, str: string) => {
      for (let i = 0; i < str.length; i++) {
        view.setUint8(offset + i, str.charCodeAt(i));
      }
    };

    writeString(0, 'RIFF');
    view.setUint32(4, bufferLength - 8, true);
    writeString(8, 'WAVE');
    writeString(12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, format, true);
    view.setUint16(22, numChannels, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * blockAlign, true);
    view.setUint16(32, blockAlign, true);
    view.setUint16(34, bitDepth, true);
    writeString(36, 'data');
    view.setUint32(40, dataLength, true);

    // Write audio data
    const channels: Float32Array[] = [];
    for (let i = 0; i < numChannels; i++) {
      channels.push(buffer.getChannelData(i));
    }

    let offset = 44;
    for (let i = 0; i < buffer.length; i++) {
      for (let ch = 0; ch < numChannels; ch++) {
        const sample = Math.max(-1, Math.min(1, channels[ch][i]));
        const intSample = sample < 0 ? sample * 0x8000 : sample * 0x7FFF;
        view.setInt16(offset, intSample, true);
        offset += 2;
      }
    }

    return new Blob([arrayBuffer], { type: 'audio/wav' });
  };

  // --- PREVIEW LOGIC ---

  const parseTimestamp = (ts: string) => {
    const parts = ts.split(':').map(Number);
    if (parts.length === 2) return parts[0] * 60 + parts[1];
    if (parts.length === 1) return parts[0];
    return 0;
  };

  const playSimulatedSound = () => {
    // Simple Web Audio API beep
    try {
      const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContext) return;
      const ctx = new AudioContext();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.value = 200 + Math.random() * 600; 
      osc.type = 'sine';
      gain.gain.setValueAtTime(0.1, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.00001, ctx.currentTime + 0.5);
      osc.start();
      osc.stop(ctx.currentTime + 0.5);
    } catch (e) { console.error(e); }
  };

  const playSound = (url?: string) => {
    if (url && url !== 'placeholder') {
      const audio = new Audio(url);
      audio.play().catch(e => console.error("Playback failed", e));
    } else {
      playSimulatedSound();
    }
  };

  const lastTriggeredTime = useRef<number>(-1);

  const handleTimeUpdate = () => {
    if (videoRef.current) {
      const t = videoRef.current.currentTime;
      setCurrentTime(t);

      // Check for sound triggers (simple mixer logic)
      if (state === 'complete') {
        events.forEach(evt => {
           const evtTime = parseTimestamp(evt.timestamp);
           // Trigger if we just passed the timestamp (within 0.3s window) and haven't triggered it recently
           if (t >= evtTime && t < evtTime + 0.3 && Math.abs(lastTriggeredTime.current - evtTime) > 0.5) {
             playSound(evt.audioUrl);
             lastTriggeredTime.current = evtTime;
           }
        });
      }
    }
  };

  const handleVideoLoaded = () => {
    if (videoRef.current) {
      setVideoDuration(videoRef.current.duration);
    }
  };

  const handleSeek = (time: number) => {
    if (videoRef.current) {
      videoRef.current.currentTime = time;
      setCurrentTime(time);
      lastTriggeredTime.current = -1; // Reset trigger lock
    }
  };

  const handlePlayPreview = (event: SoundEvent) => {
    addLog(AgentRole.ENGINE, `Previewing asset: ${event.description}`);
    playSound(event.audioUrl);
  };

  // Manual edit/regenerate handler
  const handleManualRegenerate = async (eventId: string, feedback: string) => {
    setIsRegenerating(true);

    try {
      const eventIndex = events.findIndex(e => e.id === eventId);
      if (eventIndex === -1) return;

      const evt = events[eventIndex];
      const updatedEvents = [...events];

      // Combine original query with user feedback
      const improvedQuery = `${evt.layers?.spot || evt.description}. User feedback: ${feedback}`;

      addLog(AgentRole.ENGINE, `← USER: Manual edit request for [${evt.timestamp}]`);
      addLog(AgentRole.ENGINE, `Feedback: "${feedback}"`);
      addLog(AgentRole.ENGINE, `→ DIRECTOR: Consulting on improved sound design...`);

      // Mark as regenerating
      updatedEvents[eventIndex] = { ...evt, status: 'reviewing' };
      setEvents(updatedEvents);

      // Generate new sound with feedback
      addLog(AgentRole.DIRECTOR, `← ENGINE: Received edit request.`);
      addLog(AgentRole.DIRECTOR, `Adjusting sound design based on feedback...`);

      const result = await produceSoundAsset(improvedQuery, vibe);

      addLog(AgentRole.ENGINE, result.log);
      addLog(AgentRole.ENGINE, `→ QC: Submitting regenerated sound for review...`);

      // Update the event
      updatedEvents[eventIndex] = {
        ...evt,
        audioUrl: result.audioUrl,
        source: result.source,
        status: 'ready',
        regenerationCount: (evt.regenerationCount || 0) + 1,
        userFeedback: feedback
      };

      setEvents(updatedEvents);
      setEditingEvent(null);
      addLog(AgentRole.QC, `✓ Manual edit applied successfully.`);

    } catch (error) {
      console.error("Manual regeneration failed:", error);
      addLog(AgentRole.ENGINE, `Manual regeneration failed. Please try again.`);
    } finally {
      setIsRegenerating(false);
    }
  };

  return (
    <div className="flex h-screen w-screen bg-studio-900 text-slate-800 overflow-hidden">
      
      {/* LEFT SIDEBAR - Controls */}
      <div className="w-80 bg-studio-800 border-r border-studio-700 flex flex-col z-20 shadow-xl shadow-slate-200/50">
        <div className="p-6 border-b border-studio-700 bg-studio-800">
          <img src="/logo.png" alt="Foley" className="h-10 object-contain" />
          <p className="text-xs text-slate-400 uppercase tracking-widest mt-2 font-mono">Virtual Sound Studio</p>
        </div>

        <div className="p-6 space-y-8 flex-1 overflow-y-auto">
          {/* Step 1: Upload */}
          <div className="space-y-3">
            <label className="text-xs font-bold text-slate-400 uppercase tracking-wide">1. Source Material</label>
            <div className="relative group cursor-pointer">
              <input 
                type="file" 
                accept="video/*" 
                onChange={handleFileUpload} 
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
              />
              <div className={`
                border-2 border-dashed rounded-xl p-6 transition-all text-center
                ${file ? 'border-studio-accent bg-emerald-50' : 'border-studio-700 hover:border-studio-highlight hover:bg-slate-50'}
              `}>
                 {file ? (
                   <div className="text-studio-accent flex items-center justify-center gap-2 font-mono text-sm font-bold">
                     <Video className="w-4 h-4" />
                     {file.name.substring(0, 15)}...
                   </div>
                 ) : (
                   <div className="text-slate-400 flex flex-col items-center gap-2">
                     <Upload className="w-6 h-6 mb-1" />
                     <span className="text-xs">Drop silent video here</span>
                   </div>
                 )}
              </div>
            </div>
          </div>

          {/* Step 2: Vibe */}
          <div className="space-y-3">
             <label className="text-xs font-bold text-slate-400 uppercase tracking-wide">2. Direction</label>
             <div className="relative">
                <Wand2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input 
                  type="text"
                  value={vibe}
                  onChange={(e) => setVibe(e.target.value)}
                  // We now allow editing vibe if state is idle OR complete (for re-runs)
                  disabled={state !== 'idle' && state !== 'complete'}
                  className="w-full bg-studio-900 border border-studio-700 rounded-lg py-2 pl-10 pr-4 text-sm text-slate-700 focus:outline-none focus:border-studio-highlight focus:ring-1 focus:ring-studio-highlight transition-all"
                  placeholder="e.g. Action Movie, Horror..."
                />
             </div>
             <div className="flex gap-2 flex-wrap">
               {['Horror', 'Comedy', 'Sci-Fi', 'ASMR'].map(tag => (
                 <button 
                   key={tag}
                   onClick={() => setVibe(tag)}
                   disabled={state !== 'idle' && state !== 'complete'}
                   className="px-2 py-1 bg-studio-900 border border-studio-700 rounded text-xs text-slate-600 hover:bg-studio-700 hover:text-slate-800 transition-colors"
                 >
                   {tag}
                 </button>
               ))}
             </div>
          </div>
          
          {/* Action Button */}
          <div className="space-y-2">
            {state === 'complete' ? (
               <button 
                onClick={handleReset}
                className="w-full py-4 rounded-xl font-bold flex items-center justify-center gap-2 transition-all shadow-lg bg-studio-700 text-slate-600 hover:bg-slate-300"
              >
                <RefreshCw className="w-5 h-5" />
                NEW TAKE / RESET
              </button>
            ) : null}

            <button 
              onClick={startProcessing}
              disabled={!file || (state !== 'idle' && state !== 'complete')}
              className={`
                w-full py-4 rounded-xl font-bold flex items-center justify-center gap-2 transition-all shadow-lg
                ${!file || (state !== 'idle' && state !== 'complete')
                  ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                  : 'bg-studio-accent text-white hover:bg-emerald-600 hover:shadow-emerald-200'
                }
              `}
            >
              {state === 'idle' || state === 'complete' ? (
                <>
                  <Play className="w-5 h-5 fill-current" />
                  {spottedCache ? 'RE-GENERATE AUDIO' : 'INITIALIZE CREW'}
                </>
              ) : (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  PRODUCTION IN PROGRESS
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* MAIN CONTENT AREA */}
      <div className="flex-1 flex flex-col h-full overflow-hidden relative">
        
        {/* Background Grid Pattern */}
        <div className="absolute inset-0 opacity-[0.4] pointer-events-none" 
             style={{ backgroundImage: 'radial-gradient(#cbd5e1 1px, transparent 1px)', backgroundSize: '24px 24px' }}>
        </div>

        {/* Top Agent Orchestrator Bar */}
        <div className="h-48 border-b border-studio-700 bg-white/60 backdrop-blur-md flex items-center z-10">
          <AgentOrchestrator
            activeAgent={activeAgent}
            state={state}
            statusMessage={agentMessage}
            rejectedCount={rejectedCount}
          />
        </div>

        {/* Workspace Split */}
        <div className="flex-1 flex overflow-hidden">
          
          {/* Main Visualizer (Video + List) */}
          <div className="flex-1 flex flex-col p-8 overflow-y-auto">
            
            <div className="mb-6 flex items-center justify-between">
              <h2 className="text-xl font-bold text-slate-800 tracking-tight">Production Timeline</h2>
              
              {/* EXPORT ACTIONS */}
              <div className="flex gap-2">
                 <button 
                  onClick={handleDownloadVideo}
                  disabled={!file}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold border border-studio-700 text-slate-500 hover:bg-white hover:text-slate-800 transition-colors disabled:opacity-50"
                 >
                   <FileVideo className="w-3 h-3" /> Source Video
                 </button>
                 {state === 'complete' && (
                  <>
                    <button
                      onClick={handleExportVideoWithAudio}
                      disabled={isExporting}
                      className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold bg-studio-accent text-white hover:bg-emerald-600 transition-colors shadow-sm disabled:opacity-50"
                    >
                      {isExporting ? (
                        <>
                          <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                          Exporting...
                        </>
                      ) : (
                        <>
                          <Download className="w-3 h-3" /> Export Audio Track
                        </>
                      )}
                    </button>
                    <button
                      onClick={handleExportCueSheet}
                      className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold bg-studio-highlight text-white hover:bg-sky-600 transition-colors shadow-sm"
                    >
                      <FileAudio className="w-3 h-3" /> Cue Sheet (.json)
                    </button>
                  </>
                 )}
              </div>
            </div>

            {videoPreview && (
              <div className="mb-8 p-4 rounded-xl bg-slate-50 border border-studio-700 shadow-xl relative group">
                <div className="relative flex justify-center bg-black rounded-lg overflow-hidden max-h-[400px]">
                  <video 
                    ref={videoRef}
                    src={videoPreview} 
                    controls 
                    className="w-full h-full object-contain" 
                    onTimeUpdate={handleTimeUpdate}
                    onLoadedMetadata={handleVideoLoaded}
                    onPlay={() => setIsPlaying(true)}
                    onPause={() => setIsPlaying(false)}
                  />
                  {state === 'analyzing' && (
                    <div className="absolute inset-0 bg-white/50 backdrop-blur-sm animate-pulse pointer-events-none flex items-center justify-center z-20">
                      <div className="bg-white px-4 py-2 rounded-lg text-studio-accent font-mono text-sm border border-studio-accent shadow-lg">
                        SCANNING FRAMES...
                      </div>
                    </div>
                  )}
                </div>
                
                <Timeline 
                  duration={videoDuration}
                  currentTime={currentTime}
                  events={events}
                  onSeek={handleSeek}
                />
              </div>
            )}

            <EventList events={events} onPlayPreview={handlePlayPreview} onEditSound={setEditingEvent} />
          </div>

          {/* Right Panel: Terminal Logs */}
          <div className="w-96 border-l border-studio-700 bg-white/80 p-6 flex flex-col gap-4 z-10 backdrop-blur-sm">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                <Settings className="w-4 h-4" />
                Console
              </h3>
            </div>
            <TerminalLog logs={logs} />
            
            <div className="mt-auto p-4 rounded-lg bg-indigo-50 border border-indigo-100">
              <h4 className="text-xs font-bold text-indigo-600 mb-2 uppercase">Architecture Note</h4>
              <p className="text-[10px] text-indigo-800/70 leading-relaxed">
                The Hybrid Engine prioritizes MongoDB Atlas Vector Search for instant retrieval of high-quality library assets. It only triggers generative models (ElevenLabs) when semantic matches fall below the confidence threshold.
              </p>
            </div>
          </div>

        </div>
      </div>

      {/* Edit Sound Modal */}
      {editingEvent && (
        <EditSoundModal
          event={editingEvent}
          onClose={() => setEditingEvent(null)}
          onRegenerate={handleManualRegenerate}
          isRegenerating={isRegenerating}
        />
      )}
    </div>
  );
};

export default App;
