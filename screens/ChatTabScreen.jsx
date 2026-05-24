// screens/ChatTabScreen.jsx — 내가 속한 팟 목록 (채팅 탭)
import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  FlatList,
  RefreshControl,
  ActivityIndicator,
  SafeAreaView,
} from 'react-native';
import { COLORS, FONTS } from '../utils/theme';
import { fetchMyPots } from '../lib/pots';
import { CAMPUS_SPOTS } from '../data/campusData';
import ChatScreen from '../components/ChatScreen';
import { usePotsRealtime } from '../hooks/usePotsRealtime';

export default function ChatTabScreen({ user, profile }) {
  const [pots, setPots] = useState([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [activePot, setActivePot] = useState(null);

  const loadMyPots = useCallback(async () => {
    const data = await fetchMyPots();
    setPots(data);
  }, []);

  useEffect(() => {
    if (!user) return;
    (async () => {
      setLoading(true);
      await loadMyPots();
      setLoading(false);
    })();
  }, [user, loadMyPots]);

  // Realtime — pots 테이블 변경 시 목록 자동 갱신
  usePotsRealtime(loadMyPots, !!user, 'pots-chat');

  // 1분마다 자동 갱신 (시간 만료/곧 만료 상태 반영)
  useEffect(() => {
    if (!user) return;
    const interval = setInterval(() => {
      loadMyPots();
    }, 60 * 1000);
    return () => clearInterval(interval);
  }, [user, loadMyPots]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadMyPots();
    setRefreshing(false);
  }, [loadMyPots]);

  const handlePotPress = (pot) => {
    setActivePot(pot);
  };

  const renderPotCard = ({ item }) => {
    const spot = CAMPUS_SPOTS.find((s) => s.id === item.spot_id);
    return (
      <Pressable style={styles.card} onPress={() => handlePotPress(item)}>
        <View style={styles.cardEmojiWrap}>
          <Text style={styles.cardEmoji}>{item.emoji}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.cardName} numberOfLines={1}>
            {item.name}
          </Text>
          <View style={styles.cardMeta}>
            {spot && (
              <Text style={styles.cardLocation}>📍 {spot.short}</Text>
            )}
            <Text style={styles.cardStatus}>참여중</Text>
          </View>
        </View>
        <Text style={styles.cardArrow}>›</Text>
      </Pressable>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>채팅</Text>
        <Text style={styles.subtitle}>참여 중인 팟 {pots.length}개</Text>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={COLORS.primary} />
        </View>
      ) : pots.length === 0 ? (
        <View style={styles.center}>
          <Text style={styles.emptyEmoji}>💬</Text>
          <Text style={styles.emptyText}>아직 참여 중인 팟이 없어요</Text>
          <Text style={styles.emptySub}>
            지도나 팟 탭에서 가입해보세요!
          </Text>
        </View>
      ) : (
        <FlatList
          data={pots}
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
  container: { flex: 1, backgroundColor: COLORS.bg },
  header: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 12,
  },
  title: { fontSize: 28, fontFamily: FONTS.display, color: COLORS.text1 },
  subtitle: {
    fontSize: 13,
    color: COLORS.text3,
    fontFamily: FONTS.medium,
    marginTop: 4,
  },
  listContent: { padding: 16, paddingBottom: 80 },
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
  cardEmojiWrap: {
    width: 56, height: 56,
    backgroundColor: COLORS.surface2,
    borderRadius: 16,
    alignItems: 'center', justifyContent: 'center',
  },
  cardEmoji: { fontSize: 28 },
  cardName: { fontSize: 15, fontFamily: FONTS.bold, color: COLORS.text1 },
  cardMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 6,
  },
  cardLocation: {
    fontSize: 12,
    color: COLORS.text2,
    fontFamily: FONTS.medium,
  },
  cardStatus: {
    fontSize: 12,
    fontFamily: FONTS.bold,
    color: COLORS.primary,
  },
  cardArrow: { fontSize: 24, color: COLORS.text3 },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
  },
  emptyEmoji: { fontSize: 48, marginBottom: 16 },
  emptyText: { fontSize: 15, fontFamily: FONTS.bold, color: COLORS.text1 },
  emptySub: {
    fontSize: 12,
    color: COLORS.text3,
    marginTop: 6,
    textAlign: 'center',
  },
});
