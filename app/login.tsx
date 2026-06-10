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
      if (router.canGoBack()) {
        router.back();
      } else {
        router.replace('/');
      }
    }
  };

  const handleDeveloperLogin = async () => {
    const success = await loginAsDeveloper();
    if (success) {
      if (router.canGoBack()) {
        router.back();
      } else {
        router.replace('/');
      }
    }
  };


  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="dark" />
      
      {/* 백그라운드 디자인 서클 (디자인 완성도 향상) */}
      <View style={styles.bgCircle1} />
      <View style={styles.bgCircle2} />

      <View style={styles.content}>
        {/* 중앙 정렬용 그룹 래퍼 */}
        <View style={styles.mainContainer}>
          {/* 앱 브랜딩 영역 */}
          <View style={styles.brandContainer}>
            <Text style={styles.logoText}>FRESHKEEP</Text>
            <Text style={styles.subtitle}>스마트한 냉장고 식재료 관리 파트너</Text>
          </View>

          {/* 소셜 로그인 카드 */}
          <View style={styles.card}>
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

          {/* 돌아가기 버튼 (로그인 카드 바로 아래 배치) */}
          <TouchableOpacity
            style={styles.backButton}
            activeOpacity={0.7}
            onPress={() => {
              if (router.canGoBack()) {
                router.back();
              } else {
                router.replace('/');
              }
            }}
          >
            <Text style={styles.backButtonText}>로그인하지 않고 돌아가기 〉</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.footerContainer}>
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
    backgroundColor: '#F8FAFC', // 깔끔한 슬레이트 화이트 (라이트 테마로 일치화)
  },
  bgCircle1: {
    position: 'absolute',
    top: -50,
    right: -50,
    width: 250,
    height: 250,
    borderRadius: 125,
    backgroundColor: 'rgba(99, 102, 241, 0.05)', // 은은한 인디고 글로우
  },
  bgCircle2: {
    position: 'absolute',
    bottom: -100,
    left: -100,
    width: 300,
    height: 300,
    borderRadius: 150,
    backgroundColor: 'rgba(59, 130, 246, 0.04)', // 은은한 블루 글로우
  },
  mainContainer: {
    flex: 1,
    justifyContent: 'center',
    width: '100%',
  },
  backButton: {
    alignSelf: 'center',
    paddingVertical: 12,
    paddingHorizontal: 20,
    marginTop: 8, // 카드 바로 밑으로 왔을 때 밸런스를 위한 상단 마진
  },
  backButtonText: {
    fontSize: 13,
    color: '#4F46E5', // 인디고 텍스트
    fontWeight: '600',
    textAlign: 'center',
  },
  content: {
    flex: 1,
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingVertical: 24, // 세로 스페이스 밸런스 조정
  },
  brandContainer: {
    alignItems: 'center',
    marginBottom: 28, // 로고와 카드 사이 적절한 거리
  },
  logoText: {
    fontSize: 36,
    fontWeight: '900',
    color: '#0F172A', // 다크 슬레이트
    letterSpacing: 2,
    ...Platform.select({
      ios: { fontFamily: 'System' },
      android: { fontFamily: 'sans-serif-black' },
    }),
  },
  subtitle: {
    fontSize: 14,
    color: '#475569', // 슬레이트 그레이
    marginTop: 8,
    fontWeight: '500',
  },
  card: {
    backgroundColor: '#FFFFFF', // 깔끔한 화이트 카드
    borderWidth: 1,
    borderColor: '#E2E8F0', // 연한 보더
    borderRadius: 24,
    padding: 28,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.06, // 은은한 그림자
    shadowRadius: 16,
    elevation: 4,
    marginBottom: 8, // 카드와 돌아가기 버튼 사이 간격 최소화
  },
  loadingContainer: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 13,
    color: '#64748B',
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
    shadowOpacity: 0.05,
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

  footerContainer: {
    alignItems: 'center',
    gap: 16,
  },
  devLoginButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 10,
    backgroundColor: '#F1F5F9', // 연한 회색 배경
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  devLoginButtonText: {
    fontSize: 12,
    color: '#475569',
    fontWeight: '600',
  },
});
