# 대팟 (DaePot) — iOS + Android

대구대 경산캠퍼스 배달 핀포인트 앱. React Native (Expo SDK 56) 기반.

지도 엔진은 **카카오맵 JavaScript SDK + WebView** 조합. iOS는 Xcode, Android는 Gradle/Android Studio로 네이티브 빌드.

## 사전 준비

### 공통
- Node.js 18+
- 카카오 개발자 계정 (앱 만들고 JS 키 + REST 키 발급)

### iOS 빌드용 (macOS만)
- Xcode
- CocoaPods (`brew install cocoapods`)
- Watchman (`brew install watchman`)

### Android 빌드용
- Android Studio (Android SDK + Emulator + JDK 17 번들)
- Android SDK 도구: **NDK** + **CMake 3.22.1** (Android Studio SDK Manager에서 설치)

## 빠른 시작

```bash
# 1. 의존성 설치
npm install

# 2. 카카오 키 등록 (아래 "환경 변수" 섹션 참고)
cp .env.example .env.local
# .env.local 열어서 실제 키 채우기
```

### iOS 빌드

```bash
# 네이티브 프로젝트 생성
npx expo prebuild --platform ios

# CocoaPods 설치
cd ios && pod install && cd ..

# Xcode로 열고 빌드
open ios/app.xcworkspace
```

Xcode에서 폰 연결 → 디바이스 선택 → `Cmd+R`로 빌드 (Release 권장).

### Android 빌드

```bash
# 네이티브 프로젝트 생성
npx expo prebuild --platform android

# 에뮬레이터 시작 (DNS 명시 필수, 아래 트러블슈팅 참고)
~/Library/Android/sdk/emulator/emulator -avd <AVD_NAME> \
  -dns-server 8.8.8.8,1.1.1.1 -no-snapshot-load &

# Metro 서버 시작
npx expo start &

# 빌드 + 설치 + 실행
cd android
./gradlew app:assembleDebug
~/Library/Android/sdk/platform-tools/adb reverse tcp:8081 tcp:8081
~/Library/Android/sdk/platform-tools/adb install -r \
  app/build/outputs/apk/debug/app-debug.apk
~/Library/Android/sdk/platform-tools/adb shell am start \
  -n com.daegu.daepot/.MainActivity
```

## 환경 변수 (카카오 키)

`.env.local` 파일에 키를 박아두면 빌드 시점에 자동 주입됩니다.

```bash
KAKAO_JS_API_KEY=...      # JavaScript 키 (WebView 카카오맵용)
KAKAO_REST_API_KEY=...    # REST API 키 (좌표→주소 변환용)
```

### 키 발급 방법

1. https://developers.kakao.com → 내 애플리케이션 → 새 앱 만들기
2. 좌측 **앱 설정 → 플랫폼 키** 메뉴
3. **JavaScript 키**, **REST API 키** 두 개 복사 → `.env.local`에 붙여넣기
4. **JavaScript 키 카드 클릭 → JavaScript SDK 도메인** 에 `http://localhost` 추가 (WebView origin)

## 폴더 구조

```
.
├── App.js                          # 메인 진입점, 모든 상태 관리
├── app.json                        # Expo 설정 (placeholder 키)
├── app.config.js                   # 환경 변수로 키 오버라이드
├── .env.example                    # 환경 변수 예시
├── .env.local                      # (gitignored) 실제 키
├── components/
│   ├── Header.jsx                  # 상단 헤더 + 핀 모드 헤더
│   ├── MapOverlays.jsx             # GPS 버튼 / FAB / 핀 모드 힌트 / 팟 카운터
│   ├── KakaoMapWebView.jsx         # 카카오맵 WebView 래퍼
│   ├── NearbySheet.jsx             # 하단 바텀시트
│   ├── SpotModal.jsx               # 스팟 상세 모달
│   ├── CustomPinModal.jsx          # 핀 찍은 위치에서 팟 만들기
│   ├── CustomMarker.jsx            # (현재 미사용 — Apple Maps 시절 잔재)
│   └── Toast.jsx                   # 상단 토스트
├── data/
│   └── campusData.js               # 16개 스팟 + 더미 활성 팟
├── utils/
│   ├── theme.js                    # 색상/폰트 상수
│   ├── distance.js                 # Haversine 거리 계산
│   └── geocoding.js                # 카카오 REST 좌표→주소
├── ios/                            # Xcode 네이티브 프로젝트 (gitignored)
└── android/                        # Gradle 네이티브 프로젝트 (gitignored)
```

## 기능

- 16개 캠퍼스 스팟 마커 (카테고리별 색상, 활성 팟 카운트 표시)
- 활성 팟 25개 더미 데이터 + 거리순 정렬
- "여기서 같이 먹기" → 핀 찍기 모드 → 커스텀 위치 모달
- 스팟 클릭 → 상세 모달 → 배달 주소 복사
- 내 주변 인기 팟 바텀시트 (접힘/펼침)
- GPS 현재 위치
- 토스트 알림

## 빌드 메모

### 공통
- **New Architecture(Fabric) 비활성화** 상태 (`app.json`의 `newArchEnabled: false`)
- 카카오 SDK가 일부 모듈을 HTTP로 다운로드해서 **평문 트래픽 허용 필수**
  - iOS: `NSAppTransportSecurity` 예외 (`daumcdn.net`, `kakao.com`)
  - Android: `android:usesCleartextTraffic="true"` in `<application>`

### iOS
- 빌드 모드: **Release 권장** — JS 번들이 앱에 박혀 Metro 없이 동작. (Debug는 Metro 서버와 같은 와이파이 필수)
- 무료 Apple ID로 서명 시 앱이 7일 후 만료 → Xcode에서 다시 빌드하면 갱신

### Android
- Gradle 버전 **8.13** 사용 (9.x는 RN 플러그인 비호환, 8.10 이하는 AGP 비호환)
- NDK **30.0.14904198** (또는 설치된 최신) 자동 사용 (`android/gradle.properties`의 `ndkVersion`)
- CMake **3.22.1** 필수 (Android Studio SDK Manager → SDK Tools → "Show Package Details" 켜고 설치)
- New Architecture는 `android/gradle.properties`에 `newArchEnabled=false`로 별도 설정 필요
- 에뮬레이터는 **`-dns-server 8.8.8.8,1.1.1.1` 옵션 필수** (핫스팟/특수 네트워크 환경에서 DNS 안 풀림)
- Debug 빌드 시 `adb reverse tcp:8081 tcp:8081`로 Metro 포트 포워딩

## 알려진 한계

- **카카오맵이 WebView 안에서 동작** → 순수 네이티브 대비 약간의 성능 손해 (대부분의 경우 체감 거의 없음)
- **개발자 모드 폰** + Xcode/Android Studio 빌드 필요 (App Store / Play Store 배포 X)

## 트러블슈팅

### 공통
- **흰 화면 (지도 안 뜸)**: 카카오 콘솔의 JavaScript SDK 도메인에 `http://localhost` 등록됐는지 확인
- **`expo-asset` not found**: `npx expo install --fix` 실행

### iOS
- **`No script URL provided`**: Debug 빌드에서 Metro 서버와 같은 와이파이가 아님 → Release 빌드로 전환 권장
- **빌드 중 ReactCodegen 에러**: `ios/` 폴더 지우고 `npx expo prebuild --platform ios --clean` 다시

### Android
- **`Class JvmVendorSpec does not have member field IBM_SEMERU`**: Gradle 9.x 비호환. `android/gradle/wrapper/gradle-wrapper.properties`에서 `gradle-8.13-bin.zip`으로 변경
- **`NDK not configured`**: Android Studio SDK Manager에서 NDK 설치. 설치된 버전을 `android/gradle.properties`의 `ndkVersion=`에 명시
- **`CMake '3.22.1' was not found`**: SDK Manager → SDK Tools → "Show Package Details" 켜고 CMake 3.22.1 설치
- **`Could not find com.kakao.sdk:...`**: 안 쓰는 `@react-native-kakao/*` 패키지가 npm에 있으면 자동 링크되어 충돌. 제거 (`npm uninstall @react-native-kakao/core @react-native-kakao/map`)
- **에뮬레이터에서 지도 안 뜨고 `ERR_NAME_NOT_RESOLVED`**: DNS 문제. 에뮬레이터 시작할 때 `-dns-server 8.8.8.8,1.1.1.1` 옵션 추가
- **에뮬레이터 시작 직후 크래시 (macOS Tahoe 26+)**: 에뮬레이터를 다시 시작하면 보통 풀림
