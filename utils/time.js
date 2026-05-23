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
