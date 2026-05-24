// App.js — 전역 셋업 (인증, 폰트, 라우터)
// 지도 화면 로직은 screens/MapScreen.jsx로 이동됨
import React, { useState, useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import * as Font from 'expo-font';
import {
  NotoSansKR_400Regular,
  NotoSansKR_500Medium,
  NotoSansKR_700Bold,
  NotoSansKR_900Black,
} from '@expo-google-fonts/noto-sans-kr';
import { BlackHanSans_400Regular } from '@expo-google-fonts/black-han-sans';

import { supabase } from './lib/supabase';
import { COLORS } from './utils/theme';
import MapScreen from './screens/MapScreen';

export default function App() {
  const [fontsLoaded, setFontsLoaded] = useState(false);
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [authReady, setAuthReady] = useState(false);

  // 익명 로그인 (한 번만, AsyncStorage에 세션 저장됨)
  useEffect(() => {
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      let currentUser = session?.user;

      if (!currentUser) {
        const { data, error } = await supabase.auth.signInAnonymously();
        if (error) {
          console.error('[auth] 익명 로그인 실패:', error.message);
          setAuthReady(true);
          return;
        }
        currentUser = data.user;
      }

      setUser(currentUser);

      // profiles 조회 (트리거가 자동 생성한 닉네임)
      const { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', currentUser.id)
        .single();

      if (profileData) {
        setProfile(profileData);
      }

      setAuthReady(true);
      console.log('[auth] 로그인 완료, user.id =', currentUser?.id, 'nickname =', profileData?.nickname);
    })();
  }, []);

  // 폰트 로드
  useEffect(() => {
    Font.loadAsync({
      NotoSansKR_400Regular,
      NotoSansKR_500Medium,
      NotoSansKR_700Bold,
      NotoSansKR_900Black,
      BlackHanSans_400Regular,
    }).then(() => setFontsLoaded(true));
  }, []);

  // 로딩 가드
  if (!fontsLoaded || !authReady) {
    return <View style={styles.loading} />;
  }

  return (
    <SafeAreaProvider>
      <MapScreen user={user} profile={profile} />
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },
});
