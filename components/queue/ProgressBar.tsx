// ProgressBar COMPONENT
// Visual indicator of how close the user is to the front of the queue
// Fills up as they move forward in line

import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Colors, BorderRadius, Spacing } from '../../constants/theme';

interface ProgressBarProps {
  // Current position in queue
  position: number;
  // Total people that were ahead when they joined
  totalAhead: number;
}

export function ProgressBar({ position, totalAhead }: ProgressBarProps) {
  // Calculate percentage complete (inverse of position)
  // Position 1 of 5 = 80% complete, Position 5 of 5 = 0% complete
  const progress = Math.max(10, 100 - (position / (totalAhead + 1)) * 100);

  return (
    <View style={styles.container}>
      <View style={[styles.fill, { width: `${progress}%` }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    height: 8,
    backgroundColor: Colors.light.inputBorder,
    borderRadius: BorderRadius.sm / 2,
    overflow: 'hidden',
    marginBottom: Spacing.lg,
  },
  fill: {
    height: '100%',
    backgroundColor: Colors.light.tint,
    borderRadius: BorderRadius.sm / 2,
  },
});
