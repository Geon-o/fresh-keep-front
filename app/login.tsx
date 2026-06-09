import React from 'react';
import { StyleSheet, View, Text, TouchableOpacity, ActivityIndicator, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../src/context/AuthContext';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';

export default function LoginScreen() {
  const router = useRouter();
  const { login, loginAsDeveloper, isLoading, isLoggedIn } = useAuth();

  const handleLogin = async (provider: 'google' | 'kakao' | 'naver') => {
    const success = await login(provider);
    if (success) {
      // 로그인 성공 시 메인 대시보드로 이동
      router.replace('/');
    }
  };

  const handleDeveloperLogin = async () => {
    const success = await loginAsDeveloper();
    if (success) {
      router.replace('/');
    }
  };

  const handleSkip = () => {
    // 비로그인 (로컬 모드)로 계속 진행
    router.replace('/');
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="light" />
      
      {/* 백그라운드 디자인 서클 (디자인 완성도 향상) */}
      <View style={styles.bgCircle1} />
      <View style={styles.bgCircle2} />

      <View style={styles.content}>
        {/* 앱 브랜딩 영역 */}
        <View style={styles.brandContainer}>
          <Text style={styles.logoText}>FRESHKEEP</Text>
          <Text style={styles.subtitle}>스마트한 냉장고 식재료 관리 파트너</Text>
        </View>

        {/* 안내 문구 및 카드 */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>간편하게 시작해 보세요</Text>
          <Text style={styles.cardDesc}>
            로그인하면 여러 기기에서 실시간 동기화를 지원하며, 유통기한 알림과 AI 식재료 추천 기능을 완전히 누리실 수 있습니다.
          </Text>

          {isLoading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#6366F1" />
              <Text style={styles.loadingText}>로그인 인증 처리 중...</Text>
            </View>
          ) : (
            <View style={styles.buttonContainer}>
              {/* 카카오 로그인 */}
              <TouchableOpacity
                style={styles.kakaoButton}
                activeOpacity={0.85}
                onPress={() => handleLogin('kakao')}
              >
                <Text style={styles.kakaoIcon}>💬</Text>
                <Text style={styles.kakaoButtonText}>Kakao로 시작하기</Text>
              </TouchableOpacity>

              {/* 네이버 로그인 */}
              <TouchableOpacity
                style={styles.naverButton}
                activeOpacity={0.85}
                onPress={() => handleLogin('naver')}
              >
                <Text style={styles.naverIcon}>🍀</Text>
                <Text style={styles.naverButtonText}>Naver로 시작하기</Text>
              </TouchableOpacity>

              {/* 구글 로그인 */}
              <TouchableOpacity
                style={styles.googleButton}
                activeOpacity={0.85}
                onPress={() => handleLogin('google')}
              >
                <Text style={styles.googleIcon}>🔑</Text>
                <Text style={styles.googleButtonText}>Google로 시작하기</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        <View style={styles.footerContainer}>
          {/* 비로그인 건너뛰기 버튼 */}
          <TouchableOpacity
            style={styles.skipButton}
            activeOpacity={0.7}
            onPress={handleSkip}
            disabled={isLoading}
          >
            <Text style={styles.skipButtonText}>로그인 없이 로컬 모드로 계속하기 〉</Text>
          </TouchableOpacity>

          {/* 개발자용 테스트 로그인 버튼 */}
          <TouchableOpacity
            style={styles.devLoginButton}
            activeOpacity={0.7}
            onPress={handleDeveloperLogin}
            disabled={isLoading}
          >
            <Text style={styles.devLoginButtonText}>🔧 테스트 계정으로 로그인 (개발자용)</Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F172A', // 딥 메탈릭 네이비/슬레이트
  },
  bgCircle1: {
    position: 'absolute',
    top: -50,
    right: -50,
    width: 250,
    height: 250,
    borderRadius: 125,
    backgroundColor: 'rgba(99, 102, 241, 0.12)', // 연한 인디고 서클
  },
  bgCircle2: {
    position: 'absolute',
    bottom: -100,
    left: -100,
    width: 300,
    height: 300,
    borderRadius: 150,
    backgroundColor: 'rgba(59, 130, 246, 0.1)', // 연한 블루 서클
  },
  content: {
    flex: 1,
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingVertical: 48,
  },
  brandContainer: {
    alignItems: 'center',
    marginTop: 60,
  },
  logoText: {
    fontSize: 36,
    fontWeight: '900',
    color: '#F8FAFC',
    letterSpacing: 2,
    ...Platform.select({
      ios: { fontFamily: 'System' },
      android: { fontFamily: 'sans-serif-black' },
    }),
  },
  subtitle: {
    fontSize: 14,
    color: '#94A3B8',
    marginTop: 8,
    fontWeight: '500',
  },
  card: {
    backgroundColor: 'rgba(30, 41, 59, 0.7)', // 반투명 다크 그레이
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 24,
    padding: 28,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 8,
    marginVertical: 40,
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#F8FAFC',
    textAlign: 'center',
    marginBottom: 12,
  },
  cardDesc: {
    fontSize: 13,
    color: '#94A3B8',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 28,
  },
  loadingContainer: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 13,
    color: '#94A3B8',
  },
  buttonContainer: {
    gap: 12,
  },
  kakaoButton: {
    flexDirection: 'row',
    height: 52,
    backgroundColor: '#FEE500', // 카카오 브랜드 옐로우
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#FEE500',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 2,
  },
  kakaoIcon: {
    fontSize: 18,
    marginRight: 10,
  },
  kakaoButtonText: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#191919',
  },
  googleButton: {
    flexDirection: 'row',
    height: 52,
    backgroundColor: '#FFFFFF', // 구글 브랜드 화이트
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  googleIcon: {
    fontSize: 16,
    marginRight: 10,
  },
  googleButtonText: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#334155',
  },
  naverButton: {
    flexDirection: 'row',
    height: 52,
    backgroundColor: '#03C75A', // 네이버 브랜드 그린
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#03C75A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 2,
  },
  naverIcon: {
    fontSize: 18,
    marginRight: 10,
  },
  naverButtonText: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  skipButton: {
    alignSelf: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  skipButtonText: {
    fontSize: 13,
    color: '#64748B', // 뮤트 실버 그레이
    fontWeight: '600',
    textAlign: 'center',
  },
  footerContainer: {
    alignItems: 'center',
    gap: 16,
  },
  devLoginButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  devLoginButtonText: {
    fontSize: 12,
    color: '#94A3B8',
    fontWeight: '600',
  },
});
