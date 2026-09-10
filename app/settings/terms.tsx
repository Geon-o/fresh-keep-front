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
            {"1. '서비스'란 제공자가 만들어 제공하는 식재료 유통기한 관리, 냉장고 관리 및 연동 기능 전체를 말합니다.\n" +
             "2. '이용자'란 본 앱을 설치하여 서비스를 이용하는 모든 사용자를 말합니다.\n" +
             "3. '연동 코드'란 이용자의 냉장고·식재료 데이터를 서버와 동기화하고, 나중에 기기를 바꿔도 이어받을 수 있도록 서비스가 자동으로 만들어 제공하는 고유한 코드를 말합니다."}
          </Text>

          <Text style={[styles.sectionTitle, { color: titleColor }]}>제3조 (이용계약의 성립 및 계정 유형)</Text>
          <Text style={[styles.bodyText, { color: descColor }]}>
            {"1. 본 서비스는 개인정보를 최소한으로만 다루기 위해, 별도의 회원가입 없이 익명 상태로 바로 이용을 시작할 수 있습니다.\n" +
             "2. 이용 계약은 앱을 설치하고 서비스를 시작하는 순간 익명 상태로 자동 성립됩니다.\n" +
             "3. 데이터를 더 안전하게 보관하고 싶은 이용자는 구글 또는 네이버 간편 로그인으로 계정을 연결할 수 있습니다. 이때도 서비스는 계정을 구분하는 고유 번호만 보관하며, 이메일·이름·프로필 사진은 저장하지 않습니다. (수집 항목은 제6조 참고)"}
          </Text>

          <Text style={[styles.sectionTitle, { color: titleColor }]}>제4조 (데이터 동기화 및 연동 코드의 관리 책임)</Text>
          <Text style={[styles.bodyText, { color: descColor }]}>
            {"1. 익명으로 이용할 때는 회원 정보가 없으므로, 냉장고 데이터를 확인하는 수단으로 '연동 코드'를 제공합니다. 간편 로그인을 하면 연결된 계정이 데이터를 되찾는 수단이 됩니다.\n" +
             "2. 이용자는 연동 코드를 안전한 곳에 따로 보관해야 하며, 타인에게 알려주거나 잃어버리지 않도록 주의해야 합니다.\n" +
             "3. 연동 코드는 되돌릴 수 없게 암호화되어 저장되므로, 서비스 제공자도 잃어버린 코드를 다시 찾아줄 수 없습니다.\n" +
             "4. 이용자의 부주의로 연동 코드를 잃어버리거나 유출하여 생긴 데이터 손실의 책임은 이용자 본인에게 있습니다."}
          </Text>

          <Text style={[styles.sectionTitle, { color: titleColor }]}>제5조 (서비스의 제공 및 변경)</Text>
          <Text style={[styles.bodyText, { color: descColor }]}>
            {"1. 서비스는 냉장고 칸 시각화, 식재료 관리, 유통기한 알림, 식중독 예보 등 냉장고 위생 관리 기능을 제공합니다.\n" +
             "2. 서버 점검이나 네트워크 장애 등 기술적 사정 또는 운영 방침에 따라 서비스의 전부 또는 일부가 변경·중단될 수 있으며, 사전 안내는 앱 내 알림으로 대신할 수 있습니다."}
          </Text>

          <Text style={[styles.sectionTitle, { color: titleColor }]}>제6조 (수집하는 정보 및 이용 목적)</Text>
          <Text style={[styles.bodyText, { color: descColor }]}>
            {"본 서비스는 이름·이메일·전화번호 같은 개인정보를 서버에 저장하지 않습니다. 다만 서비스 제공을 위해 아래 정보를 이용합니다.\n" +
             "1. 앱이 무작위로 만들어 저장하는 익명 식별값과 데이터 동기화용 연동 코드 — 특정 기기나 사람을 알아낼 수 없으며, 앱을 다시 설치하면 새로 만들어집니다.\n" +
             "2. 이용자가 선택해서 입력하는 닉네임\n" +
             "3. 이용자가 등록한 냉장고·식재료 정보(이름, 수량, 유통기한 등)\n" +
             "4. 위치 정보 — 이용자가 권한을 허용한 경우에만 식중독 지수 조회에 쓰이며, 외부 날씨 서비스로 그때그때 전달될 뿐 서비스 서버에는 저장되지 않습니다.\n" +
             "5. 간편 로그인(구글·네이버)을 이용할 때만, 구글·네이버가 발급하는 계정 구분용 고유 번호와 어느 제공자인지(구글/네이버) 정보. 이 값은 되돌릴 수 없게 암호화되어 저장되며, 로그인한 이용자의 데이터를 계정에 안전하게 연결하는 데만 쓰입니다. 로그인 중 전달될 수 있는 이메일·이름·프로필 사진은 저장하거나 따로 이용하지 않습니다.\n" +
             "위 정보는 서비스 제공 목적으로만 쓰이며, 이용자는 설정의 '초기화'로 언제든 삭제할 수 있습니다."}
          </Text>

          <Text style={[styles.sectionTitle, { color: titleColor }]}>제7조 (면책 조항)</Text>
          <Text style={[styles.bodyText, { color: descColor }]}>
            {"1. 천재지변, 서버 점검, 네트워크 장애 등 어쩔 수 없는 사정으로 서비스를 제공하지 못하는 경우, 서비스 제공자는 그에 대한 책임을 지지 않습니다.\n" +
             "2. 이용자의 기기 고장, 초기화, 연동 코드 분실로 생긴 데이터 손실에 대해 서비스 제공자는 책임을 지지 않습니다."}
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
