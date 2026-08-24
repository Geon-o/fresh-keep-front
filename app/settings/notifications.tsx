import React, { useEffect, useState } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, ScrollView, Switch, Alert, Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../src/context/ThemeContext';
import { isShareNotificationsEnabled, setShareNotificationsEnabled } from '../../src/utils/pushToken';
import { getNotificationPermissionState } from '../../src/utils/ingredientNotifications';

export default function NotificationSettingsScreen() {
  const router = useRouter();
  const { isDark } = useTheme();
  const [shareOn, setShareOn] = useState(true);

  // 저장된 설정이 켜져 있어도 실제 기기 알림 권한이 꺼져 있으면(한 번도 허용 안 했거나 거부함)
  // 실제로는 알림이 갈 수 없는 상태이므로 토글을 꺼진 것으로 보여준다.
  useEffect(() => {
    Promise.all([isShareNotificationsEnabled(), getNotificationPermissionState()]).then(
      ([storedEnabled, { granted }]) => setShareOn(storedEnabled && granted)
    );
  }, []);

  // 공유 냉장고 알림 토글: 화면은 즉시 반영하고, 서버 토큰 등록/해제는 뒤에서 처리한다.
  // 켤 때 기기 알림 권한이 없으면: OS가 다시 물어봐줄 수 있는 상태면 registerPushToken 내부에서
  // 네이티브 허용 다이얼로그가 자동으로 뜨고, OS가 더 이상 안 물어봐주는 상태(canAskAgain: false)일 때만
  // 기기 설정으로 이동할지 사용자에게 먼저 물어본다(임의로 이동시키지 않는다).
  const handleToggleShare = async (next: boolean) => {
    setShareOn(next);
    if (next) {
      const { granted, canAskAgain } = await getNotificationPermissionState();
      if (!granted && !canAskAgain) {
        Alert.alert(
          '알림 권한이 꺼져 있어요',
          '기기 설정에서 알림을 허용해야 공유 냉장고 알림을 받을 수 있어요.',
          [
            { text: '취소', style: 'cancel' },
            { text: '설정으로 이동', onPress: () => Linking.openSettings() },
          ]
        );
      }
    }
    setShareNotificationsEnabled(next).catch(e => {
      console.error('Failed to update share notification setting', e);
    });
  };

  // 2026 Toss-style Color Tokens
  const backgroundColor = isDark ? '#101012' : '#F3F4F6';
  const cardColor = isDark ? '#1C1C1E' : '#FFFFFF';
  const borderColor = isDark ? 'rgba(255, 255, 255, 0.04)' : 'rgba(0, 0, 0, 0.03)';
  const dividerColor = isDark ? 'rgba(255, 255, 255, 0.06)' : 'rgba(0, 0, 0, 0.06)';
  const titleColor = isDark ? '#F5F5F5' : '#1F2937';
  const descColor = isDark ? '#A3A3A3' : '#6B7280';
  const iconColor = isDark ? '#9CA3AF' : '#4B5563';

  return (
    <SafeAreaView style={[styles.container, { backgroundColor }]} edges={['top', 'left', 'right', 'bottom']}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()} activeOpacity={0.7}>
          <Ionicons name="chevron-back" size={24} color={titleColor} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: titleColor }]}>알림 설정</Text>
        <View style={styles.headerRightSpacer} />
      </View>

      <ScrollView contentContainerStyle={styles.contentContainer} showsVerticalScrollIndicator={false}>
        <View style={[styles.card, { backgroundColor: cardColor, borderColor }]}>
          <TouchableOpacity
            style={styles.row}
            activeOpacity={0.7}
            onPress={() => router.push('/settings/expiry-notifications')}
          >
            <View style={styles.rowLeft}>
              <View style={[styles.iconWrapper, { backgroundColor: isDark ? '#2A2A2D' : '#F3F4F6' }]}>
                <Ionicons name="alarm-outline" size={18} color={iconColor} />
              </View>
              <View style={styles.rowTextWrapper}>
                <Text style={[styles.rowLabel, { color: titleColor }]}>만료/임박 알림 설정</Text>
                <Text style={[styles.rowDesc, { color: descColor }]}>유통기한이 임박하거나 지난 식재료를 알려드려요</Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={16} color={descColor} />
          </TouchableOpacity>

          <View style={[styles.divider, { backgroundColor: dividerColor }]} />

          <View style={styles.row}>
            <View style={styles.rowLeft}>
              <View style={[styles.iconWrapper, { backgroundColor: isDark ? '#2A2A2D' : '#F3F4F6' }]}>
                <Ionicons name="people-outline" size={18} color={iconColor} />
              </View>
              <View style={styles.rowTextWrapper}>
                <Text style={[styles.rowLabel, { color: titleColor }]}>공유 냉장고 알림</Text>
                <Text style={[styles.rowDesc, { color: descColor }]}>삭제 요청 등 공유 냉장고 관련 알림을 받아요</Text>
              </View>
            </View>
            <Switch value={shareOn} onValueChange={handleToggleShare} />
          </View>
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
    paddingTop: 16,
    paddingBottom: 40,
  },
  card: {
    borderRadius: 16,
    borderWidth: 1,
    paddingHorizontal: 16,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    gap: 12,
  },
  rowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  iconWrapper: {
    width: 32,
    height: 32,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  rowTextWrapper: {
    flex: 1,
    gap: 2,
  },
  rowLabel: {
    fontSize: 15,
    fontWeight: '600',
    letterSpacing: -0.3,
  },
  rowDesc: {
    fontSize: 12,
    fontWeight: '500',
  },
  divider: {
    height: 1,
    width: '100%',
  },
});
