import React, { useState, useEffect } from 'react';
import { StyleSheet, TouchableOpacity, View, Text, Modal } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { FridgeType, Ingredient } from '../types';
import { SAMPLE_INGREDIENTS, CATEGORY_EMOJI } from './CompartmentDetail';

interface RefrigeratorVisualProps {
  type: FridgeType;
  onPressCompartment: (id: string, label: string) => void;
  onReset: () => void;
}

export default function RefrigeratorVisual({ type, onPressCompartment, onReset }: RefrigeratorVisualProps) {
  const [menuVisible, setMenuVisible] = useState(false);
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);

  useEffect(() => {
    const loadIngredients = async () => {
      try {
        const ingredientsStr = await AsyncStorage.getItem('@ingredients');
        if (ingredientsStr) {
          setIngredients(JSON.parse(ingredientsStr));
        } else {
          // pre-initialize with samples
          const allSamples = Object.values(SAMPLE_INGREDIENTS).flat();
          setIngredients(allSamples);
        }
      } catch (e) {
        console.error('Failed to load ingredients for visual', e);
      }
    };
    loadIngredients();
  }, []);

  const getCompartmentSummary = (compartmentId: string) => {
    const compIngredients = ingredients.filter(item => item.location === compartmentId);
    if (compIngredients.length === 0) {
      return '비어 있음 🍃';
    }
    const firstItem = compIngredients[0];
    const emoji = CATEGORY_EMOJI[firstItem.category] || '📦';
    if (compIngredients.length === 1) {
      return `${emoji} ${firstItem.name}`;
    }
    return `${emoji} ${firstItem.name} 외 ${compIngredients.length - 1}개`;
  };

  const handleResetFridge = () => {
    setMenuVisible(false);
    onReset();
  };

  // 각 냉장고 타입별 렌더링 헬퍼 함수
  const renderFourDoor = () => {
    return (
      <View style={styles.fridgeFrame}>
        {/* 상단 냉장실 */}
        <View style={styles.horizontalRow}>
          <TouchableOpacity
            style={[styles.door, styles.fridgeColor, styles.topLeftRadius]}
            activeOpacity={0.8}
            onPress={() => onPressCompartment('fridge_left', '냉장실 (좌)')}
          >
            <Text style={styles.doorLabel}>냉장실 (좌)</Text>
            <Text style={styles.doorCount}>{getCompartmentSummary('fridge_left')}</Text>
            <View style={[styles.handle, styles.verticalHandleRight]} />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.door, styles.fridgeColor, styles.topRightRadius]}
            activeOpacity={0.8}
            onPress={() => onPressCompartment('fridge_right', '냉장실 (우)')}
          >
            <Text style={styles.doorLabel}>냉장실 (우)</Text>
            <Text style={styles.doorCount}>{getCompartmentSummary('fridge_right')}</Text>
            <View style={[styles.handle, styles.verticalHandleLeft]} />
          </TouchableOpacity>
        </View>

        {/* 중간 구분선 */}
        <View style={styles.dividerLine} />

        {/* 하단 냉동실 좌/우 */}
        <View style={styles.horizontalRow}>
          <TouchableOpacity
            style={[styles.door, styles.freezerColor, styles.bottomLeftRadius]}
            activeOpacity={0.8}
            onPress={() => onPressCompartment('freezer_left', '냉동실 (좌)')}
          >
            <Text style={styles.doorLabel}>냉동실 (좌)</Text>
            <Text style={styles.doorCount}>{getCompartmentSummary('freezer_left')}</Text>
            <View style={[styles.handle, styles.verticalHandleRight]} />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.door, styles.freezerColor, styles.bottomRightRadius]}
            activeOpacity={0.8}
            onPress={() => onPressCompartment('freezer_right', '냉동실 (우)')}
          >
            <Text style={styles.doorLabel}>냉동실 (우)</Text>
            <Text style={styles.doorCount}>{getCompartmentSummary('freezer_right')}</Text>
            <View style={[styles.handle, styles.verticalHandleLeft]} />
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const renderSideBySide = () => {
    return (
      <View style={styles.fridgeFrame}>
        <View style={[styles.horizontalRow, { flex: 1 }]}>
          {/* 좌측 냉동실 */}
          <TouchableOpacity
            style={[styles.door, styles.freezerColor, styles.topLeftRadius, styles.bottomLeftRadius, { flex: 4 }]}
            activeOpacity={0.8}
            onPress={() => onPressCompartment('freezer', '냉동실')}
          >
            <Text style={styles.doorLabel}>냉동실</Text>
            <Text style={styles.doorCount}>{getCompartmentSummary('freezer')}</Text>
            <View style={[styles.handle, styles.verticalHandleRight]} />
          </TouchableOpacity>

          {/* 우측 냉장실 */}
          <TouchableOpacity
            style={[styles.door, styles.fridgeColor, styles.topRightRadius, styles.bottomRightRadius, { flex: 6 }]}
            activeOpacity={0.8}
            onPress={() => onPressCompartment('fridge', '냉장실')}
          >
            <Text style={styles.doorLabel}>냉장실</Text>
            <Text style={styles.doorCount}>{getCompartmentSummary('fridge')}</Text>
            <View style={[styles.handle, styles.verticalHandleLeft]} />
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const renderTwoDoor = () => {
    return (
      <View style={styles.fridgeFrame}>
        {/* 상단 냉동실 */}
        <TouchableOpacity
          style={[styles.door, styles.freezerColor, styles.topLeftRadius, styles.topRightRadius, { flex: 3.5, width: '100%' }]}
          activeOpacity={0.8}
          onPress={() => onPressCompartment('freezer', '냉동실')}
        >
          <Text style={styles.doorLabel}>냉동실</Text>
          <Text style={styles.doorCount}>{getCompartmentSummary('freezer')}</Text>
          <View style={[styles.handle, styles.horizontalHandleBottom]} />
        </TouchableOpacity>

        {/* 중간 구분선 */}
        <View style={styles.dividerLine} />

        {/* 하단 냉장실 */}
        <TouchableOpacity
          style={[styles.door, styles.fridgeColor, styles.bottomLeftRadius, styles.bottomRightRadius, { flex: 6.5, width: '100%' }]}
          activeOpacity={0.8}
          onPress={() => onPressCompartment('fridge', '냉장실')}
        >
          <Text style={styles.doorLabel}>냉장실</Text>
          <Text style={styles.doorCount}>{getCompartmentSummary('fridge')}</Text>
          <View style={[styles.handle, styles.horizontalHandleTop]} />
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {/* 상단 헤더 바 (구분선 없이 햄버거 버튼만 배치) */}
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

      {/* 냉장고 레이아웃 */}
      <View style={styles.fridgeWrapper}>
        {type === 'four-door' && renderFourDoor()}
        {type === 'side-by-side' && renderSideBySide()}
        {type === 'two-door' && renderTwoDoor()}
      </View>

      {/* 사이드 서랍 메뉴 모달 */}
      <Modal
        visible={menuVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setMenuVisible(false)}
      >
        <View style={styles.modalOverlay}>
          {/* 어두운 배경 (클릭 시 닫힘) */}
          <TouchableOpacity
            style={styles.backdrop}
            activeOpacity={1}
            onPress={() => setMenuVisible(false)}
          />

          {/* 우측 메뉴 패널 */}
          <View style={styles.drawerPanel}>
            <View style={styles.drawerHeader}>
              <Text style={styles.drawerTitle}>메뉴 ⚙️</Text>
              <TouchableOpacity onPress={() => setMenuVisible(false)} style={styles.closeButton}>
                <Text style={styles.closeButtonText}>✕</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.drawerBody}>
              <TouchableOpacity
                style={styles.menuItem}
                activeOpacity={0.7}
                onPress={handleResetFridge}
              >
                <Text style={styles.menuItemText}>🔄 냉장고 형태 변경하기</Text>
              </TouchableOpacity>

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
  fridgeWrapper: {
    flex: 1,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    paddingBottom: 40,
  },
  fridgeFrame: {
    width: '85%',
    height: '85%',
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
  selectColor: {
    backgroundColor: '#EDE7F6', // 연보라
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
    fontSize: 16,
    fontWeight: 'bold',
    color: '#37474F',
    marginBottom: 4,
  },
  doorCount: {
    fontSize: 12,
    color: '#757575',
    fontWeight: '600',
    backgroundColor: 'rgba(255, 255, 255, 0.6)',
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
    marginBottom: 32,
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
});
