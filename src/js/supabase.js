import { createClient } from '@supabase/supabase-js'

// Your Supabase config
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseKey);

// Realtime subscriptions helper (optional - disable if websocket error)
export function subscribe(channel, callback) {
  return supabase
    .channel(channel)
    .on('postgres_changes', { event: '*', schema: 'public', table: channel }, callback)
    .subscribe(() => {}, { 
      params: {
        apikey: import.meta.env.VITE_SUPABASE_ANON_KEY 
      }
    });
}

// Utility: Get user profile
export async function getUserProfile(userId) {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();
  return { data, error };
}

