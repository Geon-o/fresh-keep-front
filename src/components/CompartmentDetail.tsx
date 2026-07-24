import React, { useState, useEffect, useRef } from 'react';
import { StyleSheet, TouchableOpacity, View, Text, ScrollView, Platform, Alert, TextInput, Modal, ActivityIndicator, PanResponder, Dimensions, Animated, Easing } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import { Ingredient, IngredientCategory, ExpiryType } from '../types';
import { useAuth } from '../context/AuthContext';
import { getFridgeLayout, updateCompartmentShelves } from '../api/fridgeService';
import { addIngredient, updateIngredient, deleteIngredient } from '../api/ingredientService';
import { getCustomUnits, addCustomUnit } from '../api/unitService';
import { serializeMemo, deserializeMemo } from '../utils/memoSerializer';
import { rebuildAllNotifications } from '../utils/ingredientNotifications';
import { useTheme } from '../context/ThemeContext';
import { ThemeColors } from '../theme';

interface CompartmentDetailProps {
  compartmentId: string;
  compartmentLabel: string;
  onBack: () => void;
  fridgeId: string;
  onNavigateCompartment?: (newId: string, newLabel: string) => void;
  onMoveIngredient?: (
    ingredientId: string,
    targetCompartmentId: string,
    targetShelfId: string,
    category: string,
    currentMemo: string,
    name: string,
    quantity: number,
    unit: string,
    expiryDate: string
  ) => Promise<void>;
}

// 특정 칸별 샘플 식재료 데이터 (디자인 테스트용 모의 데이터)
export const SAMPLE_INGREDIENTS: Record<string, Ingredient[]> = {
  fridge_left: [
    { id: '1', name: '서울우유', location: 'fridge_left', subLocation: 'shelf_1', category: 'dairy', expiryDate: '2026-06-11', quantity: 1, unit: '팩' },
    { id: '2', name: '우유식빵', location: 'fridge_left', subLocation: 'shelf_1', category: 'bakery', expiryDate: '2026-06-13', quantity: 1, unit: '봉지' },
    { id: '3', name: '무항생제 계란', location: 'fridge_left', subLocation: 'shelf_2', category: 'dairy', expiryDate: '2026-06-15', quantity: 10, unit: '알' },
    { id: '4', name: '아삭사과', location: 'fridge_left', subLocation: 'shelf_2', category: 'fruit', expiryDate: '2026-06-20', quantity: 3, unit: '개' },
    { id: '5', name: '손질 대파', location: 'fridge_left', subLocation: 'shelf_3', category: 'vegetable', expiryDate: '2026-06-10', quantity: 1, unit: '단' },
    { id: '6', name: '햇양파', location: 'fridge_left', subLocation: 'shelf_3', category: 'vegetable', expiryDate: '2026-06-16', quantity: 4, unit: '개' },
    { id: '7', name: '꿀유자차', location: 'fridge_left', subLocation: 'pocket_1', category: 'sauce', expiryDate: '2026-09-01', quantity: 1, unit: '병' },
    { id: '8', name: '코카콜라', location: 'fridge_left', subLocation: 'pocket_2', category: 'drink', expiryDate: '2026-12-31', quantity: 2, unit: '캔' },
  ],
  fridge_right: [
    { id: '9', name: '슬라이스 치즈', location: 'fridge_right', subLocation: 'shelf_1', category: 'dairy', expiryDate: '2026-07-05', quantity: 1, unit: '팩' },
    { id: '10', name: '양배추', location: 'fridge_right', subLocation: 'shelf_2', category: 'vegetable', expiryDate: '2026-06-14', quantity: 0.5, unit: '개' },
    { id: '11', name: '방울토마토', location: 'fridge_right', subLocation: 'shelf_3', category: 'fruit', expiryDate: '2026-06-12', quantity: 1, unit: '팩' },
    { id: '12', name: '참깨 드레싱', location: 'fridge_right', subLocation: 'pocket_1', category: 'sauce', expiryDate: '2026-08-20', quantity: 1, unit: '개' },
    { id: '13', name: '생수 2L', location: 'fridge_right', subLocation: 'pocket_2', category: 'drink', expiryDate: '2027-01-01', quantity: 6, unit: '병' },
  ],
  freezer_left: [
    { id: '14', name: '구이용 삼겹살', location: 'freezer_left', subLocation: 'shelf_1', category: 'meat', expiryDate: '2026-06-07', quantity: 500, unit: 'g' },
    { id: '15', name: '칵테일 새우', location: 'freezer_left', subLocation: 'shelf_2', category: 'seafood', expiryDate: '2026-08-30', quantity: 1, unit: '팩' },
    { id: '16', name: '다진 마늘', location: 'freezer_left', subLocation: 'shelf_3', category: 'sauce', expiryDate: '2026-09-15', quantity: 1, unit: '팩' },
    { id: '17', name: '냉동 블루베리', location: 'freezer_left', subLocation: 'pocket_1', category: 'frozen', expiryDate: '2026-12-10', quantity: 1, unit: '봉지' },
  ],
  freezer_right: [
    { id: '18', name: '고기 왕만두', location: 'freezer_right', subLocation: 'shelf_1', category: 'frozen', expiryDate: '2026-10-25', quantity: 1, unit: '봉지' },
    { id: '19', name: '냉동 피자', location: 'freezer_right', subLocation: 'shelf_2', category: 'frozen', expiryDate: '2026-08-15', quantity: 1, unit: '개' },
  ],
  fridge: [
    { id: 'f1', name: '서울우유', location: 'fridge', subLocation: 'shelf_1', category: 'dairy', expiryDate: '2026-06-11', quantity: 1, unit: '팩' },
    { id: 'f2', name: '우유식빵', location: 'fridge', subLocation: 'shelf_1', category: 'bakery', expiryDate: '2026-06-13', quantity: 1, unit: '봉지' },
    { id: 'f3', name: '아삭사과', location: 'fridge', subLocation: 'shelf_2', category: 'fruit', expiryDate: '2026-06-20', quantity: 3, unit: '개' },
    { id: 'f4', name: '슬라이스 치즈', location: 'fridge', subLocation: 'pocket_1', category: 'dairy', expiryDate: '2026-07-05', quantity: 1, unit: '팩' },
  ],
  freezer: [
    { id: 'z1', name: '구이용 삼겹살', location: 'freezer', subLocation: 'shelf_1', category: 'meat', expiryDate: '2026-06-07', quantity: 500, unit: 'g' },
    { id: 'z2', name: '고기 왕만두', location: 'freezer', subLocation: 'shelf_2', category: 'frozen', expiryDate: '2026-10-25', quantity: 1, unit: '봉지' },
  ]
};

export const CATEGORY_EMOJI: Record<IngredientCategory, string> = {
  meat: '🥩',
  vegetable: '🥬',
  fruit: '🍎',
  dairy: '🥛',
  seafood: '🐟',
  sauce: '🍯',
  bakery: '🍞',
  drink: '🥤',
  frozen: '❄️',
  etc: '',
};

const CATEGORIES: { key: IngredientCategory; label: string; emoji: string }[] = [
  { key: 'vegetable', label: '채소', emoji: '🥬' },
  { key: 'meat', label: '육류', emoji: '🥩' },
  { key: 'seafood', label: '해물', emoji: '🐟' },
  { key: 'dairy', label: '유제품', emoji: '🥛' },
  { key: 'fruit', label: '과일', emoji: '🍎' },
  { key: 'frozen', label: '냉동식품', emoji: '❄️' },
  { key: 'bakery', label: '빵류', emoji: '🍞' },
  { key: 'drink', label: '음료', emoji: '🥤' },
  { key: 'sauce', label: '소스/조미료', emoji: '🍯' },
  { key: 'etc', label: '기타', emoji: '' },
];

const DEFAULT_UNITS = ['개', '팩', 'g', 'ml', '봉지'];

const EXPIRY_TYPE_LABELS: Record<ExpiryType, string> = {
  SELL_BY: '유통기한',
  USE_BY: '소비기한',
};

const DEFAULT_INSIDE_SHELVES = [
  { id: 'shelf_1', label: '선반 1단' },
  { id: 'shelf_2', label: '선반 2단' },
  { id: 'shelf_3', label: '선반 3단' },
];

const DEFAULT_DOOR_SHELVES = [
  { id: 'pocket_1', label: '선반 1단' },
  { id: 'pocket_2', label: '선반 2단' },
];

interface DraggableBadgeProps {
  item: Ingredient;
  shelfId: string;
  draggingItem: Ingredient | null;
  setDraggingItem: (item: Ingredient | null) => void;
  dragPosition: Animated.ValueXY;
  setDragCurrentCoords: (coords: { x: number; y: number }) => void;
  setScrollEnabled: (enabled: boolean) => void;
  setActiveHoverShelfId: (id: string | null) => void;
  compartmentId: string;
  onNavigateCompartment?: (newId: string, newLabel: string) => void;
  onPressItem: (item: Ingredient) => void;
  measureShelves: () => void;
  shelfLayouts: React.MutableRefObject<Record<string, { x: number; y: number; width: number; height: number }>>;
  lastSwappedTime: React.MutableRefObject<number>;
  screenWidth: number;
  theme: ThemeColors;
  styles: any;
  handleDropIngredient: (item: Ingredient, dropX: number, dropY: number, targetCompartmentId: string) => Promise<void>;
  getFourDoorSwitchTarget: (compId: string) => { id: string; label: string } | null;
  getDDayInfo: (expiryDate: string) => { text: string; color: string };
}

const DraggableBadge = ({
  item,
  shelfId,
  draggingItem,
  setDraggingItem,
  dragPosition,
  setDragCurrentCoords,
  setScrollEnabled,
  setActiveHoverShelfId,
  compartmentId,
  onNavigateCompartment,
  onPressItem,
  measureShelves,
  shelfLayouts,
  lastSwappedTime,
  screenWidth,
  theme,
  styles,
  handleDropIngredient,
  getFourDoorSwitchTarget,
  getDDayInfo,
}: DraggableBadgeProps) => {
  const dDay = getDDayInfo(item.expiryDate);
  const emoji = CATEGORY_EMOJI[item.category] || '';
  const isDraggingThis = draggingItem !== null && draggingItem.id === item.id;

  const longPressTimer = useRef<any>(null);
  const isDraggingActive = useRef(false);
  const touchStartPos = useRef({ x: 0, y: 0 });

  // Stale Closure 방지를 위해 최신 Props를 Ref에 항시 동기화
  const latestProps = useRef({
    item,
    shelfId,
    draggingItem,
    setDraggingItem,
    dragPosition,
    setDragCurrentCoords,
    setScrollEnabled,
    setActiveHoverShelfId,
    compartmentId,
    onNavigateCompartment,
    onPressItem,
    measureShelves,
    shelfLayouts,
    lastSwappedTime,
    screenWidth,
    handleDropIngredient,
    getFourDoorSwitchTarget,
  });

  useEffect(() => {
    latestProps.current = {
      item,
      shelfId,
      draggingItem,
      setDraggingItem,
      dragPosition,
      setDragCurrentCoords,
      setScrollEnabled,
      setActiveHoverShelfId,
      compartmentId,
      onNavigateCompartment,
      onPressItem,
      measureShelves,
      shelfLayouts,
      lastSwappedTime,
      screenWidth,
      handleDropIngredient,
      getFourDoorSwitchTarget,
    };
  }); // 매 렌더링마다 최신 값 동기화

  const badgePanResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (evt, gestureState) => {
        const startX = evt.nativeEvent.pageX;
        const startY = evt.nativeEvent.pageY;
        touchStartPos.current = { x: startX, y: startY };
        isDraggingActive.current = false;

        // 0.7초 롱프레스 타이머 가동
        longPressTimer.current = setTimeout(async () => {
          isDraggingActive.current = true;
          try {
            await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          } catch (e) {}
          
          const props = latestProps.current;
          props.setScrollEnabled(false); // 스크롤 차단
          props.setDraggingItem(props.item);
          props.dragPosition.setValue({ x: startX - 70, y: startY - 50 });
          props.setDragCurrentCoords({ x: startX, y: startY });
          props.measureShelves(); // 선반 좌표 수집
        }, 700);
      },
      onPanResponderMove: (evt, gestureState) => {
        const currentX = evt.nativeEvent.pageX;
        const currentY = evt.nativeEvent.pageY;
        const props = latestProps.current;

        if (!isDraggingActive.current) {
          // 움직임 거리가 클 경우 단순 스크롤로 간주하고 타이머 취소
          const dx = Math.abs(currentX - touchStartPos.current.x);
          const dy = Math.abs(currentY - touchStartPos.current.y);
          if (dx > 8 || dy > 8) {
            if (longPressTimer.current) {
              clearTimeout(longPressTimer.current);
            }
          }
        } else {
          // 드래그 중인 경우
          props.dragPosition.setValue({ x: currentX - 70, y: currentY - 50 });
          props.setDragCurrentCoords({ x: currentX, y: currentY });

          // 호버 선반 추적
          let hoverShelfId: string | null = null;
          Object.keys(props.shelfLayouts.current).forEach(sId => {
            const layout = props.shelfLayouts.current[sId];
            if (layout) {
              const inX = currentX >= layout.x && currentX <= layout.x + layout.width;
              const inY = currentY >= layout.y && currentY <= layout.y + layout.height;
              if (inX && inY) {
                hoverShelfId = sId;
              }
            }
          });
          props.setActiveHoverShelfId(hoverShelfId);

          // 4문형 경계선 전환 검사
          const switchTarget = props.getFourDoorSwitchTarget(props.compartmentId);
          if (switchTarget && props.onNavigateCompartment) {
            const now = Date.now();
            if (now - props.lastSwappedTime.current > 1500) {
              const isRightSide = props.compartmentId.includes('right');
              const isLeftSide = props.compartmentId.includes('left');

              if (isRightSide && currentX < 35) {
                props.lastSwappedTime.current = now;
                props.onNavigateCompartment(switchTarget.id, switchTarget.label);
                setTimeout(() => {
                  props.measureShelves();
                }, 150);
              }
              else if (isLeftSide && currentX > props.screenWidth - 35) {
                props.lastSwappedTime.current = now;
                props.onNavigateCompartment(switchTarget.id, switchTarget.label);
                setTimeout(() => {
                  props.measureShelves();
                }, 150);
              }
            }
          }
        }
      },
      onPanResponderRelease: (evt, gestureState) => {
        if (longPressTimer.current) {
          clearTimeout(longPressTimer.current);
        }
        const props = latestProps.current;
        
        if (!isDraggingActive.current) {
          // 타이머 만료 전 손 뗌 -> 단순 탭 (수정 모달 바로 오픈)
          props.setScrollEnabled(true);
          props.onPressItem(props.item);
        }
        isDraggingActive.current = false;
      },
      onPanResponderTerminate: () => {
        if (longPressTimer.current) {
          clearTimeout(longPressTimer.current);
        }
        const props = latestProps.current;
        if (!isDraggingActive.current) {
          props.setScrollEnabled(true);
          props.setDraggingItem(null);
          props.setActiveHoverShelfId(null);
        }
        isDraggingActive.current = false;
      }
    })
  ).current;

  return (
    <View
      {...badgePanResponder.panHandlers}
      style={[
        styles.itemBadge,
        { borderLeftWidth: 3.5, borderLeftColor: dDay.color, paddingLeft: 8 },
        isDraggingThis && { opacity: 0.15 }
      ]}
    >
      <Text style={styles.itemText} numberOfLines={1}>
        {emoji ? `${emoji} ` : ''}{item.name}
      </Text>
      <Text style={styles.itemQuantity} numberOfLines={1}>
        {item.quantity}{item.unit}
      </Text>
      <View style={[styles.dDayBadge, { backgroundColor: dDay.color + '15', borderColor: dDay.color }]}>
        <Text style={[styles.dDayBadgeText, { color: dDay.color }]}>
          {dDay.text}
        </Text>
      </View>
    </View>
  );
};

export default function CompartmentDetail({ 
  compartmentId, 
  compartmentLabel, 
  onBack, 
  fridgeId,
  onNavigateCompartment,
  onMoveIngredient
}: CompartmentDetailProps) {
  const { isLoggedIn } = useAuth();
  const [serverCompartmentId, setServerCompartmentId] = useState<number | null>(null);
  const { theme, isDark } = useTheme();
  const styles = React.useMemo(() => createStyles(theme, isDark), [theme, isDark]);

  // 부모의 비동기 리렌더링 props 딜레이를 우회하기 위한 로컬 compartmentId 동기 레퍼런스
  const currentCompartmentIdRef = useRef(compartmentId);

  // 드래그 앤 드롭 제스처 관련 상태
  const [draggingItem, setDraggingItem] = useState<Ingredient | null>(null);
  const dragPosition = useRef(new Animated.ValueXY({ x: 0, y: 0 })).current;
  const [dragCurrentCoords, setDragCurrentCoords] = useState<{ x: number, y: number }>({ x: 0, y: 0 });

  // 구획 전환 시 페이드 및 슬라이드 인 애니메이션 제어용 상태
  const contentOpacity = useRef(new Animated.Value(1)).current;
  const contentTranslateX = useRef(new Animated.Value(0)).current;
  const transitionDirection = useRef<'left' | 'right' | 'up' | 'down' | null>(null);
  
  // 드래그 중이 아닐 때만 프로퍼티의 변경을 레퍼런스에 반영 (드래그 전환 도중 이전 프로퍼티 덮어쓰기 완전 차단)
  if (draggingItem === null) {
    currentCompartmentIdRef.current = compartmentId;
  }
  const [scrollEnabled, setScrollEnabled] = useState(true);
  const [activeHoverShelfId, setActiveHoverShelfId] = useState<string | null>(null);
  
  const shelfRefs = useRef<Record<string, View | null>>({});
  const shelfLayouts = useRef<Record<string, { x: number; y: number; width: number; height: number }>>({});
  const lastSwappedTime = useRef<number>(0);
  const screenWidth = Dimensions.get('window').width;
  const screenHeight = Dimensions.get('window').height;

  // 사이드 버튼을 통한 이동 처리 핸들러
  const handleNavigateSide = (targetId: string, targetLabel: string, direction: 'left' | 'right' | 'up' | 'down') => {
    if (!onNavigateCompartment) return;
    
    // 전환 방향 기록 및 애니메이션 트리거 준비
    transitionDirection.current = direction;
    currentCompartmentIdRef.current = targetId;
    
    onNavigateCompartment(targetId, targetLabel);
  };

  // 현재 compartmentId 기준 내비게이션 대상 매핑 헬퍼
  const getNavigationTargets = () => {
    const isFourDoor = compartmentId.includes('_left') || compartmentId.includes('_right');
    
    if (isFourDoor) {
      // 4문형 냉장고인 경우 (상/하/좌/우)
      if (compartmentId === 'fridge_left') {
        return {
          right: { id: 'fridge_right', label: '냉장실 (우)' },
          down: { id: 'freezer_left', label: '냉동실 (좌)' },
        };
      }
      if (compartmentId === 'fridge_right') {
        return {
          left: { id: 'fridge_left', label: '냉장실 (좌)' },
          down: { id: 'freezer_right', label: '냉동실 (우)' },
        };
      }
      if (compartmentId === 'freezer_left') {
        return {
          right: { id: 'freezer_right', label: '냉동실 (우)' },
          up: { id: 'fridge_left', label: '냉장실 (좌)' },
        };
      }
      if (compartmentId === 'freezer_right') {
        return {
          left: { id: 'freezer_left', label: '냉동실 (좌)' },
          up: { id: 'fridge_right', label: '냉장실 (우)' },
        };
      }
    } else {
      // 2문형 / 양문형 냉장고인 경우 (상/하만 지원)
      if (compartmentId === 'fridge') {
        return {
          down: { id: 'freezer', label: '냉동실' },
        };
      }
      if (compartmentId === 'freezer') {
        return {
          up: { id: 'fridge', label: '냉장실' },
        };
      }
    }
    return {};
  };

  // 드래그 완료 처리 (드롭)
  const handleDropIngredient = async (item: Ingredient, dropX: number, dropY: number, targetCompartmentId: string) => {
    console.log('[handleDropIngredient] Called:', {
      itemName: item.name,
      originalLocation: item.location,
      originalSubLocation: item.subLocation,
      dropX,
      dropY,
      targetCompartmentId,
      currentPropsCompartmentId: compartmentId
    });
    let droppedShelfId: string | null = null;
    
    // 선반 좌표 매칭 루프
    Object.keys(shelfLayouts.current).forEach(shelfId => {
      const layout = shelfLayouts.current[shelfId];
      if (layout) {
        const inX = dropX >= layout.x && dropX <= layout.x + layout.width;
        const inY = dropY >= layout.y && dropY <= layout.y + layout.height;
        if (inX && inY) {
          droppedShelfId = shelfId;
        }
      }
    });

    if (droppedShelfId && onMoveIngredient) {
      const targetShelf = droppedShelfId;
      // 1. 화면 즉시 반영 (낙관적 업데이트)
      setIngredients(prev => prev.map(ing => 
        ing.id === item.id 
          ? { ...ing, location: targetCompartmentId, subLocation: targetShelf as any } 
          : ing
      ));
      
      // 2. 부모 콜백 호출 (서버/로컬 저장소 저장)
      try {
        await onMoveIngredient(
          item.id,
          targetCompartmentId,
          targetShelf,
          item.category,
          item.memo || '',
          item.name,
          item.quantity,
          item.unit,
          item.expiryDate
        );
        // 이동 성공 후 현재 보관실 식재료 목록 리로드하여 화면 싱크 맞춤
        await loadData(targetCompartmentId);
      } catch (error) {
        console.error('Failed to move ingredient:', error);
        Alert.alert('이동 실패 ⚠️', '식재료 위치를 변경하는 중 오류가 발생했습니다.');
      }
    }
    
    setDraggingItem(null);
  };

  const latestParentProps = useRef({
    draggingItem,
    compartmentId: currentCompartmentIdRef.current,
    handleDropIngredient,
  });

  // 매 렌더링 시 동기적으로 최신 값 갱신 (useEffect에 의한 제스처 비동기 갱신 딜레이 해결)
  latestParentProps.current = {
    draggingItem,
    compartmentId: currentCompartmentIdRef.current,
    handleDropIngredient,
  };

  // 부모 루트용 PanResponder (드래그 활성화 시 제스처 캡처 및 좌표 갱신 담당)
  const parentPanResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onStartShouldSetPanResponderCapture: () => false,
      onMoveShouldSetPanResponder: () => latestParentProps.current.draggingItem !== null,
      onMoveShouldSetPanResponderCapture: () => latestParentProps.current.draggingItem !== null,
      onPanResponderMove: (evt, gestureState) => {
        const props = latestParentProps.current;
        if (!props.draggingItem) return;
        const currentX = evt.nativeEvent.pageX;
        const currentY = evt.nativeEvent.pageY;

        // 드래그 위치 업데이트
        dragPosition.setValue({ x: currentX - 70, y: currentY - 50 });
        setDragCurrentCoords({ x: currentX, y: currentY });

        // 호버 선반 추적
        let hoverShelfId: string | null = null;
        Object.keys(shelfLayouts.current).forEach(sId => {
          const layout = shelfLayouts.current[sId];
          if (layout) {
            const inX = currentX >= layout.x && currentX <= layout.x + layout.width;
            const inY = currentY >= layout.y && currentY <= layout.y + layout.height;
            if (inX && inY) {
              hoverShelfId = sId;
            }
          }
        });
        setActiveHoverShelfId(hoverShelfId);

        // 4문형 경계선 전환 검사
        const switchTarget = getFourDoorSwitchTarget(props.compartmentId);
        if (switchTarget && onNavigateCompartment) {
          const now = Date.now();
          if (now - lastSwappedTime.current > 1500) {
            const isRightSide = props.compartmentId.includes('right');
            const isLeftSide = props.compartmentId.includes('left');

            if (isRightSide && currentX < 35) {
              lastSwappedTime.current = now;
              transitionDirection.current = 'left'; // 우 -> 좌 전환 방향 기록
              currentCompartmentIdRef.current = switchTarget.id;
              latestParentProps.current.compartmentId = switchTarget.id;
              onNavigateCompartment(switchTarget.id, switchTarget.label);
              setTimeout(() => { measureShelves(); }, 150);
            }
            else if (isLeftSide && currentX > screenWidth - 35) {
              lastSwappedTime.current = now;
              transitionDirection.current = 'right'; // 좌 -> 우 전환 방향 기록
              currentCompartmentIdRef.current = switchTarget.id;
              latestParentProps.current.compartmentId = switchTarget.id;
              onNavigateCompartment(switchTarget.id, switchTarget.label);
              setTimeout(() => { measureShelves(); }, 150);
            }
          }
        }
      },
      onPanResponderRelease: (evt, gestureState) => {
        const props = latestParentProps.current;
        if (!props.draggingItem) return;
        setScrollEnabled(true);
        props.handleDropIngredient(props.draggingItem, evt.nativeEvent.pageX, evt.nativeEvent.pageY, props.compartmentId);
        setActiveHoverShelfId(null);
      },
      onPanResponderTerminate: () => {
        setScrollEnabled(true);
        setDraggingItem(null);
        setActiveHoverShelfId(null);
      }
    })
  ).current;

  // 4문형 냉장고의 좌/우 칸 전환 매핑 헬퍼
  const getFourDoorSwitchTarget = (compId: string): { id: string; label: string } | null => {
    if (compId === 'fridge_left') return { id: 'fridge_right', label: '냉장실 (우)' };
    if (compId === 'fridge_right') return { id: 'fridge_left', label: '냉장실 (좌)' };
    if (compId === 'freezer_left') return { id: 'freezer_right', label: '냉동실 (좌)' };
    if (compId === 'freezer_right') return { id: 'freezer_left', label: '냉동실 (우)' };
    return null;
  };

  // 선반 절대 좌표 측정
  const measureShelves = () => {
    shelfLayouts.current = {}; // 이전 좌표 데이터 초기화 (오염 방지)
    Object.keys(shelfRefs.current).forEach(shelfId => {
      const ref = shelfRefs.current[shelfId];
      if (ref) {
        ref.measureInWindow((x, y, width, height) => {
          shelfLayouts.current[shelfId] = { x, y, width, height };
        });
      }
    });
  };



  // 선반 동적 배열 상태 관리 (초기값은 비워두고 useEffect에서 로드)
  const [insideShelves, setInsideShelves] = useState<{ id: string; label: string }[]>([]);
  const [doorShelves, setDoorShelves] = useState<{ id: string; label: string }[]>([]);

  // 해당 칸 식재료 상태 관리 (초기값은 비워두고 useEffect에서 로드)
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);

  // 문쪽 보관실 사용 여부 상태 관리
  const [hasDoorStorage, setHasDoorStorage] = useState(true);

  // 로딩 상태 관리 (Flicker/레이아웃 시프트 방지)
  const [isLoading, setIsLoading] = useState(true);

  // 모달 제어 관련 상태
  const [modalVisible, setModalVisible] = useState(false);
  const [modalMode, setModalMode] = useState<'add' | 'edit'>('add');
  const [selectedShelfId, setSelectedShelfId] = useState<string>('');
  const [selectedIngredientId, setSelectedIngredientId] = useState<string | null>(null);

  // 안쪽 보관실 선반 아코디언 펼침 상태 (여러 선반 동시 펼침 가능)
  const [expandedShelfIds, setExpandedShelfIds] = useState<Set<string>>(new Set());

  // 문쪽 보관실 하단 탭 + 위로 펼쳐지는 드로어 상태
  const [doorDrawerOpen, setDoorDrawerOpen] = useState(false);
  const doorDrawerAnim = useRef(new Animated.Value(0)).current; // 0: 닫힘, 1: 열림
  const DOOR_BOTTOM_TAB_HEIGHT = 38;
  const DOOR_DRAWER_HEIGHT = Math.min(screenHeight * 0.6, 480);

  // 식재료 폼 상태
  const [formName, setFormName] = useState('');
  const [formCategory, setFormCategory] = useState<IngredientCategory>('etc');
  const [formQuantity, setFormQuantity] = useState(1);
  const [formUnit, setFormUnit] = useState('개');
  const [formExpiryDate, setFormExpiryDate] = useState('');
  const [formExpiryType, setFormExpiryType] = useState<ExpiryType>('SELL_BY');
  const [formMemo, setFormMemo] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const isSavingRef = useRef(false);

  // 카테고리/단위/기한 종류 콤보박스 상태
  const [categoryDropdownOpen, setCategoryDropdownOpen] = useState(false);
  const [unitDropdownOpen, setUnitDropdownOpen] = useState(false);
  const [unitCustomInputOpen, setUnitCustomInputOpen] = useState(false);
  const [unitCustomInputValue, setUnitCustomInputValue] = useState('');
  const [customUnits, setCustomUnits] = useState<string[]>([]);
  const [expiryTypeDropdownOpen, setExpiryTypeDropdownOpen] = useState(false);
  const unitOptions = Array.from(new Set([...DEFAULT_UNITS, ...customUnits]));

  // 로그인 여부에 따라 커스텀 단위 목록을 서버/로컬에서 불러옴
  useEffect(() => {
    const loadUnits = async () => {
      try {
        if (isLoggedIn) {
          const units = await getCustomUnits();
          setCustomUnits(units);
        } else {
          const stored = await AsyncStorage.getItem('@custom_units');
          setCustomUnits(stored ? JSON.parse(stored) : []);
        }
      } catch (e) {
        console.error('Failed to load custom units', e);
      }
    };
    loadUnits();
  }, [isLoggedIn]);

  const toggleCategoryDropdown = () => {
    setUnitDropdownOpen(false);
    setUnitCustomInputOpen(false);
    setExpiryTypeDropdownOpen(false);
    setCategoryDropdownOpen(prev => !prev);
  };

  const toggleUnitDropdown = () => {
    setCategoryDropdownOpen(false);
    setExpiryTypeDropdownOpen(false);
    setUnitDropdownOpen(prev => !prev);
  };

  const toggleExpiryTypeDropdown = () => {
    setCategoryDropdownOpen(false);
    setUnitDropdownOpen(false);
    setUnitCustomInputOpen(false);
    setExpiryTypeDropdownOpen(prev => !prev);
  };

  // 사용자가 직접 입력한 단위를 목록에 추가하고 선택 상태로 반영
  const handleAddCustomUnit = async () => {
    const trimmed = unitCustomInputValue.trim();
    if (!trimmed) return;

    try {
      if (isLoggedIn) {
        const units = await addCustomUnit(trimmed);
        setCustomUnits(units);
      } else {
        setCustomUnits(prev => {
          const next = prev.includes(trimmed) ? prev : [...prev, trimmed];
          AsyncStorage.setItem('@custom_units', JSON.stringify(next));
          return next;
        });
      }
    } catch (e) {
      console.error('Failed to add custom unit', e);
    }

    setFormUnit(trimmed);
    setUnitCustomInputValue('');
    setUnitCustomInputOpen(false);
    setUnitDropdownOpen(false);
  };

  // 선반 구성 및 식재료 불러오기 (서버 vs 로컬 분기)
  const loadData = async (targetId: string = compartmentId) => {
    // 최초 진입 시(선반 정보가 비어있을 때)에만 전체 로딩 화면을 띄워 Flicker 방지
    const isInitial = insideShelves.length === 0 && doorShelves.length === 0;
    if (isInitial) {
      setIsLoading(true);
    }
    try {
      // 1. 선반 구성 불러오기 (비로그인 모드일 때만 로컬스토리지 활용)
      if (!isLoggedIn) {
        const configStr = await AsyncStorage.getItem(`@shelf_config_${fridgeId}_${targetId}`);
        if (configStr) {
          const config = JSON.parse(configStr);
          setInsideShelves(config.insideShelves || DEFAULT_INSIDE_SHELVES);
          setDoorShelves(config.doorShelves || DEFAULT_DOOR_SHELVES);
          setHasDoorStorage(config.hasDoorStorage !== undefined ? config.hasDoorStorage : true);
        } else {
          setInsideShelves(DEFAULT_INSIDE_SHELVES);
          setDoorShelves(DEFAULT_DOOR_SHELVES);
          setHasDoorStorage(true);
          const config = { insideShelves: DEFAULT_INSIDE_SHELVES, doorShelves: DEFAULT_DOOR_SHELVES, hasDoorStorage: true };
          await AsyncStorage.setItem(`@shelf_config_${fridgeId}_${targetId}`, JSON.stringify(config));
        }
      }

      // 2. 식재료 로드
      if (isLoggedIn) {
        // 서버에서 해당 냉장고 레이아웃 정보 로드 후 매핑
        const layout = await getFridgeLayout(Number(fridgeId));
        
        // targetId 매칭 구획 찾기
        const serverComp = layout.compartments.find(comp => {
          const isLeft = targetId.includes('left');
          const isRight = targetId.includes('right');
          if (targetId.startsWith('freezer')) {
            if (comp.storageType !== 'FROZEN') return false;
          } else {
            if (comp.storageType !== 'REFRIGERATED') return false;
          }
          if (isLeft && !comp.name.includes('좌')) return false;
          if (isRight && !comp.name.includes('우')) return false;
          return true;
        });

        if (serverComp) {
          setServerCompartmentId(serverComp.id);
          
          // 서버에서 저장된 선반 구성 로드
          if (serverComp.insideShelves) {
            try {
              setInsideShelves(JSON.parse(serverComp.insideShelves));
            } catch (e) {
              console.error('Failed to parse insideShelves from server', e);
              setInsideShelves(DEFAULT_INSIDE_SHELVES);
            }
          } else {
            setInsideShelves(DEFAULT_INSIDE_SHELVES);
          }

          if (serverComp.doorShelves) {
            try {
              setDoorShelves(JSON.parse(serverComp.doorShelves));
            } catch (e) {
              console.error('Failed to parse doorShelves from server', e);
              setDoorShelves(DEFAULT_DOOR_SHELVES);
            }
          } else {
            setDoorShelves(DEFAULT_DOOR_SHELVES);
          }

          if (serverComp.hasDoorStorage !== undefined && serverComp.hasDoorStorage !== null) {
            setHasDoorStorage(serverComp.hasDoorStorage);
          } else {
            setHasDoorStorage(true);
          }

          const mapped = serverComp.ingredients.map(ing => {
            const deserialized = deserializeMemo(ing.memo);
            return {
              id: String(ing.id),
              name: ing.name,
              location: targetId,
              subLocation: deserialized.subLocation as any,
              category: deserialized.category,
              expiryDate: ing.expirationDate,
              expiryType: ing.expirationType || 'SELL_BY',
              quantity: ing.quantity,
              unit: ing.unit,
              memo: deserialized.memo || undefined,
              fridgeId: String(fridgeId),
            };
          });
          setIngredients(mapped);
        } else {
          // 매칭 실패 시 기본값 세팅
          setInsideShelves(DEFAULT_INSIDE_SHELVES);
          setDoorShelves(DEFAULT_DOOR_SHELVES);
          setHasDoorStorage(true);
          setIngredients([]);
          if (layout.compartments.length > 0) {
            // 매칭 실패 시 첫 번째 구획 사용
            setServerCompartmentId(layout.compartments[0].id);
          }
        }
      } else {
        // 로컬 로드
        const ingredientsStr = await AsyncStorage.getItem('@ingredients');
        if (ingredientsStr) {
          const allIngredients: Ingredient[] = JSON.parse(ingredientsStr);
          const filtered = allIngredients.filter(item => item.fridgeId === fridgeId && item.location === targetId);
          setIngredients(filtered);
        } else {
          // 로컬 저장소에 데이터 없음 → 빈 상태로 시작
          setIngredients([]);
        }
      }
    } catch (e) {
      console.error('Failed to load data', e);
    } finally {
      const isInitial = insideShelves.length === 0 && doorShelves.length === 0;
      if (isInitial) {
        setIsLoading(false);
      }
      // 데이터 로드가 끝났으므로 부드러운 전환 애니메이션 및 선반 좌표 측정 명시적 실행
      triggerTransitionAnimation();
    }
  };

  useEffect(() => {
    loadData(compartmentId);
  }, [compartmentId, fridgeId, isLoggedIn]);

  // 구획 전환 시 슬라이드 및 페이드 인 애니메이션 연동 실행 함수
  const triggerTransitionAnimation = () => {
    if (transitionDirection.current === 'right') {
      contentTranslateX.setValue(60); // 우측에서 슬라이드인
    } else if (transitionDirection.current === 'left') {
      contentTranslateX.setValue(-60); // 좌측에서 슬라이드인
    } else {
      contentTranslateX.setValue(0);
    }
    contentOpacity.setValue(0);

    Animated.parallel([
      Animated.timing(contentOpacity, {
        toValue: 1,
        duration: 250,
        useNativeDriver: true,
      }),
      Animated.timing(contentTranslateX, {
        toValue: 0,
        duration: 250,
        useNativeDriver: true,
      }),
    ]).start(() => {
      transitionDirection.current = null;
    });

    // 레이아웃 배치가 끝난 시점에 맞추어 선반 좌표 실시간 측정
    setTimeout(() => {
      measureShelves();
    }, 100);
  };

  // 선반 구성 저장 헬퍼
  const saveShelfConfig = async (
    inside: typeof insideShelves,
    door: typeof doorShelves,
    hasDoor: boolean
  ) => {
    try {
      if (isLoggedIn && serverCompartmentId !== null) {
        await updateCompartmentShelves(Number(fridgeId), serverCompartmentId, inside, door, hasDoor);
      } else {
        const config = { insideShelves: inside, doorShelves: door, hasDoorStorage: hasDoor };
        await AsyncStorage.setItem(`@shelf_config_${fridgeId}_${compartmentId}`, JSON.stringify(config));
      }
    } catch (e) {
      console.error('Failed to save shelf config', e);
    }
  };

  // 식재료 저장 헬퍼
  const saveIngredients = async (currentIngredients: Ingredient[]) => {
    try {
      const ingredientsStr = await AsyncStorage.getItem('@ingredients');
      let allIngredients: Ingredient[] = [];
      if (ingredientsStr) {
        allIngredients = JSON.parse(ingredientsStr);
      }
      
      // 현재 compartmentId 및 fridgeId의 식재료만 필터링하여 제거 후 업데이트
      allIngredients = allIngredients.filter(item => !(item.fridgeId === fridgeId && item.location === compartmentId));
      allIngredients = [...allIngredients, ...currentIngredients];
      
      await AsyncStorage.setItem('@ingredients', JSON.stringify(allIngredients));
      rebuildAllNotifications(allIngredients);
    } catch (e) {
      console.error('Failed to save ingredients', e);
    }
  };

  // 추가/수정 모달 닫기
  const handleCloseAddEditModal = () => {
    setModalVisible(false);
    setCategoryDropdownOpen(false);
    setUnitDropdownOpen(false);
    setUnitCustomInputOpen(false);
    setExpiryTypeDropdownOpen(false);
  };

  // 선반 아코디언 펼침/접힘 토글 (여러 선반 동시 펼침 가능)
  const toggleShelfExpanded = (shelfId: string) => {
    setExpandedShelfIds(prev => {
      const next = new Set(prev);
      if (next.has(shelfId)) {
        next.delete(shelfId);
      } else {
        next.add(shelfId);
      }
      return next;
    });
  };

  // 문쪽 보관실 드로어 열기/닫기 (애니메이션 완료 후 드래그앤드롭용 좌표 재측정)
  const openDoorDrawer = () => {
    setDoorDrawerOpen(true);
    Animated.timing(doorDrawerAnim, {
      toValue: 1,
      duration: 320,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start(() => {
      measureShelves();
    });
  };

  const closeDoorDrawer = () => {
    Animated.timing(doorDrawerAnim, {
      toValue: 0,
      duration: 260,
      easing: Easing.in(Easing.cubic),
      useNativeDriver: true,
    }).start(() => {
      setDoorDrawerOpen(false);
      measureShelves();
    });
  };

  // 오늘 날짜 구하는 YYYY-MM-DD 헬퍼
  const getTodayString = () => {
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  };

  // 날짜 연산 헬퍼 (유통기한 퀵 설정용)
  const addDaysToToday = (days: number) => {
    const target = new Date();
    target.setDate(target.getDate() + days);
    const yyyy = target.getFullYear();
    const mm = String(target.getMonth() + 1).padStart(2, '0');
    const dd = String(target.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  };

  // 추가 모달 열기
  const handleOpenAddModal = (shelfId: string) => {
    setModalMode('add');
    setSelectedShelfId(shelfId);
    setSelectedIngredientId(null);
    
    // 폼 초기화
    setFormName('');
    setFormCategory('etc');
    setFormQuantity(1);
    setFormUnit('개');
    setFormExpiryDate(getTodayString());
    setFormExpiryType('SELL_BY');
    setFormMemo('');
    setCategoryDropdownOpen(false);
    setUnitDropdownOpen(false);
    setUnitCustomInputOpen(false);
    setUnitCustomInputValue('');
    setExpiryTypeDropdownOpen(false);

    setModalVisible(true);
  };

  // 수정 모달 열기
  const handleOpenEditModal = (item: Ingredient) => {
    setModalMode('edit');
    setSelectedShelfId(item.subLocation || '');
    setSelectedIngredientId(item.id);

    // 폼 값 세팅
    setFormName(item.name);
    setFormCategory(item.category);
    setFormQuantity(item.quantity);
    setFormUnit(item.unit);
    setFormExpiryDate(item.expiryDate);
    setFormExpiryType(item.expiryType || 'SELL_BY');
    setFormMemo(item.memo || '');
    setCategoryDropdownOpen(false);
    setUnitDropdownOpen(false);
    setUnitCustomInputOpen(false);
    setUnitCustomInputValue('');
    setExpiryTypeDropdownOpen(false);

    setModalVisible(true);
  };

  // 식재료 저장 (추가/수정 공용)
  const handleSaveIngredient = async () => {
    if (isSavingRef.current) return;

    if (!formName.trim()) {
      if (Platform.OS === 'web') {
        window.alert('식재료 이름을 입력해주세요.');
      } else {
        Alert.alert('알림 ⚠️', '식재료 이름을 입력해주세요.');
      }
      return;
    }

    // YYYY-MM-DD 형식 검증
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(formExpiryDate)) {
      if (Platform.OS === 'web') {
        window.alert('날짜 형식을 올바르게 입력해주세요 (YYYY-MM-DD).');
      } else {
        Alert.alert('알림 ⚠️', '날짜 형식을 올바르게 입력해주세요 (YYYY-MM-DD).');
      }
      return;
    }

    isSavingRef.current = true;
    setIsSaving(true);
    try {
      const memoContent = serializeMemo(formCategory, selectedShelfId, formMemo);

    if (isLoggedIn) {
      try {
        if (modalMode === 'add') {
          if (!serverCompartmentId) {
            throw new Error('서버 구획 ID를 로드하지 못했습니다.');
          }
          const savedIng = await addIngredient({
            compartmentId: serverCompartmentId,
            name: formName.trim(),
            quantity: Number(formQuantity),
            unit: formUnit,
            expirationDate: formExpiryDate,
            expirationType: formExpiryType,
            memo: memoContent,
          });

          const newIngredient: Ingredient = {
            id: String(savedIng.id),
            name: savedIng.name,
            location: compartmentId,
            subLocation: selectedShelfId as any,
            category: formCategory,
            expiryDate: savedIng.expirationDate,
            expiryType: savedIng.expirationType || formExpiryType,
            quantity: savedIng.quantity,
            unit: savedIng.unit,
            memo: formMemo.trim() || undefined,
            fridgeId,
          };
          setIngredients([...ingredients, newIngredient]);
        } else {
          if (!selectedIngredientId) return;
          const updatedIng = await updateIngredient(Number(selectedIngredientId), {
            name: formName.trim(),
            quantity: Number(formQuantity),
            unit: formUnit,
            expirationDate: formExpiryDate,
            expirationType: formExpiryType,
            memo: memoContent,
          });

          setIngredients(ingredients.map(item =>
            item.id === selectedIngredientId
              ? {
                  ...item,
                  name: updatedIng.name,
                  category: formCategory,
                  expiryDate: updatedIng.expirationDate,
                  expiryType: updatedIng.expirationType || formExpiryType,
                  quantity: updatedIng.quantity,
                  unit: updatedIng.unit,
                  memo: formMemo.trim() || undefined,
                }
              : item
          ));
        }
      } catch (e) {
        console.error('Failed to save ingredient to server', e);
        Alert.alert('오류 ⚠️', '서버에 식재료를 저장하지 못했습니다.');
        return;
      }
    } else {
      let updatedIngredients = [...ingredients];

      if (modalMode === 'add') {
        const newIngredient: Ingredient = {
          id: `ing_${Date.now()}`,
          name: formName.trim(),
          location: compartmentId,
          subLocation: selectedShelfId as any,
          category: formCategory,
          expiryDate: formExpiryDate,
          expiryType: formExpiryType,
          quantity: formQuantity,
          unit: formUnit,
          memo: formMemo.trim() || undefined,
          fridgeId,
        };
        updatedIngredients = [...ingredients, newIngredient];
        setIngredients(updatedIngredients);
      } else {
        updatedIngredients = ingredients.map(item =>
          item.id === selectedIngredientId
            ? {
                ...item,
                name: formName.trim(),
                category: formCategory,
                expiryDate: formExpiryDate,
                expiryType: formExpiryType,
                quantity: formQuantity,
                unit: formUnit,
                memo: formMemo.trim() || undefined,
              }
            : item
        );
        setIngredients(updatedIngredients);
      }

      await saveIngredients(updatedIngredients);
    }

      setModalVisible(false);
    } finally {
      isSavingRef.current = false;
      setIsSaving(false);
    }
  };

  // 식재료 직접 삭제 (수정 모달에서 삭제 버튼 클릭 시 안내 후 삭제)
  const handleConfirmRemoveIngredientDirect = (id: string, name: string) => {
    const performRemove = async () => {
      if (isLoggedIn) {
        try {
          await deleteIngredient(Number(id));
          const updated = ingredients.filter(item => item.id !== id);
          setIngredients(updated);
        } catch (e) {
          console.error('Failed to delete ingredient from server', e);
          Alert.alert('오류 ⚠️', '식재료 삭제에 실패했습니다.');
          return;
        }
      } else {
        const updated = ingredients.filter(item => item.id !== id);
        setIngredients(updated);
        saveIngredients(updated);
      }
      setModalVisible(false);
    };

    if (Platform.OS === 'web') {
      const check = window.confirm(`[${name}] 식재료를 보관실에서 삭제하시겠습니까?`);
      if (check) performRemove();
    } else {
      Alert.alert(
        '식재료 삭제 🗑️',
        `[${name}] 식재료를 보관실에서 삭제하시겠습니까?`,
        [
          { text: '취소', style: 'cancel' },
          { text: '삭제', style: 'destructive', onPress: performRemove }
        ]
      );
    }
  };

  // 특정 구역(subLocation)별로 식재료 필터링
  const getItemsBySubLocation = (sub: string) => {
    return ingredients.filter(item => item.subLocation === sub);
  };

  // 선반 배열의 label을 순서(index)에 맞춰 "선반 N단"으로 재정렬
  const relabelShelves = (shelves: { id: string; label: string }[]) =>
    shelves.map((s, i) => ({ ...s, label: `선반 ${i + 1}단` }));

  // 선반 추가 기능
  const handleAddShelf = (section: 'inside' | 'door') => {
    if (section === 'inside') {
      const newId = `shelf_${Date.now()}`;
      const updated = relabelShelves([...insideShelves, { id: newId, label: '' }]);
      setInsideShelves(updated);
      saveShelfConfig(updated, doorShelves, hasDoorStorage);
    } else {
      const newId = `pocket_${Date.now()}`;
      const updated = relabelShelves([...doorShelves, { id: newId, label: '' }]);
      setDoorShelves(updated);
      saveShelfConfig(insideShelves, updated, hasDoorStorage);
    }
  };

  // 선반 삭제 기능 (식재료 확인 팝업 포함)
  const handleDeleteShelf = (shelfId: string, label: string, section: 'inside' | 'door') => {
    const hasItems = getItemsBySubLocation(shelfId).length > 0;

    const performDelete = async () => {
      let updatedInside = insideShelves;
      let updatedDoor = doorShelves;

      if (section === 'inside') {
        updatedInside = relabelShelves(insideShelves.filter(s => s.id !== shelfId));
        setInsideShelves(updatedInside);
      } else {
        updatedDoor = relabelShelves(doorShelves.filter(s => s.id !== shelfId));
        setDoorShelves(updatedDoor);
      }
      saveShelfConfig(updatedInside, updatedDoor, hasDoorStorage);

      // 해당 선반에 있던 재료들도 함께 제거
      const itemsToDelete = getItemsBySubLocation(shelfId);
      if (isLoggedIn) {
        try {
          await Promise.all(itemsToDelete.map(item => deleteIngredient(Number(item.id))));
        } catch (e) {
          console.error('Failed to delete shelf items from server', e);
        }
      }
      const updatedIngredients = ingredients.filter(item => item.subLocation !== shelfId);
      setIngredients(updatedIngredients);
      if (!isLoggedIn) {
        saveIngredients(updatedIngredients);
      }
    };

    if (hasItems) {
      if (Platform.OS === 'web') {
        const check = window.confirm(`[${label}]에 보관 중인 식재료가 있습니다.\n선반을 삭제하시면 보관 중인 식재료도 함께 영구 삭제됩니다. 계속하시겠습니까?`);
        if (check) performDelete();
      } else {
        Alert.alert(
          '선반 삭제 경고 ⚠️',
          `[${label}]에 보관 중인 식재료가 존재합니다. 선반을 삭제하시면 보관 중인 식재료도 함께 삭제됩니다. 계속하시겠습니까?`,
          [
            { text: '취소', style: 'cancel' },
            { text: '삭제', style: 'destructive', onPress: performDelete }
          ]
        );
      }
    } else {
      performDelete();
    }
  };

  // 문쪽 보관실 사용 여부 토글 핸들러
  const handleToggleDoorStorage = (enable: boolean) => {
    if (enable === hasDoorStorage) return;

    if (!enable) {
      const doorShelvesIds = doorShelves.map(s => s.id);
      const hasItemsInDoor = ingredients.some(item => item.subLocation && doorShelvesIds.includes(item.subLocation));

      const performDisable = async () => {
        setHasDoorStorage(false);
        setDoorShelves([]);
        setDoorDrawerOpen(false);
        doorDrawerAnim.setValue(0);
        saveShelfConfig(insideShelves, [], false);

        const itemsToDelete = ingredients.filter(item => item.subLocation && doorShelvesIds.includes(item.subLocation));
        if (isLoggedIn) {
          try {
            await Promise.all(itemsToDelete.map(item => deleteIngredient(Number(item.id))));
          } catch (e) {
            console.error('Failed to delete door items from server', e);
          }
        }
        const updatedIngredients = ingredients.filter(item => !item.subLocation || !doorShelvesIds.includes(item.subLocation));
        setIngredients(updatedIngredients);
        if (!isLoggedIn) {
          saveIngredients(updatedIngredients);
        }
      };

      if (hasItemsInDoor || doorShelves.length > 0) {
        if (Platform.OS === 'web') {
          const check = window.confirm(
            '문쪽 보관실을 비활성화하면 보관 중인 문쪽 식재료와 선반 구성이 모두 삭제됩니다. 계속하시겠습니까?'
          );
          if (check) performDisable();
        } else {
          Alert.alert(
            '문쪽 보관실 비활성화 경고 ⚠️',
            '문쪽 보관실을 비활성화하면 보관 중인 문쪽 식재료와 선반 구성이 모두 삭제됩니다. 계속하시겠습니까?',
            [
              { text: '취소', style: 'cancel' },
              { text: '비활성화', style: 'destructive', onPress: performDisable }
            ]
          );
        }
      } else {
        performDisable();
      }
    } else {
      // 활성화하는 경우: 기본 선반 세팅 복구
      setHasDoorStorage(true);
      const restoredDoor = [
        { id: 'pocket_1', label: '선반 1단' },
        { id: 'pocket_2', label: '선반 2단' },
      ];
      setDoorShelves(restoredDoor);
      saveShelfConfig(insideShelves, restoredDoor, true);
    }
  };

  // D-Day 문자열 및 색상 도출 헬퍼
  const getDDayInfo = (expiryDate: string) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const expiry = new Date(expiryDate);
    expiry.setHours(0, 0, 0, 0);
    const diff = expiry.getTime() - today.getTime();
    const days = Math.ceil(diff / (1000 * 60 * 60 * 24));

    if (days < 0) return { text: `만료 D+${Math.abs(days)}`, color: theme.ddayExpired };
    if (days === 0) return { text: '오늘만료', color: theme.ddayImminent };
    if (days <= 3) return { text: `D-${days}`, color: theme.ddayImminent };
    return { text: `D-${days}`, color: theme.ddaySafe };
  };

  // 선반 아코디언 카드 렌더러 (안쪽/문쪽 공용)
  const renderShelfCard = (shelf: { id: string; label: string }, section: 'inside' | 'door') => {
    const items = getItemsBySubLocation(shelf.id);
    const isExpanded = expandedShelfIds.has(shelf.id);

    return (
      <View
        key={shelf.id}
        ref={el => { shelfRefs.current[shelf.id] = el; }}
        style={[styles.shelfCard, activeHoverShelfId === shelf.id && styles.shelfHovered]}
      >
        <TouchableOpacity
          style={styles.shelfCardHeader}
          activeOpacity={0.7}
          onPress={() => toggleShelfExpanded(shelf.id)}
        >
          <Text style={styles.shelfLabel} numberOfLines={1}>{shelf.label}</Text>
          <View style={styles.shelfCountBadge}>
            <Text style={styles.shelfCountBadgeText}>{items.length}개</Text>
          </View>
          <Text style={styles.shelfExpandIcon}>{isExpanded ? '▾' : '▸'}</Text>
          <TouchableOpacity
            style={styles.deleteButton}
            onPress={() => handleDeleteShelf(shelf.id, shelf.label, section)}
          >
            <Text style={styles.deleteButtonText}>✕</Text>
          </TouchableOpacity>
        </TouchableOpacity>

        {isExpanded && (
          <View style={styles.shelfExpandedContent}>
            <ScrollView
              showsVerticalScrollIndicator={true}
              contentContainerStyle={styles.shelfItemsScroll}
              scrollEnabled={scrollEnabled}
              nestedScrollEnabled
            >
              {items.map(item => (
                <DraggableBadge
                  key={item.id}
                  item={item}
                  shelfId={shelf.id}
                  draggingItem={draggingItem}
                  setDraggingItem={setDraggingItem}
                  dragPosition={dragPosition}
                  setDragCurrentCoords={setDragCurrentCoords}
                  setScrollEnabled={setScrollEnabled}
                  setActiveHoverShelfId={setActiveHoverShelfId}
                  compartmentId={compartmentId}
                  onNavigateCompartment={onNavigateCompartment}
                  onPressItem={handleOpenEditModal}
                  measureShelves={measureShelves}
                  shelfLayouts={shelfLayouts}
                  lastSwappedTime={lastSwappedTime}
                  screenWidth={screenWidth}
                  theme={theme}
                  styles={styles}
                  handleDropIngredient={handleDropIngredient}
                  getFourDoorSwitchTarget={getFourDoorSwitchTarget}
                  getDDayInfo={getDDayInfo}
                />
              ))}
              <TouchableOpacity
                style={styles.addIngredientBadge}
                activeOpacity={0.7}
                onPress={() => handleOpenAddModal(shelf.id)}
              >
                <Text style={styles.addIngredientBadgeText}>+ 식재료 추가하기</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        )}
      </View>
    );
  };



  return (
    <View 
      style={styles.container}
      {...parentPanResponder.panHandlers}
    >
      {/* 상단 헤더 바 */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} activeOpacity={0.7} onPress={onBack}>
          <Text style={styles.backButtonText}>〈 뒤로가기</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{compartmentLabel} 내부</Text>
      </View>

      {isLoading ? (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: theme.background }}>
          <ActivityIndicator size="large" color={theme.primary} />
          <Text style={{ marginTop: 16, color: theme.textSecondary, fontSize: 14, fontWeight: '500' }}>
            보관실 설정을 불러오는 중...
          </Text>
        </View>
      ) : (
        <>
          {/* 설정 바: 문쪽 보관실 사용 설정 */}
          <View style={styles.settingsBar}>
            <Text style={styles.settingsLabel}>문쪽 보관실 사용</Text>
            <View style={styles.toggleGroup}>
              <TouchableOpacity
                style={{ ...styles.toggleButton, ...(hasDoorStorage ? styles.toggleButtonActive : {}) }}
                onPress={() => handleToggleDoorStorage(true)}
                activeOpacity={0.7}
              >
                <Text style={{ ...styles.toggleButtonText, ...(hasDoorStorage ? styles.toggleButtonTextActive : {}) }}>있음</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={{ ...styles.toggleButton, ...(!hasDoorStorage ? styles.toggleButtonActive : {}) }}
                onPress={() => handleToggleDoorStorage(false)}
                activeOpacity={0.7}
              >
                <Text style={{ ...styles.toggleButtonText, ...(!hasDoorStorage ? styles.toggleButtonTextActive : {}) }}>없음</Text>
              </TouchableOpacity>
            </View>
          </View>

          <Animated.View style={[styles.body, { opacity: contentOpacity, transform: [{ translateX: contentTranslateX }] }]}>
            {/* 안쪽 보관실: 전체 폭 아코디언 리스트 */}
            <ScrollView
              style={styles.insideScroll}
              contentContainerStyle={[
                styles.insideScrollContent,
                hasDoorStorage && { paddingBottom: 32 + DOOR_BOTTOM_TAB_HEIGHT },
              ]}
            >
              {insideShelves.map((shelf) => renderShelfCard(shelf, 'inside'))}

              <TouchableOpacity
                style={styles.addShelfButton}
                activeOpacity={0.7}
                onPress={() => handleAddShelf('inside')}
              >
                <Text style={styles.addShelfButtonText}>+ 선반 추가</Text>
              </TouchableOpacity>
            </ScrollView>
          </Animated.View>

          {/* 문쪽 보관실: 하단 탭 + 위로 펼쳐지는 드로어 */}
          {hasDoorStorage && (
            <>
              {doorDrawerOpen && (
                <TouchableOpacity
                  style={styles.doorDrawerBackdrop}
                  activeOpacity={1}
                  onPress={closeDoorDrawer}
                />
              )}

              <Animated.View
                style={[
                  styles.doorDrawerPanel,
                  {
                    height: DOOR_DRAWER_HEIGHT,
                    bottom: DOOR_BOTTOM_TAB_HEIGHT,
                    opacity: doorDrawerAnim,
                    transform: [{
                      translateY: doorDrawerAnim.interpolate({
                        inputRange: [0, 1],
                        outputRange: [DOOR_DRAWER_HEIGHT, 0],
                      }),
                    }],
                  },
                ]}
                pointerEvents={doorDrawerOpen ? 'auto' : 'none'}
              >
                <View style={styles.doorDrawerPanelInner}>
                  <View style={styles.doorDrawerHeader}>
                    <Text style={styles.sectionTitle}>문쪽 보관실</Text>
                    <TouchableOpacity style={styles.modalCloseButton} onPress={closeDoorDrawer}>
                      <Text style={styles.modalCloseText}>✕</Text>
                    </TouchableOpacity>
                  </View>
                  <ScrollView style={styles.doorDrawerScroll} contentContainerStyle={styles.insideScrollContent}>
                    {doorShelves.map((shelf) => renderShelfCard(shelf, 'door'))}

                    <TouchableOpacity
                      style={styles.addShelfButton}
                      activeOpacity={0.7}
                      onPress={() => handleAddShelf('door')}
                    >
                      <Text style={styles.addShelfButtonText}>+ 선반 추가</Text>
                    </TouchableOpacity>
                  </ScrollView>
                </View>
              </Animated.View>

              <TouchableOpacity
                style={[
                  styles.doorBottomTab,
                  { height: DOOR_BOTTOM_TAB_HEIGHT },
                  doorDrawerOpen && styles.doorBottomTabFlush,
                ]}
                activeOpacity={0.8}
                onPress={() => (doorDrawerOpen ? closeDoorDrawer() : openDoorDrawer())}
              >
                <Text style={styles.doorBottomTabText}>
                  {doorDrawerOpen ? '▾  문쪽 보관실 닫기' : '▴  문쪽 보관실'}
                </Text>
              </TouchableOpacity>
            </>
          )}
        </>
      )}

      {/* 식재료 등록/수정 모달 */}
      <Modal
        visible={modalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => {
          if (!isSaving) {
            handleCloseAddEditModal();
          }
        }}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            {/* 헤더 */}
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {modalMode === 'add' ? '식재료 등록' : '식재료 정보 및 수정'}
              </Text>
              <TouchableOpacity
                style={[styles.modalCloseButton, isSaving && { opacity: 0.5 }]}
                onPress={handleCloseAddEditModal}
                disabled={isSaving}
              >
                <Text style={styles.modalCloseText}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView 
              style={styles.formScroll} 
              contentContainerStyle={{ paddingBottom: 24 }}
              showsVerticalScrollIndicator={false}
            >
              {/* 식재료명 */}
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>식재료명</Text>
                <TextInput
                  style={styles.input}
                  value={formName}
                  onChangeText={setFormName}
                  placeholder="예: 서울우유, 구이용 삼겹살"
                  placeholderTextColor="#90A4AE"
                />
              </View>

              {/* 카테고리 (콤보박스) */}
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>카테고리</Text>
                <TouchableOpacity
                  style={styles.comboTrigger}
                  activeOpacity={0.7}
                  onPress={toggleCategoryDropdown}
                >
                  <Text style={styles.comboTriggerText}>
                    {(() => {
                      const selected = CATEGORIES.find(c => c.key === formCategory);
                      return selected ? `${selected.emoji ? selected.emoji + ' ' : ''}${selected.label}` : '선택';
                    })()}
                  </Text>
                  <Text style={styles.comboArrow}>{categoryDropdownOpen ? '▴' : '▾'}</Text>
                </TouchableOpacity>
                {categoryDropdownOpen && (
                  <View style={styles.comboDropdown}>
                    {CATEGORIES.map(cat => (
                      <TouchableOpacity
                        key={cat.key}
                        style={[styles.comboOption, formCategory === cat.key && styles.comboOptionActive]}
                        onPress={() => { setFormCategory(cat.key); setCategoryDropdownOpen(false); }}
                        activeOpacity={0.7}
                      >
                        <Text style={[styles.comboOptionText, formCategory === cat.key && styles.comboOptionTextActive]}>
                          {cat.emoji ? `${cat.emoji} ` : ''}{cat.label}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
              </View>

              {/* 수량 및 단위 */}
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>수량 및 단위</Text>
                <View style={styles.quantityUnitRow}>
                  {/* 수량 카운터 */}
                  <View style={styles.quantityCounter}>
                    <TouchableOpacity
                      style={styles.counterButton}
                      onPress={() => setFormQuantity(prev => Math.max(1, prev - 1))}
                    >
                      <Text style={styles.counterButtonText}>-</Text>
                    </TouchableOpacity>
                    <Text style={styles.counterValue}>{formQuantity}</Text>
                    <TouchableOpacity
                      style={styles.counterButton}
                      onPress={() => setFormQuantity(prev => prev + 1)}
                    >
                      <Text style={styles.counterButtonText}>+</Text>
                    </TouchableOpacity>
                  </View>

                  {/* 단위 선택 (콤보박스) */}
                  <TouchableOpacity
                    style={[styles.comboTrigger, { flex: 1 }]}
                    activeOpacity={0.7}
                    onPress={toggleUnitDropdown}
                  >
                    <Text style={styles.comboTriggerText}>{formUnit || '선택'}</Text>
                    <Text style={styles.comboArrow}>{unitDropdownOpen ? '▴' : '▾'}</Text>
                  </TouchableOpacity>
                </View>
                {unitDropdownOpen && (
                  <View style={styles.comboDropdown}>
                    {unitOptions.map(u => (
                      <TouchableOpacity
                        key={u}
                        style={[styles.comboOption, formUnit === u && styles.comboOptionActive]}
                        onPress={() => { setFormUnit(u); setUnitDropdownOpen(false); setUnitCustomInputOpen(false); }}
                        activeOpacity={0.7}
                      >
                        <Text style={[styles.comboOptionText, formUnit === u && styles.comboOptionTextActive]}>{u}</Text>
                      </TouchableOpacity>
                    ))}
                    {!unitCustomInputOpen ? (
                      <TouchableOpacity
                        style={styles.comboAddNewRow}
                        activeOpacity={0.7}
                        onPress={() => setUnitCustomInputOpen(true)}
                      >
                        <Text style={styles.comboAddNewRowText}>+ 직접 입력</Text>
                      </TouchableOpacity>
                    ) : (
                      <View style={styles.comboCustomRow}>
                        <TextInput
                          style={styles.comboCustomInput}
                          value={unitCustomInputValue}
                          onChangeText={setUnitCustomInputValue}
                          placeholder="새 단위 입력"
                          placeholderTextColor="#90A4AE"
                          autoFocus
                          onSubmitEditing={handleAddCustomUnit}
                        />
                        <TouchableOpacity
                          style={styles.comboCustomAddButton}
                          activeOpacity={0.7}
                          onPress={handleAddCustomUnit}
                        >
                          <Text style={styles.comboCustomAddButtonText}>추가</Text>
                        </TouchableOpacity>
                      </View>
                    )}
                  </View>
                )}
              </View>

              {/* 기한 종류 (테두리 없는 콤보박스) */}
              <View style={styles.formGroup}>
                <TouchableOpacity
                  style={styles.comboTriggerBorderless}
                  activeOpacity={0.7}
                  onPress={toggleExpiryTypeDropdown}
                >
                  <Text style={styles.comboTriggerBorderlessText}>{EXPIRY_TYPE_LABELS[formExpiryType]}</Text>
                  <Text style={styles.comboArrow}>{expiryTypeDropdownOpen ? '▴' : '▾'}</Text>
                </TouchableOpacity>
                {expiryTypeDropdownOpen && (
                  <View style={styles.comboDropdown}>
                    {(Object.keys(EXPIRY_TYPE_LABELS) as ExpiryType[]).map(type => (
                      <TouchableOpacity
                        key={type}
                        style={[styles.comboOption, formExpiryType === type && styles.comboOptionActive]}
                        onPress={() => { setFormExpiryType(type); setExpiryTypeDropdownOpen(false); }}
                        activeOpacity={0.7}
                      >
                        <Text style={[styles.comboOptionText, formExpiryType === type && styles.comboOptionTextActive]}>
                          {EXPIRY_TYPE_LABELS[type]}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
              </View>

              {/* 날짜 */}
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>날짜</Text>
                <TextInput
                  style={styles.input}
                  value={formExpiryDate}
                  onChangeText={setFormExpiryDate}
                  placeholder="YYYY-MM-DD"
                  placeholderTextColor="#90A4AE"
                  keyboardType="numeric"
                />
                {/* 퀵 선택 */}
                <View style={styles.presetRow}>
                  <TouchableOpacity
                    style={styles.presetButton}
                    onPress={() => setFormExpiryDate(addDaysToToday(3))}
                  >
                    <Text style={styles.presetButtonText}>+3일</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.presetButton}
                    onPress={() => setFormExpiryDate(addDaysToToday(7))}
                  >
                    <Text style={styles.presetButtonText}>+7일</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.presetButton}
                    onPress={() => setFormExpiryDate(addDaysToToday(30))}
                  >
                    <Text style={styles.presetButtonText}>+30일</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.presetButton}
                    onPress={() => setFormExpiryDate(addDaysToToday(90))}
                  >
                    <Text style={styles.presetButtonText}>+90일</Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* 메모 */}
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>메모 (선택) ({formMemo.length}/20자)</Text>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  value={formMemo}
                  onChangeText={setFormMemo}
                  placeholder="보관 시 참고사항을 입력하세요. (최대 20자)"
                  placeholderTextColor="#90A4AE"
                  multiline
                  numberOfLines={2}
                  maxLength={20}
                />
              </View>
            </ScrollView>

            {/* 하단 푸터 버튼 */}
            <View style={styles.modalFooter}>
              {modalMode === 'edit' && selectedIngredientId && (
                <TouchableOpacity
                  style={[styles.footerButton, styles.buttonDelete, isSaving && { opacity: 0.5 }]}
                  onPress={() => handleConfirmRemoveIngredientDirect(selectedIngredientId, formName)}
                  activeOpacity={0.7}
                  disabled={isSaving}
                >
                  <Text style={styles.buttonTextDelete}>삭제</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity
                style={[styles.footerButton, styles.buttonCancel, isSaving && { opacity: 0.5 }]}
                onPress={handleCloseAddEditModal}
                activeOpacity={0.7}
                disabled={isSaving}
              >
                <Text style={styles.buttonTextCancel}>취소</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.footerButton, styles.buttonSave, isSaving && { opacity: 0.7 }]}
                onPress={handleSaveIngredient}
                activeOpacity={0.7}
                disabled={isSaving}
              >
                {isSaving ? (
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <ActivityIndicator size="small" color="#FFFFFF" />
                    <Text style={styles.buttonTextSave}>
                      {modalMode === 'add' ? '등록 중...' : '저장 중...'}
                    </Text>
                  </View>
                ) : (
                  <Text style={styles.buttonTextSave}>
                    {modalMode === 'add' ? '등록' : '수정 완료'}
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* 식재료 드래그 오버레이 */}
      {draggingItem !== null && (
        <View 
          style={StyleSheet.absoluteFillObject} 
          pointerEvents="none"
        >
          <Animated.View
            style={[
              styles.floatingDragBadge,
              dragPosition.getLayout(),
              {
                backgroundColor: theme.surface,
                borderColor: theme.borderLight,
                borderLeftWidth: 3.5,
                borderLeftColor: getDDayInfo(draggingItem.expiryDate).color,
              }
            ]}
          >
            <Text style={[styles.floatingDragText, { color: theme.textPrimary }]} numberOfLines={1}>
              {CATEGORY_EMOJI[draggingItem.category] ? `${CATEGORY_EMOJI[draggingItem.category]} ` : ''}
              {draggingItem.name}
            </Text>
            <Text style={[styles.floatingDragDDay, { color: getDDayInfo(draggingItem.expiryDate).color }]}>
              {getDDayInfo(draggingItem.expiryDate).text}
            </Text>
          </Animated.View>
        </View>
      )}
    </View>
  );
}

function createStyles(theme: ThemeColors, isDark: boolean) {
  return StyleSheet.create({
    container: {
      flex: 1,
      width: '100%',
      backgroundColor: theme.background,
    },
    settingsBar: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: 20,
      paddingVertical: 10,
      backgroundColor: theme.surface,
      borderBottomWidth: 1,
      borderBottomColor: theme.borderLight,
    },
    settingsLabel: {
      fontSize: 14,
      fontWeight: 'bold',
      color: theme.textSecondary,
    },
    toggleGroup: {
      flexDirection: 'row',
      backgroundColor: theme.toggleBg,
      borderRadius: 20,
      padding: 3,
    },
    toggleButton: {
      paddingVertical: 6,
      paddingHorizontal: 16,
      borderRadius: 18,
      justifyContent: 'center',
      alignItems: 'center',
    },
    toggleButtonActive: {
      backgroundColor: theme.primary,
      shadowColor: '#000000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 3,
      elevation: 2,
    },
    toggleButtonText: {
      fontSize: 12,
      fontWeight: 'bold',
      color: theme.toggleInactiveText,
    },
    toggleButtonTextActive: {
      color: theme.primaryOnPrimary,
    },
    header: {
      width: '100%',
      height: 64,
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-end',
      paddingHorizontal: 16,
      paddingBottom: 12,
      backgroundColor: theme.surface,
      borderBottomWidth: 1,
      borderBottomColor: theme.borderLight,
    },
    backButton: {
      width: 80,
      justifyContent: 'center',
    },
    backButtonText: {
      fontSize: 14,
      color: theme.primaryText,
      fontWeight: 'bold',
    },
    headerTitle: {
      flex: 1,
      fontSize: 18,
      fontWeight: 'bold',
      color: theme.textPrimary,
      textAlign: 'right',
    },
    body: {
      flex: 1,
    },
    insideScroll: {
      flex: 1,
      backgroundColor: theme.surfaceSecondary,
    },
    insideScrollContent: {
      padding: 16,
      gap: 12,
      paddingBottom: 32,
    },
    sectionTitle: {
      fontSize: 14,
      fontWeight: 'bold',
      color: theme.textPrimary,
      textAlign: 'center',
    },
    shelfCard: {
      backgroundColor: theme.surface,
      borderRadius: 12,
      borderWidth: isDark ? 1.5 : 1,
      borderColor: isDark ? 'rgba(255,255,255,0.16)' : theme.glassBorder,
      borderBottomWidth: 5,
      borderBottomColor: theme.metallicTrim,
      padding: 10,
      shadowColor: isDark ? '#FFFFFF' : '#000000',
      shadowOffset: { width: 0, height: isDark ? 0 : 4 },
      shadowOpacity: isDark ? 0.1 : 0.05,
      shadowRadius: isDark ? 4 : 8,
      elevation: isDark ? 0 : 2,
    },
    shelfCardHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      paddingVertical: 4,
    },
    shelfLabel: {
      flex: 1,
      fontSize: 13,
      fontWeight: 'bold',
      color: theme.textTertiary,
    },
    shelfCountBadge: {
      backgroundColor: theme.surfaceTertiary,
      borderRadius: 10,
      paddingVertical: 3,
      paddingHorizontal: 8,
    },
    shelfCountBadgeText: {
      fontSize: 11,
      fontWeight: 'bold',
      color: theme.textSecondary,
    },
    shelfExpandIcon: {
      fontSize: 14,
      fontWeight: 'bold',
      color: theme.textTertiary,
    },
    deleteButton: {
      padding: 4,
    },
    deleteButtonText: {
      fontSize: 12,
      color: theme.textMuted,
      fontWeight: 'bold',
    },
    doorBottomTab: {
      position: 'absolute',
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: theme.primary,
      alignItems: 'center',
      justifyContent: 'center',
      borderTopWidth: 1,
      borderTopColor: isDark ? 'rgba(255,255,255,0.16)' : 'rgba(0,0,0,0.06)',
      borderTopLeftRadius: 14,
      borderTopRightRadius: 14,
      shadowColor: isDark ? '#FFFFFF' : '#000000',
      shadowOffset: { width: 0, height: -2 },
      shadowOpacity: isDark ? 0.1 : 0.12,
      shadowRadius: 6,
      elevation: 8,
      zIndex: 25,
    },
    // 드로어가 열려 패널과 맞닿아 있을 때는 각진 모서리로 이어 붙여
    // 둥근 모서리 틈으로 그림자가 비치는 현상을 없앰
    doorBottomTabFlush: {
      borderTopLeftRadius: 0,
      borderTopRightRadius: 0,
      borderTopWidth: 0,
      shadowOpacity: 0,
      elevation: 0,
    },
    doorBottomTabText: {
      fontSize: 13,
      fontWeight: 'bold',
      color: theme.primaryOnPrimary,
      textAlign: 'center',
    },
    doorDrawerBackdrop: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: theme.modalOverlay,
      zIndex: 15,
    },
    // 애니메이션(transform)이 걸리는 바깥 컨테이너: 그림자만 담당하고
    // overflow/borderRadius를 함께 두지 않아 프레임마다 클립 마스크를 다시
    // 계산하지 않도록 분리 (안 그러면 위로 올라오는 모션이 끊겨 보임)
    doorDrawerPanel: {
      position: 'absolute',
      left: 0,
      right: 0,
      shadowColor: isDark ? '#FFFFFF' : '#000000',
      shadowOffset: { width: 0, height: -4 },
      shadowOpacity: isDark ? 0.1 : 0.15,
      shadowRadius: 10,
      elevation: 10,
      zIndex: 20,
    },
    // 실제 배경/모서리 둥글림/스크롤 클리핑은 애니메이션되지 않는 내부 뷰가 담당
    doorDrawerPanelInner: {
      flex: 1,
      backgroundColor: theme.surface,
      borderTopWidth: isDark ? 1.5 : 1,
      borderTopColor: isDark ? 'rgba(255,255,255,0.16)' : theme.borderLight,
      borderTopLeftRadius: 16,
      borderTopRightRadius: 16,
      overflow: 'hidden',
    },
    doorDrawerScroll: {
      flex: 1,
    },
    doorDrawerHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingVertical: 12,
      paddingHorizontal: 16,
      backgroundColor: theme.freezerDoor,
      borderBottomWidth: 1,
      borderBottomColor: theme.freezerDoorBorder,
    },
    itemBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      backgroundColor: theme.surface, // 깔끔한 화이트/슬레이트 카드
      borderWidth: 1,
      borderColor: theme.borderLight,
      borderRadius: 10,
      paddingVertical: 8,
      paddingHorizontal: 10,
      width: '100%',
      minHeight: 40,
      marginBottom: 8,
      shadowColor: '#000000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.04,
      shadowRadius: 4,
      elevation: 1.5,
    },
    itemText: {
      flex: 1,
      fontSize: 12,
      fontWeight: 'bold',
      color: theme.textPrimary,
    },
    itemQuantity: {
      fontSize: 11,
      fontWeight: '600',
      color: theme.textSecondary,
    },
    addShelfButton: {
      backgroundColor: theme.surface,
      borderWidth: 1,
      borderColor: theme.borderLight,
      borderStyle: 'dashed',
      borderRadius: 10,
      paddingVertical: 14,
      alignItems: 'center',
      justifyContent: 'center',
      marginTop: 4,
    },
    addShelfButtonText: {
      fontSize: 13,
      fontWeight: 'bold',
      color: theme.textTertiary,
    },
    shelfExpandedContent: {
      maxHeight: 260,
      marginTop: 8,
      paddingTop: 8,
      borderTopWidth: 1,
      borderTopColor: theme.borderLight,
      overflow: 'hidden',
    },
    shelfItemsScroll: {
      flexDirection: 'column',
      alignItems: 'stretch',
      paddingBottom: 8,
    },
    addIngredientBadge: {
      flexDirection: 'row',
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: theme.surface,
      borderWidth: 1.5,
      borderColor: theme.primary,
      borderStyle: 'dashed',
      borderRadius: 8,
      paddingVertical: 6,
      paddingHorizontal: 10,
      height: 34,
      width: '100%',
      marginBottom: 10,
    },
    addIngredientBadgeText: {
      fontSize: 12,
      fontWeight: 'bold',
      color: isDark ? '#FFFFFF' : '#000000',
    },
    modalOverlay: {
      flex: 1,
      backgroundColor: theme.modalOverlay,
      justifyContent: 'center',
      alignItems: 'center',
      padding: 20,
    },
    modalContent: {
      width: '95%',
      maxWidth: 500,
      maxHeight: '90%',
      backgroundColor: theme.surface,
      borderRadius: 20,
      padding: 20,
      shadowColor: theme.shadow,
      shadowOffset: { width: 0, height: 10 },
      shadowOpacity: 0.15,
      shadowRadius: 16,
      elevation: 10,
    },
    modalHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      borderBottomWidth: 1,
      borderBottomColor: theme.borderLight,
      paddingBottom: 12,
      marginBottom: 16,
    },
    modalTitle: {
      fontSize: 18,
      fontWeight: 'bold',
      color: theme.textPrimary,
    },
    modalCloseButton: {
      padding: 4,
    },
    modalCloseText: {
      fontSize: 18,
      color: theme.textTertiary,
      fontWeight: 'bold',
    },
    formScroll: {
      maxHeight: '80%',
    },
    formGroup: {
      marginBottom: 16,
    },
    formLabel: {
      fontSize: 13,
      fontWeight: 'bold',
      color: theme.textSecondary,
      marginBottom: 6,
    },
    input: {
      borderWidth: 1.5,
      borderColor: theme.borderLight,
      borderRadius: 10,
      paddingVertical: 10,
      paddingHorizontal: 12,
      fontSize: 14,
      color: theme.textPrimary,
      backgroundColor: theme.surfaceSecondary,
    },
    comboTrigger: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      borderWidth: 1.5,
      borderColor: theme.borderLight,
      borderRadius: 10,
      paddingVertical: 10,
      paddingHorizontal: 12,
      backgroundColor: theme.surfaceSecondary,
    },
    comboTriggerBorderless: {
      flexDirection: 'row',
      alignItems: 'center',
      alignSelf: 'flex-start',
      paddingVertical: 4,
      paddingHorizontal: 2,
    },
    comboTriggerBorderlessText: {
      fontSize: 14,
      fontWeight: 'bold',
      color: theme.primaryText,
    },
    comboTriggerText: {
      fontSize: 14,
      fontWeight: '600',
      color: theme.textPrimary,
    },
    comboArrow: {
      fontSize: 12,
      color: theme.textTertiary,
      marginLeft: 8,
    },
    comboDropdown: {
      marginTop: 6,
      borderWidth: 1.5,
      borderColor: theme.borderLight,
      borderRadius: 10,
      backgroundColor: theme.surface,
      overflow: 'hidden',
    },
    comboOption: {
      paddingVertical: 10,
      paddingHorizontal: 12,
      borderBottomWidth: 1,
      borderBottomColor: theme.divider,
    },
    comboOptionActive: {
      backgroundColor: theme.primaryLight,
    },
    comboOptionText: {
      fontSize: 13,
      color: theme.textSecondary,
      fontWeight: '600',
    },
    comboOptionTextActive: {
      color: theme.primaryText,
      fontWeight: 'bold',
    },
    comboAddNewRow: {
      paddingVertical: 10,
      paddingHorizontal: 12,
    },
    comboAddNewRowText: {
      fontSize: 13,
      color: theme.primary,
      fontWeight: 'bold',
    },
    comboCustomRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      padding: 10,
    },
    comboCustomInput: {
      flex: 1,
      borderWidth: 1,
      borderColor: theme.borderLight,
      borderRadius: 8,
      paddingVertical: 6,
      paddingHorizontal: 10,
      fontSize: 13,
      color: theme.textPrimary,
      backgroundColor: theme.surfaceSecondary,
    },
    comboCustomAddButton: {
      backgroundColor: theme.primary,
      borderRadius: 8,
      paddingVertical: 8,
      paddingHorizontal: 12,
    },
    comboCustomAddButtonText: {
      fontSize: 12,
      fontWeight: 'bold',
      color: theme.primaryOnPrimary,
    },
    quantityUnitRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 16,
    },
    quantityCounter: {
      flexDirection: 'row',
      alignItems: 'center',
      borderWidth: 1.5,
      borderColor: theme.borderLight,
      borderRadius: 10,
      backgroundColor: theme.surfaceSecondary,
      overflow: 'hidden',
    },
    counterButton: {
      paddingVertical: 10,
      paddingHorizontal: 16,
      backgroundColor: theme.surfaceTertiary,
    },
    counterButtonText: {
      fontSize: 16,
      fontWeight: 'bold',
      color: theme.textPrimary,
    },
    counterValue: {
      fontSize: 14,
      fontWeight: 'bold',
      color: theme.textPrimary,
      paddingHorizontal: 16,
      minWidth: 40,
      textAlign: 'center',
    },
    presetRow: {
      flexDirection: 'row',
      gap: 8,
      marginTop: 8,
    },
    presetButton: {
      flex: 1,
      backgroundColor: theme.primaryLight,
      borderRadius: 8,
      paddingVertical: 8,
      alignItems: 'center',
    },
    presetButtonText: {
      fontSize: 11,
      color: theme.primaryText,
      fontWeight: 'bold',
    },
    textArea: {
      height: 60,
      textAlignVertical: 'top',
    },
    modalFooter: {
      flexDirection: 'row',
      justifyContent: 'flex-end',
      borderTopWidth: 1,
      borderTopColor: theme.borderLight,
      paddingTop: 12,
      marginTop: 16,
      gap: 8,
    },
    footerButton: {
      borderRadius: 10,
      paddingVertical: 10,
      paddingHorizontal: 18,
      justifyContent: 'center',
      alignItems: 'center',
      minWidth: 80,
    },
    buttonCancel: {
      backgroundColor: theme.surfaceTertiary,
    },
    buttonDelete: {
      backgroundColor: theme.danger,
      marginRight: 'auto',
    },
    buttonSave: {
      backgroundColor: theme.primary,
    },
    buttonTextCancel: {
      fontSize: 13,
      fontWeight: 'bold',
      color: theme.textSecondary,
    },
    buttonTextDelete: {
      fontSize: 13,
      fontWeight: 'bold',
      color: theme.primaryOnPrimary,
    },
    buttonTextSave: {
      fontSize: 13,
      fontWeight: 'bold',
      color: theme.primaryOnPrimary,
    },
    dDayBadge: {
      borderWidth: 1,
      borderRadius: 6,
      paddingVertical: 2,
      paddingHorizontal: 6,
    },
    dDayBadgeText: {
      fontSize: 10,
      fontWeight: 'bold',
    },
    floatingDragBadge: {
      position: 'absolute',
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      borderRadius: 10,
      borderWidth: 1,
      paddingVertical: 8,
      paddingHorizontal: 10,
      paddingLeft: 8,
      width: 140,
      height: 40,
      zIndex: 99999,
      opacity: 0.85,
      shadowColor: '#000000',
      shadowOffset: { width: 0, height: 10 },
      shadowOpacity: 0.2,
      shadowRadius: 10,
      elevation: 8,
      transform: [{ scale: 1.08 }],
    },
    floatingDragText: {
      fontSize: 12,
      fontWeight: 'bold',
      maxWidth: '65%',
    },
    floatingDragDDay: {
      fontSize: 11,
      fontWeight: 'bold',
    },
    shelfHovered: {
      borderColor: theme.primary,
      borderWidth: 1.5,
      backgroundColor: theme.surfaceSecondary,
      shadowColor: theme.primary,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.15,
      shadowRadius: 6,
      elevation: 3,
    },
  });
}
