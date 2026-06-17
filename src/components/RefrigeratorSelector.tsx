import React, { useState } from 'react';
import { StyleSheet, TouchableOpacity, View, ScrollView, Modal, Text } from 'react-native';
import { FridgeType } from '../types';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';

interface RefrigeratorSelectorProps {
  onSelect: (type: FridgeType) => void;
  currentType?: FridgeType;
}

export default function RefrigeratorSelector({ onSelect, currentType }: RefrigeratorSelectorProps) {
  const { theme } = useTheme();

  // 경고 모달 관련 상태
  const [warningModalVisible, setWarningModalVisible] = useState(false);
  const [tempSelectedType, setTempSelectedType] = useState<FridgeType | null>(null);
  const [isAgreed, setIsAgreed] = useState(false);

  const handleSelectType = (type: FridgeType) => {
    if (currentType !== undefined && type === currentType) {
      return;
    }
    if (currentType !== undefined) {
      // 수정 모드: 즉시 변경을 방지하고 데이터 유실 경고 모달을 띄움
      setTempSelectedType(type);
      setIsAgreed(false);
      setWarningModalVisible(true);
    } else {
      // 신규 추가 모드: 터치 시 바로 추가 완료
      onSelect(type);
    }
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

      {/* 냉장고 타입 변경 주의 및 동의 모달 */}
      <Modal
        visible={warningModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setWarningModalVisible(false)}
      >
        <View style={styles.warningModalOverlay}>
          <View style={[styles.warningModalContent, { backgroundColor: theme.surface, borderColor: theme.borderLight }]}>
            <View style={styles.warningHeader}>
              <Ionicons name="warning" size={28} color={theme.danger} />
              <Text style={[styles.warningTitle, { color: theme.textPrimary }]}>냉장고 형태 변경 주의</Text>
            </View>

            <View style={styles.warningBody}>
              <Text style={[styles.warningText, { color: theme.textSecondary }]}>
                냉장고의 타입을 변경하시면, <Text style={{ fontWeight: 'bold', color: theme.danger }}>현재 보관 중인 모든 식재료 데이터가 삭제</Text>되고 선택하신 구조의 새로운 냉장고로 배치됩니다.
              </Text>
              <Text style={[styles.warningTextSub, { color: theme.textTertiary }]}>
                이 작업은 되돌릴 수 없으니 신중히 결정해 주세요.
              </Text>

              {/* 동의 체크박스 */}
              <TouchableOpacity
                style={styles.checkboxContainer}
                activeOpacity={0.8}
                onPress={() => setIsAgreed(!isAgreed)}
              >
                <Ionicons
                  name={isAgreed ? 'checkbox' : 'square-outline'}
                  size={22}
                  color={isAgreed ? theme.primary : theme.textMuted}
                />
                <Text style={[styles.checkboxLabel, { color: theme.textPrimary }]}>
                  위 주의사항을 확인하였으며, 이에 동의합니다.
                </Text>
              </TouchableOpacity>
            </View>

            <View style={styles.warningButtonRow}>
              <TouchableOpacity
                style={[styles.warningButton, styles.warningCancelButton, { backgroundColor: theme.surfaceSecondary }]}
                activeOpacity={0.7}
                onPress={() => setWarningModalVisible(false)}
              >
                <Text style={[styles.warningCancelText, { color: theme.textSecondary }]}>취소</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.warningButton,
                  styles.warningConfirmButton,
                  { 
                    backgroundColor: isAgreed ? theme.primary : theme.borderLight,
                  }
                ]}
                activeOpacity={isAgreed ? 0.8 : 1}
                disabled={!isAgreed}
                onPress={() => {
                  if (isAgreed && tempSelectedType) {
                    setWarningModalVisible(false);
                    onSelect(tempSelectedType);
                  }
                }}
              >
                <Text style={[styles.warningConfirmText, { color: isAgreed ? theme.primaryOnPrimary : theme.textMuted }]}>
                  변경하기
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
  warningModalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
  },
  warningModalContent: {
    width: '85%',
    borderRadius: 20,
    borderWidth: 1,
    padding: 20,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 5,
  },
  warningHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 16,
  },
  warningTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  warningBody: {
    gap: 12,
    marginBottom: 20,
  },
  warningText: {
    fontSize: 14,
    lineHeight: 20,
  },
  warningTextSub: {
    fontSize: 12,
    lineHeight: 16,
  },
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 8,
    paddingVertical: 4,
  },
  checkboxLabel: {
    fontSize: 13,
    fontWeight: '600',
    flex: 1,
  },
  warningButtonRow: {
    flexDirection: 'row',
    gap: 10,
  },
  warningButton: {
    flex: 1,
    height: 44,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  warningCancelButton: {
    borderWidth: 1,
    borderColor: 'transparent',
  },
  warningConfirmButton: {
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  warningCancelText: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  warningConfirmText: {
    fontSize: 14,
    fontWeight: 'bold',
  },
});
