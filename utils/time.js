// utils/time.js — 시간 관련 헬퍼

/**
 * ISO timestamp(expires_at)를 "남은 시간" 문자열로 변환
 * @param {string|null} expiresAt - ISO 8601 (예: '2026-05-24T03:00:00Z')
 * @returns {string} '29분 남음' | '곧 마감' | '마감' | ''
 */
export function formatTimeLeft(expiresAt) {
  if (!expiresAt) return '';

  const diffMs = new Date(expiresAt).getTime() - Date.now();
  const diffMin = Math.round(diffMs / 60000);

  if (diffMin < 0) return '마감';
  if (diffMin === 0) return '곧 마감';
  if (diffMin < 60) return `${diffMin}분 남음`;

  const hours = Math.floor(diffMin / 60);
  const mins = diffMin % 60;
  if (mins === 0) return `${hours}시간 남음`;
  return `${hours}시간 ${mins}분 남음`;
}

/**
 * 팟의 status + 남은 시간을 한 줄로 표시
 * 더미의 `timeLeft` 자리에 직접 쓸 수 있는 헬퍼
 * @param {Object} pool - { status, expiresAt }
 * @returns {string} '주문중' | '29분 남음' | '마감'
 */
export function formatPoolTimeStatus(pool) {
  if (!pool) return '';
  if (pool.status === 'ordered') return '주문중';
  if (pool.status === 'closed') return '마감';
  return formatTimeLeft(pool.expiresAt);
}

/**
 * 카카오톡식 시각 포맷 — 채팅 탭 카드의 "마지막 메시지 시각" 표시용
 * - 오늘: "오후 2:30"
 * - 어제: "어제"
 * - 그 이전: "5/24"
 * @param {string|null} at - ISO 8601 timestamp
 * @returns {string}
 */
export function formatChatTime(at) {
  if (!at) return '';
  const date = new Date(at);
  if (isNaN(date.getTime())) return '';
  const now = new Date();

  // 오늘인지 (같은 연/월/일)
  const isSameDay =
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate();

  if (isSameDay) {
    const h = date.getHours();
    const m = date.getMinutes();
    const ampm = h < 12 ? '오전' : '오후';
    const h12 = h % 12 || 12;
    const mm = String(m).padStart(2, '0');
    return `${ampm} ${h12}:${mm}`;
  }

  // 어제인지
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  const isYesterday =
    date.getFullYear() === yesterday.getFullYear() &&
    date.getMonth() === yesterday.getMonth() &&
    date.getDate() === yesterday.getDate();

  if (isYesterday) return '어제';

  // 그 이전 — "월/일"
  return `${date.getMonth() + 1}/${date.getDate()}`;
}
