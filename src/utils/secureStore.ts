import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const ACCESS_TOKEN_KEY = 'auth_access_token';
const REFRESH_TOKEN_KEY = 'auth_refresh_token';

const isWeb = Platform.OS === 'web';

/**
 * 암호화 저장소(SecureStore)에 값을 비동기로 저장합니다. 웹 환경인 경우 AsyncStorage를 사용합니다.
 */
export async function saveSecureValue(key: string, value: string): Promise<void> {
  try {
    if (isWeb) {
      await AsyncStorage.setItem(key, value);
    } else {
      await SecureStore.setItemAsync(key, value);
    }
  } catch (error) {
    console.error(`Failed to save secure value for key [${key}]`, error);
  }
}

/**
 * 암호화 저장소(SecureStore)에서 값을 비동기로 조회합니다. 웹 환경인 경우 AsyncStorage를 사용합니다.
 */
export async function getSecureValue(key: string): Promise<string | null> {
  try {
    if (isWeb) {
      return await AsyncStorage.getItem(key);
    } else {
      return await SecureStore.getItemAsync(key);
    }
  } catch (error) {
    console.error(`Failed to retrieve secure value for key [${key}]`, error);
    return null;
  }
}

/**
 * 암호화 저장소(SecureStore)에서 값을 삭제합니다. 웹 환경인 경우 AsyncStorage를 사용합니다.
 */
export async function deleteSecureValue(key: string): Promise<void> {
  try {
    if (isWeb) {
      await AsyncStorage.removeItem(key);
    } else {
      await SecureStore.deleteItemAsync(key);
    }
  } catch (error) {
    console.error(`Failed to delete secure value for key [${key}]`, error);
  }
}

/**
 * Access Token과 Refresh Token을 일괄 안전 저장합니다.
 */
export async function saveAuthTokens(accessToken: string, refreshToken: string): Promise<void> {
  await saveSecureValue(ACCESS_TOKEN_KEY, accessToken);
  await saveSecureValue(REFRESH_TOKEN_KEY, refreshToken);
}

/**
 * 저장된 Access Token과 Refresh Token을 일괄 로드합니다.
 */
export async function getAuthTokens(): Promise<{ accessToken: string | null; refreshToken: string | null }> {
  const accessToken = await getSecureValue(ACCESS_TOKEN_KEY);
  const refreshToken = await getSecureValue(REFRESH_TOKEN_KEY);
  return { accessToken, refreshToken };
}

/**
 * 인증 관련 토큰을 일괄 제거합니다. (로그아웃 시 사용)
 */
export async function clearAuthTokens(): Promise<void> {
  await deleteSecureValue(ACCESS_TOKEN_KEY);
  await deleteSecureValue(REFRESH_TOKEN_KEY);
}
