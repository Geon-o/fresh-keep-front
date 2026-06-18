import React, { useState, useEffect, useRef } from 'react';
import { StyleSheet, View, Modal, TouchableOpacity, Text, Alert, Platform, TextInput, KeyboardAvoidingView, ActivityIndicator, Animated, Easing, BackHandler } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
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
import { serializeMemo } from '../src/utils/memoSerializer';
import { getFridges, createFridge, deleteFridge, updateFridge, convertTypeToFrontend, getFridgeLayout } from '../src/api/fridgeService';
import { updateIngredient } from '../src/api/ingredientService';
import { useTheme } from '../src/context/ThemeContext';

export default function Index() {
  const { isLoggedIn, user, logout } = useAuth();
  const queryClient = useQueryClient();
  const router = useRouter();
  const { theme, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const [isGlobalLoading, setIsGlobalLoading] = useState(false);

  const splashTheme = {
    background: theme.splashBg,
    text: theme.splashText,
    subText: theme.splashSubText,
    icon: theme.splashIcon,
    spinner: theme.splashSpinner,
  };

  // 탭바 테마별 색상 설정 (라이트: 화이트배경+다크아이콘, 다크: 검정배경+하늘색아이콘)
  const activeTabColor = isDark ? '#BBDEFB' : '#0F172A';
  const inactiveTabColor = isDark ? 'rgba(255, 255, 255, 0.45)' : 'rgba(15, 23, 42, 0.4)';

  // 1. 네비게이션 및 활성 인덱스 상태
  const [activeTab, setActiveTab] = useState<'home' | 'ingredients' | 'fridge' | 'settings'>('home');
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

  // 하드웨어 뒤로가기(BackHandler) 처리
  const activeTabRef = useRef(activeTab);
  const activeCompartmentRef = useRef(activeCompartment);
  const backPressedTimeRef = useRef(0);

  // 커스텀 토스트 상태 및 애니메이션 설정
  const [toastText, setToastText] = useState('');
  const [toastVisible, setToastVisible] = useState(false);
  const toastOpacity = useRef(new Animated.Value(0)).current;
  const toastTimeoutRef = useRef<any>(null);

  const showToast = (message: string) => {
    if (toastTimeoutRef.current) {
      clearTimeout(toastTimeoutRef.current);
    }
    setToastText(message);
    setToastVisible(true);

    // Fade In
    Animated.timing(toastOpacity, {
      toValue: 1,
      duration: 200,
      useNativeDriver: true,
    }).start();

    // 2초 후 서서히 사라짐
    toastTimeoutRef.current = setTimeout(() => {
      Animated.timing(toastOpacity, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }).start(() => {
        setToastVisible(false);
      });
    }, 2000);
  };

  useEffect(() => {
    activeTabRef.current = activeTab;
  }, [activeTab]);

  useEffect(() => {
    activeCompartmentRef.current = activeCompartment;
  }, [activeCompartment]);

  useEffect(() => {
    const handleBackButton = () => {
      // 1. 구획 상세(CompartmentDetail)가 열려있다면 구획 닫기
      if (activeCompartmentRef.current !== null) {
        setActiveCompartment(null);
        return true;
      }

      // 2. 홈 탭이 아닌 다른 탭에 있다면 홈 탭으로 이동
      if (activeTabRef.current !== 'home') {
        setActiveTab('home');
        return true;
      }

      // 3. 홈 탭에 있는 상태에서 뒤로가기 누를 때
      const now = Date.now();
      if (now - backPressedTimeRef.current < 2000) {
        // 2초 안에 한번 더 누르면 앱 종료
        BackHandler.exitApp();
        return true;
      } else {
        backPressedTimeRef.current = now;
        showToast('✅ 한 번 더 뒤로가면 앱이 꺼집니다.');
        return true;
      }
    };

    const backHandler = BackHandler.addEventListener('hardwareBackPress', handleBackButton);

    return () => {
      backHandler.remove();
    };
  }, []);

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

  // 스플래시 오버레이 애니메이션 효과 기획 (부유, 회전, 호흡 맥박)
  const rotateAnim = React.useRef(new Animated.Value(0)).current;
  const pulseAnim = React.useRef(new Animated.Value(1)).current;
  const floatAnim = React.useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (showSplashOverlay) {
      // 1. 회전 애니메이션 (부드럽고 느리게 - 12초 주기)
      const rotateAnimation = Animated.loop(
        Animated.timing(rotateAnim, {
          toValue: 1,
          duration: 12000,
          easing: Easing.linear,
          useNativeDriver: true,
        })
      );

      // 2. 맥박(호흡) 애니메이션 (2초 수축, 2초 팽창)
      const pulseAnimation = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.12,
            duration: 2000,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1.0,
            duration: 2000,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
        ])
      );

      // 3. 부유(위아래 흔들림) 애니메이션 (자연스러운 둥둥 떠있는 느낌)
      const floatAnimation = Animated.loop(
        Animated.sequence([
          Animated.timing(floatAnim, {
            toValue: -8, // 위로 8px
            duration: 2500,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(floatAnim, {
            toValue: 8, // 아래로 8px
            duration: 2500,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(floatAnim, {
            toValue: 0,
            duration: 2500,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
        ])
      );

      rotateAnimation.start();
      pulseAnimation.start();
      floatAnimation.start();

      return () => {
        rotateAnimation.stop();
        pulseAnimation.stop();
        floatAnimation.stop();
      };
    }
  }, [showSplashOverlay]);

  const spin = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  // 탭바 스프링 애니메이션 (햅틱 반응형 피드백)
  const homeTabScale = React.useRef(new Animated.Value(1.05)).current;
  const ingredientsTabScale = React.useRef(new Animated.Value(1.0)).current;
  const fridgeTabScale = React.useRef(new Animated.Value(1.0)).current;
  const settingsTabScale = React.useRef(new Animated.Value(1.0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(homeTabScale, {
        toValue: activeTab === 'home' ? 1.05 : 1.0,
        friction: 6,
        tension: 80,
        useNativeDriver: true,
      }),
      Animated.spring(ingredientsTabScale, {
        toValue: activeTab === 'ingredients' ? 1.05 : 1.0,
        friction: 6,
        tension: 80,
        useNativeDriver: true,
      }),
      Animated.spring(fridgeTabScale, {
        toValue: activeTab === 'fridge' ? 1.05 : 1.0,
        friction: 6,
        tension: 80,
        useNativeDriver: true,
      }),
      Animated.spring(settingsTabScale, {
        toValue: activeTab === 'settings' ? 1.05 : 1.0,
        friction: 6,
        tension: 80,
        useNativeDriver: true,
      }),
    ]).start();
  }, [activeTab]);

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

  // 앱 로드 시 로컬 저장소에서 냉장고 목록 및 직전 활성 냉장고 인덱스 불러오기
  useEffect(() => {
    const loadLocalRefrigerators = async () => {
      try {
        const stored = await AsyncStorage.getItem('@refrigerators');
        if (stored) {
          setLocalRefrigerators(JSON.parse(stored));
        }
        
        // 직전에 활성화되었던 냉장고 인덱스 복구
        const lastIndex = await AsyncStorage.getItem('@active_fridge_index');
        if (lastIndex) {
          setActiveIndex(Number(lastIndex));
        }
      } catch (e) {
        console.error('Failed to load local refrigerators', e);
      } finally {
        setIsLocalLoading(false);
      }
    };
    loadLocalRefrigerators();
  }, []);

  // 기존 로컬 저장소에 남아있던 더미 데이터 1회성 청소
  useEffect(() => {
    const cleanLegacyDummyData = async () => {
      try {
        const isCleaned = await AsyncStorage.getItem('@dummy_cleaned_v3');
        if (!isCleaned) {
          // 예전 테스트용으로 로컬 스토리지에 남아있던 식재료 더미 데이터 완전 제거
          await AsyncStorage.removeItem('@ingredients');
          // 1회성 청소 완료 플래그 저장
          await AsyncStorage.setItem('@dummy_cleaned_v3', 'true');
        }
      } catch (e) {
        console.error('Failed to clean legacy dummy data', e);
      }
    };
    cleanLegacyDummyData();
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
        await queryClient.invalidateQueries({ queryKey: ['fridges'] });
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
          await queryClient.invalidateQueries({ queryKey: ['fridges'] });
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
  const handleDeleteConfirm = async () => {
    if (!activeFridge) return;
    const performDelete = async () => {
      await handleDeleteFridge(activeFridge.id);
      setActiveIndex(0);
      try {
        await AsyncStorage.setItem('@active_fridge_index', '0');
      } catch (e) {}
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

  const handlePressCompartment = async (id: string, label: string, fridgeId: string) => {
    // 사용자가 현재 보고 있던 냉장고 인덱스를 로컬에 영구 저장하여 보관실 뒤로가기 혹은 새로고침 시 즉시 동기화
    try {
      await AsyncStorage.setItem('@active_fridge_index', String(activeIndex));
    } catch (e) {
      console.error(e);
    }
    setActiveCompartment({ id, label, fridgeId });
  };

  // 식재료 보관실/선반 간 드래그 앤 드롭 이동 API 연동 및 상태 동기화
  const handleMoveIngredient = async (
    ingredientId: string,
    targetCompartmentId: string,
    targetShelfId: string,
    category: string,
    currentMemo: string,
    name: string,
    quantity: number,
    unit: string,
    expiryDate: string
  ) => {
    if (isLoggedIn) {
      try {
        if (!activeCompartment) return;
        const layout = await getFridgeLayout(Number(activeCompartment.fridgeId));
        
        // targetCompartmentId에 대응하는 서버 구획 찾기
        const serverComp = layout.compartments.find((comp: any) => {
          const isLeft = targetCompartmentId.includes('left');
          const isRight = targetCompartmentId.includes('right');
          if (targetCompartmentId.startsWith('freezer')) {
            if (comp.storageType !== 'FROZEN') return false;
          } else {
            if (comp.storageType !== 'REFRIGERATED') return false;
          }
          if (isLeft && !comp.name.includes('좌')) return false;
          if (isRight && !comp.name.includes('우')) return false;
          return true;
        });

        if (!serverComp) {
          throw new Error('이동 대상 서버 구획을 찾을 수 없습니다.');
        }

        const memoContent = serializeMemo(category as any, targetShelfId, currentMemo);

        await updateIngredient(Number(ingredientId), {
          compartmentId: serverComp.id,
          name: name.trim(),
          quantity: Number(quantity),
          unit,
          expirationDate: expiryDate,
          memo: memoContent,
        });

        await queryClient.invalidateQueries({ queryKey: ['fridges'] });
      } catch (e) {
        console.error('Failed to move ingredient on server', e);
        throw e;
      }
    } else {
      // 로컬 스토리지 데이터 업데이트
      try {
        const ingredientsStr = await AsyncStorage.getItem('@ingredients');
        if (ingredientsStr) {
          const allIngredients: Ingredient[] = JSON.parse(ingredientsStr);
          const updated = allIngredients.map(item => {
            if (item.id === ingredientId) {
              return {
                ...item,
                location: targetCompartmentId,
                subLocation: targetShelfId as any,
              };
            }
            return item;
          });
          await AsyncStorage.setItem('@ingredients', JSON.stringify(updated));
        }
      } catch (e) {
        console.error('Failed to move local ingredient', e);
        throw e;
      }
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={['top', 'left', 'right']}>
      {activeCompartment !== null ? (
        <SafeAreaView style={{ flex: 1 }} edges={['bottom']}>
          <CompartmentDetail
            compartmentId={activeCompartment.id}
            compartmentLabel={activeCompartment.label}
            onBack={() => setActiveCompartment(null)}
            fridgeId={activeCompartment.fridgeId}
            onNavigateCompartment={(newId, newLabel) => {
              setActiveCompartment({
                id: newId,
                label: newLabel,
                fridgeId: activeCompartment.fridgeId
              });
            }}
            onMoveIngredient={handleMoveIngredient}
          />
        </SafeAreaView>
      ) : (
        <View style={styles.mainWrapper}>
          {/* 상단 탭 콘텐츠 */}
          <View style={styles.contentWrapper}>
            {activeTab === 'home' || activeTab === 'ingredients' || activeTab === 'fridge' ? (
              <RefrigeratorVisual
                mode={activeTab as 'home' | 'ingredients' | 'fridge'}
                refrigerators={refrigerators}
                onPressCompartment={handlePressCompartment}
                activeIndex={activeIndex}
                setActiveIndex={async (idx) => {
                  setActiveIndex(idx);
                  try {
                    await AsyncStorage.setItem('@active_fridge_index', String(idx));
                  } catch (e) {
                    console.error(e);
                  }
                }}
                onOpenAddSelector={handleOpenAddSelector}
                onOpenRenameModal={handleOpenRenameModal}
                onEditFridgeType={handleOpenEditSelector}
                onDeleteFridge={handleDeleteConfirm}
              />
            ) : (
              <SettingsView
                isLoggedIn={isLoggedIn}
                user={user}
                onLogout={logout}
                onLogin={() => router.push('/login')}
              />
            )}
          </View>

          {/* 하단 탭 바 (Bottom Navigation Bar) */}
          <View style={[styles.tabBar, { 
            backgroundColor: isDark ? '#000000' : '#FFFFFF',
            borderTopColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(15, 23, 42, 0.06)',
            borderTopWidth: 1,
            paddingBottom: insets.bottom > 0 ? insets.bottom : 8,
            height: (Platform.OS === 'ios' ? 70 : 58) + (insets.bottom > 0 ? insets.bottom - 8 : 0),
          }]}>

            {/* 홈 */}
            <Animated.View style={{ transform: [{ scale: homeTabScale }], flex: 1 }}>
              <TouchableOpacity
                style={styles.tabItem}
                activeOpacity={0.7}
                onPress={() => setActiveTab('home')}
              >
                <Ionicons
                  name={activeTab === 'home' ? 'home' : 'home-outline'}
                  size={20}
                  color={activeTab === 'home' ? activeTabColor : inactiveTabColor}
                />
                <Text style={[
                  styles.tabLabel,
                  { color: activeTab === 'home' ? activeTabColor : inactiveTabColor }
                ]}>
                  홈
                </Text>
              </TouchableOpacity>
            </Animated.View>

            {/* 식재료 목록 */}
            <Animated.View style={{ transform: [{ scale: ingredientsTabScale }], flex: 1 }}>
              <TouchableOpacity
                style={styles.tabItem}
                activeOpacity={0.7}
                onPress={() => setActiveTab('ingredients')}
              >
                <Ionicons
                  name={activeTab === 'ingredients' ? 'restaurant' : 'restaurant-outline'}
                  size={20}
                  color={activeTab === 'ingredients' ? activeTabColor : inactiveTabColor}
                />
                <Text style={[
                  styles.tabLabel,
                  { color: activeTab === 'ingredients' ? activeTabColor : inactiveTabColor }
                ]}>
                  식재료 목록
                </Text>
              </TouchableOpacity>
            </Animated.View>

            {/* 냉장고 보관소 */}
            <Animated.View style={{ transform: [{ scale: fridgeTabScale }], flex: 1 }}>
              <TouchableOpacity
                style={styles.tabItem}
                activeOpacity={0.7}
                onPress={() => setActiveTab('fridge')}
              >
                <Ionicons
                  name={activeTab === 'fridge' ? 'cube' : 'cube-outline'}
                  size={20}
                  color={activeTab === 'fridge' ? activeTabColor : inactiveTabColor}
                />
                <Text style={[
                  styles.tabLabel,
                  { color: activeTab === 'fridge' ? activeTabColor : inactiveTabColor }
                ]}>
                  냉장고
                </Text>
              </TouchableOpacity>
            </Animated.View>

            {/* 설정 */}
            <Animated.View style={{ transform: [{ scale: settingsTabScale }], flex: 1 }}>
              <TouchableOpacity
                style={styles.tabItem}
                activeOpacity={0.7}
                onPress={() => setActiveTab('settings')}
              >
                <Ionicons
                  name={activeTab === 'settings' ? 'settings' : 'settings-outline'}
                  size={20}
                  color={activeTab === 'settings' ? activeTabColor : inactiveTabColor}
                />
                <Text style={[
                  styles.tabLabel,
                  { color: activeTab === 'settings' ? activeTabColor : inactiveTabColor }
                ]}>
                  설정
                </Text>
              </TouchableOpacity>
            </Animated.View>
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
        <View style={[styles.selectorModalOverlay, { backgroundColor: theme.modalOverlay }]}>
          <TouchableOpacity
            style={styles.backdrop}
            activeOpacity={1}
            onPress={() => setSelectorVisible(false)}
          />
          <View style={[styles.selectorModalContent, { backgroundColor: theme.surface, shadowColor: theme.shadow }]}>
            <View style={[styles.selectorModalHeader, { borderBottomColor: theme.borderLight }]}>
              <Text style={[styles.selectorModalTitle, { color: theme.textPrimary }]}>
                {selectorMode === 'add' ? '냉장고 추가 등록' : '냉장고 형태 수정'}
              </Text>
              <TouchableOpacity onPress={() => setSelectorVisible(false)} style={styles.selectorCloseButton}>
                <Text style={[styles.selectorCloseButtonText, { color: theme.textTertiary }]}>✕</Text>
              </TouchableOpacity>
            </View>
            <RefrigeratorSelector
              currentType={selectorMode === 'edit' && activeFridge ? activeFridge.type : undefined}
              onSelect={async (selectedType) => {
                // 1. 모달 팝업 즉시 닫기
                setSelectorVisible(false);
                // 2. 전역 로딩 켜기
                setIsGlobalLoading(true);
                try {
                  if (selectorMode === 'add') {
                    await handleAddFridge(selectedType);
                  } else if (activeFridge) {
                    await handleChangeFridgeType(activeFridge.id, selectedType);
                  }
                } catch (error) {
                  console.error('Failed to change/add fridge:', error);
                } finally {
                  // 3. 전역 로딩 끄기
                  setIsGlobalLoading(false);
                }
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
          style={[styles.renameModalOverlay, { backgroundColor: theme.modalOverlay }]}
        >
          <TouchableOpacity
            style={styles.backdrop}
            activeOpacity={1}
            onPress={() => setRenameModalVisible(false)}
          />
          <View style={[styles.renameModalContent, { backgroundColor: theme.surface, shadowColor: theme.shadow }]}>
            <Text style={[styles.renameModalTitle, { color: theme.textPrimary }]}>냉장고 이름 변경 ✏️</Text>
            <Text style={[styles.renameModalDesc, { color: theme.textTertiary }]}>지정하고 싶으신 냉장고 이름을 입력해 주세요.</Text>

            <View style={[styles.renameInputContainer, { borderColor: theme.border, backgroundColor: theme.surfaceSecondary }]}>
              <TextInput
                style={[styles.renameInput, { color: theme.textPrimary }]}
                value={renameValue}
                onChangeText={setRenameValue}
                placeholder="예: 우리집 메인 냉장고"
                placeholderTextColor={theme.textMuted}
                maxLength={20}
                autoFocus
              />
              {renameValue.length > 0 && (
                <TouchableOpacity
                  style={styles.renameClearButton}
                  activeOpacity={0.7}
                  onPress={() => setRenameValue('')}
                >
                  <Ionicons name="close-circle" size={18} color={theme.textMuted} />
                </TouchableOpacity>
              )}
            </View>

            <View style={styles.renameButtonRow}>
              <TouchableOpacity
                style={[styles.renameCancelButton, { backgroundColor: theme.surfaceTertiary }]}
                activeOpacity={0.8}
                onPress={() => setRenameModalVisible(false)}
              >
                <Text style={[styles.renameCancelButtonText, { color: theme.textSecondary }]}>취소</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.renameSaveButton, 
                  { backgroundColor: theme.primary },
                  isSaveDisabled && { backgroundColor: theme.primaryBorder }
                ]}
                activeOpacity={0.8}
                disabled={isSaveDisabled}
                onPress={() => activeFridge && handleRenameFridge(activeFridge.id, renameValue)}
              >
                <Text style={[
                  styles.renameSaveButtonText, 
                  { color: theme.primaryOnPrimary },
                  isSaveDisabled && { color: theme.textMuted }
                ]}>저장</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
      {/* 100% 신뢰성 있는 인앱 비주얼 스플래시 스크린 */}
      {showSplashOverlay && (
        <View style={[styles.splashOverlayContainer, { backgroundColor: splashTheme.background }]}>
          <View style={styles.splashLogoContainer}>
            <Animated.View 
              style={{ 
                transform: [
                  { translateY: floatAnim }, 
                  { rotate: spin }, 
                  { scale: pulseAnim }
                ] 
              }}
            >
              <Ionicons name="snow-outline" size={96} color={splashTheme.icon} />
            </Animated.View>
            <Text style={[styles.splashAppDesc, { color: splashTheme.subText, marginTop: 28, fontSize: 15 }]}>
              신선함을 오래오래, 스마트 냉장고 관리
            </Text>
          </View>
        </View>
      )}
      {/* 커스텀 토스트 오버레이 */}
      {toastVisible && (
        <Animated.View style={[styles.toastContainer, { opacity: toastOpacity }]}>
          <View style={[styles.toastContent, { backgroundColor: theme.textPrimary }]}>
            <Text style={[styles.toastText, { color: theme.background }]}>{toastText}</Text>
          </View>
        </Animated.View>
      )}
      {/* 냉장고 변경/추가 진행 중 전역 로딩 오버레이 */}
      {isGlobalLoading && (
        <View style={[styles.globalLoadingOverlay, { backgroundColor: isDark ? 'rgba(0, 0, 0, 0.7)' : 'rgba(255, 255, 255, 0.7)' }]}>
          <ActivityIndicator size="large" color={theme.primary} />
          <Text style={[styles.globalLoadingText, { color: theme.textPrimary }]}>
            냉장고 변경 중...
          </Text>
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
  tabBar: {
    flexDirection: 'row',
    width: '100%',
    borderTopWidth: 1,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 8,
    justifyContent: 'space-around',
    alignItems: 'center',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 10,
  },
  tabItem: {
    flex: 1,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
    paddingVertical: 6,
    ...Platform.select({
      web: {
        outlineStyle: 'none',
        outlineWidth: 0,
      } as any,
    }),
  },
  tabLabel: {
    fontSize: 10.5,
    fontWeight: '600',
    marginTop: 2,
    letterSpacing: -0.3,
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
  toastContainer: {
    position: 'absolute',
    bottom: 110,
    left: 20,
    right: 20,
    alignItems: 'center',
    zIndex: 9999,
  },
  toastContent: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 25,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 3,
  },
  toastText: {
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
  },
  globalLoadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 99999,
  },
  globalLoadingText: {
    marginTop: 12,
    fontSize: 16,
    fontWeight: '600',
  },
});
