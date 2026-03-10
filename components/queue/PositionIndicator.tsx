// PositionIndicator COMPONENT
// Big circle showing the user's current position in line
// Used on the waiting screen

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Colors, BorderRadius } from '../../constants/theme';

interface PositionIndicatorProps {
  position: number;
}

export function PositionIndicator({ position }: PositionIndicatorProps) {
  return (
    <View style={styles.circle}>
      <Text style={styles.positionNumber}>{position}</Text>
      <Text style={styles.positionLabel}>in line</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  circle: {
    width: 110,
    height: 110,
    borderRadius: 55, // Half of width/height for perfect circle
    backgroundColor: Colors.light.tint,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    marginBottom: 24,
  },
  positionNumber: {
    color: '#fff',
    fontSize: 44,
    fontWeight: '700',
    lineHeight: 48,
  },
  positionLabel: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 13,
  },
});
