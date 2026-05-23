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
} from 'react-native';
import { GiftedChat, Bubble, InputToolbar, Send } from 'react-native-gifted-chat';
import { COLORS, FONTS } from '../utils/theme';
import { fetchMessages, sendMessage } from '../lib/pots';
import { supabase } from '../lib/supabase';

export default function ChatScreen({ visible, pot, currentUser, onClose }) {
  const [messages, setMessages] = useState([]);

  // 모달 열릴 때 기존 메시지 fetch
  useEffect(() => {
    if (!visible || !pot?.id) {
      setMessages([]);
      return;
    }
    (async () => {
      const msgs = await fetchMessages(pot.id);
      setMessages(msgs);
    })();
  }, [visible, pot?.id]);

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
    }
  }, [pot?.id]);

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
              <Text style={styles.title} numberOfLines={1}>{pot.name}</Text>
              <Text style={styles.subtitle}>
                {pot.current}/{pot.max}명
              </Text>
            </View>
          </View>
          <View style={styles.backBtnPlaceholder} />
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
  title: {
    fontSize: 16,
    fontFamily: FONTS.bold,
    color: COLORS.text1,
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
