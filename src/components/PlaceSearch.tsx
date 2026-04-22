"use client";

import React, { useState, useEffect, useRef } from 'react';
import { Search, MapPin, Loader2, Check } from 'lucide-react';

interface Suggestion {
  place_id: number | string;
  display_name: string;
  lat: string;
  lon: string;
  isExtraction?: boolean;
}

interface PlaceSearchProps {
  onSelect: (name: string, lat: number, lng: number) => void;
  placeholder?: string;
}

export default function PlaceSearch({ onSelect, placeholder = "Tìm kiếm địa điểm..." }: PlaceSearchProps) {
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [extractedName, setExtractedName] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    const timer = setTimeout(async () => {
      if (query.length < 3) {
        setSuggestions([]);
        return;
      }

      // Check for coordinates or Google Maps links
      const coordRegex = /(-?\d+\.\d+)\s*,\s*(-?\d+\.\d+)/;
      const urlRegex = /@(-?\d+\.\d+),(-?\d+\.\d+)/;
      
      const coordMatch = query.match(coordRegex);
      const urlMatch = query.match(urlRegex);

      if (coordMatch || urlMatch) {
        const lat = coordMatch ? coordMatch[1] : (urlMatch ? urlMatch[1] : null);
        const lon = coordMatch ? coordMatch[2] : (urlMatch ? urlMatch[2] : null);
        
        if (lat && lon) {
          // Attempt to extract name from URL
          let detectedName = '';
          if (query.includes('google.com/maps')) {
            if (query.includes('place/')) {
              const placePart = query.split('place/')[1].split('/')[0];
              detectedName = decodeURIComponent(placePart).replace(/\+/g, ' ');
            } else if (query.includes('q=')) {
              const q = new URL(query).searchParams.get('q');
              if (q) detectedName = q.replace(/^[A-Z0-9]{4}\+[A-Z0-9]{2,}\s*/, '');
            }
          }

          setExtractedName(detectedName);
          setSuggestions([{
            place_id: 'extraction',
            display_name: `${lat}, ${lon}`,
            lat: lat,
            lon: lon,
            isExtraction: true
          }]);
          setIsOpen(true);
          setIsLoading(false);
          return;
        }
      }

      // Check for shortened links (warning)
      if (query.includes('share.google') || query.includes('maps.app.goo.gl')) {
        setSuggestions([{
          place_id: -1,
          display_name: `Sử dụng link dài (có tọa độ @) để trích xuất tự động!`,
          lat: '0',
          lon: '0',
          isExtraction: false
        }]);
        setIsOpen(true);
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      try {
        const queryWithCity = encodeURIComponent(query + " Da Lat");
        const response = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&q=${queryWithCity}&limit=5`
        );
        let data = await response.json();

        if (data.length === 0) {
          const fallbackRes = await fetch(
            `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=5`
          );
          data = await fallbackRes.json();
        }

        setSuggestions(data);
        setIsOpen(true);
      } catch (error) {
        console.error("Search error:", error);
      } finally {
        setIsLoading(false);
      }
    }, 800);

    return () => clearTimeout(timer);
  }, [query]);

  const handleConfirmExtraction = (s: Suggestion) => {
    const finalName = extractedName.trim() || `Địa điểm (${s.display_name})`;
    onSelect(finalName, parseFloat(s.lat), parseFloat(s.lon));
    setQuery(finalName);
    setIsOpen(false);
    setExtractedName('');
  };

  return (
    <div ref={containerRef} className="relative w-full">
      <div className="relative">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={placeholder}
          className="w-full pl-10 pr-4 py-2 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition-all text-sm"
        />
        <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
          {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
        </div>
      </div>

      {isOpen && suggestions.length > 0 && (
        <div className="absolute z-50 w-full mt-2 bg-white rounded-xl shadow-2xl border border-gray-100 overflow-hidden">
          {suggestions.map((s) => (
            <div key={s.place_id} className="border-b border-gray-50 last:border-0">
              {s.isExtraction ? (
                <div className="p-4 bg-emerald-50 border-l-4 border-emerald-500">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="bg-emerald-500 text-white p-1 rounded-md">
                      <Check className="w-3 h-3" />
                    </div>
                    <span className="text-[10px] font-black text-emerald-700 uppercase tracking-widest">Phát hiện địa điểm</span>
                  </div>
                  <div className="space-y-3">
                    <input 
                      type="text"
                      autoFocus
                      placeholder="Tên địa điểm (ví dụ: Lưng chừng cafe)"
                      value={extractedName}
                      onChange={(e) => setExtractedName(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-emerald-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-emerald-500 font-bold"
                    />
                    <div className="flex items-center justify-between">
                      <div className="text-[10px] text-emerald-600 font-mono">Tọa độ: {s.display_name}</div>
                      <button 
                        onClick={() => handleConfirmExtraction(s)}
                        className="bg-emerald-600 text-white px-4 py-1.5 rounded-lg hover:bg-emerald-700 transition-all text-xs font-bold shadow-sm flex items-center gap-2"
                      >
                        XÁC NHẬN
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => {
                    onSelect(s.display_name.split(',')[0], parseFloat(s.lat), parseFloat(s.lon));
                    setQuery(s.display_name.split(',')[0]);
                    setIsOpen(false);
                  }}
                  className="w-full flex items-start gap-4 p-4 hover:bg-emerald-50 text-left transition-colors"
                >
                  <MapPin className="w-4 h-4 mt-1 text-emerald-600 shrink-0" />
                  <div>
                    <div className="text-sm font-semibold text-gray-900 line-clamp-1">{s.display_name.split(',')[0]}</div>
                    <div className="text-[10px] text-gray-400 mt-0.5 line-clamp-1">{s.display_name}</div>
                  </div>
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
