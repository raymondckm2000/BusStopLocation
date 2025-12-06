import React, { useState } from 'react';
import { Search, MapPin, Loader2 } from 'lucide-react';
import { LocationCoords } from '../types';

interface SearchSectionProps {
  onSearch: (query: string, location?: LocationCoords) => void;
  isLoading: boolean;
}

export const SearchSection: React.FC<SearchSectionProps> = ({ onSearch, isLoading }) => {
  const [query, setQuery] = useState('');
  const [isLocating, setIsLocating] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      onSearch(query);
    }
  };

  const handleGeolocation = () => {
    if (!navigator.geolocation) {
      alert("Geolocation is not supported by your browser");
      return;
    }

    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const coords = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        };
        setIsLocating(false);
        // Automatically search for "bus stops near me" when location is found
        onSearch("bus stops near me", coords);
        setQuery("Bus stops near my location");
      },
      (error) => {
        setIsLocating(false);
        console.error(error);
        alert("Unable to retrieve your location. Please check permissions.");
      }
    );
  };

  return (
    <div className="w-full max-w-2xl mx-auto">
      <form onSubmit={handleSubmit} className="relative group">
        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
          <Search className="h-5 w-5 text-slate-400 group-focus-within:text-indigo-500 transition-colors" />
        </div>
        <input
          type="text"
          className="block w-full pl-11 pr-32 py-4 bg-white border-2 border-slate-100 rounded-2xl text-slate-900 placeholder-slate-400 focus:outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all shadow-sm text-base"
          placeholder="e.g. Bus stops in Downtown Seattle..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          disabled={isLoading}
        />
        <div className="absolute inset-y-2 right-2 flex gap-2">
           <button
            type="button"
            onClick={handleGeolocation}
            disabled={isLoading || isLocating}
            className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all disabled:opacity-50"
            title="Use current location"
          >
            {isLocating ? <Loader2 className="animate-spin h-5 w-5" /> : <MapPin className="h-5 w-5" />}
          </button>
          <button
            type="submit"
            disabled={isLoading || !query.trim()}
            className="px-6 bg-indigo-600 text-white rounded-xl text-sm font-semibold hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed shadow-md hover:shadow-lg transition-all"
          >
            {isLoading ? 'Searching...' : 'Find'}
          </button>
        </div>
      </form>
      <div className="mt-3 flex gap-2 justify-center">
        {['Nearby', 'Downtown', 'Airport', 'University'].map((term) => (
          <button
            key={term}
            type="button"
            onClick={() => {
                setQuery(`Bus stops near ${term}`);
                onSearch(`Bus stops near ${term}`);
            }}
            className="px-3 py-1 bg-white border border-slate-200 rounded-full text-xs font-medium text-slate-600 hover:border-indigo-300 hover:text-indigo-600 transition-all"
          >
            {term}
          </button>
        ))}
      </div>
    </div>
  );
};
