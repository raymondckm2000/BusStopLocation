import { useState, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Bus,
  ArrowRight,
  ArrowLeft,
  MapPin,
  ExternalLink,
  ChevronUp,
  ChevronDown,
} from 'lucide-react';
import { BusSearch } from '@/components/BusSearch';
import { StopList } from '@/components/StopList';
import { useToast } from '@/hooks/use-toast';
import {
  getAllStops,
  getRouteInfo,
  getRouteStops,
  getStopInfo,
  getStopETA,
  getStopETAForStop,
  type RouteInfo,
  type ETA,
} from '@/services/kmbApi';
import { Button } from '@/components/ui/button';

interface StopWithInfo {
  stop: string;
  name_tc: string;
  seq: string;
  latitude: number;
  longitude: number;
}

interface NearbyStop {
  stopId: string;
  name: string;
  distance: number;
  routes: string[];
  latitude: number;
  longitude: number;
}

export default function Index() {
  const [isLoading, setIsLoading] = useState(false);
  const [routeInfo, setRouteInfo] = useState<RouteInfo[]>([]);
  const [currentRoute, setCurrentRoute] = useState('');
  const [outboundStops, setOutboundStops] = useState<StopWithInfo[]>([]);
  const [inboundStops, setInboundStops] = useState<StopWithInfo[]>([]);
  const [selectedStop, setSelectedStop] = useState<string | null>(null);
  const [eta, setEta] = useState<ETA[]>([]);
  const [etaLoading, setEtaLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<string>('outbound'); // Changed to string to match Tabs
  const [hasAutoSelected, setHasAutoSelected] = useState(false);
  const [nearbyStops, setNearbyStops] = useState<NearbyStop[]>([]);
  const [nearbyStatus, setNearbyStatus] = useState<'idle' | 'locating' | 'loading' | 'error' | 'denied'>('idle');
  const [locationError, setLocationError] = useState('');
  const [isNearbyExpanded, setIsNearbyExpanded] = useState(false);
  const [userLocation, setUserLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const { toast } = useToast();

  // FIX 1: onValueChange returns a string, so we accept string and cast if needed
  const handleTabChange = (value: string) => {
    setSelectedStop(null);
    setEta([]);
    setActiveTab(value);
  };

  const haversineDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const toRad = (value: number) => (value * Math.PI) / 180;
    const R = 6371; // km
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(toRad(lat1)) *
        Math.cos(toRad(lat2)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  const fetchNearbyStops = async (latitude: number, longitude: number) => {
    setNearbyStatus('loading');
    try {
      const stops = await getAllStops();
      
      // Safety check in case API fails
      if (!stops || !Array.isArray(stops)) {
         throw new Error("Failed to fetch stops");
      }

      const stopsWithDistance = stops.map((stop) => ({
        stopId: stop.stop,
        name: stop.name_tc,
        distance: haversineDistance(latitude, longitude, Number(stop.lat), Number(stop.long)) * 1000,
        latitude: Number(stop.lat),
        longitude: Number(stop.long),
      }));

      const closestStops = stopsWithDistance.sort((a, b) => a.distance - b.distance).slice(0, 5);

      const stopsWithRoutes: NearbyStop[] = await Promise.all(
        closestStops.map(async (stop) => {
          try {
            const etaData = await getStopETAForStop(stop.stopId);
            const uniqueRoutes = Array.from(new Set(etaData.map((etaItem) => etaItem.route)));
            return {
              ...stop,
              routes: uniqueRoutes,
            };
          } catch (e) {
            // If fetching ETA for a specific stop fails, return empty routes
            return { ...stop, routes: [] };
          }
        })
      );

      setNearbyStops(stopsWithRoutes);
      setNearbyStatus('idle');
    } catch (error) {
      console.error(error);
      setNearbyStatus('error');
      setLocationError('無法載入附近路線，請稍後再試。');
    }
  };

  const requestLocation = () => {
    if (typeof window === 'undefined' || !navigator.geolocation) {
      setNearbyStatus('error');
      setLocationError('你的瀏覽器不支援定位功能。');
      return;
    }

    setNearbyStatus('locating');
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        setUserLocation({ latitude, longitude });
        fetchNearbyStops(latitude, longitude);
      },
      (error) => {
        if (error.code === error.PERMISSION_DENIED) {
          setNearbyStatus('denied');
          setLocationError('需要定位權限才能顯示附近路線。');
        } else {
          setNearbyStatus('error');
          setLocationError('無法取得你的位置，請稍後再試。');
        }
      },
      { enableHighAccuracy: true }
    );
  };

  const handleSearch = async (route: string) => {
    setIsLoading(true);
    setRouteInfo([]);
    setOutboundStops([]);
    setInboundStops([]);
    setActiveTab('outbound');
    setHasAutoSelected(false);
    setSelectedStop(null);
    setEta([]);

    try {
      const routes = await getRouteInfo(route);
      if (!routes || routes.length === 0) {
        toast({
          title: '找不到路線',
          description: `未能找到路線 ${route}，請檢查輸入是否正確。`,
          variant: 'destructive',
        });
        setIsLoading(false);
        return;
      }

      setRouteInfo(routes);
      setCurrentRoute(route);

      // Get outbound stops
      const outboundRoute = routes.find((r) => r.bound === 'O');
      let outboundStopsData: StopWithInfo[] = [];
      
      if (outboundRoute) {
        const stops = await getRouteStops(route, 'outbound', outboundRoute.service_type);
        outboundStopsData = await Promise.all(
          stops.map(async (s) => {
            const info = await getStopInfo(s.stop);
            return {
              stop: s.stop,
              name_tc: info?.name_tc || '未知車站',
              seq: s.seq,
              latitude: Number(info?.lat ?? 0),
              longitude: Number(info?.long ?? 0),
            };
          })
        );
        setOutboundStops(outboundStopsData);
      }

      // Get inbound stops
      const inboundRoute = routes.find((r) => r.bound === 'I');
      let inboundStopsData: StopWithInfo[] = [];
      
      if (inboundRoute) {
        const stops = await getRouteStops(route, 'inbound', inboundRoute.service_type);
        inboundStopsData = await Promise.all(
          stops.map(async (s) => {
            const info = await getStopInfo(s.stop);
            return {
              stop: s.stop,
              name_tc: info?.name_tc || '未知車站',
              seq: s.seq,
              latitude: Number(info?.lat ?? 0),
              longitude: Number(info?.long ?? 0),
            };
          })
        );
        setInboundStops(inboundStopsData);
      }

      if (userLocation) {
        autoSelectNearestStop(outboundStopsData, inboundStopsData);
      }
    } catch (error) {
      console.error(error);
      toast({
        title: '錯誤',
        description: '無法獲取路線資料，請稍後再試。',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectStop = async (stopId: string, direction?: string) => {
    if (!direction && selectedStop === stopId) {
      setSelectedStop(null);
      setEta([]);
      return;
    }

    const targetTab = direction ?? activeTab;
    
    if (direction && direction !== activeTab) {
      setActiveTab(direction);
    }
    
    setSelectedStop(stopId);
    setEta([]);
    setEtaLoading(true);

    try {
      // FIX 2: Check activeTab strictly against bounds
      const isOutbound = targetTab === 'outbound';
      const currentRouteInfo = routeInfo.find((r) =>
        isOutbound ? r.bound === 'O' : r.bound === 'I'
      );
      
      if (currentRouteInfo) {
        const etaData = await getStopETA(stopId, currentRoute, currentRouteInfo.service_type);
        setEta(etaData);
      }
    } catch (error) {
      console.error(error);
      toast({
        title: '錯誤',
        description: '無法獲取到站時間，請稍後再試。',
        variant: 'destructive',
      });
    } finally {
      setEtaLoading(false);
    }
  };

  const autoSelectNearestStop = (
    outboundStopsData: StopWithInfo[],
    inboundStopsData: StopWithInfo[]
  ) => {
    if (!userLocation) return;

    const hasOutboundStops = outboundStopsData.length > 0;
    // If no outbound stops, we must fallback to inbound, otherwise checks fail
    const preferredStops = hasOutboundStops ? outboundStopsData : inboundStopsData;
    
    if (preferredStops.length === 0) return;

    const preferredDirection = hasOutboundStops ? 'outbound' : 'inbound';

    let nearestStopId = preferredStops[0].stop;
    let shortestDistance = haversineDistance(
      userLocation.latitude,
      userLocation.longitude,
      preferredStops[0].latitude,
      preferredStops[0].longitude
    );

    preferredStops.slice(1).forEach((stop) => {
      const distance = haversineDistance(
        userLocation.latitude,
        userLocation.longitude,
        stop.latitude,
        stop.longitude
      );
      if (distance < shortestDistance) {
        shortestDistance = distance;
        nearestStopId = stop.stop;
      }
    });

    if (preferredDirection !== activeTab) {
      setActiveTab(preferredDirection);
    }

    void handleSelectStop(nearestStopId, preferredDirection);
    setHasAutoSelected(true);
  };

  useEffect(() => {
    requestLocation();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (
      userLocation &&
      currentRoute &&
      selectedStop === null &&
      !hasAutoSelected &&
      (outboundStops.length > 0 || inboundStops.length > 0)
    ) {
      autoSelectNearestStop(outboundStops, inboundStops);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    userLocation,
    outboundStops,
    inboundStops,
    currentRoute,
    selectedStop,
    hasAutoSelected,
  ]);

  const formatDistance = (distance: number) => {
    if (distance < 1000) return `${Math.round(distance)} 公尺`;
    return `${(distance / 1000).toFixed(1)} 公里`;
  };

  const outboundRoute = routeInfo.find((r) => r.bound === 'O');
  const inboundRoute = routeInfo.find((r) => r.bound === 'I');

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 max-w-2xl">
        <Card className="mb-6">
          <CardHeader className="text-center">
            <CardTitle className="flex items-center justify-center gap-3 text-2xl">
              <Bus className="w-8 h-8 text-primary" />
              KMB 巴士到站時間查詢
            </CardTitle>
          </CardHeader>
          <CardContent>
            <BusSearch onSearch={handleSearch} isLoading={isLoading} />
          </CardContent>
        </Card>

        <Card className="mb-6">
          <CardHeader className="pb-3 flex items-start justify-between gap-4">
            <div>
              <CardTitle className="text-xl flex items-center gap-2">
                <MapPin className="w-5 h-5 text-primary" />
                附近巴士路線
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                已自動偵測你的位置並顯示最近的巴士站及路線。
              </p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="flex items-center gap-1"
              onClick={() => setIsNearbyExpanded((prev) => !prev)}
            >
              {isNearbyExpanded ? (
                <>
                  <ChevronUp className="w-4 h-4" />
                  收起
                </>
              ) : (
                <>
                  <ChevronDown className="w-4 h-4" />
                  展開
                </>
              )}
            </Button>
          </CardHeader>
          {isNearbyExpanded && (
            <CardContent className="space-y-3">
              {nearbyStatus === 'locating' && (
                <div className="text-muted-foreground">正在取得位置...</div>
              )}
              {nearbyStatus === 'loading' && (
                <div className="text-muted-foreground">正在載入附近路線...</div>
              )}
              {(nearbyStatus === 'error' || nearbyStatus === 'denied') && (
                <div className="flex items-center justify-between gap-4">
                  <div className="text-sm text-muted-foreground">{locationError}</div>
                  <Button variant="secondary" size="sm" onClick={requestLocation}>
                    重新嘗試
                  </Button>
                </div>
              )}
              {nearbyStatus === 'idle' && nearbyStops.length === 0 && (
                <div className="text-muted-foreground">暫時找不到附近的巴士站。</div>
              )}
              {nearbyStatus === 'idle' && nearbyStops.length > 0 && (
                <div className="space-y-3">
                  {nearbyStops.map((stop) => (
                    <Card key={stop.stopId} className="border-muted">
                      <CardContent className="p-4 space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="font-semibold">{stop.name}</div>
                          <div className="text-xs text-muted-foreground">
                            {formatDistance(stop.distance)}
                          </div>
                        </div>
                        <a
                          href={`https://www.google.com/maps?q=${stop.latitude},${stop.longitude}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
                        >
                          <ExternalLink className="w-4 h-4" />
                          在 Google 地圖查看
                        </a>
                        <div className="flex flex-wrap gap-2">
                          {stop.routes.map((route) => (
                            <Button
                              key={`${stop.stopId}-${route}`}
                              size="sm"
                              variant="secondary"
                              onClick={() => handleSearch(route)}
                            >
                              {route}
                            </Button>
                          ))}
                          {stop.routes.length === 0 && (
                            <span className="text-sm text-muted-foreground">暫無路線資料</span>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          )}
        </Card>

        {isLoading && (
          <div className="text-center text-muted-foreground py-8">
            載入中...
          </div>
        )}

        {routeInfo.length > 0 && !isLoading && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-xl">路線 {currentRoute}</CardTitle>
            </CardHeader>
            <CardContent>
              {/* FIX 3: Ensure onValueChange matches the type defined in state */}
              <Tabs value={activeTab} onValueChange={handleTabChange}>
                <TabsList className="grid w-full grid-cols-2 mb-4">
                  <TabsTrigger value="outbound" className="flex items-center gap-2">
                    <ArrowRight className="w-4 h-4" />
                    去程
                  </TabsTrigger>
                  <TabsTrigger value="inbound" className="flex items-center gap-2">
                    <ArrowLeft className="w-4 h-4" />
                    回程
                  </TabsTrigger>
                </TabsList>

                {/* FIX 4: Safety check for circular routes where inbound might not exist */}
                <div className="text-sm text-muted-foreground mb-3">
                    {activeTab === 'outbound' && outboundRoute
                      ? `${outboundRoute.orig_tc} → ${outboundRoute.dest_tc}`
                      : (activeTab === 'inbound' && inboundRoute) 
                        ? `${inboundRoute.orig_tc} → ${inboundRoute.dest_tc}`
                        : ''
                    }
                </div>

                <TabsContent value="outbound" className="space-y-4 mt-0">
                  <StopList
                    stops={outboundStops}
                    selectedStop={selectedStop}
                    eta={eta}
                    etaLoading={etaLoading}
                    direction="outbound"
                    onSelectStop={(id) => handleSelectStop(id, 'outbound')}
                  />
                </TabsContent>

                <TabsContent value="inbound" className="space-y-4 mt-0">
                  <StopList
                    stops={inboundStops}
                    selectedStop={selectedStop}
                    eta={eta}
                    etaLoading={etaLoading}
                    direction="inbound"
                    onSelectStop={(id) => handleSelectStop(id, 'inbound')}
                  />
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
