import React from 'react';
import { Platform, Appearance } from 'react-native';
import { requestWidgetUpdate } from 'react-native-android-widget';
import { Ingredient } from '../types';
import { ExpiringWidget } from './ExpiringWidget';
import { buildSnapshot, saveSnapshot } from './snapshot';
import { WIDGET_NAME, WIDGET_NAME_SUMMARY, isCompactHeight } from './taskHandler';

// 재료 목록으로 스냅샷을 만들어 저장하고, 이미 배치된 위젯(목록형/요약형 둘 다)이 있으면 즉시 다시 그린다.
// 위젯이 없어도(widgetNotFound) 스냅샷은 저장돼, 나중에 추가될 때 최신 상태로 렌더된다.
export async function updateExpiringWidget(ingredients: Ingredient[]): Promise<void> {
  if (Platform.OS !== 'android') return;
  try {
    const snapshot = buildSnapshot(ingredients);
    await saveSnapshot(snapshot);
    const dark = Appearance.getColorScheme() === 'dark';
    await Promise.all([
      requestWidgetUpdate({
        widgetName: WIDGET_NAME,
        renderWidget: info => <ExpiringWidget snapshot={snapshot} width={info.width} dark={dark} compact={isCompactHeight(info.height)} />,
        widgetNotFound: () => {},
      }),
      requestWidgetUpdate({
        widgetName: WIDGET_NAME_SUMMARY,
        renderWidget: info => <ExpiringWidget snapshot={snapshot} width={info.width} dark={dark} compact={isCompactHeight(info.height)} />,
        widgetNotFound: () => {},
      }),
    ]);
  } catch (e) {
    console.error('Failed to update expiring widget', e);
  }
}
