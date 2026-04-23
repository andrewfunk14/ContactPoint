import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  TextInput,
  Modal,
  StyleSheet,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../lib/supabase';
import { Student } from '../../lib/types';

const LEVELS: Student['level'][] = ['beginner', 'intermediate', 'advanced', 'elite'];
const LEVEL_COLORS: Record<Student['level'], string> = {
  beginner: '#555',
  intermediate: '#ff9047',
  advanced: '#47b8ff',
  elite: '#e8ff47',
};

export default function StudentsScreen() {
  const router = useRouter();
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [name, setName] = useState('');
  const [level, setLevel] = useState<Student['level']>('intermediate');
  const [hand, setHand] = useState<'right' | 'left'>('right');
  const [saving, setSaving] = useState(false);

  const fetchStudents = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase.from('students').select('*').order('name');
    setStudents((data as Student[]) ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { fetchStudents(); }, [fetchStudents]);

  async function saveStudent() {
    if (!name.trim()) { Alert.alert('Error', 'Please enter a name.'); return; }
    setSaving(true);
    const { data: { user } } = await supabase.auth.getUser();
    const { error } = await supabase.from('students').insert({
      coach_id: user?.id,
      name: name.trim(),
      level,
      dominant_hand: hand,
    });
    setSaving(false);
    if (error) { Alert.alert('Error', error.message); return; }
    setModalVisible(false);
    setName('');
    setLevel('intermediate');
    setHand('right');
    fetchStudents();
  }

  return (
    <View style={styles.container}>
      {/* Nav */}
      <View style={styles.navbar}>
        <TouchableOpacity onPress={() => router.back()} style={styles.navBtn}>
          <Ionicons name="chevron-back" size={22} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.navTitle}>Students</Text>
        <View style={{ width: 40 }} />
      </View>

      {loading ? (
        <ActivityIndicator color="#e8ff47" style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={students}
          keyExtractor={(s) => s.id}
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 100 }}
          ListEmptyComponent={
            <Text style={styles.emptyText}>No students yet. Add your first student!</Text>
          }
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.row}
              onPress={() => router.push(`/students/${item.id}`)}
            >
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>{item.name.charAt(0).toUpperCase()}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.rowName}>{item.name}</Text>
                <View style={{ flexDirection: 'row', gap: 8, marginTop: 3 }}>
                  <View style={[styles.levelBadge, { backgroundColor: LEVEL_COLORS[item.level] + '20' }]}>
                    <Text style={[styles.levelText, { color: LEVEL_COLORS[item.level] }]}>
                      {item.level}
                    </Text>
                  </View>
                  <Text style={styles.handText}>{item.dominantHand === 'right' ? 'RH' : 'LH'}</Text>
                </View>
              </View>
              <Ionicons name="chevron-forward" size={18} color="#555" />
            </TouchableOpacity>
          )}
        />
      )}

      {/* FAB */}
      <TouchableOpacity style={styles.fab} onPress={() => setModalVisible(true)}>
        <Ionicons name="add" size={28} color="#0a0a0f" />
      </TouchableOpacity>

      {/* Add student modal */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Add Student</Text>

            <TextInput
              style={styles.input}
              placeholder="Full name"
              placeholderTextColor="#555"
              value={name}
              onChangeText={setName}
            />

            <Text style={styles.fieldLabel}>Level</Text>
            <View style={styles.pillRow}>
              {LEVELS.map((l) => (
                <TouchableOpacity
                  key={l}
                  style={[styles.pill, level === l && { borderColor: LEVEL_COLORS[l] }]}
                  onPress={() => setLevel(l)}
                >
                  <Text style={[styles.pillText, level === l && { color: LEVEL_COLORS[l] }]}>{l}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.fieldLabel}>Dominant Hand</Text>
            <View style={styles.pillRow}>
              {(['right', 'left'] as const).map((h) => (
                <TouchableOpacity
                  key={h}
                  style={[styles.pill, { flex: 1 }, hand === h && { borderColor: '#e8ff47' }]}
                  onPress={() => setHand(h)}
                >
                  <Text style={[styles.pillText, hand === h && { color: '#e8ff47' }]}>
                    {h === 'right' ? 'Right Hand' : 'Left Hand'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={{ flexDirection: 'row', gap: 10, marginTop: 20 }}>
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={() => setModalVisible(false)}
              >
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.saveBtn, { flex: 1 }]}
                onPress={saveStudent}
                disabled={saving}
              >
                <Text style={styles.saveBtnText}>{saving ? 'Saving...' : 'Save'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#111118',
    borderRadius: 12,
    padding: 14,
    marginBottom: 8,
    gap: 12,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 2,
    borderColor: '#e8ff47',
    backgroundColor: '#1e1e2e',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: { color: '#e8ff47', fontSize: 18, fontWeight: '800' },
  rowName: { color: '#fff', fontSize: 15, fontWeight: '600' },
  levelBadge: { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 2 },
  levelText: { fontSize: 11, fontWeight: '700' },
  handText: { color: '#555', fontSize: 12, alignSelf: 'center' },
  fab: {
    position: 'absolute',
    bottom: 32,
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#e8ff47',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#e8ff47',
    shadowOpacity: 0.4,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    backgroundColor: '#111118',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 24,
    paddingBottom: 40,
  },
  modalTitle: { color: '#fff', fontSize: 18, fontWeight: '800', marginBottom: 20 },
  input: {
    backgroundColor: '#0a0a0f',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#1e1e2e',
    color: '#fff',
    fontSize: 15,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 16,
  },
  fieldLabel: { color: '#555', fontSize: 11, fontWeight: '700', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 8 },
  pillRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap', marginBottom: 16 },
  pill: {
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: '#333',
    backgroundColor: '#0a0a0f',
  },
  pillText: { color: '#888', fontSize: 13, fontWeight: '600' },
  cancelBtn: {
    borderRadius: 10,
    paddingVertical: 13,
    paddingHorizontal: 20,
    borderWidth: 1,
    borderColor: '#333',
    alignItems: 'center',
  },
  cancelBtnText: { color: '#888', fontSize: 14, fontWeight: '600' },
  saveBtn: {
    backgroundColor: '#e8ff47',
    borderRadius: 10,
    paddingVertical: 13,
    alignItems: 'center',
  },
  saveBtnText: { color: '#0a0a0f', fontSize: 14, fontWeight: '800' },
  emptyText: { color: '#555', textAlign: 'center', marginTop: 40, fontSize: 14 },
});
