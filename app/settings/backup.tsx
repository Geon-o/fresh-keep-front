import React from 'react';
import { StyleSheet, View, Text, TouchableOpacity, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../src/context/ThemeContext';

export default function BackupHubScreen() {
  const router = useRouter();
  const { isDark } = useTheme();

  // 2026 Toss-style Color Tokens
  const backgroundColor = isDark ? '#101012' : '#F3F4F6';
  const cardColor = isDark ? '#1C1C1E' : '#FFFFFF';
  const borderColor = isDark ? 'rgba(255, 255, 255, 0.04)' : 'rgba(0, 0, 0, 0.03)';
  const dividerColor = isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.05)';
  const titleColor = isDark ? '#F5F5F5' : '#1F2937';
  const descColor = isDark ? '#A3A3A3' : '#6B7280';

  return (
    <SafeAreaView style={[styles.container, { backgroundColor }]} edges={['top', 'left', 'right', 'bottom']}>
      {/* 헤더 */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()} activeOpacity={0.7}>
          <Ionicons name="chevron-back" size={24} color={titleColor} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: titleColor }]}>기기 연동</Text>
        <View style={styles.headerRightSpacer} />
      </View>

      <ScrollView contentContainerStyle={styles.contentContainer} showsVerticalScrollIndicator={false}>
        <Text style={[styles.sectionDesc, { color: descColor }]}>
          내 연동 코드를 확인하거나, 연동 코드를 입력해 다른 기기의 냉장고 데이터를 이어받을 수 있습니다.
        </Text>

        {/* 메뉴 선택 카드 */}
        <View style={[styles.card, { backgroundColor: cardColor, borderColor }]}>
          {/* 메뉴 1: 연동 코드 확인 */}
          <TouchableOpacity
            style={styles.menuItem}
            activeOpacity={0.7}
            onPress={() => router.push('/settings/backup-view')}
          >
            <View style={styles.menuItemLeft}>
              <Text style={[styles.menuItemLabel, { color: titleColor }]}>연동 코드 확인·복사</Text>
              <Text style={[styles.menuItemSubText, { color: descColor }]}>내 연동 코드 조회 및 안전한 보관용 복사</Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color={descColor} />
          </TouchableOpacity>

          <View style={[styles.divider, { backgroundColor: dividerColor }]} />

          {/* 메뉴 2: 연동 코드로 데이터 불러오기 */}
          <TouchableOpacity
            style={styles.menuItem}
            activeOpacity={0.7}
            onPress={() => router.push('/settings/backup-restore')}
          >
            <View style={styles.menuItemLeft}>
              <Text style={[styles.menuItemLabel, { color: titleColor }]}>연동 코드로 데이터 불러오기</Text>
              <Text style={[styles.menuItemSubText, { color: descColor }]}>기기 교체/앱 재설치 시 데이터 이어가기</Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color={descColor} />
          </TouchableOpacity>
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
  sectionDesc: {
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 20,
    paddingHorizontal: 4,
  },
  card: {
    borderRadius: 16,
    borderWidth: 1,
    paddingVertical: 8,
    marginBottom: 16,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  menuItemLeft: {
    flex: 1,
    gap: 4,
  },
  menuItemLabel: {
    fontSize: 15,
    fontWeight: '600',
  },
  menuItemSubText: {
    fontSize: 12,
  },
  divider: {
    height: 1,
    marginHorizontal: 16,
  },

});
