import * as FileSystem from 'expo-file-system/legacy';

// ffmpeg-kit-react-native requires a development build and is unavailable in Expo Go.
// Guarded require prevents the invariant violation from crashing the app at startup.
let FFmpegKit: { execute: (cmd: string) => Promise<any> } | null = null;
let ReturnCode: { isSuccess: (rc: any) => boolean } | null = null;
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const ffmpeg = require('ffmpeg-kit-react-native');
  FFmpegKit = ffmpeg.FFmpegKit;
  ReturnCode = ffmpeg.ReturnCode;
} catch {
  // Native module not registered — dev build required.
}

export interface ExtractedFrame {
  frameIndex: number;
  timestampMs: number;
  uri: string;
}

const FRAMES_SUBDIR = 'contactpoint_frames/';
const FPS = 30;

function framesDir(): string {
  return `${FileSystem.cacheDirectory ?? ''}${FRAMES_SUBDIR}`;
}

export async function extractFrames(
  videoUri: string,
  onProgress?: (progress: number) => void
): Promise<ExtractedFrame[]> {
  const dir = framesDir();
  await FileSystem.makeDirectoryAsync(dir, { intermediates: true });

  const outputPattern = `${dir}frame_%04d.jpg`;
  const command = `-i "${videoUri}" -vf fps=${FPS} -q:v 2 "${outputPattern}" -y`;

  if (!FFmpegKit || !ReturnCode) {
    throw new Error('FFmpeg is unavailable — a development build is required.');
  }

  const session = await FFmpegKit.execute(command);
  const returnCode = await session.getReturnCode();

  if (!ReturnCode.isSuccess(returnCode)) {
    throw new Error('Frame extraction failed');
  }

  const dirContents = await FileSystem.readDirectoryAsync(dir);
  const frameFiles = dirContents
    .filter((f) => f.startsWith('frame_') && f.endsWith('.jpg'))
    .sort();

  const frames: ExtractedFrame[] = frameFiles.map((file, index) => ({
    frameIndex: index,
    timestampMs: Math.round((index / FPS) * 1000),
    uri: `${dir}${file}`,
  }));

  onProgress?.(100);
  return frames;
}

export async function extractThumbnail(videoUri: string): Promise<string> {
  const dir = framesDir();
  await FileSystem.makeDirectoryAsync(dir, { intermediates: true });

  const thumbnailPath = `${dir}thumbnail.jpg`;
  const command = `-i "${videoUri}" -ss 00:00:02 -vframes 1 -q:v 2 "${thumbnailPath}" -y`;

  if (!FFmpegKit || !ReturnCode) {
    throw new Error('FFmpeg is unavailable — a development build is required.');
  }

  const session = await FFmpegKit.execute(command);
  const returnCode = await session.getReturnCode();

  if (!ReturnCode.isSuccess(returnCode)) {
    throw new Error('Thumbnail extraction failed');
  }

  return thumbnailPath;
}

export async function clearFrameCache(): Promise<void> {
  const dir = framesDir();
  const info = await FileSystem.getInfoAsync(dir);
  if (info.exists) {
    await FileSystem.deleteAsync(dir, { idempotent: true });
  }
}
