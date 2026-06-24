import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, ScrollView, Platform, Modal, TextInput, Alert, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { FridgeType } from '../types';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';

interface SettingsViewProps {
  isLoggedIn: boolean;
  user: { id: number; name: string; provider: string } | null;
  onLogout: () => void;
  onLogin: () => void;
}

const SERVICE_TERMS = `제1조 (목적)
본 약관은 FreshKeep(이하 "서비스")이 제공하는 모바일 앱 및 제반 서비스의 이용 조건, 절차 및 회원과 서비스 간의 권리, 의무에 관한 기본 사항을 규정함을 목적으로 합니다.

제2조 (계정 및 백업 키 관리)
1. 본 서비스는 개인정보의 유출 방지를 위해 소셜 로그인을 제공하지 않으며, 무작위 생성 백업 키와 기기 UUID 기반의 익명 로그인으로 서비스가 제공됩니다.
2. 회원은 본인의 백업 키를 타인에게 유출하지 않고 안전하게 직접 관리해야 하며, 백업 키를 유실할 경우 데이터를 복구할 수 없습니다.

제3조 (서비스 제공 및 중단)
1. 서비스는 식품 유통기한 추적, 보관실 레이아웃 시각화, 식중독 지수 위생 예보, 제철 식재료 검색 가이드를 제공합니다.
2. 시스템 점검, 통신 장애 등 부득이한 사유 발생 시 서비스 제공이 일시 중단될 수 있으며, 이 경우 사전에 공지합니다.`;

const PRIVACY_POLICY = `개인정보 처리방침

FreshKeep은 개인정보 유출을 원천적으로 차단하기 위해 로그인 절차에서 이메일, 전화번호 등의 실식별 개인정보를 일절 수집하지 않습니다.

1. 수집하는 개인정보의 항목
서비스는 아래의 비인식 식별값 및 단말 정보만을 활용합니다.
- 기기 UUID (자동 생성)
- 냉장고 및 식재료 정보 (직접 기입)

2. 개인정보의 수집 및 이용 목적
수집된 정보는 다음의 한정된 목적을 위해서만 활용됩니다.
- 생성한 냉장고 정보를 안전하게 데이터베이스에 저장하고 타 기기 및 공유자와 실시간 동기화하기 위함.

3. 개인정보의 보유 및 이용 기간
- 수집된 식재료 정보 및 냉장고 정보는 익명 세션 초기화 시 지체 없이 파기됩니다.`;

export default function SettingsView({
  isLoggedIn,
  user,
  onLogout,
  onLogin
}: SettingsViewProps) {
  const { theme, themeMode, setThemeMode, isDark } = useTheme();
  const { getBackupKey, restoreBackup, logout } = useAuth();
  
  const [modalVisible, setModalVisible] = useState(false);
  const [modalTitle, setModalTitle] = useState('');
  const [modalContent, setModalContent] = useState('');

  const [backupKey, setBackupKey] = useState<string | null>(null);
  const [showKey, setShowKey] = useState(false);

  useEffect(() => {
    if (isLoggedIn) {
      getBackupKey().then(key => setBackupKey(key));
    }
  }, [isLoggedIn]);

  const handleOpenTerms = (type: 'service' | 'privacy') => {
    if (type === 'service') {
      setModalTitle('서비스 이용약관');
      setModalContent(SERVICE_TERMS);
    } else {
      setModalTitle('개인정보 처리방침');
      setModalContent(PRIVACY_POLICY);
    }
    setModalVisible(true);
  };

  const handleResetSession = () => {
    Alert.alert(
      '데이터 초기화 ⚠️',
      '현재 기기의 익명 세션을 만료하고 완전히 새로운 빈 세션을 발급받습니다. 저장하지 않은 데이터는 모두 삭제됩니다. 계속하시겠습니까?',
      [
        { text: '취소', style: 'cancel' },
        { text: '초기화', style: 'destructive', onPress: logout }
      ]
    );
  };

  return (
    <ScrollView 
      style={[styles.container, { backgroundColor: theme.background }]} 
      contentContainerStyle={styles.contentContainer} 
      showsVerticalScrollIndicator={false}
    >
      <Text style={[styles.headerTitle, { color: theme.textPrimary }]}>설정</Text>

      {/* 1. 백업 키 관리 영역 */}
      <Text style={[styles.sectionLabel, { color: theme.textMuted }]}>내 백업 키</Text>
      <View style={[
        styles.membershipCard, 
        { 
          backgroundColor: isDark ? theme.surface : '#0D47A1', 
          borderColor: isDark ? theme.glassBorder : 'rgba(255, 255, 255, 0.15)',
          shadowColor: isDark ? theme.shadow : '#0D47A1',
          overflow: 'hidden',
          marginBottom: 16,
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

        <View style={{ paddingHorizontal: 4, paddingVertical: 8 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.2)', borderRadius: 10, padding: 12, justifyContent: 'space-between', marginBottom: 12 }}>
            <Text style={{ color: '#FFFFFF', fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace', fontSize: 16, fontWeight: '700', letterSpacing: 1.2 }}>
              {backupKey ? (showKey ? backupKey : 'FK-••••-••••-••••') : '불러오는 중...'}
            </Text>
            <TouchableOpacity onPress={() => setShowKey(!showKey)} style={{ padding: 4 }}>
              <Ionicons name={showKey ? "eye-off-outline" : "eye-outline"} size={22} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
          
          <View style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)', borderRadius: 8, padding: 10, borderWidth: 1, borderColor: 'rgba(239, 68, 68, 0.2)' }}>
            <Text style={{ color: '#FCA5A5', fontSize: 12, fontWeight: 'bold', marginBottom: 4 }}>⚠️ 보안 주의사항</Text>
            <Text style={{ color: '#E2E8F0', fontSize: 11, lineHeight: 16 }}>
              기기를 분실하거나 앱 삭제 시 백업 키가 없으면 어떠한 방법으로도 데이터를 복구할 수 없습니다. 타인에게 공유하지 마시고, 안전한 곳에 별도로 메모하여 보관해 주세요.
            </Text>
          </View>
        </View>
      </View>

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

      {/* 2. 약관 및 정책 영역 */}
      <Text style={[styles.sectionLabel, { color: theme.textMuted }]}>약관 및 정책</Text>
      <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.borderLight, shadowColor: theme.shadow, paddingVertical: 6 }]}>
        <TouchableOpacity style={styles.actionRow} activeOpacity={0.7} onPress={() => handleOpenTerms('service')}>
          <View style={styles.actionLeft}>
            <View style={[styles.iconBadge, { backgroundColor: theme.primaryLight }]}>
              <Ionicons name="document-text-outline" size={18} color={theme.primary} />
            </View>
            <Text style={[styles.actionText, { color: theme.textSecondary }]}>서비스 이용약관</Text>
          </View>
          <Ionicons name="chevron-forward" size={16} color={theme.textMuted} />
        </TouchableOpacity>

        <View style={[styles.divider, { backgroundColor: theme.divider, marginVertical: 0 }]} />

        <TouchableOpacity style={styles.actionRow} activeOpacity={0.7} onPress={() => handleOpenTerms('privacy')}>
          <View style={styles.actionLeft}>
            <View style={[styles.iconBadge, { backgroundColor: theme.primaryLight }]}>
              <Ionicons name="shield-checkmark-outline" size={18} color={theme.primary} />
            </View>
            <Text style={[styles.actionText, { color: theme.textSecondary }]}>개인정보 처리방침</Text>
          </View>
          <Ionicons name="chevron-forward" size={16} color={theme.textMuted} />
        </TouchableOpacity>
      </View>

      {/* 3. 데이터 초기화 버튼 (익명 로그아웃 역할) */}
      <TouchableOpacity 
        style={[styles.logoutButton, { backgroundColor: theme.surfaceTertiary, borderColor: theme.borderLight }]} 
        activeOpacity={0.8} 
        onPress={handleResetSession}
      >
        <Ionicons name="trash-outline" size={18} color={theme.textSecondary} style={{ marginRight: 6 }} />
        <Text style={[styles.logoutButtonText, { color: theme.textSecondary }]}>익명 세션 초기화</Text>
      </TouchableOpacity>

      {/* 약관 상세 보기 모달 */}
      <Modal
        visible={modalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={[styles.modalOverlay, { backgroundColor: theme.modalOverlay }]}>
          <View style={[styles.modalContent, { backgroundColor: theme.surface, borderColor: theme.borderLight }]}>
            <View style={[styles.modalHeader, { borderBottomColor: theme.borderLight }]}>
              <Text style={[styles.modalTitleText, { color: theme.textPrimary }]}>{modalTitle}</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)} style={styles.modalCloseButton}>
                <Ionicons name="close" size={24} color={theme.textSecondary} />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.modalScrollView} contentContainerStyle={styles.modalScrollContent}>
              <Text style={[styles.modalBodyText, { color: theme.textSecondary }]}>{modalContent}</Text>
            </ScrollView>
            <TouchableOpacity 
              style={[styles.modalConfirmButton, { backgroundColor: theme.primary }]}
              activeOpacity={0.8}
              onPress={() => setModalVisible(false)}
            >
              <Text style={[styles.modalConfirmButtonText, { color: theme.primaryOnPrimary }]}>확인</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
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
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalContent: {
    width: '90%',
    maxHeight: '80%',
    borderRadius: 24,
    borderWidth: 1,
    padding: 20,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.08,
    shadowRadius: 20,
    elevation: 8,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 16,
    borderBottomWidth: 1,
    marginBottom: 16,
  },
  modalTitleText: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  modalCloseButton: {
    padding: 4,
  },
  modalScrollView: {
    maxHeight: 400,
  },
  modalScrollContent: {
    paddingBottom: 16,
  },
  modalBodyText: {
    fontSize: 13,
    lineHeight: 20,
  },
  modalConfirmButton: {
    paddingVertical: 12,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 16,
  },
  modalConfirmButtonText: {
    fontSize: 14,
    fontWeight: 'bold',
  },
});
