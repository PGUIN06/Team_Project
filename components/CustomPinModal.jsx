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
} from 'react-native';
import { COLORS, FONTS } from '../utils/theme';
import { calcDistanceMeters, formatDistance, formatWalk } from '../utils/distance';
import { reverseGeocode } from '../utils/geocoding';

const EMOJIS = ['🍗', '🍕', '🍔', '🌶️', '🍙', '🍲', '🍜', '🥘'];
const COUNTS = [2, 3, 4, 5, 6];

export default function CustomPinModal({ visible, pin, userLocation, onClose, onConfirm }) {
  const [address, setAddress] = useState('주소 변환 중...');
  const [poolName, setPoolName] = useState('');
  const [selectedEmoji, setSelectedEmoji] = useState('🍗');
  const [selectedCount, setSelectedCount] = useState(4);

  useEffect(() => {
    if (visible && pin) {
      setAddress('주소 변환 중...');
      setPoolName('');
      setSelectedEmoji('🍗');
      setSelectedCount(4);
      reverseGeocode(pin.lat, pin.lng).then(setAddress);
    }
  }, [visible, pin]);

  if (!pin) return null;
  const dist = calcDistanceMeters(userLocation, pin);
  const canConfirm = poolName.trim().length > 0;

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

        <ScrollView style={styles.body} contentContainerStyle={{ paddingBottom: 32 }}>
          {/* 자동 주소 */}
          <View style={styles.autoAddrBox}>
            <Text style={styles.autoAddrLabel}>✨ 자동 생성된 배달 주소</Text>
            <Text style={styles.autoAddrText}>{address}</Text>
            <Text style={styles.autoAddrWarn}>
              ⚠️ 기사님께 추가 안내 문구를 메모에 적어주세요
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

          <Pressable
            style={[styles.confirmBtn, !canConfirm && styles.confirmBtnDisabled]}
            disabled={!canConfirm}
            onPress={() => onConfirm(poolName.trim(), selectedEmoji, selectedCount)}
          >
            <Text style={styles.confirmBtnText}>✓ 팟 만들기</Text>
          </Pressable>
        </ScrollView>
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
