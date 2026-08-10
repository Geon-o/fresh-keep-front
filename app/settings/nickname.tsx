import React, { useState } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, TextInput, ActivityIndicator, Alert, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../src/context/AuthContext';
import { useTheme } from '../../src/context/ThemeContext';

export default function NicknameSettingScreen() {
  const router = useRouter();
  const { user, updateNickname } = useAuth();
  const { isDark } = useTheme();

  const [nickname, setNickname] = useState(user?.name || '');
  const [isUpdating, setIsUpdating] = useState(false);
  const [isDuplicate, setIsDuplicate] = useState(false);
  const [isInvalid, setIsInvalid] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // 2026 Toss-style Color Tokens
  const backgroundColor = isDark ? '#101012' : '#F3F4F6';
  const cardColor = isDark ? '#1C1C1E' : '#FFFFFF';
  const borderColor = isDark ? 'rgba(255, 255, 255, 0.04)' : 'rgba(0, 0, 0, 0.03)';
  const titleColor = isDark ? '#F5F5F5' : '#1F2937';
  const descColor = isDark ? '#A3A3A3' : '#6B7280';
  const inputBgColor = isDark ? '#2C2C2E' : '#F9FAFB';

  const handleChangeText = (text: string) => {
    setNickname(text);
    setIsDuplicate(false);
    setIsInvalid(false);
    setErrorMessage('');

    // 현재 사용 중인 닉네임과 동일한지 실시간 감지
    const trimmed = text.trim();
    if (trimmed && trimmed === user?.name) {
      setIsInvalid(true);
      setErrorMessage('현재 사용 중인 닉네임입니다.');
    }
  };

  const handleClear = () => {
    setNickname('');
    setIsDuplicate(false);
    setIsInvalid(false);
    setErrorMessage('');
  };

  const handleUpdate = async () => {
    const trimmed = nickname.trim();
    
    // 1. 공백 및 필수값 확인
    if (!trimmed) {
      setIsInvalid(true);
      setErrorMessage('닉네임을 입력해 주세요.');
      return;
    }

    // 2. 현재 사용 중인 닉네임과 동일한지 최종 확인
    if (trimmed === user?.name) {
      setIsInvalid(true);
      setErrorMessage('현재 사용 중인 닉네임입니다.');
      return;
    }
    
    // 3. 특수문자, 공백, 이모지 방지 및 한글/영문/숫자 2~8자 길이 검증
    const nicknameRegex = /^[a-zA-Z0-9가-힣]{2,8}$/;
    if (!nicknameRegex.test(trimmed)) {
      setIsInvalid(true);
      setErrorMessage('한글, 영문, 숫자 조합의 2~8자 닉네임을 입력해 주세요.');
      return;
    }

    setIsUpdating(true);
    setIsDuplicate(false);
    setIsInvalid(false);
    setErrorMessage('');

    try {
      const success = await updateNickname(trimmed);
      if (success) {
        Alert.alert('알림 🎉', '닉네임이 성공적으로 변경되었습니다.', [
          { text: '확인', onPress: () => router.back() }
        ]);
      } else {
        Alert.alert('알림 ⚠️', '닉네임 변경에 실패했습니다. 다시 시도해 주세요.');
      }
    } catch (e: any) {
      if (e.response?.status === 409 || e.response?.data?.message === 'DUPLICATE_NICKNAME') {
        setIsDuplicate(true);
        setErrorMessage('이미 사용 중인 닉네임입니다.');
      } else if (e.response?.status === 400 || e.response?.data?.message === 'INVALID_NICKNAME') {
        setIsInvalid(true);
        setErrorMessage('한글, 영문, 숫자 조합의 2~8자 닉네임을 입력해 주세요.');
      } else {
        console.error(e);
        Alert.alert('알림 ⚠️', '닉네임 변경에 실패했습니다. 다시 시도해 주세요.');
      }
    } finally {
      setIsUpdating(false);
    }
  };

  const hasError = isDuplicate || isInvalid;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor }]} edges={['top', 'left', 'right', 'bottom']}>
      {/* 헤더 */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()} activeOpacity={0.7}>
          <Ionicons name="chevron-back" size={24} color={titleColor} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: titleColor }]}>닉네임 변경</Text>
        <View style={styles.headerRightSpacer} />
      </View>

      <View style={styles.contentContainer}>
        {/* 입력 카드 */}
        <View style={[styles.card, { backgroundColor: cardColor, borderColor }]}>
          <Text style={[styles.cardLabel, { color: descColor }]}>새 닉네임</Text>
          <View
            style={[
              styles.inputContainer,
              {
                backgroundColor: inputBgColor,
                borderColor: hasError ? '#EF4444' : (isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.08)'),
                borderWidth: hasError ? 1.5 : 1
              }
            ]}
          >
            <TextInput
              style={[
                styles.textInput,
                {
                  color: titleColor,
                }
              ]}
              value={nickname}
              onChangeText={handleChangeText}
              placeholder="닉네임을 입력하세요"
              placeholderTextColor={descColor}
              maxLength={8}
              autoFocus
              selectTextOnFocus
            />
            {nickname.length > 0 && (
              <TouchableOpacity
                onPress={handleClear}
                activeOpacity={0.7}
                style={styles.clearButton}
              >
                <Ionicons name="close-circle" size={18} color={descColor} />
              </TouchableOpacity>
            )}
          </View>
          {errorMessage ? (
            <Text style={styles.errorText}>{errorMessage}</Text>
          ) : (
            <Text style={[styles.helperText, { color: descColor }]}>
              특수문자, 공백, 이모지는 입력 불가하며 2~8자까지 가능합니다.
            </Text>
          )}
        </View>

        {/* 확인 버튼 */}
        <TouchableOpacity
          style={[
            styles.submitButton,
            {
              backgroundColor: isDark ? '#F5F5F5' : '#1F2937',
              opacity: isUpdating || !nickname.trim() ? 0.6 : 1
            }
          ]}
          onPress={handleUpdate}
          disabled={isUpdating || !nickname.trim()}
          activeOpacity={0.7}
        >
          {isUpdating ? (
            <ActivityIndicator size="small" color={isDark ? '#1F2937' : '#FFFFFF'} />
          ) : (
            <Text style={[styles.submitButtonText, { color: isDark ? '#1F2937' : '#FFFFFF' }]}>변경하기</Text>
          )}
        </TouchableOpacity>
      </View>
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
  },
  card: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    marginBottom: 16,
  },
  cardLabel: {
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 10,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 48,
    borderRadius: 10,
    paddingHorizontal: 12,
    marginBottom: 8,
  },
  textInput: {
    flex: 1,
    height: '100%',
    fontSize: 15,
    fontWeight: '600',
  },
  clearButton: {
    paddingHorizontal: 6,
    justifyContent: 'center',
    alignItems: 'center',
  },
  helperText: {
    fontSize: 11,
    fontWeight: '500',
  },
  errorText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#EF4444',
  },
  submitButton: {
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
  },
  submitButtonText: {
    fontSize: 15,
    fontWeight: '700',
  },
});
