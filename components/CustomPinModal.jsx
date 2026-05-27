import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Pressable,
  ScrollView,
  TextInput,
  StyleSheet,
  Modal,
  TouchableWithoutFeedback,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { COLORS, FONTS } from '../utils/theme';
import { calcDistanceMeters, formatDistance, formatWalk } from '../utils/distance';
import { reverseGeocode } from '../utils/geocoding';

const EMOJIS = ['🍗', '🍕', '🍔', '🌶️', '🍙', '🍲', '🍜', '🥘'];
const COUNTS = [2, 3, 4, 5, 6];
const DURATIONS = [
  { mins: 30, label: '30분' },
  { mins: 60, label: '1시간' },
  { mins: 120, label: '2시간' },
];
const ADDRESS_PLACEHOLDER = '주소 변환 중...';

export default function CustomPinModal({ visible, pin, userLocation, onClose, onConfirm, submitting, onShowToast }) {
  const [address, setAddress] = useState(ADDRESS_PLACEHOLDER);
  const [poolName, setPoolName] = useState('');
  const [selectedEmoji, setSelectedEmoji] = useState('🍗');
  const [selectedCount, setSelectedCount] = useState(4);
  const [durationMinutes, setDurationMinutes] = useState(30);

  useEffect(() => {
    if (visible && pin) {
      setAddress(ADDRESS_PLACEHOLDER);
      setPoolName('');
      setSelectedEmoji('🍗');
      setSelectedCount(4);
      setDurationMinutes(30);
      reverseGeocode(pin.lat, pin.lng).then(setAddress);
    }
  }, [visible, pin]);

  if (!pin) return null;
  const dist = calcDistanceMeters(userLocation, pin);
  const canConfirm = poolName.trim().length > 0 && !submitting;
  // 카카오 변환 완료 후만 복사 가능 (placeholder 동안엔 버튼 숨김)
  const addressReady = address !== ADDRESS_PLACEHOLDER;
  const handleCopy = async () => {
    if (!addressReady) return;
    const text = `${address}\n\n※ 정확한 위치는 배달앱 "현재 위치로 찾기"로 확인해주세요`;
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
                <Text style={styles.title}>커스텀 위치</Text>
              </View>
              <Text style={styles.metaItem}>
                ▸ 내 위치에서 {formatDistance(dist)} · {formatWalk(dist)}
              </Text>
            </View>
            <Pressable style={styles.closeBtn} onPress={onClose}>
              <Text style={styles.closeX}>✕</Text>
            </Pressable>
          </View>
        </View>

        {/* iOS 키보드 올라올 때 TextInput이 가려지는 것 방지 — transparent sheet라 offset 0 */}
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={0}
        >
        <ScrollView style={styles.body} contentContainerStyle={{ paddingBottom: 32 }}>
          {/* 자동 주소 */}
          <View style={styles.autoAddrBox}>
            <Text style={styles.autoAddrLabel}>✨ 자동 생성된 배달 주소</Text>
            <Text style={styles.autoAddrText}>{address}</Text>
            <Text style={styles.autoAddrWarn}>
              ⚠️ 기사님께 추가 안내 문구를 메모에 적어주세요
            </Text>
          </View>

          {/* 주소 복사 — 카카오 변환 완료 후만 표시 (SpotModal/CustomPotModal과 동일 패턴) */}
          {addressReady && (
            <Pressable style={styles.copyBtn} onPress={handleCopy}>
              <Text style={styles.copyBtnText}>📋 주소 복사하기</Text>
            </Pressable>
          )}

          {/* 배달앱 "현재 위치 찾기" 활용 안내 (SpotModal/CustomPotModal과 동일) */}
          <View style={styles.deliveryTip}>
            <Text style={styles.deliveryTipText}>
              💡 팁: 배달앱 '현재 위치' 기능으로 더 정확하게 받을 수 있어요
            </Text>
          </View>

          {/* 팟 이름 */}
          <View style={styles.formGroup}>
            <Text style={styles.formLabel}>팟 이름</Text>
            <TextInput
              style={styles.formInput}
              value={poolName}
              onChangeText={setPoolName}
              placeholder="예: BBQ 같이 시킬 분~"
              placeholderTextColor={COLORS.text3}
            />
          </View>

          {/* 이모지 */}
          <View style={styles.formGroup}>
            <Text style={styles.formLabel}>카테고리</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={styles.emojiRow}>
                {EMOJIS.map((e) => (
                  <Pressable
                    key={e}
                    style={[
                      styles.emojiBtn,
                      selectedEmoji === e && styles.emojiBtnActive,
                    ]}
                    onPress={() => setSelectedEmoji(e)}
                  >
                    <Text style={styles.emojiBtnText}>{e}</Text>
                  </Pressable>
                ))}
              </View>
            </ScrollView>
          </View>

          {/* 인원 */}
          <View style={styles.formGroup}>
            <Text style={styles.formLabel}>모집 인원</Text>
            <View style={styles.countRow}>
              {COUNTS.map((n) => (
                <Pressable
                  key={n}
                  style={[
                    styles.countBtn,
                    selectedCount === n && styles.countBtnActive,
                  ]}
                  onPress={() => setSelectedCount(n)}
                >
                  <Text
                    style={[
                      styles.countBtnText,
                      selectedCount === n && styles.countBtnTextActive,
                    ]}
                  >
                    {n}명
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>

          {/* 모집 시간 */}
          <View style={styles.formGroup}>
            <Text style={styles.formLabel}>모집 시간</Text>
            <View style={styles.durationRow}>
              {DURATIONS.map(({ mins, label }) => (
                <Pressable
                  key={mins}
                  style={[
                    styles.durationChip,
                    durationMinutes === mins && styles.durationChipActive,
                  ]}
                  onPress={() => setDurationMinutes(mins)}
                >
                  <Text
                    style={[
                      styles.durationChipText,
                      durationMinutes === mins && styles.durationChipTextActive,
                    ]}
                  >
                    {label}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>

          <Pressable
            style={[styles.confirmBtn, !canConfirm && styles.confirmBtnDisabled]}
            disabled={!canConfirm}
            onPress={() => onConfirm(
              poolName.trim(),
              selectedEmoji,
              selectedCount,
              durationMinutes,
              address === ADDRESS_PLACEHOLDER ? null : address,
            )}
          >
            <Text style={styles.confirmBtnText}>
              {submitting ? '만드는 중...' : '✓ 팟 만들기'}
            </Text>
          </Pressable>
        </ScrollView>
        </KeyboardAvoidingView>
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

  body: { paddingHorizontal: 20 },

  autoAddrBox: {
    padding: 12,
    borderRadius: 16,
    marginBottom: 16,
    borderWidth: 2,
    borderColor: COLORS.accent,
    borderStyle: 'dashed',
    backgroundColor: '#FFFBEB',
  },
  autoAddrLabel: {
    fontSize: 10,
    fontFamily: FONTS.bold,
    color: '#92400E',
  },
  autoAddrText: {
    fontSize: 12,
    color: COLORS.text2,
    marginTop: 4,
    fontFamily: FONTS.medium,
  },
  autoAddrWarn: {
    fontSize: 10,
    color: COLORS.text3,
    marginTop: 6,
    fontFamily: FONTS.medium,
  },
  copyBtn: {
    marginTop: -4,
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
    marginBottom: 16,
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

  formGroup: { marginBottom: 16 },
  formLabel: {
    fontSize: 12,
    fontFamily: FONTS.bold,
    color: COLORS.text1,
    marginBottom: 6,
  },
  formInput: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: COLORS.surface2,
    borderWidth: 1,
    borderColor: COLORS.border,
    fontSize: 14,
    color: COLORS.text1,
    fontFamily: FONTS.medium,
  },

  emojiRow: { flexDirection: 'row', gap: 8 },
  emojiBtn: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: COLORS.surface2,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  emojiBtnActive: {
    backgroundColor: COLORS.primary50,
    borderColor: COLORS.primary,
  },
  emojiBtnText: { fontSize: 24 },

  countRow: { flexDirection: 'row', gap: 8 },
  countBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: COLORS.surface2,
    alignItems: 'center',
  },
  countBtnActive: { backgroundColor: COLORS.primary },
  countBtnText: { fontSize: 14, fontFamily: FONTS.bold, color: COLORS.text1 },
  countBtnTextActive: { color: 'white' },

  durationRow: { flexDirection: 'row', gap: 8 },
  durationChip: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: COLORS.surface2,
    alignItems: 'center',
  },
  durationChipActive: { backgroundColor: COLORS.primary },
  durationChipText: { fontSize: 13, fontFamily: FONTS.bold, color: COLORS.text1 },
  durationChipTextActive: { color: 'white' },

  confirmBtn: {
    paddingVertical: 14,
    borderRadius: 16,
    backgroundColor: COLORS.accent,
    alignItems: 'center',
  },
  confirmBtnDisabled: { opacity: 0.4 },
  confirmBtnText: {
    fontFamily: FONTS.display,
    fontSize: 16,
    color: '#5C4100',
  },
});
