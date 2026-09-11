import React, { useEffect, useState, useRef } from 'react';
import { StyleSheet, TouchableOpacity, View, Text, ScrollView, useWindowDimensions, TextInput, Platform, ActivityIndicator, Linking, Alert, Modal, Animated, PanResponder, DeviceEventEmitter, KeyboardAvoidingView, Switch } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useQueryClient } from '@tanstack/react-query';

import * as Location from 'expo-location';
import * as WebBrowser from 'expo-web-browser';
import { FridgeType, Ingredient, Memo, MemoType, ChecklistItem } from '../types';
import { SAMPLE_INGREDIENTS, CATEGORY_EMOJI, DEFAULT_INSIDE_SHELVES, DEFAULT_DOOR_SHELVES } from './CompartmentDetail';
import AddIngredientModal from './AddIngredientModal';
import { useAuth } from '../context/AuthContext';
import { getFridgeLayoutCached, getCompartmentShelves, CompartmentShelfInfo, getFridgeHistory, IngredientHistoryEntry, enablePantry, disablePantry } from '../api/fridgeService';
import { deleteIngredient, updateIngredient } from '../api/ingredientService';
import { getMemos, createMemo, updateMemo, deleteMemo, toggleMemoItem, markMemosRead } from '../api/memoService';
import { deserializeMemo, convertServerLocationToLocal, serializeMemo } from '../utils/memoSerializer';
import { rebuildAllNotifications } from '../utils/ingredientNotifications';
import { useTheme } from '../context/ThemeContext';
// 영문 행정구역명 한글 변환 매핑 딕셔너리
const TRANSLATE_TO_KOREAN: { [key: string]: string } = {
  'seoul': '서울',
  'seoul-si': '서울',
  'seoul-teukbyeolsi': '서울',
  'busan': '부산',
  'busan-si': '부산',
  'busan-gwangyeoksi': '부산',
  'incheon': '인천',
  'incheon-si': '인천',
  'incheon-gwangyeoksi': '인천',
  'daegu': '대구',
  'daegu-gwangyeoksi': '대구',
  'daejeon': '대전',
  'daejeon-gwangyeoksi': '대전',
  'gwangju': '광주',
  'gwangju-gwangyeoksi': '광주',
  'ulsan': '울산',
  'ulsan-gwangyeoksi': '울산',
  'sejong': '세종',
  'sejong-si': '세종',
  'sejong-teukbyeoljachi-si': '세종',
  'gyeonggi': '경기',
  'gyeonggi-do': '경기',
  'gangwon': '강원',
  'gangwon-do': '강원',
  'chungbuk': '충북',
  'chungcheongbuk-do': '충북',
  'chungnam': '충남',
  'chungcheongnam-do': '충남',
  'jeonbuk': '전북',
  'jeollabuk-do': '전북',
  'jeonnam': '전남',
  'jeollanam-do': '전남',
  'gyeongbuk': '경북',
  'gyeongsangbuk-do': '경북',
  'gyeongnam': '경남',
  'gyeongsangnam-do': '경남',
  'jeju': '제주',
  'jeju-do': '제주',
  'jeju-teukbyeoljachido': '제주',
  'suwon': '수원',
  'suwon-si': '수원',
  'seongnam': '성남',
  'seongnam-si': '성남',
  'goyang': '고양',
  'goyang-si': '고양',
  'yongin': '용인',
  'yongin-si': '용인',
  'bucheon': '부천',
  'bucheon-si': '부천',
  'ansan': '안산',
  'ansan-si': '안산',
  'namyangju': '남양주',
  'namyangju-si': '남양주',
  'anyang': '안양',
  'anyang-si': '안양',
  'hwaseong': '화성',
  'hwaseong-si': '화성',
  'cheongju': '청주',
  'cheongju-si': '청주',
  'cheonan': '천안',
  'cheonan-si': '천안',
  'jeonju': '전주',
  'jeonju-si': '전주',
  'pohang': '포항',
  'pohang-si': '포항',
  'changwon': '창원',
  'changwon-si': '창원',
  'gimhae': '김해',
  'gimhae-si': '김해',
  'gumi': '구미',
  'gumi-si': '구미',
  'jeju city': '제주',
  'seogwipo': '서귀포',
  'seogwipo-si': '서귀포'
};

const translateEnglishToKorean = (engName: string): string => {
  if (!engName) return '';
  const cleanName = engName.toLowerCase().replace(/[^a-z0-9\s-]/g, '').trim();
  if (TRANSLATE_TO_KOREAN[cleanName]) {
    return TRANSLATE_TO_KOREAN[cleanName];
  }
  // 부분 일치 시도 (예: "Seongnam-si" -> "seongnam" 매칭)
  for (const key of Object.keys(TRANSLATE_TO_KOREAN)) {
    if (cleanName.includes(key) || key.includes(cleanName)) {
      return TRANSLATE_TO_KOREAN[key];
    }
  }
  return engName;
};

// 한글 행정구역 포맷을 정제 ("서울특별시 서대문구" -> "서울 서대문")
const formatKoreanRegion = (text: string): string => {
  if (!text) return '';
  let cleaned = text
    .replace('서울특별시', '서울')
    .replace('부산광역시', '부산')
    .replace('인천광역시', '인천')
    .replace('대구광역시', '대구')
    .replace('대전광역시', '대전')
    .replace('광주광역시', '광주')
    .replace('울산광역시', '울산')
    .replace('세종특별자치시', '세종')
    .replace('제주특별자치도', '제주')
    .replace('경기도', '경기')
    .replace('강원도', '강원')
    .replace('충청북도', '충북')
    .replace('충청남도', '충남')
    .replace('전라북도', '전북')
    .replace('전라남도', '전남')
    .replace('경상북도', '경북')
    .replace('경상남도', '경남');
  
  const parts = cleaned.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    const p1 = parts[0];
    const p2 = parts[1].replace(/시$/, '').replace(/군$/, '');
    return `${p1} ${p2}`.trim();
  }
  return cleaned;
};

// 전역 날씨 캐시
let weatherCache: {
  weatherInfo: {
    index: number;
    level: '관심' | '주의' | '경고' | '위험';
    color: string;
    bgColor: string;
    description: string;
    temp: number | null;
    humidity: number | null;
    city: string | null;
    loading: boolean;
    isFallback: boolean;
  };
  locationPermission: 'granted' | 'denied' | 'undetermined';
  timestamp: number;
} | null = null;

const CACHE_DURATION = 30 * 60 * 1000; // 캐싱 유효 기간: 30분

// 월별 대한민국 평균 기온 및 습도 데이터 (날씨 API 통신 실패 시 UI 일관성을 위해 사용)
const MONTHLY_AVERAGE_WEATHER: { [key: number]: { temp: number; humidity: number } } = {
  1: { temp: -1, humidity: 55 },
  2: { temp: 1, humidity: 55 },
  3: { temp: 7, humidity: 57 },
  4: { temp: 13, humidity: 56 },
  5: { temp: 19, humidity: 60 },
  6: { temp: 23, humidity: 68 },
  7: { temp: 26, humidity: 78 },
  8: { temp: 27, humidity: 76 },
  9: { temp: 22, humidity: 70 },
  10: { temp: 16, humidity: 63 },
  11: { temp: 8, humidity: 60 },
  12: { temp: 1, humidity: 56 }
};

interface SeasonalIngredient {
  name: string;
  emoji: string;
  recommendDish: string;
  searchQuery: string;
  months: number[];
}

const SEASONAL_INGREDIENTS: SeasonalIngredient[] = [
  // 봄 (3 ~ 5월)
  { name: '달래', emoji: '🌱', recommendDish: '달래양념장 & 달래된장찌개', searchQuery: '달래 레시피', months: [3, 4, 5] },
  { name: '냉이', emoji: '🌿', recommendDish: '냉이된장국 & 냉이무침', searchQuery: '냉이 레시피', months: [3, 4] },
  { name: '두릅', emoji: '🌲', recommendDish: '두릅숙회 & 두릅전', searchQuery: '두릅 레시피', months: [4, 5] },
  { name: '쑥', emoji: '🍃', recommendDish: '쑥국 & 쑥버무리', searchQuery: '쑥 레시피', months: [3, 4] },
  { name: '주꾸미', emoji: '🐙', recommendDish: '주꾸미 샤브샤브 & 주꾸미볶음', searchQuery: '주꾸미 레시피', months: [3, 4, 5] },
  { name: '바지락', emoji: '🐚', recommendDish: '바지락칼국수 & 바지락술찜', searchQuery: '바지락 레시피', months: [3, 4, 5] },
  { name: '미나리', emoji: '🌱', recommendDish: '미나리전 & 미나리무침', searchQuery: '미나리 레시피', months: [3, 4, 5] },

  // 여름 (6 ~ 8월)
  { name: '참외', emoji: '🍈', recommendDish: '참외 샐러드 & 참외장아찌', searchQuery: '참외 레시피', months: [6, 7, 8] },
  { name: '수박', emoji: '🍉', recommendDish: '수박 화채 & 땡모반', searchQuery: '수박 레시피', months: [6, 7, 8] },
  { name: '매실', emoji: '🟢', recommendDish: '매실청 & 매실장아찌', searchQuery: '매실 레시피', months: [6, 7] },
  { name: '복숭아', emoji: '🍑', recommendDish: '복숭아 조림 & 그릭복숭아', searchQuery: '복숭아 레시피', months: [7, 8] },
  { name: '감자', emoji: '🥔', recommendDish: '감자전 & 찌개감자조림', searchQuery: '감자 레시피', months: [6, 7, 8, 9] },
  { name: '옥수수', emoji: '🌽', recommendDish: '찐옥수수 & 마약옥수수', searchQuery: '옥수수 레시피', months: [7, 8, 9] },
  { name: '갈치', emoji: '🐟', recommendDish: '갈치조림 & 갈치구이', searchQuery: '갈치 레시피', months: [7, 8, 9, 10] },

  // 가을 (9 ~ 11월)
  { name: '꽃게', emoji: '🦀', recommendDish: '꽃게탕 & 간장게장', searchQuery: '꽃게 레시피', months: [9, 10, 11] },
  { name: '대하', emoji: '🦐', recommendDish: '대하 소금구이 & 감바스', searchQuery: '대하 레시피', months: [9, 10, 11] },
  { name: '전어', emoji: '🐟', recommendDish: '전어구이 & 전어회무침', searchQuery: '전어 레시피', months: [9, 10, 11] },
  { name: '늙은호박', emoji: '🎃', recommendDish: '호박죽 & 호박전', searchQuery: '늙은호박 레시피', months: [10, 11] },
  { name: '고구마', emoji: '🍠', recommendDish: '군고구마 & 고구마맛탕', searchQuery: '고구마 레시피', months: [8, 9, 10, 11] },
  { name: '무', emoji: '🥬', recommendDish: '무생채 & 소고기뭇국', searchQuery: '가을무 레시피', months: [10, 11, 12] },
  { name: '은행', emoji: '🌰', recommendDish: '구운은행 & 은행밥', searchQuery: '은행 레시피', months: [9, 10, 11] },

  // 겨울 (12 ~ 2월)
  { name: '굴', emoji: '🦪', recommendDish: '굴전 & 굴국밥', searchQuery: '굴 레시피', months: [11, 12, 1, 2] },
  { name: '꼬막', emoji: '🐚', recommendDish: '꼬막무침 & 꼬막비빔밥', searchQuery: '꼬막 레시피', months: [11, 12, 1, 2] },
  { name: '삼치', emoji: '🐟', recommendDish: '삼치구이 & 삼치조림', searchQuery: '삼치 레시피', months: [10, 11, 12, 1, 2] },
  { name: '한라봉', emoji: '🍊', recommendDish: '한라봉 에이드 & 한라봉샐러드', searchQuery: '한라봉 레시피', months: [1, 2, 3] },
  { name: '시금치', emoji: '🥬', recommendDish: '시금치 나물 & 시금치 된장국', searchQuery: '시금치 레시피', months: [12, 1, 2, 3] },
  { name: '과메기', emoji: '🐟', recommendDish: '과메기 쌈 & 과메기 조림', searchQuery: '과메기 레시피', months: [11, 12, 1] },
  { name: '우엉', emoji: '🥖', recommendDish: '우엉조림 & 우엉차', searchQuery: '우엉 레시피', months: [1, 2, 3] }
];




interface RefrigeratorVisualProps {
  mode?: 'home' | 'ingredients' | 'fridge';
  // 홈 위젯에서 넘어올 때 식재료 목록에 적용할 상태 필터/검색어 (nonce가 바뀔 때마다 재적용)
  ingredientFocus?: { status: 'all' | 'expired' | 'imminent' | 'safe'; query: string; nonce: number } | null;
  refrigerators: { id: string; type: FridgeType; name: string; uuid?: string; role?: 'OWNER' | 'MEMBER'; deletionRequested?: boolean; ownerName?: string; memberNames?: string[]; hasUnreadMemo?: boolean }[];
  // subLocation을 넘기면 이동한 화면에서 해당 선반을 바로 펼쳐서 보여준다.
  onPressCompartment: (id: string, label: string, fridgeId: string, subLocation?: string) => void;
  activeIndex: number;
  setActiveIndex: (index: number) => void;
  onOpenAddSelector: () => void;
  onRenameFridge: (fridgeId: string, newName: string) => void;
  onEditFridgeType: () => void;
  onDeleteFridge: () => void;
  onApproveDeletionRequest?: () => void;
  onRejectDeletionRequest?: () => void;
  onCancelDeletionRequest?: () => void;
  onShareFridge?: (fridgeName: string, fridgeUuid: string) => void;
  onScanQr?: () => void;
  onChangeTab?: (tab: 'home' | 'ingredients' | 'fridge' | 'settings') => void;
  // 게스트에게 홈 상단에 노출할 로그인 유도 문구를 눌렀을 때 (로그인 시트 열기)
  onRequestLogin?: () => void;
}

// 컨테이너보다 텍스트가 길 때만 오른쪽→왼쪽으로 천천히 슬라이드(마퀴)해서 전체 내용을 보여준다.
// 짧으면 애니메이션 없이 그대로 한 줄로 표시한다.
function MarqueeText({ text, style, containerStyle }: { text: string; style?: any; containerStyle?: any }) {
  const [containerW, setContainerW] = React.useState(0);
  const [contentW, setContentW] = React.useState(0);
  const tx = React.useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    tx.stopAnimation();
    tx.setValue(0);
    if (contentW > containerW && containerW > 0) {
      const distance = contentW - containerW;
      const duration = Math.max(distance * 25, 800);
      const loop = Animated.loop(
        Animated.sequence([
          Animated.delay(1200),
          Animated.timing(tx, { toValue: -distance, duration, useNativeDriver: true }),
          Animated.delay(1200),
          Animated.timing(tx, { toValue: 0, duration, useNativeDriver: true }),
        ])
      );
      loop.start();
      return () => loop.stop();
    }
  }, [contentW, containerW, text]);

  const overflowing = contentW > containerW && containerW > 0;

  return (
    <View
      style={[{ overflow: 'hidden' }, containerStyle]}
      onLayout={e => setContainerW(e.nativeEvent.layout.width)}
    >
      {/* 숨은 측정용: 큰 고정 폭 + 한 줄로 두어 wrap을 막고, onTextLayout으로 실제 텍스트 픽셀 너비를 잰다 */}
      <Text
        numberOfLines={1}
        style={[style, { position: 'absolute', opacity: 0, width: 9999 }]}
        onTextLayout={e => {
          const w = e.nativeEvent.lines?.[0]?.width ?? 0;
          if (w > 0) setContentW(Math.ceil(w));
        }}
      >
        {text}
      </Text>
      {/* 표시용: 넘칠 때는 잰 자연 너비를 명시해 잘리지 않게 하고 translateX로 슬라이드한다 */}
      <Animated.Text
        numberOfLines={1}
        style={[style, overflowing ? { width: contentW, transform: [{ translateX: tx }] } : null]}
      >
        {text}
      </Animated.Text>
    </View>
  );
}

export default function RefrigeratorVisual({
  mode = 'home',
  ingredientFocus,
  refrigerators,
  onPressCompartment,
  activeIndex,
  setActiveIndex,
  onOpenAddSelector,
  onRenameFridge,
  onEditFridgeType,
  onDeleteFridge,
  onApproveDeletionRequest,
  onRejectDeletionRequest,
  onCancelDeletionRequest,
  onShareFridge,
  onScanQr,
  onChangeTab,
  onRequestLogin
}: RefrigeratorVisualProps) {
  const { width: screenWidth, height: screenHeight } = useWindowDimensions();
  const { isLoggedIn, user } = useAuth();
  // 소셜(구글·네이버) 로그인 사용자가 아니면 게스트로 보고 홈 상단에 로그인 유도 문구를 노출한다.
  const isSocialUser = user?.provider === 'google' || user?.provider === 'naver';
  const queryClient = useQueryClient();
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [ingredientsLoaded, setIngredientsLoaded] = useState(false);
  // 식재료 목록 카드에서 점 3개(더보기) 메뉴가 열린 항목 ID. 한 번에 하나만 펼친다.
  const [openMenuItemId, setOpenMenuItemId] = useState<string | null>(null);
  // 실온 보관함(팬트리)이 켜진 냉장고 ID 집합 = ROOM_TEMP 구획이 존재하는 냉장고. 서랍 노출/설정 토글 상태의 근거.
  const [pantryFridgeIds, setPantryFridgeIds] = useState<Set<string>>(new Set());
  // 팬트리 토글 전환 중 중복 요청 방지
  const [pantryToggling, setPantryToggling] = useState(false);
  const { theme, isDark } = useTheme();

  // 냉장고 설정 바텀시트: 슬라이드가 다 올라온 뒤에 배경이 어두워지고,
  // 닫힐 땐 배경이 먼저 사라진 뒤 슬라이드가 내려가도록 두 애니메이션을 순서대로 재생한다.
  // 여닫힘(translateY)과 크기 조절(height)은 서로 다른 애니메이션 값으로 분리한다 —
  // 바텀 고정 시트에서 translateY로 "위쪽만 가리기"는 불가능하고(아래쪽이 가려짐), height를 직접 늘려야
  // 손잡이를 위로 끌수록 시트 자체가 위로 커지는 자연스러운 동작이 된다.
  const SHEET_MIN_HEIGHT = screenHeight * 0.5;
  const SHEET_MAX_HEIGHT = screenHeight * 0.7;

  const [fridgeSettingsVisible, setFridgeSettingsVisible] = useState(false);
  const [sheetRendered, setSheetRendered] = useState(false);
  const sheetTranslateY = useRef(new Animated.Value(screenHeight)).current;
  const sheetHeight = useRef(new Animated.Value(SHEET_MIN_HEIGHT)).current;
  const sheetBackdropOpacity = useRef(new Animated.Value(0)).current;
  const sheetDragStartHeight = useRef(SHEET_MIN_HEIGHT);

  const sheetPanResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, gestureState) => Math.abs(gestureState.dy) > 4,
      onPanResponderGrant: () => {
        sheetHeight.stopAnimation((value) => {
          sheetDragStartHeight.current = value;
        });
      },
      onPanResponderMove: (_, gestureState) => {
        // 위로 끌면(dy 음수) 커지도록 부호를 뒤집는다.
        const next = sheetDragStartHeight.current - gestureState.dy;
        const clamped = Math.max(SHEET_MIN_HEIGHT, Math.min(SHEET_MAX_HEIGHT, next));
        sheetHeight.setValue(clamped);
      },
      onPanResponderRelease: (_, gestureState) => {
        const next = sheetDragStartHeight.current - gestureState.dy;
        const clamped = Math.max(SHEET_MIN_HEIGHT, Math.min(SHEET_MAX_HEIGHT, next));
        const midpoint = (SHEET_MIN_HEIGHT + SHEET_MAX_HEIGHT) / 2;
        const target = clamped > midpoint ? SHEET_MAX_HEIGHT : SHEET_MIN_HEIGHT;
        Animated.timing(sheetHeight, { toValue: target, duration: 200, useNativeDriver: false }).start();
      },
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  ).current;

  useEffect(() => {
    if (fridgeSettingsVisible) {
      setSheetRendered(true);
      sheetTranslateY.setValue(screenHeight);
      sheetHeight.setValue(SHEET_MIN_HEIGHT);
      sheetBackdropOpacity.setValue(0);
      Animated.timing(sheetTranslateY, {
        toValue: 0,
        duration: 260,
        useNativeDriver: true,
      }).start(() => {
        Animated.timing(sheetBackdropOpacity, {
          toValue: 1,
          duration: 150,
          useNativeDriver: true,
        }).start();
      });
    } else if (sheetRendered) {
      Animated.timing(sheetBackdropOpacity, {
        toValue: 0,
        duration: 150,
        useNativeDriver: true,
      }).start(() => {
        Animated.timing(sheetTranslateY, {
          toValue: screenHeight,
          duration: 260,
          useNativeDriver: true,
        }).start(() => {
          setSheetRendered(false);
        });
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fridgeSettingsVisible]);

  // 사용자 목록 바텀시트: 화면의 40%만 차지하는 고정 높이 시트
  const MEMBER_SHEET_HEIGHT = screenHeight * 0.4;
  const [memberSheetVisible, setMemberSheetVisible] = useState(false);
  const [memberSheetRendered, setMemberSheetRendered] = useState(false);
  const memberSheetTranslateY = useRef(new Animated.Value(screenHeight)).current;
  const memberSheetBackdropOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (memberSheetVisible) {
      setMemberSheetRendered(true);
      memberSheetTranslateY.setValue(screenHeight);
      memberSheetBackdropOpacity.setValue(0);
      Animated.timing(memberSheetTranslateY, {
        toValue: 0,
        duration: 260,
        useNativeDriver: true,
      }).start(() => {
        Animated.timing(memberSheetBackdropOpacity, {
          toValue: 1,
          duration: 150,
          useNativeDriver: true,
        }).start();
      });
    } else if (memberSheetRendered) {
      Animated.timing(memberSheetBackdropOpacity, {
        toValue: 0,
        duration: 150,
        useNativeDriver: true,
      }).start(() => {
        Animated.timing(memberSheetTranslateY, {
          toValue: screenHeight,
          duration: 260,
          useNativeDriver: true,
        }).start(() => {
          setMemberSheetRendered(false);
        });
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [memberSheetVisible]);

  // 공유 냉장고 기록 이력 바텀시트
  const [historyVisible, setHistoryVisible] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyEntries, setHistoryEntries] = useState<IngredientHistoryEntry[]>([]);

  const openHistory = async (fridgeId: string) => {
    setHistoryVisible(true);
    setHistoryLoading(true);
    try {
      const entries = await getFridgeHistory(Number(fridgeId));
      setHistoryEntries(entries);
    } catch (e) {
      console.error('Failed to load fridge history', e);
      setHistoryEntries([]);
    } finally {
      setHistoryLoading(false);
    }
  };

  // 냉장고 메모 목록 / 작성·수정 모달
  const [memoListVisible, setMemoListVisible] = useState(false);
  const [memoListFridgeId, setMemoListFridgeId] = useState<string | null>(null);
  const [memoLoading, setMemoLoading] = useState(false);
  const [memoEntries, setMemoEntries] = useState<Memo[]>([]);
  const [memoDetail, setMemoDetail] = useState<Memo | null>(null);
  const [memoComposerVisible, setMemoComposerVisible] = useState(false);
  const [memoComposerEditingId, setMemoComposerEditingId] = useState<number | null>(null);
  const [memoComposerType, setMemoComposerType] = useState<MemoType>('TEXT');
  const [memoComposerText, setMemoComposerText] = useState('');
  const [memoComposerItems, setMemoComposerItems] = useState<ChecklistItem[]>([]);
  const [memoSaving, setMemoSaving] = useState(false);
  const MEMO_CONTENT_MAX = 1000;
  // 실제 포스트잇처럼 메모마다 색이 다르게 보이도록 순환시키는 팔레트.
  const MEMO_NOTE_COLORS = ['#FFF3B0', '#FFD6E8', '#C9F2C7', '#BEE3F8', '#FFDAB9', '#E0C3FC'];

  // 한 줄에 3개씩 4줄(총 12개)만 딱 보이고, 그 이상은 이 높이 안에서 세로 스크롤되게 한다.
  // 타일이 정사각형(aspectRatio: 1)이라 폭만 알면 높이가 그대로 나온다 — settingsModalContent의
  // width:'90%'/padding:20 을 그대로 반영해 실제 타일 폭을 역산한다.
  const MEMO_GRID_COLUMNS = 3;
  const MEMO_GRID_VISIBLE_ROWS = 4;
  const MEMO_GRID_GAP = 14;
  const memoModalContentWidth = screenWidth * 0.9 - 40;
  const memoTileWidth = (memoModalContentWidth - MEMO_GRID_GAP * (MEMO_GRID_COLUMNS - 1)) / MEMO_GRID_COLUMNS;
  const memoGridVisibleHeight = memoTileWidth * MEMO_GRID_VISIBLE_ROWS + MEMO_GRID_GAP * (MEMO_GRID_VISIBLE_ROWS - 1);

  // 메모지 미리보기를 줄노트처럼 보이게: 타일 높이(=폭, 정사각형) 안에 들어가는 만큼만 줄을 긋는다.
  const MEMO_TILE_LINE_HEIGHT = 14;
  const memoTilePreviewLines = Math.max(1, Math.floor((memoTileWidth - 16) / MEMO_TILE_LINE_HEIGHT));

  const genChecklistItemId = () => `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;

  // 체크리스트 작성 중 키보드의 "다음/완료"를 누르면 키보드를 닫는 대신, 마지막 항목이면 새
  // 항목을 추가해서 바로 이어 입력하고, 중간 항목이면 다음 항목으로 포커스를 넘긴다.
  const memoItemInputRefs = useRef<Map<string, TextInput | null>>(new Map());
  const focusMemoItem = (itemId: string) => {
    requestAnimationFrame(() => memoItemInputRefs.current.get(itemId)?.focus());
  };
  const handleChecklistItemSubmit = (index: number) => {
    if (index === memoComposerItems.length - 1) {
      const newItem: ChecklistItem = { id: genChecklistItemId(), text: '', checked: false };
      setMemoComposerItems(prev => [...prev, newItem]);
      focusMemoItem(newItem.id);
    } else {
      focusMemoItem(memoComposerItems[index + 1].id);
    }
  };

  // 목록의 타일 색과 상세 모달 배경색이 항상 같은 메모끼리 일치하도록, 인덱스 기반 팔레트 순환을
  // 목록 순서(memoEntries)에서 그 메모의 실제 위치로 찾아서 재사용한다.
  const getMemoColor = (memo: Memo) => {
    const idx = memoEntries.findIndex(m => m.id === memo.id);
    return MEMO_NOTE_COLORS[(idx >= 0 ? idx : 0) % MEMO_NOTE_COLORS.length];
  };

  const openMemoList = async (fridgeId: string) => {
    setMemoListFridgeId(fridgeId);
    setMemoListVisible(true);
    setMemoLoading(true);
    try {
      const entries = await getMemos(Number(fridgeId));
      setMemoEntries(entries);
      // 목록을 연 시점에 안읽음을 해제한다 — 메모 버튼의 빨간 점은 fridges 쿼리에 실려있으므로 함께 갱신.
      await markMemosRead(Number(fridgeId)).catch(() => {});
      queryClient.invalidateQueries({ queryKey: ['fridges'] });
    } catch (e) {
      console.error('Failed to load memos', e);
      setMemoEntries([]);
    } finally {
      setMemoLoading(false);
    }
  };

  // 메모 카드에 보여줄 제목/미리보기는 저장하지 않고 렌더 시점에 content에서 만든다.
  const getMemoPreview = (memo: Memo): string => {
    if (memo.type === 'TEXT') {
      const firstLine = memo.content.split('\n')[0].trim();
      return firstLine || memo.content;
    }
    try {
      const items: ChecklistItem[] = JSON.parse(memo.content);
      if (items.length === 0) return '체크리스트';
      const rest = items.length > 1 ? ` 외 ${items.length - 1}개` : '';
      return `${items[0].text}${rest}`;
    } catch {
      return '체크리스트';
    }
  };

  const parseChecklist = (content: string): ChecklistItem[] => {
    try {
      const parsed = JSON.parse(content);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  };

  const openMemoComposer = (existing?: Memo) => {
    if (existing) {
      setMemoComposerEditingId(existing.id);
      setMemoComposerType(existing.type);
      if (existing.type === 'TEXT') {
        setMemoComposerText(existing.content);
        setMemoComposerItems([]);
      } else {
        setMemoComposerText('');
        setMemoComposerItems(parseChecklist(existing.content));
      }
    } else {
      setMemoComposerEditingId(null);
      setMemoComposerType('TEXT');
      setMemoComposerText('');
      setMemoComposerItems([{ id: genChecklistItemId(), text: '', checked: false }]);
    }
    setMemoDetail(null);
    setMemoComposerVisible(true);
  };

  const memoComposerSerialized = () =>
    memoComposerType === 'TEXT'
      ? memoComposerText
      : JSON.stringify(memoComposerItems.filter(item => item.text.trim().length > 0));

  const handleSaveMemo = async () => {
    if (!memoListFridgeId) return;
    const content = memoComposerSerialized();
    if (!content.trim() || content === '[]') {
      Alert.alert('알림 ⚠️', '메모 내용을 입력해주세요.');
      return;
    }
    if (content.length > MEMO_CONTENT_MAX) {
      Alert.alert('알림 ⚠️', `메모는 ${MEMO_CONTENT_MAX}자를 넘을 수 없어요.`);
      return;
    }
    setMemoSaving(true);
    try {
      if (memoComposerEditingId != null) {
        await updateMemo(Number(memoListFridgeId), memoComposerEditingId, { content });
      } else {
        await createMemo(Number(memoListFridgeId), { type: memoComposerType, content });
      }
      setMemoComposerVisible(false);
      const entries = await getMemos(Number(memoListFridgeId));
      setMemoEntries(entries);
    } catch (e) {
      console.error('Failed to save memo', e);
      Alert.alert('오류 ⚠️', '메모 저장에 실패했어요.');
    } finally {
      setMemoSaving(false);
    }
  };

  const handleDeleteMemo = (memo: Memo) => {
    if (!memoListFridgeId) return;
    const performDelete = async () => {
      try {
        await deleteMemo(Number(memoListFridgeId), memo.id);
        setMemoDetail(null);
        setMemoEntries(prev => prev.filter(m => m.id !== memo.id));
      } catch (e) {
        console.error('Failed to delete memo', e);
        Alert.alert('오류 ⚠️', '메모 삭제에 실패했어요.');
      }
    };
    if (Platform.OS === 'web') {
      if (window.confirm('이 메모를 삭제하시겠습니까?')) performDelete();
    } else {
      Alert.alert('이 메모를 삭제하시겠습니까?', undefined, [
        { text: '취소', style: 'cancel' },
        { text: '삭제', style: 'destructive', onPress: performDelete },
      ]);
    }
  };

  // 체크박스는 작성자가 아니어도 같은 냉장고 멤버면 누구나 누를 수 있다 (낙관적으로 먼저 반영).
  const handleToggleMemoItem = async (memo: Memo, itemId: string) => {
    if (!memoListFridgeId) return;
    const items = parseChecklist(memo.content).map(item =>
      item.id === itemId ? { ...item, checked: !item.checked } : item
    );
    const optimistic: Memo = { ...memo, content: JSON.stringify(items) };
    setMemoEntries(prev => prev.map(m => (m.id === memo.id ? optimistic : m)));
    setMemoDetail(prev => (prev && prev.id === memo.id ? optimistic : prev));
    try {
      await toggleMemoItem(Number(memoListFridgeId), memo.id, itemId);
    } catch (e) {
      console.error('Failed to toggle memo item', e);
      // 실패 시 서버 상태로 되돌리기 위해 목록을 다시 불러온다.
      const entries = await getMemos(Number(memoListFridgeId)).catch(() => null);
      if (entries) setMemoEntries(entries);
    }
  };

  // 이력 한 줄 요약 텍스트 (액션 종류별로 문구가 다르다).
  // summary가 이미 자연어 문장이므로 그대로 보여주고, 옛 데이터처럼 summary가 없을 때만 기존 형식으로 대체한다.
  const getHistoryLabel = (entry: IngredientHistoryEntry) => {
    switch (entry.actionType) {
      case 'CREATED':
        return entry.summary || `"${entry.ingredientName}" 등록`;
      case 'DELETED':
        return entry.summary || `"${entry.ingredientName}" 삭제`;
      case 'UPDATED':
        return entry.summary || `"${entry.ingredientName}" 수정`;
      case 'NAME_CHANGED':
        return `냉장고 이름 변경${entry.summary ? ` · ${entry.summary}` : ''}`;
      case 'TYPE_CHANGED':
        return `냉장고 타입 변경${entry.summary ? ` · ${entry.summary}` : ''}`;
      case 'NICKNAME_CHANGED':
        return entry.summary || '닉네임 변경';
      default:
        return entry.summary || '';
    }
  };

  // "MM/DD HH:mm" 형식으로 이력 발생 시각 표시
  const formatHistoryDateTime = (iso: string) => {
    const d = new Date(iso);
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    const hh = String(d.getHours()).padStart(2, '0');
    const min = String(d.getMinutes()).padStart(2, '0');
    return `${mm}/${dd} ${hh}:${min}`;
  };

  // 식재료 목록 탭 + 버튼으로 여는 등록 위치(냉장고 → 칸 → 선반/문쪽) 선택 모달
  const [addLocationPickerVisible, setAddLocationPickerVisible] = useState(false);
  const [addPickerFridgeId, setAddPickerFridgeId] = useState<string | null>(null);
  const [addPickerCompartmentId, setAddPickerCompartmentId] = useState<string | null>(null);
  const [addPickerShelves, setAddPickerShelves] = useState<CompartmentShelfInfo | null>(null);
  const [addPickerShelvesLoading, setAddPickerShelvesLoading] = useState(false);
  // 위치 선택이 끝나면 이 화면(식재료 목록)을 벗어나지 않고 바로 등록 폼을 띄운다
  // compartmentId/shelfId가 없으면 "위치 미정" 등록 (나중에 위치 지정 가능)
  const [addIngredientTarget, setAddIngredientTarget] = useState<{ fridgeId: string; compartmentId?: string; shelfId?: string; serverCompartmentId: number | null } | null>(null);
  // 식재료 목록 카드의 수정 버튼으로 여는 수정 폼 (같은 모달을 수정 모드로 재사용)
  const [editIngredientTarget, setEditIngredientTarget] = useState<Ingredient | null>(null);
  // "위치 미정" 식재료에 나중에 위치를 지정할 때: 같은 위치 선택 모달을 재사용하되,
  // 완료 시 새 등록이 아니라 이 식재료에 구획을 지정하는 것으로 처리한다.
  const [assignTargetIngredient, setAssignTargetIngredient] = useState<Ingredient | null>(null);

  const [fridgeCardWidth, setFridgeCardWidth] = useState(0);

  // 냉장고 이름 인라인 편집 상태 (설정 창 대신 카드에서 바로 수정)
  const [editingNameFridgeId, setEditingNameFridgeId] = useState<string | null>(null);
  const [nameDraft, setNameDraft] = useState('');

  const startEditingName = (fridgeId: string, currentName: string) => {
    setEditingNameFridgeId(fridgeId);
    setNameDraft(currentName);
  };

  const confirmEditingName = (fridgeId: string) => {
    onRenameFridge(fridgeId, nameDraft);
    setEditingNameFridgeId(null);
  };

  const cancelEditingName = () => {
    setEditingNameFridgeId(null);
  };
  const [currentFridgeSwipeIndex, setCurrentFridgeSwipeIndex] = useState(0);

  const onFridgeCardLayout = (event: any) => {
    const { width } = event.nativeEvent.layout;
    // paddingHorizontal이 12이므로 실가용 너비는 width - 24
    setFridgeCardWidth(width - 24);
  };

  const handleFridgeScroll = (event: any) => {
    const contentOffset = event.nativeEvent.contentOffset.x;
    const layoutWidth = event.nativeEvent.layoutMeasurement.width;
    if (layoutWidth > 0) {
      const pageIndex = Math.round(contentOffset / layoutWidth);
      setCurrentFridgeSwipeIndex(pageIndex);
    }
  };

  // 식재료 목록 탭용 상태
  const [searchQuery, setSearchQuery] = useState('');
  // 필터는 복수 선택. 빈 배열 = "전체"(제한 없음). statusFilters는 'expired'|'imminent'|'safe' 값을 담는다.
  const [statusFilters, setStatusFilters] = useState<string[]>([]);
  const [fridgeFilters, setFridgeFilters] = useState<string[]>([]);
  // 필터 다이얼로그: 열려 있을 때 임시 선택(temp)을 만지다가 "적용"을 눌러야 실제 필터에 반영된다.
  const [filterModalVisible, setFilterModalVisible] = useState(false);
  const [tempStatusFilters, setTempStatusFilters] = useState<string[]>([]);
  const [tempFridgeFilters, setTempFridgeFilters] = useState<string[]>([]);

  // 홈 위젯에서 상태/식재료를 눌러 넘어오면, 식재료 목록의 필터·검색을 그에 맞게 설정한다.
  useEffect(() => {
    if (!ingredientFocus) return;
    setStatusFilters(ingredientFocus.status === 'all' ? [] : [ingredientFocus.status]);
    setSearchQuery(ingredientFocus.query);
  }, [ingredientFocus?.nonce]);



  // 위치 권한 및 실시간 날씨 기반 식중독 지수 상태
  const [locationPermission, setLocationPermission] = useState<'granted' | 'denied' | 'undetermined'>('undetermined');
  const [weatherInfo, setWeatherInfo] = useState<{
    index: number;
    level: '관심' | '주의' | '경고' | '위험';
    color: string;
    bgColor: string;
    description: string;
    temp: number | null;
    humidity: number | null;
    city: string | null;
    loading: boolean;
    isFallback: boolean;
  }>({
    index: 50,
    level: '주의',
    color: theme.ddayImminent,
    bgColor: theme.ddayImminent + '12',
    description: '식재료 보관 온도에 유의하고 조리 기구의 청결을 유지해 주세요. ⚠️',
    temp: null,
    humidity: null,
    city: null,
    loading: false,
    isFallback: false,
  });

  // 화면에 반영된 식재료 목록의 내용 지문. 화면 재진입 때마다 loadIngredients가 다시 돌아도
  // 내용이 그대로면 setIngredients/알림 재예약(전체 취소 후 재등록)을 건너뛰기 위한 것이다.
  // 서버 요청 자체는 getFridgeLayoutCached의 react-query 캐시가 막아준다.
  const lastIngredientsSigRef = useRef<string | null>(null);

  // 식재료 실시간 로드 (서버 vs 로컬 분기). 등록 폼 저장 후 재호출할 수 있도록 useCallback으로 분리.
  const loadIngredients = React.useCallback(async () => {
      const applyIngredients = (list: Ingredient[]) => {
        const sig = JSON.stringify(list);
        if (sig === lastIngredientsSigRef.current) return;
        lastIngredientsSigRef.current = sig;
        setIngredients(list);
        rebuildAllNotifications(list);
      };
      try {
        if (isLoggedIn) {
          // 각 냉장고의 레이아웃을 캐시를 거쳐 로드 (변경 전까지 서버를 다시 부르지 않는다)
          const promises = refrigerators.map(f => getFridgeLayoutCached(f.id).catch(() => null));
          const layouts = await Promise.all(promises);
          const allIngredients: Ingredient[] = [];

          // 각 냉장고에 ROOM_TEMP 구획이 있는지 = 팬트리 사용 여부. 식재료 유무와 무관하게 항상 갱신한다
          // (빈 팬트리도 서랍/토글에 반영돼야 하므로 아래 식재료 sig 비교의 영향을 받지 않는다).
          const pantrySet = new Set<string>();
          layouts.forEach((layout, index) => {
            if (layout && Array.isArray(layout.compartments)
              && layout.compartments.some(comp => comp.storageType === 'ROOM_TEMP')) {
              pantrySet.add(refrigerators[index].id);
            }
          });
          setPantryFridgeIds(pantrySet);

          layouts.forEach((layout, index) => {
            if (!layout) return;
            const fridge = refrigerators[index];
            if (Array.isArray(layout.compartments)) {
              layout.compartments.forEach(comp => {
                comp.ingredients.forEach(ing => {
                  const deserialized = deserializeMemo(ing.memo);
                  allIngredients.push({
                    id: String(ing.id),
                    name: ing.name,
                    location: convertServerLocationToLocal(comp.storageType, comp.name),
                    subLocation: deserialized.subLocation as any,
                    category: deserialized.category,
                    expiryDate: ing.expirationDate,
                    quantity: ing.quantity,
                    unit: ing.unit,
                    memo: deserialized.memo || undefined,
                    fridgeId: fridge.id,
                  });
                });
              });
            }
            // 구획 미지정("위치 미정") 식재료
            if (Array.isArray(layout.unassignedIngredients)) {
              layout.unassignedIngredients.forEach(ing => {
                const deserialized = deserializeMemo(ing.memo);
                allIngredients.push({
                  id: String(ing.id),
                  name: ing.name,
                  location: undefined,
                  subLocation: undefined,
                  category: deserialized.category,
                  expiryDate: ing.expirationDate,
                  quantity: ing.quantity,
                  unit: ing.unit,
                  memo: deserialized.memo || undefined,
                  fridgeId: fridge.id,
                });
              });
            }
          });
          applyIngredients(allIngredients);
        } else {
          // 로컬 로드
          const ingredientsStr = await AsyncStorage.getItem('@ingredients');
          if (ingredientsStr) {
            const localIngredients: Ingredient[] = JSON.parse(ingredientsStr);
            applyIngredients(localIngredients);
          } else {
            // 로컬 저장소에 데이터 없음 → 빈 상태로 시작
            setIngredients([]);
          }
        }
      } catch (e) {
        console.error('Failed to load ingredients for visual', e);
      } finally {
        setIngredientsLoaded(true);
      }
  }, [refrigerators, isLoggedIn]);

  // 실온 보관함(팬트리) 사용 켜기/끄기. 끄려는데 안에 식재료가 있으면 서버가 400 + 안내 메시지를 주므로 그대로 노출한다.
  const handleTogglePantry = async (fridgeId: string, enable: boolean) => {
    if (pantryToggling) return;
    setPantryToggling(true);
    try {
      if (enable) {
        await enablePantry(Number(fridgeId));
      } else {
        await disablePantry(Number(fridgeId));
      }
      await loadIngredients();
    } catch (e: any) {
      const msg = e?.response?.data?.message || '실온 보관함 설정을 변경하지 못했어요.';
      Alert.alert('알림', msg);
    } finally {
      setPantryToggling(false);
    }
  };

  // 필터 다이얼로그 열기: 현재 적용된 필터를 임시 선택으로 복사해 시작한다.
  const openFilterModal = () => {
    setTempStatusFilters(statusFilters);
    setTempFridgeFilters(fridgeFilters);
    setFilterModalVisible(true);
  };

  // 임시 선택 토글 (다이얼로그 안에서만 반영, 적용 전)
  const toggleTempStatus = (status: string) => {
    setTempStatusFilters(prev => prev.includes(status) ? prev.filter(s => s !== status) : [...prev, status]);
  };
  const toggleTempFridge = (fridgeId: string) => {
    setTempFridgeFilters(prev => prev.includes(fridgeId) ? prev.filter(f => f !== fridgeId) : [...prev, fridgeId]);
  };

  // 적용: 모두 선택한 경우는 "전체"(빈 배열)로 정규화해 저장한다.
  const applyFilters = () => {
    const STATUS_KEYS = ['expired', 'imminent', 'safe'];
    setStatusFilters(tempStatusFilters.length >= STATUS_KEYS.length ? [] : tempStatusFilters);
    setFridgeFilters(tempFridgeFilters.length >= refrigerators.length ? [] : tempFridgeFilters);
    setFilterModalVisible(false);
  };

  const resetFilters = () => {
    setStatusFilters([]);
    setFridgeFilters([]);
  };

  // 필터 다이얼로그의 옵션 한 줄 (체크박스 + 라벨)
  const renderFilterOption = (key: string, label: string, selected: boolean, onPress: () => void) => (
    <TouchableOpacity key={key} style={styles.filterOptionRow} activeOpacity={0.7} onPress={onPress}>
      <Text style={[styles.filterOptionText, { color: selected ? theme.primaryText : theme.textSecondary }]}>{label}</Text>
      <Ionicons name={selected ? 'checkbox' : 'square-outline'} size={22} color={selected ? theme.primary : theme.textMuted} />
    </TouchableOpacity>
  );

  // AddIngredientModal 저장 완료 콜백: 수정된 식재료가 오면 전체 재조회 없이 로컬 상태만 갱신,
  // 등록(신규)이면 인자가 없으므로 목록을 다시 불러온다.
  const handleIngredientSaved = (updated?: Ingredient) => {
    if (!updated) {
      loadIngredients();
      return;
    }
    // 수정: 전체 재조회 없이 로컬 상태만 갱신하되, 위젯/알림도 새 목록으로 다시 계산해야 한다
    // (날짜 수정으로 만료↔임박이 바뀌어도 위젯이 즉시 반영되도록).
    const next = ingredients.map(item => (item.id === updated.id ? updated : item));
    setIngredients(next);
    rebuildAllNotifications(next);
  };

  // 식재료 목록 카드의 X 아이콘: 확인 후 즉시 삭제 (수정 모달 없이 바로 처리)
  const handleDeleteIngredient = (item: Ingredient) => {
    const performRemove = async () => {
      try {
        if (isLoggedIn) {
          await deleteIngredient(Number(item.id));
        } else {
          const ingredientsStr = await AsyncStorage.getItem('@ingredients');
          const allIngredients: Ingredient[] = ingredientsStr ? JSON.parse(ingredientsStr) : [];
          const updated = allIngredients.filter(ing => ing.id !== item.id);
          await AsyncStorage.setItem('@ingredients', JSON.stringify(updated));
          rebuildAllNotifications(updated);
        }
        loadIngredients();
      } catch (e) {
        console.error('Failed to delete ingredient', e);
        Alert.alert('오류 ⚠️', '식재료 삭제에 실패했어요.');
      }
    };

    if (Platform.OS === 'web') {
      if (window.confirm(`[${item.name}] 식재료를 삭제하시겠습니까?`)) performRemove();
    } else {
      Alert.alert(
        `[${item.name}] 식재료를 삭제하시겠습니까?`,
        undefined,
        [
          { text: '취소', style: 'cancel' },
          { text: '삭제', style: 'destructive', onPress: performRemove },
        ]
      );
    }
  };

  // 마운트 시뿐 아니라, 알림 시간 설정 등 다른 화면에 다녀와서 이 화면으로 돌아올 때도
  // 다시 불러와야 그 사이 바뀐 설정(알림 시간 등)이 바로 반영된다.
  useFocusEffect(
    React.useCallback(() => {
      loadIngredients();
    }, [loadIngredients])
  );

  // 다른 멤버가 같은 냉장고에서 식재료를 등록/수정/삭제하면 서버가 보내는 푸시를
  // _layout.tsx가 받아 이 이벤트로 알려준다. 화면을 나갔다 오지 않아도 바로 반영한다.
  useEffect(() => {
    const sub = DeviceEventEmitter.addListener('ingredientsChanged', () => {
      loadIngredients();
    });
    return () => sub.remove();
  }, [loadIngredients]);

  // 냉장고 목록 크기나 로그인 상태가 바뀌면 캐러셀 인덱스를 0으로 초기화하던 부분 수정:
  // @active_fridge_index 등 부모에서 넘어오는 activeIndex를 유지하기 위해 length가 유효한 범위라면 0으로 덮어쓰지 않도록 함.
  useEffect(() => {
    if (activeIndex >= refrigerators.length) {
      setActiveIndex(0);
    }
  }, [refrigerators.length, isLoggedIn]);

  const scrollViewRef = useRef<ScrollView>(null);

  // activeIndex 변경 시 ScrollView의 x 오프셋을 물리적으로 스크롤 이동
  useEffect(() => {
    if (mode === 'fridge') {
      const timer = setTimeout(() => {
        if (scrollViewRef.current) {
          scrollViewRef.current.scrollTo({
            x: activeIndex * screenWidth,
            animated: false,
          });
        }
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [activeIndex, mode, screenWidth, refrigerators.length]);

  // D-Day 정보 계산 헬퍼 함수
  const getDDayInfo = (expiryDate: string) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const expiry = new Date(expiryDate);
    expiry.setHours(0, 0, 0, 0);
    const diff = expiry.getTime() - today.getTime();
    const days = Math.ceil(diff / (1000 * 60 * 60 * 24));

    if (days < 0) return { text: `만료 D+${Math.abs(days)}`, color: theme.ddayExpired, days, status: 'expired' as const };
    if (days === 0) return { text: '오늘만료', color: theme.ddayImminent, days, status: 'imminent' as const };
    if (days <= 3) return { text: `D-${days}`, color: theme.ddayImminent, days, status: 'imminent' as const };
    return { text: `D-${days}`, color: theme.ddaySafe, days, status: 'safe' as const };
  };

  // 보관 위치 아이디 -> 한글 라벨 변환 헬퍼 함수
  const getCompartmentLabel = (location: string): string => {
    switch (location) {
      case 'fridge_left': return '냉장실 (좌)';
      case 'fridge_right': return '냉장실 (우)';
      case 'freezer_left': return '냉동실 (좌)';
      case 'freezer_right': return '냉동실 (우)';
      case 'fridge': return '냉장실';
      case 'freezer': return '냉동실';
      case 'pantry': return '실온 보관함';
      default: return '보관실';
    }
  };

  // 문쪽(pocket_*)에 보관 중인 식재료는 목록에서도 "문쪽"까지 표기해 구분되도록 한다
  const getLocationDisplayLabel = (locationLabel: string, subLocation?: string): string =>
    subLocation?.startsWith('pocket') ? `${locationLabel} 문쪽` : locationLabel;

  // 냉장고 타입별 보관실 목록 (도어 일러스트를 직접 탐색하지 않고 바로 선택할 수 있도록)
  const getCompartmentsForType = (type: FridgeType): { id: string; label: string }[] => {
    if (type === 'four-door') {
      return [
        { id: 'fridge_left', label: '냉장실 (좌)' },
        { id: 'fridge_right', label: '냉장실 (우)' },
        { id: 'freezer_left', label: '냉동실 (좌)' },
        { id: 'freezer_right', label: '냉동실 (우)' },
      ];
    }
    return [
      { id: 'fridge', label: '냉장실' },
      { id: 'freezer', label: '냉동실' },
    ];
  };

  // 식재료 목록 탭의 + 버튼: 등록할 냉장고부터 고르게 한다 (냉장고가 1개뿐이어도 항상 이 단계를 보여줘서
  // "어느 냉장고에 등록되는지"가 명확하도록 한다).
  const handleOpenAddLocationPicker = () => {
    if (refrigerators.length === 0) {
      onOpenAddSelector();
      return;
    }
    setAssignTargetIngredient(null);
    setAddPickerFridgeId(null);
    setAddPickerCompartmentId(null);
    setAddPickerShelves(null);
    setAddLocationPickerVisible(true);
  };

  // 위치를 나중에 정하고 싶을 때: 냉장고까지만 정하고 칸/선반은 건너뛴 채 바로 등록 폼으로 넘어간다
  const handleSkipLocationPicker = (fridgeId: string) => {
    const target = { fridgeId, serverCompartmentId: null };
    // 나머지 피커 상태는 다음에 열 때(handleOpenAddLocationPicker 등) 다시 초기화되므로 여기서는 건드리지 않는다.
    // 닫히는 fade 애니메이션 도중 내용이 초기 화면으로 바뀌어 보이는 깜빡임을 피하기 위함.
    setAddLocationPickerVisible(false);
    setAddIngredientTarget(target);
  };

  // 식재료의 위치를 (재)지정: 이미 소속 냉장고가 정해져 있으므로 냉장고 선택 단계는 건너뛰고 칸부터 고른다.
  // "위치 미정" 항목의 최초 지정과 이미 위치가 있는 항목의 위치 변경 양쪽에 쓰인다.
  const handleOpenAssignLocationPicker = (item: Ingredient) => {
    if (!item.fridgeId) return;
    setAssignTargetIngredient(item);
    setAddPickerFridgeId(item.fridgeId);
    setAddPickerCompartmentId(null);
    setAddPickerShelves(null);
    setAddLocationPickerVisible(true);
  };

  // 보관실(냉장실/냉동실 좌우) 선택 완료: 문쪽 보관 포함 선반 목록을 불러와 다음 단계(선반 선택)로 넘어간다
  const handlePickAddCompartment = async (compartmentId: string, fridgeId: string) => {
    setAddPickerCompartmentId(compartmentId);
    setAddPickerShelves(null);
    setAddPickerShelvesLoading(true);
    try {
      if (isLoggedIn) {
        const info = await getCompartmentShelves(fridgeId, compartmentId);
        // 실온 보관함(팬트리)은 칸이 1개뿐이라 선반 선택 단계를 건너뛰고 바로 그 칸으로 등록/지정한다.
        if (compartmentId === 'pantry') {
          const pantryShelfId = info.insideShelves?.[0]?.id ?? 'shelf_1';
          if (assignTargetIngredient) {
            await finalizeAssignLocation(assignTargetIngredient, compartmentId, pantryShelfId, info.serverCompartmentId ?? null);
          } else {
            setAddLocationPickerVisible(false);
            setAddIngredientTarget({
              fridgeId,
              compartmentId,
              shelfId: pantryShelfId,
              serverCompartmentId: info.serverCompartmentId ?? null,
            });
          }
          return;
        }
        setAddPickerShelves(info);
      } else {
        const configStr = await AsyncStorage.getItem(`@shelf_config_${fridgeId}_${compartmentId}`);
        if (configStr) {
          const config = JSON.parse(configStr);
          setAddPickerShelves({
            serverCompartmentId: null,
            insideShelves: config.insideShelves || DEFAULT_INSIDE_SHELVES,
            doorShelves: config.doorShelves || DEFAULT_DOOR_SHELVES,
            hasDoorStorage: config.hasDoorStorage !== undefined ? config.hasDoorStorage : true,
          });
        } else {
          setAddPickerShelves({
            serverCompartmentId: null,
            insideShelves: DEFAULT_INSIDE_SHELVES,
            doorShelves: DEFAULT_DOOR_SHELVES,
            hasDoorStorage: true,
          });
        }
      }
    } catch (e) {
      console.error('Failed to load shelves for add picker', e);
      setAddPickerShelves({
        serverCompartmentId: null,
        insideShelves: DEFAULT_INSIDE_SHELVES,
        doorShelves: DEFAULT_DOOR_SHELVES,
        hasDoorStorage: true,
      });
    } finally {
      setAddPickerShelvesLoading(false);
    }
  };

  // 선반 선택 완료: 기존 식재료의 위치를 (재)지정하는 중이면 그쪽으로, 아니면 신규 등록 폼으로
  const handlePickAddShelf = (shelfId: string) => {
    if (!addPickerFridgeId || !addPickerCompartmentId) return;
    if (assignTargetIngredient) {
      finalizeAssignLocation(assignTargetIngredient, addPickerCompartmentId, shelfId);
      return;
    }
    const target = {
      fridgeId: addPickerFridgeId,
      compartmentId: addPickerCompartmentId,
      shelfId,
      serverCompartmentId: addPickerShelves?.serverCompartmentId ?? null,
    };
    // 나머지 피커 상태는 다음에 열 때 다시 초기화되므로 여기서는 건드리지 않는다 (닫히는 fade 도중 깜빡임 방지).
    setAddLocationPickerVisible(false);
    setAddIngredientTarget(target);
  };

  // 식재료에 구획/선반을 (재)지정한다. 등록(POST)이 아니라 수정(PATCH)이므로
  // AddIngredientModal이 아니라 여기서 직접 처리하고 로컬 상태만 갱신한다.
  const finalizeAssignLocation = async (item: Ingredient, compartmentId: string, shelfId: string, serverCompartmentIdOverride?: number | null) => {
    const serverCompartmentId = serverCompartmentIdOverride !== undefined ? serverCompartmentIdOverride : (addPickerShelves?.serverCompartmentId ?? null);
    setAddLocationPickerVisible(false);
    try {
      if (isLoggedIn) {
        if (!serverCompartmentId) {
          throw new Error('서버 구획 ID를 로드하지 못했어요.');
        }
        const memoContent = serializeMemo(item.category, shelfId, item.memo || '');
        await updateIngredient(Number(item.id), { compartmentId: serverCompartmentId, memo: memoContent });
      } else {
        const ingredientsStr = await AsyncStorage.getItem('@ingredients');
        const allIngredients: Ingredient[] = ingredientsStr ? JSON.parse(ingredientsStr) : [];
        const updated = allIngredients.map(ing =>
          ing.id === item.id ? { ...ing, location: compartmentId, subLocation: shelfId as any } : ing
        );
        await AsyncStorage.setItem('@ingredients', JSON.stringify(updated));
        rebuildAllNotifications(updated);
      }
      setIngredients(prev => prev.map(ing =>
        ing.id === item.id ? { ...ing, location: compartmentId, subLocation: shelfId as any } : ing
      ));
    } catch (e) {
      console.error('Failed to assign location', e);
      Alert.alert('오류 ⚠️', '위치를 지정하지 못했어요.');
    }
  };

  // 특정 칸에 든 식재료를 "이름 개수"로 유리질감 패널 안에 나열한다. 많아지면 패널 안에서 세로 스크롤.
  // handleSide: 이 도어의 손잡이가 좌/우 어느 쪽에 있는지. 손잡이 쪽 여백은 그대로 두고
  // 반대쪽(바깥쪽) 여백만 줄여서 패널을 넓힌다. 손잡이가 위/아래에 있는 도어(가로 손잡이)는 생략.
  const renderDoorIngredientPreview = (fridgeId: string, compartmentId: string, handleSide?: 'left' | 'right') => {
    const compIngredients = ingredients.filter(
      item => item.fridgeId === fridgeId && item.location === compartmentId
    );
    const horizontalMargin =
      handleSide === 'right' ? { marginLeft: 0, marginRight: 8 }
      : handleSide === 'left' ? { marginLeft: 8, marginRight: 0 }
      : { marginLeft: 8, marginRight: 8 };

    return (
      <View style={[styles.doorGlassPanel, horizontalMargin, { backgroundColor: theme.glassBg, borderColor: theme.glassBorder }]}>
        {compIngredients.length === 0 ? (
          <Text style={[styles.doorGlassEmptyText, { color: theme.textMuted }]}>비어 있음</Text>
        ) : (
          <ScrollView style={styles.doorGlassScroll} nestedScrollEnabled showsVerticalScrollIndicator={false} contentContainerStyle={styles.doorGlassListContent}>
            {compIngredients.map((item, index) => (
              <View
                key={item.id}
                style={[
                  styles.doorGlassItemRow,
                  index < compIngredients.length - 1 && { borderBottomWidth: 1, borderBottomColor: theme.glassBorder },
                ]}
              >
                <Text style={[styles.doorGlassItemName, { color: theme.fridgeLabel }]} numberOfLines={1} ellipsizeMode="tail">
                  {item.name}
                </Text>
                <Text style={[styles.doorGlassItemQty, { color: theme.fridgeLabel }]} numberOfLines={1}>
                  {item.quantity}{item.unit}
                </Text>
              </View>
            ))}
          </ScrollView>
        )}
      </View>
    );
  };

  // 특정 구획의 D-Day 경고/만료 상태 계산
  const getCompartmentAlertStatus = (fridgeId: string, compartmentId: string) => {
    const compIngredients = ingredients.filter(
      item => item.fridgeId === fridgeId && item.location === compartmentId
    );
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let expiredCount = 0;
    let imminentCount = 0;

    compIngredients.forEach(item => {
      const expiry = new Date(item.expiryDate);
      expiry.setHours(0, 0, 0, 0);
      const diff = expiry.getTime() - today.getTime();
      const days = Math.ceil(diff / (1000 * 60 * 60 * 24));

      if (days < 0) {
        expiredCount++;
      } else if (days <= 3) {
        imminentCount++;
      }
    });

    return { expiredCount, imminentCount };
  };

  // 문(도어) 영역에 나타날 실시간 알림 뱃지 렌더러 (발광 효과 포함)
  const renderDoorAlertBadge = (fridgeId: string, compartmentId: string) => {
    const { expiredCount, imminentCount } = getCompartmentAlertStatus(fridgeId, compartmentId);
    
    if (expiredCount === 0 && imminentCount === 0) return null;

    const isExpired = expiredCount > 0;
    const badgeColor = isExpired ? '#EF4444' : '#FF9800'; // red vs orange (semantic)
    const labelText = isExpired ? `만료 ${expiredCount}` : `임박 ${imminentCount}`;
    const glowColor = isExpired ? theme.glowDanger : theme.glowWarning;

    return (
      <View 
        style={[
          styles.doorAlertBadge, 
          { 
            backgroundColor: badgeColor,
            shadowColor: badgeColor,
            borderColor: glowColor,
          }
        ]}
      >
        <Text style={styles.doorAlertBadgeText}>
          {labelText}
        </Text>
      </View>
    );
  };

  // 슬라이드 데이터 페이지 구성 (등록된 냉장고들 + 3개 미만일 때 추가 버튼 노출)
  const pages: ({ type: 'fridge'; data: typeof refrigerators[0] } | { type: 'add' })[] = [];
  refrigerators.forEach(fridge => {
    pages.push({ type: 'fridge', data: fridge });
  });
  if (refrigerators.length < 3) {
    pages.push({ type: 'add' });
  }

  // 현재 노출 중인 활성 냉장고
  const activeFridge = pages[activeIndex]?.type === 'fridge' ? pages[activeIndex].data : null;

  // 가로 스크롤 시 활성 슬라이드 인덱스 동적 갱신
  const handleScroll = (event: any) => {
    const x = event.nativeEvent.contentOffset.x;
    const index = Math.round(x / screenWidth);
    if (index !== activeIndex) {
      setActiveIndex(index);
    }
  };

  // 각 냉장고 타입별 렌더링 헬퍼
  const renderFourDoor = (fridgeId: string) => {
    return (
      <View style={[styles.fridgeFrame, { backgroundColor: theme.fridgeFrame, shadowColor: theme.shadow }]}>
        {/* 상단 냉장실 */}
        <View style={styles.horizontalRow}>
          <TouchableOpacity
            style={[styles.door, styles.topLeftRadius, { backgroundColor: theme.fridgeDoor, borderColor: theme.glassBorder }]}
            activeOpacity={0.8}
            onPress={() => onPressCompartment('fridge_left', '냉장실 (좌)', fridgeId)}
          >
            {renderDoorAlertBadge(fridgeId, 'fridge_left')}
            <Text style={[styles.doorLabel, { color: theme.fridgeLabel }]}>냉장실</Text>
            {renderDoorIngredientPreview(fridgeId, 'fridge_left', 'right')}
            <View style={[styles.handle, styles.verticalHandleRight]} />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.door, styles.topRightRadius, { backgroundColor: theme.fridgeDoor, borderColor: theme.glassBorder }]}
            activeOpacity={0.8}
            onPress={() => onPressCompartment('fridge_right', '냉장실 (우)', fridgeId)}
          >
            {renderDoorAlertBadge(fridgeId, 'fridge_right')}
            <Text style={[styles.doorLabel, { color: theme.fridgeLabel }]}>냉장실</Text>
            {renderDoorIngredientPreview(fridgeId, 'fridge_right', 'left')}
            <View style={[styles.handle, styles.verticalHandleLeft]} />
          </TouchableOpacity>
        </View>

        {/* 중간 구분선 */}
        <View style={[styles.dividerLine, { backgroundColor: theme.fridgeFrame }]} />

        {/* 하단 냉동실 */}
        <View style={styles.horizontalRow}>
          <TouchableOpacity
            style={[styles.door, styles.bottomLeftRadius, { backgroundColor: theme.freezerDoor, borderColor: theme.glassBorder }]}
            activeOpacity={0.8}
            onPress={() => onPressCompartment('freezer_left', '냉동실 (좌)', fridgeId)}
          >
            {renderDoorAlertBadge(fridgeId, 'freezer_left')}
            <Text style={[styles.doorLabel, { color: theme.fridgeLabel }]}>냉동실</Text>
            {renderDoorIngredientPreview(fridgeId, 'freezer_left', 'right')}
            <View style={[styles.handle, styles.verticalHandleRight]} />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.door, styles.bottomRightRadius, { backgroundColor: theme.freezerDoor, borderColor: theme.glassBorder }]}
            activeOpacity={0.8}
            onPress={() => onPressCompartment('freezer_right', '냉동실 (우)', fridgeId)}
          >
            {renderDoorAlertBadge(fridgeId, 'freezer_right')}
            <Text style={[styles.doorLabel, { color: theme.fridgeLabel }]}>냉동실</Text>
            {renderDoorIngredientPreview(fridgeId, 'freezer_right', 'left')}
            <View style={[styles.handle, styles.verticalHandleLeft]} />
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const renderSideBySide = (fridgeId: string) => {
    return (
      <View style={[styles.fridgeFrame, { backgroundColor: theme.fridgeFrame, shadowColor: theme.shadow }]}>
        <View style={[styles.horizontalRow, { flex: 1 }]}>
          {/* 좌측 냉동실 */}
          <TouchableOpacity
            style={[styles.door, styles.topLeftRadius, styles.bottomLeftRadius, { flex: 4, backgroundColor: theme.freezerDoor, borderColor: theme.glassBorder }]}
            activeOpacity={0.8}
            onPress={() => onPressCompartment('freezer', '냉동실', fridgeId)}
          >
            {renderDoorAlertBadge(fridgeId, 'freezer')}
            <Text style={[styles.doorLabel, { color: theme.fridgeLabel }]}>냉동실</Text>
            {renderDoorIngredientPreview(fridgeId, 'freezer', 'right')}
            <View style={[styles.handle, styles.verticalHandleRight]} />
          </TouchableOpacity>

          {/* 우측 냉장실 */}
          <TouchableOpacity
            style={[styles.door, styles.topRightRadius, styles.bottomRightRadius, { flex: 6, backgroundColor: theme.fridgeDoor, borderColor: theme.glassBorder }]}
            activeOpacity={0.8}
            onPress={() => onPressCompartment('fridge', '냉장실', fridgeId)}
          >
            {renderDoorAlertBadge(fridgeId, 'fridge')}
            <Text style={[styles.doorLabel, { color: theme.fridgeLabel }]}>냉장실</Text>
            {renderDoorIngredientPreview(fridgeId, 'fridge', 'left')}
            <View style={[styles.handle, styles.verticalHandleLeft]} />
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const renderTwoDoor = (fridgeId: string) => {
    return (
      <View style={[styles.fridgeFrame, { backgroundColor: theme.fridgeFrame, shadowColor: theme.shadow }]}>
        {/* 상단 냉동실 */}
        <TouchableOpacity
          style={[styles.door, styles.topLeftRadius, styles.topRightRadius, { flex: 3.5, width: '100%', backgroundColor: theme.freezerDoor, borderColor: theme.glassBorder }]}
          activeOpacity={0.8}
          onPress={() => onPressCompartment('freezer', '냉동실', fridgeId)}
        >
          {renderDoorAlertBadge(fridgeId, 'freezer')}
          <Text style={[styles.doorLabel, { color: theme.fridgeLabel }]}>냉동실</Text>
          {renderDoorIngredientPreview(fridgeId, 'freezer')}
          <View style={[styles.handle, styles.horizontalHandleBottom]} />
        </TouchableOpacity>

        {/* 중간 구분선 */}
        <View style={[styles.dividerLine, { backgroundColor: theme.fridgeFrame }]} />

        {/* 하단 냉장실 */}
        <TouchableOpacity
          style={[styles.door, styles.bottomLeftRadius, styles.bottomRightRadius, { flex: 6.5, width: '100%', backgroundColor: theme.fridgeDoor, borderColor: theme.glassBorder }]}
          activeOpacity={0.8}
          onPress={() => onPressCompartment('fridge', '냉장실', fridgeId)}
        >
          {renderDoorAlertBadge(fridgeId, 'fridge')}
          <Text style={[styles.doorLabel, { color: theme.fridgeLabel }]}>냉장실</Text>
          {renderDoorIngredientPreview(fridgeId, 'fridge')}
          <View style={[styles.handle, styles.horizontalHandleTop]} />
        </TouchableOpacity>
      </View>
    );
  };

  // 실온 보관함(팬트리) — 냉장고 그림 아래에 붙는 단순 버튼. ROOM_TEMP 구획이 있는 냉장고에서만 노출된다.
  // 냉장/냉동 도어와 달리 손잡이·내용물 미리보기는 두지 않고, 유통기한 경고 배지만 남긴다.
  const renderPantryDrawer = (fridgeId: string) => {
    if (!pantryFridgeIds.has(fridgeId)) return null;
    return (
      <TouchableOpacity
        style={[styles.pantryButton, { backgroundColor: theme.surfaceTertiary, borderColor: theme.borderLight }]}
        activeOpacity={0.75}
        onPress={() => onPressCompartment('pantry', '실온 보관함', fridgeId)}
      >
        {renderDoorAlertBadge(fridgeId, 'pantry')}
        <Ionicons name="cube-outline" size={18} color={theme.textSecondary} />
        <Text style={[styles.pantryButtonText, { color: theme.textSecondary }]}>실온 보관함</Text>
      </TouchableOpacity>
    );
  };

  // 유통기한 기준 화면의 통계 계산
  const getStats = () => {
    let expired = 0;
    let imminent = 0;
    let safe = 0;

    ingredients.forEach(item => {
      const dday = getDDayInfo(item.expiryDate);
      if (dday.status === 'expired') expired++;
      else if (dday.status === 'imminent') imminent++;
      else safe++;
    });

    return { expired, imminent, safe };
  };

  const { expired: totalExpired, imminent: totalImminent, safe: totalSafe } = getStats();

  // 유통기한이 임박(3일 이내)했거나 이미 만료된 식재료
  const urgentIngredients = ingredients
    .filter(item => {
      const dday = getDDayInfo(item.expiryDate);
      return dday.status === 'expired' || dday.status === 'imminent';
    })
    .sort((a, b) => {
      const ddayA = getDDayInfo(a.expiryDate);
      const ddayB = getDDayInfo(b.expiryDate);
      return ddayA.days - ddayB.days;
    });

  // 실시간 검색 및 상태 필터링이 적용된 식재료 목록
  // 식재료 id에서 등록 순서 값을 뽑는다. 로컬은 `ing_<ms>`(타임스탬프), 서버는 숫자 auto-increment.
  const registrationOrder = (id: string): number => {
    const local = /^ing_(\d+)$/.exec(id);
    if (local) return Number(local[1]);
    const n = Number(id);
    return Number.isFinite(n) ? n : 0;
  };

  const filteredIngredients = ingredients
    .filter(item => {
      if (searchQuery.trim()) {
        return item.name.toLowerCase().includes(searchQuery.toLowerCase());
      }
      return true;
    })
    .filter(item => {
      if (statusFilters.length === 0) return true;
      const dday = getDDayInfo(item.expiryDate);
      return statusFilters.includes(dday.status);
    })
    .filter(item => {
      if (fridgeFilters.length === 0) return true;
      return fridgeFilters.includes(item.fridgeId ?? '');
    })
    // 등록 순서 desc(최근 등록이 최상단). 서버 id는 auto-increment, 로컬 id는 `ing_<타임스탬프>`라
    // 둘 다 값이 클수록 최신 → 등록순과 일치한다. (한 목록은 서버/로컬 중 하나라 값이 섞이지 않음)
    .sort((a, b) => registrationOrder(b.id) - registrationOrder(a.id));

  // 현재 월 기준 제철 식재료 목록 필터링
  const currentMonth = new Date().getMonth() + 1;
  const seasonalIngredients = SEASONAL_INGREDIENTS.filter(item => item.months.includes(currentMonth));

  // 유튜브 이동 핸들러 (OS 스마트 링크 기능에 위임하여 공식 유튜브 앱 또는 외부 브라우저에서 100% 확실히 검색 결과 오픈)
  const handleOpenYoutube = async (input: string, name: string) => {
    // 특정 비디오 ID 다이렉트 재생 시 유튜브 앱의 지역/저작권/기기별 차단 오류가 종종 발생하므로,
    // 해당 식재료 명칭의 최적 검색 쿼리를 바탕으로 한 검색 결과 페이지를 제공하여 에러를 100% 원천 예방하고 다양한 정보를 선택해 보게 합니다.
    // 제철 식재료 등의 검색(예: 레시피)인 경우 전달받은 input을 사용하고, 그렇지 않으면 기본적으로 "[식재료명] 보관법"으로 검색되도록 분기 처리합니다.
    let searchQuery = input;
    const isVideoId = /^[a-zA-Z0-9_-]{11}$/.test(input);
    if (!searchQuery || searchQuery === name || isVideoId) {
      searchQuery = `${name} 보관법`;
    }
    const url = `https://www.youtube.com/results?search_query=${encodeURIComponent(searchQuery)}`;

    try {
      // Linking.openURL은 기기에 유튜브 앱이 있다면 앱으로 바로 열고, 없다면 기본 외부 브라우저(크롬/사파리)로 100% 안전하게 실행합니다.
      await Linking.openURL(url);
    } catch (err) {
      console.error("Failed to open YouTube link via Linking, trying WebBrowser fallback:", err);
      try {
        await WebBrowser.openBrowserAsync(url, {
          readerMode: false,
          dismissButtonStyle: 'close',
          toolbarColor: '#FFFFFF',
          enableBarCollapsing: true,
        });
      } catch (browserErr) {
        console.error("Failed to open YouTube link via WebBrowser:", browserErr);
        Alert.alert("알림 ⚠️", "유튜브 링크를 열 수 없어요.");
      }
    }
  };



  // 기기 GPS 위치 권한 요청 및 실시간 날씨 연동 식중독 지수 조회
  const requestLocationAndFetchWeather = async () => {
    // 30분 캐시 체크
    const now = Date.now();
    if (weatherCache && (now - weatherCache.timestamp) < CACHE_DURATION) {
      setWeatherInfo(weatherCache.weatherInfo);
      setLocationPermission(weatherCache.locationPermission);
      return;
    }

    setWeatherInfo(prev => ({ ...prev, loading: true }));
    let latitude = 37.566;
    let longitude = 126.978;
    let city = '서울';
    let ipSuccess = false;

    try {
      // 1. 위치 정보 접근 권한 동의 요청
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        const newWeather = { ...weatherInfo, loading: false };
        setLocationPermission('denied');
        setWeatherInfo(newWeather);
        weatherCache = {
          weatherInfo: newWeather,
          locationPermission: 'denied',
          timestamp: Date.now()
        };
        return;
      }

      setLocationPermission('granted');

      // 2. 먼저 IP Geolocation으로 백업 위치 및 한글 도시명 확보 시도 (한글 지원 ipwho.is 우선)
      try {
        const ipWhoResponse = await fetch('https://ipwho.is/?lang=ko');
        if (ipWhoResponse.ok) {
          const data = await ipWhoResponse.json();
          if (data.success) {
            latitude = data.latitude || 37.566;
            longitude = data.longitude || 126.978;
            const reg = data.region || '';
            const ct = data.city || '';
            
            let formatted = '';
            if (reg && ct) {
              if (reg.includes(ct) || ct.includes(reg)) {
                formatted = reg;
              } else {
                formatted = `${reg} ${ct}`;
              }
            } else {
              formatted = reg || ct || '';
            }
            city = formatKoreanRegion(formatted) || '서울';
            ipSuccess = true;
          }
        }
      } catch (ipWhoErr) {
        console.warn('ipwho.is failed, trying geolocation-db:', ipWhoErr);
      }

      if (!ipSuccess) {
        try {
          const dbResponse = await fetch('https://geolocation-db.com/json/');
          if (dbResponse.ok) {
            const data = await dbResponse.json();
            latitude = data.latitude || 37.566;
            longitude = data.longitude || 126.978;
            city = translateEnglishToKorean(data.city || data.state || '') || '서울';
            ipSuccess = true;
          }
        } catch (dbErr) {
          console.warn('geolocation-db failed, trying ipapi.co:', dbErr);
        }
      }

      if (!ipSuccess) {
        try {
          const coResponse = await fetch('https://ipapi.co/json/');
          if (coResponse.ok) {
            const data = await coResponse.json();
            latitude = data.latitude || 37.566;
            longitude = data.longitude || 126.978;
            city = translateEnglishToKorean(data.city || data.region || '') || '서울';
            ipSuccess = true;
          }
        } catch (coErr) {
          console.warn('ipapi.co failed, keeping default (Seoul):', coErr);
        }
      }

      let gpsSuccess = false;

      // 3. GPS 위치 조회 시도 (마지막 알려진 위치 우선 조회 및 3초 시간초과 레이스)
      try {
        const lastKnown = await Location.getLastKnownPositionAsync();
        if (lastKnown) {
          latitude = lastKnown.coords.latitude;
          longitude = lastKnown.coords.longitude;
          gpsSuccess = true;
        } else {
          // GPS 하드웨어를 직접 흔들기 위한 Balanced 정확도 요청 + 3초 시간초과
          const gpsPromise = Location.getCurrentPositionAsync({
            accuracy: Location.Accuracy.Balanced,
          });
          const timeoutPromise = new Promise<never>((_, reject) =>
            setTimeout(() => reject(new Error('GPS Timeout')), 3000)
          );
          const loc = await Promise.race([gpsPromise, timeoutPromise]) as any;
          if (loc && loc.coords) {
            latitude = loc.coords.latitude;
            longitude = loc.coords.longitude;
            gpsSuccess = true;
          }
        }
      } catch (gpsError) {
        console.warn('GPS location failed, keeping IP location:', gpsError);
      }

      // 4. 역지오코딩 시도 (GPS로 실좌표 획득 성공 시 한글 세부 지명으로 정밀화)
      if (gpsSuccess) {
        try {
          const address = await Location.reverseGeocodeAsync({ latitude, longitude });
          if (address && address.length > 0) {
            const item = address[0];
            const region = item.region || '';
            const subregion = item.subregion || '';
            const district = item.district || item.city || '';
            
            let formattedRegion = region;
            if (region.includes('특별')) formattedRegion = '서울';
            else if (region.includes('광역시')) formattedRegion = region.replace('광역시', '');
            else if (region.includes('특별자치시')) formattedRegion = '세종';
            else if (region.includes('도')) formattedRegion = region.replace('특별자치도', '').replace('도', '');

            const localCity = `${formattedRegion} ${district || subregion}`.trim();
            if (localCity) {
              city = localCity;
            }
          }
        } catch (err) {
          console.warn('Device reverse geocoding failed, keeping IP city name:', err);
          // 에뮬레이터 에러 등으로 지오코딩 실패 시 앞서 IP Geolocation으로 얻은 한글 지명을 그대로 유지
        }
      }

      // 5. Open-Meteo 실시간 기상 데이터(기온, 상대습도) 호출
      const weatherUrl = `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,relative_humidity_2m`;
      const response = await fetch(weatherUrl);
      if (!response.ok) throw new Error('Weather forecast API failed');
      const data = await response.json();

      const temp = data.current.temperature_2m;
      const humidity = data.current.relative_humidity_2m;

      // 6. 온도와 상대습도 기반 식중독 예측 모델 (제곱 곡선 활용하여 여름철 폭발적 증식 반영)
      const tempFactor = Math.pow(Math.max(0, Math.min(40, temp)) / 40, 2) * 70;
      const humidityFactor = ((Math.max(20, Math.min(100, humidity)) - 20) / 80) * 30;
      const index = Math.round(tempFactor + humidityFactor);

      let level: '관심' | '주의' | '경고' | '위험' = '주의';
      let color = theme.ddayImminent;
      let description = '식재료 보관 온도에 유의하고 조리 기구의 청결을 유지해 주세요. ⚠️';

      if (index <= 34) {
        level = '관심';
        color = theme.ddaySafe;
        description = '식중독 발생 가능성이 낮아요. 일반적인 위생 수칙을 준수하세요. 🍃';
      } else if (index <= 70) {
        level = '주의';
        color = theme.ddayImminent;
        description = '식재료 보관 온도에 유의하고 조리 기구의 청결을 유지해 주세요. ⚠️';
      } else if (index <= 85) {
        level = '경고';
        color = '#F97316';
        description = '조리 식품은 충분히 익혀 드시고, 남은 음식은 즉시 냉장고에 보관하세요! 🍊';
      } else {
        level = '위험';
        color = theme.ddayExpired;
        description = '식중독 위험이 매우 높습니다! 가열되지 않은 음식은 피하고 식기 소독에 유의하세요. 🚨';
      }

      const newWeather = {
        index,
        level,
        color,
        bgColor: color + '12',
        description,
        temp,
        humidity,
        city,
        loading: false,
        isFallback: false,
      };
      setWeatherInfo(newWeather);
      
      weatherCache = {
        weatherInfo: newWeather,
        locationPermission: 'granted',
        timestamp: Date.now()
      };
    } catch (e) {
      console.warn('Real-time weather query completely failed, fallback to offline simulation:', e);
      
      const today = new Date();
      const month = today.getMonth() + 1;

      // 1. 월별 평균 기상 데이터를 폴백 값으로 매칭하여 온도/습도 항상 디스플레이
      const avgWeather = MONTHLY_AVERAGE_WEATHER[month] || { temp: 15, humidity: 60 };
      const temp = avgWeather.temp;
      const humidity = avgWeather.humidity;

      // 2. 실시간 모드와 동일한 예측 공식을 적용하여 지수의 일관성 유지
      const tempFactor = Math.pow(Math.max(0, Math.min(40, temp)) / 40, 2) * 70;
      const humidityFactor = ((Math.max(20, Math.min(100, humidity)) - 20) / 80) * 30;
      const index = Math.round(tempFactor + humidityFactor);

      let level: '관심' | '주의' | '경고' | '위험' = '주의';
      let color = theme.ddayImminent;
      let description = '식재료 보관 온도에 유의하고 조리 기구의 청결을 유지해 주세요. ⚠️';

      if (index <= 34) {
        level = '관심';
        color = theme.ddaySafe;
        description = '식중독 발생 가능성이 낮아요. 일반적인 위생 수칙을 준수하세요. 🍃';
      } else if (index <= 70) {
        level = '주의';
        color = theme.ddayImminent;
        description = '식재료 보관 온도에 유의하고 조리 기구의 청결을 유지해 주세요. ⚠️';
      } else if (index <= 85) {
        level = '경고';
        color = '#F97316';
        description = '조리 식품은 충분히 익혀 드시고, 남은 음식은 즉시 냉장고에 보관하세요! 🍊';
      } else {
        level = '위험';
        color = theme.ddayExpired;
        description = '식중독 위험이 매우 높습니다! 가열되지 않은 음식은 피하고 식기 소독에 유의하세요. 🚨';
      }

      const newWeather = {
        index,
        level,
        color,
        bgColor: color + '12',
        description,
        temp,
        humidity,
        city: city || '위생 예보',
        loading: false,
        isFallback: true,
      };
      setWeatherInfo(newWeather);
      setLocationPermission('granted'); // 폴백 모드이므로 정상 표시
      
      weatherCache = {
        weatherInfo: newWeather,
        locationPermission: 'granted',
        timestamp: Date.now()
      };
    }
  };

  // 위치 권한을 앱 실행과 동시에 요청하지 않고, 이미 허용된 이력이 있을 때만 조용히 조회한다.
  // 아직 허용/거부 이력이 없으면(undetermined) 사용자가 카드를 직접 탭해야 권한 다이얼로그가 뜬다.
  useEffect(() => {
    const checkExistingPermission = async () => {
      const now = Date.now();
      if (weatherCache && (now - weatherCache.timestamp) < CACHE_DURATION) {
        setWeatherInfo(weatherCache.weatherInfo);
        setLocationPermission(weatherCache.locationPermission);
        return;
      }
      const { status } = await Location.getForegroundPermissionsAsync();
      if (status === 'granted') {
        requestLocationAndFetchWeather();
      } else if (status === 'denied') {
        setLocationPermission('denied');
      }
    };
    checkExistingPermission();
  }, [theme]);

  // 인사말에 항상 표시할 닉네임 (미로그인 시 설정 화면과 동일하게 '익명 사용자'로 표기)
  const greetingName = isLoggedIn && user?.name ? user.name : '익명 사용자';

  // 인사말: 랜덤 후보 뽑기 + 캐싱 대신, 현재 냉장고 상태를 그대로 반영하는 결정론적 문구.
  // 캐시가 없으므로 만료/임박 개수가 바뀌면 즉시 따라간다.
  const totalIngredientCount = totalExpired + totalImminent + totalSafe;
  const greeting = !ingredientsLoaded
    ? ''
    : totalExpired > 0
      ? `만료된 식재료 ${totalExpired}개, 지금 확인해보세요`
      : totalImminent > 0
        ? `곧 만료되는 식재료 ${totalImminent}개가 있어요`
        : totalIngredientCount > 0
          ? `등록된 식재료 ${totalIngredientCount}개, 모두 안전해요`
          : `등록된 식재료가 없어요`;

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      {/* 1. 상단 얇고 구분선 없는 브랜드 헤더바 */}
      {mode === 'home' && (
        <View style={[styles.slimHeader, { backgroundColor: theme.background }]}>
          <View style={styles.headerLeft}>
            <Text style={[styles.headerGreetingName, { color: theme.textSecondary }]} numberOfLines={1}>
              {greetingName}님,
            </Text>
            <Text
              style={[styles.headerGreetingMessage, { color: theme.textPrimary }]}
              numberOfLines={1}
              ellipsizeMode="tail"
            >
              {greeting}
            </Text>
          </View>
        </View>
      )}

      {mode === 'home' && (
        <ScrollView
          style={styles.dashboardScrollView}
          contentContainerStyle={styles.dashboardContent}
          showsVerticalScrollIndicator={false}
        >
          {/* 게스트 로그인 유도 문구 — 대시보드 바로 위, 왼쪽 정렬. 소셜 로그인 사용자에겐 숨김. */}
          {!isSocialUser && (
            <TouchableOpacity
              style={styles.loginNudge}
              activeOpacity={0.7}
              onPress={() => onRequestLogin?.()}
            >
              <Ionicons name="lock-closed-outline" size={13} color={theme.textSecondary} />
              <Text style={[styles.loginNudgeText, { color: theme.textSecondary }]}>
                더 안전한 데이터 보관을 위해 로그인해주세요
              </Text>
              <Ionicons name="chevron-forward" size={13} color={theme.textSecondary} />
            </TouchableOpacity>
          )}

          {/* 식재료 신선도 요약 대시보드 */}
          {(() => {
            // 아래 만료/임박/안전 통계와 겹치지 않도록, 상단에는 "앞으로 7일간 며칠에 몇 개가
            // 도래하는지"를 보여주는 미니 타임라인을 둔다 (이미 만료된 것은 통계 블록에서 강조되므로 제외).
            const WEEKDAY_LABELS = ['일', '월', '화', '수', '목', '금', '토'];
            const weeklyBuckets = Array.from({ length: 7 }, (_, i) => {
              const date = new Date();
              date.setHours(0, 0, 0, 0);
              date.setDate(date.getDate() + i);
              return {
                label: i === 0 ? '오늘' : WEEKDAY_LABELS[date.getDay()],
                count: 0,
                isNear: i <= 3,
              };
            });
            ingredients.forEach(item => {
              const days = getDDayInfo(item.expiryDate).days;
              if (days >= 0 && days <= 6) {
                weeklyBuckets[days].count += 1;
              }
            });
            const maxCount = Math.max(1, ...weeklyBuckets.map(b => b.count));

            return (
              <View style={[styles.mainDashboardCard, { backgroundColor: theme.surface, borderColor: theme.borderLight }]}>
                <View style={styles.weeklyTimelineRow}>
                  {weeklyBuckets.map((bucket, i) => {
                    const barColor = bucket.isNear ? theme.ddayImminent : theme.ddaySafe;
                    return (
                      <View key={i} style={styles.weeklyDayColumn}>
                        <Text style={[styles.weeklyDayCount, { color: bucket.count > 0 ? theme.textPrimary : theme.textMuted }]}>
                          {bucket.count > 0 ? bucket.count : ''}
                        </Text>
                        <View style={styles.weeklyDayBar}>
                          <View
                            style={[
                              styles.weeklyDayBarFill,
                              {
                                height: bucket.count > 0 ? `${Math.max(14, (bucket.count / maxCount) * 100)}%` : 4,
                                backgroundColor: bucket.count > 0 ? barColor : theme.borderLight,
                              },
                            ]}
                          />
                        </View>
                        <Text style={[styles.weeklyDayLabel, { color: theme.textTertiary }]}>{bucket.label}</Text>
                      </View>
                    );
                  })}
                </View>

                {/* 만료/임박/안전 각각 개수를 큼직하게 부각 (도넛 대신 숫자 자체가 주인공) */}
                <View style={styles.statBlockRow}>
                  <TouchableOpacity
                    style={[styles.statBlock, statusFilters.includes('expired') && { backgroundColor: theme.ddayExpired + '12' }]}
                    activeOpacity={0.7}
                    onPress={() => {
                      setStatusFilters(['expired']);
                      onChangeTab?.('ingredients');
                    }}
                  >
                    <Text style={[styles.statBlockValue, { color: theme.ddayExpired }]}>{totalExpired}</Text>
                    <Text style={[styles.statBlockLabel, { color: theme.textSecondary }]}>만료</Text>
                  </TouchableOpacity>

                  <View style={[styles.statBlockDivider, { backgroundColor: theme.borderLight }]} />

                  <TouchableOpacity
                    style={[styles.statBlock, statusFilters.includes('imminent') && { backgroundColor: theme.ddayImminent + '12' }]}
                    activeOpacity={0.7}
                    onPress={() => {
                      setStatusFilters(['imminent']);
                      onChangeTab?.('ingredients');
                    }}
                  >
                    <Text style={[styles.statBlockValue, { color: theme.ddayImminent === '#EAB308' ? '#CA8A04' : theme.ddayImminent }]}>{totalImminent}</Text>
                    <Text style={[styles.statBlockLabel, { color: theme.textSecondary }]}>임박</Text>
                  </TouchableOpacity>

                  <View style={[styles.statBlockDivider, { backgroundColor: theme.borderLight }]} />

                  <TouchableOpacity
                    style={[styles.statBlock, statusFilters.includes('safe') && { backgroundColor: theme.ddaySafe + '12' }]}
                    activeOpacity={0.7}
                    onPress={() => {
                      setStatusFilters(['safe']);
                      onChangeTab?.('ingredients');
                    }}
                  >
                    <Text style={[styles.statBlockValue, { color: theme.ddaySafe }]}>{totalSafe}</Text>
                    <Text style={[styles.statBlockLabel, { color: theme.textSecondary }]}>안전</Text>
                  </TouchableOpacity>
                </View>
              </View>
            );
          })()}

          {/* 유통기한 임박 식재료 (세로 스크롤 리스트) */}
          <View style={[styles.sectionContainer, { marginTop: 28 }]}>
            <View style={styles.sectionHeaderRow}>
              <Text style={[styles.sectionTitle, { paddingHorizontal: 0, marginBottom: 0, color: theme.textPrimary }]}>빨리 먹어야 해요! ⏰</Text>
              {urgentIngredients.length > 0 && (
                <Text style={[styles.sectionSubText, { color: theme.textTertiary }]}>총 {urgentIngredients.length}개</Text>
              )}
            </View>

            {urgentIngredients.length > 0 ? (
              <View style={styles.urgentListContainer}>
                <ScrollView
                  nestedScrollEnabled={true}
                  showsVerticalScrollIndicator={true}
                  contentContainerStyle={{ gap: 8 }}
                >
                  {urgentIngredients.map(item => {
                    const dday = getDDayInfo(item.expiryDate);
                    const emoji = CATEGORY_EMOJI[item.category] || '📦';
                    const fridge = refrigerators.find(r => r.id === item.fridgeId);
                    const isUnassigned = !item.location;
                    const locationLabel = isUnassigned ? '위치 미정' : getCompartmentLabel(item.location!);

                    return (
                      <TouchableOpacity
                        key={item.id}
                        style={[
                          styles.urgentListItem,
                          {
                            backgroundColor: theme.surface,
                            borderColor: isUnassigned ? theme.primaryBorder : theme.borderLight,
                            borderWidth: isUnassigned ? 1.5 : 1,
                            shadowColor: theme.shadow,
                          }
                        ]}
                        activeOpacity={0.8}
                        onPress={() => isUnassigned
                          ? handleOpenAssignLocationPicker(item)
                          : onPressCompartment(item.location!, locationLabel, item.fridgeId || '', item.subLocation)}
                      >
                        <View style={styles.urgentListLeft}>
                          <View style={[styles.urgentListEmojiBg, { backgroundColor: theme.surfaceTertiary }]}>
                            <Text style={styles.urgentListEmoji}>{emoji}</Text>
                          </View>
                          <View style={styles.urgentListInfo}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                              <Text style={[styles.urgentListName, { color: theme.textPrimary, flexShrink: 1 }]} numberOfLines={1}>
                                {item.name}
                              </Text>
                              {isUnassigned && (
                                <View
                                  style={{
                                    flexDirection: 'row',
                                    alignItems: 'center',
                                    gap: 3,
                                    backgroundColor: theme.primaryLight,
                                    borderWidth: 1,
                                    borderColor: theme.primaryBorder,
                                    borderRadius: 6,
                                    paddingHorizontal: 6,
                                    paddingVertical: 2,
                                  }}
                                >
                                  <Ionicons name="alert-circle" size={11} color={theme.primaryText} />
                                  <Text style={{ fontSize: 10, fontWeight: '700', color: theme.primaryText }}>위치 미정</Text>
                                </View>
                              )}
                            </View>
                            <Text
                              style={[
                                styles.urgentListLocation,
                                { color: isUnassigned ? theme.primaryText : theme.textSecondary },
                              ]}
                              numberOfLines={1}
                            >
                              {isUnassigned
                                ? `${fridge ? fridge.name : '냉장고'} · 탭해서 위치 지정하기`
                                : `${fridge ? fridge.name : '냉장고'} > ${getLocationDisplayLabel(locationLabel, item.subLocation)}`}
                            </Text>
                          </View>
                        </View>
                        <View style={[styles.urgentListDDayBadge, { backgroundColor: dday.color + '12', borderColor: dday.color }]}>
                          <Text style={[styles.urgentListDDayText, { color: dday.color }]}>{dday.text}</Text>
                        </View>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              </View>
            ) : (
              <View style={[styles.emptyUrgentCard, { backgroundColor: theme.surface, borderColor: theme.borderLight }]}>
                <Text style={[styles.emptyUrgentText, { color: theme.textSecondary }]}>
                  소비가 임박한 식재료가 없어요.
                </Text>
              </View>
            )}
          </View>

          {/* 식중독 지수 & 내 냉장고 1:1 병렬 배치 */}
          <View style={styles.twoColumnRow}>
            {/* 좌측: 식중독 지수 */}
            {weatherInfo.loading ? (
              <View style={[styles.foodSafetyColumnCard, { backgroundColor: theme.surface, borderColor: theme.borderLight, justifyContent: 'center', alignItems: 'center' }]}>
                <ActivityIndicator size="small" color={theme.primary} />
              </View>
            ) : locationPermission === 'denied' ? (
              <TouchableOpacity 
                style={[styles.foodSafetyColumnCard, { backgroundColor: theme.dangerLight, borderColor: theme.danger + '25' }]}
                activeOpacity={0.8}
                onPress={requestLocationAndFetchWeather}
              >
                <View style={styles.cardHeaderRow}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                    <Ionicons name="location-outline" size={14} color={theme.danger} />
                    <Text style={[styles.columnCardTitle, { color: theme.danger }]}>위치 권한 필요</Text>
                  </View>
                </View>
                <Text style={{ fontSize: 10, color: theme.textSecondary, lineHeight: 14, marginTop: 4 }}>
                  식중독 지수 조회를 위해 이 카드를 눌러 권한을 허용해 주세요.
                </Text>
              </TouchableOpacity>
            ) : locationPermission === 'undetermined' ? (
              <TouchableOpacity
                style={[styles.foodSafetyColumnCard, { backgroundColor: theme.surface, borderColor: theme.borderLight }]}
                activeOpacity={0.8}
                onPress={requestLocationAndFetchWeather}
              >
                <View style={styles.cardHeaderRow}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                    <Ionicons name="location-outline" size={14} color={theme.primary} />
                    <Text style={[styles.columnCardTitle, { color: theme.textPrimary }]}>식중독 지수 보기</Text>
                  </View>
                </View>
                <Text style={{ fontSize: 10, color: theme.textSecondary, lineHeight: 14, marginTop: 4 }}>
                  탭하면 현재 위치 기반 식중독 지수를 확인할 수 있어요.
                </Text>
              </TouchableOpacity>
            ) : (
              <View style={[styles.foodSafetyColumnCard, { backgroundColor: weatherInfo.bgColor, borderColor: weatherInfo.color + '25' }]}>
                <View style={styles.cardHeaderRow}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                    <Ionicons name="shield-checkmark" size={14} color={weatherInfo.color} />
                    <Text style={[styles.columnCardTitle, { color: theme.textPrimary }]}>식중독 지수</Text>
                  </View>
                  <View style={[styles.foodSafetyBadge, { backgroundColor: weatherInfo.color, paddingHorizontal: 5, paddingVertical: 1 }]}>
                    <Text style={styles.foodSafetyBadgeText}>{weatherInfo.level}</Text>
                  </View>
                </View>
                
                <View style={styles.cardMainRow}>
                  <Text style={[styles.cardLargeIndex, { color: weatherInfo.color }]}>
                    {weatherInfo.index}
                  </Text>
                </View>

                <View style={{ gap: 4 }}>
                  {weatherInfo.temp !== null && weatherInfo.humidity !== null && (
                    <Text style={[styles.cardSubText, { color: theme.textTertiary }]} numberOfLines={1}>
                      {weatherInfo.city ? `${weatherInfo.city} | ` : ''}{weatherInfo.temp}°C | {weatherInfo.humidity}%
                    </Text>
                  )}
                  <View style={[styles.progressBarBg, { backgroundColor: theme.borderLight }]}>
                    <View style={[styles.progressBarFill, { width: `${weatherInfo.index}%`, backgroundColor: weatherInfo.color }]} />
                  </View>
                </View>
              </View>
            )}

            {/* 우측: 내 냉장고 바로가기 */}
            <View 
              style={[styles.fridgeColumnCard, { backgroundColor: theme.surface, borderColor: theme.borderLight }]}
              onLayout={onFridgeCardLayout}
            >
              <View style={styles.cardHeaderRow}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                  <Ionicons name="cube-outline" size={14} color={theme.primary} />
                  <Text style={[styles.columnCardTitle, { color: theme.textPrimary }]}>나의 냉장고</Text>
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                  {refrigerators.length > 1 && (
                    <Text style={{ fontSize: 9, fontWeight: 'bold', color: theme.textTertiary }}>
                      {currentFridgeSwipeIndex + 1}/{refrigerators.length}
                    </Text>
                  )}
                  <View style={[styles.fridgeCountBadge, { backgroundColor: theme.primary }]}>
                    <Text style={styles.fridgeCountBadgeText}>{refrigerators.length}대</Text>
                  </View>
                </View>
              </View>

              <View style={{ height: 60, justifyContent: 'center' }}>
                {fridgeCardWidth > 0 && refrigerators.length > 0 ? (
                  <ScrollView
                    horizontal
                    pagingEnabled
                    showsHorizontalScrollIndicator={false}
                    onScroll={handleFridgeScroll}
                    scrollEventThrottle={16}
                    contentContainerStyle={{ alignItems: 'center' }}
                  >
                    {refrigerators.map((fridge) => {
                      const count = ingredients.filter(item => item.fridgeId === fridge.id).length;
                      return (
                        <View 
                          key={fridge.id} 
                          style={{ 
                            width: fridgeCardWidth, 
                            justifyContent: 'center', 
                            paddingVertical: 2 
                          }}
                        >
                          <Text style={{ fontSize: 11, color: theme.textSecondary, fontWeight: '600' }} numberOfLines={1}>
                            {fridge.name}
                          </Text>
                          <Text style={[styles.cardMainTitle, { color: theme.textPrimary, marginTop: 2 }]} numberOfLines={1}>
                            식재료 {count}개 보관 중
                          </Text>
                        </View>
                      );
                    })}
                  </ScrollView>
                ) : refrigerators.length > 0 ? (
                  <View>
                    <Text style={{ fontSize: 11, color: theme.textSecondary, fontWeight: '600' }} numberOfLines={1}>
                      {refrigerators[activeIndex]?.name || refrigerators[0].name}
                    </Text>
                    <Text style={[styles.cardMainTitle, { color: theme.textPrimary, marginTop: 2 }]} numberOfLines={1}>
                      식재료 집계 중...
                    </Text>
                  </View>
                ) : (
                  <Text style={[styles.cardMainTitle, { color: theme.textSecondary }]}>냉장고 없음</Text>
                )}
              </View>

              <TouchableOpacity 
                style={styles.cardFooterRow}
                activeOpacity={0.7}
                onPress={() => onChangeTab?.('fridge')}
              >
                <Text style={[styles.cardSubText, { color: theme.textTertiary }]}>냉장고 바로가기</Text>
                <Ionicons name="chevron-forward" size={12} color={theme.textTertiary} />
              </TouchableOpacity>
            </View>
          </View>

          {/* 제철 식재료 추천 */}
          <View style={styles.sectionContainer}>
            <View style={styles.sectionHeaderRow}>
              <Text style={[styles.sectionTitle, { paddingHorizontal: 0, marginBottom: 0, color: theme.textPrimary }]}>
                지금 먹으면 가장 맛있는 제철 식재료 🌟
              </Text>
            </View>

            <View style={styles.seasonalListContainer}>
              <ScrollView
                nestedScrollEnabled={true}
                showsVerticalScrollIndicator={true}
                contentContainerStyle={{ gap: 8 }}
              >
                {seasonalIngredients.map((item, idx) => (
                  <TouchableOpacity
                    key={`seasonal_${idx}`}
                    style={[
                      styles.seasonalRowItem,
                      {
                        backgroundColor: theme.surface,
                        borderColor: theme.borderLight,
                        shadowColor: theme.shadow,
                      }
                    ]}
                    activeOpacity={0.8}
                    onPress={() => handleOpenYoutube(item.searchQuery, item.name)}
                  >
                    <View style={styles.seasonalRowLeft}>
                      <View style={[styles.seasonalRowEmojiBg, { backgroundColor: theme.surfaceTertiary }]}>
                        <Text style={styles.seasonalRowEmoji}>{item.emoji}</Text>
                      </View>
                      <View style={styles.seasonalRowInfo}>
                        <Text style={[styles.seasonalRowName, { color: theme.textPrimary }]} numberOfLines={1}>
                          {item.name}
                        </Text>
                        <Text style={[styles.seasonalRowRecommend, { color: theme.textSecondary }]} numberOfLines={1}>
                          추천: {item.recommendDish}
                        </Text>
                      </View>
                    </View>
                    <View style={[styles.youtubeRowButton, { backgroundColor: '#FF0000' }]}>
                      <Ionicons name="logo-youtube" size={12} color="#FFFFFF" />
                      <Text style={styles.youtubeRowText}>영상 보기</Text>
                    </View>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          </View>

        </ScrollView>
      )}

      {mode === 'fridge' && (
        <View style={[styles.dashboardScrollView, styles.fridgeModeContent]}>
          {/* 나의 냉장고 보관소 */}
          <View style={[styles.sectionContainer, { marginTop: 0, flex: 1 }]}>
            <View style={styles.carouselWrapper}>
              <ScrollView
                ref={scrollViewRef}
                style={{ flex: 1 }}
                horizontal
                pagingEnabled
                scrollEnabled={!editingNameFridgeId}
                showsHorizontalScrollIndicator={false}
                onScroll={handleScroll}
                scrollEventThrottle={16}
                contentContainerStyle={{ alignItems: 'stretch' }}
              >
                {pages.map((page, index) => {
                  if (page.type === 'add') {
                    return (
                      <View key="add_page" style={[styles.slideContainer, { width: screenWidth }]}>
                        <View style={[styles.addFridgeBox, { width: screenWidth - 40, backgroundColor: theme.surface, borderColor: theme.primary, shadowColor: theme.shadow }]}>
                          <TouchableOpacity activeOpacity={0.8} onPress={onOpenAddSelector} style={styles.addFridgeMainArea}>
                            <View style={[styles.addIconCircle, { backgroundColor: theme.primaryLight }]}>
                              <Text style={[styles.addIconText, { color: theme.primary }]}>+</Text>
                            </View>
                            <Text style={[styles.addFridgeTitle, { color: theme.textPrimary }]}>냉장고 추가</Text>
                            <Text style={[styles.addFridgeDesc, { color: theme.textMuted }]}>새로운 냉장고 타입을 설정하고 관리를 시작하세요 (최대 3대)</Text>
                          </TouchableOpacity>

                          {onScanQr && (
                            <>
                              <View style={[styles.addFridgeDivider, { backgroundColor: theme.borderLight }]} />
                              <TouchableOpacity
                                style={styles.qrJoinRow}
                                activeOpacity={0.7}
                                onPress={onScanQr}
                              >
                                <Ionicons name="scan-outline" size={18} color={theme.primary} />
                                <Text style={[styles.qrJoinText, { color: theme.primary }]}>QR로 공유 냉장고 참여하기</Text>
                              </TouchableOpacity>
                            </>
                          )}
                        </View>
                      </View>
                    );
                  }

                  const fridge = page.data;
                  return (
                    <View key={fridge.id} style={[styles.slideContainer, { width: screenWidth }]}>
                      <View style={[styles.fridgeCard, { width: screenWidth - 40, backgroundColor: theme.surface, borderColor: theme.glassBorder }]}>
                        {fridge.memberNames && fridge.memberNames.length > 1 && (
                          <TouchableOpacity
                            style={styles.sharedAvatarStack}
                            activeOpacity={0.7}
                            onPress={() => setMemberSheetVisible(true)}
                          >
                            {fridge.memberNames.map((name, i) => (
                              <View
                                key={`${name}_${i}`}
                                style={[
                                  styles.sharedAvatar,
                                  { backgroundColor: theme.primaryLight, borderColor: theme.primaryBorder, marginLeft: i === 0 ? 0 : -10 },
                                ]}
                              >
                                <Text style={[styles.sharedAvatarText, { color: theme.primaryText }]}>{name.charAt(0)}</Text>
                              </View>
                            ))}
                          </TouchableOpacity>
                        )}

                        <TouchableOpacity
                          style={[styles.fridgeCardSettingsButton, { backgroundColor: theme.surfaceTertiary }]}
                          activeOpacity={0.7}
                          onPress={() => setFridgeSettingsVisible(true)}
                        >
                          <Ionicons name="settings-outline" size={16} color={theme.textSecondary} />
                        </TouchableOpacity>

                        {isLoggedIn && (
                          <View style={styles.fridgeMemoTagWrapper} pointerEvents="box-none">
                            {/* 카드 상단에 클립처럼 걸린 노란 메모 태그 */}
                            <TouchableOpacity
                              style={styles.fridgeMemoTag}
                              activeOpacity={0.8}
                              onPress={() => openMemoList(fridge.id)}
                            >
                              <Text style={styles.fridgeMemoTagText}>메모</Text>
                              {fridge.hasUnreadMemo && (
                                <View style={[styles.fridgeCardMemoDot, { backgroundColor: theme.danger, borderColor: '#FFFDF0' }]} pointerEvents="none" />
                              )}
                            </TouchableOpacity>
                          </View>
                        )}

                        <View style={styles.fridgeNameContainer}>
                          <Text style={[styles.fridgeNameTitle, { color: theme.textPrimary }]}>{fridge.name}</Text>
                        </View>
                        {fridge.type === 'four-door' && renderFourDoor(fridge.id)}
                        {fridge.type === 'side-by-side' && renderSideBySide(fridge.id)}
                        {fridge.type === 'two-door' && renderTwoDoor(fridge.id)}
                        {renderPantryDrawer(fridge.id)}

                        {fridge.deletionRequested && (
                          <View style={styles.deletionOverlay}>
                            {fridge.role === 'MEMBER' ? (
                              <>
                                <Ionicons name="warning-outline" size={32} color="#FFFFFF" style={{ marginBottom: 10 }} />
                                <Text style={styles.deletionOverlayText}>
                                  {fridge.ownerName ? `${fridge.ownerName}님이` : '냉장고 주인이'} 냉장고를 삭제하려고 해요.{'\n'}동의하시겠어요?
                                </Text>
                                <View style={styles.deletionOverlayButtonRow}>
                                  <TouchableOpacity
                                    style={[styles.deletionOverlayButton, { backgroundColor: 'rgba(255,255,255,0.15)' }]}
                                    activeOpacity={0.8}
                                    onPress={onRejectDeletionRequest}
                                  >
                                    <Text style={styles.deletionOverlayButtonText}>거절</Text>
                                  </TouchableOpacity>
                                  <TouchableOpacity
                                    style={[styles.deletionOverlayButton, { backgroundColor: theme.danger }]}
                                    activeOpacity={0.8}
                                    onPress={onApproveDeletionRequest}
                                  >
                                    <Text style={styles.deletionOverlayButtonText}>동의</Text>
                                  </TouchableOpacity>
                                </View>
                              </>
                            ) : (
                              <>
                                <Ionicons name="time-outline" size={32} color="#FFFFFF" style={{ marginBottom: 10 }} />
                                <Text style={styles.deletionOverlayText}>
                                  삭제 요청을 보냈어요.{'\n'}함께 쓰는 멤버의 동의를 기다리는 중이에요.
                                </Text>
                                <TouchableOpacity
                                  style={[styles.deletionOverlayButton, { backgroundColor: 'rgba(255,255,255,0.15)' }]}
                                  activeOpacity={0.8}
                                  onPress={onCancelDeletionRequest}
                                >
                                  <Text style={styles.deletionOverlayButtonText}>요청 철회</Text>
                                </TouchableOpacity>
                              </>
                            )}
                          </View>
                        )}
                      </View>
                    </View>
                  );
                })}
              </ScrollView>

              {/* 페이지 도트 인디케이터 */}
              {pages.length > 1 && (
                <View style={styles.indicatorContainer}>
                  {pages.map((_, i) => (
                    <View
                      key={i}
                      style={[
                        styles.indicatorDot,
                        { backgroundColor: theme.borderLight },
                        activeIndex === i && [styles.indicatorDotActive, { backgroundColor: theme.primary }]
                      ]}
                    />
                  ))}
                </View>
              )}
            </View>
          </View>
        </View>
      )}

      {mode === 'ingredients' && (
        <View style={{ flex: 1 }}>
          <Text style={[styles.pageTitle, { color: theme.textPrimary, paddingTop: 16 }]}>식재료 목록</Text>

          {/* 검색 바 */}
              <View style={[styles.searchContainer, { backgroundColor: theme.surfaceSecondary, borderColor: theme.borderLight }]}>
                <Ionicons name="search" size={18} color={theme.textTertiary} />
                <TextInput
                  style={[styles.searchInput, { color: theme.textPrimary }]}
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                  placeholder="식재료 검색..."
                  placeholderTextColor={theme.textMuted}
                />
                {searchQuery.length > 0 && (
                  <TouchableOpacity onPress={() => setSearchQuery('')}>
                    <Ionicons name="close-circle" size={18} color={theme.textMuted} />
                  </TouchableOpacity>
                )}
              </View>

              {/* 필터 바: [필터 버튼] — [적용된 필터 칩 가로 스크롤] — [초기화] */}
              <View style={styles.filterBarRow}>
                <TouchableOpacity
                  style={[styles.filterOpenButton, { backgroundColor: theme.surfaceTertiary, borderColor: theme.borderLight }]}
                  activeOpacity={0.7}
                  onPress={openFilterModal}
                >
                  <Ionicons name="filter" size={15} color={theme.textSecondary} />
                  <Text style={[styles.filterOpenButtonText, { color: theme.textSecondary }]}>필터</Text>
                </TouchableOpacity>

                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  style={styles.filterAppliedScroll}
                  contentContainerStyle={{ gap: 6, alignItems: 'center' }}
                >
                  {/* 냉장고: 비었거나(=전체) 모두면 '전체 냉장고' 하나, 아니면 선택 순서대로 */}
                  {(fridgeFilters.length === 0
                    ? ['전체 냉장고']
                    : fridgeFilters.map(id => refrigerators.find(r => r.id === id)?.name || '냉장고')
                  ).map((label, i) => (
                    <View key={`f-${i}`} style={[styles.filterAppliedChip, { backgroundColor: theme.surfaceTertiary, borderColor: theme.borderLight }]}>
                      <Text style={[styles.filterAppliedChipText, { color: theme.textSecondary }]} numberOfLines={1}>{label}</Text>
                    </View>
                  ))}
                  {/* 상태: 비었거나 모두면 '전체 상태' 하나, 아니면 상태별 색으로 */}
                  {(statusFilters.length === 0
                    ? [{ label: '전체 상태', color: theme.textSecondary }]
                    : statusFilters.map(s => ({
                        label: s === 'expired' ? '만료' : s === 'imminent' ? '임박' : '안전',
                        color: s === 'expired' ? theme.ddayExpired : s === 'imminent' ? theme.ddayImminent : theme.ddaySafe,
                      }))
                  ).map((chip, i) => (
                    <View key={`s-${i}`} style={[styles.filterAppliedChip, { backgroundColor: chip.color + '14', borderColor: chip.color }]}>
                      <Text style={[styles.filterAppliedChipText, { color: chip.color }]} numberOfLines={1}>{chip.label}</Text>
                    </View>
                  ))}
                </ScrollView>

                <TouchableOpacity
                  style={styles.filterResetButton}
                  activeOpacity={0.7}
                  onPress={resetFilters}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Ionicons name="refresh" size={18} color={theme.textMuted} />
                </TouchableOpacity>
              </View>

              {/* 식재료 리스트 */}
              {filteredIngredients.length > 0 ? (
                <ScrollView
                  style={styles.ingListContainer}
                  contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 100, gap: 8 }}
                  showsVerticalScrollIndicator={false}
                >
                  {filteredIngredients.map(item => {
                    const dday = getDDayInfo(item.expiryDate);
                    const emoji = CATEGORY_EMOJI[item.category] || '📦';
                    const fridge = refrigerators.find(r => r.id === item.fridgeId);
                    const isUnassigned = !item.location;
                    const locationLabel = isUnassigned ? '위치 미정' : getCompartmentLabel(item.location!);

                    return (
                      <TouchableOpacity
                        key={item.id}
                        style={[
                          styles.ingCard,
                          {
                            backgroundColor: theme.surface,
                            borderColor: isUnassigned ? theme.primaryBorder : theme.borderLight,
                            borderWidth: isUnassigned ? 1.5 : 1,
                          },
                          // 메뉴가 열린 카드는 팝업이 다른 카드에 가리지 않도록 위로 올린다
                          openMenuItemId === item.id && { zIndex: 20, elevation: 20 },
                        ]}
                        activeOpacity={0.8}
                        onPress={() => isUnassigned
                          ? handleOpenAssignLocationPicker(item)
                          : onPressCompartment(item.location!, locationLabel, item.fridgeId || '', item.subLocation)}
                      >
                        {/* 상단 줄: 냉장고 위치(좌) — 더보기(점 3개) 메뉴(우) */}
                        <View style={styles.ingCardTopRow}>
                          <Text
                            style={[styles.ingCardTopLocText, { color: isUnassigned ? theme.primaryText : theme.textTertiary }]}
                            numberOfLines={1}
                          >
                            {isUnassigned
                              ? `${fridge ? fridge.name : '냉장고'} · 탭해서 위치 지정하기`
                              : `${fridge ? fridge.name : '냉장고'} > ${getLocationDisplayLabel(locationLabel, item.subLocation)}`}
                          </Text>
                          <View style={styles.ingCardTopRowIcons}>
                            <TouchableOpacity
                              style={styles.ingCardTopRowIconButton}
                              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                              onPress={() => setOpenMenuItemId(openMenuItemId === item.id ? null : item.id)}
                            >
                              <Ionicons name="ellipsis-horizontal" size={20} color={isDark ? '#FFFFFF' : theme.textMuted} />
                            </TouchableOpacity>
                          </View>
                        </View>

                        {/* 점 3개 메뉴: 위치수정/수정/삭제를 아이콘+텍스트로, 카드 위에 떠서 세로로 펼친다 */}
                        {openMenuItemId === item.id && (
                          <View style={[styles.ingCardMenu, { backgroundColor: theme.surface, borderColor: theme.borderLight, shadowColor: theme.shadow }]}>
                            <TouchableOpacity
                              style={styles.ingCardMenuItem}
                              onPress={() => { setOpenMenuItemId(null); handleOpenAssignLocationPicker(item); }}
                            >
                              <Ionicons name="location-outline" size={18} color={isDark ? '#FFFFFF' : theme.textSecondary} />
                              <Text style={[styles.ingCardMenuText, { color: theme.textSecondary }]}>위치수정</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                              style={styles.ingCardMenuItem}
                              onPress={() => { setOpenMenuItemId(null); setEditIngredientTarget(item); }}
                            >
                              <Ionicons name="pencil-outline" size={18} color={isDark ? '#FFFFFF' : theme.textSecondary} />
                              <Text style={[styles.ingCardMenuText, { color: theme.textSecondary }]}>수정</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                              style={styles.ingCardMenuItem}
                              onPress={() => { setOpenMenuItemId(null); handleDeleteIngredient(item); }}
                            >
                              <Ionicons name="trash-outline" size={18} color={theme.danger} />
                              <Text style={[styles.ingCardMenuText, { color: theme.danger }]}>삭제</Text>
                            </TouchableOpacity>
                          </View>
                        )}

                        <View style={styles.ingCardMainRow}>
                          <View style={[styles.ingCardEmojiBg, { backgroundColor: theme.surfaceTertiary }]}>
                            <Text style={{ fontSize: 22 }}>{emoji}</Text>
                          </View>

                          <View style={styles.ingCardInfo}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                              {isUnassigned && (
                                <View
                                  style={{
                                    flexDirection: 'row',
                                    alignItems: 'center',
                                    gap: 3,
                                    backgroundColor: theme.primaryLight,
                                    borderWidth: 1,
                                    borderColor: theme.primaryBorder,
                                    borderRadius: 6,
                                    paddingHorizontal: 6,
                                    paddingVertical: 2,
                                  }}
                                >
                                  <Ionicons name="alert-circle" size={11} color={theme.primaryText} />
                                  <Text style={{ fontSize: 10, fontWeight: '700', color: theme.primaryText }}>위치 미정</Text>
                                </View>
                              )}
                              {/* 이름: 길어서 개수 자리까지 밀려 잘릴 상황이면 그 자리에서 마퀴로 전체를 보여준다 */}
                              <MarqueeText
                                text={item.name}
                                style={[styles.ingCardName, { color: theme.textPrimary }]}
                                containerStyle={{ flex: 1 }}
                              />
                              <Text style={[styles.ingCardQtyInline, { color: theme.textSecondary }]} numberOfLines={1}>
                                {item.quantity}{item.unit}
                              </Text>
                            </View>
                          </View>

                          {/* D-Day 배지: 카드 오른쪽 세로 중앙 */}
                          <View style={[styles.urgentDDayBadge, { backgroundColor: dday.color + '12', borderColor: dday.color }]}>
                            <Text style={[styles.urgentDDayText, { color: dday.color }]}>{dday.text}</Text>
                          </View>
                        </View>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              ) : (
                <View style={styles.emptyStateContainer}>
                  <Ionicons name="restaurant-outline" size={48} color={theme.textMuted} style={{ marginBottom: 12 }} />
                  <Text style={[styles.emptyStateText, { color: theme.textSecondary }]}>
                    {searchQuery.trim() ? '검색 결과와 일치하는 식재료가 없어요.' : '등록된 식재료가 없어요.'}
                  </Text>
                  {searchQuery.trim() && (
                    <Text style={{ color: theme.textMuted, fontSize: 12, marginTop: 4 }}>
                      다른 키워드로 검색해 보세요!
                    </Text>
                  )}
                </View>
              )}

          {/* 식재료 바로 등록 플로팅 버튼 (아웃라인 고스트 스타일) */}
          <TouchableOpacity
            style={[
              styles.addIngredientFab,
              { backgroundColor: theme.surface, borderWidth: 2, borderColor: theme.primary, shadowColor: theme.shadow },
            ]}
            activeOpacity={0.85}
            onPress={handleOpenAddLocationPicker}
          >
            <Ionicons name="add" size={28} color={theme.primaryText} />
          </TouchableOpacity>
        </View>
      )}

      {/* 식재료 목록 필터 다이얼로그: 냉장고/상태를 복수 선택하고 '적용'을 눌러야 반영된다 */}
      <Modal
        visible={filterModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setFilterModalVisible(false)}
      >
        <View style={[styles.filterModalOverlay, { backgroundColor: theme.modalOverlay }]}>
          <View style={[styles.filterModalCard, { backgroundColor: theme.surface, borderColor: theme.borderLight }]}>
            <View style={[styles.filterModalHeader, { borderBottomColor: theme.borderLight }]}>
              <Text style={[styles.filterModalTitle, { color: theme.textPrimary }]}>필터</Text>
              <TouchableOpacity onPress={() => setFilterModalVisible(false)}>
                <Ionicons name="close" size={24} color={theme.textSecondary} />
              </TouchableOpacity>
            </View>

            <ScrollView style={{ maxHeight: 420 }} contentContainerStyle={{ padding: 20 }} showsVerticalScrollIndicator={false}>
              <Text style={[styles.filterModalSectionTitle, { color: theme.textTertiary }]}>냉장고</Text>
              {renderFilterOption('fridge-all', '전체 냉장고', tempFridgeFilters.length === 0, () => setTempFridgeFilters([]))}
              {refrigerators.map(f => renderFilterOption(`fridge-${f.id}`, f.name, tempFridgeFilters.includes(f.id), () => toggleTempFridge(f.id)))}

              <Text style={[styles.filterModalSectionTitle, { color: theme.textTertiary, marginTop: 20 }]}>식재료 상태</Text>
              {renderFilterOption('status-all', '전체', tempStatusFilters.length === 0, () => setTempStatusFilters([]))}
              {[{ k: 'expired', l: '만료' }, { k: 'imminent', l: '임박' }, { k: 'safe', l: '안전' }].map(s =>
                renderFilterOption(`status-${s.k}`, s.l, tempStatusFilters.includes(s.k), () => toggleTempStatus(s.k))
              )}
            </ScrollView>

            <View style={[styles.filterModalFooter, { borderTopColor: theme.borderLight }]}>
              <TouchableOpacity
                style={[styles.filterFooterButton, { backgroundColor: theme.surfaceTertiary }]}
                activeOpacity={0.8}
                onPress={() => setFilterModalVisible(false)}
              >
                <Text style={[styles.filterFooterButtonText, { color: theme.textSecondary }]}>취소</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.filterFooterButton, { backgroundColor: theme.primary }]}
                activeOpacity={0.8}
                onPress={applyFilters}
              >
                <Text style={[styles.filterFooterButtonText, { color: theme.primaryOnPrimary }]}>적용</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* 식재료 등록 위치(냉장고 → 칸 → 선반/문쪽) 선택 모달 */}
      <Modal
        visible={addLocationPickerVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setAddLocationPickerVisible(false)}
      >
        <View style={[styles.modalOverlay, { backgroundColor: theme.modalOverlay }]}>
          <View style={[styles.settingsModalContent, { backgroundColor: theme.surface, borderColor: theme.borderLight }]}>
            <View>
              {(addPickerCompartmentId || (!assignTargetIngredient && addPickerFridgeId)) && (
                <TouchableOpacity
                  onPress={() => {
                    if (addPickerCompartmentId) {
                      setAddPickerCompartmentId(null);
                      setAddPickerShelves(null);
                    } else {
                      setAddPickerFridgeId(null);
                    }
                  }}
                  style={styles.modalCloseButton}
                >
                  <Ionicons name="chevron-back" size={22} color={theme.textSecondary} />
                </TouchableOpacity>
              )}
              <View style={[styles.modalHeader, { borderBottomColor: theme.borderLight }]}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Text style={[styles.modalTitleText, { color: theme.textPrimary }]}>
                    {assignTargetIngredient
                      ? (addPickerCompartmentId ? '어느 칸에 넣을까요?' : '어디에 넣을까요?')
                      : (addPickerCompartmentId ? '어느 칸에 등록할까요?' : addPickerFridgeId ? '어디에 등록할까요?' : '냉장고를 선택해주세요')}
                  </Text>
                </View>
                <TouchableOpacity
                  onPress={() => setAddLocationPickerVisible(false)}
                  style={styles.modalCloseButton}
                >
                  <Ionicons name="close" size={24} color={theme.textSecondary} />
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.pickerModalBody}>
              {addPickerCompartmentId ? (
                addPickerShelvesLoading || !addPickerShelves ? (
                  <View style={{ paddingVertical: 40, alignItems: 'center' }}>
                    <ActivityIndicator size="small" color={theme.primary} />
                  </View>
                ) : (
                  <>
                    <Text style={[styles.pickerSectionLabel, { color: theme.textMuted }]}>내부 보관</Text>
                    {addPickerShelves.insideShelves.map(shelf => (
                      <TouchableOpacity
                        key={shelf.id}
                        style={[styles.settingsActionRow, { borderBottomWidth: 1, borderBottomColor: theme.borderLight }]}
                        activeOpacity={0.7}
                        onPress={() => handlePickAddShelf(shelf.id)}
                      >
                        <View style={styles.settingsActionLeft}>
                          <View style={[styles.settingsIconBadge, { backgroundColor: theme.primaryLight }]}>
                            <Ionicons name="albums-outline" size={18} color={theme.primary} />
                          </View>
                          <Text style={[styles.settingsActionText, { color: theme.textSecondary }]}>{shelf.label}</Text>
                        </View>
                        <Ionicons name="chevron-forward" size={16} color={theme.textMuted} />
                      </TouchableOpacity>
                    ))}
                    {addPickerShelves.hasDoorStorage && addPickerShelves.doorShelves.length > 0 && (
                      <>
                        <Text style={[styles.pickerSectionLabel, { color: theme.textMuted, marginTop: 12 }]}>문쪽 보관</Text>
                        {addPickerShelves.doorShelves.map(shelf => (
                          <TouchableOpacity
                            key={shelf.id}
                            style={[styles.settingsActionRow, { borderBottomWidth: 1, borderBottomColor: theme.borderLight }]}
                            activeOpacity={0.7}
                            onPress={() => handlePickAddShelf(shelf.id)}
                          >
                            <View style={styles.settingsActionLeft}>
                              <View style={[styles.settingsIconBadge, { backgroundColor: theme.primaryLight }]}>
                                <Ionicons name="reorder-two-outline" size={18} color={theme.primary} />
                              </View>
                              <Text style={[styles.settingsActionText, { color: theme.textSecondary }]}>{shelf.label}</Text>
                            </View>
                            <Ionicons name="chevron-forward" size={16} color={theme.textMuted} />
                          </TouchableOpacity>
                        ))}
                      </>
                    )}
                  </>
                )
              ) : !addPickerFridgeId ? (
                refrigerators.map(fridge => (
                  <View key={fridge.id} style={{ borderBottomWidth: 1, borderBottomColor: theme.borderLight }}>
                    <TouchableOpacity
                      style={styles.settingsActionRow}
                      activeOpacity={0.7}
                      onPress={() => setAddPickerFridgeId(fridge.id)}
                    >
                      <View style={styles.settingsActionLeft}>
                        <View style={[styles.settingsIconBadge, { backgroundColor: theme.primaryLight }]}>
                          <Ionicons name="cube-outline" size={18} color={theme.primary} />
                        </View>
                        <Text style={[styles.settingsActionText, { color: theme.textSecondary }]}>{fridge.name}</Text>
                      </View>
                      <Ionicons name="chevron-forward" size={16} color={theme.textMuted} />
                    </TouchableOpacity>
                    {/* 이 냉장고를 골랐지만 칸/선반은 아직 정하고 싶지 않을 때 */}
                    {!assignTargetIngredient && (
                      <View style={{ paddingHorizontal: 16, paddingBottom: 12 }}>
                        <TouchableOpacity
                          style={[styles.skipLocationButton, { backgroundColor: theme.primary }]}
                          activeOpacity={0.85}
                          onPress={() => handleSkipLocationPicker(fridge.id)}
                        >
                          <Text style={styles.skipLocationButtonText}>
                            이 냉장고에 등록하고 위치는 나중에 정할게요
                          </Text>
                        </TouchableOpacity>
                      </View>
                    )}
                  </View>
                ))
              ) : (
                [
                  ...getCompartmentsForType(refrigerators.find(f => f.id === addPickerFridgeId)!.type),
                  ...(pantryFridgeIds.has(addPickerFridgeId!) ? [{ id: 'pantry', label: '실온 보관함' }] : []),
                ].map(comp => (
                  <TouchableOpacity
                    key={comp.id}
                    style={[styles.settingsActionRow, { borderBottomWidth: 1, borderBottomColor: theme.borderLight }]}
                    activeOpacity={0.7}
                    onPress={() => handlePickAddCompartment(comp.id, addPickerFridgeId!)}
                  >
                    <View style={styles.settingsActionLeft}>
                      <View style={[styles.settingsIconBadge, { backgroundColor: theme.primaryLight }]}>
                        <Ionicons name="albums-outline" size={18} color={theme.primary} />
                      </View>
                      <Text style={[styles.settingsActionText, { color: theme.textSecondary }]}>{comp.label}</Text>
                    </View>
                    <Ionicons name="chevron-forward" size={16} color={theme.textMuted} />
                  </TouchableOpacity>
                ))
              )}
            </View>
          </View>
        </View>
      </Modal>

      {/* 기록 이력 (공유 냉장고 전용) */}
      <Modal
        visible={historyVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setHistoryVisible(false)}
      >
        <View style={[styles.modalOverlay, { backgroundColor: theme.modalOverlay }]}>
          <View style={[styles.settingsModalContent, { backgroundColor: theme.surface, borderColor: theme.borderLight }]}>
            <View style={[styles.modalHeader, { borderBottomColor: theme.borderLight }]}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Text style={[styles.modalTitleText, { color: theme.textPrimary }]}>기록 이력</Text>
              </View>
              <TouchableOpacity onPress={() => setHistoryVisible(false)} style={styles.modalCloseButton}>
                <Ionicons name="close" size={24} color={theme.textSecondary} />
              </TouchableOpacity>
            </View>

            {historyLoading ? (
              <View style={{ paddingVertical: 40, alignItems: 'center' }}>
                <ActivityIndicator size="small" color={theme.primary} />
              </View>
            ) : historyEntries.length === 0 ? (
              <View style={{ paddingVertical: 40, alignItems: 'center' }}>
                <Text style={{ color: theme.textMuted, fontSize: 13 }}>아직 기록이 없어요.</Text>
              </View>
            ) : (
              <ScrollView style={styles.pickerModalBody} showsVerticalScrollIndicator={false}>
                {historyEntries.map(entry => (
                  <View key={entry.id} style={[styles.historyRow, { borderBottomColor: theme.borderLight }]}>
                    <View style={styles.historyRowTop}>
                      <Text style={[styles.historyActorText, { color: theme.textPrimary }]} numberOfLines={1}>
                        {entry.actorName || '알 수 없음'}
                      </Text>
                      <Text style={[styles.historyTimeText, { color: theme.textMuted }]}>
                        {formatHistoryDateTime(entry.occurredAt)}
                      </Text>
                    </View>
                    <Text style={[styles.historyBodyText, { color: theme.textSecondary }]}>
                      {getHistoryLabel(entry)}
                    </Text>
                  </View>
                ))}
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>

      {/* 냉장고 메모 목록 */}
      <Modal
        visible={memoListVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setMemoListVisible(false)}
      >
        <View style={[styles.modalOverlay, { backgroundColor: theme.modalOverlay }]}>
          <View style={[styles.settingsModalContent, { backgroundColor: theme.surface, borderColor: theme.borderLight }]}>
            <View style={[styles.modalHeader, { borderBottomColor: theme.borderLight }]}>
              <Text style={[styles.modalTitleText, { color: theme.textPrimary }]}>메모</Text>
              <TouchableOpacity onPress={() => setMemoListVisible(false)} style={styles.modalCloseButton}>
                <Ionicons name="close" size={24} color={theme.textSecondary} />
              </TouchableOpacity>
            </View>

            {memoLoading ? (
              <View style={{ paddingVertical: 40, alignItems: 'center' }}>
                <ActivityIndicator size="small" color={theme.primary} />
              </View>
            ) : (
              <ScrollView style={[styles.pickerModalBody, { height: memoGridVisibleHeight }]} showsVerticalScrollIndicator={false}>
                <View style={styles.memoGrid}>
                  {memoEntries.map((memo, index) => (
                    <View key={memo.id} style={styles.memoTileWrapper}>
                      <TouchableOpacity
                        style={[styles.memoTile, styles.memoTileWithText, { backgroundColor: MEMO_NOTE_COLORS[index % MEMO_NOTE_COLORS.length] }]}
                        activeOpacity={0.7}
                        onPress={() => setMemoDetail(memo)}
                      >
                        <View style={StyleSheet.absoluteFill} pointerEvents="none">
                          {Array.from({ length: memoTilePreviewLines }).map((_, lineIndex) => (
                            <View
                              key={lineIndex}
                              style={[styles.memoTileLine, { top: 8 + (lineIndex + 1) * MEMO_TILE_LINE_HEIGHT }]}
                            />
                          ))}
                        </View>
                        <Text style={styles.memoTileText} numberOfLines={memoTilePreviewLines} allowFontScaling={false}>
                          {getMemoPreview(memo)}
                        </Text>
                      </TouchableOpacity>
                    </View>
                  ))}

                  <View style={styles.memoTileWrapper}>
                    <TouchableOpacity
                      style={[styles.memoTile, styles.memoAddTile, { borderColor: theme.primary, backgroundColor: theme.primaryLight }]}
                      activeOpacity={0.7}
                      onPress={() => openMemoComposer()}
                    >
                      <Ionicons name="add" size={26} color={theme.primary} />
                    </TouchableOpacity>
                  </View>
                </View>
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>

      {/* 메모 상세 (확인 + 체크리스트 토글, mine이면 수정/삭제) */}
      <Modal
        visible={!!memoDetail}
        transparent
        animationType="fade"
        onRequestClose={() => setMemoDetail(null)}
      >
        <View style={[styles.modalOverlay, { backgroundColor: theme.modalOverlay }]}>
          <View style={[styles.settingsModalContent, { backgroundColor: memoDetail ? getMemoColor(memoDetail) : theme.surface, borderColor: 'rgba(0,0,0,0.1)' }]}>
            <View style={[styles.modalHeader, { borderBottomColor: 'rgba(0,0,0,0.1)' }]}>
              <Text style={[styles.modalTitleText, { color: 'rgba(0,0,0,0.85)' }]}>
                {memoDetail?.authorName ? `${memoDetail.authorName}님의 메모` : '메모'}
              </Text>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                {memoDetail?.mine && (
                  <>
                    <TouchableOpacity onPress={() => openMemoComposer(memoDetail)} style={styles.modalCloseButton}>
                      <Ionicons name="pencil-outline" size={19} color="rgba(0,0,0,0.6)" />
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => handleDeleteMemo(memoDetail)} style={styles.modalCloseButton}>
                      <Ionicons name="trash-outline" size={19} color="rgba(0,0,0,0.6)" />
                    </TouchableOpacity>
                  </>
                )}
                <TouchableOpacity onPress={() => setMemoDetail(null)} style={styles.modalCloseButton}>
                  <Ionicons name="close" size={24} color="rgba(0,0,0,0.6)" />
                </TouchableOpacity>
              </View>
            </View>

            {memoDetail && (
              <ScrollView style={styles.pickerModalBody} showsVerticalScrollIndicator={false}>
                {memoDetail.type === 'TEXT' ? (
                  <Text style={{ color: 'rgba(0,0,0,0.8)', fontSize: 15, lineHeight: 22, padding: 16 }}>
                    {memoDetail.content}
                  </Text>
                ) : (
                  parseChecklist(memoDetail.content).map(item => (
                    <TouchableOpacity
                      key={item.id}
                      style={styles.memoChecklistRow}
                      activeOpacity={0.7}
                      onPress={() => handleToggleMemoItem(memoDetail, item.id)}
                    >
                      <Ionicons
                        name={item.checked ? 'checkbox' : 'square-outline'}
                        size={20}
                        color={item.checked ? 'rgba(0,0,0,0.75)' : 'rgba(0,0,0,0.45)'}
                      />
                      <Text
                        style={[
                          styles.memoChecklistText,
                          { color: item.checked ? 'rgba(0,0,0,0.45)' : 'rgba(0,0,0,0.8)' },
                          item.checked && { textDecorationLine: 'line-through' },
                        ]}
                      >
                        {item.text}
                      </Text>
                    </TouchableOpacity>
                  ))
                )}
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>

      {/* 메모 작성/수정 */}
      <Modal
        visible={memoComposerVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setMemoComposerVisible(false)}
      >
        <KeyboardAvoidingView
          style={[styles.modalOverlay, { backgroundColor: theme.modalOverlay }]}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <View style={[styles.settingsModalContent, { backgroundColor: theme.surface, borderColor: theme.borderLight }]}>
            <View style={[styles.modalHeader, { borderBottomColor: theme.borderLight }]}>
              <Text style={[styles.modalTitleText, { color: theme.textPrimary }]}>
                {memoComposerEditingId != null ? '메모 수정' : '새 메모'}
              </Text>
              <TouchableOpacity onPress={() => setMemoComposerVisible(false)} style={styles.modalCloseButton}>
                <Ionicons name="close" size={24} color={theme.textSecondary} />
              </TouchableOpacity>
            </View>

            {memoComposerEditingId == null && (
              <View style={[styles.memoTypeSegmentRow, { borderColor: theme.borderLight, backgroundColor: theme.surfaceSecondary }]}>
                <TouchableOpacity
                  style={[styles.memoTypeSegment, memoComposerType === 'TEXT' && { backgroundColor: theme.primaryLight }]}
                  onPress={() => setMemoComposerType('TEXT')}
                >
                  <Text style={{ color: memoComposerType === 'TEXT' ? theme.primary : theme.textSecondary, fontWeight: '600' }}>
                    메모
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.memoTypeSegment, memoComposerType === 'CHECKLIST' && { backgroundColor: theme.primaryLight }]}
                  onPress={() => setMemoComposerType('CHECKLIST')}
                >
                  <Text style={{ color: memoComposerType === 'CHECKLIST' ? theme.primary : theme.textSecondary, fontWeight: '600' }}>
                    체크리스트
                  </Text>
                </TouchableOpacity>
              </View>
            )}

            <ScrollView style={styles.pickerModalBody} showsVerticalScrollIndicator={false}>
              {memoComposerType === 'TEXT' ? (
                <View style={{ padding: 16 }}>
                  <TextInput
                    style={[styles.memoTextInput, { color: theme.textPrimary, borderColor: theme.borderLight }]}
                    value={memoComposerText}
                    onChangeText={setMemoComposerText}
                    placeholder="살 것, 남길 말을 적어보세요"
                    placeholderTextColor={theme.textMuted}
                    multiline
                    maxLength={MEMO_CONTENT_MAX}
                  />
                  <Text style={{ color: theme.textMuted, fontSize: 12, textAlign: 'right', marginTop: 4 }}>
                    {memoComposerText.length}/{MEMO_CONTENT_MAX}
                  </Text>
                </View>
              ) : (
                <View style={{ padding: 16 }}>
                  {memoComposerItems.map((item, index) => (
                    <View key={item.id} style={styles.memoChecklistEditRow}>
                      <TextInput
                        ref={(el) => {
                          if (el) memoItemInputRefs.current.set(item.id, el);
                          else memoItemInputRefs.current.delete(item.id);
                        }}
                        style={[styles.memoChecklistEditInput, { color: theme.textPrimary, borderColor: theme.borderLight }]}
                        value={item.text}
                        onChangeText={(text) =>
                          setMemoComposerItems(prev => prev.map((it, i) => (i === index ? { ...it, text } : it)))
                        }
                        placeholder={`항목 ${index + 1}`}
                        placeholderTextColor={theme.textMuted}
                        returnKeyType="next"
                        blurOnSubmit={false}
                        onSubmitEditing={() => handleChecklistItemSubmit(index)}
                      />
                      <TouchableOpacity
                        onPress={() => setMemoComposerItems(prev => prev.filter((_, i) => i !== index))}
                        style={{ padding: 8 }}
                      >
                        <Ionicons name="close-circle" size={20} color={theme.textMuted} />
                      </TouchableOpacity>
                    </View>
                  ))}
                  <TouchableOpacity
                    style={styles.memoAddItemRow}
                    onPress={() => setMemoComposerItems(prev => [...prev, { id: genChecklistItemId(), text: '', checked: false }])}
                  >
                    <Ionicons name="add" size={18} color={theme.primary} />
                    <Text style={{ color: theme.primary, fontWeight: '600' }}>항목 추가</Text>
                  </TouchableOpacity>
                  <Text style={{ color: theme.textMuted, fontSize: 12, textAlign: 'right', marginTop: 4 }}>
                    {memoComposerSerialized().length}/{MEMO_CONTENT_MAX}
                  </Text>
                </View>
              )}
            </ScrollView>

            <TouchableOpacity
              style={[styles.memoSaveButton, { backgroundColor: theme.primary, opacity: memoSaving ? 0.6 : 1 }]}
              onPress={handleSaveMemo}
              disabled={memoSaving}
            >
              {memoSaving ? (
                <ActivityIndicator size="small" color={theme.primaryOnPrimary} />
              ) : (
                <Text style={{ color: theme.primaryOnPrimary, fontWeight: '700', fontSize: 15 }}>저장</Text>
              )}
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* 위치 선택이 끝나면 화면 이동 없이 이 자리에서 바로 등록 폼을 띄운다 */}
      {addIngredientTarget && (
        <AddIngredientModal
          visible={!!addIngredientTarget}
          fridgeId={addIngredientTarget.fridgeId}
          compartmentId={addIngredientTarget.compartmentId}
          shelfId={addIngredientTarget.shelfId}
          serverCompartmentId={addIngredientTarget.serverCompartmentId}
          onClose={() => setAddIngredientTarget(null)}
          onSaved={handleIngredientSaved}
        />
      )}

      {/* 식재료 목록 카드의 수정 버튼: 화면 이동 없이 같은 모달을 수정 모드로 띄운다 */}
      {editIngredientTarget && (
        <AddIngredientModal
          visible={!!editIngredientTarget}
          editIngredient={editIngredientTarget}
          onClose={() => setEditIngredientTarget(null)}
          onSaved={handleIngredientSaved}
        />
      )}

      {/* 냉장고 관리 설정 바텀시트: 뒷배경 딤 처리는 슬라이드 애니메이션과 분리해서 순서대로 재생한다 */}
      <Modal
        visible={sheetRendered}
        transparent
        animationType="none"
        onRequestClose={() => setFridgeSettingsVisible(false)}
      >
        <View style={styles.settingsSheetOverlay}>
          <Animated.View
            style={[
              StyleSheet.absoluteFillObject,
              { backgroundColor: theme.modalOverlay, opacity: sheetBackdropOpacity },
            ]}
          >
            <TouchableOpacity
              style={styles.sheetBackdrop}
              activeOpacity={1}
              onPress={() => setFridgeSettingsVisible(false)}
            />
          </Animated.View>
          <Animated.View style={{ width: '100%', transform: [{ translateY: sheetTranslateY }] }}>
          <Animated.View
            style={[
              styles.settingsSheetContent,
              { backgroundColor: theme.surface, height: sheetHeight },
            ]}
          >
            <View style={styles.sheetDragHandleArea} {...sheetPanResponder.panHandlers}>
              <View style={[styles.sheetDragHandle, { backgroundColor: theme.borderLight }]} />
            </View>
            <View style={[styles.modalHeader, { borderBottomColor: theme.borderLight }]}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Ionicons name="settings-outline" size={20} color={theme.textPrimary} />
                <Text style={[styles.modalTitleText, { color: theme.textPrimary }]}>냉장고 설정</Text>
              </View>
              <TouchableOpacity onPress={() => setFridgeSettingsVisible(false)} style={styles.modalCloseButton}>
                <Ionicons name="close" size={24} color={theme.textSecondary} />
              </TouchableOpacity>
            </View>

            <View style={styles.settingsModalBody}>
              {activeFridge ? (
                <>
                  <ScrollView
                    style={styles.settingsTopSectionScroll}
                    contentContainerStyle={styles.settingsTopSection}
                    showsVerticalScrollIndicator={false}
                  >
                    <View style={[styles.settingsActiveFridgeInfo, { borderBottomColor: theme.borderLight }]}>
                      <Text style={[styles.settingsActiveFridgeName, { color: theme.textPrimary }]}>{activeFridge.name}</Text>
                      <Text style={[styles.settingsActiveFridgeTypeText, { color: theme.textTertiary }]}>
                        {activeFridge.type === 'four-door' ? '4도어 냉장고' : activeFridge.type === 'side-by-side' ? '양문형 냉장고' : '일반 2도어 냉장고'}
                      </Text>
                    </View>

                    <View style={styles.settingsActionsContainer}>
                      {/* 이름 변경 */}
                      <TouchableOpacity
                        style={[styles.settingsActionRow, { borderBottomWidth: 1, borderBottomColor: theme.borderLight }]}
                        activeOpacity={0.7}
                        onPress={() => {
                          setFridgeSettingsVisible(false);
                          startEditingName(activeFridge.id, activeFridge.name);
                        }}
                      >
                        <View style={styles.settingsActionLeft}>
                          <View style={[styles.settingsIconBadge, { backgroundColor: theme.primaryLight }]}>
                            <Ionicons name="pencil-outline" size={18} color={theme.primary} />
                          </View>
                          <Text style={[styles.settingsActionText, { color: theme.textSecondary }]}>냉장고 이름 변경</Text>
                        </View>
                        <Ionicons name="chevron-forward" size={16} color={theme.textMuted} />
                      </TouchableOpacity>

                      {/* 타입 변경 — 구획/식재료를 초기화하는 파괴적 작업이라 내 냉장고(주인)일 때만 가능 */}
                      {activeFridge.role !== 'MEMBER' && (
                        <TouchableOpacity
                          style={[styles.settingsActionRow, { borderBottomWidth: 1, borderBottomColor: theme.borderLight }]}
                          activeOpacity={0.7}
                          onPress={() => {
                            setFridgeSettingsVisible(false);
                            onEditFridgeType();
                          }}
                        >
                          <View style={styles.settingsActionLeft}>
                            <View style={[styles.settingsIconBadge, { backgroundColor: theme.primaryLight }]}>
                              <Ionicons name="swap-horizontal-outline" size={18} color={theme.primary} />
                            </View>
                            <Text style={[styles.settingsActionText, { color: theme.textSecondary }]}>냉장고 타입 변경</Text>
                          </View>
                          <Ionicons name="chevron-forward" size={16} color={theme.textMuted} />
                        </TouchableOpacity>
                      )}

                      {/* 실온 보관함(팬트리) 사용 — 구획을 만들고 없애는 구조 변경이라 주인만, 서버 기능이라 로그인 시에만 노출 */}
                      {activeFridge.role !== 'MEMBER' && isLoggedIn && (
                        <View style={[styles.settingsActionRow, { borderBottomWidth: 1, borderBottomColor: theme.borderLight }]}>
                          <View style={styles.settingsActionLeft}>
                            <View style={[styles.settingsIconBadge, { backgroundColor: theme.primaryLight }]}>
                              <Ionicons name="cube-outline" size={18} color={theme.primary} />
                            </View>
                            <Text style={[styles.settingsActionText, { color: theme.textSecondary }]}>실온 보관함 사용</Text>
                          </View>
                          <Switch
                            value={pantryFridgeIds.has(activeFridge.id)}
                            onValueChange={(v) => handleTogglePantry(activeFridge.id, v)}
                            disabled={pantryToggling}
                          />
                        </View>
                      )}

                      {/* 냉장고 공유 (QR) — 공유받은 멤버는 재공유 불가, 내 냉장고(주인)일 때만 가능 */}
                      {onShareFridge && activeFridge && activeFridge.uuid && activeFridge.role !== 'MEMBER' && (
                        <TouchableOpacity
                          style={styles.settingsActionRow}
                          activeOpacity={0.7}
                          onPress={() => {
                            setFridgeSettingsVisible(false);
                            onShareFridge(activeFridge.name, activeFridge.uuid!);
                          }}
                        >
                          <View style={styles.settingsActionLeft}>
                            <View style={[styles.settingsIconBadge, { backgroundColor: theme.primaryLight }]}>
                              <Ionicons name="qr-code-outline" size={18} color={theme.primary} />
                            </View>
                            <Text style={[styles.settingsActionText, { color: theme.textSecondary }]}>냉장고 공유 (QR)</Text>
                          </View>
                          <Ionicons name="chevron-forward" size={16} color={theme.textMuted} />
                        </TouchableOpacity>
                      )}

                      {/* 기록 이력 — 함께 쓰는 사람이 있을 때만 의미가 있어서 그때만 노출 */}
                      {activeFridge.memberNames && activeFridge.memberNames.length > 1 && (
                        <TouchableOpacity
                          style={styles.settingsActionRow}
                          activeOpacity={0.7}
                          onPress={() => {
                            setFridgeSettingsVisible(false);
                            openHistory(activeFridge.id);
                          }}
                        >
                          <View style={styles.settingsActionLeft}>
                            <View style={[styles.settingsIconBadge, { backgroundColor: theme.primaryLight }]}>
                              <Ionicons name="time-outline" size={18} color={theme.primary} />
                            </View>
                            <Text style={[styles.settingsActionText, { color: theme.textSecondary }]}>기록 이력</Text>
                          </View>
                          <Ionicons name="chevron-forward" size={16} color={theme.textMuted} />
                        </TouchableOpacity>
                      )}
                    </View>
                  </ScrollView>

                  {/* 삭제 요청/응답 또는 삭제·나가기 — 영역 맨 아래로 고정 */}
                  <View style={styles.settingsDangerZone}>
                    {activeFridge.deletionRequested ? (
                      activeFridge.role === 'MEMBER' ? (
                        <View style={[styles.deletionRequestBox, { backgroundColor: theme.dangerLight, borderColor: theme.danger }]}>
                          <Text style={[styles.deletionRequestText, { color: theme.danger }]}>
                            냉장고 주인이 삭제를 요청했어요. 동의하시나요?
                          </Text>
                          <View style={styles.deletionRequestButtonRow}>
                            <TouchableOpacity
                              style={[styles.deletionRequestButton, { backgroundColor: theme.surface, borderColor: theme.borderLight }]}
                              activeOpacity={0.8}
                              onPress={() => {
                                setFridgeSettingsVisible(false);
                                onRejectDeletionRequest?.();
                              }}
                            >
                              <Text style={[styles.deletionRequestButtonText, { color: theme.textSecondary }]}>거절</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                              style={[styles.deletionRequestButton, { backgroundColor: theme.danger, borderColor: theme.danger }]}
                              activeOpacity={0.8}
                              onPress={() => {
                                setFridgeSettingsVisible(false);
                                onApproveDeletionRequest?.();
                              }}
                            >
                              <Text style={[styles.deletionRequestButtonText, { color: '#FFFFFF' }]}>동의</Text>
                            </TouchableOpacity>
                          </View>
                        </View>
                      ) : (
                        <View style={[styles.deletionRequestBox, { backgroundColor: theme.dangerLight, borderColor: theme.danger }]}>
                          <Text style={[styles.deletionRequestText, { color: theme.danger }]}>
                            삭제 요청을 보냈어요. 함께 쓰는 멤버의 동의를 기다리는 중이에요.
                          </Text>
                          <TouchableOpacity
                            style={[styles.deletionRequestButton, { backgroundColor: theme.surface, borderColor: theme.borderLight, alignSelf: 'stretch' }]}
                            activeOpacity={0.8}
                            onPress={() => {
                              setFridgeSettingsVisible(false);
                              onCancelDeletionRequest?.();
                            }}
                          >
                            <Text style={[styles.deletionRequestButtonText, { color: theme.textSecondary }]}>요청 철회</Text>
                          </TouchableOpacity>
                        </View>
                      )
                    ) : (
                      <TouchableOpacity
                        style={styles.settingsActionRow}
                        activeOpacity={0.7}
                        onPress={() => {
                          setFridgeSettingsVisible(false);
                          onDeleteFridge();
                        }}
                      >
                        <View style={styles.settingsActionLeft}>
                          <View style={[styles.settingsIconBadge, { backgroundColor: theme.dangerLight }]}>
                            <Ionicons name={activeFridge.role === 'MEMBER' ? 'log-out-outline' : 'trash-outline'} size={18} color={theme.danger} />
                          </View>
                          <Text style={[styles.settingsActionText, { color: theme.danger }]}>
                            {activeFridge.role === 'MEMBER' ? '냉장고 나가기' : '현재 냉장고 삭제'}
                          </Text>
                        </View>
                        <Ionicons name="chevron-forward" size={16} color={theme.dangerMuted} />
                      </TouchableOpacity>
                    )}
                  </View>
                </>
              ) : (
                <Text style={{ color: theme.textMuted, textAlign: 'center', marginVertical: 20 }}>
                  선택된 냉장고가 없어요.
                </Text>
              )}
            </View>
          </Animated.View>
          </Animated.View>
        </View>
      </Modal>

      {/* 사용자 목록 바텀시트 */}
      <Modal
        visible={memberSheetRendered}
        transparent
        animationType="none"
        onRequestClose={() => setMemberSheetVisible(false)}
      >
        <View style={styles.settingsSheetOverlay}>
          <Animated.View
            style={[
              StyleSheet.absoluteFillObject,
              { backgroundColor: theme.modalOverlay, opacity: memberSheetBackdropOpacity },
            ]}
          >
            <TouchableOpacity
              style={styles.sheetBackdrop}
              activeOpacity={1}
              onPress={() => setMemberSheetVisible(false)}
            />
          </Animated.View>
          <Animated.View style={{ width: '100%', transform: [{ translateY: memberSheetTranslateY }] }}>
            <View
              style={[
                styles.settingsSheetContent,
                { backgroundColor: theme.surface, height: MEMBER_SHEET_HEIGHT },
              ]}
            >
              <View style={[styles.modalHeader, { borderBottomColor: theme.borderLight }]}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Ionicons name="people-outline" size={20} color={theme.textPrimary} />
                  <Text style={[styles.modalTitleText, { color: theme.textPrimary }]}>사용자</Text>
                </View>
                <TouchableOpacity onPress={() => setMemberSheetVisible(false)} style={styles.modalCloseButton}>
                  <Ionicons name="close" size={24} color={theme.textSecondary} />
                </TouchableOpacity>
              </View>

              <ScrollView style={{ flex: 1, marginTop: 8 }} showsVerticalScrollIndicator={false}>
                {activeFridge?.memberNames?.map((name, i) => (
                  <View
                    key={`${name}_${i}`}
                    style={[styles.memberRow, { borderBottomColor: theme.borderLight }]}
                  >
                    <View style={[styles.memberAvatarCircle, { backgroundColor: theme.primaryLight }]}>
                      <Text style={[styles.memberAvatarText, { color: theme.primaryText }]}>{name.charAt(0)}</Text>
                    </View>
                    <Text style={[styles.memberName, { color: theme.textPrimary }]}>{name}</Text>
                    {name === activeFridge.ownerName && <Text style={styles.memberOwnerBadge}>👑</Text>}
                  </View>
                ))}
              </ScrollView>
            </View>
          </Animated.View>
        </View>
      </Modal>

      {/* 냉장고 이름 변경 다이얼로그 */}
      <Modal
        visible={editingNameFridgeId !== null}
        transparent
        animationType="fade"
        onRequestClose={cancelEditingName}
      >
        <View style={[styles.modalOverlay, { backgroundColor: theme.modalOverlay }]}>
          <View style={[styles.renameDialogContent, { backgroundColor: theme.surface }]}>
            <Text style={[styles.renameDialogTitle, { color: theme.textPrimary }]}>냉장고 이름 변경</Text>
            <TextInput
              style={[styles.renameDialogInput, { color: theme.textPrimary, borderColor: theme.border }]}
              value={nameDraft}
              onChangeText={setNameDraft}
              maxLength={20}
              autoFocus
              onSubmitEditing={() => editingNameFridgeId && confirmEditingName(editingNameFridgeId)}
            />
            <View style={styles.renameDialogButtonRow}>
              <TouchableOpacity
                style={[styles.renameDialogButton, { backgroundColor: theme.surfaceTertiary }]}
                activeOpacity={0.8}
                onPress={cancelEditingName}
              >
                <Text style={[styles.renameDialogButtonText, { color: theme.textSecondary }]}>취소</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.renameDialogButton, { backgroundColor: theme.primary }]}
                activeOpacity={0.8}
                onPress={() => editingNameFridgeId && confirmEditingName(editingNameFridgeId)}
              >
                <Text style={[styles.renameDialogButtonText, { color: theme.primaryOnPrimary }]}>적용</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    width: '100%',
    backgroundColor: '#FAFAFA',
  },
  slimHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    marginTop: 6,
  },
  headerLeft: {
    flex: 1,
    justifyContent: 'center',
    marginRight: 12,
  },
  headerGreetingName: {
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  headerGreetingMessage: {
    marginTop: 2,
    flexShrink: 1,
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  dashboardScrollView: {
    flex: 1,
  },
  dashboardContent: {
    paddingTop: 20,
    paddingBottom: 60, // 하단 탭바 높이에 맞춰 최소한의 여백만 부여
  },
  loginNudge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start', // 왼쪽 정렬 + 터치 영역을 문구 폭으로 제한
    gap: 5,
    marginHorizontal: 20, // 대시보드 카드와 좌측 정렬 맞춤
    marginBottom: 10, // 대시보드에 가깝게 붙임
  },
  loginNudgeText: {
    fontSize: 12.5,
    fontWeight: '600',
    letterSpacing: -0.2,
  },
  fridgeModeContent: {
    paddingTop: 20,
    paddingBottom: 16,
  },
  sectionContainer: {
    marginVertical: 14,
    width: '100%',
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    paddingHorizontal: 20,
    marginBottom: 12,
  },
  sectionSubText: {
    fontSize: 12,
    fontWeight: '600',
  },
  statsCardsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginHorizontal: 20,
    gap: 10,
  },
  statsMiniCard: {
    flex: 1,
    borderRadius: 20,
    borderWidth: 1.5,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.03,
    shadowRadius: 8,
    elevation: 2,
  },
  statsIconBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 6,
  },
  statsCountText: {
    fontSize: 20,
    fontWeight: '800',
    marginBottom: 2,
  },
  statsMiniLabel: {
    fontSize: 11,
    fontWeight: '700',
  },
  urgentScrollContainer: {
    paddingHorizontal: 20,
    gap: 12,
    paddingBottom: 8,
  },
  urgentListContainer: {
    paddingHorizontal: 20,
    maxHeight: 220,
  },
  urgentListItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: 16,
    borderWidth: 1,
    padding: 12,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.02,
    shadowRadius: 4,
    elevation: 1,
  },
  urgentListLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  urgentListEmojiBg: {
    width: 38,
    height: 38,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  urgentListEmoji: {
    fontSize: 18,
  },
  urgentListInfo: {
    flex: 1,
    gap: 2,
  },
  urgentListName: {
    fontSize: 13,
    fontWeight: 'bold',
  },
  urgentListLocation: {
    fontSize: 10,
    fontWeight: '600',
  },
  urgentListDDayBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
  },
  urgentListDDayText: {
    fontSize: 10,
    fontWeight: 'bold',
  },
  urgentCard: {
    width: 140,
    height: 165,
    borderRadius: 18,
    borderTopWidth: 4.5,
    borderWidth: 1,
    padding: 12,
    alignItems: 'center',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  urgentEmojiBadge: {
    width: 38,
    height: 38,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  urgentEmoji: {
    fontSize: 20,
  },
  urgentName: {
    fontSize: 13,
    fontWeight: 'bold',
    marginBottom: 2,
    textAlign: 'center',
    width: '100%',
  },
  urgentLocation: {
    fontSize: 10,
    textAlign: 'center',
    width: '100%',
    marginBottom: 10,
  },
  urgentDDayBadge: {
    height: 24,
    paddingHorizontal: 10,
    borderRadius: 8,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  urgentDDayText: {
    fontSize: 11,
    fontWeight: 'bold',
    includeFontPadding: false,
    textAlignVertical: 'center',
  },
  emptyUrgentCard: {
    marginHorizontal: 20,
    paddingVertical: 20,
    paddingHorizontal: 16,
    borderRadius: 18,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyUrgentText: {
    fontSize: 13,
    fontWeight: 'bold',
    marginTop: 4,
  },
  emptyUrgentSub: {
    fontSize: 11,
    marginTop: 2,
  },
  carouselWrapper: {
    flex: 1,
    width: '100%',
  },
  slideContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  fridgeNameContainer: {
    width: '100%',
    marginBottom: 20,
  },
  fridgeNameTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#37474F',
    textAlign: 'center',
  },
  sharedAvatarStack: {
    position: 'absolute',
    top: 14,
    left: 14,
    flexDirection: 'row',
    alignItems: 'center',
    zIndex: 10,
  },
  sharedAvatar: {
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sharedAvatarText: {
    fontSize: 11,
    fontWeight: '700',
  },
  memberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  memberAvatarCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  memberAvatarText: {
    fontSize: 14,
    fontWeight: '700',
  },
  memberName: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
  },
  memberOwnerBadge: {
    fontSize: 16,
  },
  fridgeCardSettingsButton: {
    position: 'absolute',
    top: 14,
    right: 14,
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  fridgeMemoTagWrapper: {
    position: 'absolute',
    top: -6,
    right: 68,
    zIndex: 10,
  },
  fridgeMemoTag: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 56,
    paddingHorizontal: 16,
    paddingVertical: 5,
    borderRadius: 9,
    backgroundColor: '#FFC107',
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 3,
    shadowOffset: { width: 0, height: 2 },
    elevation: 4,
  },
  fridgeMemoTagText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#5C4500',
  },
  fridgeCardMemoDot: {
    position: 'absolute',
    top: -4,
    right: -4,
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 2,
  },
  memoTypeSegmentRow: {
    flexDirection: 'row',
    borderWidth: 1.5,
    borderRadius: 10,
    margin: 16,
    marginBottom: 0,
    overflow: 'hidden',
  },
  memoTypeSegment: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 10,
  },
  memoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 14,
    paddingBottom: 8,
  },
  memoTileWrapper: {
    width: '30%',
  },
  memoTile: {
    width: '100%',
    aspectRatio: 1,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowRadius: 3,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  memoAddTile: {
    borderWidth: 1.5,
    borderStyle: 'dashed',
    shadowOpacity: 0,
    elevation: 0,
  },
  memoTileWithText: {
    padding: 8,
    alignItems: 'flex-start',
    justifyContent: 'flex-start',
    overflow: 'hidden',
  },
  memoTileLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: 'rgba(0,0,0,0.15)',
  },
  memoTileText: {
    fontSize: 11,
    lineHeight: 14,
    textAlign: 'left',
    color: 'rgba(0,0,0,0.75)',
    // Android는 폰트마다 위아래 여백(ascent/descent)을 다르게 얹어서(includeFontPadding)
    // 같은 lineHeight를 줘도 기기별로 줄과 글자 위치가 미묘하게 어긋난다. 꺼서 일관되게 만든다.
    includeFontPadding: false,
    textAlignVertical: 'center',
  },
  memoChecklistRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  memoChecklistText: {
    flex: 1,
    fontSize: 15,
  },
  memoTextInput: {
    borderWidth: 1.5,
    borderRadius: 10,
    padding: 12,
    fontSize: 15,
    minHeight: 140,
    textAlignVertical: 'top',
  },
  memoChecklistEditRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 8,
  },
  memoChecklistEditInput: {
    flex: 1,
    borderWidth: 1.5,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
  },
  memoAddItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 10,
  },
  memoSaveButton: {
    margin: 16,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  pencilIconButton: {
    padding: 4,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 6,
    backgroundColor: '#ECEFF1',
  },
  deletionOverlay: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 28,
    backgroundColor: 'rgba(15, 23, 42, 0.82)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
    zIndex: 20,
  },
  deletionOverlayText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 20,
  },
  deletionOverlayButtonRow: {
    flexDirection: 'row',
    gap: 10,
  },
  deletionOverlayButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
  },
  deletionOverlayButtonText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  fridgeCard: {
    width: '90%',
    height: '92%',
    borderRadius: 28,
    borderWidth: 1.5,
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.08,
    shadowRadius: 24,
    elevation: 6,
  },
  fridgeFrame: {
    flex: 1,
    width: '100%',
    backgroundColor: '#37474F', // 진회색 외곽 프레임
    borderRadius: 20,
    padding: 4,
    gap: 3,
  },
  pantryButton: {
    width: '100%',
    marginTop: 8,
    minHeight: 52,
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderWidth: 1,
    position: 'relative',
  },
  pantryButtonText: {
    fontSize: 15,
    fontWeight: '600',
  },
  horizontalRow: {
    flex: 1,
    flexDirection: 'row',
    gap: 6,
  },
  door: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
    padding: 16,
    borderWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.35)',
    borderLeftColor: 'rgba(255, 255, 255, 0.18)',
    borderBottomColor: 'rgba(0, 0, 0, 0.16)',
    borderRightColor: 'rgba(0, 0, 0, 0.1)',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 1,
  },
  fridgeColor: {
    backgroundColor: '#E3F2FD', // 연파랑
  },
  freezerColor: {
    backgroundColor: '#E0F7FA', // 연민트
  },
  topLeftRadius: {
    borderTopLeftRadius: 14,
  },
  topRightRadius: {
    borderTopRightRadius: 14,
  },
  bottomLeftRadius: {
    borderBottomLeftRadius: 14,
  },
  bottomRightRadius: {
    borderBottomRightRadius: 14,
  },
  dividerLine: {
    height: 3,
    backgroundColor: '#37474F',
  },
  doorLabel: {
    position: 'absolute',
    top: 12,
    left: 12,
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: -0.2,
    color: '#37474F',
  },
  doorGlassPanel: {
    flex: 1,
    alignSelf: 'stretch',
    marginTop: 24,
    borderRadius: 14,
    borderWidth: 1,
    padding: 8,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  doorGlassEmptyText: {
    fontSize: 13,
    fontWeight: '700',
  },
  doorGlassScroll: {
    flex: 1,
    width: '100%',
  },
  doorGlassListContent: {
    gap: 6,
    paddingTop: 4,
  },
  doorGlassItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    paddingBottom: 6,
  },
  doorGlassItemName: {
    flex: 1,
    fontSize: 12,
    fontWeight: '500',
    textAlign: 'left',
  },
  doorGlassItemQty: {
    fontSize: 11,
    fontWeight: '500',
    textAlign: 'right',
  },
  handle: {
    position: 'absolute',
    backgroundColor: '#F5F5F5', // 밝은 크롬/알루미늄 색상
    borderRadius: 3,
    borderWidth: 1,
    borderTopColor: '#FFFFFF',
    borderLeftColor: '#FFFFFF',
    borderBottomColor: '#90A4AE',
    borderRightColor: '#90A4AE',
    shadowColor: '#000000',
    shadowOffset: { width: 1, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 2,
    elevation: 2,
  },
  verticalHandleLeft: {
    width: 8,
    height: '40%',
    left: 8,
    top: '30%',
  },
  verticalHandleRight: {
    width: 8,
    height: '40%',
    right: 8,
    top: '30%',
  },
  horizontalHandleTop: {
    height: 8,
    width: '40%',
    top: 8,
    left: '30%',
  },
  horizontalHandleBottom: {
    height: 8,
    width: '40%',
    bottom: 8,
    left: '30%',
  },
  doorAlertBadge: {
    position: 'absolute',
    top: 12,
    right: 12,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1.5,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 4,
    zIndex: 10,
  },
  doorAlertBadgeText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: 'bold',
  },
  indicatorContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 16,
  },
  indicatorDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#CFD8DC',
  },
  indicatorDotActive: {
    backgroundColor: '#3F51B5',
    width: 20, // 활성화 시 넓게 펴짐
  },
  addFridgeBox: {
    width: '90%',
    height: '92%',
    backgroundColor: '#FFFFFF',
    borderRadius: 28,
    borderWidth: 2.5,
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'stretch',
    padding: 24,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.05,
    shadowRadius: 20,
    elevation: 4,
  },
  addFridgeMainArea: {
    alignItems: 'center',
  },
  addFridgeDivider: {
    height: 1,
    width: '100%',
    marginVertical: 20,
  },
  qrJoinRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  qrJoinText: {
    fontSize: 14,
    fontWeight: '600',
  },
  addIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#E8EAF6',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  addIconText: {
    fontSize: 32,
    color: '#3F51B5',
    fontWeight: '300',
  },
  addFridgeTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#37474F',
    marginBottom: 8,
  },
  addFridgeDesc: {
    fontSize: 13,
    color: '#90A4AE',
    textAlign: 'center',
    lineHeight: 18,
  },
  foodSafetyCard: {
    marginHorizontal: 20,
    borderRadius: 16,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
  },
  twoColumnRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginHorizontal: 20,
    marginVertical: 14,
    gap: 12,
  },
  foodSafetyColumnCard: {
    width: '45%',
    height: 140,
    borderRadius: 16,
    borderWidth: 1,
    padding: 10,
    justifyContent: 'space-between',
  },
  fridgeColumnCard: {
    width: '51%',
    height: 140,
    borderRadius: 16,
    borderWidth: 1,
    padding: 12,
    justifyContent: 'space-between',
  },
  cardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  columnCardTitle: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  cardMainRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginVertical: 2,
  },
  cardLargeIndex: {
    fontSize: 48,
    fontWeight: '900',
    lineHeight: 48,
  },
  cardMainTitle: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  cardFooterRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardSubText: {
    fontSize: 10,
    fontWeight: '600',
  },
  fridgeCountBadge: {
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 6,
  },
  fridgeCountBadgeText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: 'bold',
  },
  foodSafetyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  foodSafetyTitleCol: {
    flexDirection: 'column',
    gap: 2,
  },
  foodSafetyTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  foodSafetyTitle: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  foodSafetyMainRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginTop: 2,
  },
  foodSafetyValueContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
  },
  foodSafetyLargeIndex: {
    fontSize: 44,
    fontWeight: '900',
    lineHeight: 44,
  },
  foodSafetyBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  foodSafetyBadgeText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: 'bold',
  },
  foodSafetyDesc: {
    fontSize: 12,
    lineHeight: 18,
    fontWeight: '500',
  },
  progressBarBg: {
    height: 4,
    borderRadius: 2,
    width: '100%',
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 2,
  },
  permissionButton: {
    paddingVertical: 8,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 4,
  },
  permissionButtonText: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  weatherConditionText: {
    fontSize: 11,
    fontWeight: '600',
    marginTop: 2,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 20,
    marginTop: 10,
    marginBottom: 14,
    paddingHorizontal: 16,
    height: 48,
    borderRadius: 14,
    borderWidth: 1,
    gap: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    height: '100%',
    padding: 0,
  },
  filterContainer: {
    marginBottom: 16,
    height: 38,
  },
  filterBarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    gap: 8,
    marginBottom: 12,
  },
  filterOpenButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
  },
  filterOpenButtonText: {
    fontSize: 13,
    fontWeight: '700',
  },
  filterAppliedScroll: {
    flex: 1,
  },
  filterAppliedChip: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 14,
    borderWidth: 1,
  },
  filterAppliedChipText: {
    fontSize: 12,
    fontWeight: '600',
    maxWidth: 110,
  },
  filterResetButton: {
    padding: 4,
  },
  filterModalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  filterModalCard: {
    width: '100%',
    maxWidth: 420,
    borderRadius: 18,
    borderWidth: 1,
    overflow: 'hidden',
  },
  filterModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  filterModalTitle: {
    fontSize: 17,
    fontWeight: 'bold',
  },
  filterModalSectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 8,
  },
  filterOptionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
  },
  filterOptionText: {
    fontSize: 15,
    fontWeight: '600',
  },
  filterModalFooter: {
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderTopWidth: 1,
  },
  filterFooterButton: {
    flex: 1,
    paddingVertical: 13,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterFooterButtonText: {
    fontSize: 15,
    fontWeight: '700',
  },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterChipActive: {
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  filterChipText: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  ingListContainer: {
    flex: 1,
  },
  ingCard: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 14,
    paddingTop: 10,
    position: 'relative',
  },
  ingCardMainRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  ingCardEmojiBg: {
    width: 48,
    height: 48,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  ingCardInfo: {
    flex: 1,
    gap: 4,
  },
  ingCardName: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  ingCardQtyInline: {
    fontSize: 13,
    fontWeight: '700',
  },
  ingCardTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  ingCardTopLocText: {
    flex: 1,
    fontSize: 11,
    fontWeight: '600',
  },
  ingCardTopRowIcons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  ingCardTopRowIconButton: {
    width: 30,
    height: 30,
    justifyContent: 'center',
    alignItems: 'center',
  },
  ingCardMenu: {
    position: 'absolute',
    top: 38,
    right: 10,
    minWidth: 140,
    borderWidth: 1,
    borderRadius: 10,
    paddingVertical: 4,
    flexDirection: 'column',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.18,
    shadowRadius: 8,
    elevation: 8,
    zIndex: 30,
  },
  ingCardMenuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 11,
    paddingHorizontal: 14,
  },
  ingCardMenuText: {
    fontSize: 14,
    fontWeight: '600',
  },
  emptyStateContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingBottom: 100,
  },
  emptyStateText: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  addIngredientFab: {
    position: 'absolute',
    right: 20,
    bottom: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  seasonalCard: {
    width: 140,
    height: 165,
    borderRadius: 18,
    borderWidth: 1,
    padding: 12,
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  seasonalListContainer: {
    paddingHorizontal: 20,
    maxHeight: 220,
  },
  seasonalRowItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: 16,
    borderWidth: 1,
    padding: 12,
  },
  seasonalRowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  seasonalRowEmojiBg: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  seasonalRowEmoji: {
    fontSize: 22,
  },
  seasonalRowInfo: {
    flexDirection: 'column',
    gap: 2,
    flex: 1,
    marginRight: 10,
  },
  seasonalRowName: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  seasonalRowRecommend: {
    fontSize: 11,
    lineHeight: 14,
  },
  youtubeRowButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
  },
  youtubeRowText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: 'bold',
  },
  seasonalTitle: {
    fontSize: 13,
    fontWeight: 'bold',
    textAlign: 'center',
    width: '100%',
  },
  seasonalRecommend: {
    fontSize: 10,
    textAlign: 'center',
    width: '100%',
    lineHeight: 13,
    marginVertical: 4,
  },
  youtubeLinkButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    marginTop: 2,
  },
  youtubeLinkText: {
    fontSize: 9,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  guideBanner: {
    marginHorizontal: 20,
    backgroundColor: '#3F51B5', // Indigo Accent 배경
    borderRadius: 24,
    padding: 22,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 40,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.1,
    shadowRadius: 16,
    elevation: 4,
  },
  guideBannerLeft: {
    flex: 1,
    paddingRight: 10,
    gap: 6,
  },
  guideBannerSubTitle: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#C5CAE9', // 소프트 블루
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  guideBannerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  guideBannerDesc: {
    fontSize: 12,
    color: '#E0E0E0',
    lineHeight: 18,
    marginTop: 2,
    marginBottom: 8,
  },
  guideBannerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 10,
    alignSelf: 'flex-start',
  },
  guideBannerButtonText: {
    fontSize: 11,
    fontWeight: 'bold',
  },
  guideBannerRight: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  guideBannerCompact: {
    marginHorizontal: 20,
    borderRadius: 18,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    marginTop: 6,
    marginBottom: 6,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  guideBannerTitleCompact: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  guideBannerButtonCompact: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    gap: 2,
  },
  modalContainer: {
    flex: 1,
  },
  modalHeader: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    borderBottomWidth: 1,
  },
  modalHeaderTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  modalHeaderTitle: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  modalCloseButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  guideTipCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.02,
    shadowRadius: 6,
    elevation: 1,
    gap: 12,
  },
  guideCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  guideCardName: {
    fontSize: 15,
    fontWeight: 'bold',
  },
  categoryBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    overflow: 'hidden',
  },
  categoryBadgeText: {
    fontSize: 10,
    fontWeight: 'bold',
  },
  guideCardBody: {
    width: '100%',
  },
  guideCardTipText: {
    fontSize: 12.5,
    lineHeight: 18.5,
    fontWeight: '500',
  },
  guideYoutubeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
  },
  guideYoutubeText: {
    fontSize: 11.5,
    fontWeight: 'bold',
    flex: 1,
  },
  pageTitle: {
    fontSize: 24,
    fontWeight: '800',
    paddingHorizontal: 20,
    marginBottom: 20,
    letterSpacing: -0.5,
  },
  mainDashboardCard: {
    marginHorizontal: 20,
    borderRadius: 24,
    borderWidth: 1,
    padding: 20,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.04,
    shadowRadius: 16,
    elevation: 2,
  },
  dashboardHeader: {
    marginBottom: 4,
  },
  weeklyTimelineRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
  },
  weeklyDayColumn: {
    flex: 1,
    alignItems: 'center',
  },
  weeklyDayCount: {
    fontSize: 11,
    fontWeight: '700',
    marginBottom: 4,
    height: 14,
  },
  weeklyDayBar: {
    width: 6,
    height: 36,
    justifyContent: 'flex-end',
  },
  weeklyDayBarFill: {
    width: 6,
    borderRadius: 3,
  },
  weeklyDayLabel: {
    fontSize: 11,
    fontWeight: '600',
    marginTop: 6,
  },
  statBlockRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 16,
  },
  statBlock: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 12,
    borderRadius: 14,
  },
  statBlockValue: {
    fontSize: 28,
    fontWeight: '800',
  },
  statBlockLabel: {
    fontSize: 13,
    fontWeight: '600',
    marginTop: 2,
  },
  statBlockDivider: {
    width: 1,
    height: 32,
  },
  settingsModalContent: {
    width: '90%',
    maxHeight: '80%',
    borderRadius: 24,
    borderWidth: 1,
    padding: 20,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 5,
  },
  settingsSheetOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  sheetBackdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  settingsSheetContent: {
    width: '100%',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    paddingTop: 8,
    paddingBottom: 32,
    shadowOffset: { width: 0, height: -10 },
    shadowOpacity: 0.08,
    shadowRadius: 24,
    elevation: 24,
  },
  sheetDragHandleArea: {
    width: '100%',
    paddingVertical: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sheetDragHandle: {
    width: 56,
    height: 5,
    borderRadius: 3,
  },
  settingsModalBody: {
    flex: 1,
    marginTop: 16,
    justifyContent: 'space-between',
  },
  pickerModalBody: {
    marginTop: 16,
  },
  pickerSectionLabel: {
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 4,
  },
  historyRow: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    gap: 4,
  },
  historyRowTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
  },
  historyActorText: {
    fontSize: 13,
    fontWeight: '700',
    flex: 1,
  },
  historyTimeText: {
    fontSize: 11,
    fontWeight: '500',
  },
  historyBodyText: {
    fontSize: 13,
    lineHeight: 18,
  },
  settingsTopSectionScroll: {
    flex: 1,
  },
  settingsTopSection: {
    gap: 16,
  },
  settingsDangerZone: {
    marginTop: 16,
  },
  settingsActiveFridgeInfo: {
    alignItems: 'center',
    gap: 4,
    paddingBottom: 20,
    borderBottomWidth: 1,
  },
  settingsActiveFridgeName: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  settingsActiveFridgeTypeText: {
    fontSize: 13,
    fontWeight: '500',
  },
  settingsActionsContainer: {},
  settingsActionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 12,
  },
  // 평문처럼 보이던 "위치 나중에 정하기"를 확실한 버튼(채움 배경·전체 폭·가운데 정렬)으로 노출
  skipLocationButton: {
    alignSelf: 'stretch', // 화면 폭에 맞춰 반응형으로 늘어남
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 7,
    paddingHorizontal: 16,
    borderRadius: 12,
  },
  skipLocationButtonText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#000000', // primary(밝은 하늘색) 배경 위 검정으로 고대비 확보
    textAlign: 'center',
  },
  deletionRequestBox: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    gap: 12,
  },
  deletionRequestText: {
    fontSize: 13,
    fontWeight: '600',
    lineHeight: 18,
  },
  deletionRequestButtonRow: {
    flexDirection: 'row',
    gap: 8,
  },
  deletionRequestButton: {
    flex: 1,
    height: 40,
    borderRadius: 10,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  deletionRequestButtonText: {
    fontSize: 13,
    fontWeight: '700',
  },
  settingsActionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  settingsIconBadge: {
    width: 32,
    height: 32,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  settingsActionText: {
    fontSize: 14,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalTitleText: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  renameDialogContent: {
    width: '85%',
    maxWidth: 340,
    borderRadius: 20,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 10,
  },
  renameDialogTitle: {
    fontSize: 17,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 16,
  },
  renameDialogInput: {
    fontSize: 15,
    borderWidth: 1.5,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  renameDialogButtonRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 16,
  },
  renameDialogButton: {
    flex: 1,
    height: 46,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  renameDialogButtonText: {
    fontSize: 15,
    fontWeight: '700',
  },
});
