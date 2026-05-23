import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import Constants from 'expo-constants';

const { supabaseUrl, supabaseAnonKey } = Constants.expoConfig?.extra ?? {};

if (!supabaseUrl || !supabaseAnonKey) {
  // 빌드 직후 키 없으면 명확한 에러로 알림 (실행 중 조용히 실패하는 것보다 나음)
  console.warn(
    '[supabase] 키가 비어있습니다. .env.local의 SUPABASE_URL / SUPABASE_ANON_KEY를 확인하고 Expo를 재시작하세요.'
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false, // RN에선 URL 세션 감지 비활성화
  },
});
