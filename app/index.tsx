import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { FridgeType } from '../src/types';
import RefrigeratorSelector from '../src/components/RefrigeratorSelector';
import RefrigeratorVisual from '../src/components/RefrigeratorVisual';
import CompartmentDetail from '../src/components/CompartmentDetail';

export default function Index() {
  const [fridgeType, setFridgeType] = useState<FridgeType | null>(null);
  const [activeCompartment, setActiveCompartment] = useState<{ id: string; label: string } | null>(null);

  const handlePressCompartment = (id: string, label: string) => {
    setActiveCompartment({ id, label });
  };

  return (
    <SafeAreaView style={styles.container}>
      {fridgeType === null ? (
        <RefrigeratorSelector onSelect={setFridgeType} />
      ) : activeCompartment !== null ? (
        <CompartmentDetail
          compartmentId={activeCompartment.id}
          compartmentLabel={activeCompartment.label}
          onBack={() => setActiveCompartment(null)}
        />
      ) : (
        <RefrigeratorVisual
          type={fridgeType}
          onPressCompartment={handlePressCompartment}
          onReset={() => {
            setFridgeType(null);
            setActiveCompartment(null);
          }}
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
