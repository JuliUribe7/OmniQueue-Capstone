// Customer waiting screen — /{businessId}/waiting?token=xxx
// Polls the backend every 5 seconds to show live position + status.

import React, { useState, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  SafeAreaView, ActivityIndicator,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { api, ApiTicket } from '../../services/api';
import { BorderRadius, Spacing } from '../../constants/theme';

export default function CustomerWaiting() {
  const router = useRouter();
  const { businessId, token } = useLocalSearchParams<{ businessId: string; token: string }>();

  const [ticket, setTicket]   = useState<ApiTicket | null>(null);
  const [loading, setLoading] = useState(true);
  const [leaving, setLeaving] = useState(false);

  async function fetchStatus() {
    try {
      const { ticket: t } = await api.getTicketByToken(token);
      setTicket(t);
    } catch {
      setTicket(null);
    } finally {
      setLoading(false);
    }
  }

  // Initial load
  useEffect(() => {
    fetchStatus();
  }, [token]);

  // Poll every 5 seconds
  useEffect(() => {
    const id = setInterval(fetchStatus, 5000);
    return () => clearInterval(id);
  }, [token]);

  async function handleLeave() {
    if (!ticket) return;
    setLeaving(true);
    try {
      await api.removeTicket(ticket.id);
    } catch {}
    router.replace(`/${businessId}`);
  }

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

  // Ticket not found — already removed or invalid
  if (!ticket || ticket.status === 'Done') {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar style="dark" />
        <View style={styles.centered}>
          <Text style={styles.bigIcon}>👋</Text>
          <Text style={styles.noTicketTitle}>You're not in the queue</Text>
          <Text style={styles.noTicketSub}>
            Your session ended or this link is no longer valid.
          </Text>
          <TouchableOpacity style={styles.backBtn} onPress={() => router.replace(`/${businessId}`)}>
            <Text style={styles.backBtnText}>Join Queue Again</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // Called by staff
  if (ticket.status === 'Called') {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: '#1d4ed8' }]}>
        <StatusBar style="light" />
        <View style={styles.centered}>
          <View style={styles.calledBadge}>
            <Text style={styles.calledBadgeIcon}>🔔</Text>
          </View>
          <Text style={styles.calledTitle}>{ticket.customerName.split(' ')[0]}, you're up!</Text>
          <Text style={styles.calledSub}>Please head to the front desk now.</Text>
          <View style={styles.calledServiceBadge}>
            <Text style={styles.calledServiceText}>{ticket.serviceName}</Text>
          </View>
          <TouchableOpacity
            style={styles.calledDoneBtn}
            onPress={() => router.replace(`/${businessId}`)}
          >
            <Text style={styles.calledDoneBtnText}>Done — Leave Queue</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const position = ticket.position;
  const wait = ticket.avgTime * position;

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="dark" />

      <View style={styles.header}>
        <Text style={styles.businessName}>{ticket.serviceName}</Text>
        <Text style={styles.headerSub}>OmniQueue</Text>
      </View>

      <View style={styles.content}>
        <View style={styles.checkCircle}>
          <Text style={styles.checkIcon}>✓</Text>
        </View>
        <Text style={styles.inQueueTitle}>You're in the queue!</Text>
        <Text style={styles.inQueueName}>
          {ticket.customerName.split(' ')[0]} · {ticket.serviceName}
        </Text>

        <View style={styles.statsRow}>
          <View style={styles.statBox}>
            <Text style={styles.statNum}>#{position}</Text>
            <Text style={styles.statLbl}>in line</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statBox}>
            <Text style={styles.statNum}>
              {wait <= 0 ? 'Soon' : wait < 60 ? `${wait}m` : `${Math.floor(wait / 60)}h ${wait % 60}m`}
            </Text>
            <Text style={styles.statLbl}>est. wait</Text>
          </View>
        </View>

        <Text style={styles.smsNote}>
          We'll notify {ticket.phoneNumber} when you're up.
        </Text>

        <TouchableOpacity
          style={styles.leaveBtn}
          onPress={handleLeave}
          disabled={leaving}
          activeOpacity={0.8}
        >
          {leaving
            ? <ActivityIndicator color="#dc2626" />
            : <Text style={styles.leaveBtnText}>Leave Queue</Text>}
        </TouchableOpacity>
      </View>

      <Text style={styles.footer}>Powered by OmniQueue</Text>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f0f4f8' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: Spacing.lg, gap: Spacing.md },

  header: {
    padding: Spacing.lg, paddingBottom: Spacing.md,
    borderBottomWidth: 1, borderBottomColor: '#e5e7eb', backgroundColor: '#fff',
  },
  businessName: { fontSize: 22, fontWeight: '800', color: '#111827', letterSpacing: -0.5 },
  headerSub: { fontSize: 13, color: '#9ca3af', marginTop: 2 },

  content: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: Spacing.lg, gap: Spacing.md },

  checkCircle: {
    width: 80, height: 80, borderRadius: 40, backgroundColor: '#10b981',
    alignItems: 'center', justifyContent: 'center',
  },
  checkIcon: { fontSize: 38, color: '#fff', fontWeight: '700' },

  inQueueTitle: { fontSize: 26, fontWeight: '800', color: '#111827', textAlign: 'center' },
  inQueueName: { fontSize: 15, color: '#6b7280', textAlign: 'center', marginBottom: 8 },

  statsRow: {
    flexDirection: 'row', backgroundColor: '#fff', borderRadius: BorderRadius.xl,
    padding: Spacing.lg, width: '100%',
    shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 8, elevation: 2,
  },
  statBox: { flex: 1, alignItems: 'center' },
  statNum: { fontSize: 42, fontWeight: '800', color: '#111827', lineHeight: 46 },
  statLbl: { fontSize: 13, color: '#9ca3af', marginTop: 4 },
  statDivider: { width: 1, backgroundColor: '#e5e7eb', marginHorizontal: Spacing.md },

  smsNote: { fontSize: 13, color: '#6b7280', textAlign: 'center' },

  leaveBtn: {
    borderWidth: 1.5, borderColor: '#fca5a5', borderRadius: BorderRadius.lg,
    paddingVertical: 13, paddingHorizontal: 32, backgroundColor: '#fef2f2',
    marginTop: 8,
  },
  leaveBtnText: { color: '#dc2626', fontWeight: '700', fontSize: 15 },

  calledBadge: {
    width: 90, height: 90, borderRadius: 45,
    backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center',
  },
  calledBadgeIcon: { fontSize: 44 },
  calledTitle: { fontSize: 30, fontWeight: '800', color: '#fff', textAlign: 'center' },
  calledSub: { fontSize: 16, color: 'rgba(255,255,255,0.85)', textAlign: 'center' },
  calledServiceBadge: {
    backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.lg, paddingVertical: Spacing.sm,
  },
  calledServiceText: { color: '#fff', fontSize: 15, fontWeight: '600' },
  calledDoneBtn: {
    backgroundColor: '#fff', borderRadius: BorderRadius.lg,
    paddingVertical: 14, paddingHorizontal: 32, marginTop: 8,
  },
  calledDoneBtnText: { color: '#1d4ed8', fontWeight: '700', fontSize: 16 },

  bigIcon: { fontSize: 52 },
  noTicketTitle: { fontSize: 22, fontWeight: '700', color: '#111827', textAlign: 'center' },
  noTicketSub: { fontSize: 14, color: '#6b7280', textAlign: 'center' },
  backBtn: { backgroundColor: '#2563eb', borderRadius: BorderRadius.lg, paddingVertical: 14, paddingHorizontal: 28, marginTop: 8 },
  backBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },

  footer: { textAlign: 'center', fontSize: 12, color: '#9ca3af', padding: Spacing.md },
});
