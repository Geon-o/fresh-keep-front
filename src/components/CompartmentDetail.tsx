import React, { useState, useEffect, useRef } from 'react';
import { StyleSheet, TouchableOpacity, View, Text, ScrollView, Platform, Alert, TextInput, Modal, ActivityIndicator, PanResponder, Dimensions, Animated } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';
import { Ingredient, IngredientCategory } from '../types';
import { useAuth } from '../context/AuthContext';
import { getFridgeLayout, updateCompartmentShelves } from '../api/fridgeService';
import { addIngredient, updateIngredient, deleteIngredient } from '../api/ingredientService';
import { serializeMemo, deserializeMemo } from '../utils/memoSerializer';
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
  shelfLabel: string;
  draggingItem: Ingredient | null;
  setDraggingItem: (item: Ingredient | null) => void;
  dragPosition: Animated.ValueXY;
  setDragCurrentCoords: (coords: { x: number; y: number }) => void;
  setScrollEnabled: (enabled: boolean) => void;
  setActiveHoverShelfId: (id: string | null) => void;
  compartmentId: string;
  onNavigateCompartment?: (newId: string, newLabel: string) => void;
  handleOpenShelfDetailModal: (shelfId: string, label: string) => void;
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
  shelfLabel,
  draggingItem,
  setDraggingItem,
  dragPosition,
  setDragCurrentCoords,
  setScrollEnabled,
  setActiveHoverShelfId,
  compartmentId,
  onNavigateCompartment,
  handleOpenShelfDetailModal,
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
    shelfLabel,
    draggingItem,
    setDraggingItem,
    dragPosition,
    setDragCurrentCoords,
    setScrollEnabled,
    setActiveHoverShelfId,
    compartmentId,
    onNavigateCompartment,
    handleOpenShelfDetailModal,
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
      shelfLabel,
      draggingItem,
      setDraggingItem,
      dragPosition,
      setDragCurrentCoords,
      setScrollEnabled,
      setActiveHoverShelfId,
      compartmentId,
      onNavigateCompartment,
      handleOpenShelfDetailModal,
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
          props.dragPosition.setValue({ x: startX - 70, y: startY - 20 });
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
          props.dragPosition.setValue({ x: currentX - 70, y: currentY - 20 });
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
          // 타이머 만료 전 손 뗌 -> 단순 탭
          props.setScrollEnabled(true);
          props.handleOpenShelfDetailModal(props.shelfId, props.shelfLabel);
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
      <Text style={[styles.itemDDay, { color: dDay.color }]}>
        {dDay.text}
      </Text>
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
  const { theme } = useTheme();
  const styles = React.useMemo(() => createStyles(theme), [theme]);

  // 부모의 비동기 리렌더링 props 딜레이를 우회하기 위한 로컬 compartmentId 동기 레퍼런스
  const currentCompartmentIdRef = useRef(compartmentId);
  currentCompartmentIdRef.current = compartmentId;

  // 드래그 앤 드롭 제스처 관련 상태
  const [draggingItem, setDraggingItem] = useState<Ingredient | null>(null);
  const dragPosition = useRef(new Animated.ValueXY({ x: 0, y: 0 })).current;
  const [dragCurrentCoords, setDragCurrentCoords] = useState<{ x: number, y: number }>({ x: 0, y: 0 });
  const [scrollEnabled, setScrollEnabled] = useState(true);
  const [activeHoverShelfId, setActiveHoverShelfId] = useState<string | null>(null);
  
  const shelfRefs = useRef<Record<string, View | null>>({});
  const shelfLayouts = useRef<Record<string, { x: number; y: number; width: number; height: number }>>({});
  const lastSwappedTime = useRef<number>(0);
  const screenWidth = Dimensions.get('window').width;

  // 드래그 완료 처리 (드롭)
  const handleDropIngredient = async (item: Ingredient, dropX: number, dropY: number, targetCompartmentId: string) => {
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
        dragPosition.setValue({ x: currentX - 70, y: currentY - 20 });
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
              currentCompartmentIdRef.current = switchTarget.id; // 즉시 로컬 Ref 갱신하여 딜레이 제거
              onNavigateCompartment(switchTarget.id, switchTarget.label);
              setTimeout(() => {
                measureShelves();
              }, 150);
            }
            else if (isLeftSide && currentX > screenWidth - 35) {
              lastSwappedTime.current = now;
              currentCompartmentIdRef.current = switchTarget.id; // 즉시 로컬 Ref 갱신하여 딜레이 제거
              onNavigateCompartment(switchTarget.id, switchTarget.label);
              setTimeout(() => {
                measureShelves();
              }, 150);
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

  // 선반 상세 보기 모달 제어 관련 상태
  const [shelfDetailModalVisible, setShelfDetailModalVisible] = useState(false);
  const [selectedShelfForDetail, setSelectedShelfForDetail] = useState<{ id: string; label: string } | null>(null);

  // 식재료 폼 상태
  const [formName, setFormName] = useState('');
  const [formCategory, setFormCategory] = useState<IngredientCategory>('etc');
  const [formQuantity, setFormQuantity] = useState(1);
  const [formUnit, setFormUnit] = useState('개');
  const [formExpiryDate, setFormExpiryDate] = useState('');
  const [formMemo, setFormMemo] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const isSavingRef = useRef(false);

  // 선반 구성 및 식재료 불러오기 (서버 vs 로컬 분기)
  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      try {
        // 1. 선반 구성 불러오기 (비로그인 모드일 때만 로컬스토리지 활용)
        if (!isLoggedIn) {
          const configStr = await AsyncStorage.getItem(`@shelf_config_${fridgeId}_${compartmentId}`);
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
            await AsyncStorage.setItem(`@shelf_config_${fridgeId}_${compartmentId}`, JSON.stringify(config));
          }
        }

        // 2. 식재료 로드
        if (isLoggedIn) {
          // 서버에서 해당 냉장고 레이아웃 정보 로드 후 매핑
          const layout = await getFridgeLayout(Number(fridgeId));
          
          // compartmentId 매칭 구획 찾기
          const serverComp = layout.compartments.find(comp => {
            const isLeft = compartmentId.includes('left');
            const isRight = compartmentId.includes('right');
            if (compartmentId.startsWith('freezer')) {
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
                location: compartmentId,
                subLocation: deserialized.subLocation as any,
                category: deserialized.category,
                expiryDate: ing.expirationDate,
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
            const filtered = allIngredients.filter(item => item.fridgeId === fridgeId && item.location === compartmentId);
            setIngredients(filtered);
          } else {
            // 로컬 저장소에 데이터 없음 → 빈 상태로 시작
            setIngredients([]);
          }
        }
      } catch (e) {
        console.error('Failed to load data', e);
      } finally {
        setIsLoading(false);
      }
    };
    loadData();
  }, [compartmentId, fridgeId, isLoggedIn]);

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
    } catch (e) {
      console.error('Failed to save ingredients', e);
    }
  };

  // 추가/수정 모달 닫기 (상세 모달 다시 열기 포함)
  const handleCloseAddEditModal = () => {
    setModalVisible(false);
    if (selectedShelfForDetail) {
      setTimeout(() => {
        setShelfDetailModalVisible(true);
      }, 100);
    }
  };

  // 선반 상세 모달 닫기
  const handleCloseShelfDetailModal = () => {
    setShelfDetailModalVisible(false);
    setSelectedShelfForDetail(null);
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
    setFormMemo('');
    
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
    setFormMemo(item.memo || '');
    
    setModalVisible(true);
  };

  // 선반 상세 보기 모달 열기
  const handleOpenShelfDetailModal = (shelfId: string, label: string) => {
    setSelectedShelfForDetail({ id: shelfId, label });
    setShelfDetailModalVisible(true);
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
        window.alert('유통기한 형식을 올바르게 입력해주세요 (YYYY-MM-DD).');
      } else {
        Alert.alert('알림 ⚠️', '유통기한 형식을 올바르게 입력해주세요 (YYYY-MM-DD).');
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
            memo: memoContent,
          });
          
          const newIngredient: Ingredient = {
            id: String(savedIng.id),
            name: savedIng.name,
            location: compartmentId,
            subLocation: selectedShelfId as any,
            category: formCategory,
            expiryDate: savedIng.expirationDate,
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
            memo: memoContent,
          });

          setIngredients(ingredients.map(item =>
            item.id === selectedIngredientId
              ? {
                  ...item,
                  name: updatedIng.name,
                  category: formCategory,
                  expiryDate: updatedIng.expirationDate,
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
      
      if (selectedShelfForDetail) {
        setTimeout(() => {
          setShelfDetailModalVisible(true);
        }, 100);
      }
    } finally {
      isSavingRef.current = false;
      setIsSaving(false);
    }
  };

  // 식재료 개별 삭제
  const handleRemoveIngredient = (id: string) => {
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
      
      if (selectedShelfForDetail) {
        setTimeout(() => {
          setShelfDetailModalVisible(true);
        }, 100);
      }
    };

    if (Platform.OS === 'web') {
      const check = window.confirm('이 식재료를 삭제하시겠습니까?');
      if (check) performRemove();
    } else {
      Alert.alert(
        '식재료 삭제 🗑️',
        '이 식재료를 보관실에서 삭제하시겠습니까?',
        [
          { text: '취소', style: 'cancel' },
          { text: '삭제', style: 'destructive', onPress: performRemove }
        ]
      );
    }
  };

  // 식재료 직접 삭제 (상세 페이지에서 ✕ 버튼 클릭 시 안내 후 삭제)
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

  // 선반 추가 기능
  const handleAddShelf = (section: 'inside' | 'door') => {
    if (section === 'inside') {
      const nextNum = insideShelves.length + 1;
      const newId = `shelf_${Date.now()}`;
      const updated = [...insideShelves, { id: newId, label: `선반 ${nextNum}단` }];
      setInsideShelves(updated);
      saveShelfConfig(updated, doorShelves, hasDoorStorage);
    } else {
      const nextNum = doorShelves.length + 1;
      const newId = `pocket_${Date.now()}`;
      const updated = [...doorShelves, { id: newId, label: `선반 ${nextNum}단` }];
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
        updatedInside = insideShelves.filter(s => s.id !== shelfId);
        setInsideShelves(updatedInside);
      } else {
        updatedDoor = doorShelves.filter(s => s.id !== shelfId);
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

  // 개별 식재료 뱃지 렌더러 (상세 모달용 - 클릭 시 수정)
  const renderItemBadge = (item: Ingredient) => {
    const dDay = getDDayInfo(item.expiryDate);
    const emoji = CATEGORY_EMOJI[item.category] || '';
    
    return (
      <TouchableOpacity
        key={item.id}
        style={[styles.itemBadge, { borderLeftWidth: 3.5, borderLeftColor: dDay.color, paddingLeft: 8 }]}
        activeOpacity={0.7}
        onPress={() => handleOpenEditModal(item)}
      >
        <Text style={styles.itemText} numberOfLines={1}>
          {emoji ? `${emoji} ` : ''}{item.name}
        </Text>
        <Text style={[styles.itemDDay, { color: dDay.color }]}>
          {dDay.text}
        </Text>
      </TouchableOpacity>
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

          <View style={styles.body}>
            {/* 좌측: 안쪽 보관실 (선반) */}
            <View style={[styles.sectionInside, hasDoorStorage ? { marginRight: 8 } : { marginRight: 0, flex: 1 }]}>
              <View style={styles.sectionHeaderInside}>
                <Text style={styles.sectionTitle}>안쪽 보관실</Text>
              </View>
              
              <View style={styles.shelfContainer}>
                <View style={styles.shelfScrollContent}>
                  {insideShelves.map((shelf) => (
                    <View 
                      key={shelf.id} 
                      ref={el => { shelfRefs.current[shelf.id] = el; }} 
                      style={[styles.shelf, activeHoverShelfId === shelf.id && styles.shelfHovered]}
                    >
                      <View style={styles.shelfHeaderRow}>
                        <TouchableOpacity
                          onPress={() => handleOpenShelfDetailModal(shelf.id, shelf.label)}
                          activeOpacity={0.7}
                          style={{ flex: 1 }}
                        >
                          <Text style={styles.shelfLabel}>{shelf.label} 〉</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={styles.deleteButton}
                          onPress={() => handleDeleteShelf(shelf.id, shelf.label, 'inside')}
                        >
                          <Text style={styles.deleteButtonText}>✕</Text>
                        </TouchableOpacity>
                      </View>
                      <View style={styles.shelfItemsContainer}>
                        <ScrollView
                          showsVerticalScrollIndicator={true}
                          contentContainerStyle={styles.shelfItemsScroll}
                          scrollEnabled={scrollEnabled}
                        >
                          {getItemsBySubLocation(shelf.id).map(item => (
                            <DraggableBadge
                              key={item.id}
                              item={item}
                              shelfId={shelf.id}
                              shelfLabel={shelf.label}
                              draggingItem={draggingItem}
                              setDraggingItem={setDraggingItem}
                              dragPosition={dragPosition}
                              setDragCurrentCoords={setDragCurrentCoords}
                              setScrollEnabled={setScrollEnabled}
                              setActiveHoverShelfId={setActiveHoverShelfId}
                              compartmentId={compartmentId}
                              onNavigateCompartment={onNavigateCompartment}
                              handleOpenShelfDetailModal={handleOpenShelfDetailModal}
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
                          {getItemsBySubLocation(shelf.id).length === 0 && (
                            <TouchableOpacity onPress={() => handleOpenShelfDetailModal(shelf.id, shelf.label)}>
                              <Text style={styles.emptyText}>비어 있음</Text>
                            </TouchableOpacity>
                          )}
                        </ScrollView>
                      </View>
                    </View>
                  ))}
                </View>

                {/* 선반 추가 버튼 */}
                <TouchableOpacity
                  style={styles.addShelfButton}
                  activeOpacity={0.7}
                  onPress={() => handleAddShelf('inside')}
                >
                  <Text style={styles.addShelfButtonText}>+ 선반 추가</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* 우측: 문쪽 보관실 (선반) */}
            {hasDoorStorage && (
              <View style={styles.sectionDoor}>
                <View style={styles.sectionHeaderDoor}>
                  <Text style={styles.sectionTitle}>문쪽 보관실</Text>
                </View>

                <View style={styles.pocketContainer}>
                  <View style={styles.pocketScrollContent}>
                    {doorShelves.map((shelf) => (
                      <View 
                        key={shelf.id} 
                        ref={el => { shelfRefs.current[shelf.id] = el; }} 
                        style={[styles.pocket, activeHoverShelfId === shelf.id && styles.shelfHovered]}
                      >
                        <View style={styles.shelfHeaderRow}>
                          <TouchableOpacity
                            onPress={() => handleOpenShelfDetailModal(shelf.id, shelf.label)}
                            activeOpacity={0.7}
                            style={{ flex: 1 }}
                          >
                            <Text style={styles.pocketLabel}>{shelf.label} 〉</Text>
                          </TouchableOpacity>
                          <TouchableOpacity
                            style={styles.deleteButton}
                            onPress={() => handleDeleteShelf(shelf.id, shelf.label, 'door')}
                          >
                            <Text style={styles.deleteButtonText}>✕</Text>
                          </TouchableOpacity>
                        </View>
                        <View style={styles.shelfItemsContainer}>
                          <ScrollView
                            showsVerticalScrollIndicator={true}
                            contentContainerStyle={styles.shelfItemsScroll}
                            scrollEnabled={scrollEnabled}
                          >
                            {getItemsBySubLocation(shelf.id).map(item => (
                              <DraggableBadge
                                key={item.id}
                                item={item}
                                shelfId={shelf.id}
                                shelfLabel={shelf.label}
                                draggingItem={draggingItem}
                                setDraggingItem={setDraggingItem}
                                dragPosition={dragPosition}
                                setDragCurrentCoords={setDragCurrentCoords}
                                setScrollEnabled={setScrollEnabled}
                                setActiveHoverShelfId={setActiveHoverShelfId}
                                compartmentId={compartmentId}
                                onNavigateCompartment={onNavigateCompartment}
                                handleOpenShelfDetailModal={handleOpenShelfDetailModal}
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
                            {getItemsBySubLocation(shelf.id).length === 0 && (
                              <TouchableOpacity onPress={() => handleOpenShelfDetailModal(shelf.id, shelf.label)}>
                                <Text style={styles.emptyText}>비어 있음</Text>
                              </TouchableOpacity>
                            )}
                          </ScrollView>
                        </View>
                      </View>
                    ))}
                  </View>

                  {/* 선반 추가 버튼 */}
                  <TouchableOpacity
                    style={styles.addShelfButton}
                    activeOpacity={0.7}
                    onPress={() => handleAddShelf('door')}
                  >
                    <Text style={styles.addShelfButtonText}>+ 선반 추가</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </View>
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

              {/* 카테고리 */}
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>카테고리</Text>
                <View style={styles.categoryGrid}>
                  {CATEGORIES.map(cat => (
                    <TouchableOpacity
                      key={cat.key}
                      style={{ ...styles.categoryButton, ...(formCategory === cat.key ? styles.categoryButtonActive : {}) }}
                      onPress={() => setFormCategory(cat.key)}
                      activeOpacity={0.7}
                    >
                      <Text style={{ ...styles.categoryButtonText, ...(formCategory === cat.key ? styles.categoryButtonTextActive : {}) }}>
                        {cat.emoji ? `${cat.emoji} ` : ''}{cat.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
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

                  {/* 단위 선택 */}
                  <View style={styles.unitSelector}>
                    {['개', '팩', 'g', 'ml', '봉지'].map(u => (
                      <TouchableOpacity
                        key={u}
                        style={{ ...styles.unitPill, ...(formUnit === u ? styles.unitPillActive : {}) }}
                        onPress={() => setFormUnit(u)}
                        activeOpacity={0.7}
                      >
                        <Text style={formUnit === u ? styles.unitPillTextActive : styles.unitPillText}>
                          {u}
                        </Text>
                      </TouchableOpacity>
                    ))}
                    {/* 직접 입력 */}
                    <TextInput
                      style={styles.unitInput}
                      value={formUnit}
                      onChangeText={setFormUnit}
                      placeholder="직접"
                      placeholderTextColor="#90A4AE"
                    />
                  </View>
                </View>
              </View>

              {/* 유통기한 */}
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>유통기한 (YYYY-MM-DD)</Text>
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

      {/* 선반 상세 보기 모달 */}
      <Modal
        visible={shelfDetailModalVisible}
        transparent
        animationType="fade"
        onRequestClose={handleCloseShelfDetailModal}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            {/* 헤더 */}
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {selectedShelfForDetail ? `${selectedShelfForDetail.label} 상세 보기` : '선반 상세 보기'}
              </Text>
              <TouchableOpacity
                style={styles.modalCloseButton}
                onPress={handleCloseShelfDetailModal}
              >
                <Text style={styles.modalCloseText}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.formScroll} showsVerticalScrollIndicator={false}>
              {selectedShelfForDetail && getItemsBySubLocation(selectedShelfForDetail.id).length === 0 && (
                <Text style={styles.emptyText}>이 선반은 비어 있습니다.</Text>
              )}
              {selectedShelfForDetail && getItemsBySubLocation(selectedShelfForDetail.id).map(item => {
                const dDay = getDDayInfo(item.expiryDate);
                return (
                  <View key={item.id} style={styles.shelfDetailRow}>
                    {/* 상단 라인: 식재료명, D-Day 배지 및 수정 버튼 */}
                    <View style={styles.shelfDetailTopRow}>
                      <View style={styles.shelfDetailNameSection}>
                        <View style={styles.shelfDetailNameContainer}>
                          <View style={styles.shelfDetailNameRow}>
                            <Text style={styles.shelfDetailName} numberOfLines={1}>{item.name}</Text>
                            <View style={[styles.dDayBadge, { backgroundColor: dDay.color + '15', borderColor: dDay.color }]}>
                              <Text style={[styles.dDayBadgeText, { color: dDay.color }]}>{dDay.text}</Text>
                            </View>
                          </View>
                          {item.memo ? (
                            <Text style={styles.shelfDetailMemo} numberOfLines={1}>{item.memo}</Text>
                          ) : null}
                        </View>
                      </View>
                      <View style={styles.shelfDetailActions}>
                        <TouchableOpacity
                          style={styles.shelfDetailEditBtn}
                          onPress={() => {
                            setShelfDetailModalVisible(false);
                            handleOpenEditModal(item);
                          }}
                        >
                          <Text style={styles.shelfDetailEditBtnText}>수정</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={styles.shelfDetailDeleteBtn}
                          onPress={() => handleConfirmRemoveIngredientDirect(item.id, item.name)}
                          activeOpacity={0.7}
                        >
                          <Text style={styles.shelfDetailDeleteBtnText}>✕</Text>
                        </TouchableOpacity>
                      </View>
                    </View>

                    {/* 하단 라인: 수량 및 유통기한 정보 */}
                    <View style={styles.shelfDetailBottomRow}>
                      <View style={styles.shelfDetailInfoBadge}>
                        <Text style={styles.shelfDetailInfoLabel}>수량</Text>
                        <Text style={styles.shelfDetailQuantity}>{item.quantity}{item.unit}</Text>
                      </View>
                      
                      <View style={[styles.shelfDetailInfoBadge, styles.expiryHighlightedBadge]}>
                        <Text style={styles.shelfDetailInfoLabel}>유통기한</Text>
                        <Text style={styles.shelfDetailExpiryDateHighlighted}>{item.expiryDate}</Text>
                      </View>
                    </View>
                  </View>
                );
              })}
            </ScrollView>

            {/* 하단 버튼 */}
            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={[styles.footerButton, styles.buttonSave, { flex: 1 }]}
                onPress={() => {
                  if (selectedShelfForDetail) {
                    setShelfDetailModalVisible(false);
                    handleOpenAddModal(selectedShelfForDetail.id);
                  }
                }}
                activeOpacity={0.7}
              >
                <Text style={styles.buttonTextSave}>+ 새 식재료 추가</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.footerButton, styles.buttonCancel]}
                onPress={handleCloseShelfDetailModal}
                activeOpacity={0.7}
              >
                <Text style={styles.buttonTextCancel}>닫기</Text>
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

function createStyles(theme: ThemeColors) {
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
      flexDirection: 'row',
      padding: 16,
    },
    sectionInside: {
      flex: 5.8,
      backgroundColor: theme.surface,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: theme.borderLight,
      overflow: 'hidden',
      shadowColor: theme.shadow,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.03,
      shadowRadius: 8,
      elevation: 2,
    },
    sectionDoor: {
      flex: 4.2,
      backgroundColor: theme.surface,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: theme.borderLight,
      overflow: 'hidden',
      shadowColor: theme.shadow,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.03,
      shadowRadius: 8,
      elevation: 2,
    },
    sectionHeaderInside: {
      paddingVertical: 12,
      paddingHorizontal: 14,
      backgroundColor: theme.fridgeDoor,
      borderBottomWidth: 1,
      borderBottomColor: theme.fridgeDoorBorder,
    },
    sectionHeaderDoor: {
      paddingVertical: 12,
      paddingHorizontal: 14,
      backgroundColor: theme.freezerDoor,
      borderBottomWidth: 1,
      borderBottomColor: theme.freezerDoorBorder,
    },
    sectionTitle: {
      fontSize: 14,
      fontWeight: 'bold',
      color: theme.textPrimary,
      textAlign: 'center',
    },
    shelfContainer: {
      flex: 1,
      backgroundColor: theme.surfaceSecondary,
      padding: 8,
    },
    shelfScrollContent: {
      flex: 1,
      gap: 12,
      paddingBottom: 16,
    },
    shelf: {
      backgroundColor: theme.surface,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: theme.glassBorder,
      borderBottomWidth: 5,
      borderBottomColor: theme.metallicTrim,
      padding: 10,
      height: 170,
      shadowColor: '#000000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.05,
      shadowRadius: 8,
      elevation: 2,
    },
    shelfHeaderRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    shelfLabel: {
      fontSize: 11,
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
    pocketContainer: {
      flex: 1,
      backgroundColor: theme.surfaceSecondary,
      padding: 8,
    },
    pocketScrollContent: {
      flex: 1,
      gap: 12,
      paddingBottom: 16,
    },
    pocket: {
      backgroundColor: theme.surface,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: theme.glassBorder,
      borderBottomWidth: 5,
      borderBottomColor: theme.metallicTrim,
      padding: 10,
      height: 170,
      shadowColor: '#000000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.05,
      shadowRadius: 8,
      elevation: 2,
    },
    pocketLabel: {
      fontSize: 11,
      fontWeight: 'bold',
      color: theme.textTertiary,
    },
    itemBadge: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      backgroundColor: theme.surface, // 깔끔한 화이트/슬레이트 카드
      borderWidth: 1,
      borderColor: theme.borderLight,
      borderRadius: 10,
      paddingVertical: 8,
      paddingHorizontal: 10,
      width: '100%',
      height: 40,
      marginBottom: 8,
      shadowColor: '#000000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.04,
      shadowRadius: 4,
      elevation: 1.5,
    },
    itemText: {
      fontSize: 12,
      fontWeight: 'bold',
      color: theme.textPrimary,
      maxWidth: '65%',
    },
    itemDDay: {
      fontSize: 11,
      fontWeight: 'bold',
    },
    emptyText: {
      fontSize: 12,
      color: theme.textMuted,
      textAlign: 'center',
      width: '100%',
      marginTop: 10,
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
    shelfItemsContainer: {
      flex: 1,
      marginTop: 6,
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
      color: theme.primary,
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
    categoryGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      justifyContent: 'space-between',
      rowGap: 8,
    },
    categoryButton: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: theme.surfaceTertiary,
      borderWidth: 1.5,
      borderColor: theme.borderLight,
      borderRadius: 12,
      paddingVertical: 10,
      width: '48.5%', // 2 columns (perfectly symmetrical for 10 items)
      justifyContent: 'center',
      gap: 6,
    },
    categoryButtonActive: {
      backgroundColor: theme.primary,
      borderColor: theme.primary,
    },
    categoryButtonText: {
      fontSize: 11,
      fontWeight: 'bold',
      color: theme.textSecondary,
    },
    categoryButtonTextActive: {
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
    unitSelector: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 6,
      flex: 1,
    },
    unitPill: {
      backgroundColor: theme.surfaceTertiary,
      borderWidth: 1,
      borderColor: theme.borderLight,
      borderRadius: 10,
      paddingVertical: 6,
      paddingHorizontal: 10,
    },
    unitPillActive: {
      backgroundColor: theme.primary,
      borderColor: theme.primary,
    },
    unitPillText: {
      fontSize: 11,
      color: theme.textSecondary,
      fontWeight: 'bold',
    },
    unitPillTextActive: {
      color: theme.primaryOnPrimary,
    },
    unitInput: {
      borderWidth: 1,
      borderColor: theme.borderLight,
      borderRadius: 8,
      paddingVertical: 4,
      paddingHorizontal: 8,
      fontSize: 11,
      width: 60,
      color: theme.textPrimary,
      backgroundColor: theme.surfaceSecondary,
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
    shelfDetailRow: {
      flexDirection: 'column',
      backgroundColor: theme.surfaceSecondary,
      borderWidth: 1.5,
      borderColor: theme.borderLight,
      borderRadius: 12,
      padding: 12,
      marginBottom: 8,
      gap: 10,
    },
    shelfDetailTopRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      width: '100%',
    },
    shelfDetailNameSection: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      flex: 1,
      marginRight: 8,
    },
    shelfDetailNameContainer: {
      flex: 1,
    },
    shelfDetailNameRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      flexWrap: 'wrap',
    },
    shelfDetailName: {
      fontSize: 15,
      fontWeight: 'bold',
      color: theme.textPrimary,
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
    shelfDetailMemo: {
      fontSize: 12,
      color: theme.textTertiary,
      marginTop: 2,
    },
    shelfDetailEditBtn: {
      backgroundColor: theme.primaryLight,
      borderRadius: 8,
      paddingVertical: 6,
      paddingHorizontal: 12,
    },
    shelfDetailEditBtnText: {
      fontSize: 11,
      fontWeight: 'bold',
      color: theme.primaryText,
    },
    shelfDetailBottomRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingTop: 8,
      borderTopWidth: 1,
      borderTopColor: theme.borderLight,
    },
    shelfDetailInfoBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      backgroundColor: theme.surface,
      paddingVertical: 4,
      paddingHorizontal: 8,
      borderRadius: 6,
      borderWidth: 1,
      borderColor: theme.borderLight,
    },
    expiryHighlightedBadge: {
      borderColor: theme.primaryBorder,
      backgroundColor: theme.primaryLight,
    },
    shelfDetailInfoLabel: {
      fontSize: 11,
      fontWeight: '600',
      color: theme.textMuted,
    },
    shelfDetailQuantity: {
      fontSize: 12,
      fontWeight: 'bold',
      color: theme.textSecondary,
    },
    shelfDetailExpiryDate: {
      fontSize: 11,
      color: theme.textTertiary,
    },
    shelfDetailExpiryDateHighlighted: {
      fontSize: 14,
      fontWeight: 'bold',
      color: theme.primaryText,
    },
    shelfDetailDDay: {
      fontSize: 11,
      fontWeight: 'bold',
      marginLeft: 2,
    },
    shelfDetailActions: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    shelfDetailDeleteBtn: {
      backgroundColor: theme.dangerLight,
      borderRadius: 8,
      paddingVertical: 6,
      paddingHorizontal: 10,
      justifyContent: 'center',
      alignItems: 'center',
    },
    shelfDetailDeleteBtnText: {
      fontSize: 12,
      fontWeight: 'bold',
      color: theme.danger,
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
