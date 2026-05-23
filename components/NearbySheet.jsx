import React, { useRef, useEffect } from 'react';
import {
  View,
  Text,
  Pressable,
  ScrollView,
  StyleSheet,
  Animated,
  Dimensions,
  Platform,
} from 'react-native';
import { COLORS, FONTS } from '../utils/theme';
import { CAMPUS_SPOTS } from '../data/campusData';
import { calcDistanceMeters, formatDistance, formatWalk } from '../utils/distance';
import { formatPoolTimeStatus } from '../utils/time';

const { height: SCREEN_H } = Dimensions.get('window');
const COLLAPSED_H = 200;
const EXPANDED_H = SCREEN_H * 0.6;

export default function NearbySheet({ expanded, onToggle, userLocation, pools, onSpotPress }) {
  const heightAnim = useRef(new Animated.Value(COLLAPSED_H)).current;

  useEffect(() => {
    Animated.timing(heightAnim, {
      toValue: expanded ? EXPANDED_H : COLLAPSED_H,
      duration: 350,
      useNativeDriver: false,
    }).start();
  }, [expanded]);

  // 거리순 정렬
  const sortedPools = (pools || [])
    .map((p) => {
      const spot = CAMPUS_SPOTS.find((s) => s.id === p.spotId);
      return { ...p, spot, dist: calcDistanceMeters(userLocation, spot) };
    })
    .filter((p) => p.spot) // 좌표 못 찾은 팟은 제외 (커스텀 핀 등)
    .sort((a, b) => a.dist - b.dist);

  return (
    <Animated.View style={[styles.sheet, { height: heightAnim }]}>
      <Pressable onPress={onToggle}>
        <View style={styles.handle} />
        <View style={styles.header}>
          <View>
            <View style={styles.titleRow}>
              <Text style={styles.titleIcon}>✨</Text>
              <Text style={styles.titleMain}>내 주변 인기 팟</Text>
            </View>
            <Text style={styles.titleSub}>
              현재 위치 기준 · 활성 {sortedPools.length}개
            </Text>
          </View>
          <View style={styles.toggle}>
            <Text style={styles.toggleArrow}>{expanded ? '▼' : '▲'}</Text>
          </View>
        </View>
      </Pressable>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={styles.content}
        horizontal={!expanded}
        showsHorizontalScrollIndicator={false}
        showsVerticalScrollIndicator={false}
      >
        {expanded
          ? sortedPools.map((p) => (
              <PoolRow key={p.id} pool={p} onPress={() => onSpotPress(p.spot)} />
            ))
          : sortedPools.slice(0, 6).map((p) => (
              <PoolCard key={p.id} pool={p} onPress={() => onSpotPress(p.spot)} />
            ))}
      </ScrollView>
    </Animated.View>
  );
}

function PoolRow({ pool, onPress }) {
  return (
    <Pressable style={styles.poolRow} onPress={onPress}>
      <View style={styles.poolEmojiWrap}>
        <Text style={styles.poolEmoji}>{pool.emoji}</Text>
      </View>
      <View style={styles.poolInfo}>
        <Text style={styles.poolName} numberOfLines={1}>{pool.name}</Text>
        <Text style={styles.poolMeta}>
          📍 {pool.spot.short} ·{' '}
          <Text style={styles.poolDistance}>
            {formatDistance(pool.dist)} · {formatWalk(pool.dist)}
          </Text>
        </Text>
        <View style={styles.poolStats}>
          <Text style={styles.poolCount}>
            {pool.current}/{pool.max}명
          </Text>
          <Text
            style={[
              styles.poolTime,
              pool.status === 'ordered' ? styles.poolTimeActive : styles.poolTimeUrgent,
            ]}
          >
            {formatPoolTimeStatus(pool)}
          </Text>
        </View>
      </View>
    </Pressable>
  );
}

function PoolCard({ pool, onPress }) {
  return (
    <Pressable style={styles.poolCard} onPress={onPress}>
      <View style={styles.poolCardTop}>
        <Text style={styles.poolCardEmoji}>{pool.emoji}</Text>
        <View style={styles.poolCardDistBadge}>
          <Text style={styles.poolCardDistText}>
            {formatDistance(pool.dist)}
          </Text>
        </View>
      </View>
      <Text style={styles.poolCardName} numberOfLines={1}>{pool.name}</Text>
      <Text style={styles.poolCardSpot}>📍 {pool.spot.short}</Text>
      <View style={styles.poolCardBottom}>
        <Text style={styles.poolCount}>{pool.current}/{pool.max}</Text>
        <Text
          style={[
            styles.poolTime,
            pool.status === 'ordered' ? styles.poolTimeActive : styles.poolTimeUrgent,
          ]}
        >
          {formatPoolTimeStatus(pool)}
        </Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  sheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 7,
    backgroundColor: COLORS.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -8 },
        shadowOpacity: 0.12,
        shadowRadius: 32,
      },
      android: { elevation: 12 },
    }),
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
  header: {
    paddingHorizontal: 20,
    paddingTop: 4,
    paddingBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  titleIcon: { fontSize: 14 },
  titleMain: { fontFamily: FONTS.display, fontSize: 16, color: COLORS.text1 },
  titleSub: { fontSize: 10, color: COLORS.text3, marginTop: 2, fontFamily: FONTS.medium },
  toggle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.surface2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  toggleArrow: { fontSize: 10, color: COLORS.text2 },
  content: { paddingHorizontal: 20, paddingBottom: 24 },

  // Pool row
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
  poolInfo: { flex: 1, minWidth: 0 },
  poolName: { fontSize: 13, fontFamily: FONTS.bold, color: COLORS.text1 },
  poolMeta: { fontSize: 11, color: COLORS.text3, marginTop: 2, fontFamily: FONTS.medium },
  poolDistance: { fontFamily: FONTS.bold, color: COLORS.primary },
  poolStats: { flexDirection: 'row', gap: 8, marginTop: 4 },
  poolCount: { fontSize: 11, fontFamily: FONTS.bold, color: COLORS.primary },
  poolTime: { fontSize: 11, fontFamily: FONTS.bold },
  poolTimeUrgent: { color: COLORS.coral },
  poolTimeActive: { color: COLORS.success },

  // Pool card (horizontal)
  poolCard: {
    width: 180,
    padding: 12,
    backgroundColor: COLORS.surface2,
    borderRadius: 16,
    marginRight: 8,
  },
  poolCardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  poolCardEmoji: { fontSize: 22 },
  poolCardDistBadge: {
    backgroundColor: COLORS.primary50,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  poolCardDistText: { fontSize: 10, fontFamily: FONTS.bold, color: COLORS.primary },
  poolCardName: { fontSize: 12, fontFamily: FONTS.bold, marginTop: 4, color: COLORS.text1 },
  poolCardSpot: { fontSize: 10, color: COLORS.text3, marginTop: 2, fontFamily: FONTS.medium },
  poolCardBottom: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 6,
  },
});
