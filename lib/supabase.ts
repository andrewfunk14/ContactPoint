import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL ?? '';
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

export const BUCKETS = {
  VIDEOS: 'serve-videos',
  THUMBNAILS: 'thumbnails',
} as const;

export async function uploadVideo(
  localUri: string,
  sessionId: string,
  fileName: string
): Promise<string> {
  const response = await fetch(localUri);
  const blob = await response.blob();

  const path = `${sessionId}/${fileName}`;
  const { error } = await supabase.storage
    .from(BUCKETS.VIDEOS)
    .upload(path, blob, { contentType: 'video/mp4', upsert: true });

  if (error) throw error;

  const { data } = supabase.storage.from(BUCKETS.VIDEOS).getPublicUrl(path);
  return data.publicUrl;
}

export async function uploadThumbnail(
  localUri: string,
  sessionId: string
): Promise<string> {
  const response = await fetch(localUri);
  const blob = await response.blob();

  const path = `${sessionId}/thumbnail.jpg`;
  const { error } = await supabase.storage
    .from(BUCKETS.THUMBNAILS)
    .upload(path, blob, { contentType: 'image/jpeg', upsert: true });

  if (error) throw error;

  const { data } = supabase.storage.from(BUCKETS.THUMBNAILS).getPublicUrl(path);
  return data.publicUrl;
}
