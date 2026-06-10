import React, { useState, useEffect } from 'react';
import { StyleSheet, TouchableOpacity, View, Text, Modal, ScrollView, useWindowDimensions, Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import { FridgeType, Ingredient } from '../types';
import { SAMPLE_INGREDIENTS, CATEGORY_EMOJI } from './CompartmentDetail';
import RefrigeratorSelector from './RefrigeratorSelector';
import { useAuth } from '../context/AuthContext';
import { getFridgeLayout } from '../api/fridgeService';
import { deserializeMemo, convertServerLocationToLocal } from '../utils/memoSerializer';

interface RefrigeratorVisualProps {
  refrigerators: { id: string; type: FridgeType; name: string }[];
  onPressCompartment: (id: string, label: string, fridgeId: string) => void;
  onAddFridge: (type: FridgeType) => void;
  onChangeFridgeType: (fridgeId: string, type: FridgeType) => void;
  onDeleteFridge: (fridgeId: string) => void;
}

export default function RefrigeratorVisual({
  refrigerators,
  onPressCompartment,
  onAddFridge,
  onChangeFridgeType,
  onDeleteFridge
}: RefrigeratorVisualProps) {
  const { width: screenWidth } = useWindowDimensions();
  const router = useRouter();
  const { isLoggedIn, user, logout } = useAuth();
  const [menuVisible, setMenuVisible] = useState(false);
  const [selectorVisible, setSelectorVisible] = useState(false);
  const [selectorMode, setSelectorMode] = useState<'add' | 'edit'>('add');
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);

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
            if (!layout) return;
            const fridge = refrigerators[index];
            layout.compartments.forEach(comp => {
              comp.ingredients.forEach(ing => {
                // 백엔드 memo 필드 파싱 (카테고리 및 선반정보 역직렬화)
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
  }, [menuVisible, refrigerators, isLoggedIn]);

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

  // 냉장고 삭제 처리 및 안내 팝업
  const handleDeleteConfirm = () => {
    if (!activeFridge) return;
    const performDelete = () => {
      onDeleteFridge(activeFridge.id);
      setMenuVisible(false);
      // 삭제 후 첫 페이지로 자동 이동 (인덱스 보정)
      setActiveIndex(0);
    };

    Alert.alert(
      '냉장고 삭제 ❌',
      `[${activeFridge.name}]와 보관 중인 모든 식재료 데이터가 함께 영구 삭제됩니다. 삭제하시겠습니까?`,
      [
        { text: '취소', style: 'cancel' },
        { text: '삭제', style: 'destructive', onPress: performDelete }
      ]
    );
  };

  // 냉장고 타입 변경 처리
  const handleEditFridgeType = () => {
    if (!activeFridge) return;
    setSelectorMode('edit');
    setMenuVisible(false);
    setTimeout(() => {
      setSelectorVisible(true);
    }, 100);
  };

  // 냉장고 추가 모드 활성화
  const handleOpenAddSelector = () => {
    if (!isLoggedIn) {
      router.push('/login');
    } else {
      setSelectorMode('add');
      setSelectorVisible(true);
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
      {/* 상단 헤더 바 */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.hamburgerButton}
          activeOpacity={0.7}
          onPress={() => setMenuVisible(true)}
        >
          <View style={styles.hamburgerLine} />
          <View style={styles.hamburgerLine} />
          <View style={styles.hamburgerLine} />
        </TouchableOpacity>
      </View>

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
                    onPress={handleOpenAddSelector}
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
                <Text style={styles.fridgeNameTitle}>{fridge.name}</Text>
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

      {/* 냉장고 설정 모달 (바텀 시트 스타일) */}
      <Modal
        visible={selectorVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setSelectorVisible(false)}
      >
        <View style={styles.selectorModalOverlay}>
          <TouchableOpacity
            style={styles.backdrop}
            activeOpacity={1}
            onPress={() => setSelectorVisible(false)}
          />
          <View style={styles.selectorModalContent}>
            <View style={styles.selectorModalHeader}>
              <Text style={styles.selectorModalTitle}>
                {selectorMode === 'add' ? '냉장고 추가 등록' : `냉장고 형태 수정`}
              </Text>
              <TouchableOpacity onPress={() => setSelectorVisible(false)} style={styles.selectorCloseButton}>
                <Text style={styles.selectorCloseButtonText}>✕</Text>
              </TouchableOpacity>
            </View>
            <RefrigeratorSelector
              onSelect={(selectedType) => {
                if (selectorMode === 'add') {
                  onAddFridge(selectedType);
                } else if (activeFridge) {
                  onChangeFridgeType(activeFridge.id, selectedType);
                }
                setSelectorVisible(false);
              }}
            />
          </View>
        </View>
      </Modal>

      {/* 사이드 서랍 메뉴 모달 */}
      <Modal
        visible={menuVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setMenuVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <TouchableOpacity
            style={styles.backdrop}
            activeOpacity={1}
            onPress={() => setMenuVisible(false)}
          />

          <View style={styles.drawerPanel}>
            <View style={styles.drawerHeader}>
              <Text style={styles.drawerTitle}>메뉴 ⚙️</Text>
              <TouchableOpacity onPress={() => setMenuVisible(false)} style={styles.closeButton}>
                <Text style={styles.closeButtonText}>✕</Text>
              </TouchableOpacity>
            </View>

             <View style={styles.drawerBody}>
              {/* 사용자 인증 연동 */}
              {isLoggedIn && (
                <>
                  <View style={styles.userContainer}>
                    <View style={styles.userProfile}>
                      <Text style={styles.userEmoji}>👤</Text>
                      <View>
                        <Text style={styles.userName}>{user?.name || '사용자'}님</Text>
                        <Text style={styles.userEmail}>{user?.email || ''}</Text>
                      </View>
                    </View>
                    <TouchableOpacity
                      style={[styles.menuItem, { marginTop: 8 }]}
                      activeOpacity={0.7}
                      onPress={async () => {
                        setMenuVisible(false);
                        await logout();
                      }}
                    >
                      <Text style={styles.menuItemText}>🔓 로그아웃</Text>
                    </TouchableOpacity>
                  </View>
                  <View style={styles.drawerDivider} />
                </>
              )}

              {activeFridge ? (
                <>
                  <Text style={styles.drawerSectionLabel}>{activeFridge.name} 설정</Text>
                  <TouchableOpacity
                    style={styles.menuItem}
                    activeOpacity={0.7}
                    onPress={handleEditFridgeType}
                  >
                    <Text style={styles.menuItemText}>🔄 현재 냉장고 타입 변경하기</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.menuItem, { borderColor: '#FFCDD2', backgroundColor: '#FFEBEE' }]}
                    activeOpacity={0.7}
                    onPress={handleDeleteConfirm}
                  >
                    <Text style={[styles.menuItemText, { color: '#D32F2F' }]}>❌ 현재 냉장고 삭제하기</Text>
                  </TouchableOpacity>
                </>
              ) : (
                <Text style={styles.drawerSectionLabel}>선택된 냉장고가 없습니다</Text>
              )}

              <View style={styles.drawerDivider} />

              <TouchableOpacity style={[styles.menuItem, styles.disabledMenuItem]} activeOpacity={1}>
                <Text style={styles.menuItemTextDisabled}>📦 식재료 전체보기 (준비중)</Text>
              </TouchableOpacity>

              <TouchableOpacity style={[styles.menuItem, styles.disabledMenuItem]} activeOpacity={1}>
                <Text style={styles.menuItemTextDisabled}>🔔 유통기한 알림설정 (준비중)</Text>
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
  header: {
    width: '100%',
    height: 64,
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'flex-end',
    paddingHorizontal: 20,
    paddingBottom: 8,
    backgroundColor: 'transparent',
  },
  hamburgerButton: {
    width: 24,
    height: 16,
    justifyContent: 'space-between',
  },
  hamburgerLine: {
    width: '100%',
    height: 2,
    backgroundColor: '#37474F',
    borderRadius: 1,
  },
  carouselWrapper: {
    flex: 1,
    width: '100%',
  },
  slideContainer: {
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    paddingBottom: 24,
  },
  fridgeNameTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#37474F',
    marginBottom: 20,
    textAlign: 'center',
  },
  fridgeFrame: {
    width: '85%',
    height: '80%',
    maxHeight: 520,
    backgroundColor: '#37474F', // 진회색 메탈릭 외곽 프레임
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
  selectorModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  selectorModalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '90%',
    paddingBottom: 24,
  },
  selectorModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 18,
    borderBottomWidth: 1,
    borderBottomColor: '#ECEFF1',
  },
  selectorModalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#37474F',
  },
  selectorCloseButton: {
    padding: 6,
  },
  selectorCloseButtonText: {
    fontSize: 20,
    color: '#757575',
    fontWeight: 'bold',
  },
  modalOverlay: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  backdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
  },
  drawerPanel: {
    width: '70%',
    height: '100%',
    backgroundColor: '#FFFFFF',
    padding: 24,
    paddingTop: 50,
    shadowColor: '#000',
    shadowOffset: { width: -5, height: 0 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 16,
  },
  drawerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
    borderBottomWidth: 1,
    borderBottomColor: '#ECEFF1',
    paddingBottom: 16,
  },
  drawerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#37474F',
  },
  closeButton: {
    padding: 6,
  },
  closeButtonText: {
    fontSize: 20,
    color: '#757575',
  },
  drawerBody: {
    gap: 16,
  },
  drawerSectionLabel: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#78909C',
    marginBottom: -4,
  },
  drawerDivider: {
    height: 1,
    backgroundColor: '#ECEFF1',
    marginVertical: 8,
  },
  menuItem: {
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 12,
    backgroundColor: '#F5F5F5',
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  disabledMenuItem: {
    backgroundColor: '#FAFAFA',
    borderColor: '#ECEFF1',
    opacity: 0.6,
  },
  menuItemText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#37474F',
  },
  menuItemTextDisabled: {
    fontSize: 14,
    fontWeight: '600',
    color: '#9E9E9E',
  },
  userContainer: {
    padding: 4,
    marginBottom: 4,
  },
  userProfile: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 8,
  },
  userEmoji: {
    fontSize: 22,
    backgroundColor: '#F1F5F9',
    padding: 6,
    borderRadius: 18,
    overflow: 'hidden',
    textAlign: 'center',
  },
  userName: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#1E293B',
  },
  userEmail: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  loginGuide: {
    fontSize: 12,
    color: '#64748B',
    marginBottom: 10,
    lineHeight: 18,
  },
  loginButton: {
    backgroundColor: '#6366F1',
    borderColor: '#4F46E5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  loginButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});
