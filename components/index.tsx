import React from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import Svg, { Circle, Text as SvgText } from 'react-native-svg';
import { ServePhase, TechniqueFault, Drill, ProComparison } from '../lib/types';

// ─── Color helpers ──────────────────────────────────────────────────────────

function scoreColor(score: number): string {
  if (score >= 80) return '#e8ff47';
  if (score >= 60) return '#ff9047';
  return '#ff453a';
}

// ─── ScoreRing ───────────────────────────────────────────────────────────────

interface ScoreRingProps {
  score: number;
  size: number;
  label: string;
  small?: boolean;
}

export function ScoreRing({ score, size, label, small }: ScoreRingProps) {
  const stroke = small ? 4 : 6;
  const radius = (size - stroke * 2) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = (score / 100) * circumference;
  const color = scoreColor(score);
  const fontSize = small ? size * 0.28 : size * 0.3;

  return (
    <View style={{ alignItems: 'center' }}>
      <Svg width={size} height={size}>
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="#1e1e2e"
          strokeWidth={stroke}
          fill="none"
        />
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={color}
          strokeWidth={stroke}
          fill="none"
          strokeDasharray={`${progress} ${circumference - progress}`}
          strokeDashoffset={circumference / 4}
          strokeLinecap="round"
          rotation={-90}
          origin={`${size / 2}, ${size / 2}`}
        />
        <SvgText
          x={size / 2}
          y={size / 2 + fontSize * 0.35}
          textAnchor="middle"
          fill={color}
          fontSize={fontSize}
          fontWeight="bold"
        >
          {score}
        </SvgText>
      </Svg>
      <Text style={[styles.ringLabel, { color: '#888', fontSize: small ? 9 : 11 }]}>
        {label.toUpperCase()}
      </Text>
    </View>
  );
}

// ─── PhasePill ───────────────────────────────────────────────────────────────

const PHASE_COLORS: Record<ServePhase, string> = {
  trophy: '#e8ff47',
  contact: '#47ffb8',
  loading: '#ff9047',
  followThrough: '#47b8ff',
  stance: '#555',
  finish: '#555',
  acceleration: '#ff9047',
};

const PHASE_LABELS: Record<ServePhase, string> = {
  trophy: 'Trophy',
  contact: 'Contact',
  loading: 'Loading',
  followThrough: 'Follow Through',
  stance: 'Stance',
  finish: 'Finish',
  acceleration: 'Acceleration',
};

interface PhasePillProps {
  phase: ServePhase;
}

export function PhasePill({ phase }: PhasePillProps) {
  const color = PHASE_COLORS[phase];
  return (
    <View style={[styles.pill, { borderColor: color + '40' }]}>
      <View style={[styles.pillDot, { backgroundColor: color }]} />
      <Text style={[styles.pillText, { color }]}>{PHASE_LABELS[phase]}</Text>
    </View>
  );
}

// ─── FaultCard ───────────────────────────────────────────────────────────────

const SEVERITY_COLORS = {
  minor: '#555',
  moderate: '#ff9047',
  major: '#ff453a',
};

interface FaultCardProps {
  fault: TechniqueFault;
}

export function FaultCard({ fault }: FaultCardProps) {
  const sevColor = SEVERITY_COLORS[fault.severity];
  return (
    <View style={[styles.faultCard, { borderColor: sevColor + '30' }]}>
      <View style={styles.faultHeader}>
        <PhasePill phase={fault.phase} />
        <View style={[styles.severityBadge, { backgroundColor: sevColor + '20', borderColor: sevColor }]}>
          <Text style={[styles.severityText, { color: sevColor }]}>{fault.severity.toUpperCase()}</Text>
        </View>
      </View>
      <Text style={styles.faultName}>{fault.fault}</Text>
      <Text style={styles.faultDesc}>{fault.description}</Text>
      {fault.proComparison ? (
        <View style={styles.proBox}>
          <Text style={styles.proLabel}>PRO</Text>
          <Text style={styles.proText}>{fault.proComparison}</Text>
        </View>
      ) : null}
    </View>
  );
}

// ─── DrillCard ───────────────────────────────────────────────────────────────

interface DrillCardProps {
  drill: Drill;
  index: number;
}

export function DrillCard({ drill, index }: DrillCardProps) {
  return (
    <View style={styles.drillCard}>
      <View style={styles.drillHeader}>
        <View style={styles.drillBadge}>
          <Text style={styles.drillBadgeText}>{index + 1}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.drillName}>{drill.name}</Text>
          <Text style={styles.drillFault}>{drill.targetFault}</Text>
        </View>
        <View style={{ alignItems: 'flex-end' }}>
          <Text style={styles.drillMeta}>{drill.duration}</Text>
          {drill.reps ? <Text style={styles.drillMeta}>{drill.reps} reps</Text> : null}
        </View>
      </View>
      <Text style={styles.drillDesc}>{drill.description}</Text>
      <View style={{ marginTop: 8 }}>
        {drill.cues.map((cue, i) => (
          <View key={i} style={styles.cueRow}>
            <View style={styles.cueDot} />
            <Text style={styles.cueText}>{cue}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

// ─── ProComparisonCard ───────────────────────────────────────────────────────

interface ProComparisonCardProps {
  comparison: ProComparison;
}

export function ProComparisonCard({ comparison }: ProComparisonCardProps) {
  const initial = comparison.referencePro.charAt(0).toUpperCase();
  return (
    <View style={styles.proCard}>
      <View style={styles.proCardHeader}>
        <View style={styles.proAvatar}>
          <Text style={styles.proAvatarText}>{initial}</Text>
        </View>
        <View style={{ flex: 1, marginLeft: 12 }}>
          <Text style={styles.proName}>{comparison.referencePro}</Text>
          <Text style={styles.proSubtitle}>Most similar pro style</Text>
        </View>
        <Text style={[styles.proSimilarity, { color: scoreColor(comparison.overallSimilarity) }]}>
          {comparison.overallSimilarity}%
        </Text>
      </View>

      {comparison.strengths.length > 0 && (
        <View style={{ marginTop: 12 }}>
          <Text style={styles.proSectionLabel}>Strengths</Text>
          {comparison.strengths.map((s, i) => (
            <View key={i} style={styles.cueRow}>
              <View style={[styles.cueDot, { backgroundColor: '#47ffb8' }]} />
              <Text style={styles.cueText}>{s}</Text>
            </View>
          ))}
        </View>
      )}

      {comparison.gaps.length > 0 && (
        <View style={{ marginTop: 8 }}>
          <Text style={styles.proSectionLabel}>Areas to Close</Text>
          {comparison.gaps.map((g, i) => (
            <View key={i} style={styles.cueRow}>
              <View style={[styles.cueDot, { backgroundColor: '#ff9047' }]} />
              <Text style={styles.cueText}>{g}</Text>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  ringLabel: {
    marginTop: 4,
    letterSpacing: 0.5,
    textAlign: 'center',
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 3,
    alignSelf: 'flex-start',
  },
  pillDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 5,
  },
  pillText: {
    fontSize: 11,
    fontWeight: '600',
  },
  faultCard: {
    backgroundColor: '#111118',
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
  },
  faultHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  severityBadge: {
    borderRadius: 6,
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  severityText: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  faultName: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 4,
  },
  faultDesc: {
    color: '#888',
    fontSize: 13,
    lineHeight: 18,
  },
  proBox: {
    marginTop: 10,
    backgroundColor: '#0a0a0f',
    borderRadius: 8,
    padding: 10,
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  proLabel: {
    color: '#e8ff47',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1,
    marginRight: 8,
    marginTop: 1,
  },
  proText: {
    color: '#888',
    fontSize: 12,
    flex: 1,
    lineHeight: 17,
  },
  drillCard: {
    backgroundColor: '#111118',
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
  },
  drillHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  drillBadge: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#e8ff47',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  drillBadgeText: {
    color: '#0a0a0f',
    fontWeight: '800',
    fontSize: 13,
  },
  drillName: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },
  drillFault: {
    color: '#888',
    fontSize: 11,
    marginTop: 1,
  },
  drillMeta: {
    color: '#e8ff47',
    fontSize: 12,
    fontWeight: '600',
  },
  drillDesc: {
    color: '#888',
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 4,
  },
  cueRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginTop: 4,
  },
  cueDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: '#e8ff47',
    marginTop: 6,
    marginRight: 8,
  },
  cueText: {
    color: '#aaa',
    fontSize: 12,
    flex: 1,
    lineHeight: 17,
  },
  proCard: {
    backgroundColor: '#111118',
    borderRadius: 12,
    padding: 16,
  },
  proCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  proAvatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    borderWidth: 2,
    borderColor: '#e8ff47',
    backgroundColor: '#1e1e2e',
    justifyContent: 'center',
    alignItems: 'center',
  },
  proAvatarText: {
    color: '#e8ff47',
    fontSize: 22,
    fontWeight: '800',
  },
  proName: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  proSubtitle: {
    color: '#888',
    fontSize: 12,
    marginTop: 2,
  },
  proSimilarity: {
    fontSize: 28,
    fontWeight: '800',
  },
  proSectionLabel: {
    color: '#555',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1,
    marginBottom: 4,
    textTransform: 'uppercase',
  },
});
