/**
 * FreshKeep 앱 중앙 집중식 테마 시스템
 * 
 * 시원함과 쾌적함을 전달하는 하늘색/파란색 계열 브랜드 컬러
 * 시스템 테마(라이트/다크 모드)에 자동 대응
 */

export const lightColors = {
  // 프라이머리 (하늘색 계열 - Material Blue #BBDEFB)
  primary: '#BBDEFB',        // Blue-100: 버튼, 강조, 활성 상태 (첨부 이미지 색상)
  primaryDark: '#90CAF9',    // Blue-200: 프레스 상태
  primaryLight: '#E3F2FD',   // Blue-50: 연한 배경
  primaryBorder: '#90CAF9',  // Blue-200: 연한 보더
  primaryText: '#0D47A1',    // Blue-900: 프라이머리 텍스트
  primaryOnPrimary: '#0D47A1', // 프라이머리 버튼 위 텍스트 (대비율 확보)

  // 프리미엄 UI 확장 토큰
  glassBg: 'rgba(255, 255, 255, 0.72)',
  glassBorder: 'rgba(226, 232, 240, 0.8)',
  cardGradientStart: '#F0F8FF', // Alice Blue
  cardGradientEnd: '#E3F2FD',   // soft blue-50
  glowDanger: 'rgba(239, 68, 68, 0.35)',
  glowWarning: 'rgba(245, 158, 11, 0.35)',
  metallicTrim: '#CFD8DC',

  // 배경
  background: '#FAFAFA',
  surface: '#FFFFFF',
  surfaceSecondary: '#F8FAFC',
  surfaceTertiary: '#F1F5F9',

  // 텍스트
  textPrimary: '#0F172A',
  textSecondary: '#475569',
  textTertiary: '#64748B',
  textMuted: '#94A3B8',
  textOnPrimary: '#FFFFFF',

  // 보더 & 디바이더
  border: '#E2E8F0',
  borderLight: '#ECEFF1',
  divider: '#F1F5F9',

  // 냉장고 비주얼
  fridgeDoor: '#E3F2FD',
  fridgeDoorBorder: '#BBDEFB',
  freezerDoor: '#E0F7FA',
  freezerDoorBorder: '#B2EBF2',
  fridgeFrame: '#37474F',
  fridgeHandle: '#B0BEC5',
  fridgeLabel: '#37474F',
  fridgeCountText: '#757575',
  fridgeCountBg: 'rgba(255, 255, 255, 0.7)',

  // 시맨틱
  success: '#10B981',
  successLight: '#ECFDF5',
  warning: '#FF9800',
  danger: '#EF4444',
  dangerDark: '#DC2626',
  dangerLight: '#FEF2F2',
  dangerLighter: '#FFEBEE',
  dangerMuted: '#FCA5A5',

  // D-Day (직관적 의미 유지)
  ddayExpired: '#FF5252',
  ddayImminent: '#FF9800',
  ddaySafe: '#4CAF50',

  // 오버레이 & 그림자
  overlay: 'rgba(15, 23, 42, 0.45)',
  shadow: '#0F172A',

  // 모달
  modalOverlay: 'rgba(0, 0, 0, 0.5)',

  // 스플래시
  splashBg: '#FFFFFF',
  splashIcon: '#BBDEFB',
  splashText: '#0F172A',
  splashSubText: '#64748B',
  splashSpinner: '#BBDEFB',

  // 탭바 전용
  tabBarBg: 'rgba(255, 255, 255, 0.92)',
  tabBarBorder: 'rgba(226, 232, 240, 0.8)',
  tabIconInactive: '#64748B',

  // 플레이스홀더
  placeholder: '#90A4AE',

  // 토글
  toggleBg: '#F5F5F5',
  toggleInactiveText: '#90A4AE',

  // 카카오 / 네이버 (브랜드 필수)
  kakao: '#FEE500',
  kakaoText: '#191919',
  naver: '#03C75A',
  naverText: '#FFFFFF',
};

export const darkColors: typeof lightColors = {
  // 프라이머리 (하늘색 계열 - Material Blue #BBDEFB)
  primary: '#BBDEFB',        // Blue-100: 다크모드에서 대비 효과가 좋은 밝은 하늘색
  primaryDark: '#90CAF9',    // Blue-200: 프레스 상태
  primaryLight: '#0D47A1',   // Blue-900: 연한 배경 (다크에서는 어두운 블루 톤)
  primaryBorder: '#1565C0',  // Blue-800: 연한 보더
  primaryText: '#BBDEFB',    // Blue-100: 다크모드 텍스트 강조용
  primaryOnPrimary: '#0F172A', // 다크모드 프라이머리 버튼 위 다크 텍스트

  // 프리미엄 UI 확장 토큰
  glassBg: 'rgba(30, 41, 59, 0.72)',
  glassBorder: 'rgba(255, 255, 255, 0.08)',
  cardGradientStart: '#0F172A', // dark blue
  cardGradientEnd: '#1E293B',   // dark slate
  glowDanger: 'rgba(248, 113, 113, 0.55)',
  glowWarning: 'rgba(251, 191, 36, 0.55)',
  metallicTrim: '#475569',

  // 배경
  background: '#0F172A',
  surface: '#1E293B',
  surfaceSecondary: '#1E293B',
  surfaceTertiary: '#334155',

  // 텍스트
  textPrimary: '#F1F5F9',
  textSecondary: '#CBD5E1',
  textTertiary: '#94A3B8',
  textMuted: '#64748B',
  textOnPrimary: '#0C4A6E',

  // 보더 & 디바이더
  border: '#334155',
  borderLight: '#475569',
  divider: '#334155',

  // 냉장고 비주얼
  fridgeDoor: '#1E3A5F',
  fridgeDoorBorder: '#FFFFFF',
  freezerDoor: '#164E63',
  freezerDoorBorder: '#FFFFFF',
  fridgeFrame: '#FFFFFF',
  fridgeHandle: '#94A3B8',
  fridgeLabel: '#E2E8F0',
  fridgeCountText: '#94A3B8',
  fridgeCountBg: 'rgba(30, 41, 59, 0.7)',

  // 시맨틱
  success: '#34D399',
  successLight: '#064E3B',
  warning: '#FBBF24',
  danger: '#F87171',
  dangerDark: '#EF4444',
  dangerLight: '#450A0A',
  dangerLighter: '#7F1D1D',
  dangerMuted: '#F87171',

  // D-Day
  ddayExpired: '#F87171',
  ddayImminent: '#FBBF24',
  ddaySafe: '#34D399',

  // 오버레이 & 그림자
  overlay: 'rgba(0, 0, 0, 0.6)',
  shadow: '#000000',

  // 모달
  modalOverlay: 'rgba(0, 0, 0, 0.7)',

  // 스플래시
  splashBg: '#000000',
  splashIcon: '#BBDEFB',
  splashText: '#F1F5F9',
  splashSubText: '#94A3B8',
  splashSpinner: '#BBDEFB',

  // 탭바 전용
  tabBarBg: 'rgba(30, 41, 59, 0.92)',
  tabBarBorder: 'rgba(51, 65, 85, 0.8)',
  tabIconInactive: '#94A3B8',

  // 플레이스홀더
  placeholder: '#64748B',

  // 토글
  toggleBg: '#334155',
  toggleInactiveText: '#64748B',

  // 카카오 / 네이버 (브랜드 필수 - 유지)
  kakao: '#FEE500',
  kakaoText: '#191919',
  naver: '#03C75A',
  naverText: '#FFFFFF',
};

export type ThemeColors = typeof lightColors;

export function getColors(isDark: boolean): ThemeColors {
  return isDark ? darkColors : lightColors;
}
