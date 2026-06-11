import React, { useEffect, useState } from 'react';
import { StyleSheet, TouchableOpacity, View, Text, ScrollView, useWindowDimensions } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { FridgeType, Ingredient } from '../types';
import { SAMPLE_INGREDIENTS, CATEGORY_EMOJI } from './CompartmentDetail';
import { useAuth } from '../context/AuthContext';
import { getFridgeLayout } from '../api/fridgeService';
import { deserializeMemo, convertServerLocationToLocal } from '../utils/memoSerializer';

interface RefrigeratorVisualProps {
  refrigerators: { id: string; type: FridgeType; name: string }[];
  onPressCompartment: (id: string, label: string, fridgeId: string) => void;
  activeIndex: number;
  setActiveIndex: (index: number) => void;
  onOpenAddSelector: () => void;
  onOpenRenameModal: () => void;
}

export default function RefrigeratorVisual({
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
      <View style={styles.fridgeFrame}>
        {/* 상단 냉장실 */}
        <View style={styles.horizontalRow}>
          <TouchableOpacity
            style={[styles.door, styles.fridgeColor, styles.topLeftRadius]}
            activeOpacity={0.8}
            onPress={() => onPressCompartment('fridge_left', '냉장실 (좌)', fridgeId)}
          >
            <Text style={styles.doorLabel}>냉장실 (좌)</Text>
            <Text style={styles.doorCount}>{getCompartmentSummary(fridgeId, 'fridge_left')}</Text>
            <View style={[styles.handle, styles.verticalHandleRight]} />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.door, styles.fridgeColor, styles.topRightRadius]}
            activeOpacity={0.8}
            onPress={() => onPressCompartment('fridge_right', '냉장실 (우)', fridgeId)}
          >
            <Text style={styles.doorLabel}>냉장실 (우)</Text>
            <Text style={styles.doorCount}>{getCompartmentSummary(fridgeId, 'fridge_right')}</Text>
            <View style={[styles.handle, styles.verticalHandleLeft]} />
          </TouchableOpacity>
        </View>

        {/* 중간 구분선 */}
        <View style={styles.dividerLine} />

        {/* 하단 냉동실 */}
        <View style={styles.horizontalRow}>
          <TouchableOpacity
            style={[styles.door, styles.freezerColor, styles.bottomLeftRadius]}
            activeOpacity={0.8}
            onPress={() => onPressCompartment('freezer_left', '냉동실 (좌)', fridgeId)}
          >
            <Text style={styles.doorLabel}>냉동실 (좌)</Text>
            <Text style={styles.doorCount}>{getCompartmentSummary(fridgeId, 'freezer_left')}</Text>
            <View style={[styles.handle, styles.verticalHandleRight]} />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.door, styles.freezerColor, styles.bottomRightRadius]}
            activeOpacity={0.8}
            onPress={() => onPressCompartment('freezer_right', '냉동실 (우)', fridgeId)}
          >
            <Text style={styles.doorLabel}>냉동실 (우)</Text>
            <Text style={styles.doorCount}>{getCompartmentSummary(fridgeId, 'freezer_right')}</Text>
            <View style={[styles.handle, styles.verticalHandleLeft]} />
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const renderSideBySide = (fridgeId: string) => {
    return (
      <View style={styles.fridgeFrame}>
        <View style={[styles.horizontalRow, { flex: 1 }]}>
          {/* 좌측 냉동실 */}
          <TouchableOpacity
            style={[styles.door, styles.freezerColor, styles.topLeftRadius, styles.bottomLeftRadius, { flex: 4 }]}
            activeOpacity={0.8}
            onPress={() => onPressCompartment('freezer', '냉동실', fridgeId)}
          >
            <Text style={styles.doorLabel}>냉동실</Text>
            <Text style={styles.doorCount}>{getCompartmentSummary(fridgeId, 'freezer')}</Text>
            <View style={[styles.handle, styles.verticalHandleRight]} />
          </TouchableOpacity>

          {/* 우측 냉장실 */}
          <TouchableOpacity
            style={[styles.door, styles.fridgeColor, styles.topRightRadius, styles.bottomRightRadius, { flex: 6 }]}
            activeOpacity={0.8}
            onPress={() => onPressCompartment('fridge', '냉장실', fridgeId)}
          >
            <Text style={styles.doorLabel}>냉장실</Text>
            <Text style={styles.doorCount}>{getCompartmentSummary(fridgeId, 'fridge')}</Text>
            <View style={[styles.handle, styles.verticalHandleLeft]} />
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const renderTwoDoor = (fridgeId: string) => {
    return (
      <View style={styles.fridgeFrame}>
        {/* 상단 냉동실 */}
        <TouchableOpacity
          style={[styles.door, styles.freezerColor, styles.topLeftRadius, styles.topRightRadius, { flex: 3.5, width: '100%' }]}
          activeOpacity={0.8}
          onPress={() => onPressCompartment('freezer', '냉동실', fridgeId)}
        >
          <Text style={styles.doorLabel}>냉동실</Text>
          <Text style={styles.doorCount}>{getCompartmentSummary(fridgeId, 'freezer')}</Text>
          <View style={[styles.handle, styles.horizontalHandleBottom]} />
        </TouchableOpacity>

        {/* 중간 구분선 */}
        <View style={styles.dividerLine} />

        {/* 하단 냉장실 */}
        <TouchableOpacity
          style={[styles.door, styles.fridgeColor, styles.bottomLeftRadius, styles.bottomRightRadius, { flex: 6.5, width: '100%' }]}
          activeOpacity={0.8}
          onPress={() => onPressCompartment('fridge', '냉장실', fridgeId)}
        >
          <Text style={styles.doorLabel}>냉장실</Text>
          <Text style={styles.doorCount}>{getCompartmentSummary(fridgeId, 'fridge')}</Text>
          <View style={[styles.handle, styles.horizontalHandleTop]} />
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {/* 가로 슬라이더(Carousel) 영역 */}
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
                    style={styles.addFridgeBox}
                    activeOpacity={0.8}
                    onPress={onOpenAddSelector}
                  >
                    <View style={styles.addIconCircle}>
                      <Text style={styles.addIconText}>+</Text>
                    </View>
                    <Text style={styles.addFridgeTitle}>냉장고 추가</Text>
                    <Text style={styles.addFridgeDesc}>새로운 냉장고 타입을 설정하고 관리를 시작하세요 (최대 3대)</Text>
                  </TouchableOpacity>
                </View>
              );
            }

            const fridge = page.data;
            return (
              <View key={fridge.id} style={[styles.slideContainer, { width: screenWidth }]}>
                <View style={styles.fridgeNameContainer}>
                  <Text style={styles.fridgeNameTitle}>{fridge.name}</Text>
                  <TouchableOpacity
                    style={styles.pencilIconButton}
                    activeOpacity={0.7}
                    onPress={onOpenRenameModal}
                  >
                    <Ionicons name="pencil-sharp" size={16} color="#37474F" />
                  </TouchableOpacity>
                </View>
                {fridge.type === 'four-door' && renderFourDoor(fridge.id)}
                {fridge.type === 'side-by-side' && renderSideBySide(fridge.id)}
                {fridge.type === 'two-door' && renderTwoDoor(fridge.id)}
              </View>
            );
          })}
        </ScrollView>
      </View>

      {/* 페이지 도트 인디케이터 */}
      {pages.length > 1 && (
        <View style={styles.indicatorContainer}>
          {pages.map((_, i) => (
            <View
              key={i}
              style={{
                ...styles.indicatorDot,
                ...(activeIndex === i ? styles.indicatorDotActive : {}),
              }}
            />
          ))}
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
    paddingBottom: 80,
  },
  carouselWrapper: {
    flex: 1,
    width: '100%',
  },
  slideContainer: {
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 48,
    paddingBottom: 24,
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
  fridgeFrame: {
    width: '85%',
    height: '80%',
    maxHeight: 520,
    backgroundColor: '#37474F', // 진회색 외곽 프레임
    borderRadius: 20,
    padding: 8,
    gap: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 8,
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
    backgroundColor: '#B0BEC5', // 메탈릭 실버 핸들
    borderRadius: 2,
  },
  verticalHandleLeft: {
    width: 6,
    height: '40%',
    left: 8,
    top: '30%',
  },
  verticalHandleRight: {
    width: 6,
    height: '40%',
    right: 8,
    top: '30%',
  },
  horizontalHandleTop: {
    height: 6,
    width: '40%',
    top: 8,
    left: '30%',
  },
  horizontalHandleBottom: {
    height: 6,
    width: '40%',
    bottom: 8,
    left: '30%',
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
    width: '85%',
    height: '80%',
    maxHeight: 520,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    borderWidth: 2,
    borderColor: '#3F51B5',
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
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
});
