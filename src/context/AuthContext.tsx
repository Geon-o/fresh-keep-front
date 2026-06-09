import React, { createContext, useContext, useState, useEffect } from 'react';
import * as WebBrowser from 'expo-web-browser';
import * as Linking from 'expo-linking';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Alert } from 'react-native';
import { getAuthTokens, saveAuthTokens, clearAuthTokens } from '../utils/secureStore';
import { client, registerUnauthorizedCallback } from '../api/client';
import { queryClient } from '../api/queryClient';

// 인앱 브라우저 로그인 세션이 리다이렉션을 제대로 수신할 수 있도록 필수 호출
WebBrowser.maybeCompleteAuthSession();

interface UserProfile {
  id: number;
  email: string;
  name: string;
  provider: string;
}

interface AuthContextType {
  isLoggedIn: boolean;
  user: UserProfile | null;
  isLoading: boolean;
  login: (provider: 'google' | 'kakao' | 'naver') => Promise<boolean>;
  loginAsDeveloper: () => Promise<boolean>;
  logout: () => Promise<void>;
  syncLocalDataToServer: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// JWT payload 디코딩 유틸리티 (안정적인 Base64 디코더 탑재)
function parseJwt(token: string) {
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    
    // React Native 호환형 base64 디코딩 구현
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
    const lookup = new Uint8Array(256);
    for (let i = 0; i < chars.length; i++) {
      lookup[chars.charCodeAt(i)] = i;
    }
    
    let bufferLength = base64.length * 0.75;
    if (base64[base64.length - 1] === '=') {
      bufferLength--;
      if (base64[base64.length - 2] === '=') {
        bufferLength--;
      }
    }
    
    const bytes = new Uint8Array(bufferLength);
    let p = 0;
    for (let i = 0; i < base64.length; i += 4) {
      const base64_1 = lookup[base64.charCodeAt(i)];
      const base64_2 = lookup[base64.charCodeAt(i + 1)];
      const base64_3 = lookup[base64.charCodeAt(i + 2)];
      const base64_4 = lookup[base64.charCodeAt(i + 3)];
      
      bytes[p++] = (base64_1 << 2) | (base64_2 >> 4);
      if (p < bufferLength) bytes[p++] = ((base64_2 & 15) << 4) | (base64_3 >> 2);
      if (p < bufferLength) bytes[p++] = ((base64_3 & 3) << 6) | (base64_4 & 63);
    }
    
    const utf8Decoder = new TextDecoder('utf-8');
    const decodedStr = utf8Decoder.decode(bytes);
    return JSON.parse(decodedStr);
  } catch (e) {
    console.warn('JWT Decode failed, falling back to empty profile values', e);
    return null;
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [user, setUser] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // 1. 앱 구동 시 SecureStore에서 토큰을 읽어 로그인 상태 복원
  useEffect(() => {
    const initializeAuth = async () => {
      try {
        const { accessToken } = await getAuthTokens();
        if (accessToken) {
          // 서버로 내 정보 요청 (/api/users/me)
          await fetchUserProfile(accessToken);
        }
      } catch (e) {
        console.error('Failed to initialize auth state', e);
      } finally {
        setIsLoading(false);
      }
    };

    initializeAuth();

    // Axios client에서 401 재인증 실패 시 강제 로그아웃 처리할 콜백 등록
    registerUnauthorizedCallback(() => {
      handleForceLogout();
    });
  }, []);

  const handleForceLogout = () => {
    setIsLoggedIn(false);
    setUser(null);
    queryClient.clear();
    Alert.alert('세션 만료', '로그인 세션이 만료되었습니다. 다시 로그인해 주세요.');
  };

  // 사용자 프로필 정보 조회
  const fetchUserProfile = async (token: string) => {
    try {
      const response = await client.get<UserProfile>('/api/users/me');
      setUser(response.data);
      setIsLoggedIn(true);
    } catch (e) {
      console.warn('Failed to fetch user profile from server, trying to extract from JWT', e);
      
      // 서버에서 프로필 조회가 불가능하거나 엔드포인트가 임시일 경우 JWT에서 디코딩 복구 시도
      const decoded = parseJwt(token);
      if (decoded) {
        setUser({
          id: decoded.id || 0,
          email: decoded.email || '',
          name: decoded.name || decoded.sub || '사용자',
          provider: decoded.provider || 'google',
        });
        setIsLoggedIn(true);
      } else {
        // 둘 다 실패 시 토큰 파기
        await clearAuthTokens();
        setIsLoggedIn(false);
        setUser(null);
      }
    }
  };

  // 2. OAuth2 로그인 실행 (Google / Kakao / Naver)
  const login = async (provider: 'google' | 'kakao' | 'naver'): Promise<boolean> => {
    setIsLoading(true);
    try {
      // 리다이렉트 스키마 URL 생성 (예: freshkeep://oauth-callback)
      const redirectUrl = Linking.createURL('oauth-callback');
      const apiBaseUrl = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:8086';
      
      // 백엔드 OAuth2 진입 주소 구성
      const authUrl = `${apiBaseUrl}/oauth2/authorization/${provider}?redirect_uri=${encodeURIComponent(redirectUrl)}`;
      
      console.log(`Starting OAuth2 flow with [${provider}]. Auth URL:`, authUrl);
      console.log('Redirect URI:', redirectUrl);

      // 인앱 브라우저 로그인 실행
      const result = await WebBrowser.openAuthSessionAsync(authUrl, redirectUrl);

      if (result.type === 'success' && result.url) {
        // 리다이렉트 결과 URL 파싱
        const parsed = Linking.parse(result.url);
        const accessToken = (parsed.queryParams?.accessToken || parsed.queryParams?.token) as string;
        const refreshToken = parsed.queryParams?.refreshToken as string;

        if (accessToken && refreshToken) {
          // 토큰 안전 저장
          await saveAuthTokens(accessToken, refreshToken);
          // 프로필 정보 로드
          await fetchUserProfile(accessToken);

          // 로그인 직후 데이터 마이그레이션 안내 띄우기
          setTimeout(() => {
            promptDataSync();
          }, 600);

          return true;
        } else {
          console.error('Failed to extract tokens from redirect URL:', result.url);
          Alert.alert('로그인 오류', '로그인 성공 후 토큰을 전달받지 못했습니다.');
          return false;
        }
      } else if (result.type === 'cancel') {
        console.log('OAuth2 flow cancelled by user.');
        return false;
      } else {
        console.error('OAuth2 flow failed. Result type:', result.type);
        Alert.alert('로그인 실패', '로그인 처리 과정에서 에러가 발생했습니다.');
        return false;
      }
    } catch (e) {
      console.error('OAuth2 login flow error', e);
      Alert.alert('오류', '로그인 시도 중 오류가 발생했습니다.');
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  // 3. 로그아웃 처리
  const logout = async () => {
    setIsLoading(true);
    try {
      // SecureStore 비우기
      await clearAuthTokens();
      setIsLoggedIn(false);
      setUser(null);
      
      // React Query 캐시 비우기
      queryClient.clear();
      Alert.alert('로그아웃', '정상적으로 로그아웃되었습니다.');
    } catch (e) {
      console.error('Logout error', e);
    } finally {
      setIsLoading(false);
    }
  };

  // 4. 로컬 데이터를 서버로 마이그레이션(동기화) 유도
  const promptDataSync = async () => {
    try {
      const storedFridges = await AsyncStorage.getItem('@refrigerators');
      if (storedFridges) {
        const fridgesList = JSON.parse(storedFridges);
        if (fridgesList.length > 0) {
          Alert.alert(
            '데이터 동기화',
            `현재 스마트폰에 저장된 ${fridgesList.length}개의 냉장고 데이터를 서버 계정으로 이전하시겠습니까? (서버에 자동 동기화되며, 이후 여러 기기에서 동시 확인이 가능합니다.)`,
            [
              { text: '나중에', style: 'cancel' },
              { text: '동기화 진행', onPress: () => syncLocalDataToServer() }
            ]
          );
        }
      }
    } catch (e) {
      console.error('Error checking local data for sync', e);
    }
  };

  // 실제 로컬 데이터를 백엔드 서버에 업로드 동기화
  const syncLocalDataToServer = async () => {
    setIsLoading(true);
    try {
      const storedFridges = await AsyncStorage.getItem('@refrigerators');
      const storedIngredients = await AsyncStorage.getItem('@ingredients');

      if (!storedFridges) return;

      const fridgesList = JSON.parse(storedFridges);
      const ingredientsList = storedIngredients ? JSON.parse(storedIngredients) : [];

      console.log('Starting data synchronization to server...');

      for (const localFridge of fridgesList) {
        // 1. 서버에 냉장고 생성
        const fridgeRes = await client.post('/api/fridges', {
          name: localFridge.name,
          type: localFridge.type === 'side-by-side' ? 'SIDE_BY_SIDE' : 
                localFridge.type === 'two-door' ? 'TWO_DOOR' : 'FOUR_DOOR'
        });
        const serverFridgeId = fridgeRes.data.id;

        // 2. 서버에서 자동 생성된 구획(layouts) 조회하여 매핑
        const layoutRes = await client.get(`/api/fridges/${serverFridgeId}/layouts`);
        const serverCompartments = layoutRes.data.compartments;

        // 3. 해당 냉장고에 소속된 로컬 식재료들을 알맞은 구획에 순차 등록
        const localFridgeIngredients = ingredientsList.filter(
          (ing: any) => ing.fridgeId === localFridge.id
        );

        for (const ing of localFridgeIngredients) {
          // 로컬 location 이름에 맞는 서버 구획 매핑
          // 예: local location 'fridge_left' -> 서버 name '상단 좌측 냉장실' or '냉장실' 매핑 매칭
          let targetServerCompartment = serverCompartments.find((comp: any) => {
            if (ing.location.includes('left') && comp.name.includes('좌')) return true;
            if (ing.location.includes('right') && comp.name.includes('우')) return true;
            if (ing.location === 'fridge' && comp.storageType === 'REFRIGERATED') return true;
            if (ing.location === 'freezer' && comp.storageType === 'FROZEN') return true;
            return false;
          });

          // 매치되지 않는 경우 첫 번째 구획에 삽입
          if (!targetServerCompartment && serverCompartments.length > 0) {
            targetServerCompartment = serverCompartments[0];
          }

          if (targetServerCompartment) {
            await client.post('/api/ingredients', {
              compartmentId: targetServerCompartment.id,
              name: ing.name,
              quantity: Number(ing.quantity),
              unit: ing.unit,
              expirationDate: ing.expiryDate,
              memo: ing.memo || '',
            });
          }
        }
      }

      // 동기화가 끝나면 로컬 데이터 정리
      await AsyncStorage.removeItem('@refrigerators');
      await AsyncStorage.removeItem('@ingredients');

      // 캐시 갱신
      queryClient.invalidateQueries({ queryKey: ['fridges'] });
      
      Alert.alert('동기화 완료', '모든 로컬 데이터가 안전하게 서버로 전송되어 동기화되었습니다!');
    } catch (e) {
      console.error('Data synchronization failed', e);
      Alert.alert('동기화 실패', '데이터 동기화 도중 오류가 발생했습니다. 다시 시도해 주세요.');
    } finally {
      setIsLoading(false);
    }
  };

  // 개발자용 모의 로그인 (서버가 아직 준비되지 않았을 때 테스트용)
  const loginAsDeveloper = async (): Promise<boolean> => {
    setIsLoading(true);
    try {
      // {"id":1,"email":"testuser@freshkeep.com","name":"개발자 테스트 유저","provider":"developer"}
      const mockToken = "eyJhbGciOiJIUzI1NiJ9.eyJpZCI6MSwiZW1haWwiOiJ0ZXN0dXNlckBmcmVzaGtlZXAuY29tIiwibmFtZSI6IuuMgOydtOqzoCDthYzsiqTtirgg7Jyg7KCAIiwicHJvdmlkZXIiOiJkZXZlbG9wZXIifQ.mock_signature";
      await saveAuthTokens(mockToken, 'mock_refresh_token');
      
      setUser({
        id: 1,
        email: 'testuser@freshkeep.com',
        name: '개발자 테스트 유저',
        provider: 'developer',
      });
      setIsLoggedIn(true);

      setTimeout(() => {
        promptDataSync();
      }, 600);

      return true;
    } catch (e) {
      console.error(e);
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        isLoggedIn,
        user,
        isLoading,
        login,
        loginAsDeveloper,
        logout,
        syncLocalDataToServer,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
