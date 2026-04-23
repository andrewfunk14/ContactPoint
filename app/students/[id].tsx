import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  FlatList,
  TouchableOpacity,
  Image,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../lib/supabase';
import { Student } from '../../lib/types';
import { ScoreRing } from '../components/index';

const LEVEL_COLORS: Record<Student['level'], string> = {
  beginner: '#555',
  intermediate: '#ff9047',
  advanced: '#47b8ff',
  elite: '#e8ff47',
};

interface AnalysisRow {
  id: string;
  thumbnail_url: string | null;
  score_overall: number | null;
  created_at: string;
  analysis_json: { summary?: string } | null;
}

export default function StudentDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [student, setStudent] = useState<Student | null>(null);
  const [analyses, setAnalyses] = useState<AnalysisRow[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    const [studentRes, analysesRes] = await Promise.all([
      supabase.from('students').select('*').eq('id', id).single(),
      supabase
        .from('serve_analyses')
        .select('id, thumbnail_url, score_overall, created_at, analysis_json')
        .eq('sessions.student_id', id)
        .order('created_at', { ascending: false }),
    ]);
    if (studentRes.data) setStudent(studentRes.data as Student);
    setAnalyses((analysesRes.data as AnalysisRow[]) ?? []);
    setLoading(false);
  }, [id]);

  useEffect(() => { fetchData(); }, [fetchData]);

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: '#0a0a0f', justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator color="#e8ff47" size="large" />
      </View>
    );
  }

  if (!student) {
    return (
      <View style={{ flex: 1, backgroundColor: '#0a0a0f', justifyContent: 'center', alignItems: 'center' }}>
        <Text style={{ color: '#888' }}>Student not found.</Text>
      </View>
    );
  }

  const scores = analyses.map((a) => a.score_overall).filter((s): s is number => s !== null);
  const avgScore = scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0;
  const trend = scores.length >= 2 ? scores[scores.length - 1] - scores[0] : 0;
  const trendColor = trend >= 0 ? '#47ffb8' : '#ff453a';

  function formatDate(iso: string): string {
    return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  }

  function scoreColor(score: number | null): string {
    if (!score) return '#555';
    if (score >= 80) return '#e8ff47';
    if (score >= 60) return '#ff9047';
    return '#ff453a';
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 48 }}>
      {/* Nav */}
      <View style={styles.navbar}>
        <TouchableOpacity onPress={() => router.back()} style={styles.navBtn}>
          <Ionicons name="chevron-back" size={22} color="#fff" />
        </TouchableOpacity>
        <View style={{ width: 40 }} />
      </View>

      {/* Header */}
      <View style={styles.header}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{student.name.charAt(0).toUpperCase()}</Text>
        </View>
        <Text style={styles.name}>{student.name}</Text>
        <View style={[styles.levelBadge, { backgroundColor: LEVEL_COLORS[student.level] + '20' }]}>
          <Text style={[styles.levelText, { color: LEVEL_COLORS[student.level] }]}>{student.level}</Text>
        </View>
        <Text style={styles.handText}>{student.dominantHand === 'right' ? 'Right-handed' : 'Left-handed'}</Text>
      </View>

      {/* Stats row */}
      <View style={styles.statsRow}>
        {avgScore > 0 && <ScoreRing score={avgScore} size={72} label="Avg Score" />}
        <View style={styles.statBox}>
          <Text style={styles.statValue}>{analyses.length}</Text>
          <Text style={styles.statLabel}>Sessions</Text>
        </View>
        {scores.length >= 2 && (
          <View style={styles.statBox}>
            <Text style={[styles.statValue, { color: trendColor }]}>
              {trend >= 0 ? '+' : ''}{trend}
            </Text>
            <Text style={styles.statLabel}>Trend</Text>
          </View>
        )}
      </View>

      {/* Record button */}
      <TouchableOpacity
        style={{ marginHorizontal: 16, marginBottom: 24 }}
        onPress={() =>
          router.push({
            pathname: '/record',
            params: {
              studentId: student.id,
              studentName: student.name,
              dominantHand: student.dominantHand,
              level: student.level,
            },
          })
        }
        activeOpacity={0.85}
      >
        <LinearGradient
          colors={['#e8ff47', '#b8cc20']}
          style={styles.recordBtn}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
        >
          <Ionicons name="videocam" size={18} color="#0a0a0f" />
          <Text style={styles.recordBtnText}>Record New Serve</Text>
        </LinearGradient>
      </TouchableOpacity>

      {/* Analysis history */}
      <Text style={styles.sectionLabel}>Analysis History</Text>
      {analyses.map((item) => (
        <TouchableOpacity
          key={item.id}
          style={styles.row}
          onPress={() => router.push(`/results/${item.id}`)}
        >
          {item.thumbnail_url ? (
            <Image source={{ uri: item.thumbnail_url }} style={styles.thumbnail} />
          ) : (
            <View style={[styles.thumbnail, { backgroundColor: '#1e1e2e', justifyContent: 'center', alignItems: 'center' }]}>
              <Ionicons name="videocam-off-outline" size={18} color="#555" />
            </View>
          )}
          <View style={{ flex: 1 }}>
            <Text style={styles.rowDate}>{formatDate(item.created_at)}</Text>
            {item.analysis_json?.summary ? (
              <Text style={styles.rowSummary} numberOfLines={2}>{item.analysis_json.summary}</Text>
            ) : null}
          </View>
          {item.score_overall !== null && (
            <Text style={[styles.rowScore, { color: scoreColor(item.score_overall) }]}>
              {item.score_overall}
            </Text>
          )}
        </TouchableOpacity>
      ))}

      {analyses.length === 0 && (
        <Text style={styles.emptyText}>No analyses yet for this student.</Text>
      )}
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
    paddingBottom: 8,
  },
  navBtn: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },
  header: { alignItems: 'center', paddingVertical: 20 },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 3,
    borderColor: '#e8ff47',
    backgroundColor: '#1e1e2e',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  avatarText: { color: '#e8ff47', fontSize: 32, fontWeight: '800' },
  name: { color: '#fff', fontSize: 22, fontWeight: '800', marginBottom: 8 },
  levelBadge: { borderRadius: 8, paddingHorizontal: 12, paddingVertical: 4, marginBottom: 6 },
  levelText: { fontSize: 12, fontWeight: '700', textTransform: 'capitalize' },
  handText: { color: '#555', fontSize: 13 },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 32,
    paddingVertical: 16,
    marginBottom: 8,
  },
  statBox: { alignItems: 'center' },
  statValue: { color: '#fff', fontSize: 24, fontWeight: '800' },
  statLabel: { color: '#555', fontSize: 11, marginTop: 2, textTransform: 'uppercase', letterSpacing: 0.5 },
  recordBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: 14,
    paddingVertical: 14,
  },
  recordBtnText: { color: '#0a0a0f', fontSize: 15, fontWeight: '800' },
  sectionLabel: {
    color: '#555',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    marginHorizontal: 16,
    marginBottom: 10,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#111118',
    borderRadius: 12,
    padding: 12,
    marginHorizontal: 16,
    marginBottom: 8,
    gap: 12,
  },
  thumbnail: { width: 64, height: 48, borderRadius: 8 },
  rowDate: { color: '#fff', fontSize: 13, fontWeight: '600' },
  rowSummary: { color: '#888', fontSize: 12, marginTop: 3, lineHeight: 17 },
  rowScore: { fontSize: 22, fontWeight: '800' },
  emptyText: { color: '#555', textAlign: 'center', marginTop: 20, fontSize: 14 },
});
