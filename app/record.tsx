import React, { useRef, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { CameraView, CameraType, useCameraPermissions, useMicrophonePermissions } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../lib/supabase';

export default function RecordScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    studentId?: string;
    studentName?: string;
    dominantHand?: string;
    level?: string;
  }>();

  const [cameraPermission, requestCameraPermission] = useCameraPermissions();
  const [micPermission, requestMicPermission] = useMicrophonePermissions();
  const [facing, setFacing] = useState<CameraType>('back');
  const [recording, setRecording] = useState(false);
  const cameraRef = useRef<CameraView>(null);

  const dominantHand = (params.dominantHand as 'right' | 'left') ?? 'right';
  const level = (params.level as 'beginner' | 'intermediate' | 'advanced' | 'elite') ?? 'intermediate';

  async function ensurePermissions(): Promise<boolean> {
    if (!cameraPermission?.granted) {
      const { granted } = await requestCameraPermission();
      if (!granted) return false;
    }
    if (!micPermission?.granted) {
      const { granted } = await requestMicPermission();
      if (!granted) return false;
    }
    return true;
  }

  async function handleRecordToggle() {
    if (!(await ensurePermissions())) {
      Alert.alert('Permission required', 'Camera and microphone access are needed.');
      return;
    }

    if (recording) {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      setRecording(false);
      cameraRef.current?.stopRecording();
    } else {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
      setRecording(true);
      cameraRef.current?.recordAsync({ maxDuration: 30 }).then(async (result) => {
        setRecording(false);
        if (result?.uri) {
          await navigateToProcessing(result.uri);
        }
      }).catch(() => setRecording(false));
    }
  }

  async function handlePickVideo() {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission required', 'Photo library access is needed to select videos.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['videos'],
      quality: 1,
    });
    if (!result.canceled && result.assets[0]) {
      await navigateToProcessing(result.assets[0].uri);
    }
  }

  async function navigateToProcessing(videoUri: string) {
    router.push({
      pathname: '/processing',
      params: {
        videoUri,
        studentId: params.studentId ?? '',
        dominantHand,
        level,
        studentName: params.studentName ?? '',
      },
    });
  }

  if (!cameraPermission) {
    return <View style={styles.container} />;
  }

  return (
    <View style={styles.container}>
      <CameraView
        ref={cameraRef}
        style={StyleSheet.absoluteFill}
        facing={facing}
        mode="video"
      />

      {/* Top bar */}
      <View style={styles.topBar}>
        <TouchableOpacity onPress={() => router.back()} style={styles.iconBtn}>
          <Ionicons name="close" size={24} color="#fff" />
        </TouchableOpacity>

        <View style={styles.studentBadge}>
          <View style={styles.badgeDot} />
          <Text style={styles.badgeText}>
            {params.studentName ? params.studentName.toUpperCase() : 'QUICK RECORD'}
          </Text>
        </View>

        <TouchableOpacity
          onPress={() => setFacing((f) => (f === 'back' ? 'front' : 'back'))}
          style={styles.iconBtn}
        >
          <Ionicons name="camera-reverse-outline" size={24} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* Guidance */}
      <View style={styles.guidance}>
        <Text style={styles.guidanceText}>
          {dominantHand === 'right' ? 'Right-handed serve →' : '← Left-handed serve'}
        </Text>
        <Text style={styles.guidanceSub}>Film from the side at shoulder height</Text>
      </View>

      {/* Recording indicator */}
      {recording && (
        <View style={styles.recIndicator}>
          <View style={styles.recDot} />
          <Text style={styles.recText}>REC</Text>
        </View>
      )}

      {/* Bottom controls */}
      <View style={styles.bottomBar}>
        <TouchableOpacity onPress={handlePickVideo} style={styles.iconBtn}>
          <Ionicons name="images-outline" size={26} color="#fff" />
        </TouchableOpacity>

        <TouchableOpacity onPress={handleRecordToggle} style={[styles.recordBtn, recording && styles.recordBtnActive]}>
          <View style={recording ? styles.stopIcon : styles.recordIcon} />
        </TouchableOpacity>

        <View style={{ width: 44 }} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  topBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    paddingTop: 56,
    paddingHorizontal: 20,
    paddingBottom: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  iconBtn: { width: 44, height: 44, justifyContent: 'center', alignItems: 'center' },
  studentBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(232,255,71,0.15)',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: '#e8ff4760',
  },
  badgeDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#e8ff47', marginRight: 6 },
  badgeText: { color: '#e8ff47', fontSize: 12, fontWeight: '700', letterSpacing: 1 },
  guidance: {
    position: 'absolute',
    top: '40%',
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  guidanceText: { color: 'rgba(255,255,255,0.7)', fontSize: 16, fontWeight: '600' },
  guidanceSub: { color: 'rgba(255,255,255,0.4)', fontSize: 12, marginTop: 4 },
  recIndicator: {
    position: 'absolute',
    top: 130,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  recDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#ff453a' },
  recText: { color: '#ff453a', fontSize: 13, fontWeight: '700', letterSpacing: 1.5 },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingBottom: 44,
    paddingTop: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  recordBtn: {
    width: 72,
    height: 72,
    borderRadius: 36,
    borderWidth: 3,
    borderColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  recordBtnActive: { borderColor: '#ff453a' },
  recordIcon: { width: 52, height: 52, borderRadius: 26, backgroundColor: '#ff453a' },
  stopIcon: { width: 28, height: 28, borderRadius: 4, backgroundColor: '#ff453a' },
});
