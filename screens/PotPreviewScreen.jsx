// screens/PotPreviewScreen.jsx — 팟 미리보기 (비멤버 진입 차단용)
// 비멤버가 모집중 팟 카드를 탭하면 이 화면이 modal로 뜸.
// "참여하기" → joinPot 성공 → onJoined 콜백 + goBack → 부모가 focus 복귀 시 ChatScreen 띄움.
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import Toast from 'react-native-toast-message';
// ※ react-native 기본 SafeAreaView는 iOS 노치만 처리하고 Android statusBar inset은 처리 안 함.
//   fullScreenModal로 띄우면 Android에서 자체 헤더가 statusBar 뒤로 숨어 "닫기" 안 보임 → context 버전 사용.
import { SafeAreaView } from 'react-native-safe-area-context';
import { COLORS, FONTS } from '../utils/theme';
import { supabase } from '../lib/supabase';
import { joinPot } from '../lib/pots';
import { CAMPUS_SPOTS } from '../data/campusData';
import { formatTimeLeft } from '../utils/time';

export default function PotPreviewScreen({ route, navigation, user, profile }) {
  const { potId, onJoined } = route?.params ?? {};
  const [pot, setPot] = useState(null);
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState(false);

  // 단일 팟 fetch
  useEffect(() => {
    if (!potId) {
      setLoading(false);
      return;
    }
    (async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from('pots')
        .select(`
          id, name, emoji, spot_id, max_members, created_by,
          description, expires_at, status,
          latitude, longitude, custom_address,
          pot_members(count)
        `)
        .eq('id', potId)
        .maybeSingle();
      setLoading(false);
      if (error || !data) {
        console.error('[PotPreview] fetch 실패:', error?.message);
        return;
      }
      setPot({
        ...data,
        current: data.pot_members?.[0]?.count ?? 0,
        max: data.max_members,
      });
    })();
  }, [potId]);

  const handleJoin = async () => {
    if (joining || !pot) return;
    setJoining(true);
    const ok = await joinPot(pot.id);
    setJoining(false);

    if (!ok) {
      // 17-d의 안전망이 막은 케이스 (마감/꽉참/race condition)
      Toast.show({
        type: 'potClosed',
        text1: '❌ 참여할 수 없어요',
        text2: '팟이 마감되었거나 인원이 가득 찼어요',
      });
      return;
    }

    // 성공 토스트 — goBack 후 부모 화면 위에 글로벌로 표시됨
    Toast.show({
      type: 'potJoined',
      text1: '🍗 팟 가입 완료!',
      text2: `'${pot.name}' 채팅방으로 이동합니다`,
    });

    // 성공 → 부모에 알림 (ref 저장) + 닫기
    // 부모(PotsScreen)는 useFocusEffect로 focus 복귀 시 ref 읽어 ChatScreen 띄움.
    onJoined?.({
      ...pot,
      current: pot.current + 1,  // 본인 가입 반영 (optimistic)
    });
    navigation.goBack();
  };

  // === 렌더 ===
  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <Header onClose={() => navigation.goBack()} />
        <View style={styles.center}>
          <ActivityIndicator color={COLORS.primary} />
        </View>
      </SafeAreaView>
    );
  }

  if (!pot) {
    return (
      <SafeAreaView style={styles.container}>
        <Header onClose={() => navigation.goBack()} />
        <View style={styles.center}>
          <Text style={styles.emptyEmoji}>😕</Text>
          <Text style={styles.emptyText}>팟을 찾을 수 없어요</Text>
          <Text style={styles.emptySub}>이미 종료되었거나 삭제됐을 수 있어요.</Text>
        </View>
      </SafeAreaView>
    );
  }

  const spot = pot.spot_id ? CAMPUS_SPOTS.find((s) => s.id === pot.spot_id) : null;
  // 임의 위치 팟이면 한글 주소 또는 좌표 fallback
  const placeLabel = spot
    ? spot.name
    : (pot.custom_address
        || (pot.latitude != null && pot.longitude != null
              ? `위도 ${Number(pot.latitude).toFixed(5)}, 경도 ${Number(pot.longitude).toFixed(5)}`
              : '위치 정보 없음'));
  const placePrefix = spot ? '📍 장소' : '📍 직접 찍은 위치';
  const timeLeft = formatTimeLeft(pot.expires_at);
  const expired = pot.expires_at && new Date(pot.expires_at) <= new Date();
  const full = pot.current >= pot.max;
  const isClosed = expired || full || pot.status === 'closed';
  const canJoin = !isClosed && !joining;

  return (
    <SafeAreaView style={styles.container}>
      <Header onClose={() => navigation.goBack()} />

      <ScrollView contentContainerStyle={styles.body}>
        {/* 이모지 + 이름 */}
        <View style={styles.emojiWrap}>
          <Text style={styles.emoji}>{pot.emoji}</Text>
        </View>
        <Text style={styles.title} numberOfLines={2}>
          {pot.name}
        </Text>

        {/* 정보 카드 */}
        <View style={styles.infoCard}>
          <InfoRow label={placePrefix} value={placeLabel} />
          <InfoRow
            label="👥 인원"
            value={`${pot.current} / ${pot.max}명`}
            highlight={full}
          />
          <InfoRow
            label="⏰ 남은 시간"
            value={isClosed ? '마감' : (timeLeft || '곧 마감')}
            highlight={isClosed}
          />
        </View>

        {/* 설명 (있을 때만) */}
        {pot.description ? (
          <View style={styles.descBox}>
            <Text style={styles.descLabel}>📝 설명</Text>
            <Text style={styles.descText}>{pot.description}</Text>
          </View>
        ) : null}

        {/* 마감된 팟이면 안내 */}
        {isClosed && (
          <View style={styles.closedNote}>
            <Text style={styles.closedNoteText}>
              이미 마감된 팟이라 새로 참여할 수 없어요.
            </Text>
          </View>
        )}
      </ScrollView>

      {/* 하단 참여 버튼 */}
      <View style={styles.footer}>
        <Pressable
          style={[styles.joinBtn, !canJoin && styles.joinBtnDisabled]}
          disabled={!canJoin}
          onPress={handleJoin}
        >
          <Text style={styles.joinBtnText}>
            {joining ? '참여 중...' : isClosed ? '참여할 수 없어요' : '참여하기'}
          </Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

// === 서브 컴포넌트 ===
function Header({ onClose }) {
  return (
    <View style={styles.header}>
      <Pressable onPress={onClose} style={styles.closeBtn} hitSlop={8}>
        <Text style={styles.closeText}>‹ 닫기</Text>
      </Pressable>
      <View style={styles.headerSpacer} />
    </View>
  );
}

function InfoRow({ label, value, highlight }) {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={[styles.infoValue, highlight && styles.infoValueHighlight]}>
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    backgroundColor: COLORS.surface,
  },
  closeBtn: { paddingHorizontal: 8, paddingVertical: 4, minWidth: 60 },
  closeText: { fontSize: 16, color: COLORS.primary, fontFamily: FONTS.medium },
  headerSpacer: { flex: 1 },

  body: { padding: 24, paddingBottom: 40 },

  emojiWrap: {
    width: 96,
    height: 96,
    borderRadius: 28,
    backgroundColor: COLORS.surface,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    marginTop: 12,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  emoji: { fontSize: 48 },
  title: {
    fontSize: 22,
    fontFamily: FONTS.display,
    color: COLORS.text1,
    textAlign: 'center',
    marginBottom: 24,
  },

  infoCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: 16,
    gap: 12,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  infoLabel: {
    fontSize: 13,
    color: COLORS.text2,
    fontFamily: FONTS.medium,
  },
  infoValue: {
    fontSize: 14,
    color: COLORS.text1,
    fontFamily: FONTS.bold,
  },
  infoValueHighlight: {
    color: COLORS.coral,
  },

  descBox: {
    marginTop: 16,
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: 16,
    gap: 6,
  },
  descLabel: {
    fontSize: 12,
    color: COLORS.text2,
    fontFamily: FONTS.medium,
  },
  descText: {
    fontSize: 14,
    color: COLORS.text1,
    fontFamily: FONTS.medium,
    lineHeight: 20,
  },

  closedNote: {
    marginTop: 16,
    backgroundColor: COLORS.coral + '15',
    borderRadius: 12,
    padding: 12,
  },
  closedNoteText: {
    fontSize: 13,
    color: COLORS.coral,
    fontFamily: FONTS.bold,
    textAlign: 'center',
  },

  footer: {
    padding: 16,
    paddingBottom: 24,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    backgroundColor: COLORS.surface,
  },
  joinBtn: {
    paddingVertical: 16,
    borderRadius: 16,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
  },
  joinBtnDisabled: {
    backgroundColor: COLORS.text3,
    opacity: 0.6,
  },
  joinBtnText: {
    color: 'white',
    fontFamily: FONTS.display,
    fontSize: 16,
  },

  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  emptyEmoji: { fontSize: 48, marginBottom: 12 },
  emptyText: { fontSize: 15, fontFamily: FONTS.bold, color: COLORS.text1 },
  emptySub: {
    fontSize: 12,
    color: COLORS.text3,
    marginTop: 6,
    textAlign: 'center',
  },
});
