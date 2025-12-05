import { Card, CardContent } from '@/components/ui/card';
import { MapPin } from 'lucide-react';

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
  onSelectStop: (stopId: string) => void;
}

export function StopList({ stops, selectedStop, onSelectStop }: StopListProps) {
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
          <CardContent className="p-4 flex items-center gap-3">
            <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 text-primary font-semibold text-sm">
              {stop.seq}
            </div>
            <MapPin className="w-4 h-4 text-muted-foreground" />
            <span className="font-medium">{stop.name_tc}</span>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
