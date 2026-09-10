import React from 'react';
import { StyleSheet, View, Text, TouchableOpacity, Modal } from 'react-native';
import { useTheme } from '../context/ThemeContext';
import SocialLoginButtons from './SocialLoginButtons';

interface Props {
  visible: boolean;
  // 시트를 닫을 때 ("게스트로 둘러보기"·백드롭 등, 로그인 없이 닫힘)
  onClose: () => void;
  // 실제 로그인 성공 시 (어떤 제공자인지 전달). 닫기/화면전환/안내는 부모가 처리.
  onLoginSuccess?: (provider: 'google' | 'naver') => void;
  // 세션 만료로 다시 뜬 경우 문구를 살짝 바꾼다
  reason?: 'welcome' | 'sessionExpired';
}

/**
 * 첫 진입 권유형 시트. 강제 아님 — "게스트로 둘러보기" 한 탭으로 통과 가능.
 * 로그인의 "혜택"을 앞세운다(위협형 문구 지양).
 */
export default function WelcomeAuthSheet({ visible, onClose, onLoginSuccess, reason = 'welcome' }: Props) {
  const { isDark } = useTheme();

  const sheetBg = isDark ? '#1C1C1E' : '#FFFFFF';
  const titleColor = isDark ? '#F5F5F5' : '#1F2937';
  const descColor = isDark ? '#A3A3A3' : '#6B7280';
  const guestColor = isDark ? '#9CA3AF' : '#6B7280';

  const title = reason === 'sessionExpired' ? '다시 로그인해 주세요' : '데이터를 안전하게 지켜요';
  const desc =
    reason === 'sessionExpired'
      ? '로그인이 풀렸어요. 다시 로그인하면 기존 냉장고 데이터를 그대로 이어서 볼 수 있어요.'
      : '로그인하면 기기를 바꾸거나 앱을 지웠다 다시 깔아도 냉장고 데이터가 그대로 유지돼요. 지금은 이 기기에만 저장돼 있어요.';

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={onClose} />
        <View style={[styles.sheet, { backgroundColor: sheetBg }]}>
          <View style={styles.handle} />
          <Text style={styles.emoji}>🧊</Text>
          <Text style={[styles.title, { color: titleColor }]}>{title}</Text>
          <Text style={[styles.desc, { color: descColor }]}>{desc}</Text>

          <View style={styles.buttons}>
            <SocialLoginButtons onSuccess={(provider) => onLoginSuccess?.(provider)} />
          </View>

          <TouchableOpacity style={styles.guestButton} activeOpacity={0.7} onPress={onClose}>
            <Text style={[styles.guestText, { color: guestColor }]}>
              {reason === 'sessionExpired' ? '나중에 하기' : '게스트로 둘러보기'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.45)',
    justifyContent: 'flex-end',
  },
  backdrop: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
  sheet: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 24,
    paddingTop: 12,
    paddingBottom: 36,
    alignItems: 'center',
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(148, 163, 184, 0.4)',
    marginBottom: 20,
  },
  emoji: { fontSize: 40, marginBottom: 12 },
  title: {
    fontSize: 20,
    fontWeight: '800',
    letterSpacing: -0.4,
    marginBottom: 10,
    textAlign: 'center',
  },
  desc: {
    fontSize: 14,
    lineHeight: 21,
    textAlign: 'center',
    marginBottom: 24,
    paddingHorizontal: 4,
  },
  buttons: { width: '100%' },
  guestButton: { marginTop: 16, paddingVertical: 10, paddingHorizontal: 20 },
  guestText: { fontSize: 14, fontWeight: '600' },
});
