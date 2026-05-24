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
      pot_members (user_id)
    `)
    .eq('spot_id', spotId)
    .neq('status', 'closed')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('[pots] fetchPotsBySpot 실패:', error.message);
    return [];
  }

  // UI 친화적 형태로 변환 (기존 더미 ACTIVE_POOLS 모양과 비슷하게)
  return data.map((p) => ({
    id: p.id,
    spotId: spotId,
    name: p.name,
    emoji: p.emoji,
    status: p.status,
    current: p.pot_members?.length ?? 0,
    max: p.max_members,
    expiresAt: p.expires_at,
    createdBy: p.created_by,
  }));
}

/**
 * 모든 스팟의 활성 팟 개수 (지도 마커 카운트용)
 * @returns {Promise<Object>} { gate: 2, bookstore: 0, ... }
 */
export async function fetchPotCounts() {
  const { data, error } = await supabase
    .from('pots')
    .select('spot_id')
    .neq('status', 'closed')
    .not('spot_id', 'is', null);

  if (error) {
    console.error('[pots] fetchPotCounts 실패:', error.message);
    return {};
  }

  // spot_id별로 카운트 집계
  const counts = {};
  data.forEach((row) => {
    counts[row.spot_id] = (counts[row.spot_id] || 0) + 1;
  });
  return counts;
}

/**
 * 새 팟 만들기 + 만든 사람을 자동으로 첫 멤버로 가입
 * @param {Object} params
 * @param {string} params.name - 팟 이름
 * @param {string} params.emoji - 이모지
 * @param {string} params.spotId - 스팟 id (커스텀 핀이면 null)
 * @param {number} params.maxMembers - 최대 인원
 * @param {number} [params.latitude] - 커스텀 핀 좌표
 * @param {number} [params.longitude] - 커스텀 핀 좌표
 * @returns {Promise<Object|null>} 만들어진 팟 또는 null (실패)
 */
export async function createPot({ name, emoji, spotId, maxMembers, latitude, longitude }) {
  // 현재 로그인된 유저 확인
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    console.error('[pots] createPot 실패: 로그인되지 않음');
    return null;
  }

  // 1) pots 행 생성
  const { data: pot, error: potError } = await supabase
    .from('pots')
    .insert({
      name,
      emoji,
      spot_id: spotId,
      latitude,
      longitude,
      max_members: maxMembers,
      created_by: user.id,
    })
    .select()
    .single();

  if (potError) {
    console.error('[pots] createPot insert 실패:', potError.message);
    return null;
  }

  // 2) 만든 사람을 첫 멤버로 가입
  const { error: memberError } = await supabase
    .from('pot_members')
    .insert({ pot_id: pot.id, user_id: user.id });

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

  const { error } = await supabase
    .from('pot_members')
    .insert({ pot_id: potId, user_id: user.id });

  if (error) {
    // 이미 가입된 경우 (PK 중복) → 성공 취급
    if (error.code === '23505') return true;
    console.error('[pots] joinPot 실패:', error.message);
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
      pots (id, name, emoji, spot_id, status, max_members, created_by)
    `)
    .eq('user_id', user.id);

  if (error) {
    console.error('[pots] fetchMyPots 실패:', error.message);
    return [];
  }
  return data
    .map((row) => row.pots)
    .filter((p) => p && p.status !== 'closed');
}

/**
 * 모든 활성 팟 (NearbySheet의 "내 주변 인기 팟" 용)
 * @returns {Promise<Array>}
 */
export async function fetchAllActivePots() {
  const { data, error } = await supabase
    .from('pots')
    .select(`
      id, name, emoji, status, max_members, spot_id,
      created_at, expires_at,
      pot_members (user_id)
    `)
    .neq('status', 'closed')
    .not('spot_id', 'is', null)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('[pots] fetchAllActivePots 실패:', error.message);
    return [];
  }

  return data.map((p) => ({
    id: p.id,
    spotId: p.spot_id,
    name: p.name,
    emoji: p.emoji,
    status: p.status,
    current: p.pot_members?.length ?? 0,
    max: p.max_members,
    expiresAt: p.expires_at,
  }));
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
