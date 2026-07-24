import { useEffect } from "react";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "../src/api/queryClient";
import { AuthProvider } from "../src/context/AuthContext";
import { ThemeAlertPortal } from "../src/components/ThemeAlert";
import * as SplashScreen from 'expo-splash-screen';
import * as SystemUI from 'expo-system-ui';
import { ThemeProvider, useTheme } from "../src/context/ThemeContext";

import * as KeepAwake from 'expo-keep-awake';
import * as Notifications from 'expo-notifications';
import { requestNotificationPermission } from '../src/utils/ingredientNotifications';

// 포그라운드에서도 만료/임박 알림이 배너로 표시되도록 핸들러 등록
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

// KeepAwake 에러 방지 패치
const originalActivate = KeepAwake.activateKeepAwakeAsync;
// eslint-disable-next-line import/namespace
(KeepAwake as any).activateKeepAwakeAsync = async (...args: any[]) => {
  try {
    return await originalActivate(...args);
  } catch (e) {
    console.warn('Keep awake activation failed silently:', e);
  }
};

// 앱 시작 시 자동 스플래시 스크린 숨김을 방지하고 수동으로 제어
SplashScreen.preventAutoHideAsync().catch(() => {});

export default function RootLayout() {
  return (
    <ThemeProvider>
      <AppContent />
    </ThemeProvider>
  );
}

function AppContent() {
  const { isDark, theme } = useTheme();

  // Android는 화면 전환 애니메이션 도중 두 화면 밑으로 네이티브 Window 배경(기본 흰색)이
  // 비쳐 보이므로, 그 배경 자체를 앱 테마 색으로 맞춰 깜빡임을 원천 차단한다.
  useEffect(() => {
    SystemUI.setBackgroundColorAsync(theme.background).catch(() => {});
  }, [theme.background]);

  // 앱 최초 진입 시 만료/임박 알림 권한 요청 (이미 허용/거부된 상태면 다이얼로그 없이 즉시 반환)
  useEffect(() => {
    requestNotificationPermission();
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <StatusBar style={isDark ? 'light' : 'dark'} />
        <Stack
          screenOptions={{
            headerShown: false,
            // 화면 전환 애니메이션 도중 각 화면이 자체 배경을 그리기 전에
            // 네이티브 스택 기본 배경(흰색)이 잠깐 비치는 깜빡임을 방지
            contentStyle: { backgroundColor: theme.background },
            // 기본 iOS push 애니메이션은 이전 화면을 왼쪽으로 밀어내며 어둡게
            // 처리하는 parallax 효과를 쓰는데, 그 과정에서 다크 모드에서도
            // 순간적으로 밝은 배경이 비쳐 보인다. 자리 이동 없는 페이드로 대체.
            animation: 'fade',
          }}
        />
        <ThemeAlertPortal />
      </AuthProvider>
    </QueryClientProvider>
  );
}



