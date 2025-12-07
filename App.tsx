import React, { useState, useEffect } from 'react';
import { Search, MapPin, Clock, ArrowRightLeft, RefreshCw, Bus } from 'lucide-react';
import { fetchRouteStops, fetchStopDetails, fetchStopETA } from './services/kmbService';
import { CombinedStop } from './types';

export default function App() {
  const [query, setQuery] = useState('');
  const [route, setRoute] = useState('');
  const [direction, setDirection] = useState<'outbound' | 'inbound'>('outbound');
  
  const [stops, setStops] = useState<CombinedStop[]>([]);
  const [loading, setLoading] = useState(false);
  const [etaLoading, setEtaLoading] = useState(false);

  // Load stops when route or direction changes
  useEffect(() => {
    if (!route) return;
    
    const loadData = async () => {
      setLoading(true);
      setStops([]);
      
      // 1. Get Stops List
      const routeStops = await fetchRouteStops(route, direction);
      if (routeStops.length === 0) {
        setLoading(false);
        return;
      }

      // 2. Get Details for each stop (in parallel)
      const detailsPromises = routeStops.map(async (rs) => {
        const detail = await fetchStopDetails(rs.stop);
        return {
          id: rs.stop,
          seq: rs.seq,
          nameEn: detail?.name_en || 'Unknown Stop',
          nameTc: detail?.name_tc || '未知車站',
          etas: []
        };
      });

      const combined = await Promise.all(detailsPromises);
      setStops(combined.sort((a, b) => a.seq - b.seq));
      setLoading(false);
      
      // 3. Auto-fetch ETAs immediately after stops load
      fetchETAsForStops(combined, route);
    };

    loadData();
  }, [route, direction]);

  // Helper to fetch ETAs for a list of stops
  const fetchETAsForStops = async (currentStops: CombinedStop[], activeRoute: string) => {
    setEtaLoading(true);
    const updatedStops = [...currentStops];
    
    await Promise.all(
      updatedStops.map(async (stop, index) => {
        const etas = await fetchStopETA(stop.id, activeRoute);
        updatedStops[index].etas = etas;
      })
    );
    
    setStops(updatedStops);
    setEtaLoading(false);
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;
    setRoute(query.trim().toUpperCase());
    setDirection('outbound'); // Reset direction on new search
  };

  const handleRefresh = () => {
    if (route && stops.length > 0) {
      fetchETAsForStops(stops, route);
    }
  };

  const formatTime = (iso: string | null) => {
    if (!iso) return '-';
    const diff = Math.floor((new Date(iso).getTime() - new Date().getTime()) / 60000);
    if (diff <= 0) return 'Now';
    return `${diff} min`;
  };

  return (
    <div className="max-w-md mx-auto min-h-screen bg-slate-50 flex flex-col shadow-2xl">
      {/* Header */}
      <header className="bg-red-600 p-6 pb-8 text-white shadow-lg sticky top-0 z-10">
        <h1 className="text-2xl font-bold flex items-center gap-2 mb-4">
          <Bus className="w-8 h-8" />
          KMB Tracker
        </h1>
        
        <form onSubmit={handleSearch} className="relative">
          <input
            type="text"
            className="w-full h-12 pl-12 pr-4 rounded-xl text-slate-900 font-bold text-lg focus:outline-none focus:ring-4 focus:ring-red-700 shadow-inner placeholder:font-normal"
            placeholder="Route (e.g. 1A, 101)"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <Search className="absolute left-4 top-3.5 text-slate-400" />
        </form>
      </header>

      {/* Main Content */}
      <main className="flex-1 -mt-4 px-4 pb-6">
        
        {/* Controls Card */}
        {route && (
          <div className="bg-white rounded-xl shadow-md p-2 mb-4 flex items-center justify-between border border-slate-100">
            <div className="flex bg-slate-100 rounded-lg p-1 w-full mr-2">
              <button
                onClick={() => setDirection('outbound')}
                className={`flex-1 py-2 text-sm font-bold rounded-md transition-all ${
                  direction === 'outbound' ? 'bg-white text-red-600 shadow-sm' : 'text-slate-500'
                }`}
              >
                Outbound
              </button>
              <button
                onClick={() => setDirection('inbound')}
                className={`flex-1 py-2 text-sm font-bold rounded-md transition-all ${
                  direction === 'inbound' ? 'bg-white text-red-600 shadow-sm' : 'text-slate-500'
                }`}
              >
                Inbound
              </button>
            </div>
            <button 
              onClick={handleRefresh}
              disabled={etaLoading}
              className="p-3 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 disabled:opacity-50"
            >
              <RefreshCw className={`w-5 h-5 ${etaLoading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        )}

        {/* Loading State */}
        {loading && (
          <div className="flex flex-col items-center justify-center py-12 text-slate-400">
            <Clock className="w-10 h-10 animate-pulse mb-2" />
            <p>Fetching Route Data...</p>
          </div>
        )}

        {/* Empty State */}
        {!route && !loading && (
          <div className="flex flex-col items-center justify-center py-12 text-slate-400 text-center">
            <MapPin className="w-12 h-12 mb-2 opacity-50" />
            <p>Enter a route number above<br/>to see live arrival times.</p>
          </div>
        )}

        {/* Stop List */}
        <div className="space-y-3">
          {stops.map((stop, idx) => (
            <div key={stop.id} className="bg-white rounded-xl p-4 shadow-sm border-l-4 border-red-500 relative overflow-hidden">
              {/* Stop Number Background */}
              <div className="absolute right-2 top-2 text-6xl font-black text-slate-50 opacity-10 pointer-events-none">
                {idx + 1}
              </div>

              <div className="relative z-10">
                <h3 className="font-bold text-lg text-slate-800">{stop.nameEn}</h3>
                <p className="text-slate-500 text-sm mb-3">{stop.nameTc}</p>

                {/* ETAs */}
                <div className="flex flex-wrap gap-2">
                  {stop.etas.length > 0 ? (
                    stop.etas.map((eta, i) => (
                      <div 
                        key={i} 
                        className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border ${
                          i === 0 
                            ? 'bg-red-50 border-red-100 text-red-700 font-bold' 
                            : 'bg-slate-50 border-slate-100 text-slate-600'
                        }`}
                      >
                        <span className="text-lg">{formatTime(eta.eta)}</span>
                        {eta.rmk_en && (
                          <span className="text-xs opacity-75 border-l pl-2 border-current">
                            {eta.rmk_en}
                          </span>
                        )}
                      </div>
                    ))
                  ) : (
                    <span className="text-sm text-slate-400 italic py-1">
                      {etaLoading ? 'Loading ETA...' : 'No scheduled departures'}
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
