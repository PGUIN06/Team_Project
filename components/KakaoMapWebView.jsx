import { forwardRef, useImperativeHandle, useRef, useCallback, useEffect } from 'react';
import { StyleSheet } from 'react-native';
import { WebView } from 'react-native-webview';
import Constants from 'expo-constants';

const KAKAO_JS_KEY = Constants.expoConfig?.extra?.kakaoJsApiKey || '';

const KakaoMapWebView = forwardRef(function KakaoMapWebView(
  {
    spots = [],
    poolCounts = {},
    customPots = [],
    userLocation,
    customPin,
    placingMode = false,
    onSpotPress,
    onCustomPotPress,
    onMapPress,
    style,
  },
  ref
) {
  const webRef = useRef(null);
  const readyRef = useRef(false);
  const pendingRef = useRef([]);

  const send = useCallback((obj) => {
    const payload = JSON.stringify(obj).replace(/\\/g, '\\\\').replace(/"/g, '\\"');
    const js = `window.__handleRNMessage && window.__handleRNMessage("${payload}"); true;`;
    if (readyRef.current && webRef.current) {
      webRef.current.injectJavaScript(js);
    } else {
      pendingRef.current.push(js);
    }
  }, []);

  useImperativeHandle(
    ref,
    () => ({
      animateToRegion(region, duration) {
        send({
          type: 'animateTo',
          lat: region.latitude,
          lng: region.longitude,
          delta: region.latitudeDelta,
          duration: duration || 400,
        });
      },
    }),
    [send]
  );

  // Push spots whenever they (or pool counts) change
  useEffect(() => {
    send({
      type: 'setSpots',
      spots: spots.map((s) => ({
        id: s.id,
        lat: s.lat,
        lng: s.lng,
        color: s.color,
        label: s.short || s.name,
        count: poolCounts[s.id] || 0,
      })),
    });
  }, [spots, poolCounts, send]);

  // 임의 위치 팟 마커 — 노란 핀 + 이모지 + 카운트
  useEffect(() => {
    send({
      type: 'setCustomPots',
      pots: customPots
        .filter((p) => p.latitude != null && p.longitude != null)
        .map((p) => ({
          id: p.id,
          lat: Number(p.latitude),
          lng: Number(p.longitude),
          emoji: p.emoji || '🍗',
          name: p.name || '',
          current: p.current ?? 0,
          max: p.max ?? 0,
        })),
    });
  }, [customPots, send]);

  useEffect(() => {
    if (userLocation) {
      send({ type: 'setUser', lat: userLocation.lat, lng: userLocation.lng });
    }
  }, [userLocation, send]);

  useEffect(() => {
    send({
      type: 'setCustomPin',
      pin: customPin ? { lat: customPin.lat, lng: customPin.lng } : null,
    });
  }, [customPin, send]);

  useEffect(() => {
    send({ type: 'setPlacingMode', placing: !!placingMode });
  }, [placingMode, send]);

  const handleMessage = (e) => {
    let data;
    try {
      data = JSON.parse(e.nativeEvent.data);
    } catch {
      return;
    }
    if (data.type === 'ready') {
      readyRef.current = true;
      pendingRef.current.forEach((js) => webRef.current?.injectJavaScript(js));
      pendingRef.current = [];
    } else if (data.type === 'spotPress') {
      const spot = spots.find((s) => s.id === data.id);
      if (spot) onSpotPress?.(spot);
    } else if (data.type === 'customPotPress') {
      const pot = customPots.find((p) => p.id === data.id);
      if (pot) onCustomPotPress?.(pot);
    } else if (data.type === 'mapPress') {
      // Mimic react-native-maps' event shape so the existing App.js handler works as-is
      onMapPress?.({
        nativeEvent: {
          coordinate: { latitude: data.lat, longitude: data.lng },
        },
      });
    }
  };

  return (
    <WebView
      ref={webRef}
      style={[styles.web, style]}
      source={{ html: buildHTML(KAKAO_JS_KEY), baseUrl: 'http://localhost' }}
      onMessage={handleMessage}
      javaScriptEnabled
      domStorageEnabled
      originWhitelist={['*']}
      bounces={false}
      scrollEnabled={false}
      overScrollMode="never"
      androidLayerType="hardware"
      setSupportMultipleWindows={false}
      webviewDebuggingEnabled={true}
    />
  );
});

function buildHTML(apiKey) {
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
  <style>
    html, body { margin: 0; padding: 0; width: 100%; height: 100%; overflow: hidden; -webkit-tap-highlight-color: transparent; -webkit-user-select: none; user-select: none; touch-action: manipulation; }
    #map { width: 100%; height: 100%; background: #f5f5f5; }
    .m-wrap { position: relative; cursor: pointer; pointer-events: auto; }
    .m-pin {
      width: 30px; height: 30px;
      border-radius: 50% 50% 50% 0;
      transform: rotate(-45deg);
      box-shadow: 0 2px 4px rgba(0,0,0,0.3);
      display: flex; align-items: center; justify-content: center;
      color: white; font-weight: 800; font-size: 13px;
    }
    .m-pin .c { transform: rotate(45deg); }
    .m-label {
      position: absolute;
      top: 32px; left: 50%;
      transform: translateX(-50%);
      background: rgba(255,255,255,0.96);
      padding: 2px 6px;
      border-radius: 8px;
      font-size: 11px;
      font-weight: 700;
      color: #222;
      white-space: nowrap;
      box-shadow: 0 1px 3px rgba(0,0,0,0.2);
      font-family: -apple-system, BlinkMacSystemFont, sans-serif;
    }
    .user-dot {
      width: 16px; height: 16px;
      border-radius: 50%;
      background: #3B82F6;
      border: 3px solid white;
      box-shadow: 0 0 0 3px rgba(59,130,246,0.35);
    }
    .cust-pin {
      width: 28px; height: 28px;
      border-radius: 50% 50% 50% 0;
      transform: rotate(-45deg);
      background: #FCD34D;
      box-shadow: 0 2px 4px rgba(0,0,0,0.3);
      border: 2px solid white;
    }
    /* 임의 위치 팟 마커 — 캠퍼스 스팟과 구분 (노란색 + 이모지) */
    .cp-wrap { position: relative; cursor: pointer; pointer-events: auto; }
    .cp-pin {
      width: 36px; height: 36px;
      border-radius: 50% 50% 50% 0;
      transform: rotate(-45deg);
      background: #FCD34D;
      border: 2px solid white;
      box-shadow: 0 2px 4px rgba(0,0,0,0.3);
      display: flex; align-items: center; justify-content: center;
    }
    .cp-emoji { transform: rotate(45deg); font-size: 16px; line-height: 1; }
    body.placing #map { cursor: crosshair; }
  </style>
  <script src="https://dapi.kakao.com/v2/maps/sdk.js?appkey=${apiKey}&autoload=true"></script>
</head>
<body>
  <div id="map"></div>
  <script>
    var map = null;
    var overlays = {};
    var customPotOverlays = {};
    var userOverlay = null;
    var pinOverlay = null;

    function post(obj) {
      try {
        window.ReactNativeWebView && window.ReactNativeWebView.postMessage(JSON.stringify(obj));
      } catch (e) {}
    }

    window.__handleSpotClick = function(id) {
      post({ type: 'spotPress', id: id });
    };

    window.__handleCustomPotClick = function(id) {
      post({ type: 'customPotPress', id: id });
    };

    function clearSpots() {
      Object.keys(overlays).forEach(function(id) { overlays[id].setMap(null); });
      overlays = {};
    }

    function clearCustomPots() {
      Object.keys(customPotOverlays).forEach(function(id) { customPotOverlays[id].setMap(null); });
      customPotOverlays = {};
    }

    function escapeHtml(s) {
      return String(s).replace(/[&<>"']/g, function(c) {
        return { '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c];
      });
    }

    function setSpots(spots) {
      clearSpots();
      spots.forEach(function(s) {
        var label = escapeHtml(s.label);
        var color = escapeHtml(s.color);
        var idAttr = escapeHtml(s.id);
        var countTxt = s.count > 0 ? s.count : '';
        var html =
          '<div class="m-wrap" onclick="window.__handleSpotClick(\\''+idAttr+'\\')">' +
            '<div class="m-pin" style="background:'+color+'"><span class="c">'+countTxt+'</span></div>' +
            '<div class="m-label">'+label+'</div>' +
          '</div>';
        var ov = new kakao.maps.CustomOverlay({
          map: map,
          position: new kakao.maps.LatLng(s.lat, s.lng),
          content: html,
          xAnchor: 0.5,
          yAnchor: 1,
          zIndex: 3,
          clickable: true
        });
        overlays[s.id] = ov;
      });
    }

    function setCustomPots(pots) {
      clearCustomPots();
      pots.forEach(function(p) {
        var idAttr = escapeHtml(p.id);
        var emoji = escapeHtml(p.emoji);
        var name = escapeHtml(p.name);
        var countTxt = p.current + '/' + p.max;
        var html =
          '<div class="cp-wrap" onclick="window.__handleCustomPotClick(\\''+idAttr+'\\')">' +
            '<div class="cp-pin"><span class="cp-emoji">'+emoji+'</span></div>' +
            '<div class="m-label">'+name+' '+countTxt+'</div>' +
          '</div>';
        var ov = new kakao.maps.CustomOverlay({
          map: map,
          position: new kakao.maps.LatLng(p.lat, p.lng),
          content: html,
          xAnchor: 0.5,
          yAnchor: 1,
          zIndex: 3,
          clickable: true
        });
        customPotOverlays[p.id] = ov;
      });
    }

    function setUser(lat, lng) {
      var pos = new kakao.maps.LatLng(lat, lng);
      if (!userOverlay) {
        userOverlay = new kakao.maps.CustomOverlay({
          map: map, position: pos,
          content: '<div class="user-dot"></div>',
          xAnchor: 0.5, yAnchor: 0.5, zIndex: 4
        });
      } else {
        userOverlay.setPosition(pos);
      }
    }

    function setCustomPin(pin) {
      if (!pin) {
        if (pinOverlay) { pinOverlay.setMap(null); pinOverlay = null; }
        return;
      }
      var pos = new kakao.maps.LatLng(pin.lat, pin.lng);
      if (!pinOverlay) {
        pinOverlay = new kakao.maps.CustomOverlay({
          map: map, position: pos,
          content: '<div class="cust-pin"></div>',
          xAnchor: 0.5, yAnchor: 1, zIndex: 5
        });
      } else {
        pinOverlay.setPosition(pos);
      }
    }

    function animateTo(lat, lng, delta) {
      if (!map) return;
      var level = 3;
      if (delta) {
        if (delta >= 0.02) level = 5;
        else if (delta >= 0.01) level = 4;
        else if (delta >= 0.005) level = 3;
        else level = 2;
      }
      map.setLevel(level);
      map.panTo(new kakao.maps.LatLng(lat, lng));
    }

    window.__handleRNMessage = function(msg) {
      try {
        var data = JSON.parse(msg);
        switch (data.type) {
          case 'setSpots': setSpots(data.spots); break;
          case 'setCustomPots': setCustomPots(data.pots); break;
          case 'setUser': setUser(data.lat, data.lng); break;
          case 'setCustomPin': setCustomPin(data.pin); break;
          case 'setPlacingMode':
            document.body.classList.toggle('placing', !!data.placing);
            break;
          case 'animateTo': animateTo(data.lat, data.lng, data.delta); break;
        }
      } catch (e) {
        post({ type: 'error', msg: String(e) });
      }
    };

    function init() {
      map = new kakao.maps.Map(document.getElementById('map'), {
        center: new kakao.maps.LatLng(35.9004, 128.8495),
        level: 4
      });
      kakao.maps.event.addListener(map, 'click', function(me) {
        var ll = me.latLng;
        post({ type: 'mapPress', lat: ll.getLat(), lng: ll.getLng() });
      });
      post({ type: 'ready' });
    }

    if (window.kakao && window.kakao.maps && window.kakao.maps.Map) {
      init();
    } else {
      var iv = setInterval(function() {
        if (window.kakao && window.kakao.maps && window.kakao.maps.Map) {
          clearInterval(iv);
          init();
        }
      }, 100);
    }
  </script>
</body>
</html>`;
}

const styles = StyleSheet.create({
  web: { flex: 1, backgroundColor: 'transparent' },
});

export default KakaoMapWebView;
