import React from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import { COLORS, FONTS } from '../utils/theme';

// 물방울 모양 마커 — RN View로 흉내
// 원본 SVG의 path를 borderRadius로 근사
export default function CustomMarker({ color, count, label }) {
  return (
    <View style={styles.wrapper}>
      <View style={[styles.pin, { backgroundColor: color }]}>
        <View style={styles.countCircle}>
          <Text style={[styles.countText, { color }]}>
            {count > 0 ? count : '·'}
          </Text>
        </View>
      </View>
      <View style={styles.pinTail}>
        <View style={[styles.pinTailInner, { borderTopColor: color }]} />
      </View>
      <View style={styles.labelWrap}>
        <Text style={styles.labelText} numberOfLines={1}>
          {label}
        </Text>
      </View>
    </View>
  );
}

// 노란 커스텀 핀 (사용자가 직접 찍은 위치)
export function CustomPlacedMarker() {
  return (
    <View style={styles.wrapper}>
      <View style={[styles.pin, { backgroundColor: COLORS.accent }]}>
        <View style={styles.countCircle}>
          <Text style={styles.emojiPin}>📍</Text>
        </View>
      </View>
      <View style={styles.pinTail}>
        <View
          style={[styles.pinTailInner, { borderTopColor: COLORS.accent }]}
        />
      </View>
    </View>
  );
}

// 사용자 GPS 점
export function UserDot() {
  return (
    <View style={styles.userDotWrap}>
      <View style={styles.userDotPulse} />
      <View style={styles.userDotOuter}>
        <View style={styles.userDotInner} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    alignItems: 'center',
    width: 80, // 라벨 길이 고려
  },
  pin: {
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 3,
    borderColor: 'white',
    alignItems: 'center',
    justifyContent: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.25,
        shadowRadius: 8,
      },
      android: { elevation: 5 },
    }),
  },
  pinTail: {
    width: 0,
    height: 0,
    marginTop: -3,
  },
  pinTailInner: {
    width: 0,
    height: 0,
    borderLeftWidth: 7,
    borderRightWidth: 7,
    borderTopWidth: 12,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
  },
  countCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: 'white',
    alignItems: 'center',
    justifyContent: 'center',
  },
  countText: {
    fontSize: 13,
    fontWeight: '900',
    fontVariant: ['tabular-nums'],
  },
  emojiPin: { fontSize: 13 },
  labelWrap: {
    marginTop: 2,
    backgroundColor: 'rgba(26, 26, 46, 0.92)',
    paddingHorizontal: 9,
    paddingVertical: 3,
    borderRadius: 999,
    maxWidth: 80,
  },
  labelText: {
    color: 'white',
    fontSize: 10,
    fontFamily: FONTS.bold,
  },

  // User dot
  userDotWrap: {
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  userDotPulse: {
    position: 'absolute',
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: COLORS.primaryLight,
    opacity: 0.2,
  },
  userDotOuter: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'white',
    borderWidth: 3,
    borderColor: COLORS.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
      },
      android: { elevation: 4 },
    }),
  },
  userDotInner: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.primaryLight,
  },
});
