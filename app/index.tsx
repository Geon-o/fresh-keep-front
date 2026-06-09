import React, { useState, useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { FridgeType, Ingredient } from '../src/types';
import RefrigeratorVisual from '../src/components/RefrigeratorVisual';
import CompartmentDetail from '../src/components/CompartmentDetail';
import { useAuth } from '../src/context/AuthContext';
import { getFridges, createFridge, deleteFridge, updateFridge, convertTypeToFrontend } from '../src/api/fridgeService';

export default function Index() {
  const { isLoggedIn } = useAuth();
  const queryClient = useQueryClient();

  // 1. 로컬 모드 냉장고 목록 상태
  const [localRefrigerators, setLocalRefrigerators] = useState<{ id: string; type: FridgeType; name: string }[]>([]);
  const [activeCompartment, setActiveCompartment] = useState<{ id: string; label: string; fridgeId: string } | null>(null);

  // 2. 서버 모드 냉장고 목록 조회 (로그인 시에만 활성화)
  const { data: serverFridges } = useQuery({
    queryKey: ['fridges'],
    queryFn: getFridges,
    enabled: isLoggedIn,
  });

  // 로그인 여부에 따라 최종 노출할 냉장고 배열 결정
  const refrigerators = isLoggedIn
    ? (serverFridges || []).map(f => ({
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

  // 새 냉장고 추가 (최대 3개 제한)
  const handleAddFridge = async (type: FridgeType) => {
    if (refrigerators.length >= 3) return;

    if (isLoggedIn) {
      // 서버 추가
      try {
        await createFridge(`냉장고 ${refrigerators.length + 1}`, type);
        queryClient.invalidateQueries({ queryKey: ['fridges'] });
      } catch (e) {
        console.error('Failed to add refrigerator on server', e);
      }
    } else {
      // 로컬 추가
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
      // 서버 변경
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
      // 로컬 변경
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
      // 서버 삭제
      try {
        await deleteFridge(Number(fridgeId));
        queryClient.invalidateQueries({ queryKey: ['fridges'] });
      } catch (e) {
        console.error('Failed to delete refrigerator on server', e);
      }
    } else {
      // 로컬 삭제
      try {
        const updated = localRefrigerators.filter(f => f.id !== fridgeId);
        const renamed = updated.map((f, i) => ({ ...f, name: `냉장고 ${i + 1}` }));
        setLocalRefrigerators(renamed);
        await AsyncStorage.setItem('@refrigerators', JSON.stringify(renamed));

        // 해당 로컬 냉장고에 보관 중이던 식재료 제거
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
        <RefrigeratorVisual
          refrigerators={refrigerators}
          onPressCompartment={handlePressCompartment}
          onAddFridge={handleAddFridge}
          onChangeFridgeType={handleChangeFridgeType}
          onDeleteFridge={handleDeleteFridge}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAFAFA',
  },
});


