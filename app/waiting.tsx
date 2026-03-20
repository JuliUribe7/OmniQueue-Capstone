// Waiting screen — shown after a customer joins the queue
// Lives at /waiting so browser refresh keeps the customer here instead of
// sending them back to the beginning of the portal

import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

import { Colors, BorderRadius, Spacing } from '@/constants/theme';
import { SnoozeModal } from '@/components/queue';
import { useQueue, formatWaitTime, SNOOZE_OPTIONS } from '@/hooks/useQueue';

const BUSINESS_NAME = 'Classic Cuts Barbershop';

export default function WaitingScreen() {
  const router = useRouter();
  const {
    currentStep,
    selectedService,
    customerName,
    phoneNumber,
    queuePosition,
    estimatedWait,
    snoozeSpot,
    leaveQueue,
  } = useQueue();

  const [showSnoozeModal, setShowSnoozeModal] = useState(false);
  const [snoozeIndex, setSnoozeIndex] = useState(0);

  // If no active session redirect back to portal
  if (!selectedService || (currentStep !== 'waiting' && currentStep !== 'snoozed' && currentStep !== 'called')) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar style="light" />
        <View style={styles.center}>
          <Text style={styles.oopsText}>No active queue session.</Text>
          <TouchableOpacity style={styles.backBtn} onPress={() => router.replace('/')}>
            <Text style={styles.backBtnText}>Back to Portal</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // Customer has been called
  if (currentStep === 'called') {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar style="light" />
        <View style={styles.header}>
          <Text style={styles.businessName}>{BUSINESS_NAME}</Text>
        </View>
        <View style={styles.content}>
          <View style={[styles.card, styles.calledCard]}>
            <View style={styles.calledIcon}>
              <Text style={styles.calledIconText}>!</Text>
            </View>
            <Text style={styles.calledTitle}>{customerName.split(' ')[0]}, You're Up!</Text>
            <Text style={styles.calledSubtitle}>Please head to the front desk</Text>
            <View style={styles.calledService}>
              <Text style={styles.calledServiceText}>{selectedService.name}</Text>
            </View>
            <TouchableOpacity
              style={styles.calledSnoozeButton}
              onPress={() => setShowSnoozeModal(true)}
              activeOpacity={0.7}
            >
              <Text style={styles.calledSnoozeText}>Need a few more minutes?</Text>
            </TouchableOpacity>
          </View>
        </View>
        <SnoozeModal
          visible={showSnoozeModal}
          onClose={() => setShowSnoozeModal(false)}
          onSnooze={(minutes) => {
            const idx = SNOOZE_OPTIONS.findIndex(o => o.value === minutes);
            setSnoozeIndex(idx >= 0 ? idx : 0);
            snoozeSpot(minutes);
          }}
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="light" />

      <View style={styles.header}>
        <Text style={styles.businessName}>{BUSINESS_NAME}</Text>
        <Text style={styles.tagline}>Smart Queue System</Text>
      </View>

      <View style={styles.content}>
        <View style={styles.card}>

          {/* Green checkmark */}
          <View style={styles.successIconWrap}>
            <Text style={styles.successIcon}>✓</Text>
          </View>
          <Text style={styles.successTitle}>You're in the queue!</Text>
          <Text style={styles.successName}>
            {customerName.split(' ')[0]} • {selectedService.name}
          </Text>

          {currentStep === 'snoozed' && (
            <View style={styles.snoozeBanner}>
              <Text style={styles.snoozeBannerText}>
                Spot moved back {SNOOZE_OPTIONS[snoozeIndex].label}
              </Text>
            </View>
          )}

          {/* Position + wait time */}
          <View style={styles.positionRow}>
            <View style={styles.positionBox}>
              <Text style={styles.positionNumber}>{queuePosition || 1}</Text>
              <Text style={styles.positionLabel}>in line</Text>
            </View>
            <View style={styles.dividerLine} />
            <View style={styles.waitBox}>
              <Text style={styles.waitNumber}>
                {estimatedWait != null && estimatedWait > 0
                  ? formatWaitTime(estimatedWait)
                  : estimatedWait === 0 ? "Almost up!" : '—'}
              </Text>
              <Text style={styles.waitLabel}>estimated wait</Text>
            </View>
          </View>

          <Text style={styles.smsNote}>We'll text {phoneNumber} when you're up</Text>

          {/* Buttons */}
          <View style={styles.actionButtons}>
            <TouchableOpacity
              style={styles.snoozeButton}
              onPress={() => setShowSnoozeModal(true)}
              activeOpacity={0.7}
            >
              <Text style={styles.snoozeButtonText}>Running Late?</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.leaveButton}
              onPress={async () => {
                await leaveQueue();
                router.replace('/');
              }}
              activeOpacity={0.7}
            >
              <Text style={styles.leaveButtonText}>Leave Queue</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      <View style={styles.footer}>
        <Text style={styles.footerText}>
          Powered by <Text style={styles.footerBold}>OmniQueue</Text>
        </Text>
      </View>

      <SnoozeModal
        visible={showSnoozeModal}
        onClose={() => setShowSnoozeModal(false)}
        onSnooze={(minutes) => {
          const idx = SNOOZE_OPTIONS.findIndex(o => o.value === minutes);
          setSnoozeIndex(idx >= 0 ? idx : 0);
          snoozeSpot(minutes);
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.dark.background,
  },
  header: {
    padding: Spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
  },
  businessName: {
    fontSize: 24,
    fontWeight: '700',
    color: Colors.dark.text,
    letterSpacing: -0.5,
  },
  tagline: {
    fontSize: 14,
    color: Colors.dark.icon,
    marginTop: 4,
  },
  content: {
    flex: 1,
    padding: Spacing.lg,
    justifyContent: 'center',
  },
  card: {
    backgroundColor: Colors.light.background,
    borderRadius: BorderRadius.xl,
    padding: Spacing.lg,
    alignItems: 'center',
  },
  successIconWrap: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#22c55e',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.md,
  },
  successIcon: {
    fontSize: 40,
    color: '#fff',
    fontWeight: '700',
  },
  successTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: Colors.light.text,
    marginBottom: 4,
  },
  successName: {
    fontSize: 15,
    color: Colors.light.icon,
    marginBottom: Spacing.lg,
  },
  snoozeBanner: {
    backgroundColor: Colors.light.successBackground,
    padding: Spacing.sm + 4,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.md,
    width: '100%',
  },
  snoozeBannerText: {
    color: Colors.light.successText,
    fontWeight: '600',
    fontSize: 14,
    textAlign: 'center',
  },
  positionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    width: '100%',
    marginBottom: Spacing.md,
  },
  positionBox: {
    flex: 1,
    alignItems: 'center',
  },
  positionNumber: {
    fontSize: 48,
    fontWeight: '800',
    color: Colors.light.tint,
    lineHeight: 52,
  },
  positionLabel: {
    fontSize: 13,
    color: Colors.light.icon,
    marginTop: 4,
  },
  dividerLine: {
    width: 1,
    height: 60,
    backgroundColor: Colors.light.inputBorder,
    marginHorizontal: Spacing.md,
  },
  waitBox: {
    flex: 1,
    alignItems: 'center',
  },
  waitNumber: {
    fontSize: 26,
    fontWeight: '700',
    color: Colors.light.text,
    textAlign: 'center',
  },
  waitLabel: {
    fontSize: 13,
    color: Colors.light.icon,
    marginTop: 4,
  },
  smsNote: {
    fontSize: 13,
    color: Colors.light.icon,
    textAlign: 'center',
    marginBottom: Spacing.md,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: Spacing.sm + 4,
    width: '100%',
  },
  snoozeButton: {
    flex: 1,
    backgroundColor: Colors.light.warningBackground,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
  },
  snoozeButtonText: {
    color: Colors.light.warningText,
    fontWeight: '600',
    fontSize: 14,
  },
  leaveButton: {
    flex: 1,
    backgroundColor: Colors.light.dangerBackground,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
  },
  leaveButtonText: {
    color: Colors.light.dangerText,
    fontWeight: '600',
    fontSize: 14,
  },
  calledCard: {
    backgroundColor: Colors.light.tint,
  },
  calledIcon: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    marginBottom: Spacing.lg,
  },
  calledIconText: {
    fontSize: 36,
    fontWeight: '700',
    color: '#fff',
  },
  calledTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#fff',
    textAlign: 'center',
    marginBottom: Spacing.sm,
  },
  calledSubtitle: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.9)',
    textAlign: 'center',
    marginBottom: Spacing.lg,
  },
  calledService: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingVertical: Spacing.sm + 4,
    paddingHorizontal: Spacing.lg,
    borderRadius: BorderRadius.md,
    alignSelf: 'center',
    marginBottom: Spacing.lg,
  },
  calledServiceText: {
    color: '#fff',
    fontSize: 15,
  },
  calledSnoozeButton: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.3)',
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    alignItems: 'center',
  },
  calledSnoozeText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.lg,
  },
  oopsText: {
    fontSize: 16,
    color: Colors.dark.icon,
    marginBottom: Spacing.lg,
  },
  backBtn: {
    backgroundColor: Colors.light.tint,
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.lg,
  },
  backBtnText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 15,
  },
  footer: {
    padding: Spacing.lg,
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.1)',
  },
  footerText: {
    fontSize: 14,
    color: Colors.dark.icon,
  },
  footerBold: {
    fontWeight: '700',
  },
});
