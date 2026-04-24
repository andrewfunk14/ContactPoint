import { ExpoConfig, ConfigContext } from 'expo/config';

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: 'ContactPoint',
  slug: 'contactpoint',
  version: '1.0.0',
  platforms: ['ios', 'android'],
  orientation: 'portrait',
  icon: './assets/icon.png',
  userInterfaceStyle: 'dark',
  splash: {
    image: './assets/splash-icon.png',
    resizeMode: 'contain',
    backgroundColor: '#0a0a0f',
  },
  ios: {
    supportsTablet: false,
    bundleIdentifier: 'com.contactpoint.app',
    infoPlist: {
      NSCameraUsageDescription: 'ContactPoint needs camera access to record tennis serves for analysis.',
      NSMicrophoneUsageDescription: 'ContactPoint needs microphone access when recording serve videos.',
      NSPhotoLibraryUsageDescription: 'ContactPoint needs photo library access to select existing serve videos.',
    },
  },
  android: {
    package: 'com.contactpoint.app',
    adaptiveIcon: {
      foregroundImage: './assets/adaptive-icon.png',
      backgroundColor: '#0a0a0f',
    },
    permissions: ['CAMERA', 'RECORD_AUDIO', 'READ_EXTERNAL_STORAGE'],
  },
  plugins: [
    'expo-router',
    'expo-camera',
    'expo-font',
    'expo-video',
  ],
  scheme: 'contactpoint',
  extra: {
    supabaseUrl: process.env.EXPO_PUBLIC_SUPABASE_URL,
    supabaseAnonKey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY,
    eas: {
      projectId: process.env.EAS_PROJECT_ID ?? (config as any)?.extra?.eas?.projectId,
    },
  },
});
