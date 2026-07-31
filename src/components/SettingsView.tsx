import React, { useEffect, useState } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, ScrollView, Switch, Linking } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import * as Notifications from 'expo-notifications';
import { useTheme } from '../context/ThemeContext';
import { isNotificationsEnabled, setNotificationsEnabled, requestNotificationPermission } from '../utils/ingredientNotifications';

interface SettingsViewProps {
  isLoggedIn: boolean;
  user: { id: number; name: string; provider: string } | null;
  onLogin: () => void;
}

export default function SettingsView({
  isLoggedIn,
  user
}: SettingsViewProps) {
  const router = useRouter();
  const { themeMode, isDark } = useTheme();
  const [notificationsOn, setNotificationsOn] = useState(true);

  useEffect(() => {
    isNotificationsEnabled().then(setNotificationsOn);
  }, []);

  // 만료/임박 알림 토글: 켤 때 OS 권한이 거부된 상태면 설정 앱으로 안내한다
  // (iOS/Android 모두 한 번 거부되면 앱 내 재요청 다이얼로그가 다시 뜨지 않는 경우가 많음).
  const handleToggleNotifications = async (next: boolean) => {
    if (next) {
      const { status } = await Notifications.getPermissionsAsync();
      if (status === 'denied') {
        Linking.openSettings();
        return;
      }
      await requestNotificationPermission();
    }
    await setNotificationsEnabled(next);
    setNotificationsOn(next);
  };

  // 2026 Toss-style Color Tokens
  const backgroundColor = isDark ? '#101012' : '#F3F4F6';
  const cardColor = isDark ? '#1C1C1E' : '#FFFFFF';
  const borderColor = isDark ? 'rgba(255, 255, 255, 0.04)' : 'rgba(0, 0, 0, 0.03)';
  const dividerColor = isDark ? 'rgba(255, 255, 255, 0.06)' : 'rgba(0, 0, 0, 0.06)';
  const titleColor = isDark ? '#F5F5F5' : '#1F2937';
  const descColor = isDark ? '#A3A3A3' : '#6B7280';
  const iconColor = isDark ? '#9CA3AF' : '#4B5563';

  // 현재 활성화된 테마 모드 텍스트 반환
  const currentThemeText = themeMode === 'light' 
    ? '라이트' 
    : themeMode === 'dark' 
      ? '다크' 
      : '시스템';

  return (
    <ScrollView 
      style={[styles.container, { backgroundColor }]} 
      contentContainerStyle={styles.contentContainer} 
      showsVerticalScrollIndicator={false}
    >
      {/* 상단 프로필 헤더 영역 */}
      <View style={styles.headerContainer}>
        <Text style={[styles.headerTitle, { color: titleColor }]}>설정</Text>
        
        <TouchableOpacity 
          activeOpacity={0.7} 
          onPress={() => router.push('/settings/nickname')}
          style={styles.profileSection}
        >
          <Text style={[styles.nicknameText, { color: titleColor }]}>
            {isLoggedIn && user ? user.name : '익명 사용자'}님
          </Text>
          <View style={[styles.chevronWrapper, { backgroundColor: isDark ? '#2C2C2E' : '#E5E7EB' }]}>
            <Ionicons name="chevron-forward" size={14} color={descColor} />
          </View>
        </TouchableOpacity>
      </View>

      {/* 1. 서비스 이용 섹션 */}
      <View style={styles.sectionWrapper}>
        <Text style={[styles.cardSectionTitle, { color: descColor }]}>서비스 이용</Text>
        <View style={[styles.cardSection, { backgroundColor: cardColor, borderColor }]}>
          {/* 기기 연동 (연동 코드) */}
          <TouchableOpacity
            style={styles.listRow}
            activeOpacity={0.7}
            onPress={() => router.push('/settings/backup')}
          >
            <View style={styles.listRowLeft}>
              <View style={[styles.iconWrapper, { backgroundColor: isDark ? '#2A2A2D' : '#F3F4F6' }]}>
                <Ionicons name="key-outline" size={18} color={iconColor} />
              </View>
              <Text style={[styles.listRowText, { color: titleColor }]}>기기 연동 · 연동 코드</Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color={descColor} />
          </TouchableOpacity>

          <View style={[styles.divider, { backgroundColor: dividerColor }]} />

          {/* 화면 테마 설정 */}
          <TouchableOpacity 
            style={styles.listRow} 
            activeOpacity={0.7} 
            onPress={() => router.push('/settings/theme')}
          >
            <View style={styles.listRowLeft}>
              <View style={[styles.iconWrapper, { backgroundColor: isDark ? '#2A2A2D' : '#F3F4F6' }]}>
                <Ionicons name="contrast-outline" size={18} color={iconColor} />
              </View>
              <Text style={[styles.listRowText, { color: titleColor }]}>화면 테마 설정</Text>
            </View>
            <View style={styles.listRowRight}>
              <Text style={[styles.currentValueText, { color: descColor }]}>{currentThemeText}</Text>
              <Ionicons name="chevron-forward" size={16} color={descColor} />
            </View>
          </TouchableOpacity>

          <View style={[styles.divider, { backgroundColor: dividerColor }]} />

          {/* 만료/임박 알림 */}
          <View style={styles.listRow}>
            <View style={styles.listRowLeft}>
              <View style={[styles.iconWrapper, { backgroundColor: isDark ? '#2A2A2D' : '#F3F4F6' }]}>
                <Ionicons name="notifications-outline" size={18} color={iconColor} />
              </View>
              <Text style={[styles.listRowText, { color: titleColor }]}>만료/임박 알림</Text>
            </View>
            <Switch value={notificationsOn} onValueChange={handleToggleNotifications} />
          </View>
        </View>
      </View>

      {/* 2. 관리 및 법적 정보 섹션 */}
      <View style={styles.sectionWrapper}>
        <Text style={[styles.cardSectionTitle, { color: descColor }]}>정보 및 관리</Text>
        <View style={[styles.cardSection, { backgroundColor: cardColor, borderColor }]}>
          {/* 서비스 이용약관 */}
          <TouchableOpacity 
            style={styles.listRow} 
            activeOpacity={0.7} 
            onPress={() => router.push('/settings/terms')}
          >
            <View style={styles.listRowLeft}>
              <View style={[styles.iconWrapper, { backgroundColor: isDark ? '#2A2A2D' : '#F3F4F6' }]}>
                <Ionicons name="document-text-outline" size={18} color={iconColor} />
              </View>
              <Text style={[styles.listRowText, { color: titleColor }]}>서비스 이용약관</Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color={descColor} />
          </TouchableOpacity>

          <View style={[styles.divider, { backgroundColor: dividerColor }]} />

          {/* 초기화 */}
          <TouchableOpacity 
            style={styles.listRow} 
            activeOpacity={0.7} 
            onPress={() => router.push('/settings/reset')}
          >
            <View style={styles.listRowLeft}>
              <View style={[styles.iconWrapper, { backgroundColor: isDark ? 'rgba(239, 68, 68, 0.1)' : 'rgba(239, 68, 68, 0.05)' }]}>
                <Ionicons name="trash-outline" size={18} color="#EF4444" />
              </View>
              <Text style={[styles.listRowText, { color: '#EF4444', fontWeight: '600' }]}>초기화</Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color="#EF4444" />
          </TouchableOpacity>
        </View>
      </View>

      {/* 하단 메타 정보 영역 */}
      <View style={styles.footerContainer}>
        <Text style={[styles.footerText, { color: descColor }]}>앱 버전 1.0.0 · 최신버전</Text>
        <TouchableOpacity activeOpacity={0.6} onPress={() => router.push('/settings/licenses')}>
          <Text style={[styles.footerLink, { color: descColor }]}>오픈소스 라이선스 보기</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  contentContainer: {
    paddingHorizontal: 20, // 20px로 넓혀 시각적 안정감 부여
    paddingTop: 20,
    paddingBottom: 80,
  },
  headerContainer: {
    marginBottom: 28,
    paddingHorizontal: 4,
  },
  headerTitle: {
    fontSize: 26,
    fontWeight: '800',
    letterSpacing: -0.6,
  },
  profileSection: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 20,
    paddingVertical: 8,
  },
  nicknameText: {
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: -0.4,
  },
  chevronWrapper: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 12,
  },
  sectionWrapper: {
    marginBottom: 22,
  },
  cardSectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: -0.2,
    marginBottom: 8,
    paddingHorizontal: 6,
  },
  cardSection: {
    borderRadius: 20, // 부드러운 곡률의 20px 모서리
    borderWidth: 1,
    paddingHorizontal: 16,
  },
  listRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
  },
  listRowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconWrapper: {
    width: 32,
    height: 32,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listRowText: {
    fontSize: 15,
    fontWeight: '600',
    letterSpacing: -0.3,
  },
  listRowRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  currentValueText: {
    fontSize: 14,
    fontWeight: '500',
  },
  divider: {
    height: 1,
    width: '100%',
  },
  footerContainer: {
    alignItems: 'center',
    gap: 8,
    marginTop: 28,
    marginBottom: 16,
  },
  footerText: {
    fontSize: 11,
    fontWeight: '500',
  },
  footerLink: {
    fontSize: 11,
    fontWeight: '500',
    textDecorationLine: 'underline',
  },
});
