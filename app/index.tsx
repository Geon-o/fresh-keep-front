import React, { useState, useEffect, useRef } from 'react';
import { StyleSheet, View, Modal, TouchableOpacity, Text, Alert, Platform, TextInput, KeyboardAvoidingView, ActivityIndicator, Animated, BackHandler, Image, DeviceEventEmitter } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Linking from 'expo-linking';
import * as SplashScreen from 'expo-splash-screen';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter, usePathname } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { FridgeType, Ingredient } from '../src/types';
import RefrigeratorVisual from '../src/components/RefrigeratorVisual';
import CompartmentDetail from '../src/components/CompartmentDetail';
import SettingsView from '../src/components/SettingsView';
import RefrigeratorSelector from '../src/components/RefrigeratorSelector';
import QrShareModal from '../src/components/QrShareModal';
import { useAuth } from '../src/context/AuthContext';
import { serializeMemo } from '../src/utils/memoSerializer';
import { getFridges, createFridge, deleteFridge, updateFridge, convertTypeToFrontend, getFridgeLayout, approveDeletion, rejectDeletion, cancelDeletionRequest } from '../src/api/fridgeService';
import { registerPushToken } from '../src/utils/pushToken';
import { updateIngredient } from '../src/api/ingredientService';
import { useTheme } from '../src/context/ThemeContext';

export default function Index() {
  const { isLoggedIn, user, isLoading: isAuthLoading, authFailed, loginAnonymously } = useAuth();
  const queryClient = useQueryClient();
  const router = useRouter();
  const pathname = usePathname();
  const { theme, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const [isGlobalLoading, setIsGlobalLoading] = useState(false);

  // 2.7. 냉장고 QR 공유 모달 상태
  const [qrShareVisible, setQrShareVisible] = useState(false);
  const [shareFridgeName, setShareFridgeName] = useState('');
  const [shareFridgeUuid, setShareFridgeUuid] = useState('');
  const [pendingShareUuid, setPendingShareUuid] = useState<string | null>(null);

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
  const [activeCompartment, setActiveCompartment] = useState<{ id: string; label: string; fridgeId: string; autoOpenAdd?: boolean } | null>(null);

  // 하드웨어 뒤로가기(BackHandler) 처리
  const activeTabRef = useRef(activeTab);
  const activeCompartmentRef = useRef(activeCompartment);
  const backPressedTimeRef = useRef(0);
  const pathnameRef = useRef(pathname);

  useEffect(() => {
    pathnameRef.current = pathname;
  }, [pathname]);

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

  // QR 스캔/공유 등록 화면에서 결과를 알려오면, 화면 전환 후 이 홈 화면에서 토스트로 안내
  useEffect(() => {
    const subscription = DeviceEventEmitter.addListener('fridgeShareResult', (message: string) => {
      showToast(message);
    });
    return () => subscription.remove();
  }, []);

  // 딥링크 수신 및 처리 리스너
  useEffect(() => {
    const handleDeepLink = async (event: { url: string }) => {
      console.log('App received deep link:', event.url);
      try {
        const parsed = Linking.parse(event.url);
        const uuid = parsed.queryParams?.uuid as string;
        if (uuid && event.url.includes('share-fridge')) {
          setPendingShareUuid(uuid);
        }
      } catch (e) {
        console.error('Failed to parse deep link URL', e);
      }
    };

    // 포그라운드 상태 딥링크 리스너
    const subscription = Linking.addEventListener('url', handleDeepLink);

    // 백그라운드/완전종료 상태에서 딥링크 기동 처리
    Linking.getInitialURL().then((url) => {
      if (url) {
        handleDeepLink({ url });
      }
    });

    return () => {
      subscription.remove();
    };
  }, []);

  // 익명 로그인이 완료(isLoggedIn)된 후, 대기 중이던 공유 요청(pendingShareUuid)을 자동 처리
  useEffect(() => {
    const processPendingShare = async () => {
      if (isLoggedIn && pendingShareUuid) {
        const uuidToProcess = pendingShareUuid;
        setPendingShareUuid(null); // 중복 실행 방지 위해 클리어
        setIsGlobalLoading(true);
        try {
          const { client } = await import('../src/api/client');
          await client.post('/api/fridges/share', { fridgeUuid: uuidToProcess });
          
          // 캐시 갱신
          queryClient.invalidateQueries({ queryKey: ['fridges'] });
          Alert.alert('공동 관리 냉장고 추가 성공 🎉', '공유된 냉장고가 정상적으로 목록에 추가되었습니다.');
        } catch (e: any) {
          console.error('Failed to join shared fridge via deep link', e);
          const errMsg = e.response?.data?.message || '이미 공유 등록된 냉장고이거나 유효하지 않은 공유 링크입니다.';
          Alert.alert('공유 냉장고 연동 실패 ❌', errMsg);
        } finally {
          setIsGlobalLoading(false);
        }
      }
    };

    processPendingShare();
  }, [isLoggedIn, pendingShareUuid]);

  useEffect(() => {
    activeTabRef.current = activeTab;
  }, [activeTab]);

  useEffect(() => {
    activeCompartmentRef.current = activeCompartment;
  }, [activeCompartment]);

  useEffect(() => {
    const handleBackButton = () => {
      // 메인 홈 화면(/)이 아닐 때는 BackHandler가 간섭하지 않고 기본 네비게이션 뒤로가기(스택 팝)가 작동하도록 함
      if (pathnameRef.current !== '/') {
        return false;
      }

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

  // 앱 컴포넌트가 마운트되는 즉시 OS 네이티브 스플래시를 숨김 처리하여 커스텀 애니메이션 스플래시가 보이도록 유도
  useEffect(() => {
    const hideNativeSplash = async () => {
      try {
        await SplashScreen.hideAsync();
      } catch (e) {}
    };
    hideNativeSplash();
  }, []);

  // 스플래시 오버레이를 띄울지 여부 (인증/로딩 중이거나 최소 시간이 지나지 않았을 때)
  const showSplashOverlay = isAuthLoading || isRefrigeratorsLoading || !isMinTimeElapsed;

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
          uuid: f.uuid,
          role: f.role,
          deletionRequested: f.deletionRequested,
          ownerName: f.ownerName,
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
  // 서버 삭제 요청 결과({deleted})를 그대로 반환. 실패 시 null.
  const handleDeleteFridge = async (fridgeId: string): Promise<{ deleted: boolean } | null> => {
    if (isLoggedIn) {
      try {
        const result = await deleteFridge(Number(fridgeId));
        queryClient.invalidateQueries({ queryKey: ['fridges'] });
        return result;
      } catch (e) {
        console.error('Failed to delete refrigerator on server', e);
        return null;
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
        return { deleted: true };
      } catch (e) {
        console.error('Failed to delete local refrigerator', e);
        return null;
      }
    }
  };

  const resetActiveFridgeIndex = async () => {
    setActiveIndex(0);
    try {
      await AsyncStorage.setItem('@active_fridge_index', '0');
    } catch (e) {}
  };

  // 냉장고 삭제/나가기 확인 알림
  // 주인(OWNER)이 삭제하면: 혼자 쓰는 냉장고는 즉시 삭제, 공유 중이면 삭제 요청만 등록됨(deleted: false)
  // 멤버(MEMBER)가 누르면: 항상 본인만 나가는 것(서버에서 deleted: false로 응답)
  const handleDeleteConfirm = async () => {
    if (!activeFridge) return;
    const isOwner = !isLoggedIn || (activeFridge as any).role !== 'MEMBER';

    const performDelete = async () => {
      const result = await handleDeleteFridge(activeFridge.id);
      if (!result) return;

      if (result.deleted) {
        showToast('냉장고가 삭제되었습니다 🗑️');
        await resetActiveFridgeIndex();
      } else if (isOwner) {
        showToast('삭제 요청을 보냈습니다. 함께 쓰는 멤버가 동의하면 삭제됩니다.');
      } else {
        showToast('냉장고에서 나갔습니다.');
        await resetActiveFridgeIndex();
      }
    };

    Alert.alert(
      isOwner ? '냉장고 삭제 ❌' : '냉장고 나가기',
      isOwner
        ? `[${activeFridge.name}]와 보관 중인 모든 식재료 데이터가 함께 영구 삭제됩니다. 함께 쓰는 멤버가 있다면 먼저 동의를 요청합니다. 삭제하시겠습니까?`
        : `[${activeFridge.name}]에서 나가시겠습니까? 나가도 그동안 등록한 식재료는 그대로 남습니다.`,
      [
        { text: '취소', style: 'cancel' },
        { text: isOwner ? '삭제' : '나가기', style: 'destructive', onPress: performDelete }
      ]
    );
  };

  // 다른 멤버가 보낸 삭제 요청에 동의 (전원 동의 시 그 시점에 실제 삭제됨)
  const handleApproveDeletionRequest = async () => {
    if (!activeFridge) return;
    try {
      const result = await approveDeletion(Number(activeFridge.id));
      queryClient.invalidateQueries({ queryKey: ['fridges'] });
      if (result.deleted) {
        showToast('삭제에 동의했습니다. 냉장고가 삭제되었습니다 🗑️');
        await resetActiveFridgeIndex();
      } else {
        showToast('삭제에 동의했습니다. 다른 멤버의 동의를 기다리는 중입니다.');
      }
    } catch (e) {
      console.error('Failed to approve fridge deletion', e);
    }
  };

  // 삭제 요청 거절 (즉시 요청 자체가 취소됨)
  const handleRejectDeletionRequest = async () => {
    if (!activeFridge) return;
    try {
      await rejectDeletion(Number(activeFridge.id));
      queryClient.invalidateQueries({ queryKey: ['fridges'] });
      showToast('삭제 요청을 거절했습니다.');
    } catch (e) {
      console.error('Failed to reject fridge deletion', e);
    }
  };

  // 주인이 본인이 보낸 삭제 요청을 철회
  const handleCancelDeletionRequest = async () => {
    if (!activeFridge) return;
    try {
      await cancelDeletionRequest(Number(activeFridge.id));
      queryClient.invalidateQueries({ queryKey: ['fridges'] });
      showToast('삭제 요청을 철회했습니다.');
    } catch (e) {
      console.error('Failed to cancel fridge deletion request', e);
    }
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

  const handlePressCompartment = async (id: string, label: string, fridgeId: string, autoOpenAdd?: boolean) => {
    // 사용자가 현재 보고 있던 냉장고 인덱스를 로컬에 영구 저장하여 보관실 뒤로가기 혹은 새로고침 시 즉시 동기화
    try {
      await AsyncStorage.setItem('@active_fridge_index', String(activeIndex));
    } catch (e) {
      console.error(e);
    }
    setActiveCompartment({ id, label, fridgeId, autoOpenAdd });
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
      {!showSplashOverlay && authFailed ? (
        <View style={styles.networkErrorContainer}>
          <Ionicons name="cloud-offline-outline" size={64} color={theme.textMuted} />
          <Text style={[styles.networkErrorTitle, { color: theme.textPrimary }]}>네트워크 연결이 원활하지 않습니다</Text>
          <Text style={[styles.networkErrorDesc, { color: theme.textSecondary }]}>인터넷 연결 상태를 확인한 후 다시 시도해 주세요.</Text>
          <TouchableOpacity
            style={[styles.networkErrorRetryButton, { backgroundColor: theme.primary }]}
            activeOpacity={0.8}
            onPress={() => loginAnonymously()}
          >
            <Text style={styles.networkErrorRetryButtonText}>다시 시도</Text>
          </TouchableOpacity>
        </View>
      ) : activeCompartment !== null ? (
        <SafeAreaView style={{ flex: 1 }} edges={['bottom']}>
          <CompartmentDetail
            compartmentId={activeCompartment.id}
            compartmentLabel={activeCompartment.label}
            onBack={() => setActiveCompartment(null)}
            fridgeId={activeCompartment.fridgeId}
            autoOpenAddOnMount={activeCompartment.autoOpenAdd}
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
                onApproveDeletionRequest={handleApproveDeletionRequest}
                onRejectDeletionRequest={handleRejectDeletionRequest}
                onCancelDeletionRequest={handleCancelDeletionRequest}
                onShareFridge={(fridgeName, fridgeUuid) => {
                  setShareFridgeName(fridgeName);
                  setShareFridgeUuid(fridgeUuid);
                  setQrShareVisible(true);
                  // 삭제 요청 등 이 냉장고 관련 알림을 받을 수 있도록 공유를 시작하는 시점에 푸시 토큰을 등록한다.
                  registerPushToken();
                }}
                onScanQr={() => router.push('/qr-scan')}
                onChangeTab={setActiveTab}
              />
            ) : (
              <SettingsView
                isLoggedIn={isLoggedIn}
                user={user}
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

      {/* 냉장고 QR 공유 모달 */}
      <QrShareModal
        visible={qrShareVisible}
        onClose={() => setQrShareVisible(false)}
        fridgeName={shareFridgeName}
        fridgeUuid={shareFridgeUuid}
      />
      {/* 100% 신뢰성 있는 인앱 비주얼 스플래시 스크린 */}
      {showSplashOverlay && (
        <View style={[styles.splashOverlayContainer, { backgroundColor: splashTheme.background }]}>
          <View style={styles.splashLogoContainer}>
            <Image
              source={require('../assets/images/mustache_static.png')}
              style={{ width: 140, height: 140 }}
              resizeMode="contain"
            />
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
  networkErrorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  networkErrorTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginTop: 20,
    textAlign: 'center',
  },
  networkErrorDesc: {
    fontSize: 14,
    marginTop: 8,
    textAlign: 'center',
    lineHeight: 20,
  },
  networkErrorRetryButton: {
    marginTop: 28,
    paddingVertical: 12,
    paddingHorizontal: 32,
    borderRadius: 14,
  },
  networkErrorRetryButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
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
