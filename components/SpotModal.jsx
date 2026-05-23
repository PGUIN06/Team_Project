import React from 'react';
import {
  View,
  Text,
  Pressable,
  ScrollView,
  StyleSheet,
  Modal,
  TouchableWithoutFeedback,
} from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { COLORS, FONTS } from '../utils/theme';
import { ACTIVE_POOLS } from '../data/campusData';
import { calcDistanceMeters, formatDistance, formatWalk } from '../utils/distance';

export default function SpotModal({ visible, spot, userLocation, onClose, onCreatePool, onShowToast }) {
  if (!spot) return null;

  const spotPools = ACTIVE_POOLS.filter((p) => p.spotId === spot.id);
  const dist = calcDistanceMeters(userLocation, spot);

  const handleCopy = async () => {
    await Clipboard.setStringAsync(spot.deliveryAddress);
    onShowToast('✅ 복사 완료 — 배달앱 주소창에 붙여넣기!');
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

        {/* Header */}
        <View style={styles.header}>
          <View style={styles.titleRow}>
            <View style={{ flex: 1 }}>
              <View style={styles.titleInner}>
                <View
                  style={[styles.colorDot, { backgroundColor: spot.color }]}
                />
                <Text style={styles.title}>{spot.name}</Text>
              </View>
              <View style={styles.meta}>
                <Text style={styles.metaItem}>
                  ▸ {formatDistance(dist)} · {formatWalk(dist)}
                </Text>
                <Text style={styles.metaItem}>
                  활성 팟{' '}
                  <Text style={styles.metaBold}>{spotPools.length}</Text>개
                </Text>
              </View>
              <View style={styles.tip}>
                <Text style={styles.tipText}>💡 {spot.tip}</Text>
              </View>
            </View>
            <Pressable style={styles.closeBtn} onPress={onClose}>
              <Text style={styles.closeX}>✕</Text>
            </Pressable>
          </View>

          {/* 배달 주소 박스 */}
          <View style={styles.addressBox}>
            <View style={styles.addressHeader}>
              <Text style={styles.addressHeaderText}>
                📍 배달앱 주소창에 그대로 붙여넣기
              </Text>
            </View>
            <View style={styles.addressBody}>
              <Text style={styles.addressText}>{spot.deliveryAddress}</Text>
            </View>
            <Pressable style={styles.copyBtn} onPress={handleCopy}>
              <Text style={styles.copyBtnText}>📋 주소 복사하기</Text>
            </Pressable>
          </View>
        </View>

        {/* Body */}
        <ScrollView style={styles.body} contentContainerStyle={{ paddingBottom: 24 }}>
          {spotPools.length === 0 ? (
            <View style={styles.empty}>
              <Text style={styles.emptyEmoji}>🍽️</Text>
              <Text style={styles.emptyText}>아직 활성 팟이 없어요</Text>
              <Text style={styles.emptySub}>첫 팟을 만들어보세요!</Text>
            </View>
          ) : (
            spotPools.map((p) => (
              <View key={p.id} style={styles.poolRow}>
                <View style={styles.poolEmojiWrap}>
                  <Text style={styles.poolEmoji}>{p.emoji}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.poolName} numberOfLines={1}>
                    {p.name}
                  </Text>
                  <View style={styles.poolStats}>
                    <Text style={styles.poolCount}>
                      {p.current}/{p.max}명
                    </Text>
                    <Text
                      style={[
                        styles.poolTime,
                        p.status === 'ordered'
                          ? styles.poolTimeActive
                          : styles.poolTimeUrgent,
                      ]}
                    >
                      {p.timeLeft}
                    </Text>
                  </View>
                </View>
              </View>
            ))
          )}

          <Pressable
            style={styles.createBtn}
            onPress={() => onCreatePool(spot.name)}
          >
            <Text style={styles.createBtnText}>+ 이 위치에 팟 만들기</Text>
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
  colorDot: { width: 12, height: 12, borderRadius: 6 },
  title: { fontFamily: FONTS.display, fontSize: 20, color: COLORS.text1 },
  meta: { flexDirection: 'row', gap: 12, marginTop: 4 },
  metaItem: { fontSize: 11, color: COLORS.text2, fontFamily: FONTS.medium },
  metaBold: { fontFamily: FONTS.bold, color: COLORS.primary },
  tip: {
    marginTop: 10,
    backgroundColor: COLORS.surface2,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
  },
  tipText: { fontSize: 12, color: COLORS.text2, fontFamily: FONTS.medium },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.surface2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeX: { fontSize: 14, color: COLORS.text1 },

  // Address
  addressBox: {
    marginTop: 12,
    borderRadius: 16,
    overflow: 'hidden',
  },
  addressHeader: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: COLORS.primary50,
    borderBottomWidth: 1,
    borderBottomColor: '#DBEAFE',
  },
  addressHeaderText: {
    fontSize: 12,
    fontFamily: FONTS.bold,
    color: COLORS.primary,
  },
  addressBody: { padding: 14, backgroundColor: 'white' },
  addressText: {
    fontSize: 13,
    lineHeight: 21,
    color: COLORS.text1,
    fontFamily: FONTS.bold,
  },
  copyBtn: {
    paddingVertical: 12,
    alignItems: 'center',
    backgroundColor: COLORS.primary,
  },
  copyBtnText: {
    color: 'white',
    fontSize: 13,
    fontFamily: FONTS.bold,
  },

  // Body
  body: { paddingHorizontal: 20 },
  empty: { alignItems: 'center', paddingVertical: 32 },
  emptyEmoji: { fontSize: 32, marginBottom: 8 },
  emptyText: { fontSize: 14, fontFamily: FONTS.bold, color: COLORS.text1 },
  emptySub: { fontSize: 11, color: COLORS.text3, marginTop: 4 },

  poolRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    backgroundColor: COLORS.surface2,
    borderRadius: 16,
    marginBottom: 8,
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

  createBtn: {
    marginTop: 12,
    paddingVertical: 14,
    borderRadius: 16,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
  },
  createBtnText: {
    color: 'white',
    fontFamily: FONTS.display,
    fontSize: 16,
  },
});
