import { useState, useCallback } from 'react';
import { supabase, uploadVideo, uploadThumbnail } from '../../lib/supabase';
import { extractFrames, extractThumbnail, clearFrameCache } from '../../lib/frameExtractor';
import { runPoseDetection } from '../../lib/poseDetector';
import { calculateJointAngles, detectPhaseForFrame } from '../../lib/poseAnalytics';
import {
  ProcessingState,
  ServeAnalysis,
  PoseFrame,
  ServePhaseRange,
  ServePhase,
  TechniqueScore,
  TechniqueFault,
  Drill,
  ProComparison,
} from '../../lib/types';

interface PlayerInfo {
  dominantHand: 'right' | 'left';
  level: 'beginner' | 'intermediate' | 'advanced' | 'elite';
  name?: string;
}

interface UseServeAnalysisReturn {
  analyze: (videoUri: string, sessionId: string, playerInfo: PlayerInfo) => Promise<void>;
  processing: ProcessingState | null;
  analysis: ServeAnalysis | null;
  error: string | null;
  reset: () => void;
}

export function useServeAnalysis(): UseServeAnalysisReturn {
  const [processing, setProcessing] = useState<ProcessingState | null>(null);
  const [analysis, setAnalysis] = useState<ServeAnalysis | null>(null);
  const [error, setError] = useState<string | null>(null);

  const reset = useCallback(() => {
    setProcessing(null);
    setAnalysis(null);
    setError(null);
  }, []);

  const analyze = useCallback(async (
    videoUri: string,
    sessionId: string,
    playerInfo: PlayerInfo
  ) => {
    try {
      setError(null);
      setProcessing({ step: 'extracting_frames', progress: 5, message: 'Extracting video frames...' });

      // Step 1: Extract frames
      const frames = await extractFrames(videoUri, (p) => {
        setProcessing({ step: 'extracting_frames', progress: 5 + (p * 0.45), message: 'Extracting video frames...' });
      });

      const thumbnailUri = await extractThumbnail(videoUri);

      // Step 2: Pose detection
      setProcessing({ step: 'detecting_pose', progress: 35, message: 'Detecting body pose...' });

      const poseFrames: PoseFrame[] = [];
      for (let i = 0; i < frames.length; i++) {
        const frame = frames[i];
        const keypoints = await runPoseDetection(frame.uri);
        if (keypoints) {
          const angles = calculateJointAngles(keypoints, playerInfo.dominantHand);
          poseFrames.push({
            frameIndex: frame.frameIndex,
            timestampMs: frame.timestampMs,
            keypoints,
            angles,
          });
        }
        const progress = 35 + ((i / frames.length) * 30);
        setProcessing({ step: 'detecting_pose', progress, message: `Detecting pose (${i + 1}/${frames.length})...` });
      }

      // Step 3: Identify phases
      setProcessing({ step: 'identifying_phases', progress: 65, message: 'Identifying serve phases...' });

      // Tag each frame with a phase
      const taggedFrames = poseFrames.map((pf) => ({
        ...pf,
        phase: detectPhaseForFrame(pf.keypoints, pf.angles, playerInfo.dominantHand),
      }));

      // Group consecutive frames with the same phase
      const phaseRanges: ServePhaseRange[] = [];
      let currentPhase: ServePhase | null = null;
      let startFrame = 0;

      for (let i = 0; i <= taggedFrames.length; i++) {
        const frame = taggedFrames[i];
        const phase = frame?.phase ?? null;

        if (phase !== currentPhase) {
          if (currentPhase !== null) {
            const endFrame = i - 1;
            const runLength = endFrame - startFrame + 1;
            // Merge runs shorter than 3 frames into neighbors
            if (runLength >= 3 || phaseRanges.length === 0) {
              const keyFrame = Math.floor((startFrame + endFrame) / 2);
              phaseRanges.push({ phase: currentPhase, startFrame, endFrame, keyFrame });
            } else if (phaseRanges.length > 0) {
              phaseRanges[phaseRanges.length - 1].endFrame = endFrame;
              phaseRanges[phaseRanges.length - 1].keyFrame = Math.floor(
                (phaseRanges[phaseRanges.length - 1].startFrame + endFrame) / 2
              );
            }
          }
          currentPhase = phase;
          startFrame = i;
        }
      }

      // Step 4: Call Claude for analysis
      setProcessing({ step: 'analyzing_technique', progress: 70, message: 'AI analyzing technique...' });

      // Sample every 10th frame for the API call
      const sampledFrames = taggedFrames.filter((_, i) => i % 10 === 0).map((f) => ({
        frameIndex: f.frameIndex,
        timestampMs: f.timestampMs,
        angles: f.angles,
        phase: f.phase,
      }));

      // Build detectedPhases with keyFrame angles
      const detectedPhases = phaseRanges.map((pr) => {
        const keyFrameData = taggedFrames[pr.keyFrame];
        return {
          ...pr,
          keyFrameAngles: keyFrameData?.angles ?? null,
        };
      });

      const { data: functionData, error: functionError } = await supabase.functions.invoke(
        'analyze-serve',
        {
          body: {
            poseFrames: sampledFrames,
            detectedPhases,
            playerInfo,
          },
        }
      );

      if (functionError) throw new Error(functionError.message);

      setProcessing({ step: 'generating_drills', progress: 85, message: 'Uploading video...' });

      // Step 5: Upload video and thumbnail in parallel
      const videoFileName = `serve_${Date.now()}.mp4`;
      const [videoUrl, thumbnailUrl] = await Promise.all([
        uploadVideo(videoUri, sessionId, videoFileName),
        uploadThumbnail(thumbnailUri, sessionId),
      ]);

      // Step 6: Insert to DB
      const scores: TechniqueScore = functionData.scores;
      const { data: insertedAnalysis, error: insertError } = await supabase
        .from('serve_analyses')
        .insert({
          session_id: sessionId,
          coach_id: (await supabase.auth.getUser()).data.user?.id,
          video_url: videoUrl,
          thumbnail_url: thumbnailUrl,
          score_overall: scores.overall,
          score_stance: scores.stance,
          score_trophy: scores.trophy,
          score_loading: scores.loading,
          score_contact: scores.contact,
          score_follow_through: scores.followThrough,
          analysis_json: functionData,
          pose_frames_json: poseFrames,
          detected_phases_json: phaseRanges,
        })
        .select()
        .single();

      if (insertError) throw new Error(insertError.message);

      const result: ServeAnalysis = {
        id: insertedAnalysis.id,
        sessionId,
        createdAt: insertedAnalysis.created_at,
        videoUri: videoUrl,
        thumbnailUri: thumbnailUrl,
        phases: phaseRanges,
        poseFrames,
        scores,
        faults: functionData.faults as TechniqueFault[],
        drills: functionData.drills as Drill[],
        proComparison: functionData.proComparison as ProComparison,
        summary: functionData.summary as string,
      };

      setAnalysis(result);
      setProcessing({ step: 'complete', progress: 100, message: 'Analysis complete!' });

      await clearFrameCache();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Analysis failed';
      setError(message);
      setProcessing({ step: 'error', progress: 0, message: 'Analysis failed', error: message });
      await clearFrameCache().catch(() => {});
    }
  }, []);

  return { analyze, processing, analysis, error, reset };
}
