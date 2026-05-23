import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Pressable,
  ScrollView,
  StyleSheet,
  Modal,
  TouchableWithoutFeedback,
  ActivityIndicator,
} from 'react-native';
import { COLORS, FONTS } from '../utils/theme';
import { fetchMyPots } from '../lib/pots';
import { CAMPUS_SPOTS } from '../data/campusData';

export default function MyPotsList({ visible, onClose, onPotPress }) {
  const [pots, setPots] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!visible) return;
    (async () => {
      setLoading(true);
      const myPots = await fetchMyPots();
      setPots(myPots);
      setLoading(false);
    })();
  }, [visible]);

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
          <Text style={styles.title}>💬 내 채팅방</Text>
          <Pressable style={styles.closeBtn} onPress={onClose}>
            <Text style={styles.closeX}>✕</Text>
          </Pressable>
        </View>

        {/* Body */}
        <ScrollView
          style={styles.body}
          contentContainerStyle={{ paddingBottom: 32 }}
        >
          {loading ? (
            <View style={styles.empty}>
              <ActivityIndicator color={COLORS.primary} />
            </View>
          ) : pots.length === 0 ? (
            <View style={styles.empty}>
              <Text style={styles.emptyEmoji}>🍽️</Text>
              <Text style={styles.emptyText}>아직 참여 중인 팟이 없어요</Text>
              <Text style={styles.emptySub}>
                지도에서 스팟을 눌러 팟을 만들거나 가입해보세요!
              </Text>
            </View>
          ) : (
            pots.map((pot) => {
              const spot = CAMPUS_SPOTS.find((s) => s.id === pot.spot_id);
              return (
                <Pressable
                  key={pot.id}
                  style={styles.potRow}
                  onPress={() => onPotPress?.(pot)}
                >
                  <View style={styles.potEmojiWrap}>
                    <Text style={styles.potEmoji}>{pot.emoji}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.potName} numberOfLines={1}>
                      {pot.name}
                    </Text>
                    <View style={styles.potMeta}>
                      {spot && (
                        <Text style={styles.potLocation}>
                          📍 {spot.short}
                        </Text>
                      )}
                      <Text style={styles.potStatus}>
                        {pot.status === 'ordered'
                          ? '주문중'
                          : pot.status === 'closed'
                          ? '마감'
                          : '모집중'}
                      </Text>
                    </View>
                  </View>
                  <Text style={styles.arrow}>›</Text>
                </Pressable>
              );
            })
          )}
        </ScrollView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  sheet: {
    position: 'absolute',
    left: 0, right: 0, bottom: 0,
    backgroundColor: COLORS.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '85%',
    minHeight: '50%',
  },
  handle: {
    width: 40, height: 4,
    backgroundColor: COLORS.border,
    borderRadius: 2,
    alignSelf: 'center',
    marginTop: 8, marginBottom: 4,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  title: {
    fontFamily: FONTS.display,
    fontSize: 20,
    color: COLORS.text1,
  },
  closeBtn: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: COLORS.surface2,
    alignItems: 'center', justifyContent: 'center',
  },
  closeX: { fontSize: 14, color: COLORS.text1 },

  body: { paddingHorizontal: 20, paddingTop: 12 },

  empty: { alignItems: 'center', paddingVertical: 48 },
  emptyEmoji: { fontSize: 40, marginBottom: 12 },
  emptyText: {
    fontSize: 15,
    fontFamily: FONTS.bold,
    color: COLORS.text1,
  },
  emptySub: {
    fontSize: 12,
    color: COLORS.text3,
    marginTop: 6,
    textAlign: 'center',
    paddingHorizontal: 40,
  },

  potRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    backgroundColor: COLORS.surface2,
    borderRadius: 16,
    marginBottom: 8,
  },
  potEmojiWrap: {
    width: 48, height: 48,
    backgroundColor: COLORS.surface,
    borderRadius: 14,
    alignItems: 'center', justifyContent: 'center',
  },
  potEmoji: { fontSize: 24 },
  potName: {
    fontSize: 14,
    fontFamily: FONTS.bold,
    color: COLORS.text1,
  },
  potMeta: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 4,
  },
  potLocation: {
    fontSize: 11,
    color: COLORS.text2,
    fontFamily: FONTS.medium,
  },
  potStatus: {
    fontSize: 11,
    color: COLORS.primary,
    fontFamily: FONTS.bold,
  },
  arrow: {
    fontSize: 24,
    color: COLORS.text3,
  },
});
