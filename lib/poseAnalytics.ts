import { Keypoint, JointAngles, ServePhase, PoseLandmark } from './types';

export function angleBetween(a: Keypoint, b: Keypoint, c: Keypoint): number {
  const radians =
    Math.atan2(c.y - b.y, c.x - b.x) - Math.atan2(a.y - b.y, a.x - b.x);
  let angle = Math.abs((radians * 180) / Math.PI);
  if (angle > 180) angle = 360 - angle;
  return angle;
}

function kp(keypoints: Keypoint[], idx: number): Keypoint {
  return keypoints[idx] ?? { x: 0, y: 0, visibility: 0 };
}

export function calculateJointAngles(
  keypoints: Keypoint[],
  dominantHand: 'right' | 'left'
): JointAngles {
  // For right-handed: serving arm is right (indices 12,14,16), toss arm is left (11,13,15)
  // For left-handed: mirror
  const sS = dominantHand === 'right' ? PoseLandmark.RIGHT_SHOULDER : PoseLandmark.LEFT_SHOULDER;
  const sE = dominantHand === 'right' ? PoseLandmark.RIGHT_ELBOW : PoseLandmark.LEFT_ELBOW;
  const sW = dominantHand === 'right' ? PoseLandmark.RIGHT_WRIST : PoseLandmark.LEFT_WRIST;
  const tS = dominantHand === 'right' ? PoseLandmark.LEFT_SHOULDER : PoseLandmark.RIGHT_SHOULDER;
  const tE = dominantHand === 'right' ? PoseLandmark.LEFT_ELBOW : PoseLandmark.RIGHT_ELBOW;
  const tW = dominantHand === 'right' ? PoseLandmark.LEFT_WRIST : PoseLandmark.RIGHT_WRIST;

  const leftHip = kp(keypoints, PoseLandmark.LEFT_HIP);
  const rightHip = kp(keypoints, PoseLandmark.RIGHT_HIP);
  const leftShoulder = kp(keypoints, PoseLandmark.LEFT_SHOULDER);
  const rightShoulder = kp(keypoints, PoseLandmark.RIGHT_SHOULDER);
  const leftKnee = kp(keypoints, PoseLandmark.LEFT_KNEE);
  const rightKnee = kp(keypoints, PoseLandmark.RIGHT_KNEE);
  const leftAnkle = kp(keypoints, PoseLandmark.LEFT_ANKLE);
  const rightAnkle = kp(keypoints, PoseLandmark.RIGHT_ANKLE);
  const leftHeel = kp(keypoints, PoseLandmark.LEFT_HEEL);

  const servingElbow = angleBetween(kp(keypoints, sS), kp(keypoints, sE), kp(keypoints, sW));

  // Shoulder abduction: angle between elbow, shoulder, and hip on serving side
  const sH = dominantHand === 'right' ? PoseLandmark.RIGHT_HIP : PoseLandmark.LEFT_HIP;
  const servingShoulderAbduction = angleBetween(
    kp(keypoints, sE),
    kp(keypoints, sS),
    kp(keypoints, sH)
  );

  // Wrist extension: rough measure using wrist relative to elbow vertical
  const servingWristExtension = angleBetween(
    kp(keypoints, sE),
    kp(keypoints, sW),
    { x: kp(keypoints, sW).x, y: kp(keypoints, sW).y - 0.1 }
  );

  const tossArmElbow = angleBetween(kp(keypoints, tS), kp(keypoints, tE), kp(keypoints, tW));
  const tossArmShoulder = angleBetween(
    kp(keypoints, tE),
    kp(keypoints, tS),
    dominantHand === 'right' ? leftHip : rightHip
  );

  // Trunk rotation: angle between shoulder line and hip line
  const shoulderAngle = Math.atan2(
    rightShoulder.y - leftShoulder.y,
    rightShoulder.x - leftShoulder.x
  );
  const hipAngle = Math.atan2(rightHip.y - leftHip.y, rightHip.x - leftHip.x);
  const trunkRotation = Math.abs(((shoulderAngle - hipAngle) * 180) / Math.PI);

  const hipRotation = Math.abs(((hipAngle * 180) / Math.PI));

  // Knee flexion: average both knees
  const leftKneeAngle = angleBetween(leftHip, leftKnee, leftAnkle);
  const rightKneeAngle = angleBetween(rightHip, rightKnee, rightAnkle);
  const kneeFlexion = (leftKneeAngle + rightKneeAngle) / 2;

  const ankleAngle = angleBetween(leftKnee, leftAnkle, leftHeel);

  return {
    servingElbow,
    servingShoulderAbduction,
    servingWristExtension,
    tossArmElbow,
    tossArmShoulder,
    trunkRotation,
    hipRotation,
    kneeFlexion,
    ankleAngle,
  };
}

export function detectPhaseForFrame(
  keypoints: Keypoint[],
  angles: JointAngles,
  dominantHand: 'right' | 'left'
): ServePhase {
  const nose = kp(keypoints, PoseLandmark.NOSE);
  const tW = dominantHand === 'right' ? PoseLandmark.LEFT_WRIST : PoseLandmark.RIGHT_WRIST;
  const sW = dominantHand === 'right' ? PoseLandmark.RIGHT_WRIST : PoseLandmark.LEFT_WRIST;
  const sS = dominantHand === 'right' ? PoseLandmark.RIGHT_SHOULDER : PoseLandmark.LEFT_SHOULDER;

  const tossWrist = kp(keypoints, tW);
  const servingWrist = kp(keypoints, sW);
  const servingShoulder = kp(keypoints, sS);

  const tossArmAboveNose = tossWrist.y < nose.y;
  const servingWristAboveNose = servingWrist.y < nose.y;
  const tossArmDropped = tossWrist.y > nose.y + 0.05;
  const servingArmCrossingBody =
    dominantHand === 'right'
      ? servingWrist.x > servingShoulder.x + 0.05
      : servingWrist.x < servingShoulder.x - 0.05;
  const servingWristBelowShoulder = servingWrist.y > servingShoulder.y;
  const bothArmsLow = tossWrist.y > nose.y + 0.1 && servingWrist.y > nose.y + 0.1;
  const legsRelativelyStr = angles.kneeFlexion > 160;

  // Trophy: toss arm above nose + elbow in 75-110° range
  if (tossArmAboveNose && angles.tossArmElbow >= 75 && angles.tossArmElbow <= 110) {
    return 'trophy';
  }

  // Contact: serving wrist above nose + toss arm dropped
  if (servingWristAboveNose && tossArmDropped) {
    return 'contact';
  }

  // Follow through: serving arm crossing body + wrist below shoulder
  if (servingArmCrossingBody && servingWristBelowShoulder && !tossArmAboveNose) {
    return 'followThrough';
  }

  // Loading: toss arm rising but not trophy, knees bent
  if (tossArmAboveNose && angles.kneeFlexion < 155) {
    return 'loading';
  }

  // Acceleration: between trophy and contact
  if (tossArmDropped && servingWrist.y < servingShoulder.y) {
    return 'acceleration';
  }

  // Finish or stance
  if (bothArmsLow && legsRelativelyStr) {
    return 'finish';
  }

  return 'stance';
}
