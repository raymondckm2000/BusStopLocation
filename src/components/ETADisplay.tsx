import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Clock, AlertCircle } from 'lucide-react';
import type { ETA } from '@/services/kmbApi';

interface ETADisplayProps {
  eta: ETA[];
  stopName: string;
  isLoading: boolean;
}

function formatETA(etaTime: string | null): string {
  if (!etaTime) return '---';
  
  const eta = new Date(etaTime);
  const now = new Date();
  const diffMs = eta.getTime() - now.getTime();
  const diffMins = Math.round(diffMs / 60000);
  
  if (diffMins <= 0) return '即將到達';
  if (diffMins === 1) return '1 分鐘';
  return `${diffMins} 分鐘`;
}

export function ETADisplay({ eta, stopName, isLoading }: ETADisplayProps) {
  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6 text-center text-muted-foreground">
          載入中...
        </CardContent>
      </Card>
    );
  }

  if (eta.length === 0) {
    return (
      <Card>
        <CardContent className="p-6 text-center text-muted-foreground flex items-center justify-center gap-2">
          <AlertCircle className="w-5 h-5" />
          暫無到站時間資料
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <Clock className="w-5 h-5" />
          {stopName} - 預計到站時間
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {eta.map((item, index) => (
          <div
            key={index}
            className="flex items-center justify-between p-3 rounded-lg bg-accent/30"
          >
            <div className="flex items-center gap-3">
              <span className="w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-medium">
                {index + 1}
              </span>
              <span className="text-muted-foreground text-sm">
                往 {item.dest_tc}
              </span>
            </div>
            <div className="text-right">
              <div className="font-semibold text-lg text-primary">
                {formatETA(item.eta)}
              </div>
              {item.rmk_tc && (
                <div className="text-xs text-muted-foreground">{item.rmk_tc}</div>
              )}
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
