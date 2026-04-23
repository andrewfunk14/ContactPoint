import React, { useState } from 'react';
import { View, Dimensions, TouchableOpacity, Text, StyleSheet } from 'react-native';
import Svg, { Line, Circle } from 'react-native-svg';
import { Video, ResizeMode } from 'expo-av';
import { PoseFrame, ServePhaseRange, ServePhase, PoseLandmark } from '../../lib/types';
import { PhasePill } from './index';

const MEDIAPIPE_CONNECTIONS: [number, number][] = [
  [PoseLandmark.LEFT_SHOULDER, PoseLandmark.RIGHT_SHOULDER],
  [PoseLandmark.LEFT_SHOULDER, PoseLandmark.LEFT_ELBOW],
  [PoseLandmark.LEFT_ELBOW, PoseLandmark.LEFT_WRIST],
  [PoseLandmark.LEFT_WRIST, PoseLandmark.LEFT_PINKY],
  [PoseLandmark.LEFT_WRIST, PoseLandmark.LEFT_INDEX],
  [PoseLandmark.LEFT_WRIST, PoseLandmark.LEFT_THUMB],
  [PoseLandmark.LEFT_PINKY, PoseLandmark.LEFT_INDEX],
  [PoseLandmark.RIGHT_SHOULDER, PoseLandmark.RIGHT_ELBOW],
  [PoseLandmark.RIGHT_ELBOW, PoseLandmark.RIGHT_WRIST],
  [PoseLandmark.RIGHT_WRIST, PoseLandmark.RIGHT_PINKY],
  [PoseLandmark.RIGHT_WRIST, PoseLandmark.RIGHT_INDEX],
  [PoseLandmark.RIGHT_WRIST, PoseLandmark.RIGHT_THUMB],
  [PoseLandmark.RIGHT_PINKY, PoseLandmark.RIGHT_INDEX],
  [PoseLandmark.LEFT_SHOULDER, PoseLandmark.LEFT_HIP],
  [PoseLandmark.RIGHT_SHOULDER, PoseLandmark.RIGHT_HIP],
  [PoseLandmark.LEFT_HIP, PoseLandmark.RIGHT_HIP],
  [PoseLandmark.LEFT_HIP, PoseLandmark.LEFT_KNEE],
  [PoseLandmark.LEFT_KNEE, PoseLandmark.LEFT_ANKLE],
  [PoseLandmark.LEFT_ANKLE, PoseLandmark.LEFT_HEEL],
  [PoseLandmark.LEFT_HEEL, PoseLandmark.LEFT_FOOT_INDEX],
  [PoseLandmark.LEFT_ANKLE, PoseLandmark.LEFT_FOOT_INDEX],
  [PoseLandmark.RIGHT_HIP, PoseLandmark.RIGHT_KNEE],
  [PoseLandmark.RIGHT_KNEE, PoseLandmark.RIGHT_ANKLE],
  [PoseLandmark.RIGHT_ANKLE, PoseLandmark.RIGHT_HEEL],
  [PoseLandmark.RIGHT_HEEL, PoseLandmark.RIGHT_FOOT_INDEX],
  [PoseLandmark.RIGHT_ANKLE, PoseLandmark.RIGHT_FOOT_INDEX],
  [PoseLandmark.NOSE, PoseLandmark.LEFT_EYE_INNER],
  [PoseLandmark.LEFT_EYE_INNER, PoseLandmark.LEFT_EYE],
  [PoseLandmark.LEFT_EYE, PoseLandmark.LEFT_EYE_OUTER],
  [PoseLandmark.LEFT_EYE_OUTER, PoseLandmark.LEFT_EAR],
  [PoseLandmark.NOSE, PoseLandmark.RIGHT_EYE_INNER],
  [PoseLandmark.RIGHT_EYE_INNER, PoseLandmark.RIGHT_EYE],
  [PoseLandmark.RIGHT_EYE, PoseLandmark.RIGHT_EYE_OUTER],
  [PoseLandmark.RIGHT_EYE_OUTER, PoseLandmark.RIGHT_EAR],
];

// Serving arm (right): 12,14,16,18,20,22
const SERVING_ARM_INDICES = new Set([12, 14, 16, 18, 20, 22]);
// Toss arm (left): 11,13,15,17,19,21
const TOSS_ARM_INDICES = new Set([11, 13, 15, 17, 19, 21]);
// Legs: >=23
const LEG_THRESHOLD = 23;

function connectionColor(a: number, b: number): string {
  if (SERVING_ARM_INDICES.has(a) && SERVING_ARM_INDICES.has(b)) return '#e8ff47';
  if (TOSS_ARM_INDICES.has(a) && TOSS_ARM_INDICES.has(b)) return '#47b8ff';
  if (a >= LEG_THRESHOLD && b >= LEG_THRESHOLD) return '#ff9047';
  return 'rgba(255,255,255,0.6)';
}

const PHASE_COLORS: Record<ServePhase, string> = {
  trophy: '#e8ff47',
  contact: '#47ffb8',
  loading: '#ff9047',
  followThrough: '#47b8ff',
  stance: '#555',
  finish: '#555',
  acceleration: '#ff9047',
};

interface Props {
  poseFrames: PoseFrame[];
  phases: ServePhaseRange[];
  videoUri?: string;
}

export default function SkeletonScrubber({ poseFrames, phases, videoUri }: Props) {
  const [currentFrameIndex, setCurrentFrameIndex] = useState(0);
  const [showSkeleton, setShowSkeleton] = useState(true);
  const videoRef = React.useRef<Video>(null);

  const screenWidth = Dimensions.get('window').width;
  const viewHeight = screenWidth * (9 / 16);

  const currentFrame = poseFrames[currentFrameIndex];
  const totalFrames = poseFrames.length;

  // Find which phase the current frame belongs to
  const currentPhase = phases.find(
    (p) => currentFrame && currentFrame.frameIndex >= p.startFrame && currentFrame.frameIndex <= p.endFrame
  );

  function seekToFrame(index: number) {
    const clamped = Math.max(0, Math.min(index, totalFrames - 1));
    setCurrentFrameIndex(clamped);
    if (videoRef.current && poseFrames[clamped]) {
      videoRef.current.setPositionAsync(poseFrames[clamped].timestampMs);
    }
  }

  const scrubberDots: number[] = [];
  for (let i = 0; i < totalFrames; i += 5) scrubberDots.push(i);

  return (
    <View style={{ width: screenWidth, height: viewHeight + 48, backgroundColor: '#0a0a0f' }}>
      {/* Video layer */}
      {videoUri ? (
        <Video
          ref={videoRef}
          source={{ uri: videoUri }}
          style={StyleSheet.absoluteFill}
          resizeMode={ResizeMode.CONTAIN}
          shouldPlay={false}
          isMuted
        />
      ) : (
        <View style={[StyleSheet.absoluteFill, { backgroundColor: '#111118' }]} />
      )}

      {/* Skeleton SVG */}
      {showSkeleton && currentFrame && (
        <Svg width={screenWidth} height={viewHeight} style={StyleSheet.absoluteFill}>
          {MEDIAPIPE_CONNECTIONS.map(([a, b], i) => {
            const kpA = currentFrame.keypoints[a];
            const kpB = currentFrame.keypoints[b];
            if (!kpA || !kpB) return null;
            if ((kpA.visibility ?? 0) < 0.4 || (kpB.visibility ?? 0) < 0.4) return null;
            return (
              <Line
                key={i}
                x1={kpA.x * screenWidth}
                y1={kpA.y * viewHeight}
                x2={kpB.x * screenWidth}
                y2={kpB.y * viewHeight}
                stroke={connectionColor(a, b)}
                strokeWidth={2}
                strokeOpacity={0.85}
              />
            );
          })}
          {currentFrame.keypoints.map((kp, i) => {
            if ((kp.visibility ?? 0) < 0.4) return null;
            const isNose = i === PoseLandmark.NOSE;
            return (
              <Circle
                key={i}
                cx={kp.x * screenWidth}
                cy={kp.y * viewHeight}
                r={isNose ? 5 : 3}
                fill={isNose ? '#fff' : '#e8ff47'}
                opacity={0.9}
              />
            );
          })}
        </Svg>
      )}

      {/* Top-left phase pill */}
      {currentPhase && (
        <View style={{ position: 'absolute', top: 10, left: 10 }}>
          <PhasePill phase={currentPhase.phase} />
        </View>
      )}

      {/* Top-right skeleton toggle */}
      <TouchableOpacity
        style={{ position: 'absolute', top: 10, right: 10, backgroundColor: 'rgba(0,0,0,0.6)', borderRadius: 8, padding: 6 }}
        onPress={() => setShowSkeleton((v) => !v)}
      >
        <Text style={{ color: showSkeleton ? '#e8ff47' : '#555', fontSize: 12, fontWeight: '700' }}>
          {showSkeleton ? 'HIDE' : 'SHOW'}
        </Text>
      </TouchableOpacity>

      {/* Scrubber bar */}
      <View style={styles.scrubber}>
        {/* Phase timeline */}
        <View style={styles.phaseTimeline}>
          {phases.map((p, i) => {
            const width = ((p.endFrame - p.startFrame + 1) / totalFrames) * 100;
            const isActive = currentPhase?.phase === p.phase;
            return (
              <View
                key={i}
                style={[
                  styles.phaseSegment,
                  {
                    width: `${width}%`,
                    backgroundColor: PHASE_COLORS[p.phase] + (isActive ? 'cc' : '44'),
                  },
                ]}
              />
            );
          })}
        </View>
        {/* Frame dots */}
        <View style={styles.frameDots}>
          {scrubberDots.map((fi) => (
            <TouchableOpacity key={fi} onPress={() => seekToFrame(fi)} style={styles.frameDotTouchable}>
              <View
                style={[
                  styles.frameDot,
                  { backgroundColor: fi === poseFrames[currentFrameIndex]?.frameIndex ? '#e8ff47' : '#333' },
                ]}
              />
            </TouchableOpacity>
          ))}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  scrubber: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 48,
    backgroundColor: 'rgba(0,0,0,0.8)',
    paddingHorizontal: 8,
    justifyContent: 'center',
  },
  phaseTimeline: {
    flexDirection: 'row',
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 4,
  },
  phaseSegment: {
    height: 8,
  },
  frameDots: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'nowrap',
  },
  frameDotTouchable: {
    padding: 4,
  },
  frameDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
  },
});
