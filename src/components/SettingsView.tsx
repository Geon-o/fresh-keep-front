import React from 'react';
import { StyleSheet, View, Text, TouchableOpacity, ScrollView, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { FridgeType } from '../types';
import { useTheme } from '../context/ThemeContext';

interface SettingsViewProps {
  activeFridge: { id: string; name: string; type: FridgeType } | null;
  onEditFridgeType: () => void;
  onDeleteFridge: () => void;
  isLoggedIn: boolean;
  user: { id: number; name: string; email: string; provider: string } | null;
  onLogout: () => void;
  onLogin: () => void;
}

export default function SettingsView({
  activeFridge,
  onEditFridgeType,
  onDeleteFridge,
  isLoggedIn,
  user,
  onLogout,
  onLogin
}: SettingsViewProps) {
  const { theme, themeMode, setThemeMode, isDark } = useTheme();
  return (
    <ScrollView 
      style={[styles.container, { backgroundColor: theme.background }]} 
      contentContainerStyle={styles.contentContainer} 
      showsVerticalScrollIndicator={false}
    >
      <Text style={[styles.headerTitle, { color: theme.textPrimary }]}>설정 ⚙️</Text>

      {/* 1. 프로필 영역 */}
      {isLoggedIn && user ? (
        <View style={[
          styles.membershipCard, 
          { 
            backgroundColor: isDark ? theme.surface : '#0D47A1', 
            borderColor: isDark ? theme.glassBorder : 'rgba(255, 255, 255, 0.15)',
            shadowColor: isDark ? theme.shadow : '#0D47A1',
            overflow: 'hidden',
          }
        ]}>
          {/* Card background glowing circles */}
          <View style={{
            position: 'absolute',
            right: -60,
            bottom: -60,
            width: 180,
            height: 180,
            borderRadius: 90,
            backgroundColor: isDark ? 'rgba(187, 222, 251, 0.04)' : 'rgba(255, 255, 255, 0.08)',
          }} />
          <View style={{
            position: 'absolute',
            left: -40,
            top: -40,
            width: 120,
            height: 120,
            borderRadius: 60,
            backgroundColor: isDark ? 'rgba(187, 222, 251, 0.02)' : 'rgba(255, 255, 255, 0.04)',
          }} />

          <View style={styles.profileWrapper}>
            <View style={[styles.avatarCircle, { backgroundColor: isDark ? 'rgba(255, 255, 255, 0.12)' : 'rgba(255, 255, 255, 0.2)' }]}>
              <Text style={styles.avatarText}>👤</Text>
            </View>
            <View style={styles.profileInfo}>
              <Text style={[styles.profileName, { color: '#FFFFFF' }]}>{user.name}님</Text>
              <Text style={[styles.profileEmail, { color: isDark ? theme.textSecondary : '#BBDEFB' }]}>{user.email}</Text>
              <View style={[styles.providerBadge, { backgroundColor: isDark ? theme.surfaceSecondary : 'rgba(255, 255, 255, 0.15)' }]}>
                <Text style={[styles.providerText, { color: isDark ? theme.primaryText : '#FFFFFF' }]}>{user.provider.toUpperCase()} 계정</Text>
              </View>
            </View>
          </View>
        </View>
      ) : (
        <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.borderLight, shadowColor: theme.shadow }]}>
          <View style={styles.loginGuideWrapper}>
            <Text style={[styles.loginGuideTitle, { color: theme.textPrimary }]}>로그인이 필요합니다 🔑</Text>
            <Text style={[styles.loginGuideDesc, { color: theme.textTertiary }]}>서버 동기화 및 다중 기기 연동을 위해 로그인해 보세요.</Text>
            <TouchableOpacity 
              style={[styles.loginButton, { backgroundColor: theme.primary, shadowColor: theme.primary }]} 
              activeOpacity={0.8} 
              onPress={onLogin}
            >
              <Ionicons name="log-in-outline" size={18} color={theme.primaryOnPrimary} style={{ marginRight: 6 }} />
              <Text style={[styles.loginButtonText, { color: theme.primaryOnPrimary }]}>로그인 / 회원가입</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* 1.5. 테마 설정 영역 */}
      <Text style={[styles.sectionLabel, { color: theme.textMuted }]}>화면 테마 설정</Text>
      <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.borderLight, shadowColor: theme.shadow }]}>
        <View style={styles.themeSelectorWrapper}>
          <Text style={[styles.themeSelectorTitle, { color: theme.textSecondary }]}>테마 선택</Text>
          <View style={[styles.toggleGroup, { backgroundColor: theme.toggleBg }]}>
            <TouchableOpacity
              style={[styles.toggleButton, themeMode === 'light' && [styles.toggleButtonActive, { backgroundColor: theme.primary }]]}
              onPress={() => setThemeMode('light')}
              activeOpacity={0.7}
            >
              <Text style={[styles.toggleButtonText, { color: theme.toggleInactiveText }, themeMode === 'light' && [styles.toggleButtonTextActive, { color: theme.primaryOnPrimary }]]}>라이트</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.toggleButton, themeMode === 'dark' && [styles.toggleButtonActive, { backgroundColor: theme.primary }]]}
              onPress={() => setThemeMode('dark')}
              activeOpacity={0.7}
            >
              <Text style={[styles.toggleButtonText, { color: theme.toggleInactiveText }, themeMode === 'dark' && [styles.toggleButtonTextActive, { color: theme.primaryOnPrimary }]]}>다크</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.toggleButton, themeMode === 'system' && [styles.toggleButtonActive, { backgroundColor: theme.primary }]]}
              onPress={() => setThemeMode('system')}
              activeOpacity={0.7}
            >
              <Text style={[styles.toggleButtonText, { color: theme.toggleInactiveText }, themeMode === 'system' && [styles.toggleButtonTextActive, { color: theme.primaryOnPrimary }]]}>시스템</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* 2. 냉장고 관리 영역 */}
      <Text style={[styles.sectionLabel, { color: theme.textMuted }]}>냉장고 관리</Text>
      
      {activeFridge ? (
        <View style={[styles.fridgeControlCard, { backgroundColor: theme.surface, borderColor: theme.borderLight, shadowColor: theme.shadow }]}>
          <View style={[styles.activeFridgeHeader, { backgroundColor: theme.primaryLight, borderBottomColor: theme.primaryBorder }]}>
            <Ionicons name="business" size={20} color={theme.primary} />
            <Text style={[styles.activeFridgeText, { color: theme.primaryText }]}>
              선택된 냉장고: <Text style={{ fontWeight: 'bold' }}>{activeFridge.name}</Text>
            </Text>
          </View>
          
          <View style={styles.buttonGroup}>
            <TouchableOpacity style={styles.actionRow} activeOpacity={0.7} onPress={onEditFridgeType}>
              <View style={styles.actionLeft}>
                <View style={[styles.iconBadge, { backgroundColor: theme.primaryLight }]}>
                  <Ionicons name="swap-horizontal" size={18} color={theme.primary} />
                </View>
                <Text style={[styles.actionText, { color: theme.textSecondary }]}>현재 냉장고 타입 변경</Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color={theme.textMuted} />
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.actionRow, styles.destructiveActionRow, { borderTopColor: theme.borderLight }]} 
              activeOpacity={0.7} 
              onPress={onDeleteFridge}
            >
              <View style={styles.actionLeft}>
                <View style={[styles.iconBadge, { backgroundColor: theme.dangerLight }]}>
                  <Ionicons name="trash-outline" size={18} color={theme.danger} />
                </View>
                <Text style={[styles.actionText, { color: theme.danger }]}>현재 냉장고 삭제</Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color={theme.dangerMuted} />
            </TouchableOpacity>
          </View>
        </View>
      ) : (
        <View style={[styles.emptyFridgeCard, { backgroundColor: theme.surface, borderColor: theme.borderLight }]}>
          <Ionicons name="alert-circle-outline" size={24} color={theme.textMuted} />
          <Text style={[styles.emptyFridgeText, { color: theme.textSecondary }]}>활성화된 냉장고가 없습니다.</Text>
          <Text style={[styles.emptyFridgeSub, { color: theme.textMuted }]}>홈 탭에서 냉장고를 추가하거나 선택한 후 설정을 변경해 주세요.</Text>
        </View>
      )}

      {/* 3. 기타 기능 (준비중) */}
      <Text style={[styles.sectionLabel, { color: theme.textMuted }]}>추가 서비스</Text>
      <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.borderLight, shadowColor: theme.shadow }]}>
        <View style={styles.disabledRow}>
          <View style={styles.actionLeft}>
            <View style={[styles.iconBadge, { backgroundColor: theme.surfaceTertiary }]}>
              <Ionicons name="cube-outline" size={18} color={theme.textMuted} />
            </View>
            <View style={{ gap: 4 }}>
              <Text style={[styles.disabledText, { color: theme.textSecondary }]}>📦 식재료 전체보기</Text>
              <View style={[styles.skeletonBar, { backgroundColor: theme.borderLight }]} />
            </View>
          </View>
          <View style={[styles.comingSoonBadge, { backgroundColor: theme.primaryLight }]}>
            <Text style={[styles.comingSoonText, { color: theme.primaryText }]}>준비중</Text>
          </View>
        </View>
        <View style={[styles.divider, { backgroundColor: theme.divider, marginVertical: 12 }]} />
        <View style={styles.disabledRow}>
          <View style={styles.actionLeft}>
            <View style={[styles.iconBadge, { backgroundColor: theme.surfaceTertiary }]}>
              <Ionicons name="notifications-outline" size={18} color={theme.textMuted} />
            </View>
            <View style={{ gap: 4 }}>
              <Text style={[styles.disabledText, { color: theme.textSecondary }]}>🔔 유통기한 알림설정</Text>
              <View style={[styles.skeletonBar, { width: 120, backgroundColor: theme.borderLight }]} />
            </View>
          </View>
          <View style={[styles.comingSoonBadge, { backgroundColor: theme.primaryLight }]}>
            <Text style={[styles.comingSoonText, { color: theme.primaryText }]}>준비중</Text>
          </View>
        </View>
      </View>

      {/* 4. 로그아웃 버튼 (로그인 시에만 노출) */}
      {isLoggedIn && (
        <TouchableOpacity 
          style={[styles.logoutButton, { backgroundColor: theme.surfaceTertiary, borderColor: theme.borderLight }]} 
          activeOpacity={0.8} 
          onPress={onLogout}
        >
          <Ionicons name="log-out-outline" size={18} color={theme.textSecondary} style={{ marginRight: 6 }} />
          <Text style={[styles.logoutButtonText, { color: theme.textSecondary }]}>로그아웃</Text>
        </TouchableOpacity>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAFAFA',
  },
  contentContainer: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 110,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#0F172A',
    marginBottom: 20,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 12,
    elevation: 3,
  },
  membershipCard: {
    borderRadius: 24,
    padding: 24,
    marginBottom: 24,
    borderWidth: 1.5,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.16,
    shadowRadius: 20,
    elevation: 6,
  },
  profileWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  avatarCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#EEF2FF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 28,
  },
  profileInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  profileName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#0F172A',
  },
  profileEmail: {
    fontSize: 13,
    color: '#64748B',
    marginTop: 2,
    marginBottom: 6,
  },
  providerBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  providerText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#475569',
  },
  loginGuideWrapper: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  loginGuideTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#0F172A',
    marginBottom: 6,
  },
  loginGuideDesc: {
    fontSize: 13,
    color: '#64748B',
    textAlign: 'center',
    marginBottom: 16,
    lineHeight: 18,
  },
  loginButton: {
    backgroundColor: '#4F46E5',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#4F46E5',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  loginButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  sectionLabel: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#94A3B8',
    textTransform: 'uppercase',
    marginBottom: 10,
    paddingLeft: 4,
  },
  fridgeControlCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    marginBottom: 24,
    overflow: 'hidden',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 12,
    elevation: 3,
  },
  activeFridgeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#EEF2FF',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E7FF',
  },
  activeFridgeText: {
    fontSize: 14,
    color: '#312E81',
  },
  buttonGroup: {
    paddingVertical: 6,
  },
  actionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
  },
  destructiveActionRow: {
    borderTopWidth: 1,
    borderTopColor: '#F8FAFC',
  },
  actionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconBadge: {
    width: 32,
    height: 32,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#334155',
  },
  emptyFridgeCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
    gap: 8,
  },
  emptyFridgeText: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#475569',
    marginTop: 4,
  },
  emptyFridgeSub: {
    fontSize: 12,
    color: '#94A3B8',
    textAlign: 'center',
    lineHeight: 18,
  },
  disabledRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    opacity: 0.65,
  },
  disabledText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#64748B',
  },
  skeletonBar: {
    height: 6,
    width: 140,
    borderRadius: 3,
    marginTop: 4,
  },
  comingSoonBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  comingSoonText: {
    fontSize: 11,
    fontWeight: 'bold',
  },
  divider: {
    height: 1,
    backgroundColor: '#F1F5F9',
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F1F5F9',
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginTop: 8,
  },
  logoutButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#64748B',
  },
  themeSelectorWrapper: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
  },
  themeSelectorTitle: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  toggleGroup: {
    flexDirection: 'row',
    borderRadius: 20,
    padding: 3,
  },
  toggleButton: {
    paddingVertical: 6,
    paddingHorizontal: 16,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  toggleButtonActive: {
    // dynamic colors applied in JS
  },
  toggleButtonText: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  toggleButtonTextActive: {
    // dynamic colors applied in JS
  },
});
