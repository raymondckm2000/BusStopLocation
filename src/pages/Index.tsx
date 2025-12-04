import { useState, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Bus, ArrowRight, ArrowLeft } from 'lucide-react';
import { BusSearch } from '@/components/BusSearch';
import { StopList } from '@/components/StopList';
import { ETADisplay } from '@/components/ETADisplay';
import { useToast } from '@/hooks/use-toast';
import {
  getRouteInfo,
  getRouteStops,
  getStopInfo,
  getStopETA,
  type RouteInfo,
  type ETA,
} from '@/services/kmbApi';

interface StopWithInfo {
  stop: string;
  name_tc: string;
  seq: string;
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
  const { toast } = useToast();

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