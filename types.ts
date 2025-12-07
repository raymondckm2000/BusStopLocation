export interface KmbRouteStop {
  route: string;
  bound: string;
  service_type: string;
  seq: number;
  stop: string;
}

export interface KmbStop {
  stop: string;
  name_en: string;
  name_tc: string;
  lat: string;
  long: string;
}

export interface KmbETA {
  eta: string | null; // ISO timestamp
  dest_en: string;
  dest_tc: string;
  rmk_en: string;
  rmk_tc: string;
  eta_seq: number;
  route?: string;
}

export interface CombinedStop {
  id: string;
  seq: number;
  nameEn: string;
  nameTc: string;
  etas: KmbETA[];
}

export interface LocationCoords {
  latitude: number;
  longitude: number;
}

export interface MapsGroundingChunk {
  title?: string;
  uri?: string;
  placeAnswerSources?: {
    reviewSnippets?: {
      reviewText: string;
    }[];
  };
}

export interface GeminiResponse {
  text: string;
  groundingMetadata?: any;
}

// Aliases for compatibility
export type KmbStopDetails = KmbStop;
export type KmbEta = KmbETA;