import React, { useState, useEffect } from 'react';
import { StyleSheet, TouchableOpacity, View, Text, ScrollView, Platform, Alert, TextInput, Modal } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ingredient, IngredientCategory } from '../types';
import { useAuth } from '../context/AuthContext';
import { getFridgeLayout, updateCompartmentShelves } from '../api/fridgeService';
import { addIngredient, updateIngredient, deleteIngredient } from '../api/ingredientService';
import { serializeMemo, deserializeMemo } from '../utils/memoSerializer';

interface CompartmentDetailProps {
  compartmentId: string;
  compartmentLabel: string;
  onBack: () => void;
  fridgeId: string;
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

export default function CompartmentDetail({ compartmentId, compartmentLabel, onBack, fridgeId }: CompartmentDetailProps) {
  const { isLoggedIn } = useAuth();
  const [serverCompartmentId, setServerCompartmentId] = useState<number | null>(null);

  // 선반 동적 배열 상태 관리
  const [insideShelves, setInsideShelves] = useState<{ id: string; label: string }[]>([
    { id: 'shelf_1', label: '선반 1단' },
    { id: 'shelf_2', label: '선반 2단' },
    { id: 'shelf_3', label: '선반 3단' },
  ]);

  const [doorShelves, setDoorShelves] = useState<{ id: string; label: string }[]>([
    { id: 'pocket_1', label: '선반 1단' },
    { id: 'pocket_2', label: '선반 2단' },
  ]);

  // 해당 칸 식재료 상태 관리
  const [ingredients, setIngredients] = useState<Ingredient[]>(SAMPLE_INGREDIENTS[compartmentId] || []);

  // 문쪽 보관실 사용 여부 상태 관리
  const [hasDoorStorage, setHasDoorStorage] = useState(true);

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

  // 선반 구성 및 식재료 불러오기 (서버 vs 로컬 분기)
  useEffect(() => {
    const loadData = async () => {
      try {
        // 1. 선반 구성 불러오기 (비로그인 모드일 때만 로컬스토리지 활용)
        if (!isLoggedIn) {
          const configStr = await AsyncStorage.getItem(`@shelf_config_${fridgeId}_${compartmentId}`);
          if (configStr) {
            const config = JSON.parse(configStr);
            if (config.insideShelves) setInsideShelves(config.insideShelves);
            if (config.doorShelves) setDoorShelves(config.doorShelves);
            if (config.hasDoorStorage !== undefined) setHasDoorStorage(config.hasDoorStorage);
          } else {
            const config = { insideShelves: insideShelves, doorShelves: doorShelves, hasDoorStorage: hasDoorStorage };
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
              }
            }
            if (serverComp.doorShelves) {
              try {
                setDoorShelves(JSON.parse(serverComp.doorShelves));
              } catch (e) {
                console.error('Failed to parse doorShelves from server', e);
              }
            }
            if (serverComp.hasDoorStorage !== undefined) {
              setHasDoorStorage(serverComp.hasDoorStorage);
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
          } else if (layout.compartments.length > 0) {
            // 매칭 실패 시 첫 번째 구획 사용
            setServerCompartmentId(layout.compartments[0].id);
          }
        } else {
          // 로컬 로드
          const ingredientsStr = await AsyncStorage.getItem('@ingredients');
          if (ingredientsStr) {
            const allIngredients: Ingredient[] = JSON.parse(ingredientsStr);
            const filtered = allIngredients.filter(item => item.fridgeId === fridgeId && item.location === compartmentId);
            setIngredients(filtered);
          } else {
            const allSamples = Object.values(SAMPLE_INGREDIENTS).flat().map(item => ({ ...item, fridgeId }));
            await AsyncStorage.setItem('@ingredients', JSON.stringify(allSamples));
            setIngredients(SAMPLE_INGREDIENTS[compartmentId]?.map(item => ({ ...item, fridgeId })) || []);
          }
        }
      } catch (e) {
        console.error('Failed to load data', e);
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
      } else {
        const allSamples = Object.values(SAMPLE_INGREDIENTS).flat().map(item => ({ ...item, fridgeId }));
        allIngredients = allSamples;
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

    if (days < 0) return { text: `만료 D+${Math.abs(days)}`, color: '#FF5252' };
    if (days === 0) return { text: '오늘만료', color: '#FF9800' };
    if (days <= 3) return { text: `D-${days}`, color: '#FF9800' };
    return { text: `D-${days}`, color: '#4CAF50' };
  };

  // 개별 식재료 뱃지 렌더러 (상세 모달용 - 클릭 시 수정)
  const renderItemBadge = (item: Ingredient) => {
    const dDay = getDDayInfo(item.expiryDate);
    const emoji = CATEGORY_EMOJI[item.category] || '';
    
    return (
      <TouchableOpacity
        key={item.id}
        style={styles.itemBadge}
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

  // 개별 식재료 뱃지 프리뷰 렌더러 (선반 프리뷰용 - 단순 뷰)
  const renderItemBadgePreview = (item: Ingredient, shelfId: string, shelfLabel: string) => {
    const dDay = getDDayInfo(item.expiryDate);
    const emoji = CATEGORY_EMOJI[item.category] || '';
    
    return (
      <TouchableOpacity
        key={item.id}
        style={styles.itemBadge}
        activeOpacity={0.7}
        onPress={() => handleOpenShelfDetailModal(shelfId, shelfLabel)}
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
    <View style={styles.container}>
      {/* 상단 헤더 바 */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} activeOpacity={0.7} onPress={onBack}>
          <Text style={styles.backButtonText}>〈 뒤로가기</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{compartmentLabel} 내부</Text>
      </View>

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
                <View key={shelf.id} style={styles.shelf}>
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
                      scrollEnabled={true}
                    >
                      {getItemsBySubLocation(shelf.id).map(item => renderItemBadgePreview(item, shelf.id, shelf.label))}
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
                  <View key={shelf.id} style={styles.pocket}>
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
                        scrollEnabled={true}
                      >
                        {getItemsBySubLocation(shelf.id).map(item => renderItemBadgePreview(item, shelf.id, shelf.label))}
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

      {/* 식재료 등록/수정 모달 */}
      <Modal
        visible={modalVisible}
        transparent
        animationType="fade"
        onRequestClose={handleCloseAddEditModal}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            {/* 헤더 */}
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {modalMode === 'add' ? '식재료 등록' : '식재료 정보 및 수정'}
              </Text>
              <TouchableOpacity
                style={styles.modalCloseButton}
                onPress={handleCloseAddEditModal}
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
                style={[styles.footerButton, styles.buttonCancel]}
                onPress={handleCloseAddEditModal}
                activeOpacity={0.7}
              >
                <Text style={styles.buttonTextCancel}>취소</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.footerButton, styles.buttonSave]}
                onPress={handleSaveIngredient}
                activeOpacity={0.7}
              >
                <Text style={styles.buttonTextSave}>
                  {modalMode === 'add' ? '등록' : '수정 완료'}
                </Text>
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
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    width: '100%',
    backgroundColor: '#FAFAFA',
  },
  settingsBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#ECEFF1',
  },
  settingsLabel: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#455A64',
  },
  toggleGroup: {
    flexDirection: 'row',
    backgroundColor: '#F5F5F5',
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
    backgroundColor: '#3F51B5',
  },
  toggleButtonText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#90A4AE',
  },
  toggleButtonTextActive: {
    color: '#FFFFFF',
  },
  header: {
    width: '100%',
    height: 64,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    paddingHorizontal: 16,
    paddingBottom: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#ECEFF1',
  },
  backButton: {
    width: 80,
    justifyContent: 'center',
  },
  backButtonText: {
    fontSize: 14,
    color: '#3F51B5', // 미드나잇 블루 테마색
    fontWeight: 'bold',
  },
  headerTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: 'bold',
    color: '#37474F',
    textAlign: 'right',
  },
  body: {
    flex: 1,
    flexDirection: 'row',
    padding: 16,
  },
  sectionInside: {
    flex: 5.8,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#ECEFF1',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.03,
    shadowRadius: 8,
    elevation: 2,
  },
  sectionDoor: {
    flex: 4.2,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#ECEFF1',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.03,
    shadowRadius: 8,
    elevation: 2,
  },
  sectionHeaderInside: {
    paddingVertical: 12,
    paddingHorizontal: 14,
    backgroundColor: '#E3F2FD',
    borderBottomWidth: 1,
    borderBottomColor: '#BBDEFB',
  },
  sectionHeaderDoor: {
    paddingVertical: 12,
    paddingHorizontal: 14,
    backgroundColor: '#E0F7FA',
    borderBottomWidth: 1,
    borderBottomColor: '#B2EBF2',
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#37474F',
    textAlign: 'center',
  },
  shelfContainer: {
    flex: 1,
    backgroundColor: '#ECEFF1',
    padding: 8,
  },
  shelfScrollContent: {
    flex: 1,
    gap: 12,
    paddingBottom: 16,
  },
  shelf: {
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    borderBottomWidth: 5,
    borderBottomColor: '#CFD8DC',
    padding: 10,
    height: 160,
  },
  shelfHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  shelfLabel: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#78909C',
  },
  deleteButton: {
    padding: 4,
  },
  deleteButtonText: {
    fontSize: 12,
    color: '#B0BEC5',
    fontWeight: 'bold',
  },
  pocketContainer: {
    flex: 1,
    backgroundColor: '#ECEFF1',
    padding: 8,
  },
  pocketScrollContent: {
    flex: 1,
    gap: 12,
    paddingBottom: 16,
  },
  pocket: {
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    borderBottomWidth: 5,
    borderBottomColor: '#CFD8DC',
    padding: 10,
    height: 160,
  },
  pocketLabel: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#78909C',
  },
  itemBadge: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#FAFAFA',
    borderWidth: 1,
    borderColor: '#ECEFF1',
    borderRadius: 8,
    paddingVertical: 6,
    paddingHorizontal: 10,
    width: '100%',
    height: 34,
    marginBottom: 6,
  },
  itemText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#37474F',
    maxWidth: '65%',
  },
  itemDDay: {
    fontSize: 11,
    fontWeight: 'bold',
  },
  emptyText: {
    fontSize: 12,
    color: '#B0BEC5',
    textAlign: 'center',
    width: '100%',
    marginTop: 10,
  },
  addShelfButton: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#CFD8DC',
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
    color: '#78909C',
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
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#3F51B5',
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
    color: '#3F51B5',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    width: '95%',
    maxWidth: 500,
    maxHeight: '90%',
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    shadowColor: '#000',
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
    borderBottomColor: '#ECEFF1',
    paddingBottom: 12,
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#37474F',
  },
  modalCloseButton: {
    padding: 4,
  },
  modalCloseText: {
    fontSize: 18,
    color: '#78909C',
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
    color: '#546E7A',
    marginBottom: 6,
  },
  input: {
    borderWidth: 1.5,
    borderColor: '#CFD8DC',
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 12,
    fontSize: 14,
    color: '#37474F',
    backgroundColor: '#FAFAFA',
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
    backgroundColor: '#F5F5F5',
    borderWidth: 1.5,
    borderColor: '#ECEFF1',
    borderRadius: 12,
    paddingVertical: 10,
    width: '48.5%', // 2 columns (perfectly symmetrical for 10 items)
    justifyContent: 'center',
    gap: 6,
  },
  categoryButtonActive: {
    backgroundColor: '#3F51B5',
    borderColor: '#3F51B5',
  },
  categoryButtonText: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#546E7A',
  },
  categoryButtonTextActive: {
    color: '#FFFFFF',
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
    borderColor: '#CFD8DC',
    borderRadius: 10,
    backgroundColor: '#FAFAFA',
    overflow: 'hidden',
  },
  counterButton: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    backgroundColor: '#ECEFF1',
  },
  counterButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#37474F',
  },
  counterValue: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#37474F',
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
    backgroundColor: '#F5F5F5',
    borderWidth: 1,
    borderColor: '#ECEFF1',
    borderRadius: 10,
    paddingVertical: 6,
    paddingHorizontal: 10,
  },
  unitPillActive: {
    backgroundColor: '#3F51B5',
    borderColor: '#3F51B5',
  },
  unitPillText: {
    fontSize: 11,
    color: '#546E7A',
    fontWeight: 'bold',
  },
  unitPillTextActive: {
    color: '#FFFFFF',
  },
  unitInput: {
    borderWidth: 1,
    borderColor: '#CFD8DC',
    borderRadius: 8,
    paddingVertical: 4,
    paddingHorizontal: 8,
    fontSize: 11,
    width: 60,
    color: '#37474F',
    backgroundColor: '#FAFAFA',
    textAlign: 'center',
  },
  presetRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
  },
  presetButton: {
    flex: 1,
    backgroundColor: '#E8EAF6',
    borderRadius: 8,
    paddingVertical: 8,
    alignItems: 'center',
  },
  presetButtonText: {
    fontSize: 11,
    color: '#3F51B5',
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
    borderTopColor: '#ECEFF1',
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
    backgroundColor: '#ECEFF1',
  },
  buttonDelete: {
    backgroundColor: '#FF5252',
    marginRight: 'auto',
  },
  buttonSave: {
    backgroundColor: '#3F51B5',
  },
  buttonTextCancel: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#546E7A',
  },
  buttonTextDelete: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  buttonTextSave: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  shelfDetailRow: {
    flexDirection: 'column',
    backgroundColor: '#FAFAFA',
    borderWidth: 1.5,
    borderColor: '#ECEFF1',
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
    color: '#37474F',
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
    color: '#78909C',
    marginTop: 2,
  },
  shelfDetailEditBtn: {
    backgroundColor: '#E8EAF6',
    borderRadius: 8,
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  shelfDetailEditBtnText: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#3F51B5',
  },
  shelfDetailBottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#ECEFF1',
  },
  shelfDetailInfoBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FFFFFF',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#ECEFF1',
  },
  expiryHighlightedBadge: {
    borderColor: '#C5CAE9',
    backgroundColor: '#E8EAF6',
  },
  shelfDetailInfoLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#90A4AE',
  },
  shelfDetailQuantity: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#546E7A',
  },
  shelfDetailExpiryDate: {
    fontSize: 11,
    color: '#78909C',
  },
  shelfDetailExpiryDateHighlighted: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#3F51B5',
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
    backgroundColor: '#FFEBEE',
    borderRadius: 8,
    paddingVertical: 6,
    paddingHorizontal: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  shelfDetailDeleteBtnText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#FF5252',
  },
});
