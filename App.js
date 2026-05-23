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
} from './components/MapOverlays';
import NearbySheet from './components/NearbySheet';
import SpotModal from './components/SpotModal';
import CustomPinModal from './components/CustomPinModal';
import Toast from './components/Toast';

import {
  CAMPUS_SPOTS,
  POOL_COUNTS,
  ACTIVE_POOLS,
  CAMPUS_CENTER,
} from './data/campusData';
import { COLORS } from './utils/theme';

export default function App() {
  const [fontsLoaded, setFontsLoaded] = useState(false);
  const [userLocation, setUserLocation] = useState(CAMPUS_CENTER);
  const [placingMode, setPlacingMode] = useState(false);
  const [sheetExpanded, setSheetExpanded] = useState(false);
  const [selectedSpot, setSelectedSpot] = useState(null);
  const [customPin, setCustomPin] = useState(null);
  const [toast, setToast] = useState(null);
  const mapRef = useRef(null);

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

  // 팟 만들기
  const handleCreatePool = (spotName) => {
    showToast(`${spotName}에 새 팟을 만드는 중...`);
    setSelectedSpot(null);
  };

  // 커스텀 핀 모달 확정
  const handleCustomConfirm = (name, emoji, count) => {
    showToast(`"${name}" 팟이 생성됐어요! 🎉`);
    setCustomPin(null);
  };

  const handleCustomClose = () => {
    setCustomPin(null);
  };

  if (!fontsLoaded) {
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
          poolCounts={POOL_COUNTS}
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

        {!placingMode && <PoolCounter count={ACTIVE_POOLS.length} />}
        {placingMode && <PlacingHint />}

        <LocateButton onPress={locateUser} />

        <FAB active={placingMode} onPress={() => setPlacingMode(!placingMode)} />

        {!placingMode && (
          <NearbySheet
            expanded={sheetExpanded}
            onToggle={() => setSheetExpanded(!sheetExpanded)}
            userLocation={userLocation}
            onSpotPress={handleSpotPress}
          />
        )}

        {/* 모달 */}
        <SpotModal
          visible={!!selectedSpot}
          spot={selectedSpot}
          userLocation={userLocation}
          onClose={() => setSelectedSpot(null)}
          onCreatePool={handleCreatePool}
          onShowToast={showToast}
        />

        <CustomPinModal
          visible={!!customPin}
          pin={customPin}
          userLocation={userLocation}
          onClose={handleCustomClose}
          onConfirm={handleCustomConfirm}
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
