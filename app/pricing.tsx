// Stripe cancel redirect — /pricing?cancelled=true

import { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { api } from '../services/api';

export default function PricingPage() {
  const router = useRouter();
  const [cancelled, setCancelled] = useState(false);
  const [businessId, setBusinessId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      setCancelled(params.get('cancelled') === 'true');
      // Clean the URL
      window.history.replaceState({}, '', window.location.pathname);
    }

    api.getMyBusiness()
      .then(({ business }) => setBusinessId(business.id))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  function goToDashboard() {
    if (businessId) {
      router.replace(`/${businessId}/dashboard` as any);
    } else {
      router.replace('/');
    }
  }

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#2563eb" />
      </View>
    );
  }

  return (
    <View style={styles.centered}>
      {cancelled ? (
        <>
          <Text style={styles.icon}>✕</Text>
          <Text style={styles.title}>Payment cancelled</Text>
          <Text style={styles.sub}>
            No charge was made. You can upgrade whenever you're ready.
          </Text>
        </>
      ) : (
        <>
          <Text style={styles.icon}>💳</Text>
          <Text style={styles.title}>OmniQueue Pro</Text>
          <Text style={styles.sub}>Manage your subscription from the dashboard.</Text>
        </>
      )}
      <TouchableOpacity style={styles.btn} onPress={goToDashboard}>
        <Text style={styles.btnText}>Back to Dashboard</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#151718', padding: 32 },
  icon:     { fontSize: 48, marginBottom: 16 },
  title:    { fontSize: 24, fontWeight: '700', color: '#ffffff', marginBottom: 8, textAlign: 'center' },
  sub:      { fontSize: 15, color: '#9ba1a6', textAlign: 'center', marginBottom: 32, lineHeight: 22 },
  btn:      { backgroundColor: '#2563eb', borderRadius: 12, paddingHorizontal: 32, paddingVertical: 14 },
  btnText:  { color: '#ffffff', fontSize: 15, fontWeight: '600' },
});
