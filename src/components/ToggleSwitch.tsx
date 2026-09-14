import React, { useEffect, useRef } from 'react';
import { Animated, Pressable, StyleSheet } from 'react-native';
import { ThemeColors } from '../theme';

interface ToggleSwitchProps {
  value: boolean;
  onValueChange: (value: boolean) => void;
  disabled?: boolean;
  theme: ThemeColors;
}

const TRACK_WIDTH = 52;
const TRACK_HEIGHT = 30;
const THUMB_SIZE = 24;
const THUMB_MARGIN = 3;

// 기본 Switch 대신 쓰는 커스텀 토글. 위치 이동은 스프링으로 통통 튀게, 눌렀다 뗄 때는
// 엄지가 살짝 눌렸다 튀어오르며 옆으로 늘어나 "쫀득한" 느낌을 준다.
export default function ToggleSwitch({ value, onValueChange, disabled, theme }: ToggleSwitchProps) {
  const progress = useRef(new Animated.Value(value ? 1 : 0)).current;
  const pressScale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.spring(progress, {
      toValue: value ? 1 : 0,
      useNativeDriver: false,
      friction: 7,
      tension: 140,
    }).start();
  }, [value]);

  const handlePressIn = () => {
    if (disabled) return;
    Animated.spring(pressScale, { toValue: 0.85, useNativeDriver: false, friction: 5 }).start();
  };

  const handlePressOut = () => {
    if (disabled) return;
    Animated.spring(pressScale, { toValue: 1, useNativeDriver: false, friction: 4, tension: 200 }).start();
  };

  const translateX = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [THUMB_MARGIN, TRACK_WIDTH - THUMB_SIZE - THUMB_MARGIN],
  });
  const stretchX = progress.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [1, 1.25, 1],
  });
  // off 상태 트랙 색은 theme.borderLight 대신 textMuted를 써서 배경(특히 다크모드 순검정)과
  // 확실히 구분되게 한다. 엄지는 다크모드 surface(어두운 회색)를 쓰지 않고 항상 흰색으로
  // 고정해 어느 테마에서도 위치를 또렷하게 알아볼 수 있게 한다.
  const trackColor = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [theme.textMuted, theme.primary],
  });

  return (
    <Pressable
      onPress={() => !disabled && onValueChange(!value)}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      disabled={disabled}
      style={{ opacity: disabled ? 0.5 : 1 }}
    >
      <Animated.View style={[styles.track, { backgroundColor: trackColor }]}>
        <Animated.View
          style={[
            styles.thumb,
            {
              transform: [{ translateX }, { scale: pressScale }, { scaleX: stretchX }],
            },
          ]}
        />
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  track: {
    width: TRACK_WIDTH,
    height: TRACK_HEIGHT,
    borderRadius: TRACK_HEIGHT / 2,
    justifyContent: 'center',
  },
  thumb: {
    width: THUMB_SIZE,
    height: THUMB_SIZE,
    borderRadius: THUMB_SIZE / 2,
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.35,
    shadowRadius: 2,
    elevation: 3,
  },
});
