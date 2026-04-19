import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn("Supabase environment variables are missing!");
}

export const supabase = createClient(supabaseUrl || 'https://placeholder.supabase.co', supabaseAnonKey || 'placeholder');

export type Day = {
  id: string;
  date: string;
  label: string;
};

export type TimeSlot = {
  id: string;
  day_id: string;
  start_time: string;
  end_time?: string;
  title: string;
  display_order: number;
  locations?: Location[];
};

export type Location = {
  id: string;
  time_slot_id: string;
  name: string;
  lat: number;
  lng: number;
  description?: string;
  images: string[];
  is_primary: boolean;
};

export async function getFullItinerary() {
  const { data: days, error: daysError } = await supabase
    .from('days')
    .select('*')
    .order('date', { ascending: true });

  if (daysError) throw daysError;

  const { data: slots, error: slotsError } = await supabase
    .from('time_slots')
    .select('*, locations(*)')
    .order('start_time', { ascending: true });

  if (slotsError) throw slotsError;

  return days.map(day => ({
    ...day,
    slots: slots.filter(slot => slot.day_id === day.id)
  }));
}
