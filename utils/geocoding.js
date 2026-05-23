import Constants from 'expo-constants';

// 카카오 REST API로 좌표 → 주소 변환
// app.json의 extra.kakaoRestApiKey 사용
export async function reverseGeocode(lat, lng) {
  const apiKey = Constants.expoConfig?.extra?.kakaoRestApiKey;

  if (!apiKey || apiKey === 'YOUR_KAKAO_REST_API_KEY_HERE') {
    // 키 없을 때 폴백
    return `위도 ${lat.toFixed(5)}, 경도 ${lng.toFixed(5)}`;
  }

  try {
    const url = `https://dapi.kakao.com/v2/local/geo/coord2address.json?x=${lng}&y=${lat}`;
    const response = await fetch(url, {
      headers: { Authorization: `KakaoAK ${apiKey}` },
    });
    const data = await response.json();

    if (data.documents && data.documents.length > 0) {
      const doc = data.documents[0];
      const addr =
        doc.road_address?.address_name || doc.address?.address_name;
      if (addr) return `${addr} (위도 ${lat.toFixed(4)}, 경도 ${lng.toFixed(4)})`;
    }
    return `위도 ${lat.toFixed(5)}, 경도 ${lng.toFixed(5)}`;
  } catch (err) {
    console.warn('Reverse geocoding failed:', err);
    return `위도 ${lat.toFixed(5)}, 경도 ${lng.toFixed(5)}`;
  }
}
