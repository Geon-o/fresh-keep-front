import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { client } from '../src/api/client';
import { queryClient } from '../src/api/queryClient';
import { useTheme } from '../src/context/ThemeContext';

export default function QrScanScreen() {
  const router = useRouter();
  const { theme, isDark } = useTheme();
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  // 권한 획득 처리
  useEffect(() => {
    if (!permission) {
      requestPermission();
    }
  }, [permission]);

  if (!permission) {
    // 권한 상태 로딩 중
    return (
      <View style={[styles.centerContainer, { backgroundColor: theme.background }]}>
        <ActivityIndicator size="large" color={theme.primary} />
      </View>
    );
  }

  if (!permission.granted) {
    // 권한 없음
    return (
      <View style={[styles.centerContainer, { backgroundColor: theme.background, padding: 24 }]}>
        <Ionicons name="camera-outline" size={48} color={theme.textMuted} style={{ marginBottom: 16 }} />
        <Text style={[styles.errorText, { color: theme.textPrimary }]}>카메라 권한이 필요합니다</Text>
        <Text style={[styles.errorSub, { color: theme.textSecondary }]}>
          냉장고 공유 QR 코드를 스캔하려면 카메라 사용 권한을 허용해 주세요.
        </Text>
        <TouchableOpacity
          style={[styles.permissionButton, { backgroundColor: theme.primary }]}
          onPress={requestPermission}
        >
          <Text style={[styles.permissionButtonText, { color: theme.primaryOnPrimary }]}>권한 허용하기</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.backButton, { borderColor: theme.borderLight }]}
          onPress={() => router.back()}
        >
          <Text style={[styles.backButtonText, { color: theme.textSecondary }]}>뒤로가기</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const handleBarcodeScanned = async ({ data }: { data: string }) => {
    if (scanned || isProcessing) return;
    setScanned(true);
    setIsProcessing(true);

    const fridgeUuid = data.trim();
    console.log('Scanned QR code data:', fridgeUuid);

    // 단순 UUID 형식 검증 (선택적)
    if (!fridgeUuid) {
      Alert.alert('오류 ⚠️', '유효하지 않은 QR 코드입니다.', [
        { text: '확인', onPress: () => { setScanned(false); setIsProcessing(false); } }
      ]);
      return;
    }

    try {
      // 백엔드에 냉장고 공유 등록 API 호출
      await client.post('/api/fridges/share', { fridgeUuid });
      
      // 캐시 갱신
      queryClient.invalidateQueries({ queryKey: ['fridges'] });

      Alert.alert(
        '공동 관리 추가 성공 🎉',
        '해당 냉장고가 정상적으로 공유 목록에 추가되었습니다!',
        [
          { 
            text: '확인', 
            onPress: () => {
              router.replace('/');
            } 
          }
        ]
      );
    } catch (e: any) {
      console.error('Failed to share fridge via QR', e);
      const errMsg = e.response?.data?.message || '이미 등록된 냉장고이거나 유효하지 않은 공유 코드입니다.';
      Alert.alert('등록 실패 ❌', errMsg, [
        { text: '확인', onPress: () => { setScanned(false); setIsProcessing(false); } }
      ]);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: '#000000' }]}>
      <CameraView
        style={StyleSheet.absoluteFillObject}
        facing="back"
        onBarcodeScanned={scanned ? undefined : handleBarcodeScanned}
        barcodeScannerSettings={{
          barcodeTypes: ['qr'],
        }}
      />

      {/* 가이드 오버레이 */}
      <View style={styles.overlayContainer}>
        {/* 상단 헤더 */}
        <View style={styles.header}>
          <TouchableOpacity 
            style={[styles.closeButton, { backgroundColor: 'rgba(0,0,0,0.5)' }]} 
            onPress={() => router.back()}
          >
            <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>QR 코드 스캔</Text>
          <View style={{ width: 40 }} />
        </View>

        {/* 중앙 스캔 영역 프레임 */}
        <View style={styles.maskContainer}>
          <View style={styles.maskRow} />
          <View style={styles.maskCenterRow}>
            <View style={styles.maskSide} />
            <View style={styles.scanTarget}>
              {/* 테두리 포커스 표시 */}
              <View style={[styles.corner, styles.topLeft]} />
              <View style={[styles.corner, styles.topRight]} />
              <View style={[styles.corner, styles.bottomLeft]} />
              <View style={[styles.corner, styles.bottomRight]} />
              {isProcessing && (
                <View style={styles.loadingOverlay}>
                  <ActivityIndicator size="large" color="#38BDF8" />
                  <Text style={styles.loadingText}>냉장고 등록 중...</Text>
                </View>
              )}
            </View>
            <View style={styles.maskSide} />
          </View>
          <View style={styles.maskRow}>
            <Text style={styles.guideText}>
              공동 관리할 냉장고의 QR 코드를 사각형 안에 맞춰주세요.
            </Text>
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 8,
  },
  errorSub: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  permissionButton: {
    height: 48,
    borderRadius: 12,
    paddingHorizontal: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  permissionButtonText: {
    fontSize: 14,
    fontWeight: '700',
  },
  backButton: {
    height: 48,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  overlayContainer: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'space-between',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 50,
    paddingHorizontal: 20,
    paddingBottom: 20,
    zIndex: 10,
  },
  headerTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  maskContainer: {
    flex: 1,
  },
  maskRow: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 30,
  },
  maskCenterRow: {
    height: 250,
    flexDirection: 'row',
  },
  maskSide: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
  },
  scanTarget: {
    width: 250,
    height: 250,
    position: 'relative',
    backgroundColor: 'transparent',
  },
  corner: {
    position: 'absolute',
    width: 20,
    height: 20,
    borderColor: '#38BDF8', // 스카이 블루 하이라이트
  },
  topLeft: {
    top: 0,
    left: 0,
    borderLeftWidth: 4,
    borderTopWidth: 4,
  },
  topRight: {
    top: 0,
    right: 0,
    borderRightWidth: 4,
    borderTopWidth: 4,
  },
  bottomLeft: {
    bottom: 0,
    left: 0,
    borderLeftWidth: 4,
    borderBottomWidth: 4,
  },
  bottomRight: {
    bottom: 0,
    right: 0,
    borderRightWidth: 4,
    borderBottomWidth: 4,
  },
  guideText: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 14,
    textAlign: 'center',
    fontWeight: '500',
    marginTop: 20,
    lineHeight: 20,
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 8,
  },
  loadingText: {
    color: '#FFFFFF',
    marginTop: 12,
    fontSize: 14,
    fontWeight: '600',
  },
});
