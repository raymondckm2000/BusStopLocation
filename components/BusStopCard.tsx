import React from 'react';
import { MapPin, Navigation, ExternalLink } from 'lucide-react';
import { MapsGroundingChunk } from '../types';

interface BusStopCardProps {
  data: MapsGroundingChunk;
  index: number;
}

export const BusStopCard: React.FC<BusStopCardProps> = ({ data, index }) => {
  if (!data.title) return null;

  return (
    <div className="bg-white rounded-xl shadow-sm hover:shadow-md transition-all duration-300 border border-slate-100 overflow-hidden group">
      <div className="p-5">
        <div className="flex items-start justify-between">
          <div className="flex gap-3">
            <div className="mt-1 bg-indigo-50 p-2 rounded-lg text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white transition-colors duration-300">
              <MapPin size={20} />
            </div>
            <div>
              <h3 className="font-semibold text-slate-800 text-lg leading-tight mb-1">
                {data.title}
              </h3>
              <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">
                Bus Stop / Transit Station
              </p>
            </div>
          </div>
          <div className="flex-shrink-0 bg-slate-100 text-slate-500 text-xs font-bold w-6 h-6 rounded-full flex items-center justify-center">
            {index + 1}
          </div>
        </div>
        
        {/* Render review snippets if available (sometimes contains useful transit info) */}
        {data.placeAnswerSources?.reviewSnippets && data.placeAnswerSources.reviewSnippets.length > 0 && (
          <div className="mt-4 bg-slate-50 rounded-lg p-3 text-sm text-slate-600 italic border-l-2 border-indigo-200">
            "{data.placeAnswerSources.reviewSnippets[0].reviewText}"
          </div>
        )}

        <div className="mt-5 flex gap-2">
          {data.uri && (
            <a 
              href={data.uri}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 focus:ring-4 focus:ring-indigo-100 transition-all"
            >
              <Navigation size={16} />
              Navigate
            </a>
          )}
          {data.uri && (
            <a 
              href={data.uri}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center px-4 py-2.5 bg-white border border-slate-200 text-slate-700 text-sm font-medium rounded-lg hover:bg-slate-50 hover:text-indigo-600 transition-all"
              title="Open in Maps"
            >
              <ExternalLink size={16} />
            </a>
          )}
        </div>
      </div>
    </div>
  );
};
