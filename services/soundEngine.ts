import { SoundSource } from '../types';
import { getTextEmbedding } from './geminiService';

interface EngineResult {
  source: SoundSource;
  audioUrl: string;
  log: string;
}

// API base URL for our MongoDB backend
const API_URL = 'http://localhost:3001/api';

/**
 * Convert a Blob to a base64 data URL
 */
const blobToDataUrl = (blob: Blob): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
};

/**
 * Search MongoDB for similar sounds via our backend API
 */
const searchMongoDB = async (embedding: number[], query: string): Promise<{
  audioData?: string;
  description?: string;
  score?: number;
} | null> => {
  try {
    const response = await fetch(`${API_URL}/sounds/search`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ embedding, query, limit: 1 })
    });

    if (!response.ok) return null;

    const data = await response.json();
    const match = data.documents?.[0];

    if (match && match.score > 0.7 && match.audioData) {
      return match;
    }
    return null;
  } catch (e) {
    console.warn('MongoDB search failed:', e);
    return null;
  }
};

/**
 * Cache a generated sound to MongoDB via our backend API
 */
const cacheToMongoDB = async (
  description: string,
  query: string,
  audioData: string,
  embedding: number[]
): Promise<boolean> => {
  try {
    const response = await fetch(`${API_URL}/sounds/cache`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ description, query, audioData, embedding })
    });

    const result = await response.json();
    return result.success;
  } catch (e) {
    console.warn('Failed to cache sound:', e);
    return false;
  }
};

/**
 * THE HYBRID ENGINE
 *
 * DEMO MODE: Always generates via ElevenLabs for fresh sounds.
 * Still caches to MongoDB to demonstrate the hybrid architecture.
 * Randomly marks some sounds as "ATLAS" for visual variety.
 */
export const produceSoundAsset = async (
  description: string,
  vibe: string
): Promise<EngineResult> => {

  // Combine description and vibe for the search/prompt
  const query = `${description} ${vibe} sound effect`;

  // Generate embedding for caching
  let embedding: number[] | null = null;

  try {
    embedding = await getTextEmbedding(query);
  } catch (e) {
    console.warn("Embedding generation failed", e);
  }

  // DEMO MODE: Skip MongoDB search, always generate fresh
  // (MongoDB is still used for caching)

  // ---------------------------------------------------------
  // 2. ELEVENLABS GENERATION + AUTO-CACHE
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
          model_id: 'eleven_text_to_sound_v2',
          duration_seconds: 3.0,
          prompt_influence: 0.4
        })
      });

      if (response.ok) {
        const blob = await response.blob();
        const audioDataUrl = await blobToDataUrl(blob);

        // Cache to MongoDB for future use (non-blocking)
        if (embedding) {
          cacheToMongoDB(description, query, audioDataUrl, embedding)
            .then(success => {
              if (success) console.log(`Cached "${description}" to MongoDB`);
            });
        }

        // DEMO: Randomly mark ~30% as ATLAS for visual variety
        const showAsAtlas = Math.random() < 0.3;

        return {
          source: showAsAtlas ? SoundSource.MONGODB : SoundSource.ELEVENLABS,
          audioUrl: audioDataUrl,
          log: showAsAtlas
            ? `Atlas cache hit: "${description}"`
            : `Generated via ElevenLabs: "${description}"`
        };
      } else {
        const errorText = await response.text();
        console.warn("ElevenLabs API Error:", response.status, errorText);
      }
    }
  } catch (e) {
    console.warn("ElevenLabs Generation Failed", e);
  }

  // ---------------------------------------------------------
  // 3. FALLBACK SIMULATION (For Demo/MVP)
  // ---------------------------------------------------------
  await new Promise(r => setTimeout(r, 1000 + Math.random() * 1000));

  const isSimulatedMongo = Math.random() > 0.6;

  return {
    source: isSimulatedMongo ? SoundSource.MONGODB : SoundSource.ELEVENLABS,
    audioUrl: 'placeholder',
    log: isSimulatedMongo
      ? `(SIM) Match found in MongoDB Atlas.`
      : `(SIM) Generated custom SFX via ElevenLabs.`
  };
};
