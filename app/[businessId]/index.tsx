// Customer portal — /{businessId}
// Customers land here from the QR code or shared link.
// They pick a service, enter their name + phone, and join the queue.

import React, { useState, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  SafeAreaView, ScrollView, ActivityIndicator, KeyboardAvoidingView, Platform,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { businessStore } from '../../store/businessStore';
import { getQueueStore } from '../../store/queueStore';
import { BorderRadius, Spacing } from '../../constants/theme';

export default function CustomerPortal() {
  const router = useRouter();
  const { businessId } = useLocalSearchParams<{ businessId: string }>();

  const business = businessStore.getById(businessId);

  const [name, setName]           = useState('');
  const [phone, setPhone]         = useState('');
  const [serviceId, setServiceId] = useState(business?.services[0]?.id ?? '');
  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState('');

  // Keep services in sync if business updates
  const [services, setServices] = useState(business?.services ?? []);
  useEffect(() => {
    const unsub = businessStore.subscribe(() => {
      const b = businessStore.getById(businessId);
      if (b) setServices(b.services);
    });
    return unsub;
  }, [businessId]);

  if (!business) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar style="dark" />
        <View style={styles.centered}>
          <Text style={styles.errorIcon}>🔍</Text>
          <Text style={styles.errorTitle}>Business not found</Text>
          <Text style={styles.errorSub}>
            This link may be invalid or the business no longer exists.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  const store = getQueueStore(businessId);
  const [queueLen, setQueueLen] = useState(store.getTickets().length);
  useEffect(() => {
    const unsub = store.subscribe(() => setQueueLen(store.getTickets().length));
    return unsub;
  }, [businessId]);

  const selectedService = services.find(s => s.id === serviceId) ?? services[0];
  const lastTicket = store.getTickets().at(-1);
  const estWait = selectedService
    ? (lastTicket?.estimatedWait ?? 0) + selectedService.avgTime
    : 0;

  const canJoin = name.trim().length >= 2 && phone.replace(/\D/g, '').length >= 10 && !!selectedService;

  function handleJoin() {
    if (!canJoin || !selectedService) return;
    setError('');
    setLoading(true);

    const tickets = store.getTickets();
    const lastWait = tickets.length > 0 ? (tickets[tickets.length - 1]?.estimatedWait ?? 0) : 0;

    const ticket = {
      id: `cust_${Date.now()}`,
      position: tickets.length + 1,
      customerName: name.trim(),
      phoneNumber: phone.trim(),
      serviceName: selectedService.name,
      serviceId: selectedService.id,
      serviceAvgTime: selectedService.avgTime,
      status: 'Waiting' as const,
      joinedAt: new Date().toISOString(),
      estimatedWait: lastWait + selectedService.avgTime,
    };

    store.addTicket(ticket);
    setLoading(false);
    router.push(`/${businessId}/waiting?ticketId=${ticket.id}`);
  }

  const typeLabel: Record<string, string> = {
    barbershop: '✂️ Barbershop', doctors_office: '🏥 Doctor\'s Office',
    salon: '💇 Salon', dental: '🦷 Dental', other: '🏢 Business',
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="dark" />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.businessName}>{business.name}</Text>
            <Text style={styles.businessType}>{typeLabel[business.type] ?? '🏢 Business'}</Text>
            <View style={styles.queueBadge}>
              <View style={styles.queueDot} />
              <Text style={styles.queueBadgeText}>
                {queueLen === 0 ? 'No wait right now' : `${queueLen} people in queue`}
              </Text>
            </View>
          </View>

          {/* Form card */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Join the Queue</Text>
            <Text style={styles.cardSub}>Enter your info and we'll hold your spot.</Text>

            {/* Name */}
            <Text style={styles.fieldLabel}>Your Name</Text>
            <TextInput
              style={styles.input}
              value={name}
              onChangeText={setName}
              placeholder="First and last name"
              placeholderTextColor="#9ca3af"
              autoCapitalize="words"
              returnKeyType="next"
            />

            {/* Phone */}
            <Text style={styles.fieldLabel}>Phone Number</Text>
            <TextInput
              style={styles.input}
              value={phone}
              onChangeText={setPhone}
              placeholder="(555) 000-0000"
              placeholderTextColor="#9ca3af"
              keyboardType="phone-pad"
              returnKeyType="done"
            />
            <Text style={styles.fieldHint}>We'll notify you when it's your turn.</Text>

            {/* Services */}
            <Text style={styles.fieldLabel}>Choose a Service</Text>
            <View style={styles.chipWrap}>
              {services.map(s => (
                <TouchableOpacity
                  key={s.id}
                  style={[styles.chip, serviceId === s.id && styles.chipSelected]}
                  onPress={() => setServiceId(s.id)}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.chipName, serviceId === s.id && styles.chipNameSelected]}>
                    {s.name}
                  </Text>
                  <Text style={[styles.chipTime, serviceId === s.id && styles.chipTimeSelected]}>
                    ~{s.avgTime} min
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Wait preview */}
            {selectedService && (
              <View style={styles.previewRow}>
                <View style={styles.previewItem}>
                  <Text style={styles.previewVal}>#{queueLen + 1}</Text>
                  <Text style={styles.previewLbl}>Position</Text>
                </View>
                <View style={styles.previewDivider} />
                <View style={styles.previewItem}>
                  <Text style={styles.previewVal}>~{estWait}m</Text>
                  <Text style={styles.previewLbl}>Est. Wait</Text>
                </View>
              </View>
            )}

            {error ? <Text style={styles.errorText}>{error}</Text> : null}

            <TouchableOpacity
              style={[styles.joinBtn, !canJoin && styles.joinBtnDisabled]}
              onPress={handleJoin}
              disabled={!canJoin || loading}
              activeOpacity={0.85}
            >
              {loading
                ? <ActivityIndicator color="#fff" />
                : <Text style={styles.joinBtnText}>Join Queue</Text>}
            </TouchableOpacity>
          </View>

          <Text style={styles.footer}>Powered by OmniQueue</Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f0f4f8' },
  scroll: { padding: Spacing.lg, gap: Spacing.md, paddingBottom: 40 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: Spacing.lg, gap: Spacing.md },

  // Header
  header: { alignItems: 'center', paddingVertical: Spacing.lg, gap: 6 },
  businessName: { fontSize: 28, fontWeight: '800', color: '#111827', textAlign: 'center', letterSpacing: -0.5 },
  businessType: { fontSize: 15, color: '#6b7280' },
  queueBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#fff', borderRadius: 20, paddingHorizontal: 12, paddingVertical: 5, marginTop: 4 },
  queueDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#10b981' },
  queueBadgeText: { fontSize: 13, fontWeight: '600', color: '#374151' },

  // Card
  card: { backgroundColor: '#fff', borderRadius: BorderRadius.xl, padding: Spacing.lg, gap: Spacing.sm, shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 12, elevation: 3 },
  cardTitle: { fontSize: 20, fontWeight: '700', color: '#111827' },
  cardSub: { fontSize: 14, color: '#6b7280', marginBottom: 4 },

  // Form
  fieldLabel: { fontSize: 13, fontWeight: '600', color: '#374151', marginTop: 4 },
  fieldHint: { fontSize: 12, color: '#9ca3af', marginTop: -4 },
  input: {
    backgroundColor: '#f9fafb', borderWidth: 1, borderColor: '#e5e7eb',
    borderRadius: BorderRadius.md, padding: 14, fontSize: 16, color: '#111827',
  },

  // Service chips
  chipWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    borderWidth: 1.5, borderColor: '#e5e7eb', borderRadius: BorderRadius.md,
    paddingVertical: 10, paddingHorizontal: 14, backgroundColor: '#f9fafb',
    alignItems: 'center', minWidth: 100,
  },
  chipSelected: { borderColor: '#2563eb', backgroundColor: '#eff6ff' },
  chipName: { fontSize: 14, fontWeight: '600', color: '#374151' },
  chipNameSelected: { color: '#2563eb' },
  chipTime: { fontSize: 12, color: '#9ca3af', marginTop: 2 },
  chipTimeSelected: { color: '#3b82f6' },

  // Preview row
  previewRow: { flexDirection: 'row', backgroundColor: '#f0f4f8', borderRadius: BorderRadius.lg, padding: Spacing.md, marginTop: 4 },
  previewItem: { flex: 1, alignItems: 'center' },
  previewVal: { fontSize: 26, fontWeight: '800', color: '#111827' },
  previewLbl: { fontSize: 12, color: '#6b7280', marginTop: 2 },
  previewDivider: { width: 1, backgroundColor: '#e5e7eb', marginHorizontal: Spacing.md },

  // Join button
  joinBtn: { backgroundColor: '#2563eb', borderRadius: BorderRadius.lg, paddingVertical: 16, alignItems: 'center', marginTop: 8 },
  joinBtnDisabled: { opacity: 0.4 },
  joinBtnText: { color: '#fff', fontSize: 17, fontWeight: '700' },

  // Error
  errorText: { color: '#ef4444', fontSize: 13, textAlign: 'center' },
  errorIcon: { fontSize: 48 },
  errorTitle: { fontSize: 20, fontWeight: '700', color: '#111827' },
  errorSub: { fontSize: 14, color: '#6b7280', textAlign: 'center' },

  footer: { textAlign: 'center', fontSize: 12, color: '#9ca3af', marginTop: 8 },
});
