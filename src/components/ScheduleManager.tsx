"use client";

import React, { useState, useEffect } from 'react';
import { supabase, Day, TimeSlot, Location } from '@/lib/supabase';
import { Plus, Trash2, Clock, MapPin, ChevronRight, Save, Image as ImageIcon, CheckCircle2, Navigation, Heart, Crosshair } from 'lucide-react';
import PlaceSearch from './PlaceSearch';
import ImageUpload from './ImageUpload';
import { clsx } from 'clsx';
import { getSlotColor } from '@/lib/colors';

export default function ScheduleManager({ 
  onRefresh, 
  activeDayId, 
  setActiveDayId,
  pickingLocationId,
  setPickingLocationId,
  onLocationClick
}: { 
  onRefresh: () => void, 
  activeDayId: string | null,
  setActiveDayId: (id: string) => void,
  pickingLocationId: string | null,
  setPickingLocationId: (id: string | null) => void,
  onLocationClick: (loc: any) => void
}) {
  const [days, setDays] = useState<Day[]>([]);
  const [slots, setSlots] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAddingSlot, setIsAddingSlot] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const [editingLocationId, setEditingLocationId] = useState<string | null>(null);

  useEffect(() => {
    setIsMounted(true);
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

  const [voterId, setVoterId] = useState<string>('');

  useEffect(() => {
    let id = localStorage.getItem('voter_id');
    if (!id) {
      id = Math.random().toString(36).substring(2, 15);
      localStorage.setItem('voter_id', id);
    }
    setVoterId(id);
  }, []);

  async function fetchSlots(dayId: string) {
    // Lấy slots kèm locations và đếm số lượng votes cho mỗi location
    const { data } = await supabase
      .from('time_slots')
      .select(`
        *,
        locations (
          *,
          votes (count)
        )
      `)
      .eq('day_id', dayId)
      .order('start_time');
    
    if (data) {
      const processedSlots = data.map(slot => ({
        ...slot,
        locations: slot.locations
          .map((loc: any) => ({
            ...loc,
            vote_count: loc.votes[0]?.count || 0
          }))
          .sort((a: any, b: any) => (b.is_primary ? 1 : 0) - (a.is_primary ? 1 : 0))
      }));
      setSlots(processedSlots);
    }
  }

  async function handleVote(slotId: string, locationId: string) {
    if (!voterId) return;

    // Xóa vote cũ của người này trong khung giờ này (nếu có) để thực hiện "đổi vote"
    await supabase
      .from('votes')
      .delete()
      .eq('time_slot_id', slotId)
      .eq('user_fingerprint', voterId);

    // Thêm vote mới
    const { error } = await supabase
      .from('votes')
      .insert([
        { time_slot_id: slotId, location_id: locationId, user_fingerprint: voterId }
      ]);

    if (error) {
      console.error("Lỗi vote:", error);
    } else {
      fetchSlots(activeDayId!);
      onRefresh();
    }
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
    try {
      const { error } = await supabase.from('locations').update(updates).eq('id', locId);
      if (error) throw error;
      fetchSlots(activeDayId!);
      onRefresh();
    } catch (error) {
      console.error("Lỗi cập nhật địa điểm:", error);
    }
  }

  async function deleteLocation(locId: string) {
    await supabase.from('locations').delete().eq('id', locId);
    fetchSlots(activeDayId!);
    onRefresh();
  }

  if (!isMounted || loading) return <div className="p-8 text-center text-gray-400">Đang tải dữ liệu...</div>;

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
                <div 
                  className="w-3 h-3 rounded-full shadow-sm shrink-0" 
                  style={{ backgroundColor: getSlotColor(slot.id, slots.map(s => s.id)) }}
                />
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

            {/* Các địa điểm trong khung giờ */}
            <div className="space-y-4 ml-4 border-l border-emerald-100 pl-4 py-2">
              {slot.locations?.map((loc: Location) => {
                const isEditing = editingLocationId === loc.id;
                
                return (
                  <div 
                    key={loc.id} 
                    onClick={() => !isEditing && onLocationClick(loc)}
                    className={clsx(
                      "rounded-2xl border transition-all relative overflow-hidden",
                      isEditing ? "p-0 border-emerald-500 shadow-xl ring-2 ring-emerald-100 ring-offset-2 z-10" : 
                      (loc.is_primary ? "p-4 bg-white border-emerald-200 shadow-sm ring-1 ring-emerald-50 group/card cursor-pointer" : "p-4 bg-gray-50/50 border-gray-100 hover:bg-white hover:border-emerald-100 group/card cursor-pointer")
                    )}
                  >
                    {/* Tree connection line */}
                    {!isEditing && <div className="absolute -left-[17px] top-8 w-4 h-[2px] bg-emerald-100" />}

                    {isEditing ? (
                      /* CHẾ ĐỘ CHỈNH SỬA */
                      <div className="bg-white p-5 space-y-4" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center gap-2 mb-2">
                          <div className="bg-emerald-600 text-white p-1.5 rounded-lg">
                            <Clock className="w-4 h-4" />
                          </div>
                          <span className="text-xs font-black text-emerald-800 uppercase tracking-widest">Chỉnh sửa địa điểm</span>
                        </div>
                        
                        <div className="space-y-4">
                          <div className="space-y-1">
                            <label className="text-[10px] font-black text-gray-400 uppercase ml-1">Tên & Vị trí</label>
                            <PlaceSearch 
                              placeholder={loc.name}
                              onSelect={(name, lat, lng) => {
                                // Cập nhật local state tạm thời để hiển thị
                                setSlots(slots.map(s => s.id === slot.id ? {
                                  ...s,
                                  locations: s.locations.map((l: any) => l.id === loc.id ? { ...l, name, lat, lng } : l)
                                } : s));
                              }} 
                            />
                          </div>

                          <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1">
                              <label className="text-[10px] font-black text-gray-400 uppercase ml-1">Giá tiền (VNĐ)</label>
                              <div className="flex items-center gap-2 bg-gray-50 px-3 py-2 rounded-xl border border-gray-200 focus-within:border-emerald-500 transition-all">
                                <input 
                                  type="number"
                                  value={loc.price || ''}
                                  onChange={(e) => {
                                    const val = parseInt(e.target.value) || 0;
                                    setSlots(slots.map(s => s.id === slot.id ? {
                                      ...s,
                                      locations: s.locations.map((l: any) => l.id === loc.id ? { ...l, price: val } : l)
                                    } : s));
                                  }}
                                  className="w-full text-sm font-bold text-emerald-700 bg-transparent outline-none"
                                />
                              </div>
                            </div>
                            <div className="space-y-1">
                              <label className="text-[10px] font-black text-gray-400 uppercase ml-1">Lựa chọn chính</label>
                              <button 
                                onClick={() => {
                                  setSlots(slots.map(s => s.id === slot.id ? {
                                    ...s,
                                    locations: s.locations.map((l: any) => l.id === loc.id ? { ...l, is_primary: !l.is_primary } : l)
                                  } : s));
                                }}
                                className={clsx(
                                  "w-full py-2 rounded-xl border font-bold text-xs transition-all flex items-center justify-center gap-2",
                                  loc.is_primary ? "bg-emerald-600 border-emerald-600 text-white" : "bg-white border-gray-200 text-gray-500"
                                )}
                              >
                                <CheckCircle2 className="w-4 h-4" />
                                {loc.is_primary ? "CHÍNH" : "THỨ YẾU"}
                              </button>
                            </div>
                          </div>

                          <div className="space-y-1">
                            <label className="text-[10px] font-black text-gray-400 uppercase ml-1">Mô tả trải nghiệm</label>
                            <textarea 
                              placeholder="Mô tả này sẽ hiện trên bản đồ..."
                              value={loc.description || ''}
                              onChange={(e) => {
                                setSlots(slots.map(s => s.id === slot.id ? {
                                  ...s,
                                  locations: s.locations.map((l: any) => l.id === loc.id ? { ...l, description: e.target.value } : l)
                                } : s));
                              }}
                              className="w-full p-3 text-sm text-gray-600 bg-gray-50 border border-gray-200 rounded-xl focus:border-emerald-500 outline-none resize-none transition-all h-24"
                            />
                          </div>

                          <div className="space-y-1">
                            <label className="text-[10px] font-black text-gray-400 uppercase ml-1">Hình ảnh</label>
                            <ImageUpload 
                              images={loc.images || []} 
                              onChange={(urls) => {
                                setSlots(slots.map(s => s.id === slot.id ? {
                                  ...s,
                                  locations: s.locations.map((l: any) => l.id === loc.id ? { ...l, images: urls } : l)
                                } : s));
                              }} 
                            />
                          </div>
                        </div>

                        <div className="flex gap-2 pt-2">
                          <button 
                            onClick={async () => {
                              await updateLocation(loc.id, { 
                                name: loc.name, 
                                lat: loc.lat, 
                                lng: loc.lng, 
                                price: loc.price, 
                                description: loc.description, 
                                images: loc.images,
                                is_primary: loc.is_primary
                              });
                              setEditingLocationId(null);
                            }}
                            className="flex-1 py-3 bg-emerald-600 text-white rounded-xl text-sm font-black shadow-lg shadow-emerald-200 hover:bg-emerald-700 hover:translate-y-[-1px] active:translate-y-0 transition-all uppercase tracking-widest"
                          >
                            Cập nhật thay đổi
                          </button>
                          <button 
                            onClick={() => {
                              setEditingLocationId(null);
                              fetchSlots(activeDayId!); // Khôi phục từ DB
                            }}
                            className="px-6 py-3 bg-gray-100 text-gray-500 rounded-xl text-sm font-bold hover:bg-gray-200 transition-all"
                          >
                            HỦY
                          </button>
                        </div>
                      </div>
                    ) : (
                      /* CHẾ ĐỘ HIỂN THỊ (VIEW) */
                      <div className="space-y-3">
                        <div className="flex justify-between items-start">
                          <div className="flex items-center gap-3">
                            <div className={clsx(
                              "w-7 h-7 rounded-lg flex items-center justify-center shrink-0 shadow-sm",
                              loc.is_primary ? "bg-emerald-600 text-white font-black text-xs" : "bg-gray-200 text-gray-500 font-bold text-[10px]"
                            )}>
                              {loc.is_primary ? (slots.filter(s => s.start_time <= slot.start_time).reduce((acc, curr) => acc + curr.locations.filter((l: any) => l.is_primary).length, 0)) : '?'}
                            </div>
                            <div>
                              <h4 className={clsx(
                                "font-bold transition-all leading-tight",
                                loc.is_primary ? "text-lg text-gray-900" : "text-sm text-gray-500"
                              )}>
                                {loc.name}
                              </h4>
                              {loc.price && loc.price > 0 && (
                                <div className="text-[11px] font-black text-amber-600 mt-0.5">
                                  💰 {loc.price.toLocaleString('vi-VN')} VNĐ
                                </div>
                              )}
                            </div>
                          </div>

                          <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                            <button 
                              onClick={() => setEditingLocationId(loc.id)}
                              className="p-2 text-gray-400 hover:bg-emerald-50 hover:text-emerald-600 rounded-xl transition-all"
                              title="Chỉnh sửa chi tiết"
                            >
                              <Save className="w-4 h-4" />
                            </button>
                            <button 
                              onClick={() => setPickingLocationId(pickingLocationId === loc.id ? null : loc.id)}
                              className={clsx(
                                "p-2 rounded-xl transition-all",
                                pickingLocationId === loc.id ? "bg-amber-500 text-white animate-pulse" : "text-gray-400 hover:bg-emerald-50 hover:text-emerald-600"
                              )}
                              title="Chọn tọa độ trên map"
                            >
                              <Crosshair className="w-4 h-4" />
                            </button>
                            <button 
                              onClick={() => handleVote(slot.id, loc.id)}
                              className={clsx(
                                "flex items-center gap-1.5 px-3 py-2 rounded-xl transition-all border shadow-sm",
                                (loc.vote_count || 0) > 0 ? "bg-red-50 border-red-100 text-red-500" : "bg-white border-gray-200 text-gray-400 hover:bg-red-50 hover:text-red-400"
                              )}
                            >
                              <Heart className={clsx("w-3.5 h-3.5", (loc.vote_count || 0) > 0 && "fill-current")} />
                              <span className="text-[10px] font-black">{loc.vote_count || 0}</span>
                            </button>
                            <button onClick={() => deleteLocation(loc.id)} className="p-2 text-gray-300 hover:text-red-500 rounded-xl">
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>

                        {loc.description && (
                          <p className="text-[11px] text-gray-500 line-clamp-2 leading-relaxed pl-10 border-l-2 border-gray-100 ml-3.5">
                            {loc.description}
                          </p>
                        )}

                        {loc.images && loc.images.length > 0 && (
                          <div className="flex gap-2 pl-10 pt-1 overflow-x-auto scrollbar-hide">
                            {loc.images.map((img, i) => (
                              <div key={i} className="relative w-16 h-12 rounded-lg overflow-hidden shrink-0 shadow-sm border border-white">
                                <img src={img} className="absolute inset-0 w-full h-full object-cover" />
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}

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
