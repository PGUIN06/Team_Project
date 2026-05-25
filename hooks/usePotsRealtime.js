// hooks/usePotsRealtime.js
// pots 테이블의 변경(INSERT/UPDATE/DELETE)을 실시간 구독.
// 변경이 감지되면 onChange 콜백 호출 → 화면에서 데이터 다시 fetch.
import { useEffect } from 'react';
import { supabase } from '../lib/supabase';

/**
 * pots 테이블 변경을 실시간 구독
 * @param {() => void} onChange - 변경 감지 시 호출될 콜백 (보통 데이터 다시 fetch)
 * @param {boolean} [enabled=true] - 구독 활성화 여부 (예: 인증 끝나기 전엔 false)
 * @param {string} [channelName='pots-changes'] - 채널 이름 prefix (디버깅용)
 *   주의: Supabase의 channel(name)은 싱글톤이라 화면이 unmount→re-mount되면
 *   같은 이름으로 이미 subscribed된 인스턴스를 받아 .on() 추가가 거부됨.
 *   → 매 useEffect 실행마다 random suffix 추가해서 항상 새 채널 보장.
 */
export function usePotsRealtime(onChange, enabled = true, channelName = 'pots-changes') {
  useEffect(() => {
    if (!enabled) return;

    // mount마다 unique 채널 이름 — 같은 화면 재mount 시 충돌 방지
    const uniqueName = `${channelName}-${Math.random().toString(36).slice(2, 8)}`;

    const channel = supabase
      .channel(uniqueName)
      .on(
        'postgres_changes',
        {
          event: '*',           // INSERT, UPDATE, DELETE 다 받음
          schema: 'public',
          table: 'pots',
        },
        (payload) => {
          // 디버그용 로그 — 어떤 변경이 왔는지 확인
          console.log('[realtime:pots]', payload.eventType, payload.new?.id || payload.old?.id);
          onChange();
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',           // 멤버 가입/탈퇴 시 카운트 갱신
          schema: 'public',
          table: 'pot_members',
        },
        (payload) => {
          console.log('[realtime:pot_members]', payload.eventType, payload.new?.pot_id || payload.old?.pot_id);
          onChange();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [enabled, onChange, channelName]);
}
