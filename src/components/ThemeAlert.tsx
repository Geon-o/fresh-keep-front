import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Text, Modal, TouchableOpacity, Alert, AlertButton, Dimensions, Platform } from 'react-native';
import { useTheme } from '../context/ThemeContext';

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
  const { theme } = useTheme();

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

  return (
    <Modal
      transparent
      animationType="fade"
      visible={config.visible}
      onRequestClose={() => handleButtonPress()}
    >
      <View style={[styles.overlay, { backgroundColor: theme.overlay }]}>
        <View style={[styles.alertCard, { backgroundColor: theme.surface, shadowColor: theme.shadow }]}>
          {/* 타이틀 및 메시지 */}
          <Text style={[styles.titleText, { color: theme.textPrimary }]}>{config.title}</Text>
          {config.message ? (
            <Text style={[styles.messageText, { color: theme.textSecondary }]}>{config.message}</Text>
          ) : null}

          {/* 버튼 리스트 */}
          <View style={buttons.length === 2 ? styles.buttonRow : styles.buttonCol}>
            {buttons.map((btn, idx) => {
              const isDestructive = btn.style === 'destructive' || btn.text?.includes('삭제');
              const isCancel = btn.style === 'cancel' || btn.text?.includes('취소') || btn.text?.includes('나중에');

              let buttonStyle = [styles.primaryButton, { backgroundColor: theme.primary }] as any;
              let textStyle = [styles.primaryButtonText, { color: theme.primaryOnPrimary }] as any;

              if (isDestructive) {
                buttonStyle = [styles.destructiveButton, { backgroundColor: theme.danger }];
                textStyle = [styles.destructiveButtonText, { color: '#FFFFFF' }];
              } else if (isCancel) {
                buttonStyle = [styles.cancelButton, { backgroundColor: theme.surfaceTertiary }];
                textStyle = [styles.cancelButtonText, { color: theme.textSecondary }];
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
  titleText: {
    fontSize: 14,
    fontWeight: '400',
    color: '#0F172A', // Slate 900
    textAlign: 'center',
    marginBottom: 10,
    lineHeight: 20,
  },
  messageText: {
    fontSize: 14,
    color: '#475569', // Slate 600
    textAlign: 'center',
    lineHeight: 20,
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
