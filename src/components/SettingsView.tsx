import React from 'react';
import { StyleSheet, View, Text, TouchableOpacity, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useTheme } from '../context/ThemeContext';

interface SettingsViewProps {
  isLoggedIn: boolean;
  user: { id: number; name: string; provider: string } | null;
  onLogout: () => void;
  onLogin: () => void;
}

export default function SettingsView({
  isLoggedIn,
  user
}: SettingsViewProps) {
  const router = useRouter();
  const { themeMode, isDark } = useTheme();

  // 2026 Toss-style Color Tokens
  const backgroundColor = isDark ? '#101012' : '#F3F4F6';
  const cardColor = isDark ? '#1C1C1E' : '#FFFFFF';
  const borderColor = isDark ? 'rgba(255, 255, 255, 0.04)' : 'rgba(0, 0, 0, 0.03)';
  const titleColor = isDark ? '#F5F5F5' : '#1F2937';
  const descColor = isDark ? '#A3A3A3' : '#6B7280';

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
      <Text style={[styles.headerTitle, { color: titleColor }]}>설정</Text>

      {/* 1. 프로필 영역 (provider 노출 제거, 단순 닉네임만 표시) */}
      <View style={[styles.profileCard, { backgroundColor: cardColor, borderColor }]}>
        <View style={styles.profileWrapper}>
          <View style={[styles.avatarCircle, { backgroundColor: isDark ? '#2C2C2E' : '#E5E7EB' }]}>
            <Ionicons name="person" size={22} color={isDark ? '#D1D5DB' : '#4B5563'} />
          </View>
          <View style={styles.profileInfo}>
            <Text style={[styles.profileName, { color: titleColor }]}>
              {isLoggedIn && user ? user.name : '익명 사용자'}
            </Text>
          </View>
        </View>
      </View>

      {/* 2. 보안 및 복구 카드 */}
      <View style={[styles.cardSection, { backgroundColor: cardColor, borderColor }]}>
        <Text style={[styles.cardSectionTitle, { color: descColor }]}>보안 및 복구</Text>
        
        <TouchableOpacity 
          style={styles.listRow} 
          activeOpacity={0.7} 
          onPress={() => router.push('/settings/backup')}
        >
          <Text style={[styles.listRowText, { color: titleColor }]}>복구 키 확인 및 백업</Text>
          <Ionicons name="chevron-forward" size={16} color={descColor} />
        </TouchableOpacity>
      </View>

      {/* 3. 화면 설정 카드 */}
      <View style={[styles.cardSection, { backgroundColor: cardColor, borderColor }]}>
        <Text style={[styles.cardSectionTitle, { color: descColor }]}>인터페이스</Text>
        
        <TouchableOpacity 
          style={styles.listRow} 
          activeOpacity={0.7} 
          onPress={() => router.push('/settings/theme')}
        >
          <View style={styles.listRowLeft}>
            <Text style={[styles.listRowText, { color: titleColor }]}>화면 테마 설정</Text>
            <Text style={[styles.currentValueText, { color: descColor }]}>{currentThemeText}</Text>
          </View>
          <Ionicons name="chevron-forward" size={16} color={descColor} />
        </TouchableOpacity>
      </View>

      {/* 4. 약관 및 정책 카드 */}
      <View style={[styles.cardSection, { backgroundColor: cardColor, borderColor }]}>
        <Text style={[styles.cardSectionTitle, { color: descColor }]}>법적 정보 및 기타</Text>
        
        <TouchableOpacity 
          style={styles.listRow} 
          activeOpacity={0.7} 
          onPress={() => router.push('/settings/terms')}
        >
          <Text style={[styles.listRowText, { color: titleColor }]}>서비스 이용약관</Text>
          <Ionicons name="chevron-forward" size={16} color={descColor} />
        </TouchableOpacity>
      </View>

      {/* 5. 계정 관리 카드 */}
      <View style={[styles.cardSection, { backgroundColor: cardColor, borderColor }]}>
        <TouchableOpacity 
          style={styles.listRow} 
          activeOpacity={0.7} 
          onPress={() => router.push('/settings/reset')}
        >
          <Text style={[styles.listRowText, { color: '#EF4444', fontWeight: '600' }]}>초기화</Text>
          <Ionicons name="chevron-forward" size={16} color="#EF4444" />
        </TouchableOpacity>
      </View>

      {/* 하단 메타 정보 영역 */}
      <View style={styles.footerContainer}>
        <Text style={[styles.footerText, { color: descColor }]}>앱 버전 1.0.0 · 최신버전</Text>
        <TouchableOpacity activeOpacity={0.6}>
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
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 80,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '800',
    letterSpacing: -0.5,
    marginBottom: 16,
    paddingHorizontal: 4,
  },
  // 토스 스타일 프로필 카드
  profileCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    marginBottom: 12,
  },
  profileWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  avatarCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  profileName: {
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  // 토스 스타일 카드 섹션
  cardSection: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    marginBottom: 12,
  },
  cardSectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 12,
  },
  // 리스트 아이템 행 (chevron 화살표 포함)
  listRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
  },
  listRowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  listRowText: {
    fontSize: 15,
    fontWeight: '600',
  },
  currentValueText: {
    fontSize: 14,
    fontWeight: '500',
  },
  // 하단 메타 영역
  footerContainer: {
    alignItems: 'center',
    gap: 8,
    marginTop: 24,
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
