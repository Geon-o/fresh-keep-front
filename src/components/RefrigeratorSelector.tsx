import React, { useState } from 'react';
import { StyleSheet, TouchableOpacity, View, ScrollView } from 'react-native';
import { FridgeType } from '../types';
import { Text } from 'react-native';
import { useTheme } from '../context/ThemeContext';

interface RefrigeratorSelectorProps {
  onSelect: (type: FridgeType) => void;
  currentType?: FridgeType;
}

export default function RefrigeratorSelector({ onSelect, currentType }: RefrigeratorSelectorProps) {
  const [selected, setSelected] = useState<FridgeType>(currentType || 'four-door');
  const { theme } = useTheme();

  const isDisabled = currentType !== undefined && selected === currentType;

  const handleStart = () => {
    if (isDisabled) return;
    onSelect(selected);
  };

  return (
    <ScrollView 
      style={{ backgroundColor: theme.surface }}
      contentContainerStyle={[styles.container, { backgroundColor: theme.surface }]} 
      showsVerticalScrollIndicator={false}
    >
      <Text style={[styles.title, { color: theme.textPrimary }]}>우리 집 냉장고의 형태를 선택해 주세요! ❄️</Text>

      <View style={styles.cardContainer}>
        {/* 4문형 */}
        <TouchableOpacity
          style={[
            styles.card,
            { backgroundColor: theme.surface, borderColor: theme.borderLight },
            selected === 'four-door' && { borderColor: theme.primary, backgroundColor: theme.primaryLight }
          ]}
          activeOpacity={0.8}
          onPress={() => setSelected('four-door')}
        >
          {/* 미니 냉장고 그래픽 */}
          <View style={[styles.miniFridge, { backgroundColor: theme.fridgeFrame }]}>
            <View style={styles.fourDoorTop}>
              <View style={[styles.door, { backgroundColor: theme.fridgeDoor }, { borderTopLeftRadius: 6 }]} />
              <View style={[styles.door, { backgroundColor: theme.fridgeDoor }, { borderTopRightRadius: 6 }]} />
            </View>
            <View style={styles.fourDoorBottom}>
              <View style={[styles.door, { backgroundColor: theme.freezerDoor }, { borderBottomLeftRadius: 6 }]} />
              <View style={[styles.door, { backgroundColor: theme.freezerDoor }, { borderBottomRightRadius: 6 }]} />
            </View>
          </View>
          <Text style={[styles.cardTitle, { color: theme.textPrimary }]}>4문형 냉장고</Text>
          <Text style={[styles.cardDesc, { color: theme.textSecondary }]}>상단 양문 냉장실 / 하단 양문 냉동실 구조</Text>
        </TouchableOpacity>

        {/* 양문형 */}
        <TouchableOpacity
          style={[
            styles.card,
            { backgroundColor: theme.surface, borderColor: theme.borderLight },
            selected === 'side-by-side' && { borderColor: theme.primary, backgroundColor: theme.primaryLight }
          ]}
          activeOpacity={0.8}
          onPress={() => setSelected('side-by-side')}
        >
          {/* 미니 냉장고 그래픽 */}
          <View style={[styles.miniFridge, { backgroundColor: theme.fridgeFrame }]}>
            <View style={styles.sideBySide}>
              <View style={[styles.door, { backgroundColor: theme.freezerDoor }, { borderTopLeftRadius: 6, borderBottomLeftRadius: 6 }]} />
              <View style={[styles.door, { backgroundColor: theme.fridgeDoor }, { borderTopRightRadius: 6, borderBottomRightRadius: 6 }]} />
            </View>
          </View>
          <Text style={[styles.cardTitle, { color: theme.textPrimary }]}>양문형 (세로 2문)</Text>
          <Text style={[styles.cardDesc, { color: theme.textSecondary }]}>좌측 냉동실 / 우측 냉장실 구조</Text>
        </TouchableOpacity>

        {/* 일반 2문형 */}
        <TouchableOpacity
          style={[
            styles.card,
            { backgroundColor: theme.surface, borderColor: theme.borderLight },
            selected === 'two-door' && { borderColor: theme.primary, backgroundColor: theme.primaryLight }
          ]}
          activeOpacity={0.8}
          onPress={() => setSelected('two-door')}
        >
          {/* 미니 냉장고 그래픽 */}
          <View style={[styles.miniFridge, { backgroundColor: theme.fridgeFrame }]}>
            <View style={styles.twoDoor}>
              <View style={[styles.door, { backgroundColor: theme.freezerDoor }, { height: '35%', borderTopLeftRadius: 6, borderTopRightRadius: 6 }]} />
              <View style={[styles.door, { backgroundColor: theme.fridgeDoor }, { height: '60%', borderBottomLeftRadius: 6, borderBottomRightRadius: 6 }]} />
            </View>
          </View>
          <Text style={[styles.cardTitle, { color: theme.textPrimary }]}>일반 2문형 (가로 2문)</Text>
          <Text style={[styles.cardDesc, { color: theme.textSecondary }]}>상단 냉동실 / 하단 냉장실 구조</Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity 
        style={[
          styles.button, 
          { 
            backgroundColor: isDisabled ? theme.borderLight : theme.primary, 
            shadowColor: isDisabled ? 'transparent' : theme.primary 
          }
        ]} 
        activeOpacity={isDisabled ? 1 : 0.9} 
        onPress={handleStart}
        disabled={isDisabled}
      >
        <Text style={[styles.buttonText, { color: isDisabled ? theme.textMuted : theme.primaryOnPrimary }]}>
          {currentType !== undefined
            ? isDisabled
              ? '현재와 다른 타입을 선택해 주세요'
              : '이 타입으로 변경하기'
            : '이 냉장고로 시작하기'}
        </Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 24,
    paddingTop: 48,
    paddingBottom: 48,
    alignItems: 'center',
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#1A1A1A',
    textAlign: 'center',
    marginBottom: 32,
  },
  cardContainer: {
    width: '100%',
    gap: 16,
    marginBottom: 32,
  },
  card: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1.5,
    borderColor: '#ECEFF1',
    flexDirection: 'column',
    alignItems: 'center',
  },
  cardSelected: {
    borderColor: '#3F51B5',
    backgroundColor: 'rgba(63, 81, 181, 0.03)',
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1A1A1A',
    marginTop: 12,
    marginBottom: 4,
  },
  cardDesc: {
    fontSize: 12,
    color: '#666666',
    textAlign: 'center',
    lineHeight: 16,
  },
  miniFridge: {
    width: 60,
    height: 80,
    backgroundColor: '#333333',
    borderRadius: 8,
    padding: 2,
    gap: 2,
  },
  door: {
    backgroundColor: '#EAEAEA',
    flex: 1,
  },
  fridgeDoor: {
    backgroundColor: '#E3F2FD', // 연한 파랑 (냉장)
  },
  freezerDoor: {
    backgroundColor: '#E0F7FA', // 시원한 민트색 (냉동)
  },
  selectDoor: {
    backgroundColor: '#EDE7F6', // 연한 보라 (맞춤)
  },
  fourDoorTop: {
    flex: 5,
    flexDirection: 'row',
    gap: 2,
  },
  fourDoorBottom: {
    flex: 4,
    flexDirection: 'row',
    gap: 2,
  },
  sideBySide: {
    flex: 1,
    flexDirection: 'row',
    gap: 2,
  },
  twoDoor: {
    flex: 1,
    flexDirection: 'column',
    gap: 2,
  },
  button: {
    backgroundColor: '#3F51B5',
    width: '100%',
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: 'center',
    shadowColor: '#3F51B5',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 3,
  },
  buttonText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 16,
  },
});
