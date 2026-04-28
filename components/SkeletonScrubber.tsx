import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  View,
  Dimensions,
  TouchableOpacity,
  Text,
  StyleSheet,
  PanResponder,
  ScrollView,
} from 'react-native';
import Svg, { Line, Circle, Text as SvgText, Rect } from 'react-native-svg';
import { VideoView, useVideoPlayer } from 'expo-video';
import { PoseFrame, ServePhaseRange, ServePhase, PoseLandmark, TechniqueFault, Keypoint } from '../lib/types';
import { PhasePill } from './index';

// ─── Skeleton connections ────────────────────────────────────────────────────

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

const RIGHT_ARM = new Set([12, 14, 16, 18, 20, 22]);
const LEFT_ARM  = new Set([11, 13, 15, 17, 19, 21]);
const LEG_START = 23;

function connectionColor(a: number, b: number, dominantHand: 'right' | 'left'): string {
  const servingArm = dominantHand === 'right' ? RIGHT_ARM : LEFT_ARM;
  const tossArm    = dominantHand === 'right' ? LEFT_ARM  : RIGHT_ARM;
  if (servingArm.has(a) && servingArm.has(b)) return '#e8ff47';
  if (tossArm.has(a)    && tossArm.has(b))    return '#47b8ff';
  if (a >= LEG_START    && b >= LEG_START)     return '#ff9047';
  return 'rgba(255,255,255,0.6)';
}

// ─── Phase config ────────────────────────────────────────────────────────────

const PHASE_COLORS: Record<ServePhase, string> = {
  stance: '#888', trophy: '#e8ff47', loading: '#ff9047',
  acceleration: '#ff9047', contact: '#47ffb8', followThrough: '#47b8ff', finish: '#888',
};
const PHASE_LABELS: Record<ServePhase, string> = {
  stance: 'Stance', trophy: 'Trophy', loading: 'Loading',
  acceleration: 'Accel', contact: 'Contact', followThrough: 'Follow', finish: 'Finish',
};
const SEVERITY_COLORS = { minor: '#888', moderate: '#ff9047', major: '#ff453a' };

function formatTime(ms: number): string {
  const s = Math.floor(ms / 1000);
  const tenths = Math.floor((ms % 1000) / 100);
  return `${s}.${tenths}s`;
}

// ─── Props ───────────────────────────────────────────────────────────────────

interface Props {
  poseFrames: PoseFrame[];
  phases: ServePhaseRange[];
  videoUri?: string;
  faults?: TechniqueFault[];
  dominantHand?: 'right' | 'left';
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function SkeletonScrubber({
  poseFrames, phases, videoUri, faults = [], dominantHand = 'right',
}: Props) {
  const [currentFrameIndex, setCurrentFrameIndex] = useState(0);
  const [showSkeleton, setShowSkeleton] = useState(true);
  const [isPlaying, setIsPlaying]       = useState(false);
  const [speed, setSpeed]               = useState<0.25 | 0.5 | 1>(1);
  const [zoomEnabled, setZoomEnabled]   = useState(true);
  const [videoNaturalSize, setVideoNaturalSize] = useState<{ width: number; height: number } | null>(null);

  const playRef          = useRef<{ startedAt: number; startPct: number } | null>(null);
  const timerRef         = useRef<ReturnType<typeof setInterval> | null>(null);
  const scrubberPageX    = useRef(0);
  const scrubberWidthRef = useRef(300);
  const totalFramesRef   = useRef(poseFrames.length);
  const speedRef         = useRef(speed);
  const scrubberRef      = useRef<View>(null);

  const player = useVideoPlayer(videoUri ? { uri: videoUri } : null, (p) => {
    p.pause();
    p.muted = true;
  });
  const playerRef = useRef(player);

  useEffect(() => { totalFramesRef.current = poseFrames.length; }, [poseFrames.length]);
  useEffect(() => { speedRef.current = speed; },  [speed]);
  useEffect(() => { playerRef.current = player; }, [player]);
  useEffect(() => {
    try { if (player) player.playbackRate = speed; } catch {}
  }, [speed, player]);
  useEffect(() => () => { if (timerRef.current) clearInterval(timerRef.current); }, []);

  // Poll for video natural size once the player has metadata
  useEffect(() => {
    if (!player || !videoUri || videoNaturalSize) return;
    const id = setInterval(() => {
      const size = (player as any).videoSize;
      if (size?.width > 0) {
        setVideoNaturalSize({ width: size.width, height: size.height });
        clearInterval(id);
      }
    }, 200);
    return () => clearInterval(id);
  }, [player, videoUri, videoNaturalSize]);

  // ─── Geometry ──────────────────────────────────────────────────────────────

  const screenWidth  = Dimensions.get('window').width;
  const screenHeight = Dimensions.get('window').height;

  // Container height adapts to the video's own aspect ratio
  const viewHeight = useMemo(() => {
    if (!videoNaturalSize) return screenWidth * (9 / 16);
    const natural = screenWidth / (videoNaturalSize.width / videoNaturalSize.height);
    return Math.min(natural, screenHeight * 0.65);
  }, [videoNaturalSize, screenWidth, screenHeight]);

  // The rect the video occupies inside the container (contain-scaled)
  const renderRect = useMemo(() => {
    if (!videoNaturalSize) return { x: 0, y: 0, w: screenWidth, h: viewHeight };
    const va = videoNaturalSize.width / videoNaturalSize.height;
    const ca = screenWidth / viewHeight;
    if (va > ca) {
      const h = screenWidth / va;
      return { x: 0, y: (viewHeight - h) / 2, w: screenWidth, h };
    }
    const w = viewHeight * va;
    return { x: (screenWidth - w) / 2, y: 0, w, h: viewHeight };
  }, [videoNaturalSize, screenWidth, viewHeight]);

  // Union bounding box of the person across ALL frames — gives a stable zoom
  const personBbox = useMemo(() => {
    if (poseFrames.length === 0) return null;
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    let found = false;
    for (const frame of poseFrames) {
      for (const kp of frame.keypoints) {
        if ((kp.visibility ?? 0) < 0.4) continue;
        const px = renderRect.x + kp.x * renderRect.w;
        const py = renderRect.y + kp.y * renderRect.h;
        if (px < minX) minX = px;
        if (py < minY) minY = py;
        if (px > maxX) maxX = px;
        if (py > maxY) maxY = py;
        found = true;
      }
    }
    if (!found) return null;
    // 12% padding so the person isn't cropped to the exact edge
    const padX = (maxX - minX) * 0.12;
    const padY = (maxY - minY) * 0.12;
    return {
      centerX: (minX + maxX) / 2,
      centerY: (minY + maxY) / 2,
      w: maxX - minX + padX * 2,
      h: maxY - minY + padY * 2,
    };
  }, [poseFrames, renderRect]);

  // How much to zoom so the person fills the frame
  const zoomScale = useMemo(() => {
    if (!personBbox) return 1;
    const s = Math.min(screenWidth / personBbox.w, viewHeight / personBbox.h);
    return Math.min(Math.max(s, 1), 4); // clamp to [1×, 4×]
  }, [personBbox, screenWidth, viewHeight]);

  // ─── Coordinate helpers ────────────────────────────────────────────────────
  // Converts a raw keypoint into screen-space x/y, accounting for zoom.
  // When zoom is enabled the video is enlarged and offset so the person fills
  // the container — the SVG must apply the identical transform so it stays
  // pixel-perfect on top of the video.

  function kpX(kp: Keypoint): number {
    const orig = renderRect.x + kp.x * renderRect.w;
    if (!zoomEnabled || !personBbox || zoomScale <= 1) return orig;
    return (orig - personBbox.centerX) * zoomScale + screenWidth / 2;
  }

  function kpY(kp: Keypoint): number {
    const orig = renderRect.y + kp.y * renderRect.h;
    if (!zoomEnabled || !personBbox || zoomScale <= 1) return orig;
    return (orig - personBbox.centerY) * zoomScale + viewHeight / 2;
  }

  // VideoView position when zoomed: enlarge to zoomScale and offset so the
  // person center aligns with the container center.
  const videoW    = zoomEnabled && personBbox && zoomScale > 1 ? screenWidth  * zoomScale : screenWidth;
  const videoH    = zoomEnabled && personBbox && zoomScale > 1 ? viewHeight   * zoomScale : viewHeight;
  const videoLeft = zoomEnabled && personBbox && zoomScale > 1 ? screenWidth  / 2 - personBbox.centerX * zoomScale : 0;
  const videoTop  = zoomEnabled && personBbox && zoomScale > 1 ? viewHeight   / 2 - personBbox.centerY * zoomScale : 0;

  // ─── Playback ──────────────────────────────────────────────────────────────

  const totalFrames  = poseFrames.length;
  const currentFrame = poseFrames[currentFrameIndex] ?? null;

  const currentPhase = phases.find(
    (p) => currentFrame && currentFrame.frameIndex >= p.startFrame && currentFrame.frameIndex <= p.endFrame,
  );
  const currentFaults = faults.filter((f) => f.phase === currentPhase?.phase);

  function framePct(index: number) {
    return totalFrames > 1 ? index / (totalFrames - 1) : 0;
  }
  function pctToFrame(pct: number) {
    return Math.round(Math.max(0, Math.min(1, pct)) * (totalFrames - 1));
  }

  function stopPlayback() {
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
    playRef.current = null;
    try { player?.pause(); } catch {}
    setIsPlaying(false);
  }

  function startPlayback(fromIndex: number) {
    if (timerRef.current) clearInterval(timerRef.current);
    const startPct = framePct(fromIndex);
    playRef.current = { startedAt: Date.now(), startPct };
    try {
      if (player) {
        const dur = player.duration;
        if (dur > 0 && isFinite(dur)) player.currentTime = startPct * dur;
        player.play();
      }
    } catch {}
    timerRef.current = setInterval(() => {
      if (!playRef.current) return;
      const p   = playerRef.current;
      const dur = p?.duration ?? 0;
      let nextIndex: number;
      if (dur > 0 && isFinite(dur)) {
        const pct = Math.max(0, Math.min(1, p!.currentTime / dur));
        nextIndex = Math.round(pct * (totalFramesRef.current - 1));
      } else {
        const elapsed = Date.now() - playRef.current.startedAt;
        const pct = Math.min(1, playRef.current.startPct + (elapsed / 4000) * speedRef.current);
        nextIndex = Math.round(pct * (totalFramesRef.current - 1));
      }
      setCurrentFrameIndex(nextIndex);
      if (nextIndex >= totalFramesRef.current - 1) stopPlayback();
    }, 50);
    setIsPlaying(true);
  }

  function togglePlay() {
    if (isPlaying) { stopPlayback(); return; }
    const from = currentFrameIndex >= totalFrames - 1 ? 0 : currentFrameIndex;
    if (from === 0) setCurrentFrameIndex(0);
    startPlayback(from);
  }

  function seekToFrame(index: number) {
    const clamped = Math.max(0, Math.min(index, totalFrames - 1));
    stopPlayback();
    setCurrentFrameIndex(clamped);
    try {
      if (player) {
        const dur = player.duration;
        if (dur > 0 && isFinite(dur)) player.currentTime = framePct(clamped) * dur;
      }
    } catch {}
  }

  // ─── PanResponder ──────────────────────────────────────────────────────────

  const panResponder = useRef(PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder:  () => true,
    onPanResponderGrant: (_, gs) => {
      if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
      playRef.current = null;
      setIsPlaying(false);
      try { playerRef.current?.pause(); } catch {}
      const pct   = Math.max(0, Math.min(1, (gs.x0 - scrubberPageX.current) / Math.max(1, scrubberWidthRef.current)));
      const frame = Math.round(pct * Math.max(0, totalFramesRef.current - 1));
      setCurrentFrameIndex(frame);
      try {
        const dur = playerRef.current?.duration ?? 0;
        if (dur > 0 && isFinite(dur)) playerRef.current!.currentTime = pct * dur;
      } catch {}
    },
    onPanResponderMove: (_, gs) => {
      const pct   = Math.max(0, Math.min(1, (gs.moveX - scrubberPageX.current) / Math.max(1, scrubberWidthRef.current)));
      const frame = Math.round(pct * Math.max(0, totalFramesRef.current - 1));
      setCurrentFrameIndex(frame);
      try {
        const dur = playerRef.current?.duration ?? 0;
        if (dur > 0 && isFinite(dur)) playerRef.current!.currentTime = pct * dur;
      } catch {}
    },
  })).current;

  function measureScrubber() {
    scrubberRef.current?.measure((_fx, _fy, width, _height, pageX) => {
      scrubberPageX.current    = pageX;
      scrubberWidthRef.current = width;
    });
  }

  // ─── Derived display ───────────────────────────────────────────────────────

  const fillPct   = totalFrames > 1 ? currentFrameIndex / (totalFrames - 1) : 0;
  const videoDur  = player?.duration ?? 0;
  const totalMs   = videoDur > 0 && isFinite(videoDur) ? videoDur * 1000 : 4000;
  const currentMs = Math.round(fillPct * totalMs);

  const faultMarkers = phases
    .filter((p) => faults.some((f) => f.phase === p.phase))
    .map((p) => ({
      pct:      framePct(Math.floor((p.startFrame + p.endFrame) / 2)),
      severity: faults.find((f) => f.phase === p.phase)!.severity,
    }));

  const elbowIdx = dominantHand === 'right' ? PoseLandmark.RIGHT_ELBOW : PoseLandmark.LEFT_ELBOW;
  const kneeIdx  = dominantHand === 'right' ? PoseLandmark.RIGHT_KNEE  : PoseLandmark.LEFT_KNEE;

  // ─── Render ────────────────────────────────────────────────────────────────

  return (
    <View style={{ width: screenWidth, backgroundColor: '#0a0a0f' }}>

      {/* ── Video + skeleton ─────────────────────────────────────── */}
      {/* overflow:hidden clips the enlarged video to the container bounds */}
      <View style={{ width: screenWidth, height: viewHeight, overflow: 'hidden', backgroundColor: '#000' }}>

        {videoUri ? (
          <VideoView
            player={player}
            style={{
              position: 'absolute',
              width:  videoW,
              height: videoH,
              left:   videoLeft,
              top:    videoTop,
            }}
            contentFit="contain"
            nativeControls={false}
          />
        ) : (
          <View style={[StyleSheet.absoluteFill, { backgroundColor: '#111118' }]} />
        )}

        {showSkeleton && currentFrame && (
          <Svg width={screenWidth} height={viewHeight} style={StyleSheet.absoluteFill}>
            {/* Connections */}
            {MEDIAPIPE_CONNECTIONS.map(([a, b], i) => {
              const kpA = currentFrame.keypoints[a];
              const kpB = currentFrame.keypoints[b];
              if (!kpA || !kpB) return null;
              if ((kpA.visibility ?? 0) < 0.4 || (kpB.visibility ?? 0) < 0.4) return null;
              return (
                <Line
                  key={i}
                  x1={kpX(kpA)} y1={kpY(kpA)}
                  x2={kpX(kpB)} y2={kpY(kpB)}
                  stroke={connectionColor(a, b, dominantHand)}
                  strokeWidth={2.5}
                  strokeOpacity={0.9}
                />
              );
            })}

            {/* Joint dots */}
            {currentFrame.keypoints.map((kp, i) => {
              if ((kp.visibility ?? 0) < 0.4) return null;
              return (
                <Circle
                  key={i}
                  cx={kpX(kp)}
                  cy={kpY(kp)}
                  r={i === PoseLandmark.NOSE ? 5 : 3.5}
                  fill={i === PoseLandmark.NOSE ? '#fff' : '#e8ff47'}
                  opacity={0.95}
                />
              );
            })}

            {/* Serving elbow angle */}
            {currentFrame.angles && (() => {
              const kp = currentFrame.keypoints[elbowIdx];
              if (!kp || (kp.visibility ?? 0) < 0.5) return null;
              const x = kpX(kp) + 12;
              const y = kpY(kp);
              return (
                <>
                  <Rect x={x} y={y - 15} width={44} height={19} rx={5} fill="rgba(0,0,0,0.75)" />
                  <SvgText x={x + 22} y={y - 1} textAnchor="middle" fill="#e8ff47" fontSize={11} fontWeight="bold">
                    {Math.round(currentFrame.angles.servingElbow)}°
                  </SvgText>
                </>
              );
            })()}

            {/* Knee flexion angle */}
            {currentFrame.angles && (() => {
              const kp = currentFrame.keypoints[kneeIdx];
              if (!kp || (kp.visibility ?? 0) < 0.5) return null;
              const x = kpX(kp) + 12;
              const y = kpY(kp);
              return (
                <>
                  <Rect x={x} y={y - 15} width={44} height={19} rx={5} fill="rgba(0,0,0,0.75)" />
                  <SvgText x={x + 22} y={y - 1} textAnchor="middle" fill="#ff9047" fontSize={11} fontWeight="bold">
                    {Math.round(currentFrame.angles.kneeFlexion)}°
                  </SvgText>
                </>
              );
            })()}
          </Svg>
        )}

        {/* Phase pill */}
        {currentPhase && (
          <View style={{ position: 'absolute', top: 10, left: 10 }}>
            <PhasePill phase={currentPhase.phase} />
          </View>
        )}

        {/* Top-right buttons */}
        <View style={styles.topRight}>
          <TouchableOpacity style={styles.overlayBtn} onPress={() => setShowSkeleton((v) => !v)}>
            <Text style={[styles.overlayBtnText, { color: showSkeleton ? '#e8ff47' : '#555' }]}>
              {showSkeleton ? 'HIDE' : 'SHOW'}
            </Text>
          </TouchableOpacity>
          {personBbox && zoomScale > 1 && (
            <TouchableOpacity style={styles.overlayBtn} onPress={() => setZoomEnabled((v) => !v)}>
              <Text style={[styles.overlayBtnText, { color: zoomEnabled ? '#e8ff47' : '#555' }]}>
                ZOOM
              </Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Fault banner */}
        {currentFaults.length > 0 && (
          <View style={styles.faultBanner}>
            <View style={[styles.faultBannerDot, { backgroundColor: SEVERITY_COLORS[currentFaults[0].severity] }]} />
            <View style={{ flex: 1 }}>
              <Text style={styles.faultBannerTitle} numberOfLines={1}>{currentFaults[0].fault}</Text>
              <Text style={[styles.faultBannerSev, { color: SEVERITY_COLORS[currentFaults[0].severity] }]}>
                {currentFaults[0].severity.toUpperCase()}
                {currentFaults.length > 1 ? `  +${currentFaults.length - 1} more` : ''}
              </Text>
            </View>
          </View>
        )}
      </View>

      {/* ── Controls ─────────────────────────────────────────────── */}
      <View style={styles.controls}>
        <TouchableOpacity onPress={togglePlay} style={styles.playBtn}>
          <Text style={styles.playIcon}>{isPlaying ? '⏸' : '▶'}</Text>
        </TouchableOpacity>
        <Text style={styles.timestamp}>{formatTime(currentMs)} / {formatTime(totalMs)}</Text>
        <View style={styles.speedGroup}>
          {([0.25, 0.5, 1] as const).map((s) => (
            <TouchableOpacity
              key={s}
              onPress={() => setSpeed(s)}
              style={[styles.speedBtn, speed === s && styles.speedBtnActive]}
            >
              <Text style={[styles.speedText, speed === s && styles.speedTextActive]}>
                {s === 1 ? '1×' : `${s}×`}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* ── Scrubber ─────────────────────────────────────────────── */}
      <View style={styles.scrubberContainer}>
        <View
          ref={scrubberRef}
          onLayout={measureScrubber}
          style={styles.scrubberTrack}
          {...panResponder.panHandlers}
        >
          <View style={[styles.scrubberFill, { width: `${fillPct * 100}%` }]} />
          {faultMarkers.map((m, i) => (
            <View key={i} style={[styles.faultTick, {
              left: `${m.pct * 100}%` as any,
              backgroundColor: SEVERITY_COLORS[m.severity],
            }]} />
          ))}
          <View style={[styles.scrubberThumb, { left: `${fillPct * 100}%` as any }]} />
        </View>
      </View>

      {/* ── Phase pills ──────────────────────────────────────────── */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.phaseRow}
        contentContainerStyle={styles.phaseRowContent}
      >
        {phases.map((p, i) => {
          const isActive = currentPhase?.phase === p.phase;
          const hasFault = faults.some((f) => f.phase === p.phase);
          const color    = PHASE_COLORS[p.phase];
          return (
            <TouchableOpacity
              key={i}
              onPress={() => seekToFrame(p.keyFrame)}
              style={[
                styles.phasePill,
                { borderColor: isActive ? color : color + '30' },
                isActive && { backgroundColor: color + '18' },
              ]}
            >
              <View style={[styles.phaseDot, { backgroundColor: isActive ? color : color + '80' }]} />
              <Text style={[styles.phaseLabel, { color: isActive ? color : '#555' }]}>
                {PHASE_LABELS[p.phase]}
              </Text>
              {hasFault && <View style={styles.faultPip} />}
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  topRight: {
    position: 'absolute', top: 10, right: 10, gap: 6,
  },
  overlayBtn: {
    backgroundColor: 'rgba(0,0,0,0.6)', borderRadius: 8,
    paddingHorizontal: 10, paddingVertical: 6,
  },
  overlayBtnText: { fontSize: 11, fontWeight: '800', letterSpacing: 0.8 },

  faultBanner: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: 'rgba(10,10,15,0.88)',
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 14, paddingVertical: 10, gap: 10,
    borderTopWidth: 1, borderTopColor: '#1e1e2e',
  },
  faultBannerDot: { width: 8, height: 8, borderRadius: 4 },
  faultBannerTitle: { color: '#fff', fontSize: 13, fontWeight: '700' },
  faultBannerSev: { fontSize: 10, fontWeight: '700', letterSpacing: 0.5, marginTop: 1 },

  controls: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#0d0d14', paddingHorizontal: 12, paddingVertical: 10, gap: 10,
  },
  playBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: '#e8ff47', justifyContent: 'center', alignItems: 'center',
  },
  playIcon:  { fontSize: 14, color: '#0a0a0f' },
  timestamp: { color: '#666', fontSize: 11, width: 80 },
  speedGroup: { flex: 1, flexDirection: 'row', justifyContent: 'flex-end', gap: 6 },
  speedBtn: {
    paddingHorizontal: 10, paddingVertical: 5,
    borderRadius: 6, borderWidth: 1, borderColor: '#2a2a3a',
  },
  speedBtnActive:  { borderColor: '#e8ff47', backgroundColor: '#e8ff4718' },
  speedText:       { color: '#555', fontSize: 11, fontWeight: '700' },
  speedTextActive: { color: '#e8ff47' },

  scrubberContainer: {
    backgroundColor: '#0d0d14', paddingHorizontal: 14, paddingBottom: 12, paddingTop: 4,
  },
  scrubberTrack: { height: 28, justifyContent: 'center' },
  scrubberFill: {
    position: 'absolute', left: 0, top: 11, height: 6,
    backgroundColor: '#e8ff4780', borderRadius: 3,
  },
  faultTick: {
    position: 'absolute', width: 3, height: 14, top: 7,
    borderRadius: 1.5, marginLeft: -1.5,
  },
  scrubberThumb: {
    position: 'absolute', width: 18, height: 18, borderRadius: 9,
    backgroundColor: '#e8ff47', top: 5, marginLeft: -9,
    shadowColor: '#e8ff47', shadowOpacity: 0.6, shadowRadius: 6,
    shadowOffset: { width: 0, height: 0 }, elevation: 4,
  },

  phaseRow: {
    backgroundColor: '#0d0d14', borderTopWidth: 1, borderTopColor: '#111118',
  },
  phaseRowContent: { paddingHorizontal: 12, paddingVertical: 10, gap: 8 },
  phasePill: {
    flexDirection: 'row', alignItems: 'center',
    borderRadius: 20, borderWidth: 1, paddingHorizontal: 10, paddingVertical: 6, gap: 5,
  },
  phaseDot:  { width: 6, height: 6, borderRadius: 3 },
  phaseLabel: { fontSize: 12, fontWeight: '600' },
  faultPip:  { width: 5, height: 5, borderRadius: 2.5, backgroundColor: '#ff453a', marginLeft: 2 },
});
