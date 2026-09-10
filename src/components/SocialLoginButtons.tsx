import React, { useState } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { useAuth } from '../context/AuthContext';

interface Props {
  // 로그인(및 충돌 해결)이 성공적으로 끝나면 호출 (예: 시트 닫기). 어떤 제공자로 로그인했는지 전달.
  onSuccess?: (provider: 'google' | 'naver') => void;
}

/**
 * 구글/네이버 소셜 로그인 버튼 묶음. 로그인 실행, 충돌(B안) 다이얼로그, 결과 안내까지 처리한다.
 * 첫 진입 시트·로그인 화면·설정 등 어디서든 재사용.
 */
export default function SocialLoginButtons({ onSuccess }: Props) {
  const { loginWithGoogle, loginWithNaver, resolveSocialConflict } = useAuth();
  const [busy, setBusy] = useState<null | 'google' | 'naver'>(null);

  // 충돌 시: 게스트 데이터를 합칠지, 기존 계정 데이터만 쓸지 사용자에게 물어본다.
  const handleConflict = (conflictToken: string, provider: 'google' | 'naver') => {
    Alert.alert(
      '기존 데이터를 어떻게 할까요?',
      '이 기기에서 로그인 없이 추가한 데이터가 있어요.\n\n• 합치기: 지금 데이터를 기존 계정에 더합니다\n• 기존 계정만: 로그인 계정의 데이터만 사용합니다(이 기기 데이터는 버려짐)',
      [
        { text: '취소', style: 'cancel' },
        {
          text: '기존 계정만',
          style: 'destructive',
          onPress: async () => {
            const ok = await resolveSocialConflict(conflictToken, 'account');
            if (ok) onSuccess?.(provider);
            else Alert.alert('로그인 실패', '잠시 후 다시 시도해 주세요.');
          },
        },
        {
          text: '합치기',
          onPress: async () => {
            const ok = await resolveSocialConflict(conflictToken, 'merge');
            if (ok) onSuccess?.(provider);
            else Alert.alert('로그인 실패', '잠시 후 다시 시도해 주세요.');
          },
        },
      ]
    );
  };

  const run = async (provider: 'google' | 'naver') => {
    if (busy) return;
    setBusy(provider);
    try {
      const result = provider === 'google' ? await loginWithGoogle() : await loginWithNaver();
      switch (result.status) {
        case 'success':
          onSuccess?.(provider);
          break;
        case 'conflict':
          handleConflict(result.conflictToken, provider);
          break;
        case 'cancelled':
          break; // 사용자가 취소 — 조용히
        case 'error':
          Alert.alert('로그인 실패', result.message || '잠시 후 다시 시도해 주세요.');
          break;
      }
    } finally {
      setBusy(null);
    }
  };

  return (
    <View style={styles.wrap}>
      <TouchableOpacity
        style={[styles.btn, styles.google]}
        activeOpacity={0.85}
        disabled={!!busy}
        onPress={() => run('google')}
      >
        {busy === 'google' ? (
          <ActivityIndicator size="small" color="#1F2937" />
        ) : (
          <Text style={[styles.btnText, { color: '#1F2937' }]}>Google로 계속하기</Text>
        )}
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.btn, styles.naver]}
        activeOpacity={0.85}
        disabled={!!busy}
        onPress={() => run('naver')}
      >
        {busy === 'naver' ? (
          <ActivityIndicator size="small" color="#FFFFFF" />
        ) : (
          <Text style={[styles.btnText, { color: '#FFFFFF' }]}>네이버로 계속하기</Text>
        )}
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 10, width: '100%' },
  btn: {
    height: 52,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  google: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  naver: {
    backgroundColor: '#03C75A', // 네이버 브랜드 그린
  },
  btnText: {
    fontSize: 15,
    fontWeight: '700',
  },
});
