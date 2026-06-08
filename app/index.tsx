import React, { useState, useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { FridgeType, Ingredient } from '../src/types';
import RefrigeratorVisual from '../src/components/RefrigeratorVisual';
import CompartmentDetail from '../src/components/CompartmentDetail';

export default function Index() {
  const [refrigerators, setRefrigerators] = useState<{ id: string; type: FridgeType; name: string }[]>([]);
  const [activeCompartment, setActiveCompartment] = useState<{ id: string; label: string; fridgeId: string } | null>(null);

  // 앱 로드 시 로컬 저장소에서 냉장고 목록 불러오기
  useEffect(() => {
    const loadRefrigerators = async () => {
      try {
        const stored = await AsyncStorage.getItem('@refrigerators');
        if (stored) {
          setRefrigerators(JSON.parse(stored));
        }
      } catch (e) {
        console.error('Failed to load refrigerators', e);
      }
    };
    loadRefrigerators();
  }, []);

  // 새 냉장고 추가 (최대 3개 제한)
  const handleAddFridge = async (type: FridgeType) => {
    if (refrigerators.length >= 3) return;
    try {
      const newFridge = {
        id: `fridge_${Date.now()}`,
        type,
        name: `냉장고 ${refrigerators.length + 1}`
      };
      const updated = [...refrigerators, newFridge];
      setRefrigerators(updated);
      await AsyncStorage.setItem('@refrigerators', JSON.stringify(updated));
    } catch (e) {
      console.error('Failed to add refrigerator', e);
    }
  };

  // 기존 냉장고의 타입 변경
  const handleChangeFridgeType = async (fridgeId: string, newType: FridgeType) => {
    try {
      const updated = refrigerators.map(f => f.id === fridgeId ? { ...f, type: newType } : f);
      setRefrigerators(updated);
      await AsyncStorage.setItem('@refrigerators', JSON.stringify(updated));
    } catch (e) {
      console.error('Failed to change refrigerator type', e);
    }
  };

  // 냉장고 삭제 및 해당 냉장고의 식재료 제거
  const handleDeleteFridge = async (fridgeId: string) => {
    try {
      const updated = refrigerators.filter(f => f.id !== fridgeId);
      // 삭제 후 이름 순서 재정렬 (예: 냉장고 1, 냉장고 2)
      const renamed = updated.map((f, i) => ({ ...f, name: `냉장고 ${i + 1}` }));
      setRefrigerators(renamed);
      await AsyncStorage.setItem('@refrigerators', JSON.stringify(renamed));

      // 해당 냉장고에 보관 중이던 식재료도 일괄 제거
      const ingredientsStr = await AsyncStorage.getItem('@ingredients');
      if (ingredientsStr) {
        const allIngredients: Ingredient[] = JSON.parse(ingredientsStr);
        const filtered = allIngredients.filter(item => item.fridgeId !== fridgeId);
        await AsyncStorage.setItem('@ingredients', JSON.stringify(filtered));
      }
    } catch (e) {
      console.error('Failed to delete refrigerator', e);
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


