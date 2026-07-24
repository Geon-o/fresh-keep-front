import * as Notifications from 'expo-notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ingredient } from '../types';

const SCHEDULED_IDS_KEY = '@notification_scheduled_ids';
const ENABLED_KEY = '@notifications_enabled';
const NOTIFY_HOURS = [8, 16]; // 오전 8시, 오후 4시 하루 두 번

type DigestType = 'imminent' | 'expired';

interface DigestGroup {
  date: string; // YYYY-MM-DD
  type: DigestType;
  names: string[];
}

// 'YYYY-MM-DD' 문자열이 가리키는 날짜의 특정 시각 Date 객체를 만든다.
function atHour(dateStr: string, hour: number): Date {
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(y, m - 1, d, hour, 0, 0, 0);
}

// 'YYYY-MM-DD' 문자열에 일수를 더한 'YYYY-MM-DD' 문자열을 반환한다.
function addDays(dateStr: string, days: number): string {
  const [y, m, d] = dateStr.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  date.setDate(date.getDate() + days);
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

// 같은 날짜·같은 종류(임박/만료)의 식재료를 한 알림으로 합친 문구를 만든다.
// 실제 알림과 미리보기 알림이 항상 같은 형식을 쓰도록 이 함수 하나로 모은다.
function buildDigestContent(type: DigestType, names: string[]) {
  const count = names.length;
  const shown = names.slice(0, 3).join(', ');
  const rest = count > 3 ? ` 외 ${count - 3}개` : '';
  const summary = `${shown}${rest}`;

  return type === 'imminent'
    ? { title: `🧊 내일 유통기한 만료 임박 (${count}개)`, body: `${summary} — 오늘 안에 확인해보세요` }
    : { title: `🚨 오늘 유통기한 만료 (${count}개)`, body: `${summary} — 지금 확인해보세요` };
}

/**
 * 알림 권한을 요청합니다. 이미 허용/거부된 상태면 시스템 다이얼로그 없이 현재 상태를 반환합니다.
 */
export async function requestNotificationPermission(): Promise<boolean> {
  try {
    const { status: existing } = await Notifications.getPermissionsAsync();
    if (existing === 'granted') return true;
    const { status } = await Notifications.requestPermissionsAsync();
    return status === 'granted';
  } catch (e) {
    console.error('Failed to request notification permission', e);
    return false;
  }
}

/**
 * 만료/임박 알림 기능의 사용자 on/off 설정을 조회합니다. 기본값은 true입니다.
 */
export async function isNotificationsEnabled(): Promise<boolean> {
  try {
    const raw = await AsyncStorage.getItem(ENABLED_KEY);
    return raw === null ? true : raw === 'true';
  } catch (e) {
    return true;
  }
}

/**
 * 만료/임박 알림 기능의 사용자 on/off 설정을 저장합니다. false로 끄면 예약된 알림을 모두 취소합니다.
 */
export async function setNotificationsEnabled(enabled: boolean): Promise<void> {
  await AsyncStorage.setItem(ENABLED_KEY, String(enabled));
  if (!enabled) {
    await Notifications.cancelAllScheduledNotificationsAsync();
    await AsyncStorage.setItem(SCHEDULED_IDS_KEY, JSON.stringify([]));
  }
}

/**
 * 전체 식재료 목록을 기준으로 알림 예약을 처음부터 다시 만듭니다.
 * 같은 날짜에 임박(D-1)하거나 만료(D-day)되는 식재료들을 하나의 알림으로 합쳐서
 * 그 날짜의 오전 8시·오후 4시, 하루 두 번만 보냅니다(식재료 개수와 무관하게 알림 수가 늘지 않음).
 * 이 앱의 알림은 전부 이 함수가 관리하므로, 호출할 때마다 이전 예약을 전부 취소하고 새로 채웁니다.
 */
export async function rebuildAllNotifications(ingredients: Ingredient[]): Promise<void> {
  try {
    if (!(await isNotificationsEnabled())) return;
    if (!(await requestNotificationPermission())) return;

    const prevIdsRaw = await AsyncStorage.getItem(SCHEDULED_IDS_KEY);
    const prevIds: string[] = prevIdsRaw ? JSON.parse(prevIdsRaw) : [];
    for (const id of prevIds) {
      await Notifications.cancelScheduledNotificationAsync(id).catch(() => {});
    }

    const groups = new Map<string, DigestGroup>();
    const addToGroup = (date: string, type: DigestType, name: string) => {
      const key = `${date}_${type}`;
      const group = groups.get(key);
      if (group) {
        group.names.push(name);
      } else {
        groups.set(key, { date, type, names: [name] });
      }
    };

    for (const ingredient of ingredients) {
      addToGroup(addDays(ingredient.expiryDate, -1), 'imminent', ingredient.name);
      addToGroup(ingredient.expiryDate, 'expired', ingredient.name);
    }

    const now = Date.now();
    const newIds: string[] = [];
    for (const group of groups.values()) {
      for (const hour of NOTIFY_HOURS) {
        const triggerDate = atHour(group.date, hour);
        if (triggerDate.getTime() <= now) continue;

        const id = await Notifications.scheduleNotificationAsync({
          content: buildDigestContent(group.type, group.names),
          trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: triggerDate },
        });
        newIds.push(id);
      }
    }

    await AsyncStorage.setItem(SCHEDULED_IDS_KEY, JSON.stringify(newIds));
  } catch (e) {
    console.error('Failed to rebuild ingredient notifications', e);
  }
}
