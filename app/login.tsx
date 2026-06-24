import React, { useEffect, useRef } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, ActivityIndicator, Platform, Animated, Easing } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../src/context/AuthContext';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useTheme } from '../src/context/ThemeContext';

export default function LoginScreen() {
  const router = useRouter();
  const { isLoading, isLoggedIn } = useAuth();
  const login = async (provider: string) => false;
  const loginAsDeveloper = async () => false;
  const { theme, isDark } = useTheme();

  // Floating bubble animations
  const bubble1XY = useRef(new Animated.ValueXY({ x: 0, y: 0 })).current;
  const bubble2XY = useRef(new Animated.ValueXY({ x: 0, y: 0 })).current;
  const bubble3XY = useRef(new Animated.ValueXY({ x: 0, y: 0 })).current;

  useEffect(() => {
    const createDrift = (value: Animated.ValueXY, config: { x: number[]; y: number[]; duration: number }) => {
      const { x, y, duration } = config;
      return Animated.loop(
        Animated.sequence([
          Animated.timing(value, {
            toValue: { x: x[0], y: y[0] },
            duration: duration,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(value, {
            toValue: { x: x[1], y: y[1] },
            duration: duration * 1.3,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(value, {
            toValue: { x: 0, y: 0 },
            duration: duration * 0.8,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
        ])
      );
    };

    const anim1 = createDrift(bubble1XY, { x: [25, -15], y: [-30, 20], duration: 8000 });
    const anim2 = createDrift(bubble2XY, { x: [-35, 20], y: [25, -25], duration: 11000 });
    const anim3 = createDrift(bubble3XY, { x: [20, -30], y: [-15, 35], duration: 9500 });

    Animated.parallel([anim1, anim2, anim3]).start();

    return () => {
      anim1.stop();
      anim2.stop();
      anim3.stop();
    };
  }, []);

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
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      
      {/* 백그라운드 디자인 서클 (디자인 완성도 향상 - 부유하는 버블 연출) */}
      <Animated.View 
        style={[
          styles.bgCircle1, 
          { 
            backgroundColor: isDark ? 'rgba(56, 189, 248, 0.08)' : 'rgba(14, 165, 233, 0.08)',
            transform: bubble1XY.getTranslateTransform()
          }
        ]} 
      />
      <Animated.View 
        style={[
          styles.bgCircle2, 
          { 
            backgroundColor: isDark ? 'rgba(56, 189, 248, 0.04)' : 'rgba(14, 165, 233, 0.04)',
            transform: bubble2XY.getTranslateTransform()
          }
        ]} 
      />
      <Animated.View 
        style={[
          styles.bgCircle3, 
          { 
            backgroundColor: isDark ? 'rgba(99, 102, 241, 0.05)' : 'rgba(99, 102, 241, 0.05)',
            transform: bubble3XY.getTranslateTransform()
          }
        ]} 
      />

      <View style={styles.content}>
        {/* 중앙 정렬용 그룹 래퍼 */}
        <View style={styles.mainContainer}>
          {/* 앱 브랜딩 영역 */}
          <View style={styles.brandContainer}>
            <View style={[styles.logoIconContainer, { backgroundColor: theme.primaryLight }]}>
              <Text style={styles.logoIconEmoji}>❄️</Text>
            </View>
            <Text style={[styles.logoText, { color: theme.textPrimary }]}>FRESHKEEP</Text>
            <Text style={[styles.subtitle, { color: theme.textSecondary }]}>스마트한 냉장고 식재료 관리 파트너</Text>
          </View>

          {/* 소셜 로그인 카드 */}
          <View style={[
            styles.card, 
            { 
              backgroundColor: theme.glassBg, 
              borderColor: theme.glassBorder, 
              shadowColor: theme.shadow 
            }
          ]}>
            {isLoading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={theme.primary} />
                <Text style={[styles.loadingText, { color: theme.textTertiary }]}>로그인 인증 처리 중...</Text>
              </View>
            ) : (
              <View style={styles.buttonContainer}>
                {/* 카카오 로그인 */}
                <TouchableOpacity
                  style={[styles.kakaoButton, { backgroundColor: theme.kakao, shadowColor: theme.kakao }]}
                  activeOpacity={0.85}
                  onPress={() => handleLogin('kakao')}
                >
                  <Text style={styles.kakaoIcon}>💬</Text>
                  <Text style={[styles.kakaoButtonText, { color: theme.kakaoText }]}>Kakao로 시작하기</Text>
                </TouchableOpacity>

                {/* 네이버 로그인 */}
                <TouchableOpacity
                  style={[styles.naverButton, { backgroundColor: theme.naver, shadowColor: theme.naver }]}
                  activeOpacity={0.85}
                  onPress={() => handleLogin('naver')}
                >
                  <Text style={styles.naverIcon}>🍀</Text>
                  <Text style={[styles.naverButtonText, { color: theme.naverText }]}>Naver로 시작하기</Text>
                </TouchableOpacity>

                {/* 구글 로그인 */}
                <TouchableOpacity
                  style={[styles.googleButton, { backgroundColor: theme.surface, borderColor: theme.border, shadowColor: theme.shadow }]}
                  activeOpacity={0.85}
                  onPress={() => handleLogin('google')}
                >
                  <Text style={styles.googleIcon}>🔑</Text>
                  <Text style={[styles.googleButtonText, { color: theme.textSecondary }]}>Google로 시작하기</Text>
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
            <Text style={[styles.backButtonText, { color: theme.primaryText }]}>로그인하지 않고 돌아가기 〉</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.footerContainer}>
          {/* 개발자용 테스트 로그인 버튼 */}
          <TouchableOpacity
            style={[styles.devLoginButton, { backgroundColor: theme.surfaceTertiary, borderColor: theme.borderLight }]}
            activeOpacity={0.7}
            onPress={handleDeveloperLogin}
            disabled={isLoading}
          >
            <Text style={[styles.devLoginButtonText, { color: theme.textSecondary }]}>🔧 테스트 계정으로 로그인 (개발자용)</Text>
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
  },
  bgCircle2: {
    position: 'absolute',
    bottom: -100,
    left: -100,
    width: 300,
    height: 300,
    borderRadius: 150,
  },
  bgCircle3: {
    position: 'absolute',
    top: '40%',
    left: '70%',
    width: 180,
    height: 180,
    borderRadius: 90,
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
  logoIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.08,
        shadowRadius: 8,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  logoIconEmoji: {
    fontSize: 32,
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
