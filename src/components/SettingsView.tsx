import React, { useState } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, ScrollView, Platform, Modal } from 'react-native';
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

const SERVICE_TERMS = `제1조 (목적)
본 약관은 FreshKeep(이하 "서비스")이 제공하는 모바일 앱 및 제반 서비스의 이용 조건, 절차 및 회원과 서비스 간의 권리, 의무에 관한 기본 사항을 규정함을 목적으로 합니다.

제2조 (회원가입 및 계정 관리)
1. 회원은 소셜 인증(이메일, 이름 등 제공)을 통해 본 서비스의 회원으로 등록할 수 있습니다.
2. 회원은 본인의 로그인 계정 정보를 안전하게 관리하여야 하며, 제3자의 무단 사용이 의심될 경우 지체 없이 서비스에 알려 조치를 받아야 합니다.

제3조 (서비스 제공 및 중단)
1. 서비스는 식품 유통기한 추적, 보관실 레이아웃 시각화, 식중독 지수 위생 예보, 제철 식재료 검색 가이드를 제공합니다.
2. 시스템 점검, 통신 장애 등 부득이한 사유 발생 시 서비스 제공이 일시 중단될 수 있으며, 이 경우 사전에 공지합니다.

제4조 (회원의 의무 및 이용 제한)
1. 회원은 타인의 계정 정보나 식재료 정보를 무단 도용해서는 안 됩니다.
2. 서비스의 정상적인 운영을 방해하는 해킹, 비정상적 트래픽 유발 등의 행위 시 서비스 이용이 제한되거나 법적 책임이 따를 수 있습니다.

제5조 (면책 조항)
본 서비스의 식중독 지수 예보 및 유통기한 알림은 보조적 기상 통계 및 입력 데이터에 기반하며, 실제 식재료의 개별 신선도와 부패 상태에 따른 최종 섭취 적합 여부는 회원의 직접 확인 및 주의 의무 하에 결정됩니다. 서비스는 이로 인해 발생한 위생 문제에 책임을 지지 않습니다.`;

const PRIVACY_POLICY = `개인정보 처리방침

FreshKeep은 회원의 개인정보를 소중하게 처리하며, 관련 개인정보보호법에 규정된 의무를 준수합니다.

1. 수집하는 개인정보의 항목
서비스는 편리한 연동 및 회원 관리를 위해 아래의 최소한의 정보만을 수집합니다.
- 필수 수집 항목: 소셜 계정의 이메일 주소, 이름
- 자동 생성 수집 항목: 기기 OS 타입, 푸시 알림 토큰(수신 동의 시)

2. 개인정보의 수집 및 이용 목적
수집된 정보는 다음의 한정된 목적을 위해서만 활용됩니다.
- 회원 식별 및 가입 확인
- 다중 기기 간 냉장고 데이터 실시간 동기화
- 개인별 유통기한 리포트 제공 및 시스템 알림 발송

3. 개인정보의 보유 및 이용 기간
- 회원의 개인정보는 회원 탈퇴 시 지체 없이 파기됩니다.
- 단, 회원 정보 오용 방지 및 관계 법령(전자상거래 등에서의 소비자보호에 관한 법률 등)의 규정에 의하여 보존할 필요가 있는 경우 해당 기간 동안 안전하게 보관합니다.

4. 개인정보의 제3자 제공 및 위탁
서비스는 회원의 동의 없이 개인정보를 외부에 무단 제공하거나 제3자에게 위탁하지 않습니다. 단, 법적 요구 등 법률에 따른 정당한 요구가 있을 경우에는 예외로 합니다.

5. 회원의 권리와 행사 방법
회원은 언제든지 앱 내 설정을 통해 탈퇴하거나 수집된 정보의 열람 및 정정을 청구할 수 있습니다.`;

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
  
  const [modalVisible, setModalVisible] = useState(false);
  const [modalTitle, setModalTitle] = useState('');
  const [modalContent, setModalContent] = useState('');

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

  return (
    <ScrollView 
      style={[styles.container, { backgroundColor: theme.background }]} 
      contentContainerStyle={styles.contentContainer} 
      showsVerticalScrollIndicator={false}
    >
      <Text style={[styles.headerTitle, { color: theme.textPrimary }]}>설정</Text>

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

      {/* 3. 약관 및 정책 영역 */}
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
