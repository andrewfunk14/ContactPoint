import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  Image,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../lib/supabase';

interface Student { id: string; name: string }
interface AnalysisRow {
  id: string;
  thumbnail_url: string | null;
  score_overall: number | null;
  created_at: string;
  analysis_json: { faults?: { fault: string }[] } | null;
  sessions: { students: { id: string; name: string } | null } | null;
}

export default function HistoryScreen() {
  const router = useRouter();
  const [analyses, setAnalyses] = useState<AnalysisRow[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    setLoading(true);
    const [analysesRes, studentsRes] = await Promise.all([
      supabase
        .from('serve_analyses')
        .select('id, thumbnail_url, score_overall, created_at, analysis_json, sessions(students(id, name))')
        .order('created_at', { ascending: false }),
      supabase.from('students').select('id, name').order('name'),
    ]);
    setAnalyses((analysesRes.data as unknown as AnalysisRow[]) ?? []);
    setStudents((studentsRes.data as Student[]) ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  function scoreColor(score: number | null): string {
    if (!score) return '#555';
    if (score >= 80) return '#e8ff47';
    if (score >= 60) return '#ff9047';
    return '#ff453a';
  }

  function formatDate(iso: string): string {
    return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  }

  const filtered = selectedStudentId
    ? analyses.filter((a) => a.sessions?.students?.id === selectedStudentId)
    : analyses;

  return (
    <View style={styles.container}>
      {/* Nav */}
      <View style={styles.navbar}>
        <TouchableOpacity onPress={() => router.back()} style={styles.navBtn}>
          <Ionicons name="chevron-back" size={22} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.navTitle}>History</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Student filter */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filterRow}
      >
        <TouchableOpacity
          style={[styles.filterPill, !selectedStudentId && styles.filterPillActive]}
          onPress={() => setSelectedStudentId(null)}
        >
          <Text style={[styles.filterText, !selectedStudentId && styles.filterTextActive]}>All</Text>
        </TouchableOpacity>
        {students.map((s) => {
          const active = selectedStudentId === s.id;
          return (
            <TouchableOpacity
              key={s.id}
              style={[styles.filterPill, active && styles.filterPillActive]}
              onPress={() => setSelectedStudentId(s.id)}
            >
              <Text style={[styles.filterText, active && styles.filterTextActive]}>{s.name}</Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {loading ? (
        <ActivityIndicator color="#e8ff47" style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 32 }}
          ListEmptyComponent={
            <Text style={styles.emptyText}>No analyses found.</Text>
          }
          renderItem={({ item }) => {
            const studentName = item.sessions?.students?.name ?? 'Quick Session';
            const firstFault = item.analysis_json?.faults?.[0]?.fault;
            return (
              <TouchableOpacity
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
                  <Text style={styles.rowName}>{studentName}</Text>
                  <Text style={styles.rowDate}>{formatDate(item.created_at)}</Text>
                  {firstFault ? <Text style={styles.rowFault} numberOfLines={1}>{firstFault}</Text> : null}
                </View>
                {item.score_overall !== null && (
                  <Text style={[styles.rowScore, { color: scoreColor(item.score_overall) }]}>
                    {item.score_overall}
                  </Text>
                )}
              </TouchableOpacity>
            );
          }}
        />
      )}
    </View>
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
  navTitle: { color: '#fff', fontSize: 17, fontWeight: '700' },
  filterRow: { paddingHorizontal: 16, paddingBottom: 12, gap: 8 },
  filterPill: {
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 7,
    backgroundColor: '#111118',
    borderWidth: 1,
    borderColor: '#1e1e2e',
  },
  filterPillActive: { borderColor: '#e8ff47' },
  filterText: { color: '#888', fontSize: 13, fontWeight: '600' },
  filterTextActive: { color: '#e8ff47' },
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
  rowFault: { color: '#888', fontSize: 11, marginTop: 2 },
  rowScore: { fontSize: 22, fontWeight: '800' },
  emptyText: { color: '#555', textAlign: 'center', marginTop: 40, fontSize: 14 },
});
