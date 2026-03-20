// Main screen — the customer portal
// Flow: contact info → select service → confirm → /waiting (separate page)

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  SafeAreaView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

import { Colors, BorderRadius, Spacing } from '@/constants/theme';
import {
  ServiceCard,
  WaitTimeDisplay,
  SnoozeModal,
} from '@/components/queue';
import {
  useQueue,
  formatWaitTime,
  calculateWaitTime,
  SNOOZE_OPTIONS,
} from '@/hooks/useQueue';

// Business info - would come from QR code scan in production
const BUSINESS_NAME = "Classic Cuts Barbershop";

export default function CustomerPortal() {
  const router = useRouter();
  const {
    currentStep,
    services,
    selectedService,
    customerName,
    phoneNumber,
    description,
    queuePosition,
    estimatedWait,
    isLoading,
    error,
    setCurrentStep,
    setCustomerName,
    setPhoneNumber,
    setDescription,
    submitContact,
    selectService,
    submitDescription,
    joinQueue,
    snoozeSpot,
    leaveQueue,
    goBack,
  } = useQueue();

  const [showSnoozeModal, setShowSnoozeModal] = useState(false);
  const [snoozeIndex, setSnoozeIndex] = useState(0);

  // Navigate to /waiting once the customer joins the queue
  useEffect(() => {
    if (currentStep === 'waiting' || currentStep === 'called') {
      router.replace('/waiting');
    }
  }, [currentStep]);

  const contactReady = customerName.trim().length > 0 && phoneNumber.trim().length >= 10;

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="light" />

      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.businessName}>{BUSINESS_NAME}</Text>
        <Text style={styles.tagline}>Smart Queue System</Text>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >

        {/* Step 0: name and phone number */}
        {currentStep === 'contact' && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Welcome!</Text>
            <Text style={styles.cardSubtitle}>
              Enter your details to join the queue and get SMS updates
            </Text>

            <TextInput
              style={styles.textInput}
              value={customerName}
              onChangeText={setCustomerName}
              placeholder="Your name"
              placeholderTextColor={Colors.light.icon}
              autoCapitalize="words"
              returnKeyType="next"
            />

            <TextInput
              style={styles.textInput}
              value={phoneNumber}
              onChangeText={setPhoneNumber}
              placeholder="Phone number"
              placeholderTextColor={Colors.light.icon}
              keyboardType="phone-pad"
              returnKeyType="done"
            />

            <Text style={styles.smsNote}>
              We'll text you when you're almost up
            </Text>

            <TouchableOpacity
              style={[styles.primaryButton, !contactReady && styles.primaryButtonDisabled]}
              onPress={submitContact}
              disabled={!contactReady}
              activeOpacity={0.7}
            >
              <Text style={styles.primaryButtonText}>Continue</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Step 1: service selection */}
        {currentStep === 'select' && (
          <View style={styles.card}>
            <TouchableOpacity onPress={goBack} style={styles.backButton}>
              <Text style={styles.backButtonText}>← Back</Text>
            </TouchableOpacity>

            <Text style={styles.cardTitle}>Hi {customerName.split(' ')[0]}!</Text>
            <Text style={styles.cardSubtitle}>
              Choose a service or describe your visit
            </Text>

            {/* Describe your visit button */}
            <TouchableOpacity
              style={styles.describeButton}
              onPress={() => setCurrentStep('describe')}
              activeOpacity={0.7}
            >
              <View style={styles.describeContent}>
                <Text style={styles.describeTitle}>Describe your visit</Text>
                <Text style={styles.describeSubtitle}>
                  Tell us what you need and we'll estimate your wait
                </Text>
              </View>
              <Text style={styles.describeArrow}>→</Text>
            </TouchableOpacity>

            <Text style={styles.dividerText}>or choose a service</Text>

            <View style={styles.serviceGrid}>
              {services.map((service) => (
                <View key={service.id} style={styles.serviceGridItem}>
                  <ServiceCard service={service} onPress={selectService} />
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Step 1b: describe visit */}
        {currentStep === 'describe' && (
          <View style={styles.card}>
            <TouchableOpacity onPress={goBack} style={styles.backButton}>
              <Text style={styles.backButtonText}>← Back</Text>
            </TouchableOpacity>

            <Text style={styles.cardTitle}>Describe your visit</Text>
            <Text style={styles.cardSubtitle}>
              Tell us what you're looking for today
            </Text>

            <TextInput
              style={styles.textAreaInput}
              value={description}
              onChangeText={setDescription}
              placeholder="e.g., I need a haircut and beard trim, just a cleanup..."
              placeholderTextColor={Colors.light.icon}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />

            <TouchableOpacity
              style={[styles.primaryButton, !description.trim() && styles.primaryButtonDisabled]}
              onPress={submitDescription}
              disabled={!description.trim()}
              activeOpacity={0.7}
            >
              <Text style={styles.primaryButtonText}>Get Wait Estimate</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Step 2: confirmation before joining */}
        {currentStep === 'confirm' && selectedService && (
          <View style={styles.card}>
            <TouchableOpacity onPress={goBack} style={styles.backButton}>
              <Text style={styles.backButtonText}>← Back</Text>
            </TouchableOpacity>

            <Text style={styles.confirmTitle}>{selectedService.name}</Text>

            {(selectedService as any).description && (
              <Text style={styles.descriptionPreview}>
                "{(selectedService as any).description}"
              </Text>
            )}

            <WaitTimeDisplay
              minutes={calculateWaitTime(selectedService)}
              variant="dark"
              detail={`${selectedService.currentQueue} people ahead • ~${selectedService.avgTime} min per service`}
            />

            <View style={styles.featureList}>
              <Text style={styles.featureItem}>
                SMS updates sent to {phoneNumber}
              </Text>
              <Text style={styles.featureItem}>
                Running late? Use "Snooze" to hold your spot
              </Text>
              <Text style={styles.featureItem}>
                Wait anywhere - we'll notify you
              </Text>
            </View>

            {error && (
              <Text style={styles.errorText}>{error}</Text>
            )}

            <TouchableOpacity
              style={[styles.primaryButton, isLoading && styles.primaryButtonDisabled]}
              onPress={() => joinQueue()}
              disabled={isLoading}
              activeOpacity={0.7}
            >
              <Text style={styles.primaryButtonText}>
                {isLoading ? 'Joining...' : 'Join the Queue'}
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Step 3: waiting in queue */}
        {(currentStep === 'waiting' || currentStep === 'snoozed') && selectedService && (
          <View style={styles.waitingCard}>

            {/* Green check + success message */}
            <View style={styles.successIconWrap}>
              <Text style={styles.successIcon}>✓</Text>
            </View>
            <Text style={styles.successTitle}>You're in the queue!</Text>
            <Text style={styles.successName}>{customerName.split(' ')[0]} • {selectedService.name}</Text>

            {currentStep === 'snoozed' && (
              <View style={styles.snoozeBanner}>
                <Text style={styles.snoozeBannerText}>
                  Spot moved back {SNOOZE_OPTIONS[snoozeIndex].label}
                </Text>
              </View>
            )}

            {/* Position */}
            <View style={styles.positionRow}>
              <View style={styles.positionBox}>
                <Text style={styles.positionNumber}>{queuePosition || 1}</Text>
                <Text style={styles.positionLabel}>in line</Text>
              </View>
              <View style={styles.dividerLine} />
              <View style={styles.waitBox}>
                <Text style={styles.waitNumber}>
                  {estimatedWait != null ? formatWaitTime(estimatedWait) : '—'}
                </Text>
                <Text style={styles.waitLabel}>estimated wait</Text>
              </View>
            </View>

            <Text style={styles.smsNote}>
              We'll text {phoneNumber} when you're up
            </Text>

            {/* Action buttons */}
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
                onPress={leaveQueue}
                activeOpacity={0.7}
              >
                <Text style={styles.leaveButtonText}>Leave Queue</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Step 4: it's their turn */}
        {currentStep === 'called' && selectedService && (
          <View style={[styles.card, styles.calledCard]}>
            <View style={styles.calledIcon}>
              <Text style={styles.calledIconText}>!</Text>
            </View>

            <Text style={styles.calledTitle}>
              {customerName.split(' ')[0]}, You're Up!
            </Text>
            <Text style={styles.calledSubtitle}>
              Please head to the front desk
            </Text>

            <View style={styles.calledService}>
              <Text style={styles.calledServiceText}>
                {selectedService.name}
              </Text>
            </View>

            <TouchableOpacity
              style={styles.calledSnoozeButton}
              onPress={() => setShowSnoozeModal(true)}
              activeOpacity={0.7}
            >
              <Text style={styles.calledSnoozeButtonText}>
                Need a few more minutes?
              </Text>
            </TouchableOpacity>

            <Text style={styles.calledNote}>
              Reply "DELAY" to your SMS to snooze
            </Text>
          </View>
        )}
      </ScrollView>

      {/* Footer */}
      <View style={styles.footer}>
        <Text style={styles.footerText}>
          Powered by <Text style={styles.footerBold}>OmniQueue</Text>
        </Text>
      </View>

      {/* Snooze Modal */}
      <SnoozeModal
        visible={showSnoozeModal}
        onClose={() => setShowSnoozeModal(false)}
        onSnooze={(minutes) => {
          const index = SNOOZE_OPTIONS.findIndex((o) => o.value === minutes);
          setSnoozeIndex(index >= 0 ? index : 0);
          snoozeSpot(minutes);
        }}
      />
    </SafeAreaView>
  );
}

// styles

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.dark.background,
  },
  header: {
    padding: Spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
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
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: Spacing.lg,
    paddingBottom: Spacing.xl,
  },
  card: {
    backgroundColor: Colors.light.background,
    borderRadius: BorderRadius.xl,
    padding: Spacing.lg,
  },
  cardTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: Colors.light.text,
    textAlign: 'center',
    letterSpacing: -0.5,
  },
  cardSubtitle: {
    fontSize: 15,
    color: Colors.light.icon,
    textAlign: 'center',
    marginTop: Spacing.sm,
    marginBottom: Spacing.lg,
  },
  textInput: {
    borderWidth: 2,
    borderColor: Colors.light.inputBorder,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    fontSize: 15,
    color: Colors.light.text,
    marginBottom: Spacing.md,
  },
  textAreaInput: {
    borderWidth: 2,
    borderColor: Colors.light.inputBorder,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    fontSize: 15,
    color: Colors.light.text,
    minHeight: 120,
    marginTop: Spacing.md,
    marginBottom: Spacing.md,
  },
  smsNote: {
    fontSize: 13,
    color: Colors.light.icon,
    textAlign: 'center',
    marginBottom: Spacing.md,
  },
  primaryButton: {
    backgroundColor: Colors.light.tint,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md + 2,
    alignItems: 'center',
  },
  primaryButtonDisabled: {
    opacity: 0.5,
  },
  primaryButtonText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '600',
  },
  backButton: {
    paddingVertical: Spacing.sm,
    marginBottom: Spacing.md,
  },
  backButtonText: {
    fontSize: 14,
    color: Colors.light.icon,
  },
  describeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderWidth: 2,
    borderColor: Colors.light.tint,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md + 4,
    marginBottom: Spacing.md,
  },
  describeContent: {
    flex: 1,
  },
  describeTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.light.text,
  },
  describeSubtitle: {
    fontSize: 13,
    color: Colors.light.icon,
    marginTop: 4,
  },
  describeArrow: {
    fontSize: 20,
    color: Colors.light.tint,
  },
  dividerText: {
    textAlign: 'center',
    fontSize: 13,
    color: Colors.light.icon,
    marginVertical: Spacing.md,
  },
  serviceGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -Spacing.xs,
  },
  serviceGridItem: {
    width: '50%',
    padding: Spacing.xs,
  },
  confirmTitle: {
    fontSize: 26,
    fontWeight: '700',
    color: Colors.light.text,
    textAlign: 'center',
    marginBottom: Spacing.sm,
  },
  descriptionPreview: {
    fontSize: 14,
    color: Colors.light.icon,
    fontStyle: 'italic',
    textAlign: 'center',
    marginBottom: Spacing.md,
  },
  errorText: {
    color: '#dc2626',
    fontSize: 14,
    textAlign: 'center',
    marginBottom: Spacing.md,
  },
  featureList: {
    marginBottom: Spacing.lg,
  },
  featureItem: {
    fontSize: 14,
    color: Colors.light.icon,
    paddingVertical: Spacing.sm + 4,
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.inputBorder,
  },
  snoozeBanner: {
    backgroundColor: Colors.light.successBackground,
    padding: Spacing.sm + 4,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.md,
  },
  snoozeBannerText: {
    color: Colors.light.successText,
    fontWeight: '600',
    fontSize: 14,
    textAlign: 'center',
  },
  waitingTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: Colors.light.text,
    textAlign: 'center',
    marginBottom: Spacing.sm,
  },
  waitingService: {
    fontSize: 15,
    color: Colors.light.icon,
    textAlign: 'center',
    marginBottom: Spacing.lg,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: Spacing.sm + 4,
    marginBottom: Spacing.md,
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
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
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
    color: 'rgba(255, 255, 255, 0.9)',
    textAlign: 'center',
    marginBottom: Spacing.lg,
  },
  calledService: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
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
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  calledSnoozeButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
  calledNote: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.8)',
    textAlign: 'center',
  },
  // waiting screen (new design)
  waitingCard: {
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
  },
  waitLabel: {
    fontSize: 13,
    color: Colors.light.icon,
    marginTop: 4,
  },
  footer: {
    padding: Spacing.lg,
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
  },
  footerText: {
    fontSize: 14,
    color: Colors.dark.icon,
  },
  footerBold: {
    fontWeight: '700',
  },
});
