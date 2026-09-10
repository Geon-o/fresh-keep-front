import React from 'react';
import { StyleSheet, View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../src/context/ThemeContext';

export default function PrivacySettingScreen() {
  const router = useRouter();
  const { isDark } = useTheme();

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
        <Text style={[styles.headerTitle, { color: titleColor }]}>개인정보 처리방침</Text>
        <View style={styles.headerRightSpacer} />
      </View>

      <ScrollView contentContainerStyle={styles.contentContainer} showsVerticalScrollIndicator={false}>
        <View style={[styles.card, { backgroundColor: cardColor, borderColor }]}>
          <Text style={[styles.termsTitle, { color: titleColor }]}>냉장고집사 개인정보 처리방침</Text>

          <Text style={[styles.bodyText, { color: descColor }]}>
            {"냉장고집사(이하 '서비스')는 「개인정보 보호법」 제30조에 따라 이용자의 개인정보를 보호하고 관련 고충을 신속히 처리하기 위하여 다음과 같이 개인정보 처리방침을 수립·공개합니다.\n\n" +
             "본 서비스는 이름·이메일·전화번호 등 이용자를 직접 식별하는 개인정보를 서버에 저장하지 않으며, 서비스 제공에 필요한 최소한의 정보만을 처리합니다."}
          </Text>

          <Text style={[styles.sectionTitle, { color: titleColor }]}>1. 개인정보의 처리 목적</Text>
          <Text style={[styles.bodyText, { color: descColor }]}>
            {"서비스는 다음의 목적을 위해 개인정보를 처리합니다.\n" +
             "1. 식재료·냉장고 정보 관리 및 유통기한 알림 제공\n" +
             "2. 위치 기반 식중독 지수(기온·습도) 조회 제공\n" +
             "3. 익명 세션 및 간편 로그인 계정의 데이터 동기화·복구"}
          </Text>

          <Text style={[styles.sectionTitle, { color: titleColor }]}>2. 처리하는 개인정보의 항목</Text>
          <Text style={[styles.bodyText, { color: descColor }]}>
            {"[필수 항목 — 서비스 이용 시 자동 처리]\n" +
             "· 앱이 무작위로 생성하는 익명 식별값 및 데이터 동기화용 연동 코드\n" +
             "· 이용자가 등록한 냉장고·식재료 정보(이름, 수량, 유통기한 등)\n\n" +
             "[선택 항목 — 이용자가 입력하거나 권한을 허용한 경우]\n" +
             "· 닉네임\n" +
             "· 위치정보(위도·경도) — 위치 권한을 허용한 경우에 한해 식중독 지수 조회 목적으로만 처리\n" +
             "· 간편 로그인(구글·네이버) 이용 시: 제공자가 발급한 계정 식별용 고유 번호 및 제공자 구분값(구글/네이버). 이메일·이름·프로필 사진 등은 저장하거나 별도로 이용하지 않습니다.\n\n" +
             "수집 방법: 앱 내 이용자 직접 입력, 앱 자동 생성, 소셜 로그인 제공자로부터 전달"}
          </Text>

          <Text style={[styles.sectionTitle, { color: titleColor }]}>3. 만 14세 미만 아동의 개인정보</Text>
          <Text style={[styles.bodyText, { color: descColor }]}>
            {"본 서비스는 만 14세 미만 아동을 대상으로 하지 않으며, 아동의 개인정보를 별도로 수집·처리하지 않습니다."}
          </Text>

          <Text style={[styles.sectionTitle, { color: titleColor }]}>4. 개인정보의 처리 및 보유 기간</Text>
          <Text style={[styles.bodyText, { color: descColor }]}>
            {"1. 서비스를 이용하는 기간 동안 개인정보를 보유·이용합니다.\n" +
             "2. 이용자가 앱 설정의 '초기화'를 실행하면 관련 데이터를 지체 없이 전부 삭제합니다.\n" +
             "3. 별도의 회원탈퇴 절차는 없으며, '초기화' 기능이 데이터 삭제 수단을 겸합니다.\n" +
             "4. 위치정보는 별도로 저장하지 않고 조회 시점에만 사용합니다."}
          </Text>

          <Text style={[styles.sectionTitle, { color: titleColor }]}>5. 개인정보의 파기 절차 및 방법</Text>
          <Text style={[styles.bodyText, { color: descColor }]}>
            {"1. 절차: 이용자의 초기화 요청 시 서버 및 기기에 저장된 데이터를 즉시 삭제합니다.\n" +
             "2. 방법: 전자적 파일 형태의 정보는 복구할 수 없는 방법으로 삭제합니다."}
          </Text>

          <Text style={[styles.sectionTitle, { color: titleColor }]}>6. 개인정보의 제3자 제공</Text>
          <Text style={[styles.bodyText, { color: descColor }]}>
            {"서비스는 이용자의 개인정보를 제3자에게 제공하지 않습니다. 다만 식중독 지수 조회를 위해 아래 '7. 개인정보의 국외 이전'과 같이 위치정보가 국외 날씨 서비스로 전송됩니다."}
          </Text>

          <Text style={[styles.sectionTitle, { color: titleColor }]}>7. 개인정보의 국외 이전</Text>
          <Text style={[styles.bodyText, { color: descColor }]}>
            {"식중독 지수 조회 기능을 위해 위치정보가 아래와 같이 국외로 이전됩니다.\n" +
             "· 이전받는 자: Open-Meteo(오픈메테오, 무료 기상데이터 서비스)\n" +
             "· 이전 국가: 독일(EU)\n" +
             "· 이전 항목: 위치정보(위도·경도)\n" +
             "· 이전 시점 및 방법: 식중독 지수 조회 시 네트워크를 통해 실시간 전송(HTTPS)\n" +
             "· 이전 목적: 실시간 기온·습도 데이터 조회\n" +
             "· 보유·이용 기간: Open-Meteo 정책에 따름(본 서비스는 응답값을 서버에 저장하지 않음)\n" +
             "· 거부 방법: 위치 권한을 허용하지 않거나 해제하면 위치정보가 전송되지 않습니다.\n\n" +
             "또한 간편 로그인 이용 시 로그인 검증을 위해 아래와 같이 정보가 전송됩니다.\n" +
             "· 이전받는 자: Google LLC(구글) / 이전 국가: 미국\n" +
             "· 이전 항목: 계정 식별 정보(로그인 토큰) / 목적: 로그인 인증 및 계정 검증\n" +
             "· 거부 방법: 구글 간편 로그인을 이용하지 않으면 전송되지 않습니다.\n" +
             "· 네이버 간편 로그인의 경우 이전받는 자는 네이버(주)이며 국내에서 처리되고, 네이버 간편 로그인을 이용하지 않으면 전송되지 않습니다."}
          </Text>

          <Text style={[styles.sectionTitle, { color: titleColor }]}>8. 개인정보 처리업무의 위탁</Text>
          <Text style={[styles.bodyText, { color: descColor }]}>
            {"서비스는 개인정보 처리업무를 외부에 위탁하지 않습니다. (서버는 운영자가 직접 관리하는 자체 서버에서 운영합니다.)"}
          </Text>

          <Text style={[styles.sectionTitle, { color: titleColor }]}>9. 개인정보의 안전성 확보조치</Text>
          <Text style={[styles.bodyText, { color: descColor }]}>
            {"1. 연동 코드 및 소셜 로그인 식별 정보는 되돌릴 수 없게 암호화하여 저장합니다.\n" +
             "2. 데이터 통신 구간에 암호화(HTTPS/TLS)를 적용합니다.\n" +
             "3. 데이터 접근 권한을 최소한으로 제한하고 접근을 통제합니다."}
          </Text>

          <Text style={[styles.sectionTitle, { color: titleColor }]}>10. 정보주체의 권리·의무 및 행사 방법</Text>
          <Text style={[styles.bodyText, { color: descColor }]}>
            {"1. 이용자는 언제든 자신의 개인정보 열람·삭제를 요청할 수 있습니다.\n" +
             "2. 앱 설정의 '초기화' 기능으로 직접 전체 데이터를 삭제할 수 있습니다.\n" +
             "3. 그 밖의 요청은 아래 개인정보 보호책임자 연락처로 문의할 수 있습니다."}
          </Text>

          <Text style={[styles.sectionTitle, { color: titleColor }]}>11. 민감정보·가명정보·자동화된 결정 등</Text>
          <Text style={[styles.bodyText, { color: descColor }]}>
            {"1. 서비스는 민감정보 및 가명정보를 처리하지 않습니다.\n" +
             "2. 개인정보를 이용한 자동화된 결정을 수행하지 않습니다. (식중독 지수는 공개 기상데이터에 기반한 안내 정보입니다.)\n" +
             "3. 영상정보처리기기(CCTV 등)를 운영하지 않습니다.\n" +
             "4. 맞춤형 광고를 위한 행태정보를 수집하지 않으며, 구글·네이버 간편 로그인 SDK는 로그인 목적으로만 사용합니다."}
          </Text>

          <Text style={[styles.sectionTitle, { color: titleColor }]}>12. 개인정보 보호책임자</Text>
          <Text style={[styles.bodyText, { color: descColor }]}>
            {"이용자는 개인정보 보호 관련 문의·불만·피해구제를 아래로 요청할 수 있습니다.\n" +
             "· 성명: 진건오\n" +
             "· 연락처: fridge.butler.serv@gmail.com"}
          </Text>

          <Text style={[styles.sectionTitle, { color: titleColor }]}>13. 권익침해에 대한 구제 방법</Text>
          <Text style={[styles.bodyText, { color: descColor }]}>
            {"아래 기관에 개인정보 침해 상담 및 신고를 할 수 있습니다.\n" +
             "· 개인정보분쟁조정위원회: 1833-6972 (www.kopico.go.kr)\n" +
             "· 개인정보침해신고센터: 118 (privacy.kisa.or.kr)\n" +
             "· 대검찰청: 1301 / 경찰청: 182"}
          </Text>

          <Text style={[styles.sectionTitle, { color: titleColor }]}>14. 개인정보 처리방침의 변경</Text>
          <Text style={[styles.bodyText, { color: descColor }]}>
            {"본 방침은 2026-09-10부터 시행합니다. 방침이 변경되는 경우 앱 내 공지를 통해 알리고, 변경된 방침의 시행일을 명시합니다."}
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
  card: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
  },
  termsTitle: {
    fontSize: 16,
    fontWeight: '800',
    marginBottom: 20,
    textAlign: 'center',
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    marginTop: 16,
    marginBottom: 6,
  },
  bodyText: {
    fontSize: 12,
    lineHeight: 18,
  },
});
