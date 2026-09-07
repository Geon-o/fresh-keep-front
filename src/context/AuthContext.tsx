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
  authFailed: boolean;
  loginAnonymously: () => Promise<boolean>;
  getBackupKey: () => Promise<string | null>;
  restoreBackup: (backupKey: string) => Promise<boolean>;
  deleteAccount: () => Promise<void>;
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
  const [authFailed, setAuthFailed] = useState(false);
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
            setAuthFailed(false);
            setIsLoading(false);
            return;
          }
        }

        // 토큰이 없거나 유효하지 않으면 익명 로그인 시도
        await loginAnonymously();
      } catch (e) {
        console.error('Failed to initialize auth state', e);
        setAuthFailed(true);
      } finally {
        setIsLoading(false);
      }
    };

    initializeAuth();

    // Axios client에서 401 재인증 실패 시 강제 재인증(익명) 처리할 콜백 등록
    registerUnauthorizedCallback(async () => {
      await clearAuthTokens();
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
        setAuthFailed(false);
        return true;
      }
      setAuthFailed(true);
      return false;
    } catch (e) {
      console.error('Anonymous login failed', e);
      setAuthFailed(true);
      return false;
    } finally {
      isAuthenticatingRef.current = false;
    }
  };

  // 연동 코드 조회: 우선 로컬(@backup_key)에서 읽고, 없으면 서버에서 비파괴적으로 재발급받는다.
  // (데이터는 그대로 유지되며, 재발급 시 이전 코드는 무효화된다. '초기화(완전 삭제)'와는 무관하다.)
  const getBackupKey = async (): Promise<string | null> => {
    try {
      const local = await AsyncStorage.getItem('@backup_key');
      if (local) return local;

      // 로컬에 연동 코드가 없으면 서버에서 새 코드를 발급받아 저장 후 반환한다.
      const response = await client.post<{ backupKey?: string }>('/api/auth/backup-key/reissue');
      const reissued = response.data?.backupKey ?? null;
      if (reissued) {
        await AsyncStorage.setItem('@backup_key', reissued);
      }
      return reissued;
    } catch (e) {
      console.error('Failed to get/reissue link code', e);
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
        Alert.alert('불러오기 성공 🎉', '이전 기기의 데이터를 정상적으로 불러왔습니다.');
        return true;
      }
      return false;
    } catch (e: any) {
      console.error('Restore failed', e);
      const errMsg = e.response?.data?.message || '유효하지 않은 연동 코드이거나 네트워크 오류입니다.';
      Alert.alert('불러오기 실패 ❌', errMsg);
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  // 계정 완전 삭제(초기화): 서버 계정/데이터를 삭제하고 로컬을 비운 뒤 새 익명 세션을 발급한다.
  // '로그아웃'이 아니라 회원탈퇴에 해당하는 파괴적 작업이다. 기기 이전이 목적이라면 restoreBackup을 사용한다.
  const deleteAccount = async () => {
    setIsLoading(true);
    let serverDeleteSucceeded = false;
    try {
      try {
        await client.delete('/api/users/me');
        serverDeleteSucceeded = true;
      } catch (apiErr) {
        console.error('Backend user delete API request failed:', apiErr);
      }

      await clearAuthTokens();
      await AsyncStorage.removeItem('@backup_key');
      await AsyncStorage.removeItem('@device_uuid');
      await AsyncStorage.removeItem('@refrigerators');
      await AsyncStorage.removeItem('@ingredients');
      setIsLoggedIn(false);
      setUser(null);
      queryClient.clear();
      await loginAnonymously();

      if (serverDeleteSucceeded) {
        Alert.alert('초기화 완료', '계정이 완전히 삭제되고 안전하게 초기화되었습니다.');
      } else {
        Alert.alert(
          '일부만 완료됨 ⚠️',
          '이 기기의 데이터는 초기화됐지만, 서버에서 계정 삭제 요청이 실패했습니다. 네트워크 상태를 확인한 뒤 설정에서 다시 시도해 주세요.'
        );
      }
    } catch (e) {
      console.error('Account delete / reset error', e);
    } finally {
      setIsLoading(false);
    }
  };

  const updateNickname = async (name: string): Promise<boolean> => {
    const response = await client.patch<UserProfile>('/api/users/me', { name });
    if (response.data && typeof response.data === 'object') {
      setUser(response.data);
      queryClient.invalidateQueries({ queryKey: ['fridges'] });
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
        authFailed,
        loginAnonymously,
        getBackupKey,
        restoreBackup,
        deleteAccount,
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
