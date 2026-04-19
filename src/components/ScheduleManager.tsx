"use client";

import React, { useState, useEffect } from 'react';
import { supabase, Day, TimeSlot, Location } from '@/lib/supabase';
import { Plus, Trash2, Clock, MapPin, ChevronRight, Save, Image as ImageIcon, CheckCircle2, Navigation } from 'lucide-react';
import PlaceSearch from './PlaceSearch';
import ImageUpload from './ImageUpload';
import { clsx } from 'clsx';

export default function ScheduleManager({ 
  onRefresh, 
  activeDayId, 
  setActiveDayId 
}: { 
  onRefresh: () => void, 
  activeDayId: string | null,
  setActiveDayId: (id: string) => void
}) {
  const [days, setDays] = useState<Day[]>([]);
  const [slots, setSlots] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAddingSlot, setIsAddingSlot] = useState(false);

  useEffect(() => {
    fetchDays();
  }, []);

  useEffect(() => {
    if (activeDayId) fetchSlots(activeDayId);
  }, [activeDayId]);

  async function fetchDays() {
    const { data } = await supabase.from('days').select('*').order('date');
    if (data) {
      setDays(data);
      if (data.length > 0 && !activeDayId) setActiveDayId(data[0].id);
    }
    setLoading(false);
  }

  async function fetchSlots(dayId: string) {
    const { data } = await supabase
      .from('time_slots')
      .select('*, locations(*)')
      .eq('day_id', dayId)
      .order('start_time');
    if (data) setSlots(data);
  }

  async function addDay() {
    const nextDate = new Date('2026-04-26'); // Bắt đầu từ ngày bạn dự kiến
    if (days.length > 0) {
      const lastDate = new Date(days[days.length - 1].date);
      nextDate.setDate(lastDate.getDate() + 1);
    }
    const { data, error } = await supabase.from('days').insert([
      { date: nextDate.toISOString().split('T')[0], label: `Ngày ${days.length + 1}` }
    ]).select();
    
    if (error) {
      console.error("Lỗi thêm ngày:", error);
      alert("Lỗi Supabase: " + error.message);
      return;
    }

    if (data) {
      await fetchDays();
      setActiveDayId(data[0].id);
    }
  }

  async function initFourDays() {
    const startDate = new Date('2026-04-26');
    const newDays = Array.from({ length: 4 }).map((_, i) => {
      const d = new Date(startDate);
      d.setDate(d.getDate() + i);
      return { date: d.toISOString().split('T')[0], label: `Ngày ${i + 1}` };
    });

    const { error } = await supabase.from('days').insert(newDays);
    if (error) alert("Lỗi khởi tạo: " + error.message);
    else fetchDays();
  }

  async function addSlot() {
    if (!activeDayId) {
      alert("Vui lòng chọn hoặc tạo ngày trước khi thêm khung giờ!");
      return;
    }
    const { data, error } = await supabase.from('time_slots').insert([
      { day_id: activeDayId, start_time: '08:00:00', title: 'Hoạt động mới', display_order: slots.length }
    ]).select();

    if (error) {
      console.error("Lỗi thêm khung giờ:", error);
      alert("Lỗi Supabase: " + error.message);
      return;
    }

    if (data) fetchSlots(activeDayId);
  }

  async function deleteSlot(id: string) {
    await supabase.from('time_slots').delete().eq('id', id);
    fetchSlots(activeDayId!);
    onRefresh();
  }

  async function addLocation(slotId: string) {
    const { data } = await supabase.from('locations').insert([
      { 
        time_slot_id: slotId, 
        name: 'Địa điểm mới', 
        lat: 11.9416, 
        lng: 108.4361, 
        images: [],
        is_primary: slots.find(s => s.id === slotId)?.locations.length === 0
      }
    ]).select();
    if (data) {
      fetchSlots(activeDayId!);
      onRefresh();
    }
  }

  async function updateLocation(locId: string, updates: Partial<Location>) {
    await supabase.from('locations').update(updates).eq('id', locId);
    fetchSlots(activeDayId!);
    onRefresh();
  }

  async function deleteLocation(locId: string) {
    await supabase.from('locations').delete().eq('id', locId);
    fetchSlots(activeDayId!);
    onRefresh();
  }

  if (loading) return <div className="p-8 text-center text-gray-400">Đang tải dữ liệu...</div>;

  return (
    <div className="flex-1 flex flex-col min-h-0">
      {/* Day Selector */}
      <div className="p-4 bg-gray-50 border-b border-gray-100">
        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
          {days.length === 0 && (
            <button 
              onClick={initFourDays}
              className="flex-1 py-2 bg-emerald-100 text-emerald-800 rounded-xl text-sm font-bold border border-emerald-200 hover:bg-emerald-200 transition-all"
            >
              🚀 Khởi tạo lộ trình 4 ngày
            </button>
          )}
          {days.map((day) => (
            <button
              key={day.id}
              onClick={() => setActiveDayId(day.id)}
              className={clsx(
                "px-4 py-2 rounded-xl text-sm font-bold whitespace-nowrap transition-all",
                activeDayId === day.id ? "bg-emerald-800 text-white shadow-md" : "bg-white text-gray-500 border border-gray-200"
              )}
            >
              {day.label}
            </button>
          ))}
          {days.length > 0 && (
            <button 
              onClick={addDay}
              className="px-4 py-2 rounded-xl border-2 border-dashed border-gray-300 text-gray-400 hover:border-emerald-500 hover:text-emerald-600 transition-all"
            >
              <Plus className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Slots Timeline */}
      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {slots.map((slot) => (
          <div key={slot.id} className="relative pl-6 border-l-2 border-emerald-100 space-y-4">
            <div className="absolute -left-[9px] top-0 w-4 h-4 rounded-full bg-emerald-500 border-4 border-white shadow-sm" />
            
            <div className="flex items-center justify-between group">
              <div className="flex items-center gap-3">
                <input 
                  type="time" 
                  value={slot.start_time.substring(0, 5)} 
                  onChange={async (e) => {
                    await supabase.from('time_slots').update({ start_time: e.target.value }).eq('id', slot.id);
                    fetchSlots(activeDayId!);
                  }}
                  className="text-xs font-black text-emerald-700 bg-emerald-50 px-2 py-1 rounded-md outline-none"
                />
                <input 
                  type="text" 
                  value={slot.title} 
                  onChange={async (e) => {
                    setSlots(slots.map(s => s.id === slot.id ? {...s, title: e.target.value} : s));
                  }}
                  onBlur={async (e) => {
                    await supabase.from('time_slots').update({ title: e.target.value }).eq('id', slot.id);
                    onRefresh();
                  }}
                  className="font-bold text-gray-900 bg-transparent outline-none focus:text-emerald-800"
                />
              </div>
              <button onClick={() => deleteSlot(slot.id)} className="opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-600 p-1">
                <Trash2 className="w-4 h-4" />
              </button>
            </div>

            {/* Locations/Options */}
            <div className="space-y-3">
              {slot.locations?.map((loc: Location) => (
                <div key={loc.id} className={clsx(
                  "p-4 rounded-2xl border transition-all",
                  loc.is_primary ? "bg-white border-emerald-100 shadow-sm" : "bg-gray-50 border-gray-100"
                )}>
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex-1 mr-2">
                      <PlaceSearch 
                        placeholder={loc.name}
                        onSelect={(name, lat, lng) => updateLocation(loc.id, { name, lat, lng })} 
                      />
                    </div>
                    <div className="flex items-center gap-1">
                      <a 
                        href={`https://www.google.com/maps/dir/?api=1&destination=${loc.lat},${loc.lng}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                        title="Mở Google Maps chỉ đường"
                      >
                        <Navigation className="w-4 h-4" />
                      </a>
                      <button 
                        onClick={() => updateLocation(loc.id, { is_primary: !loc.is_primary })}
                        className={clsx("p-1.5 rounded-lg transition-colors", loc.is_primary ? "text-emerald-600 bg-emerald-50" : "text-gray-400 hover:bg-gray-100")}
                        title="Chọn làm phương án chính"
                      >
                        <CheckCircle2 className="w-4 h-4" />
                      </button>
                      <button onClick={() => deleteLocation(loc.id)} className="p-1.5 text-gray-400 hover:text-red-500">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 mb-3 bg-gray-100/50 px-3 py-1.5 rounded-xl border border-gray-100">
                    <span className="text-[10px] font-bold text-gray-400">VNĐ</span>
                    <input 
                      type="number"
                      placeholder="Giá tiền (ví dụ: 50000)"
                      value={loc.price || ''}
                      onChange={(e) => {
                        const newSlots = slots.map(s => {
                          if (s.id === slot.id) {
                            return {
                              ...s,
                              locations: s.locations.map((l: any) => 
                                l.id === loc.id ? { ...l, price: parseInt(e.target.value) || 0 } : l
                              )
                            };
                          }
                          return s;
                        });
                        setSlots(newSlots);
                      }}
                      onBlur={(e) => updateLocation(loc.id, { price: parseInt(e.target.value) || 0 })}
                      className="w-full text-xs font-bold text-emerald-700 bg-transparent outline-none"
                    />
                  </div>

                  <textarea 
                    placeholder="Mô tả địa điểm..."
                    value={loc.description || ''}
                    onChange={(e) => {
                      const newSlots = slots.map(s => {
                        if (s.id === slot.id) {
                          return {
                            ...s,
                            locations: s.locations.map((l: any) => 
                              l.id === loc.id ? { ...l, description: e.target.value } : l
                            )
                          };
                        }
                        return s;
                      });
                      setSlots(newSlots);
                    }}
                    onBlur={(e) => updateLocation(loc.id, { description: e.target.value })}
                    className="w-full text-xs text-gray-500 bg-transparent resize-none outline-none mb-3 border-b border-transparent focus:border-emerald-100 transition-all"
                    rows={2}
                  />

                  <ImageUpload 
                    images={loc.images || []} 
                    onChange={(urls) => updateLocation(loc.id, { images: urls })} 
                  />
                </div>
              ))}

              <button 
                onClick={() => addLocation(slot.id)}
                className="w-full py-2 flex items-center justify-center gap-2 border-2 border-dashed border-gray-100 rounded-xl text-xs font-bold text-gray-400 hover:border-emerald-200 hover:text-emerald-600 transition-all"
              >
                <Plus className="w-3 h-3" /> Thêm lựa chọn
              </button>
            </div>
          </div>
        ))}

        <button 
          onClick={addSlot}
          className="w-full py-4 flex flex-col items-center justify-center gap-2 bg-emerald-50 border-2 border-dashed border-emerald-100 rounded-2xl text-emerald-700 hover:bg-emerald-100 transition-all"
        >
          <Plus className="w-6 h-6" />
          <span className="text-sm font-bold">Thêm khung giờ mới</span>
        </button>
      </div>
    </div>
  );
}
