import React, { useEffect, useState } from 'react';
import { StyleSheet, TouchableOpacity, View, Text, ScrollView, useWindowDimensions, TextInput, FlatList, Platform, ActivityIndicator, Linking, Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import * as WebBrowser from 'expo-web-browser';
import { FridgeType, Ingredient } from '../types';
import { SAMPLE_INGREDIENTS, CATEGORY_EMOJI } from './CompartmentDetail';
import { useAuth } from '../context/AuthContext';
import { getFridgeLayout } from '../api/fridgeService';
import { deserializeMemo, convertServerLocationToLocal } from '../utils/memoSerializer';
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

interface StorageTip {
  name: string;
  emoji: string;
  category: string;
  tip: string;
}

const STORAGE_TIPS: StorageTip[] = [
  { name: '대파', emoji: '🌱', category: '채소', tip: '송송 썰어 키친타월로 물기를 완전히 제거한 후 냉동 보관하면 최대 6개월간 쓸 수 있어요.' },
  { name: '양파', emoji: '🧅', category: '채소', tip: '망에 하나씩 분리해 넣거나, 껍질을 벗겨 랩으로 개별 포장한 뒤 냉장실 야채칸에 보관하세요.' },
  { name: '바나나', emoji: '🍌', category: '과일', tip: '꼭지 부분을 랩으로 감싸 보관하면 에틸렌 가스가 차단되어 갈변 속도를 늦출 수 있어요.' },
  { name: '달걀', emoji: '🥚', category: '유제품', tip: '뾰족한 곳이 아래로 향하게 보관하세요. 둥근 부분에 숨구멍이 있어 신선함이 오래 유지돼요.' },
  { name: '토마토', emoji: '🍅', category: '채소', tip: '냉장 보관하면 당도가 떨어지고 껍질이 두꺼워집니다. 꼭지를 떼어 그늘진 실온에 보관하세요.' },
  { name: '감자', emoji: '🥔', category: '채소', tip: '신선한 사과 한 개를 같이 넣어두면, 사과에서 나오는 에틸렌 가스가 감자 싹의 성장을 막아줘요.' },
  { name: '두부', emoji: '⬜', category: '기타', tip: '밀폐용기에 맑은 물과 소금 한 꼬집을 넣은 뒤 두부를 담가 보관하면 상하는 것을 늦출 수 있어요.' }
];

interface RefrigeratorVisualProps {
  mode?: 'home' | 'ingredients' | 'fridge';
  refrigerators: { id: string; type: FridgeType; name: string }[];
  onPressCompartment: (id: string, label: string, fridgeId: string) => void;
  activeIndex: number;
  setActiveIndex: (index: number) => void;
  onOpenAddSelector: () => void;
  onOpenRenameModal: () => void;
}

export default function RefrigeratorVisual({
  mode = 'home',
  refrigerators,
  onPressCompartment,
  activeIndex,
  setActiveIndex,
  onOpenAddSelector,
  onOpenRenameModal
}: RefrigeratorVisualProps) {
  const { width: screenWidth } = useWindowDimensions();
  const { isLoggedIn } = useAuth();
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const { theme, isDark } = useTheme();

  // 식재료 목록 탭용 상태
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFilter, setSelectedFilter] = useState<'all' | 'expired' | 'imminent' | 'safe'>('all');

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
    loading: true,
    isFallback: false,
  });

  // 식재료 실시간 로드 (서버 vs 로컬 분기)
  useEffect(() => {
    const loadIngredients = async () => {
      try {
        if (isLoggedIn) {
          // 각 냉장고의 레이아웃을 서버에서 로드
          const promises = refrigerators.map(f => getFridgeLayout(Number(f.id)).catch(() => null));
          const layouts = await Promise.all(promises);
          const allIngredients: Ingredient[] = [];

          layouts.forEach((layout, index) => {
            if (!layout || !Array.isArray(layout.compartments)) return;
            const fridge = refrigerators[index];
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
          });
          setIngredients(allIngredients);
        } else {
          // 로컬 로드
          const ingredientsStr = await AsyncStorage.getItem('@ingredients');
          if (ingredientsStr) {
            setIngredients(JSON.parse(ingredientsStr));
          } else {
            // 샘플 데이터 초기화
            const allSamples = Object.values(SAMPLE_INGREDIENTS).flat();
            setIngredients(allSamples);
          }
        }
      } catch (e) {
        console.error('Failed to load ingredients for visual', e);
      }
    };
    loadIngredients();
  }, [refrigerators, isLoggedIn]);

  // 냉장고 목록 크기나 로그인 상태가 바뀌면 캐러셀 인덱스를 0으로 초기화
  useEffect(() => {
    setActiveIndex(0);
  }, [refrigerators.length, isLoggedIn]);

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
      default: return '보관실';
    }
  };

  // 특정 냉장고의 칸 요약 뱃지 계산
  const getCompartmentSummary = (fridgeId: string, compartmentId: string) => {
    const compIngredients = ingredients.filter(
      item => item.fridgeId === fridgeId && item.location === compartmentId
    );
    if (compIngredients.length === 0) {
      return '비어 있음 🍃';
    }
    const firstItem = compIngredients[0];
    const emoji = CATEGORY_EMOJI[firstItem.category] || '';
    if (compIngredients.length === 1) {
      return `${emoji ? emoji + ' ' : ''}${firstItem.name}`;
    }
    return `${emoji ? emoji + ' ' : ''}${firstItem.name} 외 ${compIngredients.length - 1}개`;
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
          {isExpired ? '⚠️ ' : ''}{labelText}
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
            <Text style={[styles.doorLabel, { color: theme.fridgeLabel }]}>냉장실 (좌)</Text>
            <Text style={[styles.doorCount, { color: theme.fridgeCountText, backgroundColor: theme.fridgeCountBg }]}>
              {getCompartmentSummary(fridgeId, 'fridge_left')}
            </Text>
            <View style={[styles.handle, styles.verticalHandleRight]} />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.door, styles.topRightRadius, { backgroundColor: theme.fridgeDoor, borderColor: theme.glassBorder }]}
            activeOpacity={0.8}
            onPress={() => onPressCompartment('fridge_right', '냉장실 (우)', fridgeId)}
          >
            {renderDoorAlertBadge(fridgeId, 'fridge_right')}
            <Text style={[styles.doorLabel, { color: theme.fridgeLabel }]}>냉장실 (우)</Text>
            <Text style={[styles.doorCount, { color: theme.fridgeCountText, backgroundColor: theme.fridgeCountBg }]}>
              {getCompartmentSummary(fridgeId, 'fridge_right')}
            </Text>
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
            <Text style={[styles.doorLabel, { color: theme.fridgeLabel }]}>냉동실 (좌)</Text>
            <Text style={[styles.doorCount, { color: theme.fridgeCountText, backgroundColor: theme.fridgeCountBg }]}>
              {getCompartmentSummary(fridgeId, 'freezer_left')}
            </Text>
            <View style={[styles.handle, styles.verticalHandleRight]} />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.door, styles.bottomRightRadius, { backgroundColor: theme.freezerDoor, borderColor: theme.glassBorder }]}
            activeOpacity={0.8}
            onPress={() => onPressCompartment('freezer_right', '냉동실 (우)', fridgeId)}
          >
            {renderDoorAlertBadge(fridgeId, 'freezer_right')}
            <Text style={[styles.doorLabel, { color: theme.fridgeLabel }]}>냉동실 (우)</Text>
            <Text style={[styles.doorCount, { color: theme.fridgeCountText, backgroundColor: theme.fridgeCountBg }]}>
              {getCompartmentSummary(fridgeId, 'freezer_right')}
            </Text>
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
            <Text style={[styles.doorCount, { color: theme.fridgeCountText, backgroundColor: theme.fridgeCountBg }]}>
              {getCompartmentSummary(fridgeId, 'freezer')}
            </Text>
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
            <Text style={[styles.doorCount, { color: theme.fridgeCountText, backgroundColor: theme.fridgeCountBg }]}>
              {getCompartmentSummary(fridgeId, 'fridge')}
            </Text>
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
          <Text style={[styles.doorCount, { color: theme.fridgeCountText, backgroundColor: theme.fridgeCountBg }]}>
            {getCompartmentSummary(fridgeId, 'freezer')}
          </Text>
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
          <Text style={[styles.doorCount, { color: theme.fridgeCountText, backgroundColor: theme.fridgeCountBg }]}>
            {getCompartmentSummary(fridgeId, 'fridge')}
          </Text>
          <View style={[styles.handle, styles.horizontalHandleTop]} />
        </TouchableOpacity>
      </View>
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
  const filteredIngredients = ingredients
    .filter(item => {
      if (searchQuery.trim()) {
        return item.name.toLowerCase().includes(searchQuery.toLowerCase());
      }
      return true;
    })
    .filter(item => {
      if (selectedFilter === 'all') return true;
      const dday = getDDayInfo(item.expiryDate);
      return dday.status === selectedFilter;
    })
    .sort((a, b) => {
      const ddayA = getDDayInfo(a.expiryDate);
      const ddayB = getDDayInfo(b.expiryDate);
      return ddayA.days - ddayB.days;
    });

  // 현재 월 기준 제철 식재료 목록 필터링
  const currentMonth = new Date().getMonth() + 1;
  const seasonalIngredients = SEASONAL_INGREDIENTS.filter(item => item.months.includes(currentMonth));

  // 유튜브 이동 핸들러 (인앱 브라우저를 띄워 뒤로가기/닫기 시 앱으로 즉각 복귀 가능)
  const handleOpenYoutube = async (query: string) => {
    const url = `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`;
    try {
      await WebBrowser.openBrowserAsync(url, {
        readerMode: false,
        dismissButtonStyle: 'close',
        toolbarColor: '#FFFFFF',
        enableBarCollapsing: true,
      });
    } catch (err) {
      console.warn("Failed to open in WebBrowser, trying Linking fallback:", err);
      Linking.openURL(url).catch(fallbackErr => {
        console.error("Failed to open YouTube URL", fallbackErr);
        Alert.alert("알림 ⚠️", "유튜브 링크를 열 수 없습니다.");
      });
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
        description = '식중독 발생 가능성이 낮습니다. 일반적인 위생 수칙을 준수하세요. 🍃';
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
        description = '식중독 발생 가능성이 낮습니다. 일반적인 위생 수칙을 준수하세요. 🍃';
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

  useEffect(() => {
    requestLocationAndFetchWeather();
  }, [theme]);

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      {/* 1. 상단 얇고 구분선 없는 브랜드 헤더바 */}
      <View style={[styles.slimHeader, { backgroundColor: theme.background }]}>
        <View style={styles.headerLeft}>
          <Text style={styles.headerLogoText}>
            <Text style={{ color: theme.textPrimary }}>Fresh</Text>
            <Text style={{ color: theme.primaryText }}>Keep</Text>
          </Text>
        </View>
        <View style={styles.headerRight}>
          {totalExpired > 0 && (
            <View style={[styles.headerBadge, { backgroundColor: theme.ddayExpired }]}>
              <Text style={styles.headerBadgeText}>🚨 {totalExpired}</Text>
            </View>
          )}
        </View>
      </View>

      {mode === 'home' && (
        <ScrollView
          style={styles.dashboardScrollView}
          contentContainerStyle={styles.dashboardContent}
          showsVerticalScrollIndicator={false}
        >
          {/* 오늘의 식중독 지수 */}
          <View style={styles.sectionContainer}>
            {weatherInfo.loading ? (
              <View style={[styles.foodSafetyCard, { backgroundColor: theme.surface, borderColor: theme.borderLight, justifyContent: 'center', alignItems: 'center', paddingVertical: 24 }]}>
                <ActivityIndicator size="small" color={theme.primary} />
              </View>
            ) : locationPermission === 'denied' ? (
              <View style={[styles.foodSafetyCard, { backgroundColor: theme.dangerLight, borderColor: theme.danger + '25' }]}>
                <View style={styles.foodSafetyHeader}>
                  <View style={styles.foodSafetyTitleRow}>
                    <Ionicons name="location-outline" size={16} color={theme.danger} />
                    <Text style={[styles.foodSafetyTitle, { color: theme.textPrimary }]}>식중독 지수 조회 불가</Text>
                  </View>
                  <View style={[styles.foodSafetyBadge, { backgroundColor: theme.danger }]}>
                    <Text style={styles.foodSafetyBadgeText}>권한 필요</Text>
                  </View>
                </View>
                <Text style={[styles.foodSafetyDesc, { color: theme.textSecondary, lineHeight: 18 }]}>
                  실시간 위치 기준 식중독 지수를 조회하려면 위치 권한 허용이 필요합니다. 아래 버튼을 눌러 권한을 허용해 주세요.
                </Text>
                <TouchableOpacity 
                  style={[styles.permissionButton, { backgroundColor: theme.danger }]}
                  activeOpacity={0.8}
                  onPress={requestLocationAndFetchWeather}
                >
                  <Text style={[styles.permissionButtonText, { color: '#FFFFFF' }]}>위치 권한 허용하기</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View style={[styles.foodSafetyCard, { backgroundColor: weatherInfo.bgColor, borderColor: weatherInfo.color + '25' }]}>
                <View style={styles.foodSafetyHeader}>
                  <View style={styles.foodSafetyTitleRow}>
                    <Ionicons name="shield-checkmark" size={16} color={weatherInfo.color} />
                    <Text style={[styles.foodSafetyTitle, { color: theme.textPrimary }]}>
                      오늘의 식중독 지수{weatherInfo.city ? ` (${weatherInfo.city})` : ''}
                    </Text>
                  </View>
                  <View style={[styles.foodSafetyBadge, { backgroundColor: weatherInfo.color }]}>
                    <Text style={styles.foodSafetyBadgeText}>{weatherInfo.level} {weatherInfo.index}</Text>
                  </View>
                </View>
                <Text style={[styles.foodSafetyDesc, { color: theme.textSecondary }]}>
                  {weatherInfo.description}
                </Text>
                {weatherInfo.temp !== null && weatherInfo.humidity !== null && (
                  <Text style={[styles.weatherConditionText, { color: theme.textTertiary }]}>
                    현재 기온: {weatherInfo.temp}°C{weatherInfo.isFallback ? ' (평균)' : ''} | 습도: {weatherInfo.humidity}%{weatherInfo.isFallback ? ' (평균)' : ''}
                  </Text>
                )}
                <View style={[styles.progressBarBg, { backgroundColor: theme.borderLight }]}>
                  <View style={[styles.progressBarFill, { width: `${weatherInfo.index}%`, backgroundColor: weatherInfo.color }]} />
                </View>
              </View>
            )}
          </View>

          {/* 식재료 신선도 요약 */}
          <View style={styles.sectionContainer}>
            <View style={[styles.statsCard, { backgroundColor: theme.surface, borderColor: theme.borderLight, shadowColor: theme.shadow }]}>
              {/* 만료 */}
              <View style={[styles.statsItem, styles.statsItemBorder]}>
                <Text style={styles.statsLabel}>만료 🚨</Text>
                <View style={[styles.statsCountBadge, totalExpired > 0 && { backgroundColor: theme.ddayExpired + '15' }]}>
                  <Text style={[styles.statsCountText, { color: totalExpired > 0 ? theme.ddayExpired : theme.textSecondary }]}>
                    {totalExpired}
                  </Text>
                </View>
              </View>

              {/* 임박 */}
              <View style={[styles.statsItem, styles.statsItemBorder]}>
                <Text style={styles.statsLabel}>임박 ⚠️</Text>
                <View style={[styles.statsCountBadge, totalImminent > 0 && { backgroundColor: theme.ddayImminent + '15' }]}>
                  <Text style={[styles.statsCountText, { color: totalImminent > 0 ? theme.ddayImminent : theme.textSecondary }]}>
                    {totalImminent}
                  </Text>
                </View>
              </View>

              {/* 안전 */}
              <View style={styles.statsItem}>
                <Text style={styles.statsLabel}>안전 🍃</Text>
                <View style={styles.statsCountBadge}>
                  <Text style={[styles.statsCountText, { color: theme.ddaySafe }]}>
                    {totalSafe}
                  </Text>
                </View>
              </View>
            </View>
          </View>

          {/* 유통기한 임박 식재료 (가로 스크롤 카드) */}
          <View style={styles.sectionContainer}>
            <View style={styles.sectionHeaderRow}>
              <Text style={[styles.sectionTitle, { paddingHorizontal: 0, marginBottom: 0, color: theme.textPrimary }]}>빨리 먹어야 해요! ⏰</Text>
              {urgentIngredients.length > 0 && (
                <Text style={[styles.sectionSubText, { color: theme.textTertiary }]}>총 {urgentIngredients.length}개</Text>
              )}
            </View>

            {urgentIngredients.length > 0 ? (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.urgentScrollContainer}
              >
                {urgentIngredients.map(item => {
                  const dday = getDDayInfo(item.expiryDate);
                  const emoji = CATEGORY_EMOJI[item.category] || '📦';
                  const fridge = refrigerators.find(r => r.id === item.fridgeId);
                  const locationLabel = getCompartmentLabel(item.location);

                  return (
                    <TouchableOpacity
                      key={item.id}
                      style={[
                        styles.urgentCard, 
                        { 
                          backgroundColor: theme.surface, 
                          borderColor: theme.borderLight, 
                          shadowColor: theme.shadow,
                          borderTopColor: dday.color
                        }
                      ]}
                      activeOpacity={0.8}
                      onPress={() => onPressCompartment(item.location, locationLabel, item.fridgeId || '')}
                    >
                      <View style={[styles.urgentEmojiBadge, { backgroundColor: theme.surfaceTertiary }]}>
                        <Text style={styles.urgentEmoji}>{emoji}</Text>
                      </View>
                      <Text style={[styles.urgentName, { color: theme.textPrimary }]} numberOfLines={1}>
                        {item.name}
                      </Text>
                      <Text style={[styles.urgentLocation, { color: theme.textMuted }]} numberOfLines={1}>
                        {`${fridge ? fridge.name : '냉장고'} > ${locationLabel}`}
                      </Text>
                      <View style={[styles.urgentDDayBadge, { backgroundColor: dday.color + '12', borderColor: dday.color }]}>
                        <Text style={[styles.urgentDDayText, { color: dday.color }]}>{dday.text}</Text>
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            ) : (
              <View style={[styles.emptyUrgentCard, { backgroundColor: theme.surface, borderColor: theme.borderLight }]}>
                <Ionicons name="sparkles" size={24} color={theme.success} style={{ marginBottom: 4 }} />
                <Text style={[styles.emptyUrgentText, { color: theme.textSecondary }]}>
                  소비가 임박한 식재료가 없습니다.
                </Text>
                <Text style={[styles.emptyUrgentSub, { color: theme.textMuted }]}>
                  모든 식재료가 신선하게 보관되고 있어요! 🍃
                </Text>
              </View>
            )}
          </View>

          {/* 제철 식재료 추천 */}
          <View style={styles.sectionContainer}>
            <View style={styles.sectionHeaderRow}>
              <Text style={[styles.sectionTitle, { paddingHorizontal: 0, marginBottom: 0, color: theme.textPrimary }]}>
                지금 먹으면 가장 맛있는 제철 식재료 🌟
              </Text>
            </View>

            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.urgentScrollContainer}
            >
              {seasonalIngredients.map((item, idx) => (
                <TouchableOpacity
                  key={`seasonal_${idx}`}
                  style={[
                    styles.seasonalCard,
                    {
                      backgroundColor: theme.surface,
                      borderColor: theme.borderLight,
                    }
                  ]}
                  activeOpacity={0.8}
                  onPress={() => handleOpenYoutube(item.searchQuery)}
                >
                  <View style={[styles.urgentEmojiBadge, { backgroundColor: theme.surfaceTertiary, width: 44, height: 44, borderRadius: 15, marginBottom: 8 }]}>
                    <Text style={{ fontSize: 24 }}>{item.emoji}</Text>
                  </View>
                  <Text style={[styles.seasonalTitle, { color: theme.textPrimary }]} numberOfLines={1}>
                    {item.name}
                  </Text>
                  <Text style={[styles.seasonalRecommend, { color: theme.textSecondary }]} numberOfLines={2}>
                    추천: {item.recommendDish}
                  </Text>
                  <View style={[styles.youtubeLinkButton, { backgroundColor: '#FF0000' }]}>
                    <Ionicons name="logo-youtube" size={12} color="#FFFFFF" />
                    <Text style={styles.youtubeLinkText}>영상 보기</Text>
                  </View>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          {/* 알아두면 유용한 식재료 보관 꿀팁! 💡 */}
          <View style={[styles.sectionContainer, { marginBottom: 40 }]}>
            <View style={styles.sectionHeaderRow}>
              <Text style={[styles.sectionTitle, { paddingHorizontal: 0, marginBottom: 0, color: theme.textPrimary }]}>
                장기 보관을 위한 식재료 꿀팁 💡
              </Text>
            </View>

            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.urgentScrollContainer}
            >
              {STORAGE_TIPS.map((item, idx) => (
                <View
                  key={`tip_${idx}`}
                  style={[
                    styles.tipCard,
                    {
                      backgroundColor: theme.surface,
                      borderColor: theme.borderLight,
                      shadowColor: theme.shadow,
                    }
                  ]}
                >
                  <View style={styles.tipCardHeader}>
                    <View style={[styles.urgentEmojiBadge, { backgroundColor: theme.surfaceTertiary, width: 36, height: 36, borderRadius: 11, marginBottom: 0 }]}>
                      <Text style={{ fontSize: 18 }}>{item.emoji}</Text>
                    </View>
                    <View style={styles.tipCardTitleCol}>
                      <Text style={[styles.tipCardName, { color: theme.textPrimary }]}>{item.name}</Text>
                      <Text style={[styles.tipCardCategory, { color: theme.textMuted }]}>{item.category}</Text>
                    </View>
                  </View>
                  <Text style={[styles.tipCardText, { color: theme.textSecondary }]} numberOfLines={3}>
                    {item.tip}
                  </Text>
                </View>
              ))}
            </ScrollView>
          </View>
        </ScrollView>
      )}

      {mode === 'fridge' && (
        <ScrollView
          style={styles.dashboardScrollView}
          contentContainerStyle={[styles.dashboardContent, { paddingBottom: 80 }]}
          showsVerticalScrollIndicator={false}
        >
          {/* 나의 냉장고 보관소 */}
          <View style={[styles.sectionContainer, { marginTop: 10 }]}>
            <Text style={[styles.sectionTitle, { color: theme.textPrimary, marginBottom: 12 }]}>나의 냉장고 보관소 🧊</Text>
            <View style={styles.carouselWrapper}>
              <ScrollView
                horizontal
                pagingEnabled
                showsHorizontalScrollIndicator={false}
                onScroll={handleScroll}
                scrollEventThrottle={16}
                contentContainerStyle={{ alignItems: 'center' }}
              >
                {pages.map((page, index) => {
                  if (page.type === 'add') {
                    return (
                      <View key="add_page" style={[styles.slideContainer, { width: screenWidth }]}>
                        <TouchableOpacity
                          style={[styles.addFridgeBox, { width: screenWidth - 40, backgroundColor: theme.surface, borderColor: theme.primary, shadowColor: theme.shadow }]}
                          activeOpacity={0.8}
                          onPress={onOpenAddSelector}
                        >
                          <View style={[styles.addIconCircle, { backgroundColor: theme.primaryLight }]}>
                            <Text style={[styles.addIconText, { color: theme.primary }]}>+</Text>
                          </View>
                          <Text style={[styles.addFridgeTitle, { color: theme.textPrimary }]}>냉장고 추가</Text>
                          <Text style={[styles.addFridgeDesc, { color: theme.textMuted }]}>새로운 냉장고 타입을 설정하고 관리를 시작하세요 (최대 3대)</Text>
                        </TouchableOpacity>
                      </View>
                    );
                  }

                  const fridge = page.data;
                  return (
                    <View key={fridge.id} style={[styles.slideContainer, { width: screenWidth }]}>
                      <View style={[styles.fridgeCard, { width: screenWidth - 40, backgroundColor: theme.surface, borderColor: theme.glassBorder }]}>
                        <View style={styles.fridgeNameContainer}>
                          <Text style={[styles.fridgeNameTitle, { color: theme.textPrimary }]}>{fridge.name}</Text>
                          <TouchableOpacity
                            style={[styles.pencilIconButton, { backgroundColor: theme.primaryLight }]}
                            activeOpacity={0.7}
                            onPress={onOpenRenameModal}
                          >
                            <Ionicons name="pencil-sharp" size={14} color={theme.primaryText} />
                          </TouchableOpacity>
                        </View>
                        {fridge.type === 'four-door' && renderFourDoor(fridge.id)}
                        {fridge.type === 'side-by-side' && renderSideBySide(fridge.id)}
                        {fridge.type === 'two-door' && renderTwoDoor(fridge.id)}
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
        </ScrollView>
      )}

      {mode === 'ingredients' && (
        <View style={{ flex: 1 }}>
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

          {/* 필터 칩 바 */}
          <View style={styles.filterContainer}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingHorizontal: 20 }}>
              <TouchableOpacity
                style={[styles.filterChip, selectedFilter === 'all' && [styles.filterChipActive, { backgroundColor: theme.primary }]]}
                onPress={() => setSelectedFilter('all')}
              >
                <Text style={[styles.filterChipText, { color: theme.textSecondary }, selectedFilter === 'all' && { color: theme.primaryOnPrimary }]}>
                  전체 {ingredients.length}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.filterChip, selectedFilter === 'expired' && [styles.filterChipActive, { backgroundColor: theme.ddayExpired }]]}
                onPress={() => setSelectedFilter('expired')}
              >
                <Text style={[styles.filterChipText, { color: theme.textSecondary }, selectedFilter === 'expired' && { color: '#FFFFFF' }]}>
                  만료 🚨 {totalExpired}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.filterChip, selectedFilter === 'imminent' && [styles.filterChipActive, { backgroundColor: theme.ddayImminent }]]}
                onPress={() => setSelectedFilter('imminent')}
              >
                <Text style={[styles.filterChipText, { color: theme.textSecondary }, selectedFilter === 'imminent' && { color: '#FFFFFF' }]}>
                  임박 ⚠️ {totalImminent}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.filterChip, selectedFilter === 'safe' && [styles.filterChipActive, { backgroundColor: theme.ddaySafe }]]}
                onPress={() => setSelectedFilter('safe')}
              >
                <Text style={[styles.filterChipText, { color: theme.textSecondary }, selectedFilter === 'safe' && { color: '#FFFFFF' }]}>
                  안전 🍃 {totalSafe}
                </Text>
              </TouchableOpacity>
            </ScrollView>
          </View>

          {/* 식재료 리스트 */}
          {filteredIngredients.length > 0 ? (
            <ScrollView
              style={styles.ingListContainer}
              contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 100, gap: 12 }}
              showsVerticalScrollIndicator={false}
            >
              {filteredIngredients.map(item => {
                const dday = getDDayInfo(item.expiryDate);
                const emoji = CATEGORY_EMOJI[item.category] || '📦';
                const fridge = refrigerators.find(r => r.id === item.fridgeId);
                const locationLabel = getCompartmentLabel(item.location);

                return (
                  <TouchableOpacity
                    key={item.id}
                    style={[styles.ingCard, { backgroundColor: theme.surface, borderColor: theme.borderLight }]}
                    activeOpacity={0.8}
                    onPress={() => onPressCompartment(item.location, locationLabel, item.fridgeId || '')}
                  >
                    <View style={styles.ingCardLeft}>
                      <View style={[styles.ingCardEmojiBg, { backgroundColor: theme.surfaceTertiary }]}>
                        <Text style={{ fontSize: 22 }}>{emoji}</Text>
                      </View>
                      <View style={styles.ingCardInfo}>
                        <Text style={[styles.ingCardName, { color: theme.textPrimary }]} numberOfLines={1}>
                          {item.name}
                        </Text>
                        <Text style={[styles.ingCardLoc, { color: theme.textMuted }]}>
                          {`${fridge ? fridge.name : '냉장고'} > ${locationLabel}`}
                        </Text>
                        <Text style={[styles.ingCardQty, { color: theme.textSecondary }]}>
                          수량: {item.quantity} {item.unit}
                        </Text>
                      </View>
                    </View>
                    <View style={styles.ingCardRight}>
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
                {searchQuery.trim() ? '검색 결과와 일치하는 식재료가 없습니다.' : '등록된 식재료가 없습니다.'}
              </Text>
              <Text style={{ color: theme.textMuted, fontSize: 12, marginTop: 4 }}>
                {searchQuery.trim() ? '다른 키워드로 검색해 보세요!' : '보관소에서 식재료를 추가해 보세요! 📦'}
              </Text>
            </View>
          )}
        </View>
      )}
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
    height: 60,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginTop: 6,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerLogoText: {
    fontSize: 22,
    fontWeight: '900',
    letterSpacing: 0.5,
    fontFamily: Platform.select({
      ios: 'System',
      android: 'sans-serif-black',
    }),
  },
  headerRight: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  headerBadgeText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: 'bold',
  },
  dashboardScrollView: {
    flex: 1,
  },
  dashboardContent: {
    paddingTop: 20,
    paddingBottom: 110, // 충분히 여유를 둬서 하단 탭바에 안가려지게 함
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
  statsCard: {
    flexDirection: 'row',
    borderRadius: 20,
    paddingVertical: 16,
    borderWidth: 1,
    marginHorizontal: 20,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 10,
    elevation: 2,
  },
  statsItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  statsItemBorder: {
    borderRightWidth: 1,
    borderRightColor: '#ECEFF1',
  },
  statsLabel: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#90A4AE',
  },
  statsCountBadge: {
    paddingHorizontal: 10,
    paddingVertical: 2,
    borderRadius: 10,
  },
  statsCountText: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  urgentScrollContainer: {
    paddingHorizontal: 20,
    gap: 12,
    paddingBottom: 8,
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
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
  },
  urgentDDayText: {
    fontSize: 10,
    fontWeight: 'bold',
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
    height: 510,
    width: '100%',
  },
  slideContainer: {
    height: 500,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fridgeNameContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginBottom: 20,
  },
  fridgeNameTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#37474F',
    textAlign: 'center',
  },
  pencilIconButton: {
    padding: 4,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 6,
    backgroundColor: '#ECEFF1',
  },
  fridgeCard: {
    width: '90%',
    height: 465,
    borderRadius: 28,
    borderWidth: 1.5,
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
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
    padding: 8,
    gap: 6,
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
    borderWidth: 1.5,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
    elevation: 3,
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
    height: 6,
    backgroundColor: '#37474F',
  },
  doorLabel: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#37474F',
    marginBottom: 4,
  },
  doorCount: {
    fontSize: 11,
    color: '#757575',
    fontWeight: '600',
    backgroundColor: 'rgba(255, 255, 255, 0.7)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
    overflow: 'hidden',
  },
  handle: {
    position: 'absolute',
    backgroundColor: '#F5F5F5', // 밝은 크롬/알루미늄 색상
    borderRadius: 3,
    borderWidth: 1,
    borderColor: '#B0BEC5', // 메탈릭 외곽선
    shadowColor: '#000000',
    shadowOffset: { width: 1, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
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
    top: 10,
    right: 10,
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
    height: 465,
    backgroundColor: '#FFFFFF',
    borderRadius: 28,
    borderWidth: 2.5,
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.05,
    shadowRadius: 20,
    elevation: 4,
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
    borderRadius: 20,
    borderWidth: 1,
    padding: 16,
    gap: 12,
  },
  foodSafetyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
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
  foodSafetyBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
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
    height: 6,
    borderRadius: 3,
    width: '100%',
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 3,
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
    marginTop: -4,
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
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: '#ECEFF1',
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderRadius: 18,
    borderWidth: 1,
    padding: 14,
  },
  ingCardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
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
    gap: 2,
  },
  ingCardName: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  ingCardLoc: {
    fontSize: 11,
    fontWeight: '600',
  },
  ingCardQty: {
    fontSize: 11,
    fontWeight: '500',
    marginTop: 2,
  },
  ingCardRight: {
    justifyContent: 'center',
    alignItems: 'flex-end',
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
  seasonalCard: {
    width: 140,
    height: 165,
    borderRadius: 18,
    borderWidth: 1,
    padding: 12,
    alignItems: 'center',
    justifyContent: 'space-between',
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
  tipCard: {
    width: 260,
    height: 140,
    borderRadius: 20,
    borderWidth: 1,
    padding: 16,
    justifyContent: 'space-between',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  tipCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  tipCardTitleCol: {
    justifyContent: 'center',
  },
  tipCardName: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  tipCardCategory: {
    fontSize: 10,
    fontWeight: '600',
    marginTop: 1,
  },
  tipCardText: {
    fontSize: 12,
    lineHeight: 18,
    fontWeight: '500',
    marginTop: 8,
  },
});
