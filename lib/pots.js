// lib/pots.js — 팟 관련 Supabase 헬퍼
import { supabase } from './supabase';

/**
 * 특정 스팟의 활성 팟 목록 가져오기
 * SpotModal의 활성 팟 리스트 렌더링용.
 * @param {string} spotId - 'gate', 'bookstore' 등 campusData.js의 스팟 id
 * @returns {Promise<Array>} 팟 배열 (멤버 수 포함)
 */
export async function fetchPotsBySpot(spotId) {
  const { data, error } = await supabase
    .from('pots')
    .select(`
      id, name, emoji, status, max_members,
      created_by, created_at, expires_at,
      latitude, longitude, custom_address,
      pot_members (user_id)
    `)
    .eq('spot_id', spotId)
    .neq('status', 'closed')
    .gt('expires_at', new Date().toISOString())
    .order('created_at', { ascending: false });

  if (error) {
    console.error('[pots] fetchPotsBySpot 실패:', error.message);
    return [];
  }

  // UI 친화적 형태로 변환 (기존 더미 ACTIVE_POOLS 모양과 비슷하게)
  return data
    .map((p) => ({
      id: p.id,
      spotId: spotId,
      name: p.name,
      emoji: p.emoji,
      status: p.status,
      current: p.pot_members?.length ?? 0,
      max: p.max_members,
      expiresAt: p.expires_at,
      createdBy: p.created_by,
      latitude: p.latitude,
      longitude: p.longitude,
      customAddress: p.custom_address,
    }))
    .filter((p) => p.current < p.max);  // 꽉 차면 자동 마감
}

/**
 * 모든 스팟의 활성 팟 개수 (지도 마커 카운트용)
 * @returns {Promise<Object>} { gate: 2, bookstore: 0, ... }
 */
export async function fetchPotCounts() {
  const { data, error } = await supabase
    .from('pots')
    .select('spot_id, max_members, pot_members(user_id)')
    .neq('status', 'closed')
    .gt('expires_at', new Date().toISOString())
    .not('spot_id', 'is', null);

  if (error) {
    console.error('[pots] fetchPotCounts 실패:', error.message);
    return {};
  }

  // spot_id별로 카운트 집계 (꽉 찬 팟은 제외)
  const counts = {};
  data.forEach((p) => {
    const current = p.pot_members?.length ?? 0;
    if (current >= p.max_members) return;  // 꽉 차면 자동 마감
    counts[p.spot_id] = (counts[p.spot_id] || 0) + 1;
  });
  return counts;
}

/**
 * 새 팟 만들기 + 만든 사람을 자동으로 첫 멤버로 가입
 * 위치 정보 분기: spotId(캠퍼스 스팟) OR latitude+longitude(임의 위치) 중 하나 필수.
 * DB CHECK constraint(pots_location_required)와 짝.
 * @param {Object} params
 * @param {string} params.name
 * @param {string} params.emoji
 * @param {string} [params.spotId] - 캠퍼스 스팟 id ('gate' 등)
 * @param {number} [params.latitude] - 임의 위치 위도
 * @param {number} [params.longitude] - 임의 위치 경도
 * @param {string} [params.customAddress] - 카카오 REST 변환 한글 주소
 * @param {number} params.maxMembers
 * @param {number} [params.durationMinutes=30]
 * @param {string} [params.description]
 * @returns {Promise<Object|null>}
 * @throws {Error} spotId/좌표 둘 다 없을 때
 */
export async function createPot({
  name, emoji, spotId, maxMembers,
  latitude, longitude, customAddress,
  durationMinutes = 30,
  description,
}) {
  // 위치 정보 사전 검증 — DB CHECK도 막지만 클라에서 조기 throw
  const hasSpot = !!spotId;
  const hasCoord = latitude != null && longitude != null;
  if (!hasSpot && !hasCoord) {
    throw new Error('[pots] createPot: spotId 또는 좌표(latitude, longitude) 중 하나는 필수입니다.');
  }

  // 현재 로그인된 유저 확인
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    console.error('[pots] createPot 실패: 로그인되지 않음');
    return null;
  }

  const expiresAt = new Date(Date.now() + durationMinutes * 60 * 1000).toISOString();

  // INSERT payload — 위치 정보는 상호 배타 (캠퍼스 스팟 OR 임의 좌표)
  const payload = {
    name,
    emoji,
    max_members: maxMembers,
    created_by: user.id,
    expires_at: expiresAt,
  };
  if (hasSpot) {
    payload.spot_id = spotId;
  } else {
    payload.latitude = latitude;
    payload.longitude = longitude;
    if (customAddress) payload.custom_address = customAddress;
  }
  if (description) payload.description = description;

  // 1) pots 행 생성
  const { data: pot, error: potError } = await supabase
    .from('pots')
    .insert(payload)
    .select()
    .single();

  if (potError) {
    console.error('[pots] createPot insert 실패:', potError.message);
    return null;
  }

  // 2) 만든 사람을 첫 멤버로 가입
  const { error: memberError } = await supabase
    .from('pot_members')
    .insert({ pot_id: pot.id, user_id: user.id, last_read_at: new Date().toISOString() });

  if (memberError) {
    console.error('[pots] createPot 가입 실패:', memberError.message);
    // 팟은 만들어졌지만 가입 실패. 일단 팟 반환 (재가입 가능)
  }

  return pot;
}

/**
 * 기존 팟에 가입
 * @param {string} potId
 * @returns {Promise<boolean>} 성공 여부
 */
export async function joinPot(potId) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return false;

  // 1) 이미 가입했는지 체크 (가입했으면 그대로 진입 허용)
  const { data: existing } = await supabase
    .from('pot_members')
    .select('user_id')
    .eq('pot_id', potId)
    .eq('user_id', user.id)
    .maybeSingle();

  if (existing) return true;  // 이미 멤버 → 그냥 통과

  // 2) 팟 상태 + 카운트 체크 (서버 단 최후 방어선)
  const { data: pot, error: potError } = await supabase
    .from('pots')
    .select('status, max_members, expires_at, pot_members(user_id)')
    .eq('id', potId)
    .maybeSingle();

  if (potError || !pot) {
    console.error('[pots] joinPot: 팟 조회 실패', potError?.message);
    return false;
  }

  // 마감 조건 체크
  const current = pot.pot_members?.length ?? 0;
  const expired = new Date(pot.expires_at) <= new Date();
  const full = current >= pot.max_members;
  const closed = pot.status === 'closed';

  if (closed || expired || full) {
    console.warn('[pots] joinPot: 마감된 팟', { closed, expired, full });
    return false;
  }

  // 3) 가입 INSERT
  const { error } = await supabase
    .from('pot_members')
    .insert({ pot_id: potId, user_id: user.id, last_read_at: new Date().toISOString() });

  if (error) {
    // 동시에 가입 시도된 race condition 등 PK 중복 → 성공 취급
    if (error.code === '23505') return true;
    console.error('[pots] joinPot 실패:', error.message);
    return false;
  }
  return true;
}

/**
 * 팟에서 나가기 (본인 row 삭제)
 * 일반 멤버용. 방장은 closePot 사용 (자동 마감보다 명시적 종료).
 * @param {string} potId
 * @returns {Promise<boolean>} 성공 여부 (이미 멤버 아니어도 true 취급 — 무해)
 */
export async function leavePot(potId) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    console.error('[pots] leavePot 실패: 로그인되지 않음');
    return false;
  }

  const { error } = await supabase
    .from('pot_members')
    .delete()
    .eq('pot_id', potId)
    .eq('user_id', user.id);  // 본인 row만 (RLS도 보장하지만 이중)

  if (error) {
    console.error('[pots] leavePot 실패:', error.message);
    return false;
  }
  return true;
}

/**
 * 읽음 표시 — pot_members.last_read_at을 now()로 갱신
 * ChatScreen 진입/새 메시지 수신/본인 메시지 송신 시 호출
 * @param {string} potId
 * @returns {Promise<boolean>}
 */
export async function markAsRead(potId) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return false;

  const { error } = await supabase
    .from('pot_members')
    .update({ last_read_at: new Date().toISOString() })
    .eq('pot_id', potId)
    .eq('user_id', user.id);

  if (error) {
    console.error('[pots] markAsRead 실패:', error.message);
    return false;
  }
  return true;
}

/**
 * 내가 속한 팟 목록 (채팅 탭에서 사용 예정)
 * @returns {Promise<Array>}
 */
export async function fetchMyPots() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from('pot_members')
    .select(`
      pot_id,
      pots (
        id, name, emoji, spot_id, status, max_members, created_by,
        expires_at,
        latitude, longitude, custom_address,
        pot_members(count)
      )
    `)
    .eq('user_id', user.id);

  if (error) {
    console.error('[pots] fetchMyPots 실패:', error.message);
    return [];
  }
  const now = new Date();
  return data
    .map((row) => row.pots)
    .filter((p) => p && p.status !== 'closed')
    .map((p) => {
      const current = p.pot_members?.[0]?.count ?? 0;
      const max = p.max_members;
      const expired = p.expires_at ? new Date(p.expires_at) <= now : false;
      const full = current >= max;
      return {
        ...p,
        current,
        max,
        isClosed: expired || full,  // 자동 마감 여부 (방장 종료는 위 filter에서 이미 제외됨)
      };
    });
}

/**
 * 채팅 탭 전용: 내가 속한 팟 + 마지막 메시지 시각으로 정렬
 * Supabase RPC `get_my_pots_with_last_message` 사용 — 서버 단에서 join + 정렬
 * @returns {Promise<Array>} 마지막 메시지 시각 DESC (없으면 joined_at fallback)
 */
export async function fetchMyPotsSorted() {
  const { data, error } = await supabase.rpc('get_my_pots_with_last_message');
  if (error) {
    console.error('[pots] fetchMyPotsSorted 실패:', error.message);
    return [];
  }
  const now = new Date();
  return (data || []).map((p) => {
    const current = p.current_count ?? 0;
    const max = p.max_members;
    const expired = p.expires_at ? new Date(p.expires_at) <= now : false;
    const full = current >= max;
    return {
      // ChatTabScreen 카드가 기대하는 형식 유지 (기존 fetchMyPots와 동일 shape, snake_case 일관)
      id: p.id,
      name: p.name,
      emoji: p.emoji,
      spot_id: p.spot_id,
      status: p.status,
      max_members: max,
      created_by: p.created_by,
      expires_at: p.expires_at,
      latitude: p.latitude,
      longitude: p.longitude,
      custom_address: p.custom_address,
      current,
      max,
      isClosed: expired || full,
      // 정렬 + UI 표시용 (카드의 마지막 메시지 미리보기 + 시각 + 안 읽음)
      lastMessageAt: p.last_message_at,
      lastMessageText: p.last_message_text,
      unreadCount: p.unread_count ?? 0,
      joinedAt: p.joined_at,
    };
  });
}

/**
 * 모든 활성 팟 (NearbySheet의 "내 주변 인기 팟" 용)
 * @returns {Promise<Array>}
 */
export async function fetchAllActivePots() {
  const { data, error } = await supabase
    .from('pots')
    .select(`
      id, name, emoji, status, max_members, spot_id, created_by,
      created_at, expires_at,
      latitude, longitude, custom_address,
      pot_members (user_id)
    `)
    .neq('status', 'closed')
    .gt('expires_at', new Date().toISOString())
    .order('created_at', { ascending: false });
  // ※ spot_id NULL 필터 제거 — 임의 위치 팟도 같이 받아야 지도/NearbySheet에 표시됨
  // ※ created_by 포함 — ChatScreen isOwner 판정용 (NearbySheet 진입 시 방장 메뉴 정상 표시)

  if (error) {
    console.error('[pots] fetchAllActivePots 실패:', error.message);
    return [];
  }

  return data
    .map((p) => ({
      id: p.id,
      spotId: p.spot_id,  // 임의 위치 팟은 null
      name: p.name,
      emoji: p.emoji,
      status: p.status,
      createdBy: p.created_by,  // ChatScreen isOwner 판정용
      current: p.pot_members?.length ?? 0,
      max: p.max_members,
      expiresAt: p.expires_at,
      // Supabase는 numeric을 string으로 줄 수 있어 Number() 캐스트 (WebView lat/lng용)
      latitude: p.latitude != null ? Number(p.latitude) : null,
      longitude: p.longitude != null ? Number(p.longitude) : null,
      customAddress: p.custom_address,
    }))
    .filter((p) => p.current < p.max);  // 꽉 차면 자동 마감
}

/**
 * 팟 탭 전용: 모집중 + 자동 마감(시간/꽉참) 다 가져옴
 * 방장이 종료(status=closed)한 건 제외
 * 카드에 isClosed 플래그 포함
 */
export async function fetchPotsForList() {
  const { data, error } = await supabase
    .from('pots')
    .select(`
      id, name, emoji, spot_id, status, max_members,
      created_at, expires_at, created_by,
      latitude, longitude, custom_address,
      pot_members (user_id)
    `)
    .neq('status', 'closed')
    .order('created_at', { ascending: false });
  // ※ spot_id NULL 필터 제거 — 팟 탭에도 임의 위치 팟이 같이 보이게

  if (error) {
    console.error('[pots] fetchPotsForList 실패:', error.message);
    return [];
  }

  const now = new Date();
  const SIX_HOURS_MS = 6 * 60 * 60 * 1000;

  return data
    .map((p) => {
      const current = p.pot_members?.length ?? 0;
      const expired = new Date(p.expires_at) <= now;
      const full = current >= p.max_members;
      return {
        id: p.id,
        spotId: p.spot_id,
        name: p.name,
        emoji: p.emoji,
        status: p.status,
        current,
        max: p.max_members,
        createdBy: p.created_by,
        expiresAt: p.expires_at,
        latitude: p.latitude,
        longitude: p.longitude,
        customAddress: p.custom_address,
        isClosed: expired || full,  // 자동 마감 여부
      };
    })
    // 마감(시간 만료) 후 6시간 넘으면 팟 탭에서 제외
    // 꽉 참 케이스는 expires_at이 미래라 더 오래 보일 수 있음 (의도된 단순화)
    .filter((p) => {
      if (!p.isClosed) return true;  // 모집중은 그대로
      const expiredAt = new Date(p.expiresAt).getTime();
      return expiredAt + SIX_HOURS_MS > now.getTime();
    });
}

/**
 * 특정 팟의 메시지 목록 가져오기
 * @param {string} potId
 * @returns {Promise<Array>} gifted-chat 형식의 메시지 배열
 */
export async function fetchMessages(potId) {
  const { data, error } = await supabase
    .from('messages')
    .select(`
      id, content, created_at, user_id,
      profiles!messages_user_id_profiles_fkey (nickname)
    `)
    .eq('pot_id', potId)
    .order('created_at', { ascending: false })
    .limit(50);

  if (error) {
    console.error('[messages] fetchMessages 실패:', error.message);
    return [];
  }

  // gifted-chat 형식으로 변환
  return data.map((m) => ({
    _id: m.id,
    text: m.content,
    createdAt: new Date(m.created_at),
    user: {
      _id: m.user_id,
      name: m.profiles?.nickname || '익명',
    },
  }));
}

/**
 * 메시지 전송
 * @param {string} potId
 * @param {string} content
 * @returns {Promise<Object|null>} 저장된 메시지 또는 null
 */
export async function sendMessage(potId, content) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    console.error('[messages] sendMessage 실패: 로그인되지 않음');
    return null;
  }

  const { data, error } = await supabase
    .from('messages')
    .insert({
      pot_id: potId,
      user_id: user.id,
      content,
    })
    .select(`
      id, content, created_at, user_id,
      profiles!messages_user_id_profiles_fkey (nickname)
    `)
    .single();

  if (error) {
    console.error('[messages] sendMessage 실패:', error.message);
    return null;
  }

  // gifted-chat 형식으로 변환
  return {
    _id: data.id,
    text: data.content,
    createdAt: new Date(data.created_at),
    user: {
      _id: data.user_id,
      name: data.profiles?.nickname || '익명',
    },
  };
}

/**
 * 팟 종료 (Soft delete — status를 'closed'로)
 * 방장(created_by)만 가능. RLS 정책에서 검증.
 * @param {string} potId
 * @returns {Promise<boolean>} 성공 여부
 */
export async function closePot(potId) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    console.error('[pots] closePot 실패: 로그인되지 않음');
    return false;
  }

  const { error } = await supabase
    .from('pots')
    .update({ status: 'closed' })
    .eq('id', potId)
    .eq('created_by', user.id);  // 방장 자기 자신만 (이중 안전장치)

  if (error) {
    console.error('[pots] closePot 실패:', error.message);
    return false;
  }
  return true;
}
