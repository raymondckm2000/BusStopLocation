import { GoogleGenAI } from "@google/genai";
import { GeminiResponse, LocationCoords } from "../types";

/**
 * Fetches bus stops based on a text query and optional user location.
 * Uses Gemini with the Google Maps tool.
 */
export const findBusStops = async (
  query: string,
  userLocation?: LocationCoords
): Promise<GeminiResponse> => {
  try {
    // Safely retrieve API key, handling environments where process might not be defined
    const apiKey = (typeof process !== 'undefined' && process.env) ? process.env.API_KEY : '';
    
    // Initialize AI client inside the function
    const ai = new GoogleGenAI({ apiKey: apiKey });
    
    const modelId = "gemini-2.5-flash"; // Flash is fast and good for grounding
    
    // Construct a context-aware prompt
    let prompt = `Find bus stops locations related to: "${query}". Provide a helpful summary of the stops found.`;
    
    // If we have a location, we can be more specific, although the toolConfig handles the bias.
    if (!userLocation && !query.toLowerCase().includes("near")) {
       prompt += " If no specific location is mentioned in the query, assume the user is asking about major transit hubs or clarify the location.";
    }

    const config: any = {
      tools: [{ googleMaps: {} }],
      systemInstruction: "You are a helpful transit assistant. Your goal is to find bus stops. Always output the location name and details clearly. Do not use JSON markdown.",
    };

    // Add location bias if available
    if (userLocation) {
      config.toolConfig = {
        retrievalConfig: {
          latLng: {
            latitude: userLocation.latitude,
            longitude: userLocation.longitude,
          },
        },
      };
    }

    const response = await ai.models.generateContent({
      model: modelId,
      contents: prompt,
      config: config,
    });

    // Extract text
    const text = response.text || "No details found.";
    
    // Extract grounding metadata safely
    // The SDK structure puts groundingMetadata on the candidate
    const groundingMetadata = response.candidates?.[0]?.groundingMetadata;

    return {
      text,
      groundingMetadata,
    };
  } catch (error) {
    console.error("Error fetching bus stops:", error);
    throw error;
  }
};
