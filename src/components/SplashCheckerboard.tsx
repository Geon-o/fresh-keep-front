import React, { useEffect, useRef } from 'react';
import { View, Image, Animated, Easing, useWindowDimensions, StyleSheet } from 'react-native';

const TILE_SIZE = 64;
const ICON_SIZE = 30;
const AMPLITUDE = 14;
const DURATION = 2600;

// 스플래시 배경에 깔리는 사선 바둑판 무늬. 아이콘을 체크무늬로 성기게 깔고, 전체를
// -10도 기울인 뒤 가로줄마다 서로 반대 방향으로 위아래 슬라이딩시켜 사선처럼 보이게 한다.
export default function SplashCheckerboard() {
  const { width, height } = useWindowDimensions();
  const anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(anim, { toValue: 1, duration: DURATION, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(anim, { toValue: 0, duration: DURATION, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [anim]);

  // 회전시켜도 네 귀퉁이가 비지 않도록 화면보다 넉넉하게 큰 판을 만든 뒤 중앙 정렬한다.
  const boardWidth = width * 1.6;
  const boardHeight = height * 1.6;
  const cols = Math.ceil(boardWidth / TILE_SIZE) + 1;
  const rows = Math.ceil(boardHeight / TILE_SIZE) + 1;

  return (
    <View style={[StyleSheet.absoluteFill, styles.clip]} pointerEvents="none">
      <View
        style={[
          styles.board,
          {
            width: boardWidth,
            height: boardHeight,
            top: -(boardHeight - height) / 2,
            left: -(boardWidth - width) / 2,
          },
        ]}
      >
        {Array.from({ length: rows }).map((_, row) => {
          const translateY = anim.interpolate({
            inputRange: [0, 1],
            outputRange: row % 2 === 0 ? [-AMPLITUDE, AMPLITUDE] : [AMPLITUDE, -AMPLITUDE],
          });
          return (
            <Animated.View key={row} style={[styles.row, { height: TILE_SIZE, transform: [{ translateY }] }]}>
              {Array.from({ length: cols }).map((__, col) => (
                <View key={col} style={[styles.cell, { width: TILE_SIZE, height: TILE_SIZE }]}>
                  {(row + col) % 2 === 0 && (
                    <Image
                      source={require('../../assets/images/mustache_static.png')}
                      style={{ width: ICON_SIZE, height: ICON_SIZE, opacity: 0.16 }}
                      resizeMode="contain"
                    />
                  )}
                </View>
              ))}
            </Animated.View>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  clip: { overflow: 'hidden' },
  board: { position: 'absolute', transform: [{ rotate: '-10deg' }] },
  row: { flexDirection: 'row' },
  cell: { alignItems: 'center', justifyContent: 'center' },
});
