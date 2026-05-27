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
} from 'react-native';
// Android statusBar inset 처리 위해 context 버전 사용
import { SafeAreaView } from 'react-native-safe-area-context';
import { COLORS, FONTS } from '../utils/theme';
import { fetchMyPotsSorted } from '../lib/pots';
import { supabase } from '../lib/supabase';
import { CAMPUS_SPOTS } from '../data/campusData';
import { formatChatTime } from '../utils/time';
import ChatScreen from '../components/ChatScreen';
import { usePotsRealtime } from '../hooks/usePotsRealtime';

export default function ChatTabScreen({ user, profile, navigation, route }) {
  const [pots, setPots] = useState([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [activePot, setActivePot] = useState(null);

  const loadMyPots = useCallback(async () => {
    // 최근 메시지 시각 DESC 정렬 + joined_at fallback (서버 RPC가 처리)
    const data = await fetchMyPotsSorted();
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

  // Realtime — messages INSERT 시 재정렬 (새 메시지 온 방이 위로 이동)
  // RLS가 본인 가입 팟의 메시지만 broadcast하니 본인 영향 받는 INSERT만 도달
  useEffect(() => {
    if (!user) return;
    const uniqueName = `messages-chat-tab-${Math.random().toString(36).slice(2, 8)}`;
    const channel = supabase
      .channel(uniqueName)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
        },
        () => {
          loadMyPots();  // 정렬 재계산은 서버 RPC가 처리
        }
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, loadMyPots]);

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

  // 푸시 알림 Deep Link — App.js가 navigate 시 route.params.openPotId 넣어줌
  // pots에 그 팟 있으면 즉시 ChatScreen 열고 params 클리어. 없으면 pots 변경(loadMyPots 완료) 시 재실행됨.
  useEffect(() => {
    const openPotId = route?.params?.openPotId;
    if (!openPotId) return;
    const pot = pots.find((p) => p.id === openPotId);
    if (pot) {
      setActivePot(pot);
      navigation.setParams({ openPotId: undefined });
    }
  }, [route?.params?.openPotId, pots, navigation]);

  const handlePotPress = (pot) => {
    setActivePot(pot);
  };

  const renderPotCard = ({ item }) => {
    const spot = item.spot_id ? CAMPUS_SPOTS.find((s) => s.id === item.spot_id) : null;
    const locationLabel = spot ? spot.short : '직접 찍은 위치';
    const hasMessage = !!item.lastMessageText;
    const timeLabel = formatChatTime(item.lastMessageAt);

    return (
      <Pressable style={styles.card} onPress={() => handlePotPress(item)}>
        <View style={styles.cardEmojiWrap}>
          <Text style={styles.cardEmoji}>{item.emoji}</Text>
        </View>
        <View style={styles.cardBody}>
          {/* 1줄: 팟 이름 + 마지막 메시지 시각 */}
          <View style={styles.cardTopRow}>
            <Text style={styles.cardName} numberOfLines={1}>
              {item.name}
            </Text>
            {timeLabel ? (
              <Text style={styles.cardTime}>{timeLabel}</Text>
            ) : null}
          </View>

          {/* 2줄: 장소 · 참여중 */}
          <View style={styles.cardMeta}>
            <Text style={styles.cardLocation} numberOfLines={1}>📍 {locationLabel}</Text>
            <Text style={styles.cardMetaDot}>·</Text>
            <Text style={styles.cardStatus}>참여중</Text>
          </View>

          {/* 3줄: 마지막 메시지 미리보기 + 안 읽음 배지 (우측) */}
          <View style={styles.cardBottomRow}>
            <Text
              style={[styles.cardPreview, !hasMessage && styles.cardPreviewEmpty]}
              numberOfLines={1}
            >
              {hasMessage ? item.lastMessageText : '아직 메시지가 없습니다'}
            </Text>
            {item.unreadCount > 0 && (
              <View style={styles.unreadBadge}>
                <Text style={styles.unreadBadgeText}>
                  {item.unreadCount > 99 ? '99+' : item.unreadCount}
                </Text>
              </View>
            )}
          </View>
        </View>
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
    alignItems: 'flex-start',  // 3줄 카드라 위 정렬
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
    width: 48, height: 48,  // 카카오톡 프로필 느낌으로 살짝 작게 (56 → 48)
    backgroundColor: COLORS.surface2,
    borderRadius: 14,
    alignItems: 'center', justifyContent: 'center',
  },
  cardEmoji: { fontSize: 24 },
  cardBody: { flex: 1, minWidth: 0 },  // ellipsis 작동 위해 minWidth: 0 필수
  cardTopRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    gap: 8,
  },
  cardName: {
    flex: 1,  // 이름 영역이 시각 영역 외 공간 차지
    fontSize: 15,
    fontFamily: FONTS.bold,
    color: COLORS.text1,
  },
  cardTime: {
    fontSize: 11,
    color: COLORS.text3,
    fontFamily: FONTS.medium,
  },
  cardMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
  },
  cardMetaDot: {
    fontSize: 12,
    color: COLORS.text3,
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
  cardBottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 6,
  },
  cardPreview: {
    flex: 1,  // 배지가 우측 자리 잡고 나머지 차지 (ellipsis 작동)
    fontSize: 13,
    color: COLORS.text2,
    fontFamily: FONTS.medium,
  },
  cardPreviewEmpty: {
    color: COLORS.text3,
    fontStyle: 'italic',
  },
  unreadBadge: {
    minWidth: 22,
    height: 22,
    paddingHorizontal: 7,
    borderRadius: 11,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  unreadBadgeText: {
    color: 'white',
    fontSize: 11,
    fontFamily: FONTS.bold,
    // Android 폰트 위쪽 padding 제거 + 세로 중앙 정렬 (정중앙 안 맞던 문제)
    includeFontPadding: false,
    textAlignVertical: 'center',
    lineHeight: 14,
  },
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
