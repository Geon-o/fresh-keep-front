import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Text, Modal, TouchableOpacity, Alert, AlertButton, Dimensions, Platform } from 'react-native';

type AlertConfig = {
  visible: boolean;
  title: string;
  message?: string;
  buttons?: AlertButton[];
};

let setGlobalAlertConfig: ((config: AlertConfig) => void) | null = null;

// 백업해둔 오리지널 Alert.alert
const originalAlert = Alert.alert;

// Alert.alert 전역 오버라이드
Alert.alert = (title: string, message?: string, buttons?: AlertButton[]) => {
  const setter = setGlobalAlertConfig;
  if (setter) {
    setter({
      visible: true,
      title,
      message,
      buttons,
    });
  } else {
    // 셋터가 등록되지 않았다면 오리지널 네이티브 Alert 호출
    originalAlert(title, message, buttons);
  }
};

// 루트 레이아웃에 마운트하여 사용할 Alert 포털 컴포넌트
export function ThemeAlertPortal() {
  const [config, setConfig] = useState<AlertConfig>({
    visible: false,
    title: '',
    message: '',
  });

  useEffect(() => {
    setGlobalAlertConfig = (newConfig: AlertConfig) => {
      setConfig(newConfig);
    };
    return () => {
      setGlobalAlertConfig = null;
    };
  }, []);

  if (!config.visible) return null;

  const handleButtonPress = (btnOnPress?: () => void) => {
    setConfig(prev => ({ ...prev, visible: false }));
    if (btnOnPress) {
      btnOnPress();
    }
  };

  const buttons = config.buttons && config.buttons.length > 0 
    ? config.buttons 
    : [{ text: '확인', onPress: () => {} }];

  // 타이틀에 따른 어울리는 상태별 아이콘/색상 결정
  const getHeaderStyle = () => {
    const title = config.title;
    if (title.includes('삭제') || title.includes('경고') || title.includes('실패') || title.includes('오류') || title.includes('만료')) {
      return {
        emoji: '⚠️',
        color: '#EF4444', // Red
        bg: '#FEF2F2',
      };
    }
    if (title.includes('완료') || title.includes('성공') || title.includes('동기화 완료')) {
      return {
        emoji: '✅',
        color: '#10B981', // Green
        bg: '#ECFDF5',
      };
    }
    return {
      emoji: 'ℹ️',
      color: '#4F46E5', // Indigo (Theme Color)
      bg: '#EEF2FF',
    };
  };

  const headerStyle = getHeaderStyle();

  return (
    <Modal
      transparent
      animationType="fade"
      visible={config.visible}
      onRequestClose={() => handleButtonPress()}
    >
      <View style={styles.overlay}>
        <View style={styles.alertCard}>
          {/* 상태 표시 아이콘 배지 */}
          <View style={[styles.iconContainer, { backgroundColor: headerStyle.bg }]}>
            <Text style={[styles.iconText, { color: headerStyle.color }]}>{headerStyle.emoji}</Text>
          </View>

          {/* 타이틀 및 메시지 */}
          <Text style={styles.titleText}>{config.title}</Text>
          {config.message ? (
            <Text style={styles.messageText}>{config.message}</Text>
          ) : null}

          {/* 버튼 리스트 */}
          <View style={buttons.length === 2 ? styles.buttonRow : styles.buttonCol}>
            {buttons.map((btn, idx) => {
              const isDestructive = btn.style === 'destructive' || btn.text?.includes('삭제');
              const isCancel = btn.style === 'cancel' || btn.text?.includes('취소') || btn.text?.includes('나중에');

              let buttonStyle = styles.primaryButton;
              let textStyle = styles.primaryButtonText;

              if (isDestructive) {
                buttonStyle = styles.destructiveButton;
                textStyle = styles.destructiveButtonText;
              } else if (isCancel) {
                buttonStyle = styles.cancelButton;
                textStyle = styles.cancelButtonText;
              }

              return (
                <TouchableOpacity
                  key={idx}
                  style={[
                    buttonStyle,
                    buttons.length === 2 ? { flex: 1 } : { width: '100%' }
                  ]}
                  onPress={() => handleButtonPress(btn.onPress)}
                  activeOpacity={0.8}
                >
                  <Text style={textStyle}>{btn.text}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      </View>
    </Modal>
  );
}

const { width } = Dimensions.get('window');

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.45)', // Blur 느낌을 주는 다크 아웃라인 블러
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  alertCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    width: Platform.OS === 'web' ? 380 : Math.min(width - 48, 380),
    padding: 24,
    alignItems: 'center',
    // iOS 그림자
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 24,
    // 안드로이드 그림자
    elevation: 8,
  },
  iconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  iconText: {
    fontSize: 28,
  },
  titleText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0F172A', // Slate 900
    textAlign: 'center',
    marginBottom: 10,
    lineHeight: 24,
  },
  messageText: {
    fontSize: 14,
    color: '#475569', // Slate 600
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
    paddingHorizontal: 8,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 10,
    width: '100%',
  },
  buttonCol: {
    flexDirection: 'column',
    gap: 8,
    width: '100%',
  },
  primaryButton: {
    backgroundColor: '#4F46E5', // Indigo 600
    height: 48,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
  },
  cancelButton: {
    backgroundColor: '#F1F5F9', // Slate 100
    height: 48,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cancelButtonText: {
    color: '#475569', // Slate 600
    fontSize: 15,
    fontWeight: '600',
  },
  destructiveButton: {
    backgroundColor: '#EF4444', // Red 500
    height: 48,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  destructiveButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
  },
});
