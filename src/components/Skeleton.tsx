import React from 'react';
import { View, StyleSheet, Animated, useWindowDimensions } from 'react-native';
import { colors } from '../theme/colors';

export function Shimmer({ width, height, radius = 8 }: { width: number | `${number}%`; height: number; radius?: number }) {
  const anim = new Animated.Value(0);

  Animated.loop(
    Animated.timing(anim, {
      toValue: 1,
      duration: 1200,
      useNativeDriver: true,
    })
  ).start();

  const translateX = anim.interpolate({
    inputRange: [0, 1],
    outputRange: [-200, 200],
  });

  return (
    <View style={[styles.base, { width: width as any, height, borderRadius: radius, overflow: 'hidden' }]}>
      <Animated.View style={[styles.gradient, { transform: [{ translateX }] }]} />
    </View>
  );
}

export function CardSkeleton() {
  return (
    <View style={styles.card}>
      <Shimmer width="100%" height={120} radius={12} />
      <Shimmer width="75%" height={14} radius={4} />
      <Shimmer width="50%" height={12} radius={4} />
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  gradient: {
    width: 200,
    height: '100%',
    backgroundColor: 'rgba(255,255,255,0.15)',
  },
  card: {
    width: 140,
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 8,
    gap: 8,
  },
});
