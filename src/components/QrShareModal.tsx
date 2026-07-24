import React from 'react';
import { StyleSheet, View, Text, TouchableOpacity, Modal, Share, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import QRCode from 'react-native-qrcode-svg';
import { useTheme } from '../context/ThemeContext';

interface QrShareModalProps {
  visible: boolean;
  onClose: () => void;
  fridgeName: string;
  fridgeUuid: string;
}

export default function QrShareModal({ visible, onClose, fridgeName, fridgeUuid }: QrShareModalProps) {
  const { theme, isDark } = useTheme();

  const handleShareText = async () => {
    try {
      const shareUrl = `${process.env.EXPO_PUBLIC_API_URL || 'http://localhost:8086'}/share/fridge?uuid=${fridgeUuid}`;
      await Share.share({
        message: `[냉장고집사] 냉장고 공동 관리에 초대합니다! ❄️\n냉장고 이름: ${fridgeName}\n\n아래 링크를 터치해 냉장고를 함께 관리해 보세요.\n${shareUrl}`,
      });
    } catch (error) {
      console.error('Error sharing text', error);
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={[styles.overlay, { backgroundColor: theme.modalOverlay }]}>
        <View style={[styles.content, { backgroundColor: theme.surface, borderColor: theme.borderLight }]}>
          
          {/* Header */}
          <View style={[styles.header, { borderBottomColor: theme.borderLight }]}>
            <Text style={[styles.title, { color: theme.textPrimary }]}>냉장고 공유 (QR)</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Ionicons name="close" size={22} color={theme.textSecondary} />
            </TouchableOpacity>
          </View>

          {/* Body */}
          <View style={styles.body}>
            <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
              공동 관리할 기기에서 이 QR 코드를 스캔하세요.
            </Text>
            
            <View style={[styles.fridgeNameBadge, { backgroundColor: theme.primaryLight }]}>
              <Text style={[styles.fridgeNameText, { color: theme.primary }]}>
                {fridgeName}
              </Text>
            </View>

            {/* QR Code Container */}
            <View style={[styles.qrContainer, { 
              backgroundColor: '#FFFFFF', 
              borderColor: theme.borderLight 
            }]}>
              {fridgeUuid ? (
                <QRCode
                  value={`${process.env.EXPO_PUBLIC_API_URL || 'http://localhost:8086'}/share/fridge?uuid=${fridgeUuid}`}
                  size={180}
                  color="#0F172A"
                  backgroundColor="#FFFFFF"
                  quietZone={10}
                />
              ) : (
                <Text style={{ color: theme.textMuted }}>공유 정보 생성 오류</Text>
              )}
            </View>

            {/* Action Buttons */}
            <TouchableOpacity 
              style={[styles.shareButton, { backgroundColor: theme.primary }]}
              activeOpacity={0.85}
              onPress={handleShareText}
            >
              <Ionicons name="share-social-outline" size={18} color={theme.primaryOnPrimary} style={{ marginRight: 8 }} />
              <Text style={[styles.shareButtonText, { color: theme.primaryOnPrimary }]}>텍스트로 공유하기</Text>
            </TouchableOpacity>

            <Text style={[styles.codeDesc, { color: theme.textTertiary }]}>
              공유 코드: {fridgeUuid}
            </Text>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  content: {
    width: '90%',
    maxWidth: 340,
    borderRadius: 24,
    borderWidth: 1,
    padding: 20,
    alignItems: 'center',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 10,
  },
  header: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 14,
    borderBottomWidth: 1,
    marginBottom: 20,
  },
  title: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  closeButton: {
    padding: 4,
  },
  body: {
    width: '100%',
    alignItems: 'center',
  },
  subtitle: {
    fontSize: 13,
    textAlign: 'center',
    marginBottom: 12,
  },
  fridgeNameBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    marginBottom: 20,
  },
  fridgeNameText: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  qrContainer: {
    padding: 16,
    borderRadius: 20,
    borderWidth: 1.5,
    marginBottom: 24,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  shareButton: {
    width: '100%',
    height: 48,
    borderRadius: 14,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  shareButtonText: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  codeDesc: {
    fontSize: 11,
    textAlign: 'center',
  },
});
