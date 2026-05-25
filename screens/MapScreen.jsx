// screens/MapScreen.jsx — 지도 화면 (App.js에서 분리)
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { View, StyleSheet, InteractionManager } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useFocusEffect } from '@react-navigation/native';
import KakaoMapWebView from '../components/KakaoMapWebView';
import * as Location from 'expo-location';
import Header from '../components/Header';
import {
  PoolCounter,
  LocateButton,
  FAB,
  PlacingHint,
} from '../components/MapOverlays';
import NearbySheet from '../components/NearbySheet';
import SpotModal from '../components/SpotModal';
import CustomPinModal from '../components/CustomPinModal';
import CreatePotModal from '../components/CreatePotModal';
import Toast from '../components/Toast';
import ChatScreen from '../components/ChatScreen';
import { usePotsRealtime } from '../hooks/usePotsRealtime';
import { CAMPUS_SPOTS, CAMPUS_CENTER } from '../data/campusData';
import { COLORS } from '../utils/theme';
import {
  fetchPotCounts,
  fetchPotsBySpot,
  fetchAllActivePots,
  fetchMyPots,
  createPot,
  joinPot,
} from '../lib/pots';

/**
 * MapScreen — 지도 + 핀 + 모달들
 *
 * Props:
 *   user      - Supabase auth user (App.js에서 인증 후 전달)
 *   profile   - profiles 테이블의 내 프로필 행
 */
export default function MapScreen({ user, profile, navigation }) {
  // ============ State ============
  const [userLocation, setUserLocation] = useState(CAMPUS_CENTER);
  const [placingMode, setPlacingMode] = useState(false);
  const [sheetExpanded, setSheetExpanded] = useState(false);
  const [selectedSpot, setSelectedSpot] = useState(null);
  const [customPin, setCustomPin] = useState(null);
  const [toast, setToast] = useState(null);

  // Supabase 데이터
  const [poolCounts, setPoolCounts] = useState({});
  const [spotPools, setSpotPools] = useState([]);
  const [allPools, setAllPools] = useState([]);

  // 모달 state
  const [createPotSpot, setCreatePotSpot] = useState(null);
  const [creating, setCreating] = useState(false);
  const [activePot, setActivePot] = useState(null);
  const [myPotIds, setMyPotIds] = useState(new Set());  // 멤버십 (옵션 B)

  const mapRef = useRef(null);
  // PotPreview 콜백이 frozen 상태에서도 안전하게 데이터 전달 (PotsScreen과 동일 패턴)
  const pendingChatPotRef = useRef(null);

  // PotPreview 닫고 MapScreen으로 focus 복귀 시 ref 처리 (iOS modal dismiss 완료 대기)
  useFocusEffect(
    useCallback(() => {
      if (!pendingChatPotRef.current) return;
      const pot = pendingChatPotRef.current;
      pendingChatPotRef.current = null;
      InteractionManager.runAfterInteractions(() => {
        setActivePot(pot);
      });
    }, [])
  );

  // ============ Data fetching ============
  // selectedSpot을 ref로 캡처 — refreshPots를 stable하게 유지하면서 최신 값 접근
  const selectedSpotRef = useRef(null);
  useEffect(() => {
    selectedSpotRef.current = selectedSpot;
  }, [selectedSpot]);

  // 모든 스팟 카운트 + 전체 활성 팟 + 내 멤버십 + (열려있다면) 선택된 스팟의 팟 목록까지 한꺼번에 갱신
  // pot_members 변경 시 SpotModal의 카운트도 자동 반영
  const refreshPots = useCallback(async () => {
    const [counts, all, mine] = await Promise.all([
      fetchPotCounts(),
      fetchAllActivePots(),
      fetchMyPots(),
    ]);
    setPoolCounts(counts);
    setAllPools(all);
    setMyPotIds(new Set(mine.map((p) => p.id)));

    // SpotModal 열려있으면 spotPools도 같이 갱신 (stale 방지)
    if (selectedSpotRef.current) {
      const pools = await fetchPotsBySpot(selectedSpotRef.current.id);
      setSpotPools(pools);
    }
  }, []);

  useEffect(() => {
    if (!user) return;
    refreshPots();
  }, [user, refreshPots]);

  // Realtime — pots/pot_members 변경 시 카운트/목록/spotPools 자동 갱신
  usePotsRealtime(refreshPots, !!user, 'pots-map');

  // 1분마다 자동 갱신 (시간 만료/곧 만료 상태 반영)
  useEffect(() => {
    if (!user) return;
    const interval = setInterval(() => {
      refreshPots();
    }, 60 * 1000);
    return () => clearInterval(interval);
  }, [user, refreshPots]);

  // 선택된 스팟의 활성 팟 목록 (SpotModal용)
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

  // ============ Handlers ============
  // 토스트
  const showToast = (msg) => setToast({ msg, key: Date.now() });

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

  // SpotModal "팟 만들기" → CreatePotModal 열기
  const handleCreatePool = () => {
    setCreatePotSpot(selectedSpot);
    setSelectedSpot(null);
  };

  // CreatePotModal 폼 제출 → 실제 Supabase INSERT
  const handleConfirmCreate = async (name, emoji, count, durationMinutes) => {
    if (!createPotSpot || creating) return;

    setCreating(true);
    const pot = await createPot({
      name,
      emoji,
      spotId: createPotSpot.id,
      maxMembers: count,
      durationMinutes,
    });
    setCreating(false);

    if (!pot) {
      showToast('팟 생성 실패. 다시 시도해주세요.');
      return;
    }

    showToast(`"${name}" 팟이 생성됐어요! 🎉`);
    setCreatePotSpot(null);
    // (Realtime이 자동으로 카운트/목록 갱신)
  };

  // 커스텀 핀 모달 확정 (지금은 토스트만 — 추후 createPot 호출로 확장 가능)
  const handleCustomConfirm = (name, emoji, count) => {
    showToast(`"${name}" 팟이 생성됐어요! 🎉`);
    setCustomPin(null);
  };

  const handleCustomClose = () => {
    setCustomPin(null);
  };

  // 활성 팟 카드 → 멤버십/마감 여부에 따라 분기 (PotsScreen과 동일 패턴)
  const handleOpenPotChat = (pot) => {
    if (!pot) return;
    const isMember = myPotIds.has(pot.id);

    // 1) 멤버 → SpotModal 닫고 채팅방 바로 진입
    if (isMember) {
      setSelectedSpot(null);
      setActivePot(pot);
      return;
    }

    // 2) 비멤버 + 마감 → 토스트 (자동 마감 fetch 필터링 때문에 거의 안 발생, 안전장치)
    if (pot.isClosed) {
      showToast('마감된 팟이에요');
      return;
    }

    // 3) 비멤버 + 모집중 → PotPreview (콜백으로 ref 저장 → focus 복귀 시 ChatScreen 띄움)
    setSelectedSpot(null);  // SpotModal 닫기
    navigation?.navigate('PotPreview', {
      potId: pot.id,
      onJoined: (joinedPot) => {
        pendingChatPotRef.current = joinedPot;
        setMyPotIds((prev) => new Set([...prev, joinedPot.id]));
      },
    });
  };

  return (
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

      {!placingMode && (
        <NearbySheet
          expanded={sheetExpanded}
          onToggle={() => setSheetExpanded(!sheetExpanded)}
          userLocation={userLocation}
          pools={allPools}
          onPotPress={handleOpenPotChat}
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
        onClose={() => {
          setActivePot(null);
          navigation?.navigate('Tabs', { screen: 'Chat' });
        }}
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
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  map: { flex: 1 },
});
