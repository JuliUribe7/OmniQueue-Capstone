// ServiceCard COMPONENT
// Displays a single service option in the selection grid
// Shows service name, estimated wait time, and queue count

import React from 'react';
import {
  TouchableOpacity,
  Text,
  View,
  StyleSheet
} from 'react-native';
import { Colors, BorderRadius, Spacing } from '../../constants/theme';
import { Service } from '../../services/queueService';
import { formatWaitTime, calculateWaitTime } from '../../hooks/useQueue';

interface ServiceCardProps {
  service: Service;
  onPress: (service: Service) => void;
}

export function ServiceCard({ service, onPress }: ServiceCardProps) {
  const waitTime = calculateWaitTime(service);

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={() => onPress(service)}
      activeOpacity={0.7}
    >
      {/* Service name */}
      <Text style={styles.serviceName}>{service.name}</Text>

      {/* Wait time badge */}
      <View style={styles.waitBadge}>
        <Text style={styles.waitBadgeText}>
          ~{formatWaitTime(waitTime)} wait
        </Text>
      </View>

      {/* Queue count */}
      <Text style={styles.queueCount}>
        {service.currentQueue} in line
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.light.background,
    borderWidth: 2,
    borderColor: Colors.light.inputBorder,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    alignItems: 'center',
    gap: Spacing.sm,
  },
  serviceName: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.light.text,
    textAlign: 'center',
  },
  waitBadge: {
    backgroundColor: Colors.light.tint,
    paddingHorizontal: Spacing.sm + 2,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.sm + 2,
  },
  waitBadgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  queueCount: {
    fontSize: 12,
    color: Colors.light.icon,
  },
});
