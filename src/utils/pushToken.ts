import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { client } from '../api/client';
import { requestNotificationPermission } from './ingredientNotifications';

const SHARE_NOTIFICATIONS_ENABLED_KEY = '@share_notifications_enabled';

/**
 * 냉장고 공유(초대/수락)처럼 "이 기기가 다른 사람과 관계를 맺는" 시점에만 호출한다.
 * 앱 실행 즉시가 아니라 실제로 푸시를 받을 이유가 생겼을 때만 권한을 요청하기 위함.
 */
export async function registerPushToken(): Promise<void> {
  // SDK 53부터 Expo Go에서는 안드로이드 원격 푸시 자체가 지원되지 않는다.
  // 개발 중 Expo Go로 테스트할 때 라이브러리가 시끄러운 에러를 찍지 않도록 미리 걸러낸다.
  if (Constants.appOwnership === 'expo') return;

  try {
    if (!(await requestNotificationPermission())) return;

    const projectId = Constants.expoConfig?.extra?.eas?.projectId;
    if (!projectId) return;

    const { data: expoPushToken } = await Notifications.getExpoPushTokenAsync({ projectId });
    await client.patch('/api/users/me/push-token', { expoPushToken });
  } catch (e) {
    // 푸시 토큰 등록 실패가 공유 기능 자체를 막으면 안 되므로 조용히 무시한다.
    console.error('Failed to register push token', e);
  }
}

/**
 * 공유 냉장고 관련(삭제 요청 등) 알림의 사용자 on/off 설정을 조회합니다. 기본값은 true입니다.
 */
export async function isShareNotificationsEnabled(): Promise<boolean> {
  try {
    const raw = await AsyncStorage.getItem(SHARE_NOTIFICATIONS_ENABLED_KEY);
    return raw === null ? true : raw === 'true';
  } catch (e) {
    return true;
  }
}

/**
 * 공유 냉장고 알림을 끄면 서버에 등록된 푸시 토큰을 지워 더 이상 푸시가 오지 않게 하고,
 * 다시 켜면 registerPushToken으로 재등록한다.
 */
export async function setShareNotificationsEnabled(enabled: boolean): Promise<void> {
  try {
    await AsyncStorage.setItem(SHARE_NOTIFICATIONS_ENABLED_KEY, String(enabled));
  } catch (e) {
    console.error('Failed to save share notification setting', e);
  }
  if (enabled) {
    await registerPushToken();
    return;
  }
  if (Constants.appOwnership === 'expo') return;
  try {
    await client.patch('/api/users/me/push-token', { expoPushToken: null });
  } catch (e) {
    console.error('Failed to clear push token', e);
  }
}
