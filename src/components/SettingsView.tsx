import React from 'react';
import { StyleSheet, View, Text, TouchableOpacity, ScrollView, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { FridgeType } from '../types';

interface SettingsViewProps {
  activeFridge: { id: string; name: string; type: FridgeType } | null;
  onEditFridgeType: () => void;
  onDeleteFridge: () => void;
  onRenameFridge: () => void;
  isLoggedIn: boolean;
  user: { id: number; name: string; email: string; provider: string } | null;
  onLogout: () => void;
  onLogin: () => void;
}

export default function SettingsView({
  activeFridge,
  onEditFridgeType,
  onDeleteFridge,
  onRenameFridge,
  isLoggedIn,
  user,
  onLogout,
  onLogin
}: SettingsViewProps) {
  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer} showsVerticalScrollIndicator={false}>
      <Text style={styles.headerTitle}>설정 ⚙️</Text>

      {/* 1. 프로필 영역 */}
      <View style={styles.card}>
        {isLoggedIn && user ? (
          <View style={styles.profileWrapper}>
            <View style={styles.avatarCircle}>
              <Text style={styles.avatarText}>👤</Text>
            </View>
            <View style={styles.profileInfo}>
              <Text style={styles.profileName}>{user.name}님</Text>
              <Text style={styles.profileEmail}>{user.email}</Text>
              <View style={styles.providerBadge}>
                <Text style={styles.providerText}>{user.provider.toUpperCase()} 계정</Text>
              </View>
            </View>
          </View>
        ) : (
          <View style={styles.loginGuideWrapper}>
            <Text style={styles.loginGuideTitle}>로그인이 필요합니다 🔑</Text>
            <Text style={styles.loginGuideDesc}>서버 동기화 및 다중 기기 연동을 위해 로그인해 보세요.</Text>
            <TouchableOpacity style={styles.loginButton} activeOpacity={0.8} onPress={onLogin}>
              <Ionicons name="log-in-outline" size={18} color="#FFFFFF" style={{ marginRight: 6 }} />
              <Text style={styles.loginButtonText}>로그인 / 회원가입</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* 2. 냉장고 관리 영역 */}
      <Text style={styles.sectionLabel}>냉장고 관리</Text>
      
      {activeFridge ? (
        <View style={styles.fridgeControlCard}>
          <View style={styles.activeFridgeHeader}>
            <Ionicons name="business" size={20} color="#4F46E5" />
            <Text style={styles.activeFridgeText}>선택된 냉장고: <Text style={{ fontWeight: 'bold' }}>{activeFridge.name}</Text></Text>
          </View>
          
          <View style={styles.buttonGroup}>
            <TouchableOpacity style={styles.actionRow} activeOpacity={0.7} onPress={onRenameFridge}>
              <View style={styles.actionLeft}>
                <View style={[styles.iconBadge, { backgroundColor: '#EEF2FF' }]}>
                  <Ionicons name="create-outline" size={18} color="#4F46E5" />
                </View>
                <Text style={styles.actionText}>현재 냉장고 이름 변경</Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color="#94A3B8" />
            </TouchableOpacity>

            <TouchableOpacity style={[styles.actionRow, { borderTopWidth: 1, borderTopColor: '#F8FAFC' }]} activeOpacity={0.7} onPress={onEditFridgeType}>
              <View style={styles.actionLeft}>
                <View style={[styles.iconBadge, { backgroundColor: '#EEF2FF' }]}>
                  <Ionicons name="swap-horizontal" size={18} color="#4F46E5" />
                </View>
                <Text style={styles.actionText}>현재 냉장고 타입 변경</Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color="#94A3B8" />
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.actionRow, styles.destructiveActionRow]} 
              activeOpacity={0.7} 
              onPress={onDeleteFridge}
            >
              <View style={styles.actionLeft}>
                <View style={[styles.iconBadge, { backgroundColor: '#FEF2F2' }]}>
                  <Ionicons name="trash-outline" size={18} color="#EF4444" />
                </View>
                <Text style={[styles.actionText, { color: '#EF4444' }]}>현재 냉장고 삭제</Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color="#FCA5A5" />
            </TouchableOpacity>
          </View>
        </View>
      ) : (
        <View style={styles.emptyFridgeCard}>
          <Ionicons name="alert-circle-outline" size={24} color="#94A3B8" />
          <Text style={styles.emptyFridgeText}>활성화된 냉장고가 없습니다.</Text>
          <Text style={styles.emptyFridgeSub}>홈 탭에서 냉장고를 추가하거나 선택한 후 설정을 변경해 주세요.</Text>
        </View>
      )}

      {/* 3. 기타 기능 (준비중) */}
      <Text style={styles.sectionLabel}>추가 서비스</Text>
      <View style={styles.card}>
        <View style={styles.disabledRow}>
          <View style={styles.actionLeft}>
            <View style={[styles.iconBadge, { backgroundColor: '#F1F5F9' }]}>
              <Ionicons name="cube-outline" size={18} color="#94A3B8" />
            </View>
            <Text style={styles.disabledText}>📦 식재료 전체보기 (준비중)</Text>
          </View>
        </View>
        <View style={[styles.divider, { marginVertical: 4 }]} />
        <View style={styles.disabledRow}>
          <View style={styles.actionLeft}>
            <View style={[styles.iconBadge, { backgroundColor: '#F1F5F9' }]}>
              <Ionicons name="notifications-outline" size={18} color="#94A3B8" />
            </View>
            <Text style={styles.disabledText}>🔔 유통기한 알림설정 (준비중)</Text>
          </View>
        </View>
      </View>

      {/* 4. 로그아웃 버튼 (로그인 시에만 노출) */}
      {isLoggedIn && (
        <TouchableOpacity style={styles.logoutButton} activeOpacity={0.8} onPress={onLogout}>
          <Ionicons name="log-out-outline" size={18} color="#64748B" style={{ marginRight: 6 }} />
          <Text style={styles.logoutButtonText}>로그아웃</Text>
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
    paddingBottom: 40,
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
    opacity: 0.55,
  },
  disabledText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#64748B',
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
});
