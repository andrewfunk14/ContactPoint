import { Keypoint } from './types';

// ---------------------------------------------------------------------------
// Mock detection — cycles through all serve phases so the full pipeline
// (phase tagging, AI analysis, skeleton scrubber) works without native modules.
//
// To enable real TF.js detection later:
//   1. Run: npx expo install expo-gl && npm install @tensorflow/tfjs @tensorflow/tfjs-react-native @tensorflow-models/pose-detection
//   2. Rebuild the dev client: npx expo run:ios
//   3. Replace the body of runPoseDetection with the TF.js implementation
// ---------------------------------------------------------------------------

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
    { x: 0.58, y: 0.28, visibility: 0.98 }, // 11: LEFT_SHOULDER
    { x: 0.42, y: 0.28, visibility: 0.98 }, // 12: RIGHT_SHOULDER
    { x: 0.63, y: 0.40, visibility: 0.97 }, // 13: LEFT_ELBOW
    { x: 0.38, y: 0.22, visibility: 0.97 }, // 14: RIGHT_ELBOW
    { x: 0.68, y: 0.48, visibility: 0.96 }, // 15: LEFT_WRIST
    { x: 0.35, y: 0.40, visibility: 0.96 }, // 16: RIGHT_WRIST
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

// Phase boundaries as fractions of the total frame count so the serve arc
// always spans the full video regardless of FPS or duration.
const PHASE_FRACTIONS: Array<{ end: number; fn: () => Keypoint[] }> = [
  { end: 0.10, fn: () => baseKeypoints() },  // stance        0–10%
  { end: 0.25, fn: () => override(baseKeypoints(), { 13: { x: 0.63, y: 0.20 }, 15: { x: 0.63, y: 0.08 }, 25: { x: 0.63, y: 0.72 }, 26: { x: 0.37, y: 0.72 } }) },  // loading  10–25%
  { end: 0.45, fn: () => override(baseKeypoints(), { 11: { x: 0.58, y: 0.28 }, 13: { x: 0.42, y: 0.22 }, 15: { x: 0.46, y: 0.10 }, 25: { x: 0.63, y: 0.72 }, 26: { x: 0.37, y: 0.72 } }) },  // trophy   25–45%
  { end: 0.62, fn: () => override(baseKeypoints(), { 15: { x: 0.68, y: 0.22 }, 16: { x: 0.35, y: 0.22 } }) },  // accel    45–62%
  { end: 0.75, fn: () => override(baseKeypoints(), { 14: { x: 0.44, y: 0.14 }, 15: { x: 0.68, y: 0.25 }, 16: { x: 0.50, y: 0.08 } }) },  // contact  62–75%
  { end: 1.00, fn: () => override(baseKeypoints(), { 14: { x: 0.50, y: 0.40 }, 15: { x: 0.68, y: 0.30 }, 16: { x: 0.60, y: 0.55 } }) },  // follow   75–100%
];

function mockKeypoints(frameIndex: number, totalFrames: number): Keypoint[] {
  const pct = totalFrames > 1 ? frameIndex / (totalFrames - 1) : 0;
  const seg = PHASE_FRACTIONS.find((s) => pct <= s.end);
  return (seg ?? PHASE_FRACTIONS[PHASE_FRACTIONS.length - 1]).fn();
}

export async function runPoseDetection(
  frameUri: string,
  frameIndex = 0,
  totalFrames = 300
): Promise<Keypoint[] | null> {
  return mockKeypoints(frameIndex, totalFrames);
}
