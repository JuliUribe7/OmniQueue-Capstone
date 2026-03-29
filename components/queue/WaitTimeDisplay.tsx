// WaitTimeDisplay COMPONENT
// Shows the estimated wait time in a large, readable format
// Used on confirmation and waiting screens

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Colors, BorderRadius, Spacing } from '../../constants/theme';
import { formatWaitTime } from '../../hooks/useQueue';

interface WaitTimeDisplayProps {
  minutes: number;
  label?: string;
  // 'dark' puts it on a dark background, 'light' on white
  variant?: 'dark' | 'light';
  // Extra detail text below the time
  detail?: string;
}

export function WaitTimeDisplay({
  minutes,
  label = 'Estimated Wait',
  variant = 'light',
  detail,
}: WaitTimeDisplayProps) {
  const isDark = variant === 'dark';

  return (
    <View style={[styles.container, isDark && styles.containerDark]}>
      {/* Label above the time */}
      <Text style={[styles.label, isDark && styles.labelDark]}>
        {label}
      </Text>

      {/* The big time display */}
      <Text style={[styles.time, isDark && styles.timeDark]}>
        {formatWaitTime(minutes)}
      </Text>

      {/* Optional detail text */}
      {detail && (
        <Text style={[styles.detail, isDark && styles.detailDark]}>
          {detail}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    paddingVertical: Spacing.lg,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.xl,
    marginBottom: Spacing.lg,
  },
  containerDark: {
    backgroundColor: Colors.dark.background,
  },
  label: {
    fontSize: 13,
    color: Colors.light.icon,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: Spacing.sm,
  },
  labelDark: {
    color: Colors.dark.icon,
  },
  time: {
    fontSize: 36,
    fontWeight: '700',
    color: Colors.light.text,
    letterSpacing: -0.5,
  },
  timeDark: {
    color: Colors.dark.text,
  },
  detail: {
    fontSize: 13,
    color: Colors.light.icon,
    marginTop: Spacing.sm,
    textAlign: 'center',
  },
  detailDark: {
    color: Colors.dark.icon,
  },
});
