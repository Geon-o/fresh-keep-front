import React from 'react';
import type { WidgetTaskHandlerProps } from 'react-native-android-widget';
import { ExpiringWidget } from './ExpiringWidget';
import { loadSnapshot } from './snapshot';

// 위젯 이름 — app.json 플러그인 config의 name과 반드시 일치해야 한다.
// 두 위젯은 기본 크기만 다르다(Expiring=4x2, ExpiringSummary=4x1). 표시 형태는
// 이름과 무관하게 "현재 높이"로만 결정돼, 사용자가 리사이즈하면 서로 자유롭게 전환된다.
export const WIDGET_NAME = 'Expiring'; // 기본 4x2로 추가
export const WIDGET_NAME_SUMMARY = 'ExpiringSummary'; // 기본 4x1로 추가

// 위젯 높이(dp)가 이보다 낮으면 목록을 숨기고 세그먼트만 보여준다(요약 모드).
// 세로로 줄이면 요약, 늘리면 목록까지 표시.
export const COMPACT_MAX_HEIGHT = 130;
export const isCompactHeight = (h: number) => h < COMPACT_MAX_HEIGHT;

// OS가 위젯 추가/갱신/리사이즈 시 헤드리스 JS로 호출한다. 네트워크 없이 캐시 스냅샷만 읽어 렌더.
export async function widgetTaskHandler(props: WidgetTaskHandlerProps): Promise<void> {
  const width = props.widgetInfo.width;
  const compact = isCompactHeight(props.widgetInfo.height);

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
