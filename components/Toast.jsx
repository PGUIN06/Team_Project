import React, { useEffect, useRef } from 'react';
import { Animated, Text, StyleSheet, Platform } from 'react-native';
import { COLORS, FONTS } from '../utils/theme';

export default function Toast({ message, onDismiss }) {
  const anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // In
    Animated.timing(anim, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
    }).start();

    // Auto out
    const timer = setTimeout(() => {
      Animated.timing(anim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }).start(() => onDismiss && onDismiss());
    }, 2400);

    return () => clearTimeout(timer);
  }, []);

  const translateY = anim.interpolate({
    inputRange: [0, 1],
    outputRange: [-20, 0],
  });

  return (
    <Animated.View
      style={[styles.toast, { opacity: anim, transform: [{ translateY }] }]}
      pointerEvents="none"
    >
      <Text style={styles.text}>✓ {message}</Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  toast: {
    position: 'absolute',
    top: 110,
    left: '10%',
    right: '10%',
    alignSelf: 'center',
    backgroundColor: COLORS.text1,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 999,
    alignItems: 'center',
    zIndex: 200,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.25,
        shadowRadius: 24,
      },
      android: { elevation: 8 },
    }),
  },
  text: {
    color: 'white',
    fontSize: 13,
    fontFamily: FONTS.bold,
  },
});
