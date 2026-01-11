import { GoogleGenAI, Type } from "@google/genai";
import { SoundEvent } from '../types';

// Initialize Gemini
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

// Helper to convert File to Base64
export const fileToGenerativePart = async (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64String = reader.result as string;
      // Remove data url prefix (e.g. "data:video/mp4;base64,")
      const base64Data = base64String.split(',')[1];
      resolve(base64Data);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};

/**
 * Generates a vector embedding for a text query.
 * Required for MongoDB Atlas Vector Search.
 */
export const getTextEmbedding = async (text: string): Promise<number[] | null> => {
  try {
    const model = "text-embedding-004";
    const result = await ai.models.embedContent({
      model: model,
      contents: text
    });
    return result.embeddings?.[0]?.values || null;
  } catch (error) {
    console.error("Embedding Error:", error);
    return null;
  }
};

/**
 * THE SPOTTER AGENT
 * Analyzes video frames to identify physical actions and timestamps.
 * Uses gemini-3-flash-preview for multimodal capabilities.
 */
export const runSpotterAgent = async (videoBase64: string, mimeType: string): Promise<SoundEvent[]> => {
  try {
    const model = 'gemini-2.0-flash'; // Good for video analysis

    const prompt = `
      You are an EXPERT Foley Spotter with 20+ years of experience in film sound design.
      Your job is to identify EVERY moment in this video that could benefit from sound design.

      ## DETECTION RULES - BE EXTREMELY GRANULAR:
      - Analyze the video FRAME BY FRAME
      - Each DISTINCT ACTION should be a SEPARATE event, even if they happen close together
      - If someone takes 3 steps, that's potentially 3 separate footstep events
      - Break down complex actions into individual moments
      - Timestamp precision matters - use MM:SS format, be as precise as possible

      ## CATEGORIES TO DETECT:

      1. **IMPACTS & CONTACTS** (highest priority):
         - Each individual footstep (not "walking" - each step!)
         - Each object touch, grab, release
         - Each button press, switch flip
         - Each collision, bump, hit

      2. **BODY MOVEMENTS** (high priority):
         - Hand gestures (reaching, pointing, waving)
         - Head turns, nods
         - Sitting down, standing up (separate events)
         - Arm movements, reaching

      3. **MATERIAL INTERACTIONS** (medium priority):
         - Clothing rustling with each movement
         - Fabric sounds (sitting on couch, adjusting clothes)
         - Surface textures being touched
         - Paper, plastic, metal interactions

      4. **ENVIRONMENTAL & AMBIENT** (context):
         - Room tone at scene start
         - Any background elements
         - Air/wind if visible movement
         - Mechanical sounds (fans, appliances visible)

      5. **VOCAL/BREATH** (if applicable):
         - Sighs, gasps, reactions
         - Breathing during physical exertion

      ## OUTPUT REQUIREMENTS:
      - Identify UP TO 20 distinct sound events (more is better than fewer)
      - Each event should be ATOMIC (one specific action, not a sequence)
      - Timestamps should be precise - don't group multiple actions
      - Be specific about materials (leather, wood, metal, cotton, etc.)

      EXAMPLE: Instead of "Person walks to door and opens it" →
      Break into: "Right foot step on hardwood", "Left foot step", "Right foot step",
      "Hand reaches for metal doorknob", "Doorknob turns", "Door swings open on hinges"
    `;

    const response = await ai.models.generateContent({
      model: model,
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: mimeType,
              data: videoBase64
            }
          },
          { text: prompt }
        ]
      },
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              timestamp: { type: Type.STRING },
              description: { type: Type.STRING },
              confidence: { type: Type.NUMBER, description: "Confidence score 0-1" }
            },
            required: ["timestamp", "description", "confidence"]
          }
        }
      }
    });

    if (response.text) {
      const data = JSON.parse(response.text);
      return data.map((item: any, index: number) => ({
        id: `evt-${Date.now()}-${index}`,
        timestamp: item.timestamp,
        description: item.description,
        confidence: item.confidence,
        status: 'detected'
      }));
    }
    return [];
  } catch (error) {
    console.error("Spotter Agent Error:", error);
    throw error;
  }
};

/**
 * THE DIRECTOR AGENT
 * Refines sound descriptions based on a creative "Vibe".
 * Generates a 3-layer audio plan.
 */
export const runDirectorAgent = async (events: SoundEvent[], vibe: string): Promise<SoundEvent[]> => {
  try {
    const model = 'gemini-2.0-flash';

    const eventsList = events.map((e, i) => `Event ${i}: [${e.timestamp}] ${e.description}`).join('\n');

    // Theme-specific guidance
    const themeGuidance: Record<string, string> = {
      'horror': `
        - Use unsettling, creepy versions of normal sounds
        - Add subtle dissonant tones, eerie whispers, distant screams
        - Exaggerate creaking, dripping, breathing sounds
        - Include supernatural elements: ghostly whooshes, demonic rumbles
        - Texture should feel cold, wet, decaying`,
      'comedy': `
        - Use exaggerated, cartoonish sound effects
        - Add comedic timing sounds: boings, honks, slide whistles, rim shots
        - Whooshes for fast movements, splats for impacts
        - Include funny musical stings and wacky sound effects
        - Make mundane actions sound absurdly loud or silly`,
      'sci-fi': `
        - Use futuristic, electronic, synthesized sounds
        - Add digital beeps, servo motors, hydraulic hisses
        - Include spacey ambience: hums, drones, alien frequencies
        - Technology sounds: computers processing, hologram buzzes
        - Texture should feel metallic, digital, otherworldly`,
      'action': `
        - Use punchy, impactful, powerful sounds
        - Exaggerate hits, crashes, explosions
        - Add swooshes for fast movements, bass drops for impacts
        - Include intense percussion elements
        - Everything should feel larger than life`,
      'asmr': `
        - Use intimate, close-mic, hyper-detailed sounds
        - Gentle tapping, soft scratching, whispered textures
        - Crisp, satisfying sounds: crinkling, brushing, clicking
        - Very quiet, peaceful ambient tones
        - Focus on tactile, sensory pleasure`,
      'musical': `
        - Add musical elements to every sound
        - Include melodic tones, rhythmic patterns, harmonic elements
        - Footsteps could be percussive beats
        - Ambient sounds should be musical drones or pads
        - Create a soundtrack feel with every action`,
      'drama': `
        - Use emotionally evocative sounds
        - Add subtle musical undertones to build tension
        - Breathing, heartbeats for intimate moments
        - Silence and room tone for dramatic effect
        - Sound should support the emotional arc`,
      'default': `
        - Match the "${vibe}" theme as creatively as possible
        - Think about what sounds would enhance this specific mood
        - Be creative and unexpected while staying cohesive`
    };

    const vibeKey = vibe.toLowerCase();
    const guidance = themeGuidance[vibeKey] || themeGuidance['default'];

    const prompt = `
      You are an AWARD-WINNING Sound Director known for creative, immersive soundscapes.

      ## DETECTED ACTIONS:
      ${eventsList}

      ## CREATIVE DIRECTION: "${vibe}"
      ${guidance}

      ## YOUR TASK:
      Transform each detected action into a RICH, CREATIVE sound design that FULLY EMBODIES the "${vibe}" theme.

      For EACH event, create 3 distinct audio layers:

      1. **SPOT** (Primary Sound):
         - The main sound for this action
         - MUST be creatively adapted to fit "${vibe}" theme
         - Be specific: "heavy boot on wet concrete" not just "footstep"

      2. **TEXTURE** (Detail Layer):
         - Subtle supporting sound that adds richness
         - Material-specific details (leather, silk, metal, etc.)
         - Adapted to the "${vibe}" aesthetic

      3. **VIBE** (Atmospheric Layer):
         - The emotional/atmospheric element
         - CRITICAL: This MUST strongly reflect the "${vibe}" theme
         - Could be musical, tonal, or ambient
         - Examples for "${vibe}": ${vibeKey === 'comedy' ? 'funny musical sting, cartoon sound effect' : vibeKey === 'horror' ? 'eerie drone, unsettling tone' : vibeKey === 'musical' ? 'melodic flourish, rhythmic element' : 'atmospheric tone matching the mood'}

      ## IMPORTANT RULES:
      - Every sound should feel like it belongs in a "${vibe}" production
      - Be BOLD and CREATIVE - don't just describe the literal sound
      - Ensure all sounds work COHESIVELY together as a unified soundscape
      - The vibe layer should create emotional continuity between events

      Return a JSON array with one object per event, in the same order.
    `;

    const response = await ai.models.generateContent({
      model: model,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              layer_1_spot: { type: Type.STRING, description: "Search query for primary sound" },
              layer_2_texture: { type: Type.STRING, description: "Search query for texture detail" },
              layer_3_vibe: { type: Type.STRING, description: "Search query for emotional tone" }
            },
            required: ["layer_1_spot", "layer_2_texture", "layer_3_vibe"]
          }
        }
      }
    });

    if (response.text) {
      const data = JSON.parse(response.text);
      // Merge layers back into events
      return events.map((event, index) => {
        const layerPlan = data[index];
        return {
          ...event,
          layers: {
            spot: layerPlan?.layer_1_spot || event.description,
            texture: layerPlan?.layer_2_texture || "Detailed Texture",
            vibe: layerPlan?.layer_3_vibe || vibe
          },
          status: 'sourcing'
        };
      });
    }
    return events;
  } catch (error) {
    console.error("Director Agent Error:", error);
    throw error;
  }
};

/**
 * QC Review Result for a single sound event
 */
export interface QCReviewResult {
  eventIndex: number;
  passed: boolean;
  coherenceScore: number; // 0-1
  feedback: string;
  suggestedFix?: string;
}

/**
 * THE QC REVIEWER AGENT
 * Reviews all generated sounds for coherence, continuity, and fit.
 * Returns feedback on which sounds need regeneration.
 */
export const runQCReviewerAgent = async (
  events: SoundEvent[],
  vibe: string
): Promise<QCReviewResult[]> => {
  try {
    const model = 'gemini-2.0-flash';

    const eventsList = events.map((e, i) =>
      `Event ${i}: [${e.timestamp}] "${e.description}" → Sound: "${e.layers?.spot || 'N/A'}"`
    ).join('\n');

    const prompt = `
      You are a QC (Quality Control) Reviewer for a Foley sound studio.

      Review the following sound design plan for a video with "${vibe}" vibe:

      ${eventsList}

      For EACH event, evaluate:
      1. Does the sound description match the visual action?
      2. Is it coherent with the overall "${vibe}" mood?
      3. Will it blend smoothly with adjacent sounds (continuity)?
      4. Is it too generic or confusing?

      Be strict but fair. Flag sounds that are:
      - Mismatched to the action
      - Tonally inconsistent with the vibe
      - Too vague (e.g., just "sound effect")
      - Potentially jarring when played in sequence

      Return a JSON array with one review per event.
    `;

    const response = await ai.models.generateContent({
      model: model,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              eventIndex: { type: Type.NUMBER },
              passed: { type: Type.BOOLEAN, description: "true if sound is acceptable" },
              coherenceScore: { type: Type.NUMBER, description: "Score from 0 to 1" },
              feedback: { type: Type.STRING, description: "Brief explanation" },
              suggestedFix: { type: Type.STRING, description: "How to improve if failed" }
            },
            required: ["eventIndex", "passed", "coherenceScore", "feedback"]
          }
        }
      }
    });

    if (response.text) {
      return JSON.parse(response.text);
    }

    // Default: pass all if parsing fails
    return events.map((_, i) => ({
      eventIndex: i,
      passed: true,
      coherenceScore: 1,
      feedback: "Review unavailable"
    }));
  } catch (error) {
    console.error("QC Reviewer Agent Error:", error);
    // On error, pass all to avoid blocking
    return events.map((_, i) => ({
      eventIndex: i,
      passed: true,
      coherenceScore: 0.5,
      feedback: "Review skipped due to error"
    }));
  }
};