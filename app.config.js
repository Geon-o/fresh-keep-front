// app.json을 그대로 받아(config), 소셜 로그인 두 플러그인에 빌드타임 옵션만 주입한다.
// 정적 설정은 전부 app.json에 남겨두고, 여기서는 .env(EXPO_PUBLIC_*) 값이 필요한 부분만 덧붙인다.
module.exports = ({ config }) => {
  // 구글: 플러그인이 iosUrlScheme를 필수로 요구한다(없으면 prebuild 실패).
  // iOS 클라이언트가 아직 없으므로 형식만 맞춘 플레이스홀더를 쓴다. Android 빌드엔 영향 없다.
  // iOS를 낼 때 Google Console에서 iOS 클라이언트를 만들고 그 역방향 스킴으로 교체할 것.
  const googleIosUrlScheme =
    process.env.EXPO_PUBLIC_GOOGLE_IOS_URL_SCHEME ||
    'com.googleusercontent.apps.PLACEHOLDER_IOS_ONLY';

  // 네이버: iOS 콜백용 URL 스킴. Android는 런타임 initialize로 키를 주입하므로 스킴만 있으면 된다.
  const naverUrlScheme = process.env.EXPO_PUBLIC_NAVER_URL_SCHEME || 'freshkeep';

  const plugins = (config.plugins || []).map((entry) => {
    const name = Array.isArray(entry) ? entry[0] : entry;
    if (name === '@react-native-google-signin/google-signin') {
      return [name, { iosUrlScheme: googleIosUrlScheme }];
    }
    if (name === '@react-native-seoul/naver-login') {
      return [name, { urlScheme: naverUrlScheme }];
    }
    return entry;
  });

  return { ...config, plugins };
};
