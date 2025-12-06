// Define the shape of the grounding chunk from Gemini Maps tool
export interface MapsGroundingChunk {
  sourceId?: string;
  title?: string;
  uri?: string;
  placeAnswerSources?: {
    reviewSnippets?: {
      reviewText?: string;
      authorAttribution?: {
        displayName?: string;
        uri?: string;
        photoUri?: string;
      }
    }[]
  }
}

export interface GroundingChunk {
  maps?: MapsGroundingChunk;
  web?: {
    uri?: string;
    title?: string;
  };
}

export interface GroundingMetadata {
  groundingChunks?: GroundingChunk[];
  groundingSupports?: any[]; // Simplified for this app
  webSearchQueries?: string[];
}

export interface GeminiResponse {
  text: string;
  groundingMetadata?: GroundingMetadata;
}

export interface LocationCoords {
  latitude: number;
  longitude: number;
}
