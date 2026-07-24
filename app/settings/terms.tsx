import React from 'react';
import { StyleSheet, View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../src/context/ThemeContext';

export default function TermsSettingScreen() {
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
        <Text style={[styles.headerTitle, { color: titleColor }]}>서비스 이용약관</Text>
        <View style={styles.headerRightSpacer} />
      </View>

      <ScrollView contentContainerStyle={styles.contentContainer} showsVerticalScrollIndicator={false}>
        <View style={[styles.card, { backgroundColor: cardColor, borderColor }]}>
          <Text style={[styles.termsTitle, { color: titleColor }]}>냉장고집사 서비스 이용약관</Text>
          
          <Text style={[styles.sectionTitle, { color: titleColor }]}>제1조 (목적)</Text>
          <Text style={[styles.bodyText, { color: descColor }]}>
            {"본 약관은 냉장고집사(이하 '서비스')이 제공하는 모바일 애플리케이션 및 제반 서비스의 이용 조건, 절차, 회원과 서비스 간의 권리, 의무 및 책임 사항을 규정함을 목적으로 합니다."}
          </Text>

          <Text style={[styles.sectionTitle, { color: titleColor }]}>제2조 (용어의 정의)</Text>
          <Text style={[styles.bodyText, { color: descColor }]}>
            {"1. '서비스'라 함은 제공자가 개발하여 제공하는 식재료 유통기한 관리, 냉장고 관리 및 연동 서비스 전체를 의미합니다.\n" +
             "2. '이용자'라 함은 본 애플리케이션을 다운로드하여 모바일 기기에 설치하고 서비스를 이용하는 모든 사용자를 의미합니다.\n" +
             "3. '연동 코드'라 함은 이용자의 식재료 및 냉장고 데이터를 서버와 동기화하고 차후 기기 변경 시 이어받기 위해 서비스 내에서 임의로 생성하여 제공하는 고유 식별 키를 의미합니다."}
          </Text>

          <Text style={[styles.sectionTitle, { color: titleColor }]}>제3조 (이용계약의 성립 및 익명성)</Text>
          <Text style={[styles.bodyText, { color: descColor }]}>
            {"1. 본 서비스는 이용자의 개인정보 오남용 및 유출을 방지하기 위해 이메일, 휴대전화 번호 등 실식별 개인정보를 요구하는 소셜 로그인이나 별도의 회원가입 절차를 일절 두지 않습니다.\n" +
             "2. 이용 계약은 이용자가 본 애플리케이션을 기기에 설치하고 서비스를 시작함으로써 익명 세션 상태로 자동 성립됩니다."}
          </Text>

          <Text style={[styles.sectionTitle, { color: titleColor }]}>제4조 (데이터 동기화 및 연동 코드의 관리 책임)</Text>
          <Text style={[styles.bodyText, { color: descColor }]}>
            {"1. 본 서비스는 회원가입 정보가 없으므로 이용자의 냉장고 데이터를 식별할 유일한 수단으로 '연동 코드'를 제공합니다.\n" +
             "2. 이용자는 본인의 연동 코드를 안전한 장소에 기록·오프라인 보관해야 하며, 이를 타인에게 공개하거나 분실해서는 안 됩니다.\n" +
             "3. 연동 코드는 일방향 해시 및 암호화 처리가 적용되어 데이터베이스에 보관되므로, 서비스 제공자는 이용자의 분실된 연동 코드를 역추적하거나 찾아줄 수 없습니다.\n" +
             "4. 이용자의 관리 소홀로 인한 연동 코드 분실, 유출 및 이로 인한 데이터 유실에 대한 모든 책임은 이용자 본인에게 있습니다."}
          </Text>

          <Text style={[styles.sectionTitle, { color: titleColor }]}>제5조 (서비스의 제공 및 변경)</Text>
          <Text style={[styles.bodyText, { color: descColor }]}>
            {"1. 서비스는 이용자에게 냉장고 구획 시각화, 식재료 관리, 유통기한 알림, 식중독 예보 등 냉장고 위생 관리를 위한 디지털 기능을 제공합니다.\n" +
             "2. 서비스는 서버 점검, network 장애 등 기술적 필요나 운영 정책에 따라 서비스의 전부 또는 일부를 변경하거나 중단할 수 있습니다. 익명 서비스 특성상 사전 공지는 앱 내 알림 등으로 대체될 수 있습니다."}
          </Text>

          <Text style={[styles.sectionTitle, { color: titleColor }]}>제6조 (개인정보의 보호 및 수집 불가)</Text>
          <Text style={[styles.bodyText, { color: descColor }]}>
            {"본 서비스는 이용자의 개인정보를 일절 수집 및 보유하지 않으며, 전적으로 비인식 단말 식별값 및 데이터 동기화를 위한 익명 연동 코드만을 사용합니다."}
          </Text>

          <Text style={[styles.sectionTitle, { color: titleColor }]}>제7조 (면책 조항)</Text>
          <Text style={[styles.bodyText, { color: descColor }]}>
            {"1. 서비스 제공자는 천재지변, 서버 점검, 네트워크 마비 또는 이에 준하는 불가항력으로 인하여 서비스를 제공할 수 없는 경우에는 서비스 제공에 관한 책임이 면제됩니다.\n" +
             "2. 이용자의 기기 고장, 초기화, 연동 코드 유실로 인해 발생한 데이터 유실 손해에 대해 서비스 제공자는 책임을 지지 않습니다."}
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
