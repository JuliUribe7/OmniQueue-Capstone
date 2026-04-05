// Landing page — business login and signup only
// Customers access their business directly via QR code link (/:businessId)
// Super admin has their own separate page at /admin

import { useState, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ScrollView, KeyboardAvoidingView, Platform, ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { businessStore } from '../store/businessStore';

const LIGHT = {
  bg: '#f5f7fa', surface: '#ffffff', border: '#e2e8f0',
  text: '#111827', textSub: '#4b5563', sessionBanner: '#eff6ff',
  sessionBannerBorder: '#bfdbfe', sessionText: '#1e40af', sessionName: '#111827',
  primary: '#2563eb', inputBg: '#f9fafb',
  inputBorder: '#d1d5db', placeholder: '#9ca3af',
};
const DARK = {
  bg: '#151718', surface: '#1e2022', border: '#2a2a2a',
  text: '#ffffff', textSub: '#888888', sessionBanner: '#1e3a8a',
  sessionBannerBorder: '#2563eb', sessionText: '#93c5fd', sessionName: '#ffffff',
  primary: '#2563eb', inputBg: '#2a2d2f',
  inputBorder: '#333333', placeholder: '#666666',
};

function readTheme(): boolean {
  try { return (typeof localStorage !== 'undefined') && localStorage.getItem('omniqueue_theme') === 'dark'; }
  catch { return false; }
}

export default function LandingPage() {
  const router = useRouter();

  const [isDark, setIsDark] = useState(readTheme);
  useEffect(() => {
    const handler = (e: StorageEvent) => {
      if (e.key === 'omniqueue_theme') setIsDark(e.newValue === 'dark');
    };
    if (typeof window !== 'undefined') window.addEventListener('storage', handler);
    return () => { if (typeof window !== 'undefined') window.removeEventListener('storage', handler); };
  }, []);
  function toggleTheme() {
    const next = !isDark;
    setIsDark(next);
    try { if (typeof localStorage !== 'undefined') localStorage.setItem('omniqueue_theme', next ? 'dark' : 'light'); } catch {}
  }
  const C = isDark ? DARK : LIGHT;

  const [email, setEmail]           = useState('');
  const [password, setPassword]     = useState('');
  const [showPass, setShowPass]     = useState(false);
  const [loginError, setLoginError] = useState('');
  const [loggingIn, setLoggingIn]   = useState(false);

  const [existingSession, setExistingSession] = useState<{ type: string; name: string; id?: string } | null>(null);

  // Check for existing session — show a resume banner
  useEffect(() => {
    const timer = setTimeout(() => {
      const session = businessStore.getSession();
      if (session?.type === 'business') {
        const biz = businessStore.getById(session.id);
        if (biz) setExistingSession({ type: 'business', name: biz.name, id: session.id });
      }
    }, 0);
    return () => clearTimeout(timer);
  }, []);

  async function handleBusinessLogin() {
    if (!email.trim() || !password.trim()) {
      setLoginError('Please enter your email and password.');
      return;
    }
    setLoggingIn(true);
    setLoginError('');
    try {
      const res = await fetch('/api/auth/sign-in/email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ email: email.trim(), password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setLoginError(data?.message ?? 'Invalid email or password.');
        return;
      }
      // Look up the business locally by email
      let business = businessStore.getAll().find(b => b.email === email.trim());

      // If no local profile (e.g. teammate logging in from a different machine),
      // create one automatically using the backend response data
      if (!business) {
        const name = data.user?.name ?? email.trim().split('@')[0];
        business = businessStore.signup(name, email.trim(), password, 'other') ?? undefined;
      }

      if (business) {
        router.replace(`/${business.id}/dashboard` as any);
      } else {
        setLoginError('Login successful but could not load business profile.');
      }
    } catch (e) {
      setLoginError('Could not connect to server. Please try again.');
    } finally {
      setLoggingIn(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={[styles.root, { backgroundColor: C.bg }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">

        {/* Theme toggle */}
        <View style={styles.themeRow}>
          <TouchableOpacity onPress={toggleTheme} style={styles.themeBtn}>
            <Text style={styles.themeBtnText}>{isDark ? '☀️ Light' : '🌙 Dark'}</Text>
          </TouchableOpacity>
        </View>

        {/* Resume session banner */}
        {existingSession && (
          <View style={[styles.sessionBanner, { backgroundColor: C.sessionBanner, borderColor: C.sessionBannerBorder }]}>
            <Text style={[styles.sessionBannerText, { color: C.sessionText }]}>
              Logged in as <Text style={[styles.sessionName, { color: C.sessionName }]}>{existingSession.name}</Text>
            </Text>
            <View style={styles.sessionBtns}>
              <TouchableOpacity
                style={styles.sessionContinueBtn}
                onPress={() => {
                  const session = businessStore.getSession();
                  if (session?.type === 'business') router.replace(`/${session.id}/dashboard` as any);
                }}
              >
                <Text style={styles.sessionContinueText}>Continue →</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => { businessStore.logout(); setExistingSession(null); }}>
                <Text style={[styles.sessionLogoutText, { color: C.sessionText }]}>Log out</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        <View style={styles.header}>
          <Text style={[styles.logo, { color: C.text }]}>OmniQueue</Text>
          <Text style={[styles.tagline, { color: C.textSub }]}>Smart queue management for modern businesses</Text>
        </View>

        <View style={[styles.card, { backgroundColor: C.surface, borderColor: C.border, borderWidth: 1 }]}>
          <Text style={[styles.cardTitle, { color: C.text }]}>Business Login</Text>
          <Text style={[styles.cardSubtitle, { color: C.textSub }]}>Sign in to manage your queue and services.</Text>

          <Text style={[styles.label, { color: C.textSub }]}>Email</Text>
          <TextInput
            style={[styles.input, { backgroundColor: C.inputBg, borderColor: C.inputBorder, color: C.text }]}
            placeholder="you@yourbusiness.com"
            placeholderTextColor={C.placeholder}
            value={email}
            onChangeText={t => { setEmail(t); setLoginError(''); }}
            autoCapitalize="none"
            keyboardType="email-address"
          />

          <Text style={[styles.label, { color: C.textSub }]}>Password</Text>
          <View style={styles.passwordRow}>
            <TextInput
              style={[styles.input, styles.passwordInput, { backgroundColor: C.inputBg, borderColor: C.inputBorder, color: C.text }]}
              placeholder="Password"
              placeholderTextColor={C.placeholder}
              value={password}
              onChangeText={t => { setPassword(t); setLoginError(''); }}
              secureTextEntry={!showPass}
            />
            <TouchableOpacity style={[styles.eyeBtn, { borderColor: C.inputBorder, backgroundColor: C.inputBg }]} onPress={() => setShowPass(v => !v)}>
              <Text style={styles.eyeIcon}>{showPass ? '🙈' : '👁️'}</Text>
            </TouchableOpacity>
          </View>

          {loginError ? <Text style={styles.error}>{loginError}</Text> : null}

          <TouchableOpacity
            style={[styles.primaryBtn, loggingIn && styles.primaryBtnDisabled]}
            onPress={handleBusinessLogin}
            disabled={loggingIn}
          >
            {loggingIn
              ? <ActivityIndicator color="#fff" />
              : <Text style={styles.primaryBtnText}>Log In</Text>
            }
          </TouchableOpacity>

          <TouchableOpacity onPress={() => router.push('/signup' as any)} style={styles.linkBtn}>
            <Text style={[styles.linkText, { color: C.primary }]}>Don't have an account? Sign up →</Text>
          </TouchableOpacity>
        </View>

      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#151718' },
  scroll: { flexGrow: 1, alignItems: 'center', paddingVertical: 60, paddingHorizontal: 24 },

  sessionBanner: {
    backgroundColor: '#1e3a8a', borderRadius: 12, padding: 16,
    width: '100%', maxWidth: 420, marginBottom: 20,
    borderWidth: 1, borderColor: '#2563eb',
  },
  sessionBannerText: { color: '#93c5fd', fontSize: 14, marginBottom: 12 },
  sessionName: { fontWeight: '700', color: '#fff' },
  sessionBtns: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  sessionContinueBtn: {
    backgroundColor: '#2563eb', borderRadius: 8, paddingHorizontal: 16, paddingVertical: 8,
  },
  sessionContinueText: { color: '#fff', fontSize: 14, fontWeight: '700' },
  sessionLogoutText: { color: '#93c5fd', fontSize: 14 },

  header: { alignItems: 'center', marginBottom: 36 },
  logo: { fontSize: 36, fontWeight: '800', color: '#fff', letterSpacing: -1 },
  tagline: { fontSize: 15, color: '#888', marginTop: 8, textAlign: 'center' },

  card: {
    backgroundColor: '#1e2022', borderRadius: 16, padding: 24,
    width: '100%', maxWidth: 420, marginBottom: 16,
  },
  cardTitle: { fontSize: 20, fontWeight: '700', color: '#fff', marginBottom: 6 },
  cardSubtitle: { fontSize: 14, color: '#888', marginBottom: 20, lineHeight: 20 },

  label: { fontSize: 13, fontWeight: '600', color: '#ccc', marginBottom: 6 },
  input: {
    backgroundColor: '#2a2d2f', borderRadius: 10, paddingHorizontal: 14,
    paddingVertical: 12, color: '#fff', fontSize: 15, marginBottom: 14,
    borderWidth: 1, borderColor: '#333',
  },
  error: { color: '#f87171', fontSize: 13, marginBottom: 12, marginTop: -8 },

  primaryBtn: {
    backgroundColor: '#2563eb', borderRadius: 10,
    paddingVertical: 14, alignItems: 'center', marginTop: 4,
  },
  primaryBtnDisabled: { opacity: 0.6 },
  primaryBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },

  linkBtn: { alignItems: 'center', marginTop: 16 },
  linkText: { color: '#2563eb', fontSize: 14, fontWeight: '600' },

  themeRow: { width: '100%', maxWidth: 420, alignItems: 'flex-end', marginBottom: 8 },
  themeBtn: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, backgroundColor: '#2563eb22' },
  themeBtnText: { fontSize: 13, fontWeight: '600', color: '#2563eb' },
  passwordRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 14 },
  passwordInput: { flex: 1, marginBottom: 0 },
  eyeBtn: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 12, justifyContent: 'center', alignItems: 'center' },
  eyeIcon: { fontSize: 16 },
});
