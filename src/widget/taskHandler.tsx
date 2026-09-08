import React from 'react';
import type { WidgetTaskHandlerProps } from 'react-native-android-widget';
import { ExpiringWidget } from './ExpiringWidget';
import { loadSnapshot } from './snapshot';

// 위젯 이름 — app.json 플러그인 config의 name과 반드시 일치해야 한다.
export const WIDGET_NAME = 'Expiring'; // 세그먼트 + 목록 (4x2)
export const WIDGET_NAME_SUMMARY = 'ExpiringSummary'; // 세그먼트(개수)만 (4x1)

// OS가 위젯 추가/갱신/리사이즈 시 헤드리스 JS로 호출한다. 네트워크 없이 캐시 스냅샷만 읽어 렌더.
export async function widgetTaskHandler(props: WidgetTaskHandlerProps): Promise<void> {
  const width = props.widgetInfo.width;
  const compact = props.widgetInfo.widgetName === WIDGET_NAME_SUMMARY;

  switch (props.widgetAction) {
    case 'WIDGET_ADDED':
    case 'WIDGET_UPDATE':
    case 'WIDGET_RESIZED': {
      const snapshot = await loadSnapshot();
      // light/dark 두 벌을 넘기면 OS 테마에 맞춰 자동 선택된다.
      props.renderWidget({
        light: <ExpiringWidget snapshot={snapshot} width={width} dark={false} compact={compact} />,
        dark: <ExpiringWidget snapshot={snapshot} width={width} dark={true} compact={compact} />,
      });
      break;
    }
    // WIDGET_CLICK은 clickAction="OPEN_APP"(내장)이 앱을 전면 실행하므로 별도 처리 불필요.
    default:
      break;
  }
}
