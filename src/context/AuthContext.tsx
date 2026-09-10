import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Alert, Platform } from 'react-native';
import { GoogleSignin, isSuccessResponse, isErrorWithCode, statusCodes } from '@react-native-google-signin/google-signin';
import NaverLogin from '@react-native-seoul/naver-login';
import { getAuthTokens, saveAuthTokens, clearAuthTokens } from '../utils/secureStore';
import { client, registerUnauthorizedCallback } from '../api/client';
import { queryClient } from '../api/queryClient';

interface UserProfile {
  id: number;
  name: string;
  provider: string; // 'anonymous' | 'google' | 'naver'
  deviceUuid?: string;
  backupKey?: string;
}

// 소셜 로그인 결과. conflict는 "이 기기의 게스트 데이터 vs 기존 소셜 계정 데이터" 충돌(B안: 사용자에게 물어봄).
export type SocialLoginResult =
  | { status: 'success' }
  | { status: 'cancelled' }
  | { status: 'conflict'; conflictToken: string }
  | { status: 'error'; message?: string };

const isSocialProvider = (p?: string) => p === 'google' || p === 'naver';

interface AuthContextType {
  isLoggedIn: boolean;
  user: UserProfile | null;
  isLoading: boolean;
  authFailed: boolean;
  // 소셜 사용자 세션이 완전히 만료돼(리프레시까지 실패) 재로그인이 필요한 상태. 익명은 조용히 복구되므로 false 유지.
  sessionExpired: boolean;
  clearSessionExpired: () => void;
  loginAnonymously: () => Promise<boolean>;
  loginWithGoogle: () => Promise<SocialLoginResult>;
  loginWithNaver: () => Promise<SocialLoginResult>;
  // conflict 응답 후 사용자가 고른 전략으로 최종 확정 ('merge' | 'account')
  resolveSocialConflict: (conflictToken: string, strategy: 'merge' | 'account') => Promise<boolean>;
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
  const [sessionExpired, setSessionExpired] = useState(false);
  const isAuthenticatingRef = useRef(false);
  // 401 콜백은 한 번만 등록되므로, 최신 user를 클로저 밖에서 참조하려고 ref로 미러링한다.
  const userRef = useRef<UserProfile | null>(null);
  useEffect(() => {
    userRef.current = user;
  }, [user]);

  // 소셜 SDK 초기화 (네이티브 전용). 웹에서는 건너뛴다.
  useEffect(() => {
    if (Platform.OS === 'web') return;
    try {
      GoogleSignin.configure({ webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID });
      NaverLogin.initialize({
        appName: '냉장고집사',
        consumerKey: process.env.EXPO_PUBLIC_NAVER_CLIENT_ID ?? '',
        consumerSecret: process.env.EXPO_PUBLIC_NAVER_CLIENT_SECRET ?? '',
        serviceUrlSchemeIOS: process.env.EXPO_PUBLIC_NAVER_URL_SCHEME,
        disableNaverAppAuthIOS: true,
      });
    } catch (e) {
      console.error('Failed to init social SDKs', e);
    }
  }, []);

  const clearSessionExpired = () => setSessionExpired(false);

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

    // Axios client에서 리프레시까지 실패(세션 완전 만료) 시 처리할 콜백 등록.
    // provider-aware: 소셜 사용자는 조용히 익명으로 강등하면 "내 데이터가 사라진" 것처럼 보이므로
    // 재로그인을 유도한다. 익명 사용자는 @device_uuid로 같은 계정이 복구되니 조용히 재익명한다.
    registerUnauthorizedCallback(async () => {
      await clearAuthTokens();
      setIsLoggedIn(false);
      setUser(null);
      if (isSocialProvider(userRef.current?.provider)) {
        userRef.current = null;
        setSessionExpired(true); // UI가 "로그인이 풀렸어요 [다시 로그인]" 안내를 띄운다
      } else {
        userRef.current = null;
        await loginAnonymously();
      }
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
        queryClient.invalidateQueries(); // 계정/표시이름이 바뀌면 레이아웃 캐시(식재료·등록자명)까지 전부 새로 받는다
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

  // 기기 UUID를 조회하거나 없으면 생성한다. (익명 계정 매핑 키)
  const getOrCreateDeviceUuid = async (): Promise<string> => {
    let deviceUuid = await AsyncStorage.getItem('@device_uuid');
    if (!deviceUuid) {
      deviceUuid = generateUUID();
      await AsyncStorage.setItem('@device_uuid', deviceUuid);
    }
    return deviceUuid;
  };

  // 서버가 내려준 토큰/백업키를 저장하고 프로필을 갱신한다. (로그인/복구/충돌해결 공통)
  const applyAuthResult = async (data: { accessToken?: string; refreshToken?: string; backupKey?: string }): Promise<boolean> => {
    if (data.accessToken && data.refreshToken) {
      await saveAuthTokens(data.accessToken, data.refreshToken);
      if (data.backupKey) {
        await AsyncStorage.setItem('@backup_key', data.backupKey);
      }
      setSessionExpired(false);
      await fetchUserProfile();
      queryClient.invalidateQueries(); // 계정/표시이름이 바뀌면 레이아웃 캐시(식재료·등록자명)까지 전부 새로 받는다
      return true;
    }
    return false;
  };

  // 소셜 자격증명을 백엔드로 보내 로그인/링크한다.
  // 백엔드 계약:
  //   POST /api/auth/social/{google|naver}  body: { idToken|accessToken, deviceUuid }
  //   응답 A(정상): { accessToken, refreshToken, backupKey? }
  //   응답 B(충돌): { conflict: true, conflictToken }  ← 이 기기 게스트 데이터 vs 기존 소셜계정 데이터
  const postSocial = async (
    path: '/api/auth/social/google' | '/api/auth/social/naver',
    payload: Record<string, unknown>
  ): Promise<SocialLoginResult> => {
    const deviceUuid = await getOrCreateDeviceUuid();
    const response = await client.post<{ conflict?: boolean; conflictToken?: string; accessToken?: string; refreshToken?: string; backupKey?: string }>(
      path,
      { ...payload, deviceUuid }
    );
    if (response.data?.conflict && response.data.conflictToken) {
      return { status: 'conflict', conflictToken: response.data.conflictToken };
    }
    const ok = await applyAuthResult(response.data);
    return ok ? { status: 'success' } : { status: 'error' };
  };

  const loginWithGoogle = async (): Promise<SocialLoginResult> => {
    if (Platform.OS === 'web') return { status: 'error', message: '웹에서는 지원하지 않습니다.' };
    try {
      await GoogleSignin.hasPlayServices();
      const res = await GoogleSignin.signIn();
      if (!isSuccessResponse(res)) return { status: 'cancelled' };
      const idToken = res.data.idToken;
      if (!idToken) return { status: 'error', message: 'idToken을 받지 못했습니다.' };
      return await postSocial('/api/auth/social/google', { idToken });
    } catch (e: any) {
      if (isErrorWithCode(e) && e.code === statusCodes.SIGN_IN_CANCELLED) {
        return { status: 'cancelled' };
      }
      console.error('Google login failed', e);
      return { status: 'error', message: e?.response?.data?.message };
    }
  };

  const loginWithNaver = async (): Promise<SocialLoginResult> => {
    if (Platform.OS === 'web') return { status: 'error', message: '웹에서는 지원하지 않습니다.' };
    try {
      const res = await NaverLogin.login();
      if (!res.isSuccess || !res.successResponse) {
        return { status: res.failureResponse?.isCancel ? 'cancelled' : 'error', message: res.failureResponse?.message };
      }
      return await postSocial('/api/auth/social/naver', { accessToken: res.successResponse.accessToken });
    } catch (e: any) {
      console.error('Naver login failed', e);
      return { status: 'error', message: e?.response?.data?.message };
    }
  };

  // 충돌 응답(B) 후 사용자가 고른 전략으로 최종 확정.
  // 백엔드 계약: POST /api/auth/social/resolve  body: { conflictToken, strategy } → { accessToken, refreshToken, backupKey? }
  //   strategy 'merge'  = 게스트 데이터를 기존 계정에 합침
  //   strategy 'account'= 기존 계정 데이터만 사용(게스트 데이터 버림)
  const resolveSocialConflict = async (conflictToken: string, strategy: 'merge' | 'account'): Promise<boolean> => {
    try {
      const response = await client.post<{ accessToken?: string; refreshToken?: string; backupKey?: string }>(
        '/api/auth/social/resolve',
        { conflictToken, strategy }
      );
      return await applyAuthResult(response.data);
    } catch (e) {
      console.error('Failed to resolve social conflict', e);
      return false;
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

      // 소셜 SDK 세션도 정리한다. 이걸 안 하면 SDK가 캐시된 세션으로 다음 로그인을 자격증명 확인 없이
      // 즉시 통과시켜, 탈퇴 후 재로그인 시 "바로 로그인"되는 것처럼 보인다.
      if (Platform.OS !== 'web') {
        try { await GoogleSignin.signOut(); } catch {}
        try { await NaverLogin.logout(); } catch {}
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
        Alert.alert('회원탈퇴 완료', '계정과 소셜 로그인 연결, 모든 데이터가 삭제되었습니다.');
      } else {
        Alert.alert(
          '일부만 완료됨 ⚠️',
          '이 기기의 데이터는 삭제됐지만, 서버에서 계정 삭제 요청이 실패했습니다. 네트워크 상태를 확인한 뒤 설정에서 다시 시도해 주세요.'
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
      queryClient.invalidateQueries(); // 계정/표시이름이 바뀌면 레이아웃 캐시(식재료·등록자명)까지 전부 새로 받는다
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
        sessionExpired,
        clearSessionExpired,
        loginAnonymously,
        loginWithGoogle,
        loginWithNaver,
        resolveSocialConflict,
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
