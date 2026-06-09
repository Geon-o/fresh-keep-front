import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';
import { getAuthTokens, saveAuthTokens, clearAuthTokens } from '../utils/secureStore';

// Expo 환경 변수에서 API Base URL 읽어오기 (기본값 설정)
const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:8086';

// 인증이 필요 없는 예외 API 경로 목록
const BYPASS_URLS = ['/api/auth/login', '/api/auth/refresh'];

export const client = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// 1. 요청 인터셉터: 모든 API 호출 전에 Access Token을 자동으로 주입합니다.
client.interceptors.request.use(
  async (config: InternalAxiosRequestConfig) => {
    // 예외 경로는 토큰을 주입하지 않음
    if (config.url && BYPASS_URLS.some(url => config.url?.includes(url))) {
      return config;
    }

    const { accessToken } = await getAuthTokens();
    if (accessToken) {
      config.headers.Authorization = `Bearer ${accessToken}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// 401 에러 감지 시 Silent Refresh를 수행하는 응답 인터셉터
let isRefreshing = false;
let failedQueue: Array<{ resolve: (token: string) => void; reject: (err: any) => void }> = [];

const processQueue = (error: any, token: string | null = null) => {
  failedQueue.forEach((prom) => {
    if (token) {
      prom.resolve(token);
    } else {
      prom.reject(error);
    }
  });
  failedQueue = [];
};

// 로그아웃 콜백 등록을 위한 핸들러
let onUnauthorizedCallback: (() => void) | null = null;

export const registerUnauthorizedCallback = (callback: () => void) => {
  onUnauthorizedCallback = callback;
};

// 2. 응답 인터셉터: 401 Unauthorized 에러 발생 시 토큰 재갱신 로직을 무효화/실행합니다.
client.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

    // 401 Unauthorized 에러이고, 재시도한 적이 없는 요청일 경우
    if (error.response?.status === 401 && originalRequest && !originalRequest._retry) {
      if (isRefreshing) {
        // 이미 갱신 중이라면 갱신 완료까지 대기 큐에 삽입
        return new Promise((resolve, reject) => {
          failedQueue.push({
            resolve: (token: string) => {
              originalRequest.headers.Authorization = `Bearer ${token}`;
              resolve(client(originalRequest));
            },
            reject: (err: any) => {
              reject(err);
            },
          });
        });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const { refreshToken } = await getAuthTokens();
        if (!refreshToken) {
          throw new Error('No refresh token found');
        }

        // 토큰 재발급 요청 (인스턴스 주기가 루프에 빠지지 않도록 axios 직접 호출)
        const refreshResponse = await axios.post<{ accessToken: string; refreshToken?: string }>(
          `${API_BASE_URL}/api/auth/refresh`,
          { refreshToken }
        );

        const newAccessToken = refreshResponse.data.accessToken;
        // 서버에서 새 Refresh Token을 함께 내려줄 경우 갱신
        const newRefreshToken = refreshResponse.data.refreshToken || refreshToken;

        await saveAuthTokens(newAccessToken, newRefreshToken);

        // 큐에 대기 중이던 모든 요청에 새 토큰 전달하여 재실행
        processQueue(null, newAccessToken);
        isRefreshing = false;

        // 실패했던 원래 요청 재실행
        originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
        return client(originalRequest);
      } catch (refreshError) {
        // 토큰 갱신 실패 (Refresh Token 만료 등)
        processQueue(refreshError, null);
        isRefreshing = false;

        // 보안 토큰 파기 및 로그아웃 유도
        await clearAuthTokens();
        if (onUnauthorizedCallback) {
          onUnauthorizedCallback();
        }

        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);
