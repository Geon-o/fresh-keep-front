import * as Notifications from 'expo-notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ingredient } from '../types';

const SCHEDULED_IDS_KEY = '@notification_scheduled_ids';
const ENABLED_KEY = '@notifications_enabled';
const NOTIFY_HOUR_KEY = '@notification_hour';
const NOTIFY_MINUTE_KEY = '@notification_minute';
const DEFAULT_NOTIFY_HOUR = 8; // 오전 8시
const DEFAULT_NOTIFY_MINUTE = 0;

type DigestType = 'imminent' | 'expired';

interface DigestGroup {
  date: string; // YYYY-MM-DD
  type: DigestType;
  names: string[];
}

// 'YYYY-MM-DD' 문자열이 가리키는 날짜의 특정 시각 Date 객체를 만든다.
function atTime(dateStr: string, hour: number, minute: number): Date {
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(y, m - 1, d, hour, minute, 0, 0);
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
 * 알림 권한을 요청합니다. OS가 다시 물어볼 수 있는 상태(canAskAgain)일 때만 네이티브 허용 다이얼로그를 띄우고,
 * 이미 완전히 거부되어 OS가 다이얼로그를 다시 띄워주지 않는 상태(canAskAgain: false)면 요청 없이 false를 반환합니다.
 * 이 경우엔 앱이 할 수 있는 게 없고, 사용자가 직접 기기 설정에서 켜야 합니다 (getNotificationPermissionState 참고).
 */
export async function requestNotificationPermission(): Promise<boolean> {
  try {
    const existing = await Notifications.getPermissionsAsync();
    if (existing.granted) return true;
    if (!existing.canAskAgain) return false;
    const { granted } = await Notifications.requestPermissionsAsync();
    return granted;
  } catch (e) {
    console.error('Failed to request notification permission', e);
    return false;
  }
}

/**
 * 현재 알림 권한 상태를 조회합니다. canAskAgain이 false면 OS가 더 이상 앱 내 다이얼로그를
 * 띄워주지 않는 상태이므로, 이때만 "기기 설정으로 이동" 안내가 의미가 있습니다.
 */
export async function getNotificationPermissionState(): Promise<{ granted: boolean; canAskAgain: boolean }> {
  try {
    const { granted, canAskAgain } = await Notifications.getPermissionsAsync();
    return { granted, canAskAgain };
  } catch (e) {
    return { granted: false, canAskAgain: true };
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
    await cancelAllScheduledNotifications();
  }
}

/**
 * 이 앱이 예약해둔 알림을 전부 취소합니다. 알림 시간을 바꿀 때처럼, 예전 설정으로 이미 잡혀 있던
 * 알림이 다음 rebuildAllNotifications 전까지 그대로 남아 엉뚱한 시각에 울리는 걸 막기 위해 쓴다.
 */
export async function cancelAllScheduledNotifications(): Promise<void> {
  await Notifications.cancelAllScheduledNotificationsAsync();
  await AsyncStorage.setItem(SCHEDULED_IDS_KEY, JSON.stringify([]));
}

/**
 * 만료/임박 알림을 보낼 시각(0~23시)을 조회합니다. 기본값은 오전 8시입니다.
 */
export async function getNotificationHour(): Promise<number> {
  try {
    const raw = await AsyncStorage.getItem(NOTIFY_HOUR_KEY);
    return raw === null ? DEFAULT_NOTIFY_HOUR : Number(raw);
  } catch (e) {
    return DEFAULT_NOTIFY_HOUR;
  }
}

/**
 * 만료/임박 알림을 보낼 시각(0~23시)을 저장합니다. 실제 예약에는 다음 rebuildAllNotifications
 * 호출(식재료 등록/수정/삭제, 앱 재실행 시 목록 로드 등) 때 반영됩니다.
 */
export async function setNotificationHour(hour: number): Promise<void> {
  await AsyncStorage.setItem(NOTIFY_HOUR_KEY, String(hour));
}

/**
 * 만료/임박 알림을 보낼 분(0~59, 10분 단위)을 조회합니다. 기본값은 0분입니다.
 */
export async function getNotificationMinute(): Promise<number> {
  try {
    const raw = await AsyncStorage.getItem(NOTIFY_MINUTE_KEY);
    return raw === null ? DEFAULT_NOTIFY_MINUTE : Number(raw);
  } catch (e) {
    return DEFAULT_NOTIFY_MINUTE;
  }
}

/**
 * 만료/임박 알림을 보낼 분을 저장합니다. hour와 마찬가지로 다음 rebuildAllNotifications 호출 때 반영됩니다.
 */
export async function setNotificationMinute(minute: number): Promise<void> {
  await AsyncStorage.setItem(NOTIFY_MINUTE_KEY, String(minute));
}

/**
 * 전체 식재료 목록을 기준으로 알림 예약을 처음부터 다시 만듭니다.
 * 같은 날짜에 임박(D-1)하거나 만료(D-day)되는 식재료들을 하나의 알림으로 합쳐서
 * 사용자가 설정한 시각에 하루 한 번만 보냅니다(식재료 개수와 무관하게 알림 수가 늘지 않음).
 * 이 앱의 알림은 전부 이 함수가 관리하므로, 호출할 때마다 이전 예약을 전부 취소하고 새로 채웁니다.
 */
export async function rebuildAllNotifications(ingredients: Ingredient[]): Promise<void> {
  try {
    if (!(await isNotificationsEnabled())) return;
    const notifyHour = await getNotificationHour();
    const notifyMinute = await getNotificationMinute();

    // 이전 예약은 권한 여부와 무관하게 항상 정리한다 (취소는 권한이 필요 없음).
    const prevIdsRaw = await AsyncStorage.getItem(SCHEDULED_IDS_KEY);
    const prevIds: string[] = prevIdsRaw ? JSON.parse(prevIdsRaw) : [];
    for (const id of prevIds) {
      await Notifications.cancelScheduledNotificationAsync(id).catch(() => {});
    }
    await AsyncStorage.setItem(SCHEDULED_IDS_KEY, JSON.stringify([]));

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
    const dueEntries: { group: DigestGroup; triggerDate: Date }[] = [];
    for (const group of groups.values()) {
      const triggerDate = atTime(group.date, notifyHour, notifyMinute);
      if (triggerDate.getTime() <= now) continue;
      dueEntries.push({ group, triggerDate });
    }

    // 실제로 예약할 알림이 있을 때만 권한을 요청한다 — 앱 실행 즉시가 아니라
    // "지금 임박/만료된 식재료가 있어서 알림이 필요한 시점"에만 다이얼로그가 뜨게 한다.
    if (dueEntries.length === 0) return;
    if (!(await requestNotificationPermission())) return;

    const newIds: string[] = [];
    for (const { group, triggerDate } of dueEntries) {
      const id = await Notifications.scheduleNotificationAsync({
        content: buildDigestContent(group.type, group.names),
        trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: triggerDate },
      });
      newIds.push(id);
    }

    await AsyncStorage.setItem(SCHEDULED_IDS_KEY, JSON.stringify(newIds));
  } catch (e) {
    console.error('Failed to rebuild ingredient notifications', e);
  }
}
