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
    return result.embedding?.values || null;
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
    const model = 'gemini-3-flash-preview'; // Good for video analysis
    
    const prompt = `
      Analyze this video clip. You are a professional Foley Spotter. 
      Identify up to 5 distinct physical actions that would require sound effects.
      For each action, provide a timestamp (format MM:SS) and a concise description of the action (e.g., "Boot hits glass", "Hand brushing fabric").
      Return the result as a JSON array.
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
    const model = 'gemini-3-flash-preview';
    
    const eventsList = events.map((e, i) => `Event ${i}: [${e.timestamp}] ${e.description}`).join('\n');
    
    const prompt = `
      You are a Sound Director. Review the following detected actions:
      ${eventsList}

      The director wants the scene to have the following vibe: "${vibe}".
      
      For every video input event, generate a JSON plan with 3 distinct audio layers:
      1. "spot": The primary hard sound (e.g., footsteps, door slam).
      2. "texture": The subtle detail (e.g., gravel crunching, clothing rustle). Be specific with materials.
      3. "vibe": The atmospheric tone (e.g., low drone, high-pitched ringing). Adjust this based on the requested vibe (${vibe}).

      Return a JSON array of objects, one for each event in the same order.
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