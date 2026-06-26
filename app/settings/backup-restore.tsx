import React, { useState } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, ScrollView, TextInput, ActivityIndicator, Alert, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../src/context/ThemeContext';
import { useAuth } from '../../src/context/AuthContext';

export default function BackupRestoreScreen() {
  const router = useRouter();
  const { isDark } = useTheme();
  const { restoreBackup } = useAuth();

  const [backupKeyInput, setBackupKeyInput] = useState('');
  const [isRestoring, setIsRestoring] = useState(false);

  const handleRestore = async () => {
    const trimmedKey = backupKeyInput.trim();
    if (!trimmedKey) {
      Alert.alert('알림', '복구 키를 입력해 주세요.');
      return;
    }

    setIsRestoring(true);
    try {
      const success = await restoreBackup(trimmedKey);
      if (success) {
        // 복구 성공 시 메인 화면('/')으로 복귀하여 새로운 데이터를 로드하도록 처리
        router.replace('/');
      }
    } catch (e) {
      console.error('Restore action error:', e);
      Alert.alert('오류 ❌', '복구 처리 중 예상치 못한 에러가 발생했습니다.');
    } finally {
      setIsRestoring(false);
    }
  };

  // 2026 Toss-style Color Tokens
  const backgroundColor = isDark ? '#101012' : '#F3F4F6';
  const cardColor = isDark ? '#1C1C1E' : '#FFFFFF';
  const borderColor = isDark ? 'rgba(255, 255, 255, 0.04)' : 'rgba(0, 0, 0, 0.03)';
  const titleColor = isDark ? '#F5F5F5' : '#1F2937';
  const descColor = isDark ? '#A3A3A3' : '#6B7280';
  const placeholderColor = isDark ? 'rgba(255, 255, 255, 0.25)' : 'rgba(0, 0, 0, 0.25)';

  const isButtonDisabled = !backupKeyInput.trim() || isRestoring;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor }]} edges={['top', 'left', 'right', 'bottom']}>
      {/* 헤더 */}
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton} 
          onPress={() => router.back()} 
          disabled={isRestoring}
          activeOpacity={0.7}
        >
          <Ionicons name="chevron-back" size={24} color={titleColor} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: titleColor }]}>데이터 복구</Text>
        <View style={styles.headerRightSpacer} />
      </View>

      <ScrollView contentContainerStyle={styles.contentContainer} showsVerticalScrollIndicator={false}>
        <Text style={[styles.sectionDesc, { color: descColor }]}>
          보관 중인 복구용 백업 키를 입력해 이전 기기의 냉장고 데이터를 안전하게 이관 및 복구합니다.
        </Text>

        {/* 백업 키 입력 카드 */}
        <View style={[styles.card, { backgroundColor: cardColor, borderColor }]}>
          <Text style={[styles.cardLabel, { color: titleColor }]}>복구 키 입력</Text>
          <TextInput
            style={[
              styles.textInput, 
              { 
                backgroundColor: isDark ? '#101012' : '#F9FAFB', 
                color: titleColor,
                borderColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.08)'
              }
            ]}
            placeholder="FK-XXXX-XXXX-XXXX"
            placeholderTextColor={placeholderColor}
            value={backupKeyInput}
            onChangeText={setBackupKeyInput}
            autoCapitalize="characters"
            autoCorrect={false}
            editable={!isRestoring}
          />
          
          <TouchableOpacity 
            onPress={handleRestore} 
            disabled={isButtonDisabled}
            style={[
              styles.restoreButton, 
              { 
                backgroundColor: isDark ? '#BBDEFB' : '#0F172A',
                opacity: isButtonDisabled ? 0.4 : 1
              }
            ]} 
            activeOpacity={0.7}
          >
            {isRestoring ? (
              <ActivityIndicator size="small" color={isDark ? '#0F172A' : '#FFFFFF'} />
            ) : (
              <>
                <Ionicons 
                  name="cloud-download-outline" 
                  size={18} 
                  color={isDark ? '#0F172A' : '#FFFFFF'} 
                  style={{ marginRight: 6 }} 
                />
                <Text style={[
                  styles.restoreButtonText, 
                  { color: isDark ? '#0F172A' : '#FFFFFF' }
                ]}>
                  데이터 복구하기
                </Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        {/* 안내 및 주의사항 경고 박스 */}
        <View style={[styles.warningBox, { backgroundColor: isDark ? 'rgba(59, 130, 246, 0.08)' : 'rgba(59, 130, 246, 0.04)', borderColor: isDark ? 'rgba(59, 130, 246, 0.15)' : 'rgba(59, 130, 246, 0.1)' }]}>
          <View style={styles.warningHeader}>
            <Ionicons name="information-circle" size={16} color={isDark ? '#60A5FA' : '#2563EB'} />
            <Text style={[styles.warningTitle, { color: isDark ? '#60A5FA' : '#2563EB' }]}>데이터 복구 시 주의사항</Text>
          </View>
          <Text style={[styles.warningBodyText, { color: descColor }]}>
            {`1. 복구를 완료하면 현재 기기에 로컬 세션으로 저장되어 있던 기존 냉장고 구성 및 재료 목록은 지워집니다.\n\n2. 입력하신 백업 키와 연동된 이전 클라우드 데이터베이스의 정보로 완벽하게 대체 및 갱신됩니다.\n\n3. 복구가 성공적으로 끝나면 안전한 데이터 동기화를 위해 메인 화면이 다시 로드됩니다.`}
          </Text>
        </View>
      </ScrollView>
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
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 40,
  },
  sectionDesc: {
    fontSize: 13,
    height: 'auto',
    lineHeight: 18,
    marginBottom: 20,
    paddingHorizontal: 4,
  },
  card: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    marginBottom: 16,
  },
  cardLabel: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 12,
  },
  textInput: {
    height: 48,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 16,
    fontSize: 15,
    fontWeight: '600',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    letterSpacing: 0.5,
    marginBottom: 12,
  },
  restoreButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    marginTop: 4,
  },
  restoreButtonText: {
    fontSize: 14,
    fontWeight: '700',
  },
  warningBox: {
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    gap: 10,
  },
  warningHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  warningTitle: {
    fontSize: 15,
    fontWeight: '700',
  },
  warningBodyText: {
    fontSize: 13,
    lineHeight: 20,
  },
});
