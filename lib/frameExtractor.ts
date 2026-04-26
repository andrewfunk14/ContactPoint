import * as FileSystem from 'expo-file-system/legacy';

export interface ExtractedFrame {
  frameIndex: number;
  timestampMs: number;
  uri: string;
}

const FRAMES_SUBDIR = 'contactpoint_frames/';
const FPS = 30;
const ESTIMATED_DURATION_MS = 3000;

function framesDir(): string {
  return `${FileSystem.cacheDirectory ?? ''}${FRAMES_SUBDIR}`;
}

// Generates synthetic frame metadata without file I/O.
// Real URIs are not needed while pose detection is mocked.
export async function extractFrames(
  videoUri: string,
  onProgress?: (progress: number) => void
): Promise<ExtractedFrame[]> {
  const totalFrames = Math.round((ESTIMATED_DURATION_MS / 1000) * FPS);
  const frames: ExtractedFrame[] = Array.from({ length: totalFrames }, (_, i) => ({
    frameIndex: i,
    timestampMs: Math.round((i / FPS) * 1000),
    uri: videoUri,
  }));
  onProgress?.(100);
  return frames;
}

// Returns null — thumbnail upload is skipped when unavailable.
// Replace with expo-video-thumbnails once integrated into the dev build.
export async function extractThumbnail(videoUri: string): Promise<string | null> {
  return null;
}

export async function clearFrameCache(): Promise<void> {
  const dir = framesDir();
  const info = await FileSystem.getInfoAsync(dir);
  if (info.exists) {
    await FileSystem.deleteAsync(dir, { idempotent: true });
  }
}
