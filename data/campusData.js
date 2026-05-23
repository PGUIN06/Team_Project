// 대구대 경산캠퍼스 16개 스팟 + 활성 팟 더미 데이터
// 원본 HTML에서 그대로 가져온 좌표

export const CAMPUS_SPOTS = [
  // 정문 & 상가
  { id: 'gate',       name: '대구대 정문',     short: '정문',     lat: 35.897229, lng: 128.848692, color: '#EC4899', tip: '정문 안쪽 버스정류장 앞',  deliveryAddress: '경상북도 경산시 진량읍 대구대로 201 대구대학교 정문' },
  { id: 'bookstore',  name: 'DU북스토어',      short: 'DU북',     lat: 35.899587, lng: 128.848730, color: '#3B82F6', tip: '북스토어 출입구 앞',         deliveryAddress: '경상북도 경산시 진량읍 대구대로 201 대구대학교 DU북스토어' },

  // 단과대
  { id: 'rehab',      name: '재활과학대학',    short: '재활',     lat: 35.899651, lng: 128.853328, color: '#FB923C', tip: '재활대 정문 앞',             deliveryAddress: '경상북도 경산시 진량읍 대구대로 201 대구대학교 재활과학대학' },
  { id: 'eng',        name: '공학대학',        short: '공대',     lat: 35.899639, lng: 128.854258, color: '#FBBF24', tip: '공대 1층 로비 앞 벤치',      deliveryAddress: '경상북도 경산시 진량읍 대구대로 201 대구대학교 공학대학' },
  { id: 'biz',        name: '경영대학',        short: '경영',     lat: 35.900292, lng: 128.850610, color: '#F59E0B', tip: '경영대 정문 계단',           deliveryAddress: '경상북도 경산시 진량읍 대구대로 201 대구대학교 경영대학' },
  { id: 'humanities', name: '인문대학',        short: '인문',     lat: 35.897892, lng: 128.849804, color: '#FB923C', tip: '인문대 정문 앞',             deliveryAddress: '경상북도 경산시 진량읍 대구대로 201 대구대학교 인문대학' },
  { id: 'edu',        name: '사범대학',        short: '사범',     lat: 35.899551, lng: 128.846675, color: '#FBBF24', tip: '사범대 입구 계단',           deliveryAddress: '경상북도 경산시 진량읍 대구대로 201 대구대학교 사범대학' },
  { id: 'design',     name: '디자인예술1관',   short: '디자인',   lat: 35.902352, lng: 128.844428, color: '#FB923C', tip: '디자인관 정문 앞',           deliveryAddress: '경상북도 경산시 진량읍 대구대로 201 대구대학교 디자인예술1관' },

  // 광장
  { id: 'love_plaza', name: '사랑광장',        short: '사랑',     lat: 35.901647, lng: 128.850517, color: '#FB7185', tip: '광장 중앙 벤치',             deliveryAddress: '경상북도 경산시 진량읍 대구대로 201 대구대학교 사랑광장' },
  { id: 'light_plaza',name: '빛광장',          short: '빛',       lat: 35.901712, lng: 128.847063, color: '#F472B6', tip: '광장 중앙 분수대 앞',        deliveryAddress: '경상북도 경산시 진량읍 대구대로 201 대구대학교 빛광장' },

  // 운동시설
  { id: 'stadium1',   name: '제1운동장',       short: '제1운',    lat: 35.899680, lng: 128.843975, color: '#10B981', tip: '운동장 입구 매점 옆',        deliveryAddress: '경상북도 경산시 진량읍 대구대로 201 대구대학교 제1운동장' },
  { id: 'baseball',   name: '야구장',          short: '야구장',   lat: 35.901847, lng: 128.853634, color: '#22C55E', tip: '야구장 정문 게이트',         deliveryAddress: '경상북도 경산시 진량읍 대구대로 201 대구대학교 야구장' },

  // 기숙사
  { id: 'dorm_cu',    name: '기숙사 CU',       short: 'CU기숙',   lat: 35.903949, lng: 128.845415, color: '#A855F7', tip: 'CU 편의점 앞 테이블',        deliveryAddress: '경상북도 경산시 진량읍 대구대로 201 대구대학교 기숙사 CU편의점 앞' },
  { id: 'shinae',     name: '신애학사',        short: '신애',     lat: 35.903999, lng: 128.843480, color: '#9333EA', tip: '신애학사 정문 로비',         deliveryAddress: '경상북도 경산시 진량읍 대구대로 201 대구대학교 신애학사' },
  { id: 'ipji',       name: '입지학사',        short: '입지',     lat: 35.904847, lng: 128.845632, color: '#A855F7', tip: '입지학사 입구 벤치',         deliveryAddress: '경상북도 경산시 진량읍 대구대로 201 대구대학교 입지학사' },
  { id: 'dorm_seven', name: '기숙사 세븐',     short: '세븐',     lat: 35.905586, lng: 128.843168, color: '#7C3AED', tip: '세븐 1층 로비',              deliveryAddress: '경상북도 경산시 진량읍 대구대로 201 대구대학교 기숙사 세븐' },
];

export const POOL_COUNTS = {
  gate: 2, bookstore: 1,
  rehab: 1, eng: 3, biz: 2, humanities: 1, edu: 2, design: 1,
  love_plaza: 2, light_plaza: 1,
  stadium1: 0, baseball: 1,
  dorm_cu: 3, shinae: 2, ipji: 1, dorm_seven: 2,
};

export const ACTIVE_POOLS = [
  { id: 1,  spotId: 'gate',        name: '교촌치킨 정문 앞 야식팟',    emoji: '🍗', current: 3, max: 4, timeLeft: '7분',   status: 'recruiting' },
  { id: 2,  spotId: 'gate',        name: '맘스터치 같이 시키실 분',     emoji: '🍔', current: 2, max: 4, timeLeft: '15분',  status: 'recruiting' },
  { id: 3,  spotId: 'bookstore',   name: '커피빈 같이 가실분',          emoji: '☕', current: 2, max: 3, timeLeft: '10분',  status: 'recruiting' },
  { id: 4,  spotId: 'eng',         name: '굽네치킨 공대 N빵',           emoji: '🍗', current: 3, max: 4, timeLeft: '12분',  status: 'recruiting' },
  { id: 5,  spotId: 'eng',         name: '엽떡 1인분씩 시키실 분',       emoji: '🌶️', current: 2, max: 4, timeLeft: '8분',   status: 'recruiting' },
  { id: 6,  spotId: 'eng',         name: '본죽 해장팟',                  emoji: '🍲', current: 4, max: 4, timeLeft: '주문중', status: 'ordered' },
  { id: 7,  spotId: 'biz',         name: '신전떡볶이 N빵',               emoji: '🌶️', current: 2, max: 3, timeLeft: '20분',  status: 'recruiting' },
  { id: 8,  spotId: 'biz',         name: '미스터피자',                   emoji: '🍕', current: 3, max: 4, timeLeft: '5분',   status: 'recruiting' },
  { id: 9,  spotId: 'humanities',  name: '김밥천국 점심팟',              emoji: '🍙', current: 1, max: 4, timeLeft: '25분',  status: 'recruiting' },
  { id: 10, spotId: 'edu',         name: '도시락 같이 시키실 분',         emoji: '🍱', current: 2, max: 3, timeLeft: '14분',  status: 'recruiting' },
  { id: 11, spotId: 'edu',         name: '쉐이크쉑 햄버거',              emoji: '🍔', current: 1, max: 4, timeLeft: '18분',  status: 'recruiting' },
  { id: 12, spotId: 'rehab',       name: '롯데리아 같이 시키실 분',       emoji: '🍔', current: 2, max: 4, timeLeft: '22분',  status: 'recruiting' },
  { id: 13, spotId: 'design',      name: '카페 디저트팟',                 emoji: '🧁', current: 1, max: 3, timeLeft: '30분',  status: 'recruiting' },
  { id: 14, spotId: 'love_plaza',  name: '사랑광장 치킨파티',            emoji: '🍗', current: 4, max: 5, timeLeft: '3분',   status: 'recruiting' },
  { id: 15, spotId: 'love_plaza',  name: '피자 N빵',                     emoji: '🍕', current: 2, max: 4, timeLeft: '16분',  status: 'recruiting' },
  { id: 16, spotId: 'light_plaza', name: '빛광장 야식팟',                 emoji: '🍢', current: 2, max: 4, timeLeft: '11분',  status: 'recruiting' },
  { id: 17, spotId: 'baseball',    name: '야구장 응원 치킨',              emoji: '🍗', current: 3, max: 5, timeLeft: '9분',   status: 'recruiting' },
  { id: 18, spotId: 'dorm_cu',     name: 'BHC 뿌링클 기숙사팟',          emoji: '🍗', current: 4, max: 4, timeLeft: '주문중', status: 'ordered' },
  { id: 19, spotId: 'dorm_cu',     name: '편의점 도시락 N빵',            emoji: '🍙', current: 1, max: 4, timeLeft: '30분',  status: 'recruiting' },
  { id: 20, spotId: 'dorm_cu',     name: '돈까스 자취촌',                 emoji: '🍱', current: 2, max: 3, timeLeft: '14분',  status: 'recruiting' },
  { id: 21, spotId: 'shinae',      name: '신애학사 야식팟',               emoji: '🍗', current: 3, max: 4, timeLeft: '6분',   status: 'recruiting' },
  { id: 22, spotId: 'shinae',      name: '족발 같이 시키실 분',           emoji: '🥩', current: 2, max: 4, timeLeft: '19분',  status: 'recruiting' },
  { id: 23, spotId: 'ipji',        name: '입지 떡볶이팟',                 emoji: '🌶️', current: 1, max: 3, timeLeft: '24분',  status: 'recruiting' },
  { id: 24, spotId: 'dorm_seven',  name: '세븐 치킨팟',                   emoji: '🍗', current: 3, max: 4, timeLeft: '8분',   status: 'recruiting' },
  { id: 25, spotId: 'dorm_seven',  name: '마라탕 같이 시키실 분',         emoji: '🌶️', current: 2, max: 4, timeLeft: '13분',  status: 'recruiting' },
];

// 캠퍼스 중앙 (사랑광장 근처)
export const CAMPUS_CENTER = { lat: 35.900400, lng: 128.849500 };
