import React, { useState } from 'react';
import { StyleSheet, TouchableOpacity, View, ScrollView } from 'react-native';
import { FridgeType } from '../types';
import { Text } from 'react-native';

interface RefrigeratorSelectorProps {
  onSelect: (type: FridgeType) => void;
}

export default function RefrigeratorSelector({ onSelect }: RefrigeratorSelectorProps) {
  const [selected, setSelected] = useState<FridgeType>('four-door');

  const handleStart = () => {
    onSelect(selected);
  };

  return (
    <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
      <Text style={styles.title}>우리 집 냉장고의 형태를 선택해 주세요! ❄️</Text>

      <View style={styles.cardContainer}>
        {/* 4문형 */}
        <TouchableOpacity
          style={[styles.card, selected === 'four-door' && styles.cardSelected]}
          activeOpacity={0.8}
          onPress={() => setSelected('four-door')}
        >
          {/* 미니 냉장고 그래픽 */}
          <View style={styles.miniFridge}>
            <View style={styles.fourDoorTop}>
              <View style={[styles.door, styles.fridgeDoor, { borderTopLeftRadius: 6 }]} />
              <View style={[styles.door, styles.fridgeDoor, { borderTopRightRadius: 6 }]} />
            </View>
            <View style={styles.fourDoorBottom}>
              <View style={[styles.door, styles.freezerDoor, { borderBottomLeftRadius: 6 }]} />
              <View style={[styles.door, styles.freezerDoor, { borderBottomRightRadius: 6 }]} />
            </View>
          </View>
          <Text style={styles.cardTitle}>4문형 냉장고</Text>
          <Text style={styles.cardDesc}>상단 양문 냉장실 / 하단 양문 냉동실 구조</Text>
        </TouchableOpacity>

        {/* 양문형 */}
        <TouchableOpacity
          style={[styles.card, selected === 'side-by-side' && styles.cardSelected]}
          activeOpacity={0.8}
          onPress={() => setSelected('side-by-side')}
        >
          {/* 미니 냉장고 그래픽 */}
          <View style={styles.miniFridge}>
            <View style={styles.sideBySide}>
              <View style={[styles.door, styles.freezerDoor, { borderTopLeftRadius: 6, borderBottomLeftRadius: 6 }]} />
              <View style={[styles.door, styles.fridgeDoor, { borderTopRightRadius: 6, borderBottomRightRadius: 6 }]} />
            </View>
          </View>
          <Text style={styles.cardTitle}>양문형 (세로 2문)</Text>
          <Text style={styles.cardDesc}>좌측 냉동실 / 우측 냉장실 구조</Text>
        </TouchableOpacity>

        {/* 일반 2문형 */}
        <TouchableOpacity
          style={[styles.card, selected === 'two-door' && styles.cardSelected]}
          activeOpacity={0.8}
          onPress={() => setSelected('two-door')}
        >
          {/* 미니 냉장고 그래픽 */}
          <View style={styles.miniFridge}>
            <View style={styles.twoDoor}>
              <View style={[styles.door, styles.freezerDoor, { height: '35%', borderTopLeftRadius: 6, borderTopRightRadius: 6 }]} />
              <View style={[styles.door, styles.fridgeDoor, { height: '60%', borderBottomLeftRadius: 6, borderBottomRightRadius: 6 }]} />
            </View>
          </View>
          <Text style={styles.cardTitle}>일반 2문형 (가로 2문)</Text>
          <Text style={styles.cardDesc}>상단 냉동실 / 하단 냉장실 구조</Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity style={styles.button} activeOpacity={0.9} onPress={handleStart}>
        <Text style={styles.buttonText}>이 냉장고로 시작하기</Text>
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
