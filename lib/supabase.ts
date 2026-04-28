import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system/legacy';

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

// Uses the native HTTP client (FileSystem.uploadAsync) so the file is sent with
// a proper Content-Length header. The blob/fetch path omits this header in RN,
// which causes Supabase to store the file without size metadata and makes iOS
// AVPlayer's byte-range requests fail with HTTP 416.
export async function uploadVideo(
  localUri: string,
  pathPrefix: string,
  fileName: string
): Promise<string> {
  const { data: { session } } = await supabase.auth.getSession();
  const token = session?.access_token ?? supabaseAnonKey;

  const path = `${pathPrefix}/${fileName}`;
  const endpoint = `${supabaseUrl}/storage/v1/object/${BUCKETS.VIDEOS}/${path}`;

  const result = await FileSystem.uploadAsync(endpoint, localUri, {
    httpMethod: 'POST',
    uploadType: FileSystem.FileSystemUploadType.BINARY_CONTENT,
    headers: {
      Authorization: `Bearer ${token}`,
      apikey: supabaseAnonKey,
      'Content-Type': 'video/mp4',
      'x-upsert': 'true',
    },
  });

  if (result.status >= 400) {
    throw new Error(`Video upload failed: ${result.status} ${result.body}`);
  }

  return path;
}

export async function getVideoUrl(storagePath: string): Promise<string> {
  const { data, error } = await supabase.storage
    .from(BUCKETS.VIDEOS)
    .createSignedUrl(storagePath, 60 * 60); // 1 hour

  if (error) throw error;
  return data.signedUrl;
}

export async function uploadThumbnail(
  localUri: string,
  sessionId: string
): Promise<string> {
  const { data: { session } } = await supabase.auth.getSession();
  const token = session?.access_token ?? supabaseAnonKey;

  const path = `${sessionId}/thumbnail.jpg`;
  const endpoint = `${supabaseUrl}/storage/v1/object/${BUCKETS.THUMBNAILS}/${path}`;

  const result = await FileSystem.uploadAsync(endpoint, localUri, {
    httpMethod: 'POST',
    uploadType: FileSystem.FileSystemUploadType.BINARY_CONTENT,
    headers: {
      Authorization: `Bearer ${token}`,
      apikey: supabaseAnonKey,
      'Content-Type': 'image/jpeg',
      'x-upsert': 'true',
    },
  });

  if (result.status >= 400) {
    throw new Error(`Thumbnail upload failed: ${result.status}`);
  }

  const { data } = supabase.storage.from(BUCKETS.THUMBNAILS).getPublicUrl(path);
  return data.publicUrl;
}
