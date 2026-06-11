import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Modal, TouchableOpacity, Text, Alert, Platform, TextInput, KeyboardAvoidingView, ActivityIndicator, useColorScheme } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SplashScreen from 'expo-splash-screen';
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
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  const splashTheme = {
    background: isDark ? '#000000' : '#FFFFFF',
    text: isDark ? '#FFFFFF' : '#0F172A',
    subText: isDark ? '#94A3B8' : '#64748B',
    icon: isDark ? '#38BDF8' : '#4F46E5',
    spinner: isDark ? '#FFFFFF' : '#4F46E5',
  };

  // 1. 네비게이션 및 활성 인덱스 상태
  const [activeTab, setActiveTab] = useState<'home' | 'settings'>('home');
  const [activeIndex, setActiveIndex] = useState(0);

  // 2. 냉장고 형태/추가 선택 모달 상태
  const [selectorVisible, setSelectorVisible] = useState(false);
  const [selectorMode, setSelectorMode] = useState<'add' | 'edit'>('add');

  // 2.5. 냉장고 이름 변경 모달 상태
  const [renameModalVisible, setRenameModalVisible] = useState(false);
  const [renameValue, setRenameValue] = useState('');

  // 3. 로컬 모드 냉장고 목록 상태
  const [localRefrigerators, setLocalRefrigerators] = useState<{ id: string; type: FridgeType; name: string }[]>([]);
  const [isLocalLoading, setIsLocalLoading] = useState(true);
  const [activeCompartment, setActiveCompartment] = useState<{ id: string; label: string; fridgeId: string } | null>(null);

  // 4. 서버 모드 냉장고 목록 조회 (로그인 시에만 활성화)
  const { data: serverFridges, isLoading: isServerLoading } = useQuery({
    queryKey: ['fridges'],
    queryFn: getFridges,
    enabled: isLoggedIn,
  });

  // 로그인 여부에 따라 로딩 상태 도출
  const isRefrigeratorsLoading = isLoggedIn
    ? isServerLoading
    : isLocalLoading;

  // 스플래시 스크린 최소 노출 시간을 위한 상태 (1.5초)
  const [isMinTimeElapsed, setIsMinTimeElapsed] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsMinTimeElapsed(true);
    }, 1500); // 1.5초 강제 대기
    return () => clearTimeout(timer);
  }, []);

  // 냉장고 목록 로딩 완료 및 최소 노출 시간 경과 시 스플래시 스크린 숨김 처리
  useEffect(() => {
    if (!isRefrigeratorsLoading && isMinTimeElapsed) {
      const hideSplash = async () => {
        try {
          await SplashScreen.hideAsync();
        } catch (e) {
          // 이미 닫혔거나 에러 발생 시 무시
        }
      };
      hideSplash();
    }
  }, [isRefrigeratorsLoading, isMinTimeElapsed]);

  // 스플래시 오버레이를 띄울지 여부 (로딩 중이거나 최소 시간이 지나지 않았을 때)
  const showSplashOverlay = isRefrigeratorsLoading || !isMinTimeElapsed;

  // 로그인 여부에 따라 최종 노출할 냉장고 배열 결정
  const refrigerators = React.useMemo(() => {
    return isLoggedIn && Array.isArray(serverFridges)
      ? serverFridges.map(f => ({
          id: String(f.id),
          type: convertTypeToFrontend(f.type),
          name: f.name,
        }))
      : localRefrigerators;
  }, [isLoggedIn, serverFridges, localRefrigerators]);

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
      } finally {
        setIsLocalLoading(false);
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

  const isSaveDisabled = renameValue.trim() === '' || renameValue === (activeFridge?.name || '');

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

  // 기존 냉장고의 이름 변경
  const handleRenameFridge = async (fridgeId: string, newName: string) => {
    const trimmedName = newName.trim();
    if (!trimmedName) {
      Alert.alert('경고 ⚠️', '냉장고 이름을 입력해 주세요.');
      return;
    }
    if (trimmedName.length > 20) {
      Alert.alert('경고 ⚠️', '냉장고 이름은 최대 20자까지 설정 가능합니다.');
      return;
    }

    if (isLoggedIn) {
      try {
        const target = refrigerators.find(f => f.id === fridgeId);
        if (target) {
          await updateFridge(Number(fridgeId), trimmedName, target.type);
          queryClient.invalidateQueries({ queryKey: ['fridges'] });
        }
      } catch (e) {
        console.error('Failed to rename refrigerator on server', e);
      }
    } else {
      try {
        const updated = localRefrigerators.map(f => f.id === fridgeId ? { ...f, name: trimmedName } : f);
        setLocalRefrigerators(updated);
        await AsyncStorage.setItem('@refrigerators', JSON.stringify(updated));
      } catch (e) {
        console.error('Failed to rename local refrigerator', e);
      }
    }
    setRenameModalVisible(false);
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

  // 냉장고 이름 변경 모달 활성화
  const handleOpenRenameModal = () => {
    if (!activeFridge) return;
    setRenameValue(activeFridge.name);
    setRenameModalVisible(true);
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
                onOpenRenameModal={handleOpenRenameModal}
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
          <View style={styles.tabBarContainer}>
            <View style={styles.tabBar}>
              <TouchableOpacity
                style={[styles.tabItem, activeTab === 'home' && styles.tabItemActive]}
                activeOpacity={0.7}
                onPress={() => setActiveTab('home')}
              >
                <Ionicons
                  name={activeTab === 'home' ? 'home' : 'home-outline'}
                  size={24}
                  color={activeTab === 'home' ? '#FFFFFF' : '#64748B'}
                />
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.tabItem, activeTab === 'settings' && styles.tabItemActive]}
                activeOpacity={0.7}
                onPress={() => setActiveTab('settings')}
              >
                <Ionicons
                  name={activeTab === 'settings' ? 'settings' : 'settings-outline'}
                  size={24}
                  color={activeTab === 'settings' ? '#FFFFFF' : '#64748B'}
                />
              </TouchableOpacity>
            </View>
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

      {/* 냉장고 이름 변경 모달 다이얼로그 */}
      <Modal
        visible={renameModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setRenameModalVisible(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.renameModalOverlay}
        >
          <TouchableOpacity
            style={styles.backdrop}
            activeOpacity={1}
            onPress={() => setRenameModalVisible(false)}
          />
          <View style={styles.renameModalContent}>
            <Text style={styles.renameModalTitle}>냉장고 이름 변경 ✏️</Text>
            <Text style={styles.renameModalDesc}>지정하고 싶으신 냉장고 이름을 입력해 주세요.</Text>

            <View style={styles.renameInputContainer}>
              <TextInput
                style={styles.renameInput}
                value={renameValue}
                onChangeText={setRenameValue}
                placeholder="예: 우리집 메인 냉장고"
                placeholderTextColor="#94A3B8"
                maxLength={20}
                autoFocus
              />
              {renameValue.length > 0 && (
                <TouchableOpacity
                  style={styles.renameClearButton}
                  activeOpacity={0.7}
                  onPress={() => setRenameValue('')}
                >
                  <Ionicons name="close-circle" size={18} color="#94A3B8" />
                </TouchableOpacity>
              )}
            </View>

            <View style={styles.renameButtonRow}>
              <TouchableOpacity
                style={styles.renameCancelButton}
                activeOpacity={0.8}
                onPress={() => setRenameModalVisible(false)}
              >
                <Text style={styles.renameCancelButtonText}>취소</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.renameSaveButton, isSaveDisabled && styles.renameSaveButtonDisabled]}
                activeOpacity={0.8}
                disabled={isSaveDisabled}
                onPress={() => activeFridge && handleRenameFridge(activeFridge.id, renameValue)}
              >
                <Text style={[styles.renameSaveButtonText, isSaveDisabled && styles.renameSaveButtonTextDisabled]}>저장</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
      {/* 100% 신뢰성 있는 인앱 비주얼 스플래시 스크린 */}
      {showSplashOverlay && (
        <View style={[styles.splashOverlayContainer, { backgroundColor: splashTheme.background }]}>
          <View style={styles.splashLogoContainer}>
            <Ionicons name="snow-outline" size={72} color={splashTheme.icon} />
            <Text style={[styles.splashAppName, { color: splashTheme.text }]}>FreshKeep</Text>
            <Text style={[styles.splashAppDesc, { color: splashTheme.subText }]}>신선함을 오래오래, 스마트 냉장고 관리</Text>
          </View>
          <View style={styles.splashLoadingContainer}>
            <ActivityIndicator size="small" color={splashTheme.spinner} />
            <Text style={[styles.splashLoadingText, { color: splashTheme.subText }]}>데이터를 동기화하는 중입니다...</Text>
          </View>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAFAFA',
  },
  splashOverlayContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 80,
    zIndex: 9999, // 최상단에 고정
  },
  splashLogoContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  splashAppName: {
    fontSize: 38,
    fontWeight: '900',
    color: '#FFFFFF',
    marginTop: 16,
    letterSpacing: 2,
    textAlign: 'center',
  },
  splashAppDesc: {
    fontSize: 14,
    color: '#C7D2FE',
    marginTop: 8,
    fontWeight: '500',
    textAlign: 'center',
  },
  splashLoadingContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  splashLoadingText: {
    fontSize: 12,
    color: '#E0E7FF',
    marginTop: 12,
    fontWeight: '500',
    textAlign: 'center',
  },
  mainWrapper: {
    flex: 1,
  },
  contentWrapper: {
    flex: 1,
  },
  tabBarContainer: {
    position: 'absolute',
    bottom: Platform.OS === 'ios' ? 32 : 24,
    left: 0,
    right: 0,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255, 255, 255, 0.92)',
    borderRadius: 30,
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: 'rgba(226, 232, 240, 0.8)',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.1,
    shadowRadius: 16,
    elevation: 8,
    alignItems: 'center',
  },
  tabItem: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 4,
    backgroundColor: 'transparent',
    overflow: 'hidden',
    ...Platform.select({
      web: {
        outlineStyle: 'none',
        outlineWidth: 0,
      } as any,
    }),
  },
  tabItemActive: {
    backgroundColor: '#4F46E5',
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
  // 이름 변경 모달 스타일
  renameModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  renameModalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    width: '90%',
    maxWidth: 360,
    padding: 24,
    alignItems: 'stretch',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 24,
    elevation: 8,
  },
  renameModalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0F172A',
    textAlign: 'center',
    marginBottom: 8,
  },
  renameModalDesc: {
    fontSize: 13,
    color: '#64748B',
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 18,
  },
  renameInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    backgroundColor: '#F8FAFC',
    marginBottom: 20,
    paddingRight: 12,
  },
  renameInput: {
    flex: 1,
    height: 48,
    paddingHorizontal: 16,
    fontSize: 15,
    color: '#0F172A',
  },
  renameClearButton: {
    padding: 4,
    justifyContent: 'center',
    alignItems: 'center',
  },
  renameButtonRow: {
    flexDirection: 'row',
    gap: 10,
  },
  renameCancelButton: {
    flex: 1,
    backgroundColor: '#F1F5F9',
    height: 48,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  renameCancelButtonText: {
    color: '#475569',
    fontSize: 15,
    fontWeight: '600',
  },
  renameSaveButton: {
    flex: 1,
    backgroundColor: '#4F46E5',
    height: 48,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  renameSaveButtonDisabled: {
    backgroundColor: '#C7D2FE',
  },
  renameSaveButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
  },
  renameSaveButtonTextDisabled: {
    color: '#E0E7FF',
  },
});
