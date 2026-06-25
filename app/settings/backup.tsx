import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, ScrollView, Platform, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../src/context/ThemeContext';
import { useAuth } from '../../src/context/AuthContext';
import * as Clipboard from 'expo-clipboard';

export default function BackupSettingScreen() {
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
        <Text style={[styles.headerTitle, { color: titleColor }]}>보안 및 복구</Text>
        <View style={styles.headerRightSpacer} />
      </View>

      <ScrollView contentContainerStyle={styles.contentContainer} showsVerticalScrollIndicator={false}>
        <Text style={[styles.sectionDesc, { color: descColor }]}>
          기기를 변경하거나 앱을 재설치할 때 데이터를 안전하게 복구할 수 있도록 고유 백업 키를 보관하세요.
        </Text>

        {/* 백업 키 확인 카드 */}
        <View style={[styles.card, { backgroundColor: cardColor, borderColor }]}>
          <Text style={[styles.cardLabel, { color: titleColor }]}>데이터 복구용 백업 키</Text>
          
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
                  {copied ? '복사 완료' : '백업 키 복사하기'}
                </Text>
              </TouchableOpacity>
            </>
          ) : (
            <View style={styles.noKeyWrapper}>
              <Ionicons name="alert-circle-outline" size={20} color="#EF4444" />
              <Text style={[styles.noKeyText, { color: '#EF4444' }]}>저장된 백업 키가 없습니다.</Text>
            </View>
          )}
        </View>

        {/* 보안 주의 경고 박스 */}
        <View style={[styles.warningBox, { backgroundColor: isDark ? 'rgba(239, 68, 68, 0.08)' : 'rgba(239, 68, 68, 0.04)', borderColor: isDark ? 'rgba(239, 68, 68, 0.15)' : 'rgba(239, 68, 68, 0.1)' }]}>
          <View style={styles.warningHeader}>
            <Ionicons name="warning" size={16} color="#EF4444" />
            <Text style={[styles.warningTitle, { color: '#EF4444' }]}>
              {backupKey ? '보안 및 분실 주의' : '백업 키 누락 경고'}
            </Text>
          </View>
          <Text style={[styles.warningBodyText, { color: descColor }]}>
            {backupKey ? (
              `1. FreshKeep은 이메일이나 소셜 로그인을 제공하지 않는 100% 익명 서비스입니다.\n\n2. 기기 분실, 앱 삭제, 또는 기기 초기화 시 이 백업 키를 분실하면 그 어떠한 방법으로도 서버에 저장된 냉장고 데이터를 찾거나 복원할 수 없습니다.\n\n3. 백업 키는 유출되지 않도록 직접 오프라인 메모장이나 안전한 저장소에 기록하여 비밀스럽게 보관해 주십시오.`
            ) : (
              `현재 기기의 안전 저장소에서 복구용 백업 키를 찾을 수 없습니다.\n\n이 현상은 기기의 로컬 저장소가 만료되었거나 임의로 삭제되었을 때 발생할 수 있습니다.\n\n나중에 데이터를 안전하게 복구하거나 타 기기로 옮기려면, 설정 화면의 '초기화' 메뉴를 통해 현재 익명 세션을 완전히 초기화하시고 새로운 백업 키를 재발급받아 활용해 주시기 바랍니다.`
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
