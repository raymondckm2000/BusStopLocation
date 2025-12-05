import { Card, CardContent } from '@/components/ui/card';
import { MapPin, MapPinned, ChevronDown, ChevronUp } from 'lucide-react';
import { ETADisplay } from './ETADisplay';
import type { ETA } from '@/services/kmbApi';

interface StopWithInfo {
  stop: string;
  name_tc: string;
  seq: string;
  latitude?: number;
  longitude?: number;
}

interface StopListProps {
  stops: StopWithInfo[];
  selectedStop: string | null;
  eta: ETA[];
  etaLoading: boolean;
  onSelectStop: (stopId: string) => void;
}

export function StopList({ stops, selectedStop, eta, etaLoading, onSelectStop }: StopListProps) {
  if (stops.length === 0) {
    return (
      <div className="text-center text-muted-foreground py-8">
        暫無車站資料
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {stops.map((stop, index) => (
        <Card
          key={`${stop.stop}-${index}`}
          className={`cursor-pointer transition-all hover:shadow-md ${
            selectedStop === stop.stop
              ? 'ring-2 ring-primary bg-primary/5'
              : 'hover:bg-accent/50'
          }`}
          onClick={() => onSelectStop(stop.stop)}
        >
          <CardContent className="p-4 space-y-3">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 text-primary font-semibold text-sm">
                  {stop.seq}
                </div>
                <div className="flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-muted-foreground" />
                  <span className="font-medium">{stop.name_tc}</span>
                  {stop.latitude && stop.longitude && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        window.open(
                          `https://www.google.com/maps?q=${stop.latitude},${stop.longitude}`,
                          '_blank',
                          'noopener,noreferrer'
                        );
                      }}
                      className="flex items-center justify-center w-8 h-8 rounded-full text-primary hover:bg-primary/10 transition-colors"
                      aria-label="在 Google 地圖開啟此巴士站"
                    >
                      <MapPinned className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-1 text-sm text-muted-foreground">
                {selectedStop === stop.stop ? (
                  <>
                    收起
                    <ChevronUp className="w-4 h-4" />
                  </>
                ) : (
                  <>
                    展開
                    <ChevronDown className="w-4 h-4" />
                  </>
                )}
              </div>
            </div>

            {selectedStop === stop.stop && (
              <div className="pt-3 border-t">
                <ETADisplay
                  eta={eta}
                  stopName={stop.name_tc}
                  isLoading={etaLoading}
                  variant="embedded"
                />
              </div>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
