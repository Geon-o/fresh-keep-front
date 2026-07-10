import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, ScrollView, Platform, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../src/context/ThemeContext';
import { useAuth } from '../../src/context/AuthContext';
import * as Clipboard from 'expo-clipboard';

export default function BackupViewScreen() {
  const router = useRouter();
  const { isDark } = useTheme();
  const { getBackupKey } = useAuth();

  const [backupKey, setBackupKey] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showKey, setShowKey] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let isMounted = true;
    getBackupKey()
      .then(key => {
        if (isMounted) {
          setBackupKey(key);
        }
      })
      .catch(e => {
        console.error('Error fetching backup key:', e);
      })
      .finally(() => {
        if (isMounted) {
          setIsLoading(false);
        }
      });
    return () => {
      isMounted = false;
    };
  }, []);

  const handleCopy = async () => {
    if (!backupKey) return;
    try {
      await Clipboard.setStringAsync(backupKey);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (e) {
      console.error('Failed to copy', e);
    }
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
        <Text style={[styles.headerTitle, { color: titleColor }]}>연동 코드 확인</Text>
        <View style={styles.headerRightSpacer} />
      </View>

      <ScrollView contentContainerStyle={styles.contentContainer} showsVerticalScrollIndicator={false}>
        <Text style={[styles.sectionDesc, { color: descColor }]}>
          기기를 변경하거나 앱을 재설치할 때 데이터를 이어갈 수 있도록 연동 코드를 안전하게 보관하세요.
        </Text>

        {/* 연동 코드 확인 카드 */}
        <View style={[styles.card, { backgroundColor: cardColor, borderColor }]}>
          <Text style={[styles.cardLabel, { color: titleColor }]}>내 연동 코드</Text>
          
          {isLoading ? (
            <View style={styles.loadingWrapper}>
              <ActivityIndicator size="small" color={isDark ? '#BBDEFB' : '#0F172A'} />
              <Text style={[styles.loadingText, { color: descColor }]}>불러오는 중...</Text>
            </View>
          ) : backupKey ? (
            <>
              <View style={[styles.keyTextWrapper, { backgroundColor: isDark ? '#101012' : '#F9FAFB' }]}>
                <Text style={[styles.keyText, { color: descColor }]}>
                  {showKey ? backupKey : 'FK-••••-••••-••••'}
                </Text>
                <View style={styles.keyButtonGroup}>
                  <TouchableOpacity onPress={() => setShowKey(!showKey)} style={[styles.keyIconButton, { backgroundColor: isDark ? '#2C2C2E' : '#F3F4F6' }]} activeOpacity={0.7}>
                    <Ionicons name={showKey ? "eye-off" : "eye"} size={16} color={isDark ? '#E5E7EB' : '#4B5563'} />
                  </TouchableOpacity>
                </View>
              </View>
              
              <TouchableOpacity 
                onPress={handleCopy} 
                style={[
                  styles.copyFullButton, 
                  { backgroundColor: copied ? '#10B981' : (isDark ? '#2C2C2E' : '#F3F4F6') }
                ]} 
                activeOpacity={0.7}
              >
                <Ionicons 
                  name={copied ? "checkmark-circle" : "copy-outline"} 
                  size={16} 
                  color={copied ? '#FFFFFF' : (isDark ? '#E5E7EB' : '#4B5563')} 
                  style={{ marginRight: 6 }} 
                />
                <Text style={[
                  styles.copyFullButtonText, 
                  { color: copied ? '#FFFFFF' : (isDark ? '#E5E7EB' : '#4B5563') }
                ]}>
                  {copied ? '복사 완료' : '연동 코드 복사하기'}
                </Text>
              </TouchableOpacity>
            </>
          ) : (
            <View style={styles.noKeyWrapper}>
              <Ionicons name="alert-circle-outline" size={20} color="#EF4444" />
              <Text style={[styles.noKeyText, { color: '#EF4444' }]}>연동 코드를 불러오지 못했습니다.</Text>
            </View>
          )}
        </View>

        {/* 보안 주의 경고 박스 */}
        <View style={[styles.warningBox, { backgroundColor: isDark ? 'rgba(239, 68, 68, 0.08)' : 'rgba(239, 68, 68, 0.04)', borderColor: isDark ? 'rgba(239, 68, 68, 0.15)' : 'rgba(239, 68, 68, 0.1)' }]}>
          <View style={styles.warningHeader}>
            <Ionicons name="warning" size={16} color="#EF4444" />
            <Text style={[styles.warningTitle, { color: '#EF4444' }]}>
              {backupKey ? '보안 및 분실 주의' : '연동 코드를 불러오지 못함'}
            </Text>
          </View>
          <Text style={[styles.warningBodyText, { color: descColor }]}>
            {backupKey ? (
              `1. 기기 변경, 앱 삭제 시 이 연동 코드가 없으면 기존의 냉장고 데이터를 이어받을 수 없으니 분실하지 않도록 주의해 주세요.\n\n2. 연동 코드가 타인에게 노출되지 않도록 안전한 개인 메모장 등에 별도로 기록하여 보관하시는 것을 권장합니다.`
            ) : (
              `연동 코드를 불러오지 못했습니다.\n\n네트워크 연결을 확인한 뒤 화면을 다시 열면 새 연동 코드가 자동으로 발급됩니다. 재발급되어도 기존 냉장고 데이터는 그대로 유지되며, 데이터를 지우려면 이 화면이 아니라 설정의 '초기화' 메뉴를 이용해야 합니다.`
            )}
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
  keyTextWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
    gap: 12,
  },
  keyText: {
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 0.5,
    flex: 1,
  },
  keyButtonGroup: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  keyIconButton: {
    width: 32,
    height: 32,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  copyFullButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 12,
    marginTop: 12,
  },
  copyFullButtonText: {
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
  loadingWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
  },
  loadingText: {
    fontSize: 13,
    fontWeight: '600',
  },
  noKeyWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
  },
  noKeyText: {
    fontSize: 13,
    fontWeight: '700',
  },
});
