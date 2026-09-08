// 이 프로젝트는 React Compiler(app.json experiments.reactCompiler)가 켜져 있다.
// react-native-android-widget은 위젯 컴포넌트를 날 함수로 호출하므로, 컴파일러가
// 주입하는 메모이제이션 훅이 "Invalid Hook Call"을 일으킨다. 이 파일만 컴파일러에서 제외한다.
// 또한 이 라이브러리는 React Fragment(<>)를 지원하지 않으니 항상 FlexWidget으로 감쌀 것.
'use no memo';

import React from 'react';
import { FlexWidget, TextWidget, ListWidget } from 'react-native-android-widget';
import { getColors } from '../theme';
import { WidgetSnapshot, WidgetItem, WidgetStatus } from './snapshot';

// react-native-android-widget는 widgetInfo.width(dp)를 넘겨준다. 이 폭으로 소/중/대를 가른다.
const MEDIUM_MIN = 160;
const LARGE_MIN = 260;

type Hex = `#${string}`;
const hex = (v: string) => v as Hex;

interface Props {
  snapshot: WidgetSnapshot;
  width: number;
  dark: boolean;
  compact?: boolean; // true면 세그먼트(개수)만 표시하고 목록은 숨김 (4x1 요약 위젯용)
}

export function ExpiringWidget({ snapshot, width, dark, compact = false }: Props) {
  const c = getColors(dark);
  const { counts, items } = snapshot;
  const size = width >= LARGE_MIN ? 'large' : width >= MEDIUM_MIN ? 'medium' : 'small';
  const showList = !compact && size !== 'small';

  const strong = (s: WidgetStatus): Hex => hex(s === 'expired' ? c.ddayExpired : c.ddayImminent);
  const chipTint = (s: WidgetStatus): Hex =>
    dark ? hex(c.surfaceTertiary) : hex(s === 'expired' ? '#FEECEC' : '#FFF3E0');
  // 식재료 카드 배경/테두리 — 위젯 바탕과 살짝 구분되게 해서 입체감을 준다.
  const cardBg = dark ? hex(c.surfaceTertiary) : hex(c.surfaceSecondary);
  const cardBorder = dark ? hex(c.borderLight) : hex(c.border);

  return (
    <FlexWidget
      clickAction="OPEN_URI"
      clickActionData={{ uri: 'freshkeep://?tab=ingredients' }}
      style={{
        height: 'match_parent',
        width: 'match_parent',
        flexDirection: 'column',
        backgroundColor: hex(c.surface),
        borderRadius: 24,
        paddingHorizontal: 16,
        paddingVertical: compact ? 12 : 16,
        justifyContent: compact ? 'center' : 'flex-start',
      }}
    >
      {/* 만료 / 임박 / 안전 세그먼트 (세로 구분선으로 3등분) */}
      <FlexWidget style={{ width: 'match_parent', flexDirection: 'row', alignItems: 'center' }}>
        <Stat count={counts.expired} label="만료" color={hex(c.ddayExpired)} labelColor={hex(c.textTertiary)} />
        <Divider color={hex(c.border)} />
        <Stat count={counts.imminent} label="임박" color={hex(c.ddayImminent)} labelColor={hex(c.textTertiary)} />
        <Divider color={hex(c.border)} />
        <Stat count={counts.safe} label="안전" color={hex(c.ddaySafe)} labelColor={hex(c.textTertiary)} />
      </FlexWidget>

      {showList && (
        <FlexWidget style={{ width: 'match_parent', flexDirection: 'column', flex: 1 }}>
          <FlexWidget style={{ width: 'match_parent', height: 1, backgroundColor: hex(c.border), marginTop: 14, marginBottom: 10 }} />
          {items.length === 0 ? (
            <TextWidget text="임박·만료된 식재료가 없어요 👍" style={{ fontSize: 13, color: hex(c.textTertiary) }} />
          ) : (
            // ListWidget = 네이티브 ListView. 항목이 위젯 높이를 넘으면 세로 스크롤된다.
            <ListWidget style={{ width: 'match_parent', height: 'match_parent' }}>
              {items.map((it, i) => (
                <Row
                  key={i}
                  item={it}
                  textColor={hex(c.textPrimary)}
                  strong={strong(it.status)}
                  chipBg={chipTint(it.status)}
                  cardBg={cardBg}
                  cardBorder={cardBorder}
                />
              ))}
            </ListWidget>
          )}
        </FlexWidget>
      )}
    </FlexWidget>
  );
}

function Stat({
  count, label, color, labelColor,
}: { count: number; label: string; color: Hex; labelColor: Hex }) {
  return (
    <FlexWidget style={{ flex: 1, flexDirection: 'column', alignItems: 'center' }}>
      <TextWidget text={`${count}`} style={{ fontSize: 22, fontWeight: 'bold', color }} />
      <TextWidget text={label} style={{ fontSize: 12, color: labelColor, marginTop: 2 }} />
    </FlexWidget>
  );
}

function Divider({ color }: { color: Hex }) {
  return <FlexWidget style={{ width: 1, height: 28, backgroundColor: color }} />;
}

function Row({
  item, textColor, strong, chipBg, cardBg, cardBorder,
}: { item: WidgetItem; textColor: Hex; strong: Hex; chipBg: Hex; cardBg: Hex; cardBorder: Hex }) {
  return (
    <FlexWidget
      clickAction="OPEN_URI"
      clickActionData={{ uri: 'freshkeep://?tab=ingredients' }}
      style={{
        width: 'match_parent',
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: cardBg,
        borderRadius: 14,
        borderWidth: 1,
        borderColor: cardBorder,
        paddingHorizontal: 12,
        paddingVertical: 10,
        marginBottom: 8,
      }}
    >
      <FlexWidget style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: strong, marginRight: 8 }} />
      <FlexWidget style={{ flex: 1, marginRight: 8 }}>
        <TextWidget text={item.name} maxLines={1} style={{ fontSize: 14, color: textColor }} />
      </FlexWidget>
      <FlexWidget style={{ backgroundColor: chipBg, borderRadius: 8, paddingHorizontal: 7, paddingVertical: 2 }}>
        <TextWidget text={item.dday} style={{ fontSize: 12, fontWeight: 'bold', color: strong }} />
      </FlexWidget>
    </FlexWidget>
  );
}
