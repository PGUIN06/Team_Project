// App.js — 전역 셋업 + 하단 탭 네비게이션
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
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
import MapScreen from './screens/MapScreen';
import PotsScreen from './screens/PotsScreen';
import ChatTabScreen from './screens/ChatTabScreen';

const Tab = createBottomTabNavigator();

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

export default function App() {
  const [fontsLoaded, setFontsLoaded] = useState(false);
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [authReady, setAuthReady] = useState(false);

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

  if (!fontsLoaded || !authReady) {
    return <View style={styles.loading} />;
  }

  return (
    <SafeAreaProvider>
      <NavigationContainer>
        <Tab.Navigator
          screenOptions={({ route }) => ({
            headerShown: false,
            tabBarActiveTintColor: COLORS.primary,
            tabBarInactiveTintColor: COLORS.text3,
            tabBarStyle: styles.tabBar,
            tabBarLabelStyle: styles.tabBarLabel,
            tabBarIcon: ({ focused, color }) => {
              const icons = {
                Map: '🗺️',
                Pots: '🍽️',
                Chat: '💬',
              };
              return <TabIcon icon={icons[route.name]} color={color} focused={focused} />;
            },
          })}
        >
          <Tab.Screen
            name="Map"
            options={{ tabBarLabel: '지도' }}
          >
            {() => <MapScreen user={user} profile={profile} />}
          </Tab.Screen>
          <Tab.Screen
            name="Pots"
            options={{ tabBarLabel: '팟' }}
          >
            {() => <PotsScreen user={user} profile={profile} />}
          </Tab.Screen>
          <Tab.Screen
            name="Chat"
            options={{ tabBarLabel: '채팅' }}
          >
            {() => <ChatTabScreen user={user} profile={profile} />}
          </Tab.Screen>
        </Tab.Navigator>
      </NavigationContainer>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },
  tabBar: {
    backgroundColor: COLORS.surface,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    height: 80,
    paddingTop: 6,
    paddingBottom: 20,
  },
  tabBarLabel: {
    fontSize: 11,
    fontFamily: FONTS.bold,
    marginTop: 2,
  },
});
