import React, { useState, useEffect } from 'react';
import { MapPin, Clock, ArrowLeftRight, Navigation, Search, Loader2 } from 'lucide-react';
import { fetchRouteStops, fetchStopDetails, fetchStopETA, getAllStops, getStopEtasForStop } from '../services/kmbService';
import { KmbRouteStop, KmbStopDetails, KmbEta, LocationCoords, KmbStop } from '../types';

interface StopWithDetails extends KmbRouteStop {
  details?: KmbStopDetails;
  etas?: KmbEta[];
}

interface NearbyStopData extends KmbStop {
    distance: number; // in meters
    routes: string[];
}

// Haversine formula to calculate distance between two points in meters
const getDistanceFromLatLonInM = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371; // Radius of the earth in km
    const dLat = deg2rad(lat2 - lat1);
    const dLon = deg2rad(lon2 - lon1);
    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const d = R * c; // Distance in km
    return d * 1000; // Distance in meters
};

const deg2rad = (deg: number) => {
    return deg * (Math.PI / 180);
};

export const KmbTracker: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'search' | 'nearby'>('search');
  
  // Search State
  const [routeInput, setRouteInput] = useState('');
  const [activeRoute, setActiveRoute] = useState('');
  const [direction, setDirection] = useState<"outbound" | "inbound">("outbound");
  const [stops, setStops] = useState<StopWithDetails[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [userLocation, setUserLocation] = useState<LocationCoords | null>(null);
  const [autoSelectedStopId, setAutoSelectedStopId] = useState<string | null>(null);

  // Nearby State
  const [nearbyStops, setNearbyStops] = useState<NearbyStopData[]>([]);
  const [nearbyLoading, setNearbyLoading] = useState(false);
  const [nearbyError, setNearbyError] = useState<string | null>(null);

  // --- Search Logic ---

  useEffect(() => {
    let isMounted = true;

    if (!activeRoute) return;

    const fetchStopsAndEtas = async () => {
      if (isMounted) {
        setLoading(true);
        setError(null);
        setStops([]);
        setAutoSelectedStopId(null);
      }

      try {
        // 1. Fetch Basic Route Info
        const routeStops = await fetchRouteStops(activeRoute, direction);
        
        if (!isMounted) return;

        if (!routeStops || routeStops.length === 0) {
          setError("No stops found. Route might not exist or direction is invalid.");
          setLoading(false);
          return;
        }

        // Initialize stops list
        const initialStops: StopWithDetails[] = routeStops.map(s => ({ ...s }));
        setStops(initialStops);
        setLoading(false); // Show list immediately

        // 2. Fetch Stop Details (Lat/Long/Name) & Auto-select nearest
        const stopsWithDetails = [...initialStops];
        let nearestStopId: string | null = null;
        let minDistance = Infinity;

        // We fetch details in chunks to render progressively
        await Promise.all(
            stopsWithDetails.map(async (stop, index) => {
                if (!isMounted) return;
                const details = await fetchStopDetails(stop.stop);
                if (details) {
                    stopsWithDetails[index].details = details;

                    // Logic to find nearest stop if user location exists
                    if (userLocation) {
                        const dist = getDistanceFromLatLonInM(
                            userLocation.latitude,
                            userLocation.longitude,
                            parseFloat(details.lat),
                            parseFloat(details.long)
                        );
                        if (dist < minDistance) {
                            minDistance = dist;
                            nearestStopId = stop.stop;
                        }
                    }
                }
            })
        );
        
        if (!isMounted) return;
        setStops([...stopsWithDetails]);
        
        // Auto-scroll or highlight nearest stop
        if (nearestStopId) {
            setAutoSelectedStopId(nearestStopId);
            // Optional: scroll to element logic could go here
        }

        // 3. Fetch ETAs
        const stopsWithEtas = await Promise.all(
          stopsWithDetails.map(async (stop) => {
            try {
              const etas = await fetchStopETA(stop.stop, activeRoute);
              return { ...stop, etas };
            } catch {
              return stop;
            }
          })
        );

        if (isMounted) {
            setStops(stopsWithEtas);
        }

      } catch (err) {
        console.error(err);
        if (isMounted) {
          setError("Error loading route data.");
          setLoading(false);
        }
      }
    };

    fetchStopsAndEtas();

    return () => {
      isMounted = false;
    };
  }, [activeRoute, direction, userLocation]); // Re-run if user location is found

  // --- Nearby Logic ---

  const handleLocateMe = () => {
    if (!navigator.geolocation) {
        alert("Geolocation is not supported by your browser");
        return;
    }
    
    // If in search tab, just update location for auto-select
    // If in nearby tab, trigger nearby search
    const isNearbyTab = activeTab === 'nearby';
    if (isNearbyTab) {
        setNearbyLoading(true);
        setNearbyError(null);
    }

    navigator.geolocation.getCurrentPosition(
        (position) => {
            const coords = {
                latitude: position.coords.latitude,
                longitude: position.coords.longitude
            };
            setUserLocation(coords);
            if (isNearbyTab) {
                fetchNearbyStops(coords);
            }
        },
        (err) => {
            console.error(err);
            if (isNearbyTab) {
                setNearbyLoading(false);
                setNearbyError("Unable to retrieve location. Please check permissions.");
            }
        }
    );
  };

  const fetchNearbyStops = async (coords: LocationCoords) => {
      try {
          const allStops = await getAllStops();
          if (!allStops || allStops.length === 0) {
              setNearbyError("Failed to load stop database.");
              setNearbyLoading(false);
              return;
          }

          // Filter & Sort by distance
          const stopsWithDist = allStops.map(s => {
              const lat = parseFloat(s.lat);
              const long = parseFloat(s.long);
              return {
                  ...s,
                  distance: getDistanceFromLatLonInM(coords.latitude, coords.longitude, lat, long)
              };
          })
          .filter(s => s.distance < 800) // Only within 800m
          .sort((a, b) => a.distance - b.distance)
          .slice(0, 10); // Top 10

          // Fetch routes serving these stops
          const detailedNearby = await Promise.all(stopsWithDist.map(async (stop) => {
              try {
                 const etas = await getStopEtasForStop(stop.stop);
                 const uniqueRoutes = Array.from(new Set(etas.map(e => e.route))).sort();
                 // Filter out undefined/null routes just in case
                 const validRoutes = uniqueRoutes.filter((r): r is string => !!r);
                 return { ...stop, routes: validRoutes };
              } catch {
                 return { ...stop, routes: [] };
              }
          }));

          setNearbyStops(detailedNearby);
      } catch (err) {
          console.error(err);
          setNearbyError("Error processing nearby stops.");
      } finally {
          setNearbyLoading(false);
      }
  };

  // --- Handlers ---

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (routeInput.trim()) {
      setActiveRoute(routeInput.trim().toUpperCase());
    }
  };

  const formatTime = (isoString: string | null) => {
    if (!isoString) return '--:--';
    const date = new Date(isoString);
    const now = new Date();
    const diffMs = date.getTime() - now.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 0) return 'Arrived';
    if (diffMins === 0) return '< 1 min';
    return `${diffMins} min`;
  };

  const formatDistance = (meters: number) => {
      if (meters < 1000) return `${Math.round(meters)}m`;
      return `${(meters / 1000).toFixed(1)}km`;
  };

  // Initial Location Request on mount (optional, or wait for user action)
  useEffect(() => {
     // We don't auto-request on mount to avoid permission spam, 
     // but we can if the user previously granted it.
  }, []);

  return (
    <div className="max-w-3xl mx-auto">
      {/* Tabs */}
      <div className="flex bg-white rounded-xl shadow-sm border border-slate-100 p-1 mb-6">
          <button 
             onClick={() => setActiveTab('search')}
             className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-lg font-bold transition-all ${activeTab === 'search' ? 'bg-indigo-50 text-indigo-600' : 'text-slate-400 hover:text-slate-600'}`}
          >
              <Search size={18} />
              Route Search
          </button>
          <button 
             onClick={() => {
                 setActiveTab('nearby');
                 if (!userLocation && nearbyStops.length === 0) {
                     handleLocateMe();
                 }
             }}
             className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-lg font-bold transition-all ${activeTab === 'nearby' ? 'bg-indigo-50 text-indigo-600' : 'text-slate-400 hover:text-slate-600'}`}
          >
              <MapPin size={18} />
              Nearby Stops
          </button>
      </div>

      {activeTab === 'search' ? (
        <>
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 mb-8">
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                        <Clock className="text-red-500" />
                        Check Route ETA
                    </h2>
                    <button 
                        onClick={handleLocateMe}
                        className={`text-sm flex items-center gap-1 font-medium transition-colors ${userLocation ? 'text-green-600' : 'text-slate-400 hover:text-indigo-600'}`}
                        title="Locate me to find nearest stop on route"
                    >
                        <Navigation size={14} />
                        {userLocation ? 'Located' : 'Locate Me'}
                    </button>
                </div>
                <form onSubmit={handleSearch} className="flex gap-2">
                <div className="relative flex-grow">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold">Route</span>
                    <input
                    type="text"
                    value={routeInput}
                    onChange={(e) => setRouteInput(e.target.value)}
                    placeholder="e.g. 1A, 101, 960"
                    className="w-full pl-20 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition-all font-bold text-slate-800 uppercase"
                    />
                </div>
                <button
                    type="submit"
                    className="px-6 py-3 bg-red-600 text-white font-bold rounded-xl hover:bg-red-700 transition-colors shadow-lg shadow-red-600/20"
                >
                    Go
                </button>
                </form>
            </div>

            {activeRoute && (
                <div className="space-y-6">
                <div className="flex bg-slate-100 p-1 rounded-xl">
                    <button
                    onClick={() => setDirection('outbound')}
                    className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-semibold transition-all ${
                        direction === 'outbound' 
                        ? 'bg-white text-red-600 shadow-sm' 
                        : 'text-slate-500 hover:text-slate-700'
                    }`}
                    >
                    Outbound
                    </button>
                    <button
                    onClick={() => setDirection('inbound')}
                    className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-semibold transition-all ${
                        direction === 'inbound' 
                        ? 'bg-white text-red-600 shadow-sm' 
                        : 'text-slate-500 hover:text-slate-700'
                    }`}
                    >
                    Inbound <ArrowLeftRight size={14} />
                    </button>
                </div>

                {loading && (
                    <div className="space-y-4 animate-pulse">
                    {[...Array(5)].map((_, i) => (
                        <div key={i} className="h-20 bg-white rounded-xl"></div>
                    ))}
                    </div>
                )}

                {error && !loading && (
                    <div className="p-4 bg-red-50 text-red-600 rounded-xl text-center font-medium">
                    {error}
                    </div>
                )}

                {!loading && !error && stops.length > 0 && (
                    <div className="relative">
                    <div className="absolute left-6 top-4 bottom-4 w-0.5 bg-slate-200"></div>

                    <div className="space-y-4">
                        {stops.map((stop, index) => {
                            const isNearest = autoSelectedStopId === stop.stop;
                            return (
                                <div 
                                    key={`${stop.stop}-${index}`} 
                                    className={`relative p-4 rounded-xl border shadow-sm transition-all pl-16 ${
                                        isNearest 
                                            ? 'bg-indigo-50 border-indigo-200 ring-1 ring-indigo-200' 
                                            : 'bg-white border-slate-100 hover:shadow-md'
                                    }`}
                                >
                                    
                                    <div className={`absolute left-6 top-1/2 -translate-y-1/2 -translate-x-1/2 w-4 h-4 rounded-full z-10 border-4 ${isNearest ? 'bg-indigo-600 border-indigo-200' : 'bg-white border-red-500'}`}></div>
                                    <div className="absolute left-10 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-300">
                                    {index + 1}
                                    </div>
                                    
                                    {isNearest && (
                                        <div className="absolute top-2 right-2 text-xs font-bold text-indigo-600 bg-white px-2 py-1 rounded-md shadow-sm">
                                            Closest to you
                                        </div>
                                    )}

                                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                                    <div>
                                        <h3 className="font-bold text-slate-800 text-lg">
                                        {stop.details?.name_en || 'Loading...'}
                                        </h3>
                                        <p className="text-slate-500 text-sm">
                                        {stop.details?.name_tc}
                                        </p>
                                    </div>

                                    <div className="flex items-center gap-3">
                                        <div className="flex flex-col items-end gap-1">
                                        {stop.etas && stop.etas.length > 0 ? (
                                            stop.etas.slice(0, 3).map((eta, i) => (
                                            <div key={i} className="flex items-center gap-2">
                                                <span className="text-xs text-slate-400 font-medium">
                                                {eta.dest_en ? `To ${eta.dest_en}` : 'Scheduled'}
                                                </span>
                                                <span className={`px-2 py-1 rounded-md text-sm font-bold w-20 text-center ${
                                                i === 0 ? 'bg-red-50 text-red-600' : 'bg-slate-50 text-slate-600'
                                                }`}>
                                                {formatTime(eta.eta)}
                                                </span>
                                            </div>
                                            ))
                                        ) : (
                                            <span className="text-xs text-slate-400">
                                                {stop.etas ? "No ETA data" : "Loading..."}
                                            </span>
                                        )}
                                        </div>
                                        
                                        {stop.details && (
                                            <a
                                                href={`https://www.google.com/maps/search/?api=1&query=${stop.details.lat},${stop.details.long}`}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                                title="View Location"
                                            >
                                                <MapPin size={20} />
                                            </a>
                                        )}
                                    </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                    </div>
                )}
                </div>
            )}
        </>
      ) : (
          /* --- Nearby Tab Content --- */
          <div className="space-y-6">
              {!userLocation && !nearbyLoading && (
                  <div className="text-center py-12 bg-white rounded-2xl border border-dashed border-slate-200">
                      <div className="mx-auto w-12 h-12 bg-slate-100 text-slate-400 rounded-full flex items-center justify-center mb-4">
                          <MapPin size={24} />
                      </div>
                      <h3 className="text-lg font-bold text-slate-800 mb-2">Locate Nearby Stops</h3>
                      <p className="text-slate-500 mb-6">Allow access to your location to find the closest KMB bus stops.</p>
                      <button 
                         onClick={handleLocateMe}
                         className="px-6 py-2.5 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-600/20 inline-flex items-center gap-2"
                      >
                          <Navigation size={18} />
                          Share Location
                      </button>
                  </div>
              )}

              {nearbyLoading && (
                  <div className="text-center py-12">
                      <Loader2 className="animate-spin text-indigo-600 mx-auto mb-4" size={32} />
                      <p className="text-slate-500 font-medium">Finding nearby stops...</p>
                      <p className="text-xs text-slate-400 mt-2">Downloading database (~5MB), please wait.</p>
                  </div>
              )}

              {nearbyError && (
                   <div className="p-4 bg-red-50 text-red-600 rounded-xl text-center font-medium flex flex-col items-center gap-2">
                       <p>{nearbyError}</p>
                       <button onClick={handleLocateMe} className="text-sm underline hover:text-red-800">Try Again</button>
                   </div>
              )}

              {nearbyStops.length > 0 && (
                  <div className="space-y-4">
                      <h3 className="font-bold text-slate-800 px-2">Closest Stops</h3>
                      {nearbyStops.map((stop) => (
                          <div key={stop.stop} className="bg-white p-5 rounded-xl border border-slate-100 shadow-sm hover:shadow-md transition-all group">
                              <div className="flex items-start justify-between mb-4">
                                  <div>
                                      <h4 className="font-bold text-slate-800 text-lg">{stop.name_en}</h4>
                                      <p className="text-slate-500">{stop.name_tc}</p>
                                  </div>
                                  <div className="bg-indigo-50 text-indigo-700 px-3 py-1 rounded-full text-xs font-bold">
                                      {formatDistance(stop.distance)}
                                  </div>
                              </div>
                              
                              <div className="space-y-2">
                                  <p className="text-xs font-bold text-slate-400 uppercase tracking-wide">Routes passing here</p>
                                  <div className="flex flex-wrap gap-2">
                                      {stop.routes.length > 0 ? (
                                          stop.routes.map(route => (
                                              <button 
                                                 key={route}
                                                 onClick={() => {
                                                     setRouteInput(route);
                                                     setActiveRoute(route);
                                                     setActiveTab('search');
                                                 }}
                                                 className="px-2.5 py-1 bg-slate-100 text-slate-700 text-sm font-bold rounded-md hover:bg-red-50 hover:text-red-600 transition-colors"
                                              >
                                                  {route}
                                              </button>
                                          ))
                                      ) : (
                                          <span className="text-slate-400 text-sm italic">No route data available</span>
                                      )}
                                  </div>
                              </div>

                              <div className="mt-4 pt-4 border-t border-slate-50 flex justify-end">
                                  <a
                                    href={`https://www.google.com/maps/search/?api=1&query=${stop.lat},${stop.long}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-sm text-slate-400 flex items-center gap-1 hover:text-indigo-600 transition-colors"
                                  >
                                      Open in Maps <Navigation size={14} />
                                  </a>
                              </div>
                          </div>
                      ))}
                  </div>
              )}
          </div>
      )}
    </div>
  );
};