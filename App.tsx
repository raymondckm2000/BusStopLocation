import React, { useState } from 'react';
import { SearchSection } from './components/SearchSection';
import { BusStopCard } from './components/BusStopCard';
import { findBusStops } from './services/geminiService';
import { GeminiResponse, LocationCoords, GroundingChunk } from './types';
import { Bus, Sparkles, AlertCircle, MapPin, Navigation } from 'lucide-react';

const App: React.FC = () => {
  const [data, setData] = useState<GeminiResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSearch = async (query: string, location?: LocationCoords) => {
    setLoading(true);
    setError(null);
    setData(null);

    try {
      const response = await findBusStops(query, location);
      setData(response);
    } catch (err) {
      setError("Failed to fetch bus stops. Please try again later.");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Filter chunks to only include Maps results
  const mapChunks = data?.groundingMetadata?.groundingChunks?.filter(
    (chunk: GroundingChunk) => chunk.maps && chunk.maps.title
  ) || [];

  return (
    <div className="min-h-screen flex flex-col bg-[#F8FAFC]">
      {/* Header */}
      <header className="bg-white border-b border-slate-100 sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="bg-indigo-600 p-2 rounded-lg text-white">
              <Bus size={24} />
            </div>
            <span className="text-xl font-bold text-slate-900 tracking-tight">TransitScout</span>
          </div>
          <div className="flex items-center gap-1.5 px-3 py-1 bg-indigo-50 rounded-full border border-indigo-100">
            <Sparkles size={14} className="text-indigo-600" />
            <span className="text-xs font-semibold text-indigo-700">Powered by Gemini</span>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-grow max-w-6xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-10">
        
        {/* Hero / Search Section */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-extrabold text-slate-900 mb-4 sm:text-5xl">
            Find your next <span className="text-indigo-600">stop</span>.
          </h1>
          <p className="text-lg text-slate-600 mb-8 max-w-2xl mx-auto">
            Locate nearby bus stops and transit stations instantly using intelligent location awareness.
          </p>
          <SearchSection onSearch={handleSearch} isLoading={loading} />
        </div>

        {/* Error State */}
        {error && (
          <div className="max-w-2xl mx-auto mb-8 p-4 bg-red-50 border border-red-100 rounded-xl flex items-center gap-3 text-red-700">
            <AlertCircle size={20} />
            <p>{error}</p>
          </div>
        )}

        {/* Loading State - Skeleton */}
        {loading && (
           <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-pulse">
             {[...Array(6)].map((_, i) => (
               <div key={i} className="bg-white rounded-xl h-48 border border-slate-100"></div>
             ))}
           </div>
        )}

        {/* Results Section */}
        {!loading && data && (
          <div className="space-y-10">
            
            {/* AI Summary */}
            <div className="bg-white rounded-2xl p-6 md:p-8 shadow-sm border border-slate-100">
              <div className="flex items-center gap-2 mb-4">
                <Sparkles className="text-indigo-500" size={20} />
                <h2 className="text-lg font-bold text-slate-800">AI Summary</h2>
              </div>
              <div className="prose prose-slate max-w-none text-slate-600">
                <p className="whitespace-pre-line leading-relaxed">{data.text}</p>
              </div>
            </div>

            {/* Stops Grid */}
            {mapChunks.length > 0 ? (
              <div>
                <h3 className="text-xl font-bold text-slate-900 mb-6 flex items-center gap-2">
                  Found {mapChunks.length} Locations
                  <span className="text-sm font-normal text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">Results from Google Maps</span>
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {mapChunks.map((chunk, idx) => (
                    chunk.maps && <BusStopCard key={idx} data={chunk.maps} index={idx} />
                  ))}
                </div>
              </div>
            ) : (
              <div className="text-center py-12 bg-white rounded-2xl border border-dashed border-slate-200">
                <p className="text-slate-500">No specific map locations were returned for this query.</p>
              </div>
            )}
          </div>
        )}

        {/* Empty State / Initial Instructions */}
        {!loading && !data && !error && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-16">
            <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
              <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center text-blue-600 mb-4">
                <MapPin size={20} />
              </div>
              <h3 className="font-semibold text-slate-900 mb-2">Geolocation Support</h3>
              <p className="text-sm text-slate-500">Use your current coordinates to find the absolute closest stops to you right now.</p>
            </div>
            <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
              <div className="w-10 h-10 bg-indigo-50 rounded-lg flex items-center justify-center text-indigo-600 mb-4">
                <Sparkles size={20} />
              </div>
              <h3 className="font-semibold text-slate-900 mb-2">Smart Analysis</h3>
              <p className="text-sm text-slate-500">Our AI analyzes maps data to provide helpful context about the stops found.</p>
            </div>
            <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
              <div className="w-10 h-10 bg-emerald-50 rounded-lg flex items-center justify-center text-emerald-600 mb-4">
                <Navigation size={20} />
              </div>
              <h3 className="font-semibold text-slate-900 mb-2">Direct Navigation</h3>
              <p className="text-sm text-slate-500">Get one-click directions to any stop using Google Maps integration.</p>
            </div>
          </div>
        )}
      </main>
      
      {/* Footer */}
      <footer className="bg-white border-t border-slate-100 mt-auto py-8">
        <div className="max-w-6xl mx-auto px-4 text-center text-slate-400 text-sm">
          <p>&copy; {new Date().getFullYear()} TransitScout AI. Built with Gemini.</p>
        </div>
      </footer>
    </div>
  );
};

export default App;