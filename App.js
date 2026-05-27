// App.js — 전역 셋업 + 하단 탭 네비게이션
import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import { NavigationContainer, useNavigationContainerRef } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import * as Notifications from 'expo-notifications';
import * as Font from 'expo-font';
import {
  NotoSansKR_400Regular,
  NotoSansKR_500Medium,
  NotoSansKR_700Bold,
  NotoSansKR_900Black,
} from '@expo-google-fonts/noto-sans-kr';
import { BlackHanSans_400Regular } from '@expo-google-fonts/black-han-sans';

import { supabase } from './lib/supabase';
import { COLORS, FONTS } from './utils/theme';
import { setupNotificationHandler, initPushNotifications } from './lib/notifications';
import MapScreen from './screens/MapScreen';
import PotsScreen from './screens/PotsScreen';
import ChatTabScreen from './screens/ChatTabScreen';
import PotPreviewScreen from './screens/PotPreviewScreen';

const Tab = createBottomTabNavigator();
const RootStack = createNativeStackNavigator();

// 모듈 로드 시 1회 — 포그라운드 알림 표시 방식 설정 (앱 시작보다 빠른 시점)
setupNotificationHandler();

// 탭바 아이콘 (간단한 이모지/문자 기반)
function TabIcon({ icon, color, focused }) {
  return (
    <Text
      style={{
        fontSize: 22,
        opacity: focused ? 1 : 0.45,
      }}
    >
      {icon}
    </Text>
  );
}

// MainTabs — Tab.Navigator를 별도 컴포넌트로 분리 (useSafeAreaInsets 사용 위해)
// tabBar 높이/paddingBottom을 Android navigation bar 높이에 맞춰 동적 처리
function MainTabs({ user, profile }) {
  const insets = useSafeAreaInsets();
  // react-native-edge-to-edge plugin이 정확한 inset 제공
  // fallback 8은 plugin 적용 안 된 환경에서도 최소 보호 (gesture nav 최소 높이)
  const bottomPad = insets.bottom > 0 ? insets.bottom : 8;
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: COLORS.primary,
        tabBarInactiveTintColor: COLORS.text3,
        tabBarStyle: {
          backgroundColor: COLORS.surface,
          borderTopWidth: 1,
          borderTopColor: COLORS.border,
          height: 56 + bottomPad,
          paddingTop: 6,
          paddingBottom: bottomPad,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontFamily: FONTS.bold,
          marginTop: 2,
        },
        tabBarIcon: ({ focused, color }) => {
          const icons = { Map: '🗺️', Pots: '🍽️', Chat: '💬' };
          return <TabIcon icon={icons[route.name]} color={color} focused={focused} />;
        },
      })}
    >
      <Tab.Screen name="Map" options={{ tabBarLabel: '지도' }}>
        {(props) => <MapScreen {...props} user={user} profile={profile} />}
      </Tab.Screen>
      <Tab.Screen name="Pots" options={{ tabBarLabel: '팟' }}>
        {(props) => <PotsScreen {...props} user={user} profile={profile} />}
      </Tab.Screen>
      <Tab.Screen name="Chat" options={{ tabBarLabel: '채팅' }}>
        {(props) => <ChatTabScreen {...props} user={user} profile={profile} />}
      </Tab.Screen>
    </Tab.Navigator>
  );
}

export default function App() {
  const [fontsLoaded, setFontsLoaded] = useState(false);
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [authReady, setAuthReady] = useState(false);

  // 알림 클릭 Deep Link — navigation ref + NavigationContainer 준비 전 pending 보관
  const navigationRef = useNavigationContainerRef();
  const pendingPotIdRef = useRef(null);

  // 익명 로그인
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

      const { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', currentUser.id)
        .single();

      if (profileData) setProfile(profileData);

      setAuthReady(true);
      console.log('[auth] 로그인 완료, user.id =', currentUser?.id, 'nickname =', profileData?.nickname);
    })();
  }, []);

  // 폰트
  useEffect(() => {
    Font.loadAsync({
      NotoSansKR_400Regular,
      NotoSansKR_500Medium,
      NotoSansKR_700Bold,
      NotoSansKR_900Black,
      BlackHanSans_400Regular,
    }).then(() => setFontsLoaded(true));
  }, []);

  // 푸시 알림 — 익명 로그인 완료 후 권한 요청 + 토큰 발급 + Supabase 저장
  // 실패해도 앱 정상 동작 (graceful). 시뮬레이터에선 토큰 발급 X, 권한 다이얼로그까지만.
  useEffect(() => {
    if (!authReady || !user) return;
    initPushNotifications();
  }, [authReady, user]);

  // 알림 클릭 시 채팅 탭의 해당 팟 ChatScreen 자동 진입 (Deep Link)
  // 페이로드: { type: 'message'|'new_member', potId } — Edge Function이 보낸 data
  useEffect(() => {
    const handleResponse = (response) => {
      const potId = response?.notification?.request?.content?.data?.potId;
      if (!potId) return;
      if (navigationRef.isReady()) {
        navigationRef.navigate('Tabs', {
          screen: 'Chat',
          params: { openPotId: potId },
        });
      } else {
        // NavigationContainer 아직 준비 안 됨 → onReady에서 처리
        pendingPotIdRef.current = potId;
      }
    };

    // 1) 앱 종료 상태에서 알림 클릭 → 앱 시작 시 한 번 체크
    Notifications.getLastNotificationResponseAsync().then((response) => {
      if (response) handleResponse(response);
    });

    // 2) 앱 실행 중 알림 클릭 (background/foreground)
    const sub = Notifications.addNotificationResponseReceivedListener(handleResponse);
    return () => sub.remove();
  }, []);

  if (!fontsLoaded || !authReady) {
    return <View style={styles.loading} />;
  }

  return (
    <SafeAreaProvider>
      <NavigationContainer
        ref={navigationRef}
        onReady={() => {
          // NavigationContainer 준비 전에 들어온 알림 클릭이 있으면 여기서 처리
          const pending = pendingPotIdRef.current;
          if (pending) {
            navigationRef.navigate('Tabs', {
              screen: 'Chat',
              params: { openPotId: pending },
            });
            pendingPotIdRef.current = null;
          }
        }}
      >
        <RootStack.Navigator screenOptions={{ headerShown: false }}>
          <RootStack.Screen name="Tabs">
            {() => <MainTabs user={user} profile={profile} />}
          </RootStack.Screen>
          <RootStack.Screen
            name="PotPreview"
            options={{ presentation: 'fullScreenModal' }}
          >
            {(props) => <PotPreviewScreen {...props} user={user} profile={profile} />}
          </RootStack.Screen>
        </RootStack.Navigator>
      </NavigationContainer>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },
  // tabBar/tabBarLabel은 MainTabs 컴포넌트 안에 인라인 처리 (useSafeAreaInsets 동적 사용 위해)
});
