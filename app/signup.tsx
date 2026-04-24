// Business signup — creates a new business account with default services

import { useState, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ScrollView, KeyboardAvoidingView, Platform, ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { DEFAULT_SERVICES, BusinessType } from '../store/businessStore';
import { api } from '../services/api';

function readTheme(): boolean {
  try { return (typeof localStorage !== 'undefined') && localStorage.getItem('omniqueue_theme') === 'dark'; }
  catch { return false; }
}

const LIGHT = {
  bg: '#f5f7fa', surface: '#ffffff', border: '#e2e8f0',
  text: '#111827', textSub: '#4b5563',
  primary: '#2563eb', inputBg: '#f9fafb',
  inputBorder: '#d1d5db', placeholder: '#9ca3af',
};
const DARK = {
  bg: '#151718', surface: '#1e2022', border: '#2a2a2a',
  text: '#ffffff', textSub: '#9ba1a6',
  primary: '#2563eb', inputBg: '#2a2d2f',
  inputBorder: '#3a3a3a', placeholder: '#666666',
};

const BUSINESS_TYPES: { value: BusinessType; label: string }[] = [
  { value: 'barbershop',     label: 'Barbershop' },
  { value: 'doctors_office', label: "Doctor's Office" },
  { value: 'salon',          label: 'Salon' },
  { value: 'dental',         label: 'Dental Office' },
  { value: 'other',          label: 'Other' },
];

export default function SignupPage() {
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

  const [businessName, setBusinessName] = useState('');
  const [email, setEmail]               = useState('');
  const [password, setPassword]         = useState('');
  const [confirmPass, setConfirmPass]   = useState('');
  const [type, setType]                 = useState<BusinessType>('barbershop');
  const [error, setError]               = useState('');
  const [loading, setLoading]           = useState(false);
  const [showPass, setShowPass]         = useState(false);
  const [showConfirm, setShowConfirm]   = useState(false);

  async function handleSignup() {
    if (!businessName.trim()) { setError('Please enter your business name.'); return; }
    if (!email.trim())        { setError('Please enter your email.'); return; }
    if (!password.trim())     { setError('Please enter a password.'); return; }
    if (password.length < 6)  { setError('Password must be at least 6 characters.'); return; }
    if (password !== confirmPass) { setError('Passwords do not match.'); return; }

    setLoading(true);
    setError('');

    try {
      // 1. Create auth account in backend
      await api.signUp(email.trim(), password, businessName.trim());

      // 2. Create business profile in backend
      const { business } = await api.createBusiness(businessName.trim(), type);

      // 3. Seed default services for this business type
      const defaults = DEFAULT_SERVICES[type] ?? DEFAULT_SERVICES['other'];
      await Promise.all(defaults.map(s => api.addService(s.name, s.avgTime)));

      // 4. Route to dashboard using the backend business ID
      router.replace(`/${business.id}/dashboard` as any);
    } catch (e: any) {
      setError(e?.message ?? 'Could not create account. Email may already be in use.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={[styles.root, { backgroundColor: C.bg }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">

        <View style={styles.topRow}>
          <TouchableOpacity onPress={() => router.back()}>
            <Text style={[styles.back, { color: C.primary }]}>← Back</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={toggleTheme} style={styles.themeToggleWrap} activeOpacity={0.8}>
            <Text style={[styles.themeLabel, { color: C.textSub }]}>{isDark ? 'Light' : 'Dark'}</Text>
            <View style={[styles.toggleTrack, { backgroundColor: isDark ? '#2563eb' : '#d1d5db' }]}>
              <View style={[styles.toggleThumb, { transform: [{ translateX: isDark ? 16 : 0 }] }]} />
            </View>
          </TouchableOpacity>
        </View>

        <View style={styles.header}>
          <Text style={[styles.title, { color: C.text }]}>Create Your Business</Text>
          <Text style={[styles.subtitle, { color: C.textSub }]}>
            Set up your queue in minutes. Default services are loaded automatically.
          </Text>
        </View>

        <View style={[styles.card, { backgroundColor: C.surface, borderColor: C.border, borderWidth: 1 }]}>
          <Text style={[styles.label, { color: C.textSub }]}>Business Name</Text>
          <TextInput
            style={[styles.input, { backgroundColor: C.inputBg, borderColor: C.inputBorder, color: C.text }]}
            placeholder="e.g. Classic Cuts"
            placeholderTextColor={C.placeholder}
            value={businessName}
            onChangeText={t => { setBusinessName(t); setError(''); }}
            id="business-name"
            autoComplete="organization"
          />

          <Text style={[styles.label, { color: C.textSub }]}>Business Type</Text>
          <View style={styles.typeGrid}>
            {BUSINESS_TYPES.map(bt => (
              <TouchableOpacity
                key={bt.value}
                style={[styles.typeBtn, { backgroundColor: C.inputBg, borderColor: C.inputBorder },
                  type === bt.value && styles.typeBtnActive]}
                onPress={() => setType(bt.value)}
              >
                <Text style={[styles.typeBtnText, { color: C.textSub },
                  type === bt.value && styles.typeBtnTextActive]}>
                  {bt.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={[styles.label, { color: C.textSub }]}>Email</Text>
          <TextInput
            style={[styles.input, { backgroundColor: C.inputBg, borderColor: C.inputBorder, color: C.text }]}
            placeholder="you@yourbusiness.com"
            placeholderTextColor={C.placeholder}
            value={email}
            onChangeText={t => { setEmail(t); setError(''); }}
            autoCapitalize="none"
            keyboardType="email-address"
            id="email"
            autoComplete="email"
          />

          <Text style={[styles.label, { color: C.textSub }]}>Password</Text>
          <View style={styles.passwordRow}>
            <TextInput
              style={[styles.input, styles.passwordInput, { backgroundColor: C.inputBg, borderColor: C.inputBorder, color: C.text }]}
              placeholder="At least 6 characters"
              placeholderTextColor={C.placeholder}
              value={password}
              onChangeText={t => { setPassword(t); setError(''); }}
              secureTextEntry={!showPass}
              id="password"
              autoComplete="new-password"
            />
            <TouchableOpacity style={[styles.eyeBtn, { borderColor: C.inputBorder, backgroundColor: C.inputBg }]} onPress={() => setShowPass(v => !v)}>
              <Text style={[styles.eyeText, { color: C.primary }]}>{showPass ? 'Hide' : 'Show'}</Text>
            </TouchableOpacity>
          </View>

          <Text style={[styles.label, { color: C.textSub }]}>Confirm Password</Text>
          <View style={styles.passwordRow}>
            <TextInput
              style={[styles.input, styles.passwordInput, { backgroundColor: C.inputBg, borderColor: C.inputBorder, color: C.text }]}
              placeholder="Re-enter password"
              placeholderTextColor={C.placeholder}
              value={confirmPass}
              onChangeText={t => { setConfirmPass(t); setError(''); }}
              secureTextEntry={!showConfirm}
              id="confirm-password"
              autoComplete="new-password"
            />
            <TouchableOpacity style={[styles.eyeBtn, { borderColor: C.inputBorder, backgroundColor: C.inputBg }]} onPress={() => setShowConfirm(v => !v)}>
              <Text style={[styles.eyeText, { color: C.primary }]}>{showConfirm ? 'Hide' : 'Show'}</Text>
            </TouchableOpacity>
          </View>

          {error ? <Text style={styles.error}>{error}</Text> : null}

          <TouchableOpacity
            style={[styles.primaryBtn, loading && styles.primaryBtnDisabled]}
            onPress={handleSignup}
            disabled={loading}
          >
            {loading
              ? <ActivityIndicator color="#fff" />
              : <Text style={styles.primaryBtnText}>Create Business Account</Text>
            }
          </TouchableOpacity>

          <View style={[styles.hint, { backgroundColor: C.inputBg }]}>
            <Text style={[styles.hintText, { color: C.textSub }]}>
              Your default services will be loaded based on your business type.
              You can edit them anytime from your dashboard.
            </Text>
          </View>
        </View>

        <TouchableOpacity onPress={() => router.back()} style={styles.linkBtn}>
          <Text style={[styles.linkText, { color: C.primary }]}>Already have an account? Log in →</Text>
        </TouchableOpacity>

      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#151718' },
  scroll: { flexGrow: 1, alignItems: 'center', paddingVertical: 48, paddingHorizontal: 24 },

  topRow: { width: '100%', maxWidth: 420, marginBottom: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  back: { color: '#2563eb', fontSize: 15, fontWeight: '600' },
  themeToggleWrap: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  themeLabel: { fontSize: 13, fontWeight: '500' },
  toggleTrack: { width: 40, height: 22, borderRadius: 11, padding: 2, justifyContent: 'center' },
  toggleThumb: { width: 18, height: 18, borderRadius: 9, backgroundColor: '#ffffff' },
  passwordRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 16 },
  passwordInput: { flex: 1, marginBottom: 0 },
  eyeBtn: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 12, justifyContent: 'center', alignItems: 'center' },
  eyeText: { fontSize: 13, fontWeight: '600' },

  header: { alignItems: 'center', marginBottom: 28, width: '100%', maxWidth: 420 },
  title: { fontSize: 26, fontWeight: '800', color: '#fff' },
  subtitle: { fontSize: 14, color: '#888', marginTop: 8, textAlign: 'center', lineHeight: 20 },

  card: {
    backgroundColor: '#1e2022', borderRadius: 16, padding: 24,
    width: '100%', maxWidth: 420, marginBottom: 16,
  },

  label: { fontSize: 13, fontWeight: '600', color: '#ccc', marginBottom: 6 },
  input: {
    backgroundColor: '#2a2d2f', borderRadius: 10, paddingHorizontal: 14,
    paddingVertical: 12, color: '#fff', fontSize: 15, marginBottom: 16,
    borderWidth: 1, borderColor: '#333',
  },
  error: { color: '#f87171', fontSize: 13, marginBottom: 12 },

  typeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
  typeBtn: {
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8,
    backgroundColor: '#2a2d2f', borderWidth: 1, borderColor: '#333',
  },
  typeBtnActive: { backgroundColor: '#1e3a8a', borderColor: '#2563eb' },
  typeBtnText: { color: '#888', fontSize: 13, fontWeight: '600' },
  typeBtnTextActive: { color: '#fff' },

  primaryBtn: {
    backgroundColor: '#2563eb', borderRadius: 10,
    paddingVertical: 14, alignItems: 'center', marginTop: 4,
  },
  primaryBtnDisabled: { opacity: 0.6 },
  primaryBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },

  hint: { marginTop: 16, padding: 12, backgroundColor: '#2a2d2f', borderRadius: 8 },
  hintText: { color: '#888', fontSize: 13, lineHeight: 18, textAlign: 'center' },

  linkBtn: { alignItems: 'center', marginTop: 8 },
  linkText: { color: '#2563eb', fontSize: 14, fontWeight: '600' },
});
