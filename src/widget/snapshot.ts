import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ingredient } from '../types';

// 위젯이 읽는 캐시 스냅샷. 위젯 태스크는 네트워크를 타지 않고 이 값만 읽는다.
export const WIDGET_SNAPSHOT_KEY = '@widget_expiring';

// 위젯 목록에 담을 최대 개수 (만료+임박만). 위젯 높이를 넘으면 ListWidget이 세로 스크롤.
export const WIDGET_MAX_ITEMS = 30;

export type WidgetStatus = 'expired' | 'imminent';

export interface WidgetItem {
  name: string;
  dday: string; // '만료 D+2', '오늘만료', 'D-1' 등
  status: WidgetStatus;
}

export interface WidgetSnapshot {
  counts: { expired: number; imminent: number; safe: number };
  items: WidgetItem[]; // 만료+임박만, days 오름차순(가장 급한 것 먼저)
  updatedAt: number;
}

export const EMPTY_SNAPSHOT: WidgetSnapshot = {
  counts: { expired: 0, imminent: 0, safe: 0 },
  items: [],
  updatedAt: 0,
};

// 'YYYY-MM-DD' 유통기한을 오늘(자정 기준) 대비 남은 일수로 환산한다.
// CompartmentDetail.getDDayInfo와 동일한 규칙을 써서 앱과 위젯 표기를 일치시킨다.
function daysUntil(expiryDate: string): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const [y, m, d] = expiryDate.split('-').map(Number);
  const expiry = new Date(y, m - 1, d);
  expiry.setHours(0, 0, 0, 0);
  return Math.ceil((expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

// days -> {status, dday}. safe(>3)는 목록에 넣지 않으므로 null을 반환한다.
function classify(days: number): { status: WidgetStatus; dday: string } | null {
  if (days < 0) return { status: 'expired', dday: `만료 D+${Math.abs(days)}` };
  if (days === 0) return { status: 'imminent', dday: '오늘만료' };
  if (days <= 3) return { status: 'imminent', dday: `D-${days}` };
  return null; // 안전 (개수만 집계)
}

export function buildSnapshot(ingredients: Ingredient[]): WidgetSnapshot {
  const counts = { expired: 0, imminent: 0, safe: 0 };
  const scored: { item: WidgetItem; days: number }[] = [];

  for (const ing of ingredients) {
    const days = daysUntil(ing.expiryDate);
    const c = classify(days);
    if (!c) {
      counts.safe++;
      continue;
    }
    counts[c.status]++;
    scored.push({ item: { name: ing.name, dday: c.dday, status: c.status }, days });
  }

  scored.sort((a, b) => a.days - b.days); // 만료(음수) -> 오늘 -> 임박 순
  return {
    counts,
    items: scored.slice(0, WIDGET_MAX_ITEMS).map(s => s.item),
    updatedAt: Date.now(),
  };
}

export async function saveSnapshot(snapshot: WidgetSnapshot): Promise<void> {
  await AsyncStorage.setItem(WIDGET_SNAPSHOT_KEY, JSON.stringify(snapshot));
}

export async function loadSnapshot(): Promise<WidgetSnapshot> {
  try {
    const raw = await AsyncStorage.getItem(WIDGET_SNAPSHOT_KEY);
    return raw ? JSON.parse(raw) : EMPTY_SNAPSHOT;
  } catch {
    return EMPTY_SNAPSHOT;
  }
}
