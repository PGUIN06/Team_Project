// components/CustomPotModal.jsx
// 임의 위치 팟 마커 클릭 시 뜨는 시트 모달 — 단일 팟 미리보기.
// SpotModal과 톤은 같지만 구조가 다름 (다수 팟 목록 X / "팟 만들기" 버튼 X).
// 카드 탭 → onPotPress(pot) → MapScreen의 handleOpenPotChat 흐름으로 합류.
import React from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  Modal,
  TouchableWithoutFeedback,
} from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { COLORS, FONTS } from '../utils/theme';
import { calcDistanceMeters, formatDistance, formatWalk } from '../utils/distance';
import { formatPoolTimeStatus } from '../utils/time';

export default function CustomPotModal({ visible, pot, userLocation, onClose, onPotPress, onShowToast }) {
  if (!pot) return null;

  const potLoc = { lat: Number(pot.latitude), lng: Number(pot.longitude) };
  const dist = calcDistanceMeters(userLocation, potLoc);
  const addressText =
    pot.customAddress ||
    `위도 ${potLoc.lat.toFixed(5)}, 경도 ${potLoc.lng.toFixed(5)}`;

  // 한글 주소 클립보드 복사 — SpotModal과 동일 패턴 (custom_address null이면 버튼 자체 숨김)
  const handleCopy = async () => {
    if (!pot.customAddress) return;
    const text = `${pot.customAddress}\n\n※ 정확한 위치는 배달앱 "현재 위치로 찾기"로 확인해주세요`;
    await Clipboard.setStringAsync(text);
    onShowToast?.('✅ 복사 완료 — 배달앱 주소창에 붙여넣기!');
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.backdrop} />
      </TouchableWithoutFeedback>

      <View style={styles.sheet}>
        <View style={styles.handle} />

        <View style={styles.header}>
          <View style={styles.titleRow}>
            <View style={{ flex: 1 }}>
              <View style={styles.titleInner}>
                <Text style={styles.titleEmoji}>📍</Text>
                <Text style={styles.title}>직접 찍은 위치</Text>
              </View>
              <Text style={styles.metaItem}>
                ▸ 내 위치에서 {formatDistance(dist)} · {formatWalk(dist)}
              </Text>
            </View>
            <Pressable style={styles.closeBtn} onPress={onClose}>
              <Text style={styles.closeX}>✕</Text>
            </Pressable>
          </View>

          {/* 한글 주소 박스 — 카카오 REST API로 변환된 결과 또는 좌표 fallback */}
          <View style={styles.addrBox}>
            <Text style={styles.addrLabel}>📍 한글 주소</Text>
            <Text style={styles.addrText} numberOfLines={2}>
              {addressText}
            </Text>
            {!pot.customAddress && (
              <Text style={styles.addrWarn}>※ 주소 변환 결과가 없어 좌표로 표시합니다.</Text>
            )}
          </View>

          {/* 주소 복사 — SpotModal과 동일한 파란 버튼. custom_address 없으면 버튼 자체 숨김 */}
          {pot.customAddress && (
            <Pressable style={styles.copyBtn} onPress={handleCopy}>
              <Text style={styles.copyBtnText}>📋 주소 복사하기</Text>
            </Pressable>
          )}

          {/* 배달앱 "현재 위치 찾기" 활용 안내 */}
          <View style={styles.deliveryTip}>
            <Text style={styles.deliveryTipText}>
              💡 팁: 배달앱 '현재 위치' 기능으로 더 정확하게 받을 수 있어요
            </Text>
          </View>
        </View>

        {/* 단일 팟 카드 — 탭 시 onPotPress(pot) */}
        <View style={styles.body}>
          <Pressable style={styles.poolRow} onPress={() => onPotPress?.(pot)}>
            <View style={styles.poolEmojiWrap}>
              <Text style={styles.poolEmoji}>{pot.emoji}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.poolName} numberOfLines={1}>
                {pot.name}
              </Text>
              <View style={styles.poolStats}>
                <Text style={styles.poolCount}>
                  {pot.current}/{pot.max}명
                </Text>
                <Text
                  style={[
                    styles.poolTime,
                    pot.status === 'ordered'
                      ? styles.poolTimeActive
                      : styles.poolTimeUrgent,
                  ]}
                >
                  {formatPoolTimeStatus(pot)}
                </Text>
              </View>
            </View>
            <Text style={styles.chev}>›</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  sheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: COLORS.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '85%',
  },
  handle: {
    width: 40,
    height: 4,
    backgroundColor: COLORS.border,
    borderRadius: 2,
    alignSelf: 'center',
    marginTop: 8,
    marginBottom: 4,
  },
  header: { paddingHorizontal: 20, paddingBottom: 12 },
  titleRow: { flexDirection: 'row', justifyContent: 'space-between' },
  titleInner: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  titleEmoji: { fontSize: 22 },
  title: { fontFamily: FONTS.display, fontSize: 20, color: COLORS.text1 },
  metaItem: { fontSize: 11, color: COLORS.text2, marginTop: 4, fontFamily: FONTS.medium },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.surface2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeX: { fontSize: 14, color: COLORS.text1 },

  addrBox: {
    marginTop: 12,
    padding: 12,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: COLORS.accent,
    borderStyle: 'dashed',
    backgroundColor: '#FFFBEB',
  },
  addrLabel: {
    fontSize: 10,
    fontFamily: FONTS.bold,
    color: '#92400E',
  },
  addrText: {
    fontSize: 13,
    color: COLORS.text1,
    marginTop: 4,
    fontFamily: FONTS.bold,
    lineHeight: 18,
  },
  addrWarn: {
    fontSize: 10,
    color: COLORS.text3,
    marginTop: 4,
    fontFamily: FONTS.medium,
  },
  copyBtn: {
    marginTop: 10,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
  },
  copyBtnText: {
    color: 'white',
    fontSize: 13,
    fontFamily: FONTS.bold,
  },

  deliveryTip: {
    marginTop: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: COLORS.surface2,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  deliveryTipText: {
    fontSize: 11,
    color: COLORS.text2,
    fontFamily: FONTS.medium,
    lineHeight: 16,
  },

  body: { paddingHorizontal: 20, paddingBottom: 24 },
  poolRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    backgroundColor: COLORS.surface2,
    borderRadius: 16,
  },
  poolEmojiWrap: {
    width: 48,
    height: 48,
    backgroundColor: COLORS.surface,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  poolEmoji: { fontSize: 24 },
  poolName: { fontSize: 13, fontFamily: FONTS.bold, color: COLORS.text1 },
  poolStats: { flexDirection: 'row', gap: 8, marginTop: 4 },
  poolCount: { fontSize: 11, fontFamily: FONTS.bold, color: COLORS.primary },
  poolTime: { fontSize: 11, fontFamily: FONTS.bold },
  poolTimeUrgent: { color: COLORS.coral },
  poolTimeActive: { color: COLORS.success },
  chev: { fontSize: 20, color: COLORS.text3, marginLeft: 4 },
});
