import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  Image,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from './context/AuthContext';
import { supabase } from '../lib/supabase';

interface AnalysisRow {
  id: string;
  thumbnail_url: string | null;
  score_overall: number | null;
  created_at: string;
  sessions: {
    students: { name: string } | null;
  } | null;
}

export default function HomeScreen() {
  const router = useRouter();
  const { signOut } = useAuth();
  const [analyses, setAnalyses] = useState<AnalysisRow[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAnalyses = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from('serve_analyses')
      .select('id, thumbnail_url, score_overall, created_at, sessions(students(name))')
      .order('created_at', { ascending: false })
      .limit(15);
    setAnalyses((data as unknown as AnalysisRow[]) ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { fetchAnalyses(); }, [fetchAnalyses]);

  function scoreColor(score: number | null): string {
    if (!score) return '#555';
    if (score >= 80) return '#e8ff47';
    if (score >= 60) return '#ff9047';
    return '#ff453a';
  }

  function formatDate(iso: string): string {
    return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  }

  const studentName = (row: AnalysisRow) => row.sessions?.students?.name ?? 'Quick Session';

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.logoRow}>
          <View style={styles.logoDot} />
          <View>
            <Text style={styles.logoText}>ContactPoint</Text>
            <Text style={styles.logoSub}>Tennis Serve Analysis</Text>
          </View>
        </View>
        <View style={{ flexDirection: 'row', gap: 12 }}>
          <TouchableOpacity onPress={() => router.push('/students')}>
            <Ionicons name="people-outline" size={24} color="#888" />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => signOut()}>
            <Ionicons name="log-out-outline" size={24} color="#888" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Record button */}
      <View style={{ paddingHorizontal: 16, marginBottom: 8 }}>
        <TouchableOpacity onPress={() => router.push('/students')} activeOpacity={0.85}>
          <LinearGradient
            colors={['#e8ff47', '#b8cc20']}
            style={styles.recordButton}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
          >
            <Ionicons name="videocam" size={20} color="#0a0a0f" />
            <Text style={styles.recordButtonText}>Record a Serve</Text>
          </LinearGradient>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => router.push('/record')} style={{ alignSelf: 'center', marginTop: 10 }}>
          <Text style={styles.quickLink}>Quick record (no student)</Text>
        </TouchableOpacity>
      </View>

      {/* Recent analyses */}
      <Text style={styles.sectionLabel}>Recent Analyses</Text>
      {loading ? (
        <ActivityIndicator color="#e8ff47" style={{ marginTop: 20 }} />
      ) : (
        <FlatList
          data={analyses}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 24 }}
          ListEmptyComponent={
            <Text style={styles.emptyText}>No analyses yet. Record your first serve!</Text>
          }
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.row}
              onPress={() => router.push(`/results/${item.id}`)}
            >
              {item.thumbnail_url ? (
                <Image source={{ uri: item.thumbnail_url }} style={styles.thumbnail} />
              ) : (
                <View style={[styles.thumbnail, { backgroundColor: '#1e1e2e', justifyContent: 'center', alignItems: 'center' }]}>
                  <Ionicons name="videocam-off-outline" size={20} color="#555" />
                </View>
              )}
              <View style={{ flex: 1 }}>
                <Text style={styles.rowName}>{studentName(item)}</Text>
                <Text style={styles.rowDate}>{formatDate(item.created_at)}</Text>
              </View>
              {item.score_overall !== null && (
                <Text style={[styles.rowScore, { color: scoreColor(item.score_overall) }]}>
                  {item.score_overall}
                </Text>
              )}
            </TouchableOpacity>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0a0a0f' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 60,
    paddingBottom: 20,
  },
  logoRow: { flexDirection: 'row', alignItems: 'center' },
  logoDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#e8ff47', marginRight: 8 },
  logoText: { color: '#fff', fontSize: 20, fontWeight: '800' },
  logoSub: { color: '#555', fontSize: 11, marginTop: 1 },
  recordButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: 14,
    paddingVertical: 16,
  },
  recordButtonText: { color: '#0a0a0f', fontSize: 16, fontWeight: '800' },
  quickLink: { color: '#888', fontSize: 13 },
  sectionLabel: {
    color: '#555',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    marginHorizontal: 16,
    marginBottom: 10,
    marginTop: 4,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#111118',
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    gap: 12,
  },
  thumbnail: { width: 64, height: 48, borderRadius: 8 },
  rowName: { color: '#fff', fontSize: 14, fontWeight: '600' },
  rowDate: { color: '#555', fontSize: 12, marginTop: 2 },
  rowScore: { fontSize: 22, fontWeight: '800' },
  emptyText: { color: '#555', textAlign: 'center', marginTop: 40, fontSize: 14 },
});
