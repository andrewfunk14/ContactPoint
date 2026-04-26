import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useServeAnalysis } from '../hooks/useServeAnalysis';

const STEPS = [
  { key: 'extracting_frames', label: 'Extracting frames' },
  { key: 'detecting_pose', label: 'Detecting pose' },
  { key: 'identifying_phases', label: 'Identifying phases' },
  { key: 'analyzing_technique', label: 'Analyzing technique' },
  { key: 'generating_drills', label: 'Generating drills' },
] as const;

export default function ProcessingScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    videoUri: string;
    studentId: string;
    dominantHand: string;
    level: string;
    studentName?: string;
  }>();

  const { analyze, processing, analysis, error } = useServeAnalysis();
  const hasStarted = useRef(false);
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.4, duration: 800, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
      ])
    ).start();
  }, [pulseAnim]);

  useEffect(() => {
    if (hasStarted.current) return;
    hasStarted.current = true;

    analyze(params.videoUri, params.studentId || null, {
      dominantHand: (params.dominantHand as 'right' | 'left') ?? 'right',
      level: (params.level as 'beginner' | 'intermediate' | 'advanced' | 'elite') ?? 'intermediate',
      name: params.studentName,
    });
  }, []);

  useEffect(() => {
    if (analysis) {
      router.replace(`/results/${analysis.id}`);
    }
  }, [analysis]);

  const progress = processing?.progress ?? 0;
  const currentStep = processing?.step;

  function isComplete(stepKey: string): boolean {
    const stepOrder = STEPS.map((s) => s.key);
    const currentIdx = stepOrder.indexOf(currentStep as typeof stepOrder[number]);
    const stepIdx = stepOrder.indexOf(stepKey as typeof stepOrder[number]);
    return stepIdx < currentIdx || currentStep === 'complete';
  }

  function isActive(stepKey: string): boolean {
    return currentStep === stepKey;
  }

  return (
    <View style={styles.container}>
      {/* Pulsing dot */}
      <Animated.View style={[styles.pulsingDot, { transform: [{ scale: pulseAnim }] }]} />

      <Text style={styles.title}>Analyzing Serve</Text>
      <Text style={styles.message}>{processing?.message ?? 'Preparing...'}</Text>

      {/* Progress bar */}
      <View style={styles.progressTrack}>
        <View style={[styles.progressFill, { width: `${progress}%` }]} />
      </View>
      <Text style={styles.progressText}>{Math.round(progress)}%</Text>

      {/* Step checklist */}
      <View style={styles.steps}>
        {STEPS.map((step) => {
          const done = isComplete(step.key);
          const active = isActive(step.key);
          return (
            <View key={step.key} style={styles.stepRow}>
              <View
                style={[
                  styles.stepDot,
                  done && styles.stepDotDone,
                  active && styles.stepDotActive,
                ]}
              >
                {done && <Text style={styles.stepCheck}>✓</Text>}
              </View>
              <Text style={[styles.stepLabel, (done || active) && { color: '#fff' }]}>
                {step.label}
              </Text>
            </View>
          );
        })}
      </View>

      {/* Error */}
      {error && (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0a0f',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  pulsingDot: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#e8ff47',
    marginBottom: 32,
    shadowColor: '#e8ff47',
    shadowOpacity: 0.8,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 0 },
  },
  title: {
    color: '#fff',
    fontSize: 26,
    fontWeight: '800',
    marginBottom: 8,
  },
  message: {
    color: '#888',
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 32,
  },
  progressTrack: {
    width: '100%',
    height: 4,
    backgroundColor: '#1e1e2e',
    borderRadius: 2,
    marginBottom: 8,
    overflow: 'hidden',
  },
  progressFill: {
    height: 4,
    backgroundColor: '#e8ff47',
    borderRadius: 2,
  },
  progressText: {
    color: '#e8ff47',
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 32,
  },
  steps: { width: '100%', gap: 14 },
  stepRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  stepDot: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#1e1e2e',
    borderWidth: 1,
    borderColor: '#333',
    justifyContent: 'center',
    alignItems: 'center',
  },
  stepDotDone: { backgroundColor: '#e8ff47', borderColor: '#e8ff47' },
  stepDotActive: {
    borderColor: '#e8ff47',
    shadowColor: '#e8ff47',
    shadowOpacity: 0.6,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 0 },
  },
  stepCheck: { color: '#0a0a0f', fontSize: 11, fontWeight: '800' },
  stepLabel: { color: '#555', fontSize: 14 },
  errorBox: {
    marginTop: 24,
    backgroundColor: '#ff453a20',
    borderRadius: 10,
    padding: 14,
    borderWidth: 1,
    borderColor: '#ff453a40',
  },
  errorText: { color: '#ff453a', fontSize: 13, textAlign: 'center' },
});
