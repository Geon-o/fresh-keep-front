import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "../src/api/queryClient";
import { AuthProvider } from "../src/context/AuthContext";
import { ThemeAlertPortal } from "../src/components/ThemeAlert";
import * as SplashScreen from 'expo-splash-screen';
import { ThemeProvider, useTheme } from "../src/context/ThemeContext";

import * as KeepAwake from 'expo-keep-awake';

// KeepAwake 에러 방지 패치
const originalActivate = KeepAwake.activateKeepAwakeAsync;
// eslint-disable-next-line import/namespace
KeepAwake.activateKeepAwakeAsync = async (...args) => {
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
  const { isDark } = useTheme();
  
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <StatusBar style={isDark ? 'light' : 'dark'} />
        <Stack screenOptions={{ headerShown: false }} />
        <ThemeAlertPortal />
      </AuthProvider>
    </QueryClientProvider>
  );
}



