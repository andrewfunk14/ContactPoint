export interface Keypoint {
  x: number;
  y: number;
  z?: number;
  visibility?: number;
}

export enum PoseLandmark {
  NOSE = 0,
  LEFT_EYE_INNER = 1,
  LEFT_EYE = 2,
  LEFT_EYE_OUTER = 3,
  RIGHT_EYE_INNER = 4,
  RIGHT_EYE = 5,
  RIGHT_EYE_OUTER = 6,
  LEFT_EAR = 7,
  RIGHT_EAR = 8,
  MOUTH_LEFT = 9,
  MOUTH_RIGHT = 10,
  LEFT_SHOULDER = 11,
  RIGHT_SHOULDER = 12,
  LEFT_ELBOW = 13,
  RIGHT_ELBOW = 14,
  LEFT_WRIST = 15,
  RIGHT_WRIST = 16,
  LEFT_PINKY = 17,
  RIGHT_PINKY = 18,
  LEFT_INDEX = 19,
  RIGHT_INDEX = 20,
  LEFT_THUMB = 21,
  RIGHT_THUMB = 22,
  LEFT_HIP = 23,
  RIGHT_HIP = 24,
  LEFT_KNEE = 25,
  RIGHT_KNEE = 26,
  LEFT_ANKLE = 27,
  RIGHT_ANKLE = 28,
  LEFT_HEEL = 29,
  RIGHT_HEEL = 30,
  LEFT_FOOT_INDEX = 31,
  RIGHT_FOOT_INDEX = 32,
}

export interface JointAngles {
  servingElbow: number;
  servingShoulderAbduction: number;
  servingWristExtension: number;
  tossArmElbow: number;
  tossArmShoulder: number;
  trunkRotation: number;
  hipRotation: number;
  kneeFlexion: number;
  ankleAngle: number;
}

export interface PoseFrame {
  frameIndex: number;
  timestampMs: number;
  keypoints: Keypoint[];
  angles: JointAngles;
}

export type ServePhase =
  | 'stance'
  | 'trophy'
  | 'loading'
  | 'acceleration'
  | 'contact'
  | 'followThrough'
  | 'finish';

export interface ServePhaseRange {
  phase: ServePhase;
  startFrame: number;
  endFrame: number;
  keyFrame: number;
}

export interface TechniqueScore {
  overall: number;
  stance: number;
  trophy: number;
  loading: number;
  contact: number;
  followThrough: number;
}

export interface TechniqueFault {
  phase: ServePhase;
  fault: string;
  severity: 'minor' | 'moderate' | 'major';
  description: string;
  proComparison?: string;
}

export interface Drill {
  id: string;
  name: string;
  targetFault: string;
  duration: string;
  reps?: number;
  description: string;
  cues: string[];
  progressionTo?: string;
}

export interface ProComparison {
  referencePro: string;
  overallSimilarity: number;
  strengths: string[];
  gaps: string[];
}

export interface ServeAnalysis {
  id: string;
  sessionId: string;
  createdAt: string;
  videoUri: string;
  thumbnailUri?: string;
  phases: ServePhaseRange[];
  poseFrames: PoseFrame[];
  scores: TechniqueScore;
  faults: TechniqueFault[];
  drills: Drill[];
  proComparison: ProComparison;
  summary: string;
  coachNotes?: string;
}

export interface Student {
  id: string;
  name: string;
  level: 'beginner' | 'intermediate' | 'advanced' | 'elite';
  dominantHand: 'right' | 'left';
  avatarUrl?: string;
  createdAt: string;
}

export interface Session {
  id: string;
  studentId: string;
  student?: Student;
  date: string;
  analyses: ServeAnalysis[];
  notes?: string;
}

export type ProcessingStep =
  | 'extracting_frames'
  | 'detecting_pose'
  | 'identifying_phases'
  | 'analyzing_technique'
  | 'generating_drills'
  | 'complete'
  | 'error';

export interface ProcessingState {
  step: ProcessingStep;
  progress: number;
  message: string;
  error?: string;
}
