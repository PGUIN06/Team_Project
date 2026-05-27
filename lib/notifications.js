// lib/notifications.js — 푸시 알림 셋업 + 토큰 발급/저장
// App.js에서 setupNotificationHandler()(모듈 로드 1회) + initPushNotifications()(인증 후) 호출.
// 시뮬레이터/권한 거부/projectId 누락 등 모든 실패 케이스에서 graceful (앱은 정상 동작).
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { supabase } from './supabase';

/**
 * 포그라운드 알림 표시 방식 — 모듈 로드 시 1회만 호출
 * SDK 53+ 새 API: shouldShowBanner / shouldShowList
 */
export function setupNotificationHandler() {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: false, // 배지는 묶음 3에서 결정
    }),
  });
}

/**
 * 권한 요청 + Expo Push Token 발급
 * 실패 케이스는 모두 null 반환 (graceful):
 *  - Device.isDevice === false (시뮬레이터/에뮬레이터)
 *  - 권한 거부
 *  - projectId 누락 (eas init 필요)
 *  - 네트워크/Expo Push API 에러
 */
export async function registerForPushNotificationsAsync() {
  if (!Device.isDevice) {
    // iOS 시뮬레이터는 APNs 자체가 없어서 절대 불가
    if (Platform.OS === 'ios') {
      console.warn('[notifications] iOS 시뮬레이터는 푸시 토큰 발급 X (실폰 필요)');
      return null;
    }
    // Android 에뮬레이터는 Google Play Services 있으면 FCM 가능 → 시도
    console.warn('[notifications] Android 에뮬레이터 — 토큰 발급 시도 (Google Play Services 필요)');
  }

  // Android 8+ 알림 채널 필수 (없으면 알림 안 보임)
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#3B82F6',
    });
  }

  // 권한 요청 — 기존 권한 있으면 재요청 X
  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;
  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }
  if (finalStatus !== 'granted') {
    console.warn('[notifications] 알림 권한 거부됨 — graceful 계속');
    return null;
  }

  // Expo projectId — app.json의 extra.eas.projectId (eas init 시 자동 추가)
  const projectId =
    Constants.expoConfig?.extra?.eas?.projectId ||
    Constants.easConfig?.projectId;
  if (!projectId) {
    console.warn('[notifications] expoConfig.extra.eas.projectId 누락 — eas init 필요');
    return null;
  }

  try {
    const tokenData = await Notifications.getExpoPushTokenAsync({ projectId });
    return tokenData.data; // 형식: ExponentPushToken[xxx]
  } catch (err) {
    console.error('[notifications] 토큰 발급 실패:', err?.message || err);
    return null;
  }
}

/**
 * Supabase user_push_tokens 테이블에 토큰 upsert
 * - token UNIQUE 제약 → onConflict: 'token'으로 같은 토큰 재발급 시 user_id/updated_at만 갱신
 * - RLS 정책상 본인 user_id만 INSERT/UPDATE 가능
 */
export async function savePushToken(token) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    console.warn('[notifications] 로그인 안 됨 — 토큰 저장 보류');
    return false;
  }

  const platform = Platform.OS;
  if (platform !== 'ios' && platform !== 'android') {
    console.warn('[notifications] 지원 안 되는 platform:', platform);
    return false;
  }

  const { error } = await supabase
    .from('user_push_tokens')
    .upsert(
      {
        user_id: user.id,
        token,
        platform,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'token' }
    );

  if (error) {
    console.error('[notifications] 토큰 저장 실패:', error.message);
    return false;
  }
  console.log('[notifications] 토큰 저장 OK (user_id =', user.id, ')');
  return true;
}

/**
 * 통합 흐름 — App.js의 익명 로그인 완료 후 useEffect로 호출.
 * 어느 단계에서든 실패하면 graceful (앱 영향 없음).
 */
export async function initPushNotifications() {
  const token = await registerForPushNotificationsAsync();
  if (!token) return;
  // ※ 묶음 3 검증 후 console.log 제거 권장 (Expo Push Token이 로그에 노출되므로)
  console.log('[notifications] Expo Push Token:', token);
  await savePushToken(token);
}
