import { createClient } from '@supabase/supabase-js';
const supabaseUrl = 'https://cvensemhzsrlcruviirh.supabase.co';

const supabaseAnonKey = 'sb_publishable_G4jNkxea5S_nMYyTaz3P5g_zVcZ0x6T';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

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
  price?: number;
  vote_count?: number;
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
