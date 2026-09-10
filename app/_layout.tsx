import { useEffect } from "react";
import { DeviceEventEmitter, LogBox } from "react-native";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "../src/api/queryClient";
import { invalidateFridgeLayout } from "../src/api/fridgeService";
import { AuthProvider } from "../src/context/AuthContext";
import { ThemeAlertPortal } from "../src/components/ThemeAlert";
import * as SplashScreen from 'expo-splash-screen';
import * as SystemUI from 'expo-system-ui';
import { ThemeProvider, useTheme } from "../src/context/ThemeContext";

import * as KeepAwake from 'expo-keep-awake';
import * as Notifications from 'expo-notifications';

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

// expo 개발 클라이언트가 앱 재개 시점에 keep-awake를 켜려다(액티비티가 아직 resume 전) 실패하며
// 던지는 개발 전용 rejection 레드박스를 억제한다. 릴리즈에선 우리가 keep-awake를 쓰지 않아 발생하지 않음.
LogBox.ignoreLogs(['Unable to activate keep awake']);

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

  // 냉장고 삭제 요청/동의/거절/철회, 새 멤버 합류, 닉네임 변경 푸시가 도착하면, 앱을 재시작하지
  // 않아도 그 자리에서 바로 냉장고 목록(fridges 쿼리)을 다시 불러오도록 연결한다.
  // 식재료 등록/수정/삭제는 fridges 쿼리가 아니라 냉장고 레이아웃 데이터라서, 그쪽 캐시를 먼저
  // 무효화한 뒤(안 그러면 이어지는 재조회가 캐시에 그대로 걸린다) 화면들에 다시 불러오라고 알린다.
  useEffect(() => {
    const FRIDGE_PUSH_TYPES = ['fridge_deletion', 'fridge_share', 'nickname_changed', 'memo_created'];
    const INGREDIENT_PUSH_TYPES = ['ingredient_changed'];
    const handlePushData = (data: Record<string, unknown> | undefined) => {
      const type = data?.type as string;
      if (FRIDGE_PUSH_TYPES.includes(type)) {
        // 닉네임 변경은 레이아웃 응답의 등록자/수정자 이름에도 반영돼야 하고, 나머지도 드물게
        // 오는 이벤트라 필터 없이 전부 무효화하는 편이 누락 위험이 없다.
        queryClient.invalidateQueries();
      }
      if (INGREDIENT_PUSH_TYPES.includes(type)) {
        // 푸시가 냉장고를 알려주면 그 냉장고만, 아니면 전체 레이아웃 캐시를 버린다.
        invalidateFridgeLayout(data?.fridgeId as number | string | undefined);
        DeviceEventEmitter.emit('ingredientsChanged');
      }
    };
    const receivedSub = Notifications.addNotificationReceivedListener((notification) => {
      handlePushData(notification.request.content.data);
    });
    const responseSub = Notifications.addNotificationResponseReceivedListener((response) => {
      handlePushData(response.notification.request.content.data);
    });
    return () => {
      receivedSub.remove();
      responseSub.remove();
    };
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



