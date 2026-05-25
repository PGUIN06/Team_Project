import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  Modal,
  SafeAreaView,
  Platform,
  KeyboardAvoidingView,
  Alert,
} from 'react-native';
import { GiftedChat, Bubble, InputToolbar, Send } from 'react-native-gifted-chat';
import { COLORS, FONTS } from '../utils/theme';
import { fetchMessages, sendMessage, closePot, leavePot, markAsRead } from '../lib/pots';
import { supabase } from '../lib/supabase';

export default function ChatScreen({ visible, pot, currentUser, onClose }) {
  const [messages, setMessages] = useState([]);
  // 헤더 멤버 수 — pot.current는 진입 시점 stale일 수 있어 자체 관리 + realtime 갱신
  const [memberCount, setMemberCount] = useState(pot?.current ?? 0);

  // 모달 열릴 때 기존 메시지 fetch + 진입 즉시 읽음 처리
  useEffect(() => {
    if (!visible || !pot?.id) {
      setMessages([]);
      return;
    }
    (async () => {
      const msgs = await fetchMessages(pot.id);
      setMessages(msgs);
      // 진입 시점부터 last_read_at 갱신 (안 읽음 배지 즉시 0으로)
      markAsRead(pot.id);
    })();
  }, [visible, pot?.id]);

  // 방장이 팟 종료 시 모두에게 Alert + 채팅방 닫기 (방장 본인도 동일하게 처리)
  // pots UPDATE 실시간 구독 — status='closed' 감지 시 발화
  useEffect(() => {
    if (!visible || !pot?.id) return;

    const uniqueName = `pot-status-${pot.id}-${Math.random().toString(36).slice(2, 8)}`;
    const channel = supabase
      .channel(uniqueName)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'pots',
          filter: `id=eq.${pot.id}`,
        },
        (payload) => {
          if (payload.new?.status === 'closed') {
            Alert.alert(
              '팟 종료',
              '방장이 팟을 종료했습니다.',
              [{ text: '확인', onPress: () => onClose() }],
              { cancelable: false }
            );
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [visible, pot?.id, onClose]);

  // 멤버 수 — 진입 시 정확한 값으로 fetch + pot_members 변경 실시간 구독
  useEffect(() => {
    if (!visible || !pot?.id) return;

    // pot prop 변경 시 일단 prop 값으로 초기화 (stale일 수 있음)
    setMemberCount(pot.current ?? 0);

    let active = true;
    const fetchCount = async () => {
      const { count, error } = await supabase
        .from('pot_members')
        .select('*', { count: 'exact', head: true })
        .eq('pot_id', pot.id);
      if (!active) return;
      if (!error && count != null) setMemberCount(count);
    };

    // 진입 즉시 정확한 카운트
    fetchCount();

    // pot_members 변경 실시간 구독 — 다른 사람 join/leave 즉시 반영
    const uniqueName = `pot-members-${pot.id}-${Math.random().toString(36).slice(2, 8)}`;
    const channel = supabase
      .channel(uniqueName)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'pot_members',
          filter: `pot_id=eq.${pot.id}`,
        },
        () => {
          fetchCount();
        }
      )
      .subscribe();

    return () => {
      active = false;
      supabase.removeChannel(channel);
    };
  }, [visible, pot?.id, pot?.current]);

  // Realtime 구독 — 다른 사람 메시지 실시간 수신
  useEffect(() => {
    if (!visible || !pot?.id || !currentUser?.id) return;

    const channel = supabase
      .channel(`pot:${pot.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `pot_id=eq.${pot.id}`,
        },
        async (payload) => {
          // 본인이 보낸 메시지는 이미 낙관적 업데이트로 화면에 있음 → 무시
          if (payload.new.user_id === currentUser.id) return;

          // 채팅방 보고 있으니 즉시 읽음 처리 (안 읽음 배지 안 쌓이게)
          markAsRead(pot.id);

          // 닉네임 조회 (Realtime payload엔 join 결과 안 들어옴)
          const { data: profile } = await supabase
            .from('profiles')
            .select('nickname')
            .eq('id', payload.new.user_id)
            .single();

          const newMsg = {
            _id: payload.new.id,
            text: payload.new.content,
            createdAt: new Date(payload.new.created_at),
            user: {
              _id: payload.new.user_id,
              name: profile?.nickname || '익명',
            },
          };

          setMessages((prev) => GiftedChat.append(prev, [newMsg]));
        }
      )
      .subscribe();

    // 정리: 모달 닫을 때 구독 해제
    return () => {
      supabase.removeChannel(channel);
    };
  }, [visible, pot?.id, currentUser?.id]);

  // 메시지 전송 — 낙관적 업데이트 + Supabase INSERT + 실패 시 롤백
  const onSend = useCallback(async (newMessages = []) => {
    if (!pot?.id) return;
    const msg = newMessages[0];
    if (!msg?.text?.trim()) return;

    // 1) 낙관적 업데이트 (UI 즉시 반영)
    setMessages((prev) => GiftedChat.append(prev, newMessages));

    // 2) Supabase에 INSERT
    const saved = await sendMessage(pot.id, msg.text.trim());

    // 3) 실패 시 롤백
    if (!saved) {
      setMessages((prev) => prev.filter((m) => m._id !== msg._id));
      console.warn('[chat] 메시지 전송 실패 (네트워크?)');
      return;
    }

    // 4) 본인 메시지도 읽음 처리 (RPC는 본인 메시지 제외하지만 안전망 + 다른 디바이스 본인 채팅 탭 동기화)
    markAsRead(pot.id);
  }, [pot?.id]);

  // 팟 종료 (방장만) — 성공 시 pots UPDATE 구독이 방장 본인 포함 모두에게 Alert + 닫기 처리
  const handleClose = () => {
    Alert.alert(
      '팟 종료',
      '정말 이 팟을 종료하시겠어요?\n종료 후에는 채팅방이 사라집니다.',
      [
        { text: '취소', style: 'cancel' },
        {
          text: '종료',
          style: 'destructive',
          onPress: async () => {
            const ok = await closePot(pot.id);
            if (!ok) {
              Alert.alert('오류', '종료에 실패했어요. 잠시 후 다시 시도해주세요.');
            }
            // 성공 시 onClose 직접 호출 안 함 — UPDATE 구독이 "방장이 팟을 종료했습니다" Alert로 통합 처리
          },
        },
      ]
    );
  };

  // 팟에서 나가기 (일반 멤버용)
  const handleLeave = () => {
    Alert.alert(
      '팟에서 나가기',
      '이 팟에서 나가시겠습니까?\n다시 가입할 수 있어요.',
      [
        { text: '취소', style: 'cancel' },
        {
          text: '나가기',
          style: 'destructive',
          onPress: async () => {
            const ok = await leavePot(pot.id);
            if (ok) {
              onClose();  // 채팅방 모달 닫기 → 부모가 채팅 탭으로 navigate
            } else {
              Alert.alert('오류', '나가기에 실패했어요. 잠시 후 다시 시도해주세요.');
            }
          },
        },
      ]
    );
  };

  // 방장 여부 판단 (DB 원본 created_by + 클라 변환된 createdBy 둘 다 대응)
  const isOwner =
    !!currentUser?.id &&
    (pot?.createdBy === currentUser.id || pot?.created_by === currentUser.id);

  // 마감 여부 — 자체 계산 (prop의 pot.isClosed는 진입 시점 snapshot이라 stale)
  // memberCount는 realtime 구독 중이라 멤버 나가서 부활하면 즉시 반영됨
  // expired는 시간 기반이라 ChatScreen 안에서도 계속 마감 유지
  const expired = pot?.expires_at && new Date(pot.expires_at) <= new Date();
  const full = memberCount >= (pot?.max ?? Infinity);
  const closedByOwner = pot?.status === 'closed';
  const isClosedNow = expired || full || closedByOwner;

  if (!pot) return null;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      onRequestClose={onClose}
      presentationStyle="pageSheet"
    >
      <SafeAreaView style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <Pressable onPress={onClose} style={styles.backBtn}>
            <Text style={styles.backText}>‹ 닫기</Text>
          </Pressable>
          <View style={styles.titleWrap}>
            <Text style={styles.emoji}>{pot.emoji}</Text>
            <View style={{ flex: 1 }}>
              <View style={styles.nameRow}>
                <Text style={styles.title} numberOfLines={1}>{pot.name}</Text>
                {isClosedNow && (
                  <View style={styles.closedBadge}>
                    <Text style={styles.closedBadgeText}>마감</Text>
                  </View>
                )}
              </View>
              <Text style={styles.subtitle}>
                {memberCount}/{pot.max}명
              </Text>
            </View>
          </View>
          {/* ⋯ 메뉴 — 방장은 "팟 종료", 일반 멤버는 "나가기" */}
          <Pressable
            onPress={isOwner ? handleClose : handleLeave}
            style={styles.menuBtn}
          >
            <Text style={styles.menuText}>⋯</Text>
          </Pressable>
        </View>

        {/* Chat */}
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
        >
          <GiftedChat
            messages={messages}
            onSend={(msgs) => onSend(msgs)}
            user={{
              _id: currentUser?.id || 'anonymous',
              name: currentUser?.nickname || '나',
            }}
            placeholder="메시지를 입력하세요..."
            locale="ko"
            renderAvatar={null}
            showUserAvatar={false}
            alwaysShowSend
            renderBubble={(props) => (
              <Bubble
                {...props}
                wrapperStyle={{
                  right: { backgroundColor: COLORS.primary },
                  left: { backgroundColor: COLORS.surface2 },
                }}
                textStyle={{
                  right: { color: 'white' },
                  left: { color: COLORS.text1 },
                }}
              />
            )}
            renderInputToolbar={(props) => (
              <InputToolbar
                {...props}
                containerStyle={styles.inputToolbar}
                primaryStyle={{ alignItems: 'center' }}
              />
            )}
            renderSend={(props) => (
              <Send {...props} containerStyle={styles.sendContainer}>
                <Text style={styles.sendText}>전송</Text>
              </Send>
            )}
          />
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.surface,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    backgroundColor: COLORS.surface,
  },
  backBtn: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    minWidth: 60,
  },
  backBtnPlaceholder: {
    minWidth: 60,
  },
  menuBtn: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    minWidth: 60,
    alignItems: 'flex-end',
  },
  menuText: {
    fontSize: 24,
    color: COLORS.text2,
    fontWeight: 'bold',
  },
  backText: {
    fontSize: 16,
    color: COLORS.primary,
    fontFamily: FONTS.medium,
  },
  titleWrap: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 8,
  },
  emoji: { fontSize: 24 },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  title: {
    fontSize: 16,
    fontFamily: FONTS.bold,
    color: COLORS.text1,
  },
  closedBadge: {
    backgroundColor: COLORS.coral + '20',  // 코랄 + 알파 (~12%)
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  closedBadgeText: {
    fontSize: 10,
    fontFamily: FONTS.bold,
    color: COLORS.coral,
  },
  subtitle: {
    fontSize: 11,
    color: COLORS.text2,
    fontFamily: FONTS.medium,
    marginTop: 2,
  },
  inputToolbar: {
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    backgroundColor: COLORS.surface,
    paddingVertical: 4,
  },
  sendContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  sendText: {
    color: COLORS.primary,
    fontSize: 14,
    fontFamily: FONTS.bold,
  },
});
