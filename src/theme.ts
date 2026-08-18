/**
 * 냉장고집사 앱 중앙 집중식 테마 시스템
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
  primaryLight: '#111827',   // 어두운 톤 (네이비 대신 neutral 어두운 색상 - grey-900)
  primaryBorder: '#374151',  // neutral 보더 - grey-700
  primaryText: '#BBDEFB',    // Blue-100: 다크모드 텍스트 강조용
  primaryOnPrimary: '#000000', // 다크모드 프라이머리 버튼 위 블랙 텍스트

  // 프리미엄 UI 확장 토큰
  glassBg: 'rgba(255, 255, 255, 0.06)',
  glassBorder: 'rgba(255, 255, 255, 0.18)',
  cardGradientStart: '#000000', // pure black
  cardGradientEnd: '#1A1A1A',   // neutral dark grey
  glowDanger: 'rgba(248, 113, 113, 0.55)',
  glowWarning: 'rgba(251, 191, 36, 0.55)',
  metallicTrim: '#404040',

  // 배경
  background: '#000000',      // pure black
  surface: '#1A1A1A',         // neutral dark grey
  surfaceSecondary: '#1A1A1A',
  surfaceTertiary: '#262626',

  // 텍스트
  textPrimary: '#F5F5F5',     // neutral light
  textSecondary: '#E5E5E5',   // neutral mid-light
  textTertiary: '#A3A3A3',    // neutral grey
  textMuted: '#737373',
  textOnPrimary: '#000000',

  // 보더 & 디바이더
  border: '#262626',
  borderLight: '#404040',
  divider: '#262626',

  // 냉장고 비주얼 (올 블랙/다크 그레이 냉장고로 프리미엄화)
  fridgeDoor: '#1A1A1A',
  fridgeDoorBorder: '#404040',
  freezerDoor: '#262626',
  freezerDoorBorder: '#404040',
  fridgeFrame: '#FFFFFF',
  fridgeHandle: '#A3A3A3',
  fridgeLabel: '#E5E5E5',
  fridgeCountText: '#A3A3A3',
  fridgeCountBg: 'rgba(26, 26, 26, 0.7)',

  // 시맨틱
  success: '#34D399',
  successLight: '#022C22',   // deep green
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
  overlay: 'rgba(0, 0, 0, 0.7)',
  shadow: '#000000',

  // 모달
  modalOverlay: 'rgba(0, 0, 0, 0.75)',

  // 스플래시
  splashBg: '#000000',
  splashIcon: '#BBDEFB',
  splashText: '#F5F5F5',
  splashSubText: '#A3A3A3',
  splashSpinner: '#BBDEFB',

  // 탭바 전용
  tabBarBg: 'rgba(10, 10, 10, 0.95)',
  tabBarBorder: 'rgba(255, 255, 255, 0.08)',
  tabIconInactive: '#A3A3A3',

  // 플레이스홀더
  placeholder: '#737373',

  // 토글
  toggleBg: '#262626',
  toggleInactiveText: '#737373',

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
