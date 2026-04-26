import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { supabase, getVideoUrl } from '../../lib/supabase';
import { ServeAnalysis, TechniqueScore, ServePhaseRange, PoseFrame, TechniqueFault, Drill, ProComparison } from '../../lib/types';
import { ScoreRing, FaultCard, DrillCard, ProComparisonCard } from '../../components/index';
import SkeletonScrubber from '../../components/SkeletonScrubber';

type TabType = 'technique' | 'drills' | 'pro';

interface AnalysisDB {
  id: string;
  student_id: string | null;
  created_at: string;
  video_url: string;
  thumbnail_url: string | null;
  score_overall: number;
  score_stance: number;
  score_trophy: number;
  score_loading: number;
  score_contact: number;
  score_follow_through: number;
  analysis_json: {
    faults: TechniqueFault[];
    drills: Drill[];
    proComparison: ProComparison;
    summary: string;
  };
  pose_frames_json: PoseFrame[];
  detected_phases_json: ServePhaseRange[];
  coach_notes: string | null;
  students: { name: string } | null;
}

export default function ResultsScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [data, setData] = useState<AnalysisDB | null>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabType>('technique');
  const [coachNotes, setCoachNotes] = useState('');
  const [noteSaved, setNoteSaved] = useState(false);
  const [savingNote, setSavingNote] = useState(false);

  useEffect(() => {
    if (!id) return;
    supabase
      .from('serve_analyses')
      .select('*, students(name)')
      .eq('id', id)
      .single()
      .then(async ({ data: row, error }) => {
        if (error || !row) { setLoading(false); return; }
        setData(row as AnalysisDB);
        setCoachNotes(row.coach_notes ?? '');
        if (row.video_url) {
          try {
            const signed = await getVideoUrl(row.video_url);
            setVideoUrl(signed);
          } catch { /* video unavailable */ }
        }
        setLoading(false);
      });
  }, [id]);

  async function saveNotes() {
    if (!id) return;
    setSavingNote(true);
    const { error } = await supabase
      .from('serve_analyses')
      .update({ coach_notes: coachNotes })
      .eq('id', id);
    setSavingNote(false);
    if (error) { Alert.alert('Error', 'Failed to save notes.'); return; }
    setNoteSaved(true);
    setTimeout(() => setNoteSaved(false), 3000);
  }

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: '#0a0a0f', justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator color="#e8ff47" size="large" />
      </View>
    );
  }

  if (!data) {
    return (
      <View style={{ flex: 1, backgroundColor: '#0a0a0f', justifyContent: 'center', alignItems: 'center' }}>
        <Text style={{ color: '#888' }}>Analysis not found.</Text>
      </View>
    );
  }

  const scores: TechniqueScore = {
    overall: data.score_overall,
    stance: data.score_stance,
    trophy: data.score_trophy,
    loading: data.score_loading,
    contact: data.score_contact,
    followThrough: data.score_follow_through,
  };

  const studentName = data.students?.name;
  const date = new Date(data.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  const faults = data.analysis_json?.faults ?? [];
  const drills = data.analysis_json?.drills ?? [];
  const proComparison = data.analysis_json?.proComparison;
  const summary = data.analysis_json?.summary ?? '';
  const poseFrames = data.pose_frames_json ?? [];
  const phases = data.detected_phases_json ?? [];

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 48 }}>
      {/* Nav bar */}
      <View style={styles.navbar}>
        <TouchableOpacity onPress={() => router.back()} style={styles.navBtn}>
          <Ionicons name="chevron-back" size={22} color="#fff" />
        </TouchableOpacity>
        <View style={{ alignItems: 'center' }}>
          <Text style={styles.navTitle}>{studentName ?? 'Quick Session'}</Text>
          <Text style={styles.navDate}>{date}</Text>
        </View>
        <TouchableOpacity onPress={() => router.push('/history')} style={styles.navBtn}>
          <Ionicons name="time-outline" size={22} color="#888" />
        </TouchableOpacity>
      </View>

      {/* Skeleton scrubber */}
      {poseFrames.length > 0 && (
        <SkeletonScrubber
          poseFrames={poseFrames}
          phases={phases}
          videoUri={videoUrl ?? ''}
        />
      )}

      {/* Score grid */}
      <View style={styles.scoreGrid}>
        <ScoreRing score={scores.overall} size={90} label="Overall" />
        <View style={styles.smallScores}>
          {([
            ['stance', scores.stance],
            ['trophy', scores.trophy],
            ['loading', scores.loading],
            ['contact', scores.contact],
            ['follow', scores.followThrough],
          ] as [string, number][]).map(([label, score]) => (
            <ScoreRing key={label} score={score} size={58} label={label} small />
          ))}
        </View>
      </View>

      {/* Summary */}
      {summary ? (
        <View style={styles.summaryCard}>
          <Text style={styles.summaryText}>{summary}</Text>
        </View>
      ) : null}

      {/* Tab bar */}
      <View style={styles.tabBar}>
        {(['technique', 'drills', 'pro'] as TabType[]).map((tab) => (
          <TouchableOpacity
            key={tab}
            style={[styles.tab, activeTab === tab && styles.tabActive]}
            onPress={() => setActiveTab(tab)}
          >
            <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>
              {tab === 'technique' ? 'Technique' : tab === 'drills' ? 'Drills' : 'Pro Compare'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Tab content */}
      <View style={{ paddingHorizontal: 16, marginTop: 12 }}>
        {activeTab === 'technique' && (
          faults.length > 0
            ? faults.map((f, i) => <FaultCard key={i} fault={f} />)
            : <Text style={styles.emptyText}>No faults detected. Excellent technique!</Text>
        )}
        {activeTab === 'drills' && (
          drills.length > 0
            ? drills.map((d, i) => <DrillCard key={d.id} drill={d} index={i} />)
            : <Text style={styles.emptyText}>No drills assigned.</Text>
        )}
        {activeTab === 'pro' && proComparison && (
          <ProComparisonCard comparison={proComparison} />
        )}
      </View>

      {/* Coach notes */}
      <View style={styles.notesSection}>
        <Text style={styles.notesLabel}>Coach Notes</Text>
        <TextInput
          style={styles.notesInput}
          value={coachNotes}
          onChangeText={setCoachNotes}
          placeholder="Add coaching notes..."
          placeholderTextColor="#555"
          multiline
          numberOfLines={4}
          textAlignVertical="top"
        />
        <View style={styles.notesFooter}>
          <TouchableOpacity
            style={styles.saveBtn}
            onPress={saveNotes}
            disabled={savingNote}
          >
            <Text style={styles.saveBtnText}>{savingNote ? 'Saving...' : 'Save Notes'}</Text>
          </TouchableOpacity>
          {noteSaved && <Text style={styles.savedBadge}>Saved ✓</Text>}
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0a0a0f' },
  navbar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 56,
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  navBtn: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },
  navTitle: { color: '#fff', fontSize: 15, fontWeight: '700' },
  navDate: { color: '#555', fontSize: 12, marginTop: 1 },
  scoreGrid: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 20,
    gap: 20,
  },
  smallScores: {
    flex: 1,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    justifyContent: 'center',
  },
  summaryCard: {
    marginHorizontal: 16,
    backgroundColor: '#111118',
    borderLeftWidth: 3,
    borderLeftColor: '#e8ff47',
    borderRadius: 10,
    padding: 14,
    marginBottom: 16,
  },
  summaryText: { color: '#bbb', fontSize: 13, lineHeight: 20 },
  tabBar: {
    flexDirection: 'row',
    marginHorizontal: 16,
    backgroundColor: '#111118',
    borderRadius: 10,
    padding: 3,
  },
  tab: { flex: 1, paddingVertical: 9, alignItems: 'center', borderRadius: 8 },
  tabActive: { backgroundColor: '#1e1e2e' },
  tabText: { color: '#555', fontSize: 13, fontWeight: '600' },
  tabTextActive: { color: '#fff' },
  emptyText: { color: '#555', textAlign: 'center', marginTop: 20, fontSize: 14 },
  notesSection: { padding: 16, marginTop: 16 },
  notesLabel: {
    color: '#555',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    marginBottom: 10,
  },
  notesInput: {
    backgroundColor: '#111118',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#1e1e2e',
    color: '#fff',
    fontSize: 14,
    padding: 12,
    minHeight: 100,
  },
  notesFooter: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 10 },
  saveBtn: {
    backgroundColor: '#e8ff47',
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 20,
  },
  saveBtnText: { color: '#0a0a0f', fontSize: 13, fontWeight: '800' },
  savedBadge: { color: '#47ffb8', fontSize: 13, fontWeight: '700' },
});
