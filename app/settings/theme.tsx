import React from 'react';
import { StyleSheet, View, Text, TouchableOpacity, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../src/context/ThemeContext';

export default function ThemeSettingScreen() {
  const router = useRouter();
  const { themeMode, setThemeMode, isDark } = useTheme();

  // 2026 Toss-style Color Tokens
  const backgroundColor = isDark ? '#101012' : '#F3F4F6';
  const cardColor = isDark ? '#1C1C1E' : '#FFFFFF';
  const borderColor = isDark ? 'rgba(255, 255, 255, 0.04)' : 'rgba(0, 0, 0, 0.03)';
  const dividerColor = isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.05)';
  const titleColor = isDark ? '#F5F5F5' : '#1F2937';

  const modes = [
    { key: 'light', label: '라이트 모드' },
    { key: 'dark', label: '다크 모드' },
    { key: 'system', label: '시스템 설정' },
  ] as const;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor }]} edges={['top', 'left', 'right', 'bottom']}>
      {/* 헤더 */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()} activeOpacity={0.7}>
          <Ionicons name="chevron-back" size={24} color={titleColor} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: titleColor }]}>화면 테마 설정</Text>
        <View style={styles.headerRightSpacer} />
      </View>

      <ScrollView contentContainerStyle={styles.contentContainer} showsVerticalScrollIndicator={false}>


        {/* 라디오 리스트 카드 */}
        <View style={[styles.card, { backgroundColor: cardColor, borderColor }]}>
          {modes.map((mode, index) => {
            const isSelected = themeMode === mode.key;
            return (
              <React.Fragment key={mode.key}>
                {index > 0 && <View style={[styles.divider, { backgroundColor: dividerColor }]} />}
                <TouchableOpacity
                  style={styles.modeItem}
                  activeOpacity={0.7}
                  onPress={() => setThemeMode(mode.key)}
                >
                  <View style={styles.itemLeft}>
                    <Text style={[styles.itemLabel, { color: titleColor, fontWeight: isSelected ? '700' : '500' }]}>
                      {mode.label}
                    </Text>
                  </View>
                  <View style={styles.itemRight}>
                    {isSelected && (
                      <Ionicons name="checkmark-circle" size={22} color={isDark ? '#BBDEFB' : '#0F172A'} />
                    )}
                  </View>
                </TouchableOpacity>
              </React.Fragment>
            );
          })}
        </View>
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
    paddingTop: 16,
    paddingBottom: 40,
  },

  card: {
    borderRadius: 16,
    borderWidth: 1,
    paddingVertical: 8,
  },
  modeItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  itemLeft: {
    flex: 1,
  },
  itemLabel: {
    fontSize: 15,
  },
  itemRight: {
    width: 32,
    alignItems: 'flex-end',
  },
  divider: {
    height: 1,
    marginHorizontal: 16,
  },
});
