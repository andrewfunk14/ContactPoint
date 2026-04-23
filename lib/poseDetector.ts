import { Keypoint } from './types';

const USE_REAL_DETECTION = false;

function mockTrophyPoseKeypoints(): Keypoint[] {
  // Anatomically correct right-handed trophy serve position (normalized 0-1)
  return [
    { x: 0.50, y: 0.12, visibility: 0.99 }, // 0: NOSE
    { x: 0.51, y: 0.11, visibility: 0.95 }, // 1: LEFT_EYE_INNER
    { x: 0.52, y: 0.10, visibility: 0.95 }, // 2: LEFT_EYE
    { x: 0.53, y: 0.10, visibility: 0.90 }, // 3: LEFT_EYE_OUTER
    { x: 0.49, y: 0.11, visibility: 0.95 }, // 4: RIGHT_EYE_INNER
    { x: 0.48, y: 0.10, visibility: 0.95 }, // 5: RIGHT_EYE
    { x: 0.47, y: 0.10, visibility: 0.90 }, // 6: RIGHT_EYE_OUTER
    { x: 0.53, y: 0.13, visibility: 0.85 }, // 7: LEFT_EAR
    { x: 0.47, y: 0.13, visibility: 0.85 }, // 8: RIGHT_EAR
    { x: 0.51, y: 0.15, visibility: 0.90 }, // 9: MOUTH_LEFT
    { x: 0.49, y: 0.15, visibility: 0.90 }, // 10: MOUTH_RIGHT
    { x: 0.58, y: 0.28, visibility: 0.98 }, // 11: LEFT_SHOULDER (toss arm)
    { x: 0.42, y: 0.28, visibility: 0.98 }, // 12: RIGHT_SHOULDER (serving arm)
    { x: 0.63, y: 0.40, visibility: 0.97 }, // 13: LEFT_ELBOW
    { x: 0.38, y: 0.22, visibility: 0.97 }, // 14: RIGHT_ELBOW (L-shape)
    { x: 0.68, y: 0.20, visibility: 0.96 }, // 15: LEFT_WRIST (toss: above head)
    { x: 0.35, y: 0.30, visibility: 0.96 }, // 16: RIGHT_WRIST (serving)
    { x: 0.69, y: 0.18, visibility: 0.85 }, // 17: LEFT_PINKY
    { x: 0.34, y: 0.32, visibility: 0.85 }, // 18: RIGHT_PINKY
    { x: 0.68, y: 0.17, visibility: 0.85 }, // 19: LEFT_INDEX
    { x: 0.35, y: 0.31, visibility: 0.85 }, // 20: RIGHT_INDEX
    { x: 0.67, y: 0.19, visibility: 0.85 }, // 21: LEFT_THUMB
    { x: 0.36, y: 0.29, visibility: 0.85 }, // 22: RIGHT_THUMB
    { x: 0.56, y: 0.55, visibility: 0.99 }, // 23: LEFT_HIP
    { x: 0.44, y: 0.55, visibility: 0.99 }, // 24: RIGHT_HIP
    { x: 0.57, y: 0.72, visibility: 0.98 }, // 25: LEFT_KNEE
    { x: 0.43, y: 0.72, visibility: 0.98 }, // 26: RIGHT_KNEE
    { x: 0.57, y: 0.88, visibility: 0.97 }, // 27: LEFT_ANKLE
    { x: 0.43, y: 0.88, visibility: 0.97 }, // 28: RIGHT_ANKLE
    { x: 0.57, y: 0.92, visibility: 0.90 }, // 29: LEFT_HEEL
    { x: 0.43, y: 0.92, visibility: 0.90 }, // 30: RIGHT_HEEL
    { x: 0.59, y: 0.95, visibility: 0.88 }, // 31: LEFT_FOOT_INDEX
    { x: 0.42, y: 0.95, visibility: 0.88 }, // 32: RIGHT_FOOT_INDEX
  ];
}

export async function runPoseDetection(frameUri: string): Promise<Keypoint[] | null> {
  if (!USE_REAL_DETECTION) {
    return mockTrophyPoseKeypoints();
  }

  try {
    const { detectPose } = await import('vision-camera-pose-detection');
    return await detectPose(frameUri);
  } catch {
    return null;
  }
}
