import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';
import { client } from '../api/client';
import { requestNotificationPermission } from './ingredientNotifications';

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
