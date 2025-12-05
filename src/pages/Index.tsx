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
import { ETADisplay } from '@/components/ETADisplay';
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
  const [selectedStopName, setSelectedStopName] = useState('');
  const [eta, setEta] = useState<ETA[]>([]);
  const [etaLoading, setEtaLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('outbound');
  const [nearbyStops, setNearbyStops] = useState<NearbyStop[]>([]);
  const [nearbyStatus, setNearbyStatus] = useState<'idle' | 'locating' | 'loading' | 'error' | 'denied'>('idle');
  const [locationError, setLocationError] = useState('');
  const [isNearbyExpanded, setIsNearbyExpanded] = useState(true);
  const { toast } = useToast();

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
          const etaData = await getStopETAForStop(stop.stopId);
          const uniqueRoutes = Array.from(new Set(etaData.map((etaItem) => etaItem.route)));
          return {
            ...stop,
            routes: uniqueRoutes,
          };
        })
      );

      setNearbyStops(stopsWithRoutes);
      setNearbyStatus('idle');
    } catch (error) {
      setNearbyStatus('error');
      setLocationError('無法載入附近路線，請稍後再試。');
    }
  };

  const requestLocation = () => {
    if (!navigator.geolocation) {
      setNearbyStatus('error');
      setLocationError('你的瀏覽器不支援定位功能。');
      return;
    }

    setNearbyStatus('locating');
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
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
    setSelectedStop(null);
    setEta([]);

    try {
      const routes = await getRouteInfo(route);
      if (routes.length === 0) {
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
      if (outboundRoute) {
        const stops = await getRouteStops(route, 'outbound', outboundRoute.service_type);
        const stopsWithInfo = await Promise.all(
          stops.map(async (s) => {
            const info = await getStopInfo(s.stop);
            return {
              stop: s.stop,
              name_tc: info?.name_tc || '未知車站',
              seq: s.seq,
            };
          })
        );
        setOutboundStops(stopsWithInfo);
      }

      // Get inbound stops
      const inboundRoute = routes.find((r) => r.bound === 'I');
      if (inboundRoute) {
        const stops = await getRouteStops(route, 'inbound', inboundRoute.service_type);
        const stopsWithInfo = await Promise.all(
          stops.map(async (s) => {
            const info = await getStopInfo(s.stop);
            return {
              stop: s.stop,
              name_tc: info?.name_tc || '未知車站',
              seq: s.seq,
            };
          })
        );
        setInboundStops(stopsWithInfo);
      }
    } catch (error) {
      toast({
        title: '錯誤',
        description: '無法獲取路線資料，請稍後再試。',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectStop = async (stopId: string) => {
    setSelectedStop(stopId);
    setEtaLoading(true);

    const currentStops = activeTab === 'outbound' ? outboundStops : inboundStops;
    const stopInfo = currentStops.find((s) => s.stop === stopId);
    setSelectedStopName(stopInfo?.name_tc || '');

    try {
      const currentRouteInfo = routeInfo.find((r) =>
        activeTab === 'outbound' ? r.bound === 'O' : r.bound === 'I'
      );
      if (currentRouteInfo) {
        const etaData = await getStopETA(stopId, currentRoute, currentRouteInfo.service_type);
        setEta(etaData);
      }
    } catch (error) {
      toast({
        title: '錯誤',
        description: '無法獲取到站時間，請稍後再試。',
        variant: 'destructive',
      });
    } finally {
      setEtaLoading(false);
    }
  };

  // Clear ETA when switching tabs
  useEffect(() => {
    setSelectedStop(null);
    setEta([]);
  }, [activeTab]);

  useEffect(() => {
    requestLocation();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
              <Tabs value={activeTab} onValueChange={setActiveTab}>
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

                {outboundRoute && (
                  <div className="text-sm text-muted-foreground mb-3">
                    {activeTab === 'outbound' 
                      ? `${outboundRoute.orig_tc} → ${outboundRoute.dest_tc}`
                      : inboundRoute && `${inboundRoute.orig_tc} → ${inboundRoute.dest_tc}`
                    }
                  </div>
                )}

                <TabsContent value="outbound" className="space-y-4 mt-0">
                  <StopList
                    stops={outboundStops}
                    selectedStop={selectedStop}
                    onSelectStop={handleSelectStop}
                  />
                </TabsContent>

                <TabsContent value="inbound" className="space-y-4 mt-0">
                  <StopList
                    stops={inboundStops}
                    selectedStop={selectedStop}
                    onSelectStop={handleSelectStop}
                  />
                </TabsContent>
              </Tabs>

              {selectedStop && (
                <div className="mt-4">
                  <ETADisplay
                    eta={eta}
                    stopName={selectedStopName}
                    isLoading={etaLoading}
                  />
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}