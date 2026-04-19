"use client";

import React, { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import Sidebar from '@/components/Sidebar';
import { supabase, Location } from '@/lib/supabase';
import { Loader2 } from 'lucide-react';

const MapView = dynamic(() => import('@/components/Map'), { 
  ssr: false,
  loading: () => (
    <div className="flex-1 bg-emerald-50 animate-pulse flex flex-col items-center justify-center text-emerald-800 font-medium">
      <Loader2 className="w-8 h-8 animate-spin mb-4" />
      Đang tải bản đồ...
    </div>
  )
});

export default function Home() {
  const [locations, setLocations] = useState<Location[]>([]);
  const [focusLocation, setFocusLocation] = useState<Location | undefined>(undefined);
  const [activeDayId, setActiveDayId] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [pickingLocationId, setPickingLocationId] = useState<string | null>(null);

  useEffect(() => {
    if (activeDayId) {
      fetchDayLocations(activeDayId);
    }
  }, [activeDayId, refreshKey]);

  async function fetchDayLocations(dayId: string) {
    const { data: slots } = await supabase
      .from('time_slots')
      .select(`
        *,
        locations (*)
      `)
      .eq('day_id', dayId)
      .order('start_time', { ascending: true });
    
    if (slots) {
      // Làm phẳng danh sách: Slot sớm nhất sẽ chứa các location (option) đầu tiên
      const allLocs = slots.flatMap(s => {
        // Trong cùng 1 slot, ưu tiên option "Chính" lên trước để đánh số đẹp
        return s.locations.sort((a: any, b: any) => (b.is_primary ? 1 : 0) - (a.is_primary ? 1 : 0));
      });
      setLocations(allLocs);
    }
  }

  const handleMapClick = async (lat: number, lng: number) => {
    if (pickingLocationId) {
      await supabase.from('locations').update({ lat, lng }).eq('id', pickingLocationId);
      setPickingLocationId(null);
      handleRefresh();
    }
  };

  const handleRefresh = () => {
    setRefreshKey(prev => prev + 1);
  };

  return (
    <main className="flex flex-col md:flex-row h-screen w-screen overflow-hidden bg-white">
      <Sidebar 
        onRefresh={handleRefresh}
        onLocationClick={setFocusLocation}
        activeDayId={activeDayId}
        setActiveDayId={setActiveDayId}
        pickingLocationId={pickingLocationId}
        setPickingLocationId={setPickingLocationId}
      />
      
      <div className="flex-1 relative">
        <MapView 
          locations={locations} 
          focusLocation={focusLocation} 
          isPickingLocation={!!pickingLocationId}
          onMapClick={handleMapClick}
        />
        
        {/* Connection Status Overlay */}
        <div className="absolute bottom-6 left-6 z-10">
          <div className="bg-white/90 backdrop-blur-md px-4 py-2 rounded-full shadow-lg border border-emerald-100 flex items-center gap-3">
            <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
            <span className="text-[10px] font-bold text-emerald-900 uppercase tracking-widest"></span>
          </div>
        </div>
      </div>
    </main>
  );
}
