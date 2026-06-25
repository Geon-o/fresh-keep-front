import React, { useState } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../src/context/ThemeContext';
import { useAuth } from '../../src/context/AuthContext';

export default function ResetSettingScreen() {
  const router = useRouter();
  const { theme, isDark } = useTheme();
  const { logout } = useAuth();

  const [isResetChecked, setIsResetChecked] = useState(false);

  const handleReset = () => {
    if (!isResetChecked) return;
    logout();
    router.replace('/');
  };

  // 2026 Toss-style Color Tokens
  const backgroundColor = isDark ? '#101012' : '#F3F4F6';
  const cardColor = isDark ? '#1C1C1E' : '#FFFFFF';
  const borderColor = isDark ? 'rgba(255, 255, 255, 0.04)' : 'rgba(0, 0, 0, 0.03)';
  const titleColor = isDark ? '#F5F5F5' : '#1F2937';
  const descColor = isDark ? '#A3A3A3' : '#6B7280';

  return (
    <SafeAreaView style={[styles.container, { backgroundColor }]} edges={['top', 'left', 'right', 'bottom']}>
      {/* 헤더 */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()} activeOpacity={0.7}>
          <Ionicons name="chevron-back" size={24} color={titleColor} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: titleColor }]}>초기화</Text>
        <View style={styles.headerRightSpacer} />
      </View>

      <View style={styles.contentContainer}>
        {/* 경고 정보 카드 */}
        <View style={[styles.card, { backgroundColor: cardColor, borderColor }]}>
          <View style={styles.alertHeader}>
            <Ionicons name="warning" size={26} color="#EF4444" />
            <Text style={[styles.alertTitle, { color: titleColor }]}>정말 초기화하시겠습니까?</Text>
          </View>

          <Text style={[styles.alertBody, { color: descColor }]}>
            초기화를 진행하면 현재 기기에 등록된 모든 냉장고 구획 정보와 보관 중인 식재료 기록 데이터가 데이터베이스 및 로컬 저장소에서 영구히 삭제됩니다.{"\n\n"}
            본 작업은 복구 키를 소유하고 있더라도 되돌릴 수 없는 완전한 삭제 작업입니다. 신중하게 선택해 주시기 바랍니다.
          </Text>

          <TouchableOpacity 
            style={styles.checkboxWrapper} 
            onPress={() => setIsResetChecked(!isResetChecked)}
            activeOpacity={0.8}
          >
            <Ionicons 
              name={isResetChecked ? "checkbox" : "square-outline"} 
              size={22} 
              color={isResetChecked ? theme.primary : descColor} 
            />
            <Text style={[styles.checkboxText, { color: titleColor }]}>이해했습니다.</Text>
          </TouchableOpacity>
        </View>

        {/* 하단 버튼 행 */}
        <View style={styles.buttonRow}>
          <TouchableOpacity 
            style={[styles.button, styles.cancelButton, { backgroundColor: isDark ? '#2C2C2E' : '#E5E7EB' }]} 
            onPress={() => router.back()}
            activeOpacity={0.7}
          >
            <Text style={[styles.cancelText, { color: titleColor }]}>취소</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[
              styles.button, 
              styles.confirmButton, 
              { 
                backgroundColor: isResetChecked ? '#EF4444' : (isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)'),
                opacity: isResetChecked ? 1.0 : 0.4
              }
            ]} 
            disabled={!isResetChecked}
            onPress={handleReset}
            activeOpacity={0.7}
          >
            <Text style={[styles.confirmText, { color: isResetChecked ? '#FFFFFF' : descColor }]}>초기화</Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: 56,
    paddingHorizontal: 8,
  },
  backButton: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  headerRightSpacer: {
    width: 44,
  },
  contentContainer: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 40,
    justifyContent: 'space-between',
  },
  card: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 18,
  },
  alertHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 16,
  },
  alertTitle: {
    fontSize: 17,
    fontWeight: '700',
  },
  alertBody: {
    fontSize: 13,
    lineHeight: 20,
    marginBottom: 24,
  },
  checkboxWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 8,
  },
  checkboxText: {
    fontSize: 14,
    fontWeight: '700',
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: Platform.OS === 'ios' ? 10 : 20,
  },
  button: {
    flex: 1,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cancelButton: {},
  cancelText: {
    fontSize: 14,
    fontWeight: '700',
  },
  confirmButton: {},
  confirmText: {
    fontSize: 14,
    fontWeight: '700',
  },
});
