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

      // Kiểm tra nếu query là tọa độ (ví dụ: 11.94, 108.43)
      const coordRegex = /^(-?\d+(\.\d+)?)\s*,\s*(-?\d+(\.\d+)?)$/;
      const coordMatch = query.match(coordRegex);
      
      // Kiểm tra nếu query là link Google Maps (chứa @lat,lng)
      const urlRegex = /@(-?\d+(\.\d+)?),(-?\d+(\.\d+)?)/;
      const urlMatch = query.match(urlRegex);

      if (coordMatch || urlMatch) {
        const lat = coordMatch ? coordMatch[1] : urlMatch![1];
        const lon = coordMatch ? coordMatch[3] : urlMatch![3];
        
        setSuggestions([{
          place_id: 'extraction',
          display_name: `Tọa độ: ${lat}, ${lon}`,
          lat: lat,
          lon: lon,
          isExtraction: true
        }]);
        setIsOpen(true);
        setIsLoading(false);
        return;
      }

      // Kiểm tra nếu là link Google Maps dạng ?q=... (Trích xuất tên địa điểm)
      if (query.includes('google.com/maps') && (query.includes('q=') || query.includes('place/'))) {
        try {
          if (query.includes('place/')) {
            const placePart = query.split('place/')[1].split('/')[0];
            const cleanPlace = decodeURIComponent(placePart).replace(/\+/g, ' ');
            setExtractedName(cleanPlace);
          }
          const url = new URL(query);
          const q = url.searchParams.get('q');
          if (q) {
            const cleanQ = q.replace(/^[A-Z0-9]{4}\+[A-Z0-9]{2,}\s*/, '');
            setExtractedName(cleanQ);
          }
        } catch (e) {
          console.error("URL parse error:", e);
        }
      }

      // Kiểm tra nếu là link rút gọn
      if (query.includes('share.google') || query.includes('maps.app.goo.gl')) {
        setSuggestions([{
          place_id: -1,
          display_name: `⚠️ Link rút gọn không có tọa độ. Hãy mở link rồi copy địa chỉ dài có @lat,lng!`,
          lat: '0',
          lon: '0'
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
    const finalName = extractedName || s.display_name;
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
                <div className="p-4 bg-emerald-50">
                  <div className="text-[10px] font-black text-emerald-700 uppercase tracking-widest mb-2">Phát hiện tọa độ</div>
                  <div className="text-xs text-emerald-800 mb-3 font-medium">{s.display_name}</div>
                  <div className="flex gap-2">
                    <input 
                      type="text"
                      autoFocus
                      placeholder="Nhập tên địa điểm..."
                      value={extractedName}
                      onChange={(e) => setExtractedName(e.target.value)}
                      className="flex-1 px-3 py-2 bg-white border border-emerald-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                    <button 
                      onClick={() => handleConfirmExtraction(s)}
                      className="bg-emerald-600 text-white p-2 rounded-lg hover:bg-emerald-700 transition-colors"
                    >
                      <Check className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => {
                    onSelect(s.display_name.split(',')[0], parseFloat(s.lat), parseFloat(s.lon));
                    setQuery(s.display_name.split(',')[0]);
                    setIsOpen(false);
                  }}
                  className="w-full flex items-start gap-3 p-3 hover:bg-emerald-50 text-left transition-colors"
                >
                  <MapPin className="w-4 h-4 mt-1 text-emerald-600 shrink-0" />
                  <div>
                    <div className="text-sm font-semibold text-gray-900">{s.display_name.split(',')[0]}</div>
                    <div className="text-[11px] text-gray-500 line-clamp-1">{s.display_name}</div>
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
