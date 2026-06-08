import React, { useState, useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { FridgeType } from '../src/types';
import RefrigeratorVisual from '../src/components/RefrigeratorVisual';
import CompartmentDetail from '../src/components/CompartmentDetail';

export default function Index() {
  const [fridgeType, setFridgeType] = useState<FridgeType | null>(null);
  const [activeCompartment, setActiveCompartment] = useState<{ id: string; label: string } | null>(null);

  // 앱 로드 시 로컬 저장소에서 냉장고 타입 불러오기
  useEffect(() => {
    const loadFridgeType = async () => {
      try {
        const storedType = await AsyncStorage.getItem('@fridge_type');
        if (storedType) {
          setFridgeType(storedType as FridgeType);
        }
      } catch (e) {
        console.error('Failed to load fridge type', e);
      }
    };
    loadFridgeType();
  }, []);

  const handleSelectType = async (type: FridgeType) => {
    try {
      setFridgeType(type);
      await AsyncStorage.setItem('@fridge_type', type);
    } catch (e) {
      console.error('Failed to save fridge type', e);
    }
  };

  const handleResetType = async () => {
    try {
      setFridgeType(null);
      setActiveCompartment(null);
      await AsyncStorage.removeItem('@fridge_type');
    } catch (e) {
      console.error('Failed to reset fridge type', e);
    }
  };

  const handlePressCompartment = (id: string, label: string) => {
    setActiveCompartment({ id, label });
  };

  return (
    <SafeAreaView style={styles.container}>
      {activeCompartment !== null ? (
        <CompartmentDetail
          compartmentId={activeCompartment.id}
          compartmentLabel={activeCompartment.label}
          onBack={() => setActiveCompartment(null)}
        />
      ) : (
        <RefrigeratorVisual
          type={fridgeType}
          onPressCompartment={handlePressCompartment}
          onReset={handleResetType}
          onSelectType={handleSelectType}
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

