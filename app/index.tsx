import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Modal, TouchableOpacity, Text, Alert, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { FridgeType, Ingredient } from '../src/types';
import RefrigeratorVisual from '../src/components/RefrigeratorVisual';
import CompartmentDetail from '../src/components/CompartmentDetail';
import SettingsView from '../src/components/SettingsView';
import RefrigeratorSelector from '../src/components/RefrigeratorSelector';
import { useAuth } from '../src/context/AuthContext';
import { getFridges, createFridge, deleteFridge, updateFridge, convertTypeToFrontend } from '../src/api/fridgeService';

export default function Index() {
  const { isLoggedIn, user, logout } = useAuth();
  const queryClient = useQueryClient();
  const router = useRouter();

  // 1. 네비게이션 및 활성 인덱스 상태
  const [activeTab, setActiveTab] = useState<'home' | 'settings'>('home');
  const [activeIndex, setActiveIndex] = useState(0);

  // 2. 냉장고 형태/추가 선택 모달 상태
  const [selectorVisible, setSelectorVisible] = useState(false);
  const [selectorMode, setSelectorMode] = useState<'add' | 'edit'>('add');

  // 3. 로컬 모드 냉장고 목록 상태
  const [localRefrigerators, setLocalRefrigerators] = useState<{ id: string; type: FridgeType; name: string }[]>([]);
  const [activeCompartment, setActiveCompartment] = useState<{ id: string; label: string; fridgeId: string } | null>(null);

  // 4. 서버 모드 냉장고 목록 조회 (로그인 시에만 활성화)
  const { data: serverFridges } = useQuery({
    queryKey: ['fridges'],
    queryFn: getFridges,
    enabled: isLoggedIn,
  });

  // 로그인 여부에 따라 최종 노출할 냉장고 배열 결정
  const refrigerators = isLoggedIn && Array.isArray(serverFridges)
    ? serverFridges.map(f => ({
        id: String(f.id),
        type: convertTypeToFrontend(f.type),
        name: f.name,
      }))
    : localRefrigerators;

  // 앱 로드 시 로컬 저장소에서 냉장고 목록 불러오기 (로컬 백업 보존)
  useEffect(() => {
    const loadLocalRefrigerators = async () => {
      try {
        const stored = await AsyncStorage.getItem('@refrigerators');
        if (stored) {
          setLocalRefrigerators(JSON.parse(stored));
        }
      } catch (e) {
        console.error('Failed to load local refrigerators', e);
      }
    };
    loadLocalRefrigerators();
  }, []);

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

  // 새 냉장고 추가 (최대 3개 제한)
  const handleAddFridge = async (type: FridgeType) => {
    if (refrigerators.length >= 3) return;

    if (isLoggedIn) {
      try {
        await createFridge(`냉장고 ${refrigerators.length + 1}`, type);
        queryClient.invalidateQueries({ queryKey: ['fridges'] });
      } catch (e) {
        console.error('Failed to add refrigerator on server', e);
      }
    } else {
      try {
        const newFridge = {
          id: `fridge_${Date.now()}`,
          type,
          name: `냉장고 ${refrigerators.length + 1}`
        };
        const updated = [...localRefrigerators, newFridge];
        setLocalRefrigerators(updated);
        await AsyncStorage.setItem('@refrigerators', JSON.stringify(updated));
      } catch (e) {
        console.error('Failed to add local refrigerator', e);
      }
    }
  };

  // 기존 냉장고의 타입 변경
  const handleChangeFridgeType = async (fridgeId: string, newType: FridgeType) => {
    if (isLoggedIn) {
      try {
        const target = refrigerators.find(f => f.id === fridgeId);
        if (target) {
          await updateFridge(Number(fridgeId), target.name, newType);
          queryClient.invalidateQueries({ queryKey: ['fridges'] });
        }
      } catch (e) {
        console.error('Failed to change refrigerator type on server', e);
      }
    } else {
      try {
        const updated = localRefrigerators.map(f => f.id === fridgeId ? { ...f, type: newType } : f);
        setLocalRefrigerators(updated);
        await AsyncStorage.setItem('@refrigerators', JSON.stringify(updated));
      } catch (e) {
        console.error('Failed to change local refrigerator type', e);
      }
    }
  };

  // 냉장고 삭제 및 해당 냉장고의 식재료 제거
  const handleDeleteFridge = async (fridgeId: string) => {
    if (isLoggedIn) {
      try {
        await deleteFridge(Number(fridgeId));
        queryClient.invalidateQueries({ queryKey: ['fridges'] });
      } catch (e) {
        console.error('Failed to delete refrigerator on server', e);
      }
    } else {
      try {
        const updated = localRefrigerators.filter(f => f.id !== fridgeId);
        const renamed = updated.map((f, i) => ({ ...f, name: `냉장고 ${i + 1}` }));
        setLocalRefrigerators(renamed);
        await AsyncStorage.setItem('@refrigerators', JSON.stringify(renamed));

        const ingredientsStr = await AsyncStorage.getItem('@ingredients');
        if (ingredientsStr) {
          const allIngredients: Ingredient[] = JSON.parse(ingredientsStr);
          const filtered = allIngredients.filter(item => item.fridgeId !== fridgeId);
          await AsyncStorage.setItem('@ingredients', JSON.stringify(filtered));
        }
      } catch (e) {
        console.error('Failed to delete local refrigerator', e);
      }
    }
  };

  // 냉장고 삭제 확인 알림
  const handleDeleteConfirm = () => {
    if (!activeFridge) return;
    const performDelete = () => {
      handleDeleteFridge(activeFridge.id);
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

  // 냉장고 추가 모달 활성화
  const handleOpenAddSelector = () => {
    if (!isLoggedIn) {
      router.push('/login');
    } else {
      setSelectorMode('add');
      setSelectorVisible(true);
    }
  };

  // 냉장고 타입 변경 모달 활성화
  const handleOpenEditSelector = () => {
    if (!activeFridge) return;
    setSelectorMode('edit');
    setSelectorVisible(true);
  };

  const handlePressCompartment = (id: string, label: string, fridgeId: string) => {
    setActiveCompartment({ id, label, fridgeId });
  };

  return (
    <SafeAreaView style={styles.container}>
      {activeCompartment !== null ? (
        <CompartmentDetail
          compartmentId={activeCompartment.id}
          compartmentLabel={activeCompartment.label}
          onBack={() => setActiveCompartment(null)}
          fridgeId={activeCompartment.fridgeId}
        />
      ) : (
        <View style={styles.mainWrapper}>
          {/* 상단 탭 콘텐츠 */}
          <View style={styles.contentWrapper}>
            {activeTab === 'home' ? (
              <RefrigeratorVisual
                refrigerators={refrigerators}
                onPressCompartment={handlePressCompartment}
                activeIndex={activeIndex}
                setActiveIndex={setActiveIndex}
                onOpenAddSelector={handleOpenAddSelector}
              />
            ) : (
              <SettingsView
                activeFridge={activeFridge}
                onEditFridgeType={handleOpenEditSelector}
                onDeleteFridge={handleDeleteConfirm}
                isLoggedIn={isLoggedIn}
                user={user}
                onLogout={logout}
                onLogin={() => router.push('/login')}
              />
            )}
          </View>

          {/* 하단 탭 바 (Bottom Navigation Bar) */}
          <View style={styles.tabBar}>
            <TouchableOpacity
              style={styles.tabItem}
              activeOpacity={0.7}
              onPress={() => setActiveTab('home')}
            >
              <Ionicons
                name={activeTab === 'home' ? 'home' : 'home-outline'}
                size={22}
                color={activeTab === 'home' ? '#4F46E5' : '#94A3B8'}
              />
              <Text style={[styles.tabLabel, activeTab === 'home' && styles.tabLabelActive]}>
                홈
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.tabItem}
              activeOpacity={0.7}
              onPress={() => setActiveTab('settings')}
            >
              <Ionicons
                name={activeTab === 'settings' ? 'settings' : 'settings-outline'}
                size={22}
                color={activeTab === 'settings' ? '#4F46E5' : '#94A3B8'}
              />
              <Text style={[styles.tabLabel, activeTab === 'settings' && styles.tabLabelActive]}>
                설정
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* 냉장고 선택/추가 바텀 시트 */}
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
                {selectorMode === 'add' ? '냉장고 추가 등록' : '냉장고 형태 수정'}
              </Text>
              <TouchableOpacity onPress={() => setSelectorVisible(false)} style={styles.selectorCloseButton}>
                <Text style={styles.selectorCloseButtonText}>✕</Text>
              </TouchableOpacity>
            </View>
            <RefrigeratorSelector
              onSelect={(selectedType) => {
                if (selectorMode === 'add') {
                  handleAddFridge(selectedType);
                } else if (activeFridge) {
                  handleChangeFridgeType(activeFridge.id, selectedType);
                }
                setSelectorVisible(false);
              }}
            />
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAFAFA',
  },
  mainWrapper: {
    flex: 1,
  },
  contentWrapper: {
    flex: 1,
  },
  tabBar: {
    height: 64,
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingBottom: Platform.OS === 'ios' ? 8 : 4,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.04,
    shadowRadius: 10,
    elevation: 8,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6,
  },
  tabLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#94A3B8',
    marginTop: 4,
  },
  tabLabelActive: {
    color: '#4F46E5',
  },
  selectorModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.45)',
    justifyContent: 'flex-end',
  },
  backdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  selectorModalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '90%',
    paddingBottom: 24,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: -10 },
    shadowOpacity: 0.08,
    shadowRadius: 24,
    elevation: 24,
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
});
