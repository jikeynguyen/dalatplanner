"use client";

import React, { useState, useEffect, useRef } from 'react';
import { Search, MapPin, Loader2 } from 'lucide-react';

interface Suggestion {
  place_id: number;
  display_name: string;
  lat: string;
  lon: string;
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
          place_id: 0,
          display_name: `Trích xuất tọa độ: ${lat}, ${lon}`,
          lat: lat,
          lon: lon
        }]);
        setIsOpen(true);
        setIsLoading(false);
        return;
      }

      // Kiểm tra nếu là link rút gọn
      if (query.includes('share.google') || query.includes('maps.app.goo.gl')) {
        setSuggestions([{
          place_id: -1,
          display_name: `⚠️ Link rút gọn không có tọa độ. Hãy mở link rồi copy địa chỉ dài trên trình duyệt!`,
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

        // Nếu không tìm thấy ở Đà Lạt, thử tìm kiếm tự do (có thể địa điểm ở ngoại ô)
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
            <button
              key={s.place_id}
              onClick={() => {
                onSelect(s.display_name.split(',')[0], parseFloat(s.lat), parseFloat(s.lon));
                setQuery(s.display_name.split(',')[0]);
                setIsOpen(false);
              }}
              className="w-full flex items-start gap-3 p-3 hover:bg-emerald-50 text-left transition-colors border-b border-gray-50 last:border-0"
            >
              <MapPin className="w-4 h-4 mt-1 text-emerald-600 shrink-0" />
              <div>
                <div className="text-sm font-semibold text-gray-900">{s.display_name.split(',')[0]}</div>
                <div className="text-[11px] text-gray-500 line-clamp-1">{s.display_name}</div>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
