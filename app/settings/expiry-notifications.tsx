import React, { useEffect, useRef, useState } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, ScrollView, Switch, Linking, Animated, NativeSyntheticEvent, NativeScrollEvent } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Notifications from 'expo-notifications';
import { useTheme } from '../../src/context/ThemeContext';
import {
  isNotificationsEnabled,
  setNotificationsEnabled,
  requestNotificationPermission,
  getNotificationHour,
  setNotificationHour,
  getNotificationMinute,
  setNotificationMinute,
} from '../../src/utils/ingredientNotifications';

type Period = 'AM' | 'PM';

const WHEEL_ITEM_HEIGHT = 40;
const WHEEL_VISIBLE_COUNT = 3;
const WHEEL_HEIGHT = WHEEL_ITEM_HEIGHT * WHEEL_VISIBLE_COUNT;
const WHEEL_PADDING = WHEEL_ITEM_HEIGHT; // 위아래로 한 칸씩 여유를 둬서 맨 위/아래 값도 가운데로 스크롤될 수 있게 한다

// 세로로 스크롤하거나 항목을 탭해서 값을 고르는 휠 피커 한 칸. 상/하 한 칸씩 여백을 둬서
// 첫/마지막 값도 가운데(선택 위치)까지 스크롤되도록 하고, 스크롤이 멈추면 가장 가까운 항목으로 스냅한다.
function WheelColumn({
  labels,
  selectedIndex,
  onSelect,
  activeColor,
  textColor,
}: {
  labels: string[];
  selectedIndex: number;
  onSelect: (index: number) => void;
  activeColor: string;
  textColor: string;
}) {
  const scrollRef = useRef<ScrollView>(null);

  const scrollToIndex = (index: number, animated: boolean) => {
    scrollRef.current?.scrollTo({ y: index * WHEEL_ITEM_HEIGHT, animated });
  };

  useEffect(() => {
    // 최초 진입 시(비동기로 저장된 값을 불러온 직후) 선택 위치로 즉시 이동시킨다.
    scrollToIndex(selectedIndex, false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // snapToInterval이 이미 네이티브에서 정확한 위치로 스냅해주므로 여기서 또 scrollTo를 부르지 않는다.
  // (한 번 더 부르면, 그 animated scrollTo 자체가 다시 momentum end를 발생시켜 계속 제자리로 되돌리는
  // 루프가 생기고, 마침 반올림이 딱 맞아떨어지는 마지막 칸(12시/50분 등)에서 이게 아주 잘 드러나
  // 사용자에게는 "드래그가 안 먹힌다"처럼 보인다.)
  const handleScrollEnd = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const index = Math.round(e.nativeEvent.contentOffset.y / WHEEL_ITEM_HEIGHT);
    const clamped = Math.max(0, Math.min(labels.length - 1, index));
    if (clamped !== selectedIndex) onSelect(clamped);
  };

  const handlePressItem = (index: number) => {
    scrollToIndex(index, true);
    if (index !== selectedIndex) onSelect(index);
  };

  return (
    <View style={{ height: WHEEL_HEIGHT, overflow: 'hidden', flex: 1 }}>
      <ScrollView
        ref={scrollRef}
        showsVerticalScrollIndicator={false}
        snapToInterval={WHEEL_ITEM_HEIGHT}
        decelerationRate="fast"
        contentContainerStyle={{ paddingVertical: WHEEL_PADDING }}
        onMomentumScrollEnd={handleScrollEnd}
      >
        {labels.map((label, index) => {
          const isSelected = index === selectedIndex;
          return (
            <TouchableOpacity
              key={label}
              style={styles.wheelItem}
              activeOpacity={0.6}
              onPress={() => handlePressItem(index)}
            >
              <Text
                style={[
                  styles.wheelItemText,
                  { color: isSelected ? activeColor : textColor, fontWeight: isSelected ? '800' : '500' },
                ]}
              >
                {label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
}

// 24시간 값 <-> 오전/오후 + 1~12시 상호 변환
function to12Hour(hour24: number): { period: Period; hour12: number } {
  if (hour24 === 0) return { period: 'AM', hour12: 12 };
  if (hour24 < 12) return { period: 'AM', hour12: hour24 };
  if (hour24 === 12) return { period: 'PM', hour12: 12 };
  return { period: 'PM', hour12: hour24 - 12 };
}

function to24Hour(period: Period, hour12: number): number {
  if (period === 'AM') return hour12 === 12 ? 0 : hour12;
  return hour12 === 12 ? 12 : hour12 + 12;
}

const HOUR_LABELS = Array.from({ length: 12 }, (_, i) => `${i + 1}시`);
const MINUTE_VALUES = [0, 10, 20, 30, 40, 50];
const MINUTE_LABELS = MINUTE_VALUES.map(m => `${String(m).padStart(2, '0')}분`);

export default function ExpiryNotificationSettingsScreen() {
  const router = useRouter();
  const { isDark } = useTheme();
  const [expiryOn, setExpiryOn] = useState(true);
  const [loaded, setLoaded] = useState(false);
  const [periodIndex, setPeriodIndex] = useState(0); // 0: 오전, 1: 오후
  const [hourIndex, setHourIndex] = useState(7); // 8시 (index 7 = "8시")
  const [minuteIndex, setMinuteIndex] = useState(0);

  // 로컬 토스트 (홈 화면의 토스트는 이 화면에 가려 안 보이므로 이 화면 자체에서 띄운다)
  const [toastText, setToastText] = useState('');
  const [toastVisible, setToastVisible] = useState(false);
  const toastOpacity = useRef(new Animated.Value(0)).current;
  const toastTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingToastRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
      if (pendingToastRef.current) clearTimeout(pendingToastRef.current);
    };
  }, []);

  const showToast = (message: string) => {
    if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    setToastText(message);
    setToastVisible(true);
    Animated.timing(toastOpacity, { toValue: 1, duration: 200, useNativeDriver: true }).start();
    toastTimeoutRef.current = setTimeout(() => {
      Animated.timing(toastOpacity, { toValue: 0, duration: 200, useNativeDriver: true }).start(() => {
        setToastVisible(false);
      });
    }, 2000);
  };

  useEffect(() => {
    Promise.all([isNotificationsEnabled(), getNotificationHour(), getNotificationMinute()]).then(
      ([enabled, hour24, minute]) => {
        setExpiryOn(enabled);
        const { period, hour12 } = to12Hour(hour24);
        setPeriodIndex(period === 'AM' ? 0 : 1);
        setHourIndex(hour12 - 1);
        setMinuteIndex(Math.max(0, MINUTE_VALUES.indexOf(minute)));
        setLoaded(true);
      }
    );
  }, []);

  // 만료/임박 알림 토글: 켤 때 OS 권한이 거부된 상태면 설정 앱으로 안내한다
  // (iOS/Android 모두 한 번 거부되면 앱 내 재요청 다이얼로그가 다시 뜨지 않는 경우가 많음).
  const handleToggleExpiry = async (next: boolean) => {
    if (next) {
      const { status } = await Notifications.getPermissionsAsync();
      if (status === 'denied') {
        Linking.openSettings();
        return;
      }
      await requestNotificationPermission();
    }
    await setNotificationsEnabled(next);
    setExpiryOn(next);
  };

  // 이 화면이 스택 최상단(홈 화면 위)에 떠 있는 동안은 홈 화면의 토스트가 가려서 안 보이므로,
  // 이 화면 안에서 직접 토스트를 띄운다. 휠을 스크롤/탭할 때마다 바로 띄우면 값이 계속 바뀌는 동안
  // 토스트가 너무 자주 뜨므로, 사용자가 조작을 멈추고 0.8초 지난 뒤 최종 값으로 한 번만 띄운다.
  const notifyTimeSet = (nextPeriodIndex: number, nextHourIndex: number, nextMinuteIndex: number) => {
    if (pendingToastRef.current) clearTimeout(pendingToastRef.current);
    pendingToastRef.current = setTimeout(() => {
      const periodLabel = nextPeriodIndex === 0 ? '오전' : '오후';
      const minuteLabel = MINUTE_LABELS[nextMinuteIndex];
      showToast(`${periodLabel} ${nextHourIndex + 1}시 ${minuteLabel}에 알림이 설정됐어요`);
    }, 800);
  };

  const applyTime = (nextPeriodIndex: number, nextHourIndex: number, nextMinuteIndex: number) => {
    const period: Period = nextPeriodIndex === 0 ? 'AM' : 'PM';
    setNotificationHour(to24Hour(period, nextHourIndex + 1));
    setNotificationMinute(MINUTE_VALUES[nextMinuteIndex]);
    notifyTimeSet(nextPeriodIndex, nextHourIndex, nextMinuteIndex);
  };

  const handleChangePeriod = (index: number) => {
    setPeriodIndex(index);
    applyTime(index, hourIndex, minuteIndex);
  };

  const handleChangeHour = (index: number) => {
    setHourIndex(index);
    applyTime(periodIndex, index, minuteIndex);
  };

  const handleChangeMinute = (index: number) => {
    setMinuteIndex(index);
    applyTime(periodIndex, hourIndex, index);
  };

  // 2026 Toss-style Color Tokens
  const backgroundColor = isDark ? '#101012' : '#F3F4F6';
  const cardColor = isDark ? '#1C1C1E' : '#FFFFFF';
  const borderColor = isDark ? 'rgba(255, 255, 255, 0.04)' : 'rgba(0, 0, 0, 0.03)';
  const highlightColor = isDark ? 'rgba(255, 255, 255, 0.06)' : 'rgba(0, 0, 0, 0.04)';
  const titleColor = isDark ? '#F5F5F5' : '#1F2937';
  const descColor = isDark ? '#A3A3A3' : '#6B7280';
  const iconColor = isDark ? '#9CA3AF' : '#4B5563';
  const chipBg = isDark ? '#2A2A2D' : '#F3F4F6';
  const activeColor = isDark ? '#BBDEFB' : '#0D47A1';

  return (
    <SafeAreaView style={[styles.container, { backgroundColor }]} edges={['top', 'left', 'right', 'bottom']}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()} activeOpacity={0.7}>
          <Ionicons name="chevron-back" size={24} color={titleColor} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: titleColor }]}>만료/임박 알림 설정</Text>
        <View style={styles.headerRightSpacer} />
      </View>

      <ScrollView contentContainerStyle={styles.contentContainer} showsVerticalScrollIndicator={false}>
        <View style={[styles.card, { backgroundColor: cardColor, borderColor }]}>
          <View style={styles.row}>
            <View style={styles.rowLeft}>
              <View style={[styles.iconWrapper, { backgroundColor: chipBg }]}>
                <Ionicons name="alarm-outline" size={18} color={iconColor} />
              </View>
              <View style={styles.rowTextWrapper}>
                <Text style={[styles.rowLabel, { color: titleColor }]}>만료/임박 알림</Text>
                <Text style={[styles.rowDesc, { color: descColor }]}>유통기한이 임박하거나 지난 식재료를 알려드려요</Text>
              </View>
            </View>
            <Switch value={expiryOn} onValueChange={handleToggleExpiry} />
          </View>
        </View>

        <Text style={[styles.sectionTitle, { color: descColor }]}>알림 시간</Text>
        <View style={[styles.card, { backgroundColor: cardColor, borderColor }]}>
          <View style={styles.wheelWrapper}>
            {/* 가운데 선택 위치를 표시하는 강조 바 (휠들 뒤에 깔림) */}
            <View pointerEvents="none" style={[styles.wheelHighlight, { backgroundColor: highlightColor }]} />
            {loaded && (
              <>
                <WheelColumn
                  labels={['오전', '오후']}
                  selectedIndex={periodIndex}
                  onSelect={handleChangePeriod}
                  activeColor={activeColor}
                  textColor={descColor}
                />
                <WheelColumn
                  labels={HOUR_LABELS}
                  selectedIndex={hourIndex}
                  onSelect={handleChangeHour}
                  activeColor={activeColor}
                  textColor={descColor}
                />
                <WheelColumn
                  labels={MINUTE_LABELS}
                  selectedIndex={minuteIndex}
                  onSelect={handleChangeMinute}
                  activeColor={activeColor}
                  textColor={descColor}
                />
              </>
            )}
          </View>
        </View>
      </ScrollView>

      {toastVisible && (
        <Animated.View style={[styles.toastContainer, { opacity: toastOpacity }]}>
          <View style={[styles.toastContent, { backgroundColor: titleColor }]}>
            <Text style={[styles.toastText, { color: backgroundColor }]}>{toastText}</Text>
          </View>
        </Animated.View>
      )}
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
  sectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: -0.2,
    marginTop: 20,
    marginBottom: 8,
    paddingHorizontal: 6,
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
  wheelWrapper: {
    flexDirection: 'row',
    paddingVertical: 16,
  },
  wheelHighlight: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: WHEEL_ITEM_HEIGHT + 16,
    height: WHEEL_ITEM_HEIGHT,
    borderRadius: 10,
  },
  wheelItem: {
    height: WHEEL_ITEM_HEIGHT,
    justifyContent: 'center',
    alignItems: 'center',
  },
  wheelItemText: {
    fontSize: 16,
  },
  toastContainer: {
    position: 'absolute',
    bottom: '15%',
    left: 20,
    right: 20,
    alignItems: 'center',
    zIndex: 9999,
  },
  toastContent: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 25,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 3,
  },
  toastText: {
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
  },
});
