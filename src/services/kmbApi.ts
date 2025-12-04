const BASE_URL = 'https://data.etabus.gov.hk/v1/transport/kmb';

export interface RouteStop {
  route: string;
  bound: string;
  service_type: string;
  seq: string;
  stop: string;
}

export interface Stop {
  stop: string;
  name_tc: string;
  name_en: string;
  lat: string;
  long: string;
}

export interface ETA {
  co: string;
  route: string;
  dir: string;
  service_type: number;
  seq: number;
  dest_tc: string;
  dest_en: string;
  eta_seq: number;
  eta: string | null;
  rmk_tc: string;
  rmk_en: string;
  data_timestamp: string;
}

export interface RouteInfo {
  route: string;
  bound: string;
  service_type: string;
  orig_tc: string;
  orig_en: string;
  dest_tc: string;
  dest_en: string;
}

export async function getRouteInfo(route: string): Promise<RouteInfo[]> {
  const response = await fetch(`${BASE_URL}/route/${route}`);
  const data = await response.json();
  return data.data || [];
}

export async function getRouteStops(route: string, direction: string, serviceType: string): Promise<RouteStop[]> {
  const response = await fetch(`${BASE_URL}/route-stop/${route}/${direction}/${serviceType}`);
  const data = await response.json();
  return data.data || [];
}

export async function getStopInfo(stopId: string): Promise<Stop | null> {
  const response = await fetch(`${BASE_URL}/stop/${stopId}`);
  const data = await response.json();
  return data.data || null;
}

export async function getStopETA(stopId: string, route: string, serviceType: string): Promise<ETA[]> {
  const response = await fetch(`${BASE_URL}/eta/${stopId}/${route}/${serviceType}`);
  const data = await response.json();
  return data.data || [];
}
