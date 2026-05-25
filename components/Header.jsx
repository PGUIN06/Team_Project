import React from 'react';
import { View, Text, Pressable, StyleSheet, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS, FONTS } from '../utils/theme';

// 검색 기능 임시 숨김 — 추후 부활 시 true로 변경. 코드/스타일 모두 유지.
const SHOW_SEARCH = false;

export default function Header({ placingMode, onCancelPlacing, onSearch }) {
  const insets = useSafeAreaInsets();
  const topPad = Math.max(insets.top, 12);

  if (placingMode) {
    return (
      <View
        style={[
          styles.header,
          styles.headerPlacing,
          { paddingTop: topPad },
        ]}
      >
        <Pressable
          style={[styles.iconBtn, styles.iconBtnPlacing]}
          onPress={onCancelPlacing}
        >
          <Text style={styles.closeX}>✕</Text>
        </Pressable>
        <View style={styles.placingTitle}>
          <Text style={styles.placingTitleMain}>📍 핀 찍기 모드</Text>
          <Text style={styles.placingTitleSub}>먹고 싶은 위치를 탭하세요</Text>
        </View>
        <View style={{ width: 40 }} />
      </View>
    );
  }

  return (
    <View style={[styles.header, { paddingTop: topPad }]}>
      <View style={styles.brand}>
        <View style={styles.brandLogo}>
          <Text style={styles.brandLogoText}>대팟</Text>
        </View>
        <View>
          <Text style={styles.brandMain}>캠퍼스 지도</Text>
          <Text style={styles.brandSub}>대구대 경산캠퍼스</Text>
        </View>
      </View>
      {SHOW_SEARCH && (
        <Pressable style={styles.iconBtn} onPress={onSearch}>
          <Text style={styles.searchIcon}>🔍</Text>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
    paddingHorizontal: 16,
    paddingBottom: 12,
    backgroundColor: 'rgba(255,255,255,0.98)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerPlacing: {
    backgroundColor: COLORS.accent,
  },
  brand: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  brandLogo: {
    width: 38,
    height: 38,
    borderRadius: 14,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  brandLogoText: {
    color: 'white',
    fontFamily: FONTS.display,
    fontSize: 15,
  },
  brandMain: {
    fontFamily: FONTS.display,
    fontSize: 16,
    color: COLORS.text1,
    includeFontPadding: false,
    textAlignVertical: 'center',
  },
  brandSub: {
    fontSize: 10,
    color: COLORS.text3,
    fontFamily: FONTS.medium,
    marginTop: 2,
    includeFontPadding: false,
    textAlignVertical: 'center',
  },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.surface,
    alignItems: 'center',
    justifyContent: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 8,
      },
      android: { elevation: 3 },
    }),
  },
  iconBtnPlacing: {
    backgroundColor: 'rgba(0,0,0,0.1)',
  },
  searchIcon: { fontSize: 16 },
  closeX: { fontSize: 18, color: COLORS.text1, fontWeight: '700' },
  placingTitle: { alignItems: 'center' },
  placingTitleMain: {
    fontFamily: FONTS.display,
    fontSize: 16,
    color: COLORS.text1,
  },
  placingTitleSub: {
    fontSize: 10,
    fontFamily: FONTS.bold,
    opacity: 0.7,
    color: COLORS.text1,
  },
});
