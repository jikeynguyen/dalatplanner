"use client";

import React, { useState } from 'react';
import { MapPin, Settings, ChevronLeft, Map as MapIcon } from 'lucide-react';
import ScheduleManager from './ScheduleManager';

interface SidebarProps {
  onRefresh: () => void;
  onLocationClick: (loc: any) => void;
  activeDayId: string | null;
  setActiveDayId: (id: string) => void;
  pickingLocationId: string | null;
  setPickingLocationId: (id: string | null) => void;
}

export default function Sidebar({ 
  onRefresh, 
  onLocationClick, 
  activeDayId, 
  setActiveDayId 
}: SidebarProps) {
  const [view, setView] = useState<'schedule' | 'settings'>('schedule');

  return (
    <aside className="w-full md:w-[450px] h-full bg-white flex flex-col shadow-2xl z-20 overflow-hidden border-r border-gray-100">
      {/* Header Banner */}
      <div className="relative h-40 bg-emerald-900 shrink-0">
        <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1583417319070-4a69db38a482?auto=format&fit=crop&q=80')] bg-cover bg-center opacity-40" />
        <div className="absolute inset-0 bg-gradient-to-t from-emerald-950 via-emerald-900/60 to-transparent z-10" />
        <div className="absolute bottom-6 left-6 z-20">
          <h1 className="text-3xl font-black text-white tracking-tight">Đà Lạt 2026</h1>
          <div className="flex items-center gap-2 text-emerald-100/90 text-sm font-bold">
            <MapPin className="w-4 h-4" />
            <span>Lịch trình thông minh</span>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <ScheduleManager 
        onRefresh={onRefresh} 
        activeDayId={activeDayId}
        setActiveDayId={setActiveDayId}
        pickingLocationId={pickingLocationId}
        setPickingLocationId={setPickingLocationId}
      />

      {/* Footer Branding */}
      <div className="p-4 bg-white border-t border-gray-100 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-emerald-100 rounded-lg flex items-center justify-center">
            <MapIcon className="w-4 h-4 text-emerald-700" />
          </div>
          <span className="text-xs font-black text-gray-400 uppercase tracking-widest">Da Lat Trip Planner</span>
        </div>
        <div className="text-[10px] text-gray-400 font-medium">v2.0 Beta</div>
      </div>
    </aside>
  );
}
