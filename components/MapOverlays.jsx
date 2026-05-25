import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  Animated,
  Platform,
} from 'react-native';
import { COLORS, FONTS } from '../utils/theme';

// ============ 활성 팟 카운트 뱃지 ============
export function PoolCounter({ count }) {
  const dotAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(dotAnim, {
          toValue: -3,
          duration: 750,
          useNativeDriver: true,
        }),
        Animated.timing(dotAnim, {
          toValue: 0,
          duration: 750,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, []);

  return (
    <View style={styles.poolCounter}>
      <Animated.View
        style={[styles.pulseDot, { transform: [{ translateY: dotAnim }] }]}
      />
      <Text style={styles.poolCounterText}>
        지금 활성 팟 <Text style={styles.tabular}>{count}</Text>개
      </Text>
    </View>
  );
}

// ============ 우측 GPS 버튼 ============
export function LocateButton({ onPress }) {
  return (
    <View style={styles.mapControls}>
      <Pressable style={styles.mapControlBtn} onPress={onPress}>
        <Text style={styles.locateIcon}>⊕</Text>
      </Pressable>
    </View>
  );
}

// ============ FAB (여기서 같이 먹기) ============
export function FAB({ active, onPress }) {
  return (
    <Pressable
      style={[styles.fab, active && styles.fabActive]}
      onPress={onPress}
    >
      <Text style={styles.fabIcon}>🍽️</Text>
      <Text
        style={[styles.fabText, active && styles.fabTextActive]}
      >
        {active ? '취소' : '여기서 같이 먹기'}
      </Text>
    </Pressable>
  );
}

// ============ 채팅 버튼 (내가 속한 팟 목록 열기) ============
export function MyPotsButton({ onPress }) {
  return (
    <View style={styles.myPotsBtnWrap}>
      <Pressable style={styles.myPotsBtn} onPress={onPress}>
        <Text style={styles.myPotsIcon}>💬</Text>
      </Pressable>
    </View>
  );
}

// ============ 핀 모드 안내 토스트 (상단) ============
export function PlacingHint() {
  const anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(anim, { toValue: -4, duration: 750, useNativeDriver: true }),
        Animated.timing(anim, { toValue: 0, duration: 750, useNativeDriver: true }),
      ])
    ).start();
  }, []);

  return (
    <Animated.View
      style={[styles.placingHint, { transform: [{ translateY: anim }] }]}
      pointerEvents="none"
    >
      <Text style={styles.placingHintText}>📍 지도를 탭해서 위치를 정하세요</Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  // Pool counter
  poolCounter: {
    position: 'absolute',
    top: 120,
    left: 16,
    zIndex: 5,
    backgroundColor: 'rgba(26, 26, 46, 0.92)',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 12,
      },
      android: { elevation: 5 },
    }),
  },
  pulseDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: COLORS.success,
  },
  poolCounterText: {
    color: 'white',
    fontSize: 11,
    fontFamily: FONTS.bold,
  },
  tabular: { fontVariant: ['tabular-nums'] },

  // Locate
  mapControls: {
    position: 'absolute',
    right: 16,
    top: 100,
    zIndex: 5,
  },
  mapControlBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.surface,
    alignItems: 'center',
    justifyContent: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.12,
        shadowRadius: 12,
      },
      android: { elevation: 4 },
    }),
  },
  locateIcon: { fontSize: 22, color: COLORS.primary, fontWeight: '700' },

  // FAB
  fab: {
    position: 'absolute',
    right: 16,
    bottom: 220,
    zIndex: 8,
    paddingHorizontal: 18,
    paddingVertical: 14,
    borderRadius: 999,
    backgroundColor: COLORS.accent,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    ...Platform.select({
      ios: {
        shadowColor: COLORS.accent,
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.5,
        shadowRadius: 20,
      },
      android: { elevation: 6 },
    }),
  },
  fabActive: {
    backgroundColor: COLORS.text1,
  },
  fabIcon: { fontSize: 16 },
  fabText: {
    fontFamily: FONTS.display,
    fontSize: 14,
    color: '#5C4100',
  },
  fabTextActive: { color: 'white' },

  // MyPotsButton (FAB 위쪽)
  myPotsBtnWrap: {
    position: 'absolute',
    right: 16,
    bottom: 290,
    zIndex: 7,
  },
  myPotsBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'white',
    alignItems: 'center',
    justifyContent: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.15,
        shadowRadius: 8,
      },
      android: { elevation: 4 },
    }),
  },
  myPotsIcon: { fontSize: 22 },

  // Placing hint
  placingHint: {
    position: 'absolute',
    top: 100,
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 5,
  },
  placingHintText: {
    backgroundColor: COLORS.text1,
    color: 'white',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 999,
    fontSize: 12,
    fontFamily: FONTS.bold,
    overflow: 'hidden',
  },
});
