import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Alert } from 'react-native';
import { getAuthTokens, saveAuthTokens, clearAuthTokens } from '../utils/secureStore';
import { client, registerUnauthorizedCallback } from '../api/client';
import { queryClient } from '../api/queryClient';

interface UserProfile {
  id: number;
  name: string;
  provider: string;
  deviceUuid?: string;
  backupKey?: string;
}

interface AuthContextType {
  isLoggedIn: boolean;
  user: UserProfile | null;
  isLoading: boolean;
  loginAnonymously: () => Promise<boolean>;
  getBackupKey: () => Promise<string | null>;
  restoreBackup: (backupKey: string) => Promise<boolean>;
  logout: () => Promise<void>;
  updateNickname: (name: string) => Promise<boolean>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// UUIDv4 Generator (Pure JS to avoid native module dependency issues in Expo Go)
function generateUUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [user, setUser] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const isAuthenticatingRef = useRef(false);

  // 1. 앱 구동 시 기기 UUID 확인 후 익명 로그인 처리
  useEffect(() => {
    const initializeAuth = async () => {
      try {
        const { accessToken } = await getAuthTokens();
        if (accessToken) {
          // 기존 토큰이 있으면 유저 정보 조회 시도
          const success = await fetchUserProfile();
          if (success) {
            setIsLoading(false);
            return;
          }
        }
        
        // 토큰이 없거나 유효하지 않으면 익명 로그인 시도
        await loginAnonymously();
      } catch (e) {
        console.error('Failed to initialize auth state', e);
      } finally {
        setIsLoading(false);
      }
    };

    initializeAuth();

    // Axios client에서 401 재인증 실패 시 강제 재인증(익명) 처리할 콜백 등록
    registerUnauthorizedCallback(async () => {
      await clearAuthTokens();
      await AsyncStorage.removeItem('@backup_key');
      setIsLoggedIn(false);
      setUser(null);
      await loginAnonymously();
    });
  }, []);

  // 사용자 프로필 정보 조회
  const fetchUserProfile = async (): Promise<boolean> => {
    try {
      const response = await client.get<UserProfile>('/api/users/me');
      if (response.data && typeof response.data === 'object') {
        setUser(response.data);
        setIsLoggedIn(true);
        return true;
      }
      return false;
    } catch (e) {
      return false;
    }
  };

  // 익명 로그인 수행
  const loginAnonymously = async (): Promise<boolean> => {
    if (isAuthenticatingRef.current) {
      console.log('Anonymous login already in progress, skipping duplicate request.');
      return false;
    }
    isAuthenticatingRef.current = true;
    try {
      // 1. AsyncStorage에서 기기 UUID 조회 또는 신규 생성
      let deviceUuid = await AsyncStorage.getItem('@device_uuid');
      if (!deviceUuid) {
        deviceUuid = generateUUID();
        await AsyncStorage.setItem('@device_uuid', deviceUuid);
      }

      // 2. 백엔드 익명 인증 API 호출
      const response = await client.post<{ accessToken: string; refreshToken: string; backupKey?: string }>(
        '/api/auth/anonymous',
        { deviceUuid }
      );

      const { accessToken, refreshToken, backupKey } = response.data;
      if (accessToken && refreshToken) {
        await saveAuthTokens(accessToken, refreshToken);
        if (backupKey) {
          await AsyncStorage.setItem('@backup_key', backupKey);
        }
        await fetchUserProfile();
        return true;
      }
      return false;
    } catch (e) {
      console.error('Anonymous login failed', e);
      return false;
    } finally {
      isAuthenticatingRef.current = false;
    }
  };

  // 백업 키 조회 (로컬 저장소에서 직접 조회하도록 하이브리드 적용)
  const getBackupKey = async (): Promise<string | null> => {
    try {
      return await AsyncStorage.getItem('@backup_key');
    } catch (e) {
      console.error('Failed to get backup key from storage', e);
      return null;
    }
  };

  // 백업 복구 수행
  const restoreBackup = async (backupKey: string): Promise<boolean> => {
    setIsLoading(true);
    try {
      let deviceUuid = await AsyncStorage.getItem('@device_uuid');
      if (!deviceUuid) {
        deviceUuid = generateUUID();
        await AsyncStorage.setItem('@device_uuid', deviceUuid);
      }

      const response = await client.post<{ accessToken: string; refreshToken: string; backupKey?: string }>(
        '/api/auth/restore',
        { backupKey, deviceUuid }
      );

      const { accessToken, refreshToken, backupKey: restoredBackupKey } = response.data;
      if (accessToken && refreshToken) {
        await saveAuthTokens(accessToken, refreshToken);
        if (restoredBackupKey) {
          await AsyncStorage.setItem('@backup_key', restoredBackupKey);
        }
        await fetchUserProfile();
        queryClient.invalidateQueries({ queryKey: ['fridges'] });
        Alert.alert('복구 성공 🎉', '이전 기기의 데이터가 정상적으로 복구되었습니다.');
        return true;
      }
      return false;
    } catch (e: any) {
      console.error('Restore failed', e);
      const errMsg = e.response?.data?.message || '유효하지 않은 백업 키이거나 네트워크 오류입니다.';
      Alert.alert('복구 실패 ❌', errMsg);
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  // 로그아웃 (기존 토큰 및 캐시 정리 후 신규 익명 세션 발급)
  const logout = async () => {
    setIsLoading(true);
    try {
      await clearAuthTokens();
      await AsyncStorage.removeItem('@backup_key');
      await AsyncStorage.removeItem('@device_uuid');
      await AsyncStorage.removeItem('@refrigerators');
      await AsyncStorage.removeItem('@ingredients');
      setIsLoggedIn(false);
      setUser(null);
      queryClient.clear();
      await loginAnonymously();
      Alert.alert('초기화 완료', '세션이 안전하게 초기화되었습니다.');
    } catch (e) {
      console.error('Logout / Reset error', e);
    } finally {
      setIsLoading(false);
    }
  };

  const updateNickname = async (name: string): Promise<boolean> => {
    const response = await client.patch<UserProfile>('/api/users/me', { name });
    if (response.data && typeof response.data === 'object') {
      setUser(response.data);
      return true;
    }
    return false;
  };

  return (
    <AuthContext.Provider
      value={{
        isLoggedIn,
        user,
        isLoading,
        loginAnonymously,
        getBackupKey,
        restoreBackup,
        logout,
        updateNickname,
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
