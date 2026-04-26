import { Keypoint } from './types';

const USE_REAL_DETECTION = false;

// Base skeleton — right-handed player, neutral stance
function baseKeypoints(): Keypoint[] {
  return [
    { x: 0.50, y: 0.12, visibility: 0.99 }, // 0: NOSE
    { x: 0.51, y: 0.11, visibility: 0.95 }, // 1
    { x: 0.52, y: 0.10, visibility: 0.95 }, // 2
    { x: 0.53, y: 0.10, visibility: 0.90 }, // 3
    { x: 0.49, y: 0.11, visibility: 0.95 }, // 4
    { x: 0.48, y: 0.10, visibility: 0.95 }, // 5
    { x: 0.47, y: 0.10, visibility: 0.90 }, // 6
    { x: 0.53, y: 0.13, visibility: 0.85 }, // 7: LEFT_EAR
    { x: 0.47, y: 0.13, visibility: 0.85 }, // 8: RIGHT_EAR
    { x: 0.51, y: 0.15, visibility: 0.90 }, // 9
    { x: 0.49, y: 0.15, visibility: 0.90 }, // 10
    { x: 0.58, y: 0.28, visibility: 0.98 }, // 11: LEFT_SHOULDER (toss arm)
    { x: 0.42, y: 0.28, visibility: 0.98 }, // 12: RIGHT_SHOULDER (serving arm)
    { x: 0.63, y: 0.40, visibility: 0.97 }, // 13: LEFT_ELBOW
    { x: 0.38, y: 0.22, visibility: 0.97 }, // 14: RIGHT_ELBOW
    { x: 0.68, y: 0.48, visibility: 0.96 }, // 15: LEFT_WRIST (toss arm, low)
    { x: 0.35, y: 0.40, visibility: 0.96 }, // 16: RIGHT_WRIST (serving arm, low)
    { x: 0.69, y: 0.50, visibility: 0.85 }, // 17
    { x: 0.34, y: 0.42, visibility: 0.85 }, // 18
    { x: 0.68, y: 0.49, visibility: 0.85 }, // 19
    { x: 0.35, y: 0.41, visibility: 0.85 }, // 20
    { x: 0.67, y: 0.49, visibility: 0.85 }, // 21
    { x: 0.36, y: 0.41, visibility: 0.85 }, // 22
    { x: 0.56, y: 0.55, visibility: 0.99 }, // 23: LEFT_HIP
    { x: 0.44, y: 0.55, visibility: 0.99 }, // 24: RIGHT_HIP
    { x: 0.57, y: 0.72, visibility: 0.98 }, // 25: LEFT_KNEE
    { x: 0.43, y: 0.72, visibility: 0.98 }, // 26: RIGHT_KNEE
    { x: 0.57, y: 0.88, visibility: 0.97 }, // 27: LEFT_ANKLE
    { x: 0.43, y: 0.88, visibility: 0.97 }, // 28: RIGHT_ANKLE
    { x: 0.57, y: 0.92, visibility: 0.90 }, // 29: LEFT_HEEL
    { x: 0.43, y: 0.92, visibility: 0.90 }, // 30: RIGHT_HEEL
    { x: 0.59, y: 0.95, visibility: 0.88 }, // 31
    { x: 0.42, y: 0.95, visibility: 0.88 }, // 32
  ];
}

function override(kps: Keypoint[], overrides: Partial<Record<number, Partial<Keypoint>>>): Keypoint[] {
  return kps.map((kp, i) => (overrides[i] ? { ...kp, ...overrides[i] } : kp));
}

// Phase-specific overrides — designed to satisfy detectPhaseForFrame conditions.
// Right-handed: toss arm = left (11,13,15), serving arm = right (12,14,16).
// Screen coords: y=0 top, y=1 bottom. "above nose" means smaller y than nose (0.12).

function stanceKeypoints(): Keypoint[] {
  // Both wrists low, legs straight → falls through to 'stance'
  return baseKeypoints();
}

function loadingKeypoints(): Keypoint[] {
  // tossArmAboveNose (wrist y=0.08 < 0.12) + tossArmElbow ~148° (>110, not trophy) + knees bent (~137°)
  return override(baseKeypoints(), {
    13: { x: 0.63, y: 0.20 }, // LEFT_ELBOW raised
    15: { x: 0.63, y: 0.08 }, // LEFT_WRIST above nose
    25: { x: 0.63, y: 0.72 }, // LEFT_KNEE forward (bent)
    26: { x: 0.37, y: 0.72 }, // RIGHT_KNEE forward (bent)
  });
}

function trophyKeypoints(): Keypoint[] {
  // tossArmAboveNose (wrist y=0.10 < 0.12) + tossArmElbow ~92° (in 75-110)
  return override(baseKeypoints(), {
    11: { x: 0.58, y: 0.28 }, // LEFT_SHOULDER
    13: { x: 0.42, y: 0.22 }, // LEFT_ELBOW — makes L-shape
    15: { x: 0.46, y: 0.10 }, // LEFT_WRIST above nose, L-angle ~92°
    25: { x: 0.63, y: 0.72 }, // knees still bent
    26: { x: 0.37, y: 0.72 },
  });
}

function accelerationKeypoints(): Keypoint[] {
  // tossArmDropped (wrist y=0.22 > 0.17) + servingWrist above shoulder (y=0.22 < 0.28)
  return override(baseKeypoints(), {
    15: { x: 0.68, y: 0.22 }, // LEFT_WRIST dropped past nose
    16: { x: 0.35, y: 0.22 }, // RIGHT_WRIST rising above shoulder
  });
}

function contactKeypoints(): Keypoint[] {
  // servingWristAboveNose (y=0.08 < 0.12) + tossArmDropped (y=0.25 > 0.17)
  return override(baseKeypoints(), {
    14: { x: 0.44, y: 0.14 }, // RIGHT_ELBOW extended high
    15: { x: 0.68, y: 0.25 }, // LEFT_WRIST dropped
    16: { x: 0.50, y: 0.08 }, // RIGHT_WRIST at contact point above head
  });
}

function followThroughKeypoints(): Keypoint[] {
  // servingArmCrossingBody (wrist.x=0.60 > shoulder.x+0.05=0.47) + wrist below shoulder (y=0.55 > 0.28)
  return override(baseKeypoints(), {
    14: { x: 0.50, y: 0.40 }, // RIGHT_ELBOW swinging across
    15: { x: 0.68, y: 0.30 }, // LEFT_WRIST still down
    16: { x: 0.60, y: 0.55 }, // RIGHT_WRIST crossed body and below shoulder
  });
}

// 90 mock frames (3s × 30fps). Map frame index to serve phase keypoints.
const PHASE_SEGMENTS: Array<{ end: number; fn: () => Keypoint[] }> = [
  { end: 14, fn: stanceKeypoints },
  { end: 29, fn: loadingKeypoints },
  { end: 44, fn: trophyKeypoints },
  { end: 59, fn: accelerationKeypoints },
  { end: 74, fn: contactKeypoints },
  { end: 89, fn: followThroughKeypoints },
];

function mockKeypoints(frameIndex: number): Keypoint[] {
  const segment = PHASE_SEGMENTS.find((s) => frameIndex <= s.end);
  return (segment ?? PHASE_SEGMENTS[PHASE_SEGMENTS.length - 1]).fn();
}

export async function runPoseDetection(frameUri: string, frameIndex = 0): Promise<Keypoint[] | null> {
  if (!USE_REAL_DETECTION) {
    return mockKeypoints(frameIndex);
  }

  try {
    const { detectPose } = await import('vision-camera-pose-detection');
    return await detectPose(frameUri);
  } catch {
    return null;
  }
}
