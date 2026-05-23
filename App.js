import React, { useState, useEffect, useRef } from 'react';
import { View, StyleSheet } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import KakaoMapWebView from './components/KakaoMapWebView';
import * as Location from 'expo-location';
import * as Font from 'expo-font';
import {
  NotoSansKR_400Regular,
  NotoSansKR_500Medium,
  NotoSansKR_700Bold,
  NotoSansKR_900Black,
} from '@expo-google-fonts/noto-sans-kr';
import { BlackHanSans_400Regular } from '@expo-google-fonts/black-han-sans';

import Header from './components/Header';
import {
  PoolCounter,
  LocateButton,
  FAB,
  PlacingHint,
  MyPotsButton,
} from './components/MapOverlays';
import NearbySheet from './components/NearbySheet';
import SpotModal from './components/SpotModal';
import CustomPinModal from './components/CustomPinModal';
import CreatePotModal from './components/CreatePotModal';
import ChatScreen from './components/ChatScreen';
import MyPotsList from './components/MyPotsList';
import Toast from './components/Toast';
import { supabase } from './lib/supabase';
import {
  fetchPotCounts,
  fetchPotsBySpot,
  fetchAllActivePots,
  createPot,
  joinPot,
} from './lib/pots';

import { CAMPUS_SPOTS, CAMPUS_CENTER } from './data/campusData';
import { COLORS } from './utils/theme';

export default function App() {
  const [fontsLoaded, setFontsLoaded] = useState(false);
  const [userLocation, setUserLocation] = useState(CAMPUS_CENTER);
  const [placingMode, setPlacingMode] = useState(false);
  const [sheetExpanded, setSheetExpanded] = useState(false);
  const [selectedSpot, setSelectedSpot] = useState(null);
  const [customPin, setCustomPin] = useState(null);
  const [toast, setToast] = useState(null);
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [authReady, setAuthReady] = useState(false);
  const [poolCounts, setPoolCounts] = useState({});
  const [spotPools, setSpotPools] = useState([]);
  const [allPools, setAllPools] = useState([]);
  const [createPotSpot, setCreatePotSpot] = useState(null);
  const [creating, setCreating] = useState(false);
  const [activePot, setActivePot] = useState(null);
  const [showMyPots, setShowMyPots] = useState(false);
  const mapRef = useRef(null);

  // 익명 로그인 (한 번만, AsyncStorage에 세션 저장됨)
  useEffect(() => {
    (async () => {
      // 1) 이미 세션 있는지 확인 (AsyncStorage에서)
      const { data: { session } } = await supabase.auth.getSession();

      let currentUser = session?.user;

      // 2) 없으면 익명 로그인
      if (!currentUser) {
        const { data, error } = await supabase.auth.signInAnonymously();
        if (error) {
          console.error('[auth] 익명 로그인 실패:', error.message);
          setAuthReady(true); // 실패해도 앱은 띄움
          return;
        }
        currentUser = data.user;
      }

      setUser(currentUser);

      // profiles 조회 (트리거가 자동 생성한 닉네임 가져오기)
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

  // 모든 스팟의 활성 팟 카운트 + 전체 목록 로드 (지도 마커 / NearbySheet용)
  useEffect(() => {
    if (!authReady) return;
    (async () => {
      const [counts, all] = await Promise.all([
        fetchPotCounts(),
        fetchAllActivePots(),
      ]);
      setPoolCounts(counts);
      setAllPools(all);
    })();
  }, [authReady]);

  // 선택된 스팟의 활성 팟 목록 로드
  useEffect(() => {
    if (!selectedSpot) {
      setSpotPools([]);
      return;
    }
    (async () => {
      const pools = await fetchPotsBySpot(selectedSpot.id);
      setSpotPools(pools);
    })();
  }, [selectedSpot]);

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

  // GPS 권한 요청 & 위치 가져오기
  const locateUser = async () => {
    showToast('현재 위치를 가져오는 중...');
    try {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        showToast('위치 권한이 필요해요');
        return;
      }
      const loc = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });
      const newLoc = { lat: loc.coords.latitude, lng: loc.coords.longitude };
      setUserLocation(newLoc);
      mapRef.current?.animateToRegion(
        {
          latitude: newLoc.lat,
          longitude: newLoc.lng,
          latitudeDelta: 0.008,
          longitudeDelta: 0.008,
        },
        500
      );
      showToast('현재 위치로 이동했어요');
    } catch (err) {
      showToast('위치 정보를 가져올 수 없어요');
    }
  };

  // 토스트
  const showToast = (msg) => setToast({ msg, key: Date.now() });

  // 지도 탭 — 핀 모드일 때만
  const handleMapPress = (e) => {
    if (!placingMode) return;
    const { latitude, longitude } = e.nativeEvent.coordinate;
    setCustomPin({ lat: latitude, lng: longitude });
    setPlacingMode(false);
  };

  // 스팟 클릭
  const handleSpotPress = (spot) => {
    setSelectedSpot(spot);
    mapRef.current?.animateToRegion(
      {
        latitude: spot.lat,
        longitude: spot.lng,
        latitudeDelta: 0.005,
        longitudeDelta: 0.005,
      },
      400
    );
  };

  // "+ 이 위치에 팟 만들기" 버튼 누름 → SpotModal 닫고 CreatePotModal 열기
  const handleCreatePool = () => {
    setCreatePotSpot(selectedSpot);
    setSelectedSpot(null);
  };

  // CreatePotModal에서 "✓ 팟 만들기" 누름 → 실제 Supabase에 INSERT
  const handleConfirmCreate = async (name, emoji, count) => {
    if (!createPotSpot || creating) return;

    setCreating(true);
    const pot = await createPot({
      name,
      emoji,
      spotId: createPotSpot.id,
      maxMembers: count,
    });
    setCreating(false);

    if (!pot) {
      showToast('팟 생성 실패. 다시 시도해주세요.');
      return;
    }

    showToast(`"${name}" 팟이 생성됐어요! 🎉`);
    setCreatePotSpot(null);

    // 데이터 새로고침 (카운트, 전체 목록)
    const [counts, allPots] = await Promise.all([
      fetchPotCounts(),
      fetchAllActivePots(),
    ]);
    setPoolCounts(counts);
    setAllPools(allPots);
  };

  // 활성 팟 카드 누름 → 가입 + 채팅방 열기
  const handleOpenPotChat = async (pot) => {
    if (!pot) return;

    // 가입 (이미 멤버여도 23505 무해 처리됨)
    const ok = await joinPot(pot.id);
    if (!ok) {
      showToast('팟 가입 실패. 다시 시도해주세요.');
      return;
    }

    setSelectedSpot(null);  // SpotModal 닫기
    setActivePot(pot);      // ChatScreen 열기
  };

  // MyPotsList에서 팟 누름 → 모달 닫고 채팅방 열기
  const handleMyPotsItemPress = (pot) => {
    setShowMyPots(false);
    // fetchMyPots는 멤버 수를 안 줘서 기본값 채워서 전달 (ChatScreen 헤더용)
    setActivePot({
      ...pot,
      current: 0,  // 정확한 값이 필요하면 14-c에서 보강
      max: pot.max_members,
    });
  };

  // 커스텀 핀 모달 확정
  const handleCustomConfirm = (name, emoji, count) => {
    showToast(`"${name}" 팟이 생성됐어요! 🎉`);
    setCustomPin(null);
  };

  const handleCustomClose = () => {
    setCustomPin(null);
  };

  if (!fontsLoaded || !authReady) {
    return <View style={styles.loading} />;
  }

  return (
    <SafeAreaProvider>
      <View style={styles.container}>
        <StatusBar style="dark" />

        <KakaoMapWebView
          ref={mapRef}
          style={styles.map}
          spots={CAMPUS_SPOTS}
          poolCounts={poolCounts}
          userLocation={userLocation}
          customPin={customPin}
          placingMode={placingMode}
          onSpotPress={handleSpotPress}
          onMapPress={handleMapPress}
        />

        {/* 오버레이들 */}
        <Header
          placingMode={placingMode}
          onCancelPlacing={() => setPlacingMode(false)}
          onSearch={() => showToast('검색 기능 준비 중')}
        />

        {!placingMode && (
          <PoolCounter count={Object.values(poolCounts).reduce((a, b) => a + b, 0)} />
        )}
        {placingMode && <PlacingHint />}

        <LocateButton onPress={locateUser} />

        <FAB active={placingMode} onPress={() => setPlacingMode(!placingMode)} />

        {!placingMode && <MyPotsButton onPress={() => setShowMyPots(true)} />}

        {!placingMode && (
          <NearbySheet
            expanded={sheetExpanded}
            onToggle={() => setSheetExpanded(!sheetExpanded)}
            userLocation={userLocation}
            pools={allPools}
            onSpotPress={handleSpotPress}
          />
        )}

        {/* 모달 */}
        <SpotModal
          visible={!!selectedSpot}
          spot={selectedSpot}
          userLocation={userLocation}
          pools={spotPools}
          onClose={() => setSelectedSpot(null)}
          onCreatePool={handleCreatePool}
          onPotPress={handleOpenPotChat}
          onShowToast={showToast}
        />

        <CustomPinModal
          visible={!!customPin}
          pin={customPin}
          userLocation={userLocation}
          onClose={handleCustomClose}
          onConfirm={handleCustomConfirm}
        />

        <CreatePotModal
          visible={!!createPotSpot}
          spot={createPotSpot}
          userLocation={userLocation}
          submitting={creating}
          onClose={() => setCreatePotSpot(null)}
          onConfirm={handleConfirmCreate}
        />

        <ChatScreen
          visible={!!activePot}
          pot={activePot}
          currentUser={user && profile ? { id: user.id, nickname: profile.nickname } : null}
          onClose={() => setActivePot(null)}
        />

        <MyPotsList
          visible={showMyPots}
          onClose={() => setShowMyPots(false)}
          onPotPress={handleMyPotsItemPress}
        />

        {/* 토스트 */}
        {toast && (
          <Toast
            key={toast.key}
            message={toast.msg}
            onDismiss={() => setToast(null)}
          />
        )}
      </View>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  map: { flex: 1 },
  loading: { flex: 1, backgroundColor: COLORS.bg },
});
