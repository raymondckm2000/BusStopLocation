import { KmbRouteStop, KmbStop, KmbETA } from "../types";

const BASE_URL = "https://data.etabus.gov.hk/v1/transport/kmb";

export const fetchRouteStops = async (route: string, direction: "outbound" | "inbound"): Promise<KmbRouteStop[]> => {
  try {
    const res = await fetch(`${BASE_URL}/route-stop/${route}/${direction}/1`);
    const data = await res.json();
    return data.data || [];
  } catch (e) {
    console.error("Error fetching route stops", e);
    return [];
  }
};

export const fetchStopDetails = async (stopId: string): Promise<KmbStop | null> => {
  try {
    const res = await fetch(`${BASE_URL}/stop/${stopId}`);
    const data = await res.json();
    return data.data || null;
  } catch (e) {
    console.error("Error fetching stop details", e);
    return null;
  }
};

export const fetchStopETA = async (stopId: string, route: string): Promise<KmbETA[]> => {
  try {
    const res = await fetch(`${BASE_URL}/eta/${stopId}/${route}/1`);
    const data = await res.json();
    return (data.data || [])
      .sort((a: KmbETA, b: KmbETA) => a.eta_seq - b.eta_seq)
      .slice(0, 3); // Get next 3 buses
  } catch (e) {
    console.error("Error fetching ETA", e);
    return [];
  }
};

export const getAllStops = async (): Promise<KmbStop[]> => {
  try {
    const res = await fetch(`${BASE_URL}/stop`);
    const data = await res.json();
    return data.data || [];
  } catch (e) {
    console.error("Error fetching all stops", e);
    return [];
  }
};

export const getStopEtasForStop = async (stopId: string): Promise<KmbETA[]> => {
  try {
    const res = await fetch(`${BASE_URL}/stop-eta/${stopId}`);
    const data = await res.json();
    return data.data || [];
  } catch (e) {
    console.error("Error fetching stop ETAs", e);
    return [];
  }
};