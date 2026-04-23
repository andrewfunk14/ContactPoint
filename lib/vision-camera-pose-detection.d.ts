declare module 'vision-camera-pose-detection' {
  import { Keypoint } from './types';
  export function detectPose(frameUri: string): Promise<Keypoint[] | null>;
}
