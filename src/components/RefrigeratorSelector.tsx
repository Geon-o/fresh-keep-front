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
  const { theme } = useTheme();

  const handleSelectType = (type: FridgeType) => {
    if (currentType !== undefined && type === currentType) {
      return;
    }
    onSelect(type);
  };

  const renderCard = (type: FridgeType, title: string, desc: string, renderGraphic: () => React.JSX.Element) => {
    const isCurrent = currentType !== undefined && type === currentType;

    return (
      <TouchableOpacity
        style={[
          styles.card,
          { 
            backgroundColor: theme.surface, 
            borderColor: theme.borderLight,
            opacity: isCurrent ? 0.5 : 1.0 
          }
        ]}
        activeOpacity={isCurrent ? 1.0 : 0.7}
        onPress={() => handleSelectType(type)}
        disabled={isCurrent}
      >
        {isCurrent && (
          <View style={[styles.currentBadge, { backgroundColor: theme.primary }]}>
            <Text style={[styles.currentBadgeText, { color: theme.primaryOnPrimary }]}>현재 사용 중</Text>
          </View>
        )}
        {renderGraphic()}
        <Text style={[styles.cardTitle, { color: theme.textPrimary }]}>{title}</Text>
        <Text style={[styles.cardDesc, { color: theme.textSecondary }]}>{desc}</Text>
      </TouchableOpacity>
    );
  };

  return (
    <ScrollView 
      style={{ backgroundColor: theme.surface }}
      contentContainerStyle={[styles.container, { backgroundColor: theme.surface }]} 
      showsVerticalScrollIndicator={false}
    >
      <Text style={[styles.title, { color: theme.textPrimary }]}>
        {currentType !== undefined
          ? '변경할 냉장고의 형태를 선택해 주세요! ❄️'
          : '우리 집 냉장고의 형태를 선택해 주세요! ❄️'}
      </Text>

      <View style={styles.cardContainer}>
        {/* 4문형 */}
        {renderCard('four-door', '4문형 냉장고', '상단 양문 냉장실 / 하단 양문 냉동실 구조', () => (
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
        ))}

        {/* 양문형 */}
        {renderCard('side-by-side', '양문형 (세로 2문)', '좌측 냉동실 / 우측 냉장실 구조', () => (
          <View style={[styles.miniFridge, { backgroundColor: theme.fridgeFrame }]}>
            <View style={styles.sideBySide}>
              <View style={[styles.door, { backgroundColor: theme.freezerDoor }, { borderTopLeftRadius: 6, borderBottomLeftRadius: 6 }]} />
              <View style={[styles.door, { backgroundColor: theme.fridgeDoor }, { borderTopRightRadius: 6, borderBottomRightRadius: 6 }]} />
            </View>
          </View>
        ))}

        {/* 일반 2문형 */}
        {renderCard('two-door', '일반 2문형 (가로 2문)', '상단 냉동실 / 하단 냉장실 구조', () => (
          <View style={[styles.miniFridge, { backgroundColor: theme.fridgeFrame }]}>
            <View style={styles.twoDoor}>
              <View style={[styles.door, { backgroundColor: theme.freezerDoor }, { height: '35%', borderTopLeftRadius: 6, borderTopRightRadius: 6 }]} />
              <View style={[styles.door, { backgroundColor: theme.fridgeDoor }, { height: '60%', borderBottomLeftRadius: 6, borderBottomRightRadius: 6 }]} />
            </View>
          </View>
        ))}
      </View>
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
  currentBadge: {
    position: 'absolute',
    top: 12,
    right: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  currentBadgeText: {
    fontSize: 10,
    fontWeight: 'bold',
  },
});
