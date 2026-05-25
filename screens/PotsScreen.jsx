// screens/PotsScreen.jsx — 모집중인 팟 목록 + 카테고리 필터
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useFocusEffect } from '@react-navigation/native';
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
  InteractionManager,
} from 'react-native';
import { COLORS, FONTS } from '../utils/theme';
import { fetchPotsForList, fetchMyPots } from '../lib/pots';
import { CAMPUS_SPOTS } from '../data/campusData';
import { formatPoolTimeStatus } from '../utils/time';
import ChatScreen from '../components/ChatScreen';
import Toast from '../components/Toast';
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

export default function PotsScreen({ user, profile, navigation }) {
  const [pots, setPots] = useState([]);
  const [myPotIds, setMyPotIds] = useState(new Set());  // 내 멤버십 (옵션 B)
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [activePot, setActivePot] = useState(null);
  const [toast, setToast] = useState(null);

  // PotPreview 콜백이 frozen 상태에서도 안전하게 데이터 전달하는 통로
  // (setState는 frozen에서 commit 안 될 수 있어서 ref + useFocusEffect 패턴 사용)
  const pendingChatPotRef = useRef(null);

  const showToast = (msg) => setToast({ msg, key: Date.now() });

  // PotPreview 닫고 PotsScreen으로 focus 복귀 시 ref 처리
  // iOS: modal dismiss animation(~300ms)이 끝나기 전에 setActivePot 하면
  //      PotPreview modal 위에 ChatScreen modal이 못 그려짐 → InteractionManager로 대기
  // Android: 거의 즉시 처리되지만 동일 코드 — 일관 동작
  useFocusEffect(
    useCallback(() => {
      if (!pendingChatPotRef.current) return;
      const pot = pendingChatPotRef.current;
      pendingChatPotRef.current = null;
      InteractionManager.runAfterInteractions(() => {
        setActivePot(pot);
      });
    }, [])
  );

  // 데이터 로드 — 전체 팟 + 내 멤버십 (병렬)
  const loadPots = useCallback(async () => {
    const data = await fetchPotsForList();
    setPots(data);
  }, []);

  const loadMyPotIds = useCallback(async () => {
    const mine = await fetchMyPots();
    setMyPotIds(new Set(mine.map((p) => p.id)));
  }, []);

  // Realtime + polling은 둘 다 같이 갱신해야 함
  const refresh = useCallback(async () => {
    await Promise.all([loadPots(), loadMyPotIds()]);
  }, [loadPots, loadMyPotIds]);

  useEffect(() => {
    if (!user) return;
    (async () => {
      setLoading(true);
      await refresh();
      setLoading(false);
    })();
  }, [user, refresh]);

  // Realtime — pots/pot_members 변경 시 자동 갱신
  usePotsRealtime(refresh, !!user, 'pots-list');

  // 1분마다 자동 갱신 (시간 만료/곧 만료 상태 반영)
  useEffect(() => {
    if (!user) return;
    const interval = setInterval(() => {
      refresh();
    }, 60 * 1000);
    return () => clearInterval(interval);
  }, [user, refresh]);

  // Pull to refresh
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refresh();
    setRefreshing(false);
  }, [refresh]);

  // 카테고리 필터링
  const filteredPots = pots.filter((pot) => {
    if (selectedCategory === 'all') return true;
    const cat = CATEGORIES.find((c) => c.id === selectedCategory);
    if (!cat || !cat.emojis) return true;
    return cat.emojis.includes(pot.emoji);
  });

  // 팟 카드 누름 → 멤버십/마감 여부에 따라 분기
  const handlePotPress = (pot) => {
    const isMember = myPotIds.has(pot.id);

    // 1) 멤버 → 채팅방 바로 진입 (모집중/마감 무관)
    if (isMember) {
      setActivePot(pot);
      return;
    }

    // 2) 비멤버 + 마감 → 토스트만
    if (pot.isClosed) {
      showToast('마감된 팟이에요');
      return;
    }

    // 3) 비멤버 + 모집중 → 미리보기 화면
    // 참여 성공 시 onJoined 콜백이 ref에 저장 → focus 복귀 시 useFocusEffect가 ChatScreen 띄움
    navigation.navigate('PotPreview', {
      potId: pot.id,
      onJoined: (joinedPot) => {
        pendingChatPotRef.current = joinedPot;
        // myPotIds 즉시 갱신 (Realtime이 곧 따라잡지만 즉시 반응성 위함)
        setMyPotIds((prev) => new Set([...prev, joinedPot.id]));
      },
    });
  };

  const renderPotCard = ({ item }) => {
    const spot = item.spotId ? CAMPUS_SPOTS.find((s) => s.id === item.spotId) : null;
    const locationLabel = spot ? spot.name : '직접 찍은 위치';
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
          <Text style={styles.cardLocation} numberOfLines={1}>📍 {locationLabel}</Text>
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

      {/* Chat — 닫으면 채팅 탭으로 이동 (요구사항: 어디서 열리든 닫기는 채팅 탭으로) */}
      <ChatScreen
        visible={!!activePot}
        pot={activePot}
        currentUser={user && profile ? { id: user.id, nickname: profile.nickname } : null}
        onClose={() => {
          setActivePot(null);
          navigation.navigate('Tabs', { screen: 'Chat' });
        }}
      />

      {/* Toast */}
      {toast && (
        <Toast
          key={toast.key}
          message={toast.msg}
          onDismiss={() => setToast(null)}
        />
      )}
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
