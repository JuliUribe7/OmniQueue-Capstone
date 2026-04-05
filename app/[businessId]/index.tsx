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
import { api } from '../../services/api';
import { BorderRadius, Spacing } from '../../constants/theme';

type PublicService = { id: string; name: string; avgTime: number };
type PublicBusiness = { id: string; name: string; type: string; services: PublicService[] };

export default function CustomerPortal() {
  const router = useRouter();
  const { businessId } = useLocalSearchParams<{ businessId: string }>();

  const [business, setBusiness] = useState<PublicBusiness | null>(null);
  const [loadError, setLoadError]   = useState('');
  const [loading, setLoading]       = useState(true);

  const [name, setName]           = useState('');
  const [phone, setPhone]         = useState('');
  const [serviceId, setServiceId] = useState('');
  const [joining, setJoining]     = useState(false);
  const [joinError, setJoinError] = useState('');

  useEffect(() => {
    api.getPublicBusiness(businessId)
      .then(({ business: biz }) => {
        setBusiness(biz);
        if (biz.services?.length > 0) setServiceId(biz.services[0].id);
      })
      .catch(() => setLoadError('Business not found or no longer available.'))
      .finally(() => setLoading(false));
  }, [businessId]);

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar style="dark" />
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#2563eb" />
        </View>
      </SafeAreaView>
    );
  }

  if (loadError || !business) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar style="dark" />
        <View style={styles.centered}>
          <Text style={styles.errorIcon}>🔍</Text>
          <Text style={styles.errorTitle}>Business not found</Text>
          <Text style={styles.errorSub}>
            {loadError || 'This link may be invalid or the business no longer exists.'}
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  const services = business.services ?? [];
  const selectedService = services.find(s => s.id === serviceId) ?? services[0];
  const canJoin = name.trim().length >= 2 && phone.replace(/\D/g, '').length >= 10 && !!selectedService;

  async function handleJoin() {
    if (!canJoin || !selectedService) return;
    setJoinError('');
    setJoining(true);
    try {
      const { token } = await api.joinQueue(businessId, name.trim(), phone.trim(), selectedService.id);
      router.push(`/${businessId}/waiting?token=${token}`);
    } catch (e: any) {
      setJoinError(e?.message ?? 'Could not join queue. Please try again.');
    } finally {
      setJoining(false);
    }
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

          <View style={styles.header}>
            <Text style={styles.businessName}>{business.name}</Text>
            <Text style={styles.businessType}>{typeLabel[business.type] ?? '🏢 Business'}</Text>
            <View style={styles.queueBadge}>
              <View style={styles.queueDot} />
              <Text style={styles.queueBadgeText}>Queue is open</Text>
            </View>
          </View>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>Join the Queue</Text>
            <Text style={styles.cardSub}>Enter your info and we'll hold your spot.</Text>

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

            {selectedService && (
              <View style={styles.previewRow}>
                <View style={styles.previewItem}>
                  <Text style={styles.previewVal}>~{selectedService.avgTime}m</Text>
                  <Text style={styles.previewLbl}>Est. Wait</Text>
                </View>
              </View>
            )}

            {!!joinError && <Text style={styles.errorText}>{joinError}</Text>}

            <TouchableOpacity
              style={[styles.joinBtn, !canJoin && styles.joinBtnDisabled]}
              onPress={handleJoin}
              disabled={!canJoin || joining}
              activeOpacity={0.85}
            >
              {joining
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

  header: { alignItems: 'center', paddingVertical: Spacing.lg, gap: 6 },
  businessName: { fontSize: 28, fontWeight: '800', color: '#111827', textAlign: 'center', letterSpacing: -0.5 },
  businessType: { fontSize: 15, color: '#6b7280' },
  queueBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#fff', borderRadius: 20, paddingHorizontal: 12, paddingVertical: 5, marginTop: 4 },
  queueDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#10b981' },
  queueBadgeText: { fontSize: 13, fontWeight: '600', color: '#374151' },

  card: { backgroundColor: '#fff', borderRadius: BorderRadius.xl, padding: Spacing.lg, gap: Spacing.sm, shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 12, elevation: 3 },
  cardTitle: { fontSize: 20, fontWeight: '700', color: '#111827' },
  cardSub: { fontSize: 14, color: '#6b7280', marginBottom: 4 },

  fieldLabel: { fontSize: 13, fontWeight: '600', color: '#374151', marginTop: 4 },
  fieldHint: { fontSize: 12, color: '#9ca3af', marginTop: -4 },
  input: {
    backgroundColor: '#f9fafb', borderWidth: 1, borderColor: '#e5e7eb',
    borderRadius: BorderRadius.md, padding: 14, fontSize: 16, color: '#111827',
  },

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

  previewRow: { flexDirection: 'row', backgroundColor: '#f0f4f8', borderRadius: BorderRadius.lg, padding: Spacing.md, marginTop: 4 },
  previewItem: { flex: 1, alignItems: 'center' },
  previewVal: { fontSize: 26, fontWeight: '800', color: '#111827' },
  previewLbl: { fontSize: 12, color: '#6b7280', marginTop: 2 },

  joinBtn: { backgroundColor: '#2563eb', borderRadius: BorderRadius.lg, paddingVertical: 16, alignItems: 'center', marginTop: 8 },
  joinBtnDisabled: { opacity: 0.4 },
  joinBtnText: { color: '#fff', fontSize: 17, fontWeight: '700' },

  errorText: { color: '#ef4444', fontSize: 13, textAlign: 'center' },
  errorIcon: { fontSize: 48 },
  errorTitle: { fontSize: 20, fontWeight: '700', color: '#111827' },
  errorSub: { fontSize: 14, color: '#6b7280', textAlign: 'center' },

  footer: { textAlign: 'center', fontSize: 12, color: '#9ca3af', marginTop: 8 },
});
