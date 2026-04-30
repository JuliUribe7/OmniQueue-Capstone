// Catches the Google OAuth callback redirect to /dashboard?google_tokens=...
// Saves the tokens then forwards to the correct /{businessId}/dashboard

import { useEffect } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { api } from '../services/api';

export default function DashboardRedirect() {
  const router = useRouter();

  useEffect(() => {
    async function handle() {
      if (typeof window === 'undefined') return;

      const params = new URLSearchParams(window.location.search);
      const rawTokens = params.get('google_tokens');

      try {
        // Save tokens if present
        if (rawTokens) {
          const tokens = JSON.parse(decodeURIComponent(rawTokens));
          await api.saveGoogleTokens(tokens).catch(() => {});
        }

        // Get the business to find the correct dashboard URL
        const { business } = await api.getMyBusiness();
        router.replace(`/${business.id}/dashboard` as any);
      } catch {
        // Not logged in or no business — go to login
        router.replace('/');
      }
    }

    handle();
  }, []);

  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#151718' }}>
      <ActivityIndicator size="large" color="#2563eb" />
    </View>
  );
}
