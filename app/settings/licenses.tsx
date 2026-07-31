import React from 'react';
import { StyleSheet, View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../src/context/ThemeContext';

// 직접 의존하는 오픈소스 패키지 목록 (package.json 기준, MIT 라이선스)
const LIBRARIES: { name: string; version: string; license: string }[] = [
  { name: '@expo/vector-icons', version: '15.1.1', license: 'MIT' },
  { name: '@react-native-async-storage/async-storage', version: '2.2.0', license: 'MIT' },
  { name: '@react-navigation/bottom-tabs', version: '7.17.0', license: 'MIT' },
  { name: '@react-navigation/elements', version: '2.9.20', license: 'MIT' },
  { name: '@react-navigation/native', version: '7.2.6', license: 'MIT' },
  { name: '@tanstack/react-query', version: '5.101.0', license: 'MIT' },
  { name: 'axios', version: '1.17.0', license: 'MIT' },
  { name: 'expo', version: '54.0.35', license: 'MIT' },
  { name: 'expo-camera', version: '17.0.10', license: 'MIT' },
  { name: 'expo-clipboard', version: '8.0.8', license: 'MIT' },
  { name: 'expo-constants', version: '18.0.13', license: 'MIT' },
  { name: 'expo-font', version: '14.0.12', license: 'MIT' },
  { name: 'expo-haptics', version: '15.0.8', license: 'MIT' },
  { name: 'expo-image', version: '3.0.11', license: 'MIT' },
  { name: 'expo-keep-awake', version: '15.0.8', license: 'MIT' },
  { name: 'expo-linking', version: '8.0.12', license: 'MIT' },
  { name: 'expo-location', version: '19.0.8', license: 'MIT' },
  { name: 'expo-notifications', version: '0.32.17', license: 'MIT' },
  { name: 'expo-router', version: '6.0.24', license: 'MIT' },
  { name: 'expo-secure-store', version: '15.0.8', license: 'MIT' },
  { name: 'expo-splash-screen', version: '31.0.13', license: 'MIT' },
  { name: 'expo-status-bar', version: '3.0.9', license: 'MIT' },
  { name: 'expo-symbols', version: '1.0.8', license: 'MIT' },
  { name: 'expo-system-ui', version: '6.0.9', license: 'MIT' },
  { name: 'expo-web-browser', version: '15.0.11', license: 'MIT' },
  { name: 'react', version: '19.1.0', license: 'MIT' },
  { name: 'react-dom', version: '19.1.0', license: 'MIT' },
  { name: 'react-native', version: '0.81.5', license: 'MIT' },
  { name: 'react-native-gesture-handler', version: '2.28.0', license: 'MIT' },
  { name: 'react-native-qrcode-svg', version: '6.3.21', license: 'MIT' },
  { name: 'react-native-reanimated', version: '4.1.7', license: 'MIT' },
  { name: 'react-native-safe-area-context', version: '5.6.2', license: 'MIT' },
  { name: 'react-native-screens', version: '4.16.0', license: 'MIT' },
  { name: 'react-native-svg', version: '15.12.1', license: 'MIT' },
  { name: 'react-native-web', version: '0.21.2', license: 'MIT' },
  { name: 'react-native-webview', version: '13.15.0', license: 'MIT' },
  { name: 'react-native-worklets', version: '0.5.1', license: 'MIT' },
  { name: 'react-native-youtube-iframe', version: '2.4.1', license: 'MIT' },
];

export default function LicensesScreen() {
  const router = useRouter();
  const { isDark } = useTheme();

  const backgroundColor = isDark ? '#101012' : '#F3F4F6';
  const cardColor = isDark ? '#1C1C1E' : '#FFFFFF';
  const borderColor = isDark ? 'rgba(255, 255, 255, 0.04)' : 'rgba(0, 0, 0, 0.03)';
  const titleColor = isDark ? '#F5F5F5' : '#1F2937';
  const descColor = isDark ? '#A3A3A3' : '#6B7280';

  return (
    <SafeAreaView style={[styles.container, { backgroundColor }]} edges={['top', 'left', 'right', 'bottom']}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()} activeOpacity={0.7}>
          <Ionicons name="chevron-back" size={24} color={titleColor} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: titleColor }]}>오픈소스 라이선스</Text>
        <View style={styles.headerRightSpacer} />
      </View>

      <ScrollView contentContainerStyle={styles.contentContainer} showsVerticalScrollIndicator={false}>
        <Text style={[styles.lead, { color: descColor }]}>
          냉장고집사는 아래의 오픈소스 라이브러리를 사용해 만들어졌습니다. 각 라이브러리는 해당 라이선스의 조건에 따라 이용됩니다.
        </Text>

        {LIBRARIES.map(lib => (
          <View key={lib.name} style={[styles.card, { backgroundColor: cardColor, borderColor }]}>
            <Text style={[styles.libName, { color: titleColor }]}>{lib.name}</Text>
            <View style={styles.libMetaRow}>
              <Text style={[styles.libMeta, { color: descColor }]}>v{lib.version}</Text>
              <View style={[styles.licenseBadge, { backgroundColor: isDark ? '#2A2A2D' : '#F3F4F6' }]}>
                <Text style={[styles.licenseBadgeText, { color: descColor }]}>{lib.license}</Text>
              </View>
            </View>
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: 56,
    paddingHorizontal: 8,
  },
  backButton: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  headerRightSpacer: {
    width: 44,
  },
  contentContainer: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 40,
    gap: 10,
  },
  lead: {
    fontSize: 12.5,
    lineHeight: 18,
    marginBottom: 6,
  },
  card: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
  },
  libName: {
    fontSize: 14,
    fontWeight: '700',
  },
  libMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 6,
  },
  libMeta: {
    fontSize: 12,
    fontWeight: '500',
  },
  licenseBadge: {
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  licenseBadgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
});
