import { SoundEvent, SoundSource } from '../types';
import { getTextEmbedding } from './geminiService';

interface EngineResult {
  source: SoundSource;
  audioUrl: string;
  log: string;
}

/**
 * THE HYBRID ENGINE
 * 
 * Step 1: Checks MongoDB Atlas (Vector Search) for existing assets.
 * Step 2: Checks ElevenLabs (GenAI) to create new assets.
 * Step 3: Fallback to Simulation for demo purposes.
 */
export const produceSoundAsset = async (
  description: string, 
  vibe: string
): Promise<EngineResult> => {
  
  // Combine description and vibe for the search/prompt
  const query = `${description} ${vibe} sound effect`;

  // ---------------------------------------------------------
  // 1. MONGODB ATLAS VECTOR SEARCH
  // ---------------------------------------------------------
  try {
    if (process.env.MONGODB_API_KEY && process.env.MONGODB_ENDPOINT) {
      // Generate Embedding using Gemini
      const vector = await getTextEmbedding(query);
      
      if (vector) {
        // Call MongoDB Atlas Data API
        const response = await fetch(`${process.env.MONGODB_ENDPOINT}/action/aggregate`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'api-key': process.env.MONGODB_API_KEY,
          },
          body: JSON.stringify({
            dataSource: "Cluster0",
            database: "sound_library",
            collection: "assets",
            pipeline: [
              {
                "$vectorSearch": {
                  "index": "vector_index",
                  "path": "embedding",
                  "queryVector": vector,
                  "numCandidates": 10,
                  "limit": 1
                }
              },
              {
                "$project": {
                  "_id": 0,
                  "url": 1,
                  "description": 1,
                  "score": { "$meta": "vectorSearchScore" }
                }
              }
            ]
          })
        });

        const data = await response.json();
        const match = data.documents?.[0];

        // Threshold check (e.g., 0.85 similarity)
        if (match && match.score > 0.85) {
          return {
            source: SoundSource.MONGODB,
            audioUrl: match.url,
            log: `Found high-confidence match in Atlas (Score: ${match.score.toFixed(2)})`
          };
        }
      }
    }
  } catch (e) {
    console.warn("MongoDB Search Failed (Skipping to Generation)", e);
  }

  // ---------------------------------------------------------
  // 2. ELEVENLABS GENERATION
  // ---------------------------------------------------------
  try {
    if (process.env.ELEVENLABS_API_KEY) {
      const response = await fetch('https://api.elevenlabs.io/v1/sound-generation', {
        method: 'POST',
        headers: {
          'xi-api-key': process.env.ELEVENLABS_API_KEY,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          text: query,
          duration_seconds: 2.0, // Short SFX
          prompt_influence: 0.5
        })
      });

      if (response.ok) {
        const blob = await response.blob();
        const audioUrl = URL.createObjectURL(blob);
        return {
          source: SoundSource.ELEVENLABS,
          audioUrl: audioUrl,
          log: `Generated new asset via ElevenLabs: "${query}"`
        };
      } else {
        console.warn("ElevenLabs API Error", await response.text());
      }
    }
  } catch (e) {
    console.warn("ElevenLabs Generation Failed", e);
  }

  // ---------------------------------------------------------
  // 3. FALLBACK SIMULATION (For Demo/MVP)
  // ---------------------------------------------------------
  // If no API keys are present, we simulate the logic to keep the UI functional.
  await new Promise(r => setTimeout(r, 1000 + Math.random() * 1000));
  
  // Randomly assign a "Source" to show how the UI would look
  const isSimulatedMongo = Math.random() > 0.6;
  
  return {
    source: isSimulatedMongo ? SoundSource.MONGODB : SoundSource.ELEVENLABS,
    audioUrl: 'placeholder', // App.tsx handles this by playing a beep
    log: isSimulatedMongo 
      ? `(SIM) Match found in MongoDB Atlas.` 
      : `(SIM) Generated custom SFX via ElevenLabs.`
  };
};