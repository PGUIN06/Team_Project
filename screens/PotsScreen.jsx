// screens/PotsScreen.jsx — 모집중인 팟 목록 + 카테고리 필터
import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  Pressable,
  ScrollView,
  StyleSheet,
  FlatList,
  RefreshControl,
  ActivityIndicator,
  SafeAreaView,
} from 'react-native';
import { COLORS, FONTS } from '../utils/theme';
import { fetchPotsForList, joinPot } from '../lib/pots';
import { CAMPUS_SPOTS } from '../data/campusData';
import { formatPoolTimeStatus } from '../utils/time';
import ChatScreen from '../components/ChatScreen';
import { usePotsRealtime } from '../hooks/usePotsRealtime';

// 카테고리 정의 (emoji 기반 매핑)
const CATEGORIES = [
  { id: 'all', label: '전체', emojis: null },
  { id: 'chicken', label: '치킨', emojis: ['🍗'] },
  { id: 'snack', label: '분식', emojis: ['🌶️', '🥘', '🍜'] },
  { id: 'korean', label: '한식', emojis: ['🍙', '🍱'] },
  { id: 'burger', label: '햄버거', emojis: ['🍔'] },
  { id: 'pizza', label: '피자', emojis: ['🍕'] },
  { id: 'porridge', label: '죽', emojis: ['🍲'] },
  { id: 'etc', label: '기타', emojis: ['☕', '🧁', '🥩'] },
];

export default function PotsScreen({ user, profile }) {
  const [pots, setPots] = useState([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [activePot, setActivePot] = useState(null);

  // 데이터 로드
  const loadPots = useCallback(async () => {
    const data = await fetchPotsForList();
    setPots(data);
  }, []);

  useEffect(() => {
    if (!user) return;
    (async () => {
      setLoading(true);
      await loadPots();
      setLoading(false);
    })();
  }, [user, loadPots]);

  // Realtime — pots 변경 시 목록 자동 갱신
  usePotsRealtime(loadPots, !!user, 'pots-list');

  // 1분마다 자동 갱신 (시간 만료/곧 만료 상태 반영)
  useEffect(() => {
    if (!user) return;
    const interval = setInterval(() => {
      loadPots();
    }, 60 * 1000);
    return () => clearInterval(interval);
  }, [user, loadPots]);

  // Pull to refresh
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadPots();
    setRefreshing(false);
  }, [loadPots]);

  // 카테고리 필터링
  const filteredPots = pots.filter((pot) => {
    if (selectedCategory === 'all') return true;
    const cat = CATEGORIES.find((c) => c.id === selectedCategory);
    if (!cat || !cat.emojis) return true;
    return cat.emojis.includes(pot.emoji);
  });

  // 팟 카드 누름 → (마감 아니면 가입 후) 채팅방
  const handlePotPress = async (pot) => {
    // 마감된 팟은 가입 시도 없이 바로 채팅방 (이미 멤버라면 입장, 아니면 ChatScreen 헤더만 보임)
    if (pot.isClosed) {
      setActivePot(pot);
      return;
    }
    const ok = await joinPot(pot.id);
    if (!ok) return;
    setActivePot(pot);
  };

  const renderPotCard = ({ item }) => {
    const spot = CAMPUS_SPOTS.find((s) => s.id === item.spotId);
    const statusLabel = formatPoolTimeStatus(item);

    return (
      <Pressable
        style={[styles.card, item.isClosed && styles.cardClosed]}
        onPress={() => handlePotPress(item)}
      >
        <View style={styles.cardEmojiWrap}>
          <Text style={styles.cardEmoji}>{item.emoji}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.cardName} numberOfLines={1}>
            {item.name}
          </Text>
          {spot && (
            <Text style={styles.cardLocation}>📍 {spot.name}</Text>
          )}
          <View style={styles.cardMeta}>
            <Text style={styles.cardCount}>
              {item.current}/{item.max}명
            </Text>
            <Text style={styles.cardDot}>·</Text>
            <Text
              style={[
                styles.cardStatus,
                item.isClosed
                  ? styles.statusClosed
                  : item.status === 'ordered'
                  ? styles.statusOrdered
                  : styles.statusOpen,
              ]}
            >
              {item.isClosed ? '마감' : (statusLabel || '모집중')}
            </Text>
          </View>
        </View>
        <Text style={styles.cardArrow}>›</Text>
      </Pressable>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>모집중인 팟</Text>
        <Text style={styles.subtitle}>전체 {filteredPots.length}개</Text>
      </View>

      {/* Category filter */}
      <View style={styles.filterWrap}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterContent}
        >
          {CATEGORIES.map((cat) => {
            const active = selectedCategory === cat.id;
            return (
              <Pressable
                key={cat.id}
                style={[styles.chip, active && styles.chipActive]}
                onPress={() => setSelectedCategory(cat.id)}
              >
                <Text style={[styles.chipText, active && styles.chipTextActive]}>
                  {cat.label}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      {/* List */}
      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={COLORS.primary} />
        </View>
      ) : filteredPots.length === 0 ? (
        <View style={styles.center}>
          <Text style={styles.emptyEmoji}>🍽️</Text>
          <Text style={styles.emptyText}>
            {selectedCategory === 'all'
              ? '아직 활성 팟이 없어요'
              : '이 카테고리에 활성 팟이 없어요'}
          </Text>
          <Text style={styles.emptySub}>
            지도에서 스팟을 눌러 첫 팟을 만들어보세요!
          </Text>
        </View>
      ) : (
        <FlatList
          data={filteredPots}
          renderItem={renderPotCard}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={COLORS.primary}
            />
          }
        />
      )}

      {/* Chat */}
      <ChatScreen
        visible={!!activePot}
        pot={activePot}
        currentUser={user && profile ? { id: user.id, nickname: profile.nickname } : null}
        onClose={() => setActivePot(null)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 8,
  },
  title: {
    fontSize: 28,
    fontFamily: FONTS.display,
    color: COLORS.text1,
  },
  subtitle: {
    fontSize: 13,
    color: COLORS.text3,
    fontFamily: FONTS.medium,
    marginTop: 4,
  },
  filterWrap: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  filterContent: {
    paddingHorizontal: 20,
    gap: 8,
  },
  chip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  chipActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  chipText: {
    fontSize: 13,
    fontFamily: FONTS.bold,
    color: COLORS.text2,
  },
  chipTextActive: {
    color: 'white',
  },
  listContent: {
    padding: 16,
    paddingBottom: 80,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  cardClosed: {
    opacity: 0.6,
  },
  cardEmojiWrap: {
    width: 56,
    height: 56,
    backgroundColor: COLORS.surface2,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardEmoji: { fontSize: 28 },
  cardName: {
    fontSize: 15,
    fontFamily: FONTS.bold,
    color: COLORS.text1,
  },
  cardLocation: {
    fontSize: 12,
    color: COLORS.text2,
    fontFamily: FONTS.medium,
    marginTop: 4,
  },
  cardMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 6,
  },
  cardCount: {
    fontSize: 12,
    fontFamily: FONTS.bold,
    color: COLORS.primary,
  },
  cardDot: {
    fontSize: 12,
    color: COLORS.text3,
  },
  cardStatus: {
    fontSize: 12,
    fontFamily: FONTS.bold,
  },
  statusOpen: { color: COLORS.coral },
  statusOrdered: { color: COLORS.success },
  statusFull: { color: COLORS.text3 },
  statusClosed: { color: COLORS.coral },
  cardArrow: {
    fontSize: 24,
    color: COLORS.text3,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
  },
  emptyEmoji: { fontSize: 48, marginBottom: 16 },
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
  },
});
