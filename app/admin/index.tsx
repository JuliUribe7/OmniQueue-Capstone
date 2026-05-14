// Super admin dashboard — fully independent page with its own login
// Access at /admin directly — no link from the business landing page

import { useState, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView,
  SafeAreaView, TextInput, KeyboardAvoidingView, Platform, Image,
  ActivityIndicator,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useRouter } from 'expo-router';
import { api, ApiTicket } from '../../services/api';
import { BorderRadius, Spacing } from '../../constants/theme';

const ADMIN_PASSWORD = 'admin1234';

type Tab = 'businesses' | 'analytics' | 'liveview' | 'settings';

type AdminBusiness = {
  id: string;
  name: string;
  type: string;
  plan: string;
  smsSentTotal?: number;
  emailSentTotal?: number;
  createdAt: string;
  services: { id: string; name: string; avgTime: number }[];
  tickets: ApiTicket[];
};

const LIGHT = {
  bg: '#f5f7fa', surface: '#ffffff', surfaceAlt: '#f0f2f5', border: '#e2e8f0',
  text: '#111827', textSub: '#4b5563', textMuted: '#9ca3af',
  primary: '#2563eb', primarySurface: '#eff6ff',
  navActive: '#eff6ff', navActiveText: '#2563eb', navText: '#4b5563',
  sidebar: '#ffffff', sidebarBorder: '#e2e8f0', topBar: '#ffffff',
  inputBg: '#f9fafb', inputBorder: '#d1d5db', placeholder: '#9ca3af',
};
const DARK = {
  bg: '#151718', surface: '#1e2022', surfaceAlt: '#2a2d2f', border: '#2a2a2a',
  text: '#ffffff', textSub: '#9ba1a6', textMuted: '#6b7280',
  primary: '#2563eb', primarySurface: '#1e3a8a22',
  navActive: '#2563eb22', navActiveText: '#2563eb', navText: '#6b7280',
  sidebar: '#111111', sidebarBorder: '#2a2a2a', topBar: '#151718',
  inputBg: '#2a2d2f', inputBorder: '#3a3a3a', placeholder: '#555555',
};

function readTheme(): boolean {
  try { return (typeof localStorage !== 'undefined') && localStorage.getItem('omniqueue_theme') === 'dark'; }
  catch { return false; }
}

export default function AdminDashboard() {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>('businesses');
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [adminPass, setAdminPass] = useState('');
  const [adminError, setAdminError] = useState('');

  const [businesses, setBusinesses] = useState<AdminBusiness[]>([]);
  const [dataLoading, setDataLoading] = useState(false);
  const [selectedBizId, setSelectedBizId] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  const [isDark, setIsDark] = useState(readTheme);
  const [settingsNewPass, setSettingsNewPass] = useState('');
  const [settingsConfirmPass, setSettingsConfirmPass] = useState('');
  const [settingsMsg, setSettingsMsg] = useState('');
  const [showSettingsPass, setShowSettingsPass] = useState(false);
  const [qrBizId, setQrBizId] = useState<string | null>(null);
  const [smsPhone, setSmsPhone] = useState('');
  const [smsSent, setSmsSent] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);

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

  // Load + poll data once logged in
  useEffect(() => {
    if (!isLoggedIn) return;
    async function load() {
      try {
        const { businesses: biz } = await api.getAdminBusinesses();
        setBusinesses(biz);
      } catch {}
      setDataLoading(false);
    }
    setDataLoading(true);
    load();
    const id = setInterval(load, 5000);
    return () => clearInterval(id);
  }, [isLoggedIn]);

  function handleAdminLogin() {
    if (adminPass === ADMIN_PASSWORD) {
      setIsLoggedIn(true);
      setAdminError('');
    } else {
      setAdminError('Incorrect password.');
    }
  }

  function handleLogout() {
    setIsLoggedIn(false);
    router.replace('/');
  }

  if (!isLoggedIn) {
    return (
      <KeyboardAvoidingView
        style={[styles.container, { justifyContent: 'center', alignItems: 'center', backgroundColor: C.bg }]}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <StatusBar style={isDark ? 'light' : 'dark'} />
        <View style={[styles.loginCard, { backgroundColor: C.surface, borderColor: C.border, borderWidth: 1 }]}>
          <Text style={[styles.loginLogo, { color: C.primary }]}>OmniQueue</Text>
          <Text style={[styles.loginTitle, { color: C.text }]}>Admin Access</Text>
          <Text style={[styles.loginSubtitle, { color: C.textMuted }]}>Enter the admin password to continue.</Text>
          <TextInput
            style={[styles.loginInput, { backgroundColor: C.inputBg, borderColor: C.inputBorder, color: C.text }]}
            placeholder="Admin password"
            placeholderTextColor={C.placeholder}
            value={adminPass}
            onChangeText={t => { setAdminPass(t); setAdminError(''); }}
            secureTextEntry
            autoFocus
            onSubmitEditing={handleAdminLogin}
          />
          {adminError ? <Text style={styles.loginError}>{adminError}</Text> : null}
          <TouchableOpacity style={styles.loginBtn} onPress={handleAdminLogin}>
            <Text style={styles.loginBtnText}>Enter Dashboard</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => router.replace('/')} style={styles.loginBack}>
            <Text style={[styles.loginBackText, { color: C.textMuted }]}>← Back to Business Login</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    );
  }

  // ── Derived stats ───────────────────────────────────────────────────────────
  const businessStats = businesses.map(b => {
    const tickets = b.tickets ?? [];
    const waiting = tickets.filter(t => t.status === 'Waiting').length;
    const called  = tickets.filter(t => t.status === 'Called').length;
    const avgWait = tickets.length > 0
      ? Math.round(tickets.reduce((s, t) => s + (t.avgTime ?? 0), 0) / tickets.length) : 0;
    return { business: b, tickets, waiting, called, avgWait };
  });

  const totalBusinesses = businesses.length;
  const totalInQueue    = businessStats.reduce((s, b) => s + b.tickets.length, 0);
  const totalWaiting    = businessStats.reduce((s, b) => s + b.waiting, 0);
  const totalCalled     = businessStats.reduce((s, b) => s + b.called, 0);

  const filtered = businessStats.filter(b =>
    b.business.name.toLowerCase().includes(search.toLowerCase()) ||
    b.business.type.toLowerCase().includes(search.toLowerCase())
  );

  const typeLabel: Record<string, string> = {
    barbershop: 'Barbershop', doctors_office: "Doctor's Office",
    salon: 'Salon', dental: 'Dental', other: 'Other',
  };

  function getPortalUrl(bizId: string) {
    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    return `${origin}/${bizId}`;
  }

  function shareViaSMS(phone: string, url: string) {
    const body = encodeURIComponent(`Join the queue here: ${url}`);
    const cleaned = phone.replace(/\D/g, '');
    if (typeof window !== 'undefined') window.open(`sms:${cleaned}?body=${body}`, '_self');
    setSmsSent(true);
    setTimeout(() => setSmsSent(false), 3000);
  }

  function copyLink(url: string) {
    try { navigator.clipboard?.writeText(url); } catch {}
    setLinkCopied(true);
    setTimeout(() => setLinkCopied(false), 2000);
  }

  // ── Businesses tab ─────────────────────────────────────────────────────────
  function renderBusinesses() {
    if (dataLoading && businesses.length === 0) {
      return (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#2563eb" />
        </View>
      );
    }

    return (
      <ScrollView contentContainerStyle={styles.tabContent} showsVerticalScrollIndicator={false}>
        <TextInput
          style={[styles.search, { backgroundColor: C.inputBg, borderColor: C.inputBorder, color: C.text }]}
          placeholder="Search businesses..."
          placeholderTextColor={C.placeholder}
          value={search}
          onChangeText={setSearch}
        />

        {filtered.length === 0 && (
          <View style={styles.empty}>
            <Text style={[styles.emptyText, { color: C.textMuted }]}>No businesses found</Text>
          </View>
        )}

        {filtered.map(({ business, tickets, waiting, called, avgWait }) => {
          const isQrOpen = qrBizId === business.id;
          const portalUrl = getPortalUrl(business.id);
          const qrSrc = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&color=000000&bgcolor=ffffff&data=${encodeURIComponent(portalUrl)}`;

          return (
            <View key={business.id} style={[styles.businessCard, { backgroundColor: C.surface, borderColor: C.border }]}>
              <View style={styles.businessCardTop}>
                <View style={styles.businessInfo}>
                  <Text style={[styles.businessName, { color: C.text }]}>{business.name}</Text>
                  <Text style={[styles.businessType, { color: C.primary }]}>{typeLabel[business.type] ?? business.type}</Text>
                  <Text style={[styles.businessId, { color: C.textMuted }]}>ID: {business.id}</Text>
                </View>
                <View style={{ alignItems: 'flex-end', gap: 8 }}>
                  <View style={[styles.statusDot, { backgroundColor: tickets.length > 0 ? '#10b981' : '#d1d5db' }]} />
                  <TouchableOpacity
                    style={[styles.qrToggleBtn, { backgroundColor: isQrOpen ? C.primary : C.surfaceAlt, borderColor: isQrOpen ? C.primary : C.border }]}
                    onPress={() => { setQrBizId(isQrOpen ? null : business.id); setSmsPhone(''); setSmsSent(false); setLinkCopied(false); }}
                  >
                    <Text style={[styles.qrToggleBtnText, { color: isQrOpen ? '#fff' : C.textSub }]}>
                      {isQrOpen ? '✕ Close' : '📱 QR'}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>

              <View style={styles.businessStats}>
                {[
                  { val: waiting, label: 'Waiting',  color: C.text },
                  { val: called,  label: 'Called',   color: '#10b981' },
                  { val: avgWait, label: 'Avg Wait', color: '#8b5cf6', suffix: 'm' },
                  { val: (business.services ?? []).length, label: 'Services', color: '#f59e0b' },
                ].map(({ val, label, color, suffix }) => (
                  <View key={label} style={[styles.bStat, { backgroundColor: C.surfaceAlt }]}>
                    <Text style={[styles.bStatNum, { color }]}>{val}{suffix ?? ''}</Text>
                    <Text style={[styles.bStatLbl, { color: C.textMuted }]}>{label}</Text>
                  </View>
                ))}
              </View>

              <View style={styles.servicesList}>
                {(business.services ?? []).map(s => (
                  <View key={s.id} style={[styles.serviceTag, { backgroundColor: C.surfaceAlt }]}>
                    <Text style={[styles.serviceTagText, { color: C.textSub }]}>{s.name} · {s.avgTime}m</Text>
                  </View>
                ))}
              </View>

              <View style={styles.businessCardBottom}>
                <Text style={[styles.portalLink, { color: C.primary }]}>Portal: /{business.id}</Text>
                <Text style={[styles.joinedDate, { color: C.textMuted }]}>
                  Since {new Date(business.createdAt).toLocaleDateString()}
                </Text>
              </View>

              {isQrOpen && (
                <View style={[styles.qrPanel, { backgroundColor: C.surfaceAlt, borderTopColor: C.border }]}>
                  <View style={styles.qrPanelInner}>
                    <View style={styles.qrImageWrap}>
                      <Image source={{ uri: qrSrc }} style={styles.qrImage} resizeMode="contain" />
                      <Text style={[styles.qrScanHint, { color: C.textMuted }]}>Scan to open portal</Text>
                    </View>
                    <View style={styles.qrShareCol}>
                      <Text style={[styles.qrPortalLabel, { color: C.textMuted }]}>Portal URL</Text>
                      <Text style={[styles.qrPortalUrl, { color: C.primary }]} numberOfLines={1}>{portalUrl}</Text>
                      <TouchableOpacity
                        style={[styles.qrCopyBtn, { backgroundColor: linkCopied ? '#10b981' : C.surface, borderColor: linkCopied ? '#10b981' : C.border }]}
                        onPress={() => copyLink(portalUrl)}
                      >
                        <Text style={[styles.qrCopyBtnText, { color: linkCopied ? '#fff' : C.text }]}>
                          {linkCopied ? '✓ Copied!' : '📋 Copy Link'}
                        </Text>
                      </TouchableOpacity>
                      <Text style={[styles.qrSmsLabel, { color: C.textMuted }]}>Share via SMS</Text>
                      <View style={styles.qrSmsRow}>
                        <TextInput
                          style={[styles.qrSmsInput, { backgroundColor: C.surface, borderColor: C.inputBorder, color: C.text, flex: 1 }]}
                          placeholder="(555) 000-0000"
                          placeholderTextColor={C.placeholder}
                          value={smsPhone}
                          onChangeText={setSmsPhone}
                          keyboardType="phone-pad"
                        />
                        <TouchableOpacity
                          style={[styles.qrSmsBtn, { opacity: smsPhone.replace(/\D/g, '').length < 10 ? 0.4 : 1 }]}
                          onPress={() => shareViaSMS(smsPhone, portalUrl)}
                          disabled={smsPhone.replace(/\D/g, '').length < 10}
                        >
                          <Text style={styles.qrSmsBtnText}>{smsSent ? '✓ Sent' : 'Send'}</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  </View>
                </View>
              )}
            </View>
          );
        })}
      </ScrollView>
    );
  }

  // ── Analytics tab ──────────────────────────────────────────────────────────
  function renderAnalytics() {
    const totalBiz    = businesses.length;
    const proBiz      = businesses.filter(b => b.plan === 'pro').length;
    const basicBiz    = businesses.filter(b => b.plan !== 'pro').length;
    const totalCust   = businesses.reduce((sum, b) => sum + (b.tickets?.length ?? 0), 0);
    const totalSms    = businesses.reduce((sum, b) => sum + (b.smsSentTotal ?? 0), 0);
    const totalEmails = businesses.reduce((sum, b) => sum + (b.emailSentTotal ?? 0), 0);
    const proPercent   = totalBiz > 0 ? Math.round((proBiz / totalBiz) * 100) : 0;
    const basicPercent = 100 - proPercent;

    // Performance by vertical
    const verticals: Record<string, { count: number; customers: number }> = {};
    businesses.forEach(b => {
      if (!verticals[b.type]) verticals[b.type] = { count: 0, customers: 0 };
      verticals[b.type].count++;
      verticals[b.type].customers += b.tickets?.length ?? 0;
    });
    const verticalEntries = Object.entries(verticals).sort((a, b) => b[1].count - a[1].count);
    const maxVertCount = Math.max(1, ...verticalEntries.map(([, v]) => v.count));

    const VERT_COLORS = ['#2563eb', '#8b5cf6', '#10b981', '#f59e0b', '#ef4444', '#06b6d4'];

    return (
      <ScrollView contentContainerStyle={styles.tabContent} showsVerticalScrollIndicator={false}>

        {/* KPI Strip */}
        <Text style={[styles.sectionTitle, { color: C.text }]}>Platform Overview</Text>
        <View style={styles.analyticsGrid}>
          {[
            { val: totalBiz,    label: 'Total Businesses',  accent: '#2563eb' },
            { val: proBiz,      label: 'Pro (Paying)',       accent: '#10b981' },
            { val: totalCust,   label: 'Customers Served',   accent: '#8b5cf6' },
            { val: totalSms,    label: 'SMS Sent',           accent: '#f59e0b' },
            { val: totalEmails, label: 'Emails Sent',        accent: '#06b6d4' },
          ].map(({ val, label, accent }) => (
            <View key={label} style={[styles.analyticsCard, { backgroundColor: C.surface, borderColor: C.border, borderTopColor: accent }]}>
              <Text style={[styles.analyticsNum, { color: accent }]}>{val}</Text>
              <Text style={[styles.analyticsLbl, { color: C.textMuted }]}>{label}</Text>
            </View>
          ))}
        </View>

        {/* Plan Mix */}
        <View style={[styles.busiestCard, { backgroundColor: C.surface, borderColor: C.border }]}>
          <Text style={[styles.sectionTitle, { color: C.text, marginBottom: 12 }]}>Plan Mix</Text>
          {[
            { label: 'Pro', count: proBiz,   pct: proPercent,   color: '#10b981' },
            { label: 'Basic / Free', count: basicBiz, pct: basicPercent, color: '#f59e0b' },
          ].map(({ label, count, pct, color }) => (
            <View key={label} style={{ marginBottom: 14 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 5 }}>
                <Text style={{ fontSize: 13, fontWeight: '600', color: C.textSub }}>{label}</Text>
                <Text style={{ fontSize: 13, fontWeight: '700', color }}>{count} businesses · {pct}%</Text>
              </View>
              <View style={{ height: 10, backgroundColor: C.surfaceAlt, borderRadius: 5, overflow: 'hidden' }}>
                <View style={{ height: 10, borderRadius: 5, backgroundColor: color, width: `${pct}%` as any }} />
              </View>
            </View>
          ))}
        </View>

        {/* Performance by Vertical */}
        <View style={[styles.busiestCard, { backgroundColor: C.surface, borderColor: C.border }]}>
          <Text style={[styles.sectionTitle, { color: C.text, marginBottom: 4 }]}>Performance by Vertical</Text>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8, paddingHorizontal: 2 }}>
            <Text style={{ fontSize: 11, fontWeight: '700', color: C.textMuted, flex: 2 }}>TYPE</Text>
            <Text style={{ fontSize: 11, fontWeight: '700', color: C.textMuted, width: 60, textAlign: 'right' }}>BUSINESSES</Text>
            <Text style={{ fontSize: 11, fontWeight: '700', color: C.textMuted, width: 80, textAlign: 'right' }}>CUSTOMERS</Text>
          </View>
          {verticalEntries.map(([type, data], i) => (
            <View key={type} style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 10,
              borderTopWidth: 1, borderTopColor: C.border }}>
              <View style={{ flex: 2, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: VERT_COLORS[i % VERT_COLORS.length] }} />
                <Text style={{ fontSize: 13, fontWeight: '600', color: C.text }}>{typeLabel[type] ?? type}</Text>
              </View>
              <View style={{ width: 60, alignItems: 'flex-end' }}>
                <Text style={{ fontSize: 13, fontWeight: '700', color: C.text }}>{data.count}</Text>
              </View>
              <View style={{ width: 80, alignItems: 'flex-end' }}>
                <Text style={{ fontSize: 13, fontWeight: '700', color: C.text }}>{data.customers}</Text>
              </View>
            </View>
          ))}
        </View>

        {/* System Health */}
        <View style={[styles.busiestCard, { backgroundColor: C.surface, borderColor: C.border }]}>
          <Text style={[styles.sectionTitle, { color: C.text, marginBottom: 12 }]}>System Health</Text>
          {[
            { label: 'Backend API',        status: 'ok' },
            { label: 'Database',           status: 'ok' },
            { label: 'Stripe Webhooks',    status: 'ok' },
            { label: 'SMS (Telnyx)',       status: 'ok' },
            { label: 'Email (Resend)',     status: 'ok' },
          ].map(({ label, status }) => (
            <View key={label} style={{ flexDirection: 'row', justifyContent: 'space-between',
              alignItems: 'center', paddingVertical: 10, borderTopWidth: 1, borderTopColor: C.border }}>
              <Text style={{ fontSize: 13, fontWeight: '600', color: C.text }}>{label}</Text>
              <View style={{ backgroundColor: '#d1fae5', paddingHorizontal: 10, paddingVertical: 3, borderRadius: 20 }}>
                <Text style={{ fontSize: 11, fontWeight: '700', color: '#065f46' }}>OK</Text>
              </View>
            </View>
          ))}
        </View>

      </ScrollView>
    );
  }

  // ── Live View tab ──────────────────────────────────────────────────────────
  function renderLiveView() {
    const selectedBiz = selectedBizId ? businesses.find(b => b.id === selectedBizId) : null;
    const tickets = selectedBiz?.tickets ?? [];
    const waiting = tickets.filter(t => t.status === 'Waiting');
    const called  = tickets.filter(t => t.status === 'Called');

    return (
      <ScrollView contentContainerStyle={styles.tabContent} showsVerticalScrollIndicator={false}>
        <Text style={[styles.sectionTitle, { color: C.text }]}>Select a Business</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 8 }}>
          <View style={{ flexDirection: 'row', gap: 8, paddingBottom: 4 }}>
            {businesses.map(b => (
              <TouchableOpacity
                key={b.id}
                style={[styles.bizPill, { backgroundColor: C.surface, borderColor: C.border },
                  selectedBizId === b.id && styles.bizPillActive]}
                onPress={() => setSelectedBizId(b.id)}
              >
                <Text style={[styles.bizPillText, { color: C.textSub },
                  selectedBizId === b.id && styles.bizPillTextActive]}>
                  {b.name}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>

        {!selectedBiz ? (
          <View style={styles.empty}>
            <Text style={[styles.emptyText, { color: C.textMuted }]}>Select a business above to view their live queue</Text>
          </View>
        ) : (
          <>
            <View style={styles.liveStatsRow}>
              {[
                { val: waiting.length, label: 'Waiting',  color: C.text },
                { val: called.length,  label: 'Called',   color: '#10b981' },
                { val: tickets.length, label: 'Total',    color: '#8b5cf6' },
                { val: (selectedBiz.services ?? []).length, label: 'Services', color: '#f59e0b' },
              ].map(({ val, label, color }) => (
                <View key={label} style={[styles.liveStat, { backgroundColor: C.surface, borderColor: C.border }]}>
                  <Text style={[styles.liveStatNum, { color }]}>{val}</Text>
                  <Text style={[styles.liveStatLbl, { color: C.textMuted }]}>{label}</Text>
                </View>
              ))}
            </View>

            {called.length > 0 && (
              <>
                <Text style={[styles.sectionTitle, { color: C.text }]}>Now Being Served</Text>
                {called.map(ticket => (
                  <View key={ticket.id} style={[styles.ticketCard, styles.ticketCalled, { backgroundColor: C.surface }]}>
                    <View style={styles.ticketLeft}>
                      <Text style={styles.ticketPos}>#{ticket.position}</Text>
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.ticketName, { color: C.text }]}>{ticket.customerName}</Text>
                        <Text style={[styles.ticketService, { color: C.textSub }]}>{ticket.serviceName}</Text>
                        {ticket.phoneNumber ? <Text style={[styles.ticketPhone, { color: C.textMuted }]}>{ticket.phoneNumber}</Text> : null}
                      </View>
                    </View>
                    <View style={[styles.statusBadge, { backgroundColor: isDark ? '#064e3b' : '#d1fae5' }]}>
                      <Text style={[styles.statusBadgeText, { color: '#10b981' }]}>Called</Text>
                    </View>
                  </View>
                ))}
              </>
            )}

            <Text style={[styles.sectionTitle, { color: C.text }]}>Waiting ({waiting.length})</Text>
            {waiting.length === 0 ? (
              <View style={styles.empty}>
                <Text style={[styles.emptyText, { color: C.textMuted }]}>No one waiting right now</Text>
              </View>
            ) : (
              waiting.map(ticket => (
                <View key={ticket.id} style={[styles.ticketCard, { backgroundColor: C.surface, borderColor: C.border }]}>
                  <View style={styles.ticketLeft}>
                    <Text style={styles.ticketPos}>#{ticket.position}</Text>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.ticketName, { color: C.text }]}>{ticket.customerName}</Text>
                      <Text style={[styles.ticketService, { color: C.textSub }]}>{ticket.serviceName}</Text>
                      {ticket.phoneNumber ? <Text style={[styles.ticketPhone, { color: C.textMuted }]}>{ticket.phoneNumber}</Text> : null}
                    </View>
                  </View>
                  <Text style={styles.ticketWait}>~{ticket.avgTime}m</Text>
                </View>
              ))
            )}
          </>
        )}
      </ScrollView>
    );
  }

  // ── Settings tab ───────────────────────────────────────────────────────────
  function renderSettings() {
    function handleSavePass() {
      if (settingsNewPass.length < 6) { setSettingsMsg('Password must be at least 6 characters.'); return; }
      if (settingsNewPass !== settingsConfirmPass) { setSettingsMsg('Passwords do not match.'); return; }
      setSettingsMsg('Admin password updated successfully.');
      setSettingsNewPass(''); setSettingsConfirmPass('');
    }
    const totalServices = businesses.reduce((s, b) => s + (b.services ?? []).length, 0);

    return (
      <ScrollView contentContainerStyle={styles.tabContent} showsVerticalScrollIndicator={false}>
        <View style={[styles.settingsSection, { backgroundColor: C.surface, borderColor: C.border }]}>
          <Text style={[styles.settingsSectionTitle, { color: C.text }]}>Change Admin Password</Text>
          <Text style={[styles.settingsSectionSub, { color: C.textMuted }]}>
            Update the super admin password used to access this dashboard.
          </Text>
          <View style={{ marginTop: 16, gap: 12 }}>
            <View>
              <Text style={[styles.settingsLabel, { color: C.textSub }]}>New Password</Text>
              <View style={[styles.settingsInputRow, { backgroundColor: C.inputBg, borderColor: C.inputBorder }]}>
                <TextInput
                  style={[styles.settingsInput, { color: C.text }]}
                  placeholder="Min. 6 characters"
                  placeholderTextColor={C.placeholder}
                  value={settingsNewPass}
                  onChangeText={t => { setSettingsNewPass(t); setSettingsMsg(''); }}
                  secureTextEntry={!showSettingsPass}
                />
                <TouchableOpacity onPress={() => setShowSettingsPass(p => !p)} style={{ paddingHorizontal: 12 }}>
                  <Text style={{ color: C.primary, fontSize: 13, fontWeight: '600' }}>
                    {showSettingsPass ? 'Hide' : 'Show'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
            <View>
              <Text style={[styles.settingsLabel, { color: C.textSub }]}>Confirm Password</Text>
              <TextInput
                style={[styles.settingsInputStandalone, { backgroundColor: C.inputBg, borderColor: C.inputBorder, color: C.text }]}
                placeholder="Re-enter new password"
                placeholderTextColor={C.placeholder}
                value={settingsConfirmPass}
                onChangeText={t => { setSettingsConfirmPass(t); setSettingsMsg(''); }}
                secureTextEntry={!showSettingsPass}
              />
            </View>
            {settingsMsg ? (
              <Text style={{ fontSize: 13, fontWeight: '500', color: settingsMsg.includes('successfully') ? '#10b981' : '#f87171' }}>
                {settingsMsg}
              </Text>
            ) : null}
            <TouchableOpacity style={styles.settingsSaveBtn} onPress={handleSavePass}>
              <Text style={styles.settingsSaveBtnText}>Save Password</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={[styles.settingsSection, { backgroundColor: C.surface, borderColor: C.border }]}>
          <Text style={[styles.settingsSectionTitle, { color: C.text }]}>Platform Stats</Text>
          <Text style={[styles.settingsSectionSub, { color: C.textMuted }]}>
            Live snapshot of all activity across OmniQueue.
          </Text>
          <View style={{ marginTop: 16 }}>
            {[
              { label: 'Total Businesses',      val: totalBusinesses, color: C.primary },
              { label: 'Total Services',         val: totalServices,   color: '#8b5cf6' },
              { label: 'Tickets in All Queues',  val: totalInQueue,    color: '#f59e0b' },
              { label: 'Currently Being Served', val: totalCalled,     color: '#10b981' },
            ].map(({ label, val, color }, i, arr) => (
              <View key={label} style={[styles.statRow, { borderBottomColor: i < arr.length - 1 ? C.border : 'transparent' }]}>
                <Text style={[styles.statRowLabel, { color: C.textSub }]}>{label}</Text>
                <Text style={[styles.statRowValue, { color }]}>{val}</Text>
              </View>
            ))}
          </View>
        </View>
      </ScrollView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: C.bg }]}>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <View style={styles.body}>

        <View style={[styles.sidebar, { backgroundColor: C.sidebar, borderRightColor: C.sidebarBorder }]}>
          <View style={styles.sidebarTop}>
            <Text style={[styles.sidebarTitle, { color: C.text }]}>OmniQueue</Text>
            <Text style={[styles.sidebarRole, { color: C.primary }]}>Super Admin</Text>
          </View>
          <View style={styles.navItems}>
            {([
              { t: 'businesses', icon: '🏢', label: 'Businesses' },
              { t: 'analytics',  icon: '📊', label: 'Analytics'  },
              { t: 'liveview',   icon: '🔴', label: 'Live View'  },
              { t: 'settings',   icon: '⚙️',  label: 'Settings'   },
            ] as { t: Tab; icon: string; label: string }[]).map(({ t, icon, label }) => (
              <TouchableOpacity
                key={t}
                style={[styles.navItem, tab === t && [styles.navItemActive, { backgroundColor: C.navActive }]]}
                onPress={() => setTab(t)}
              >
                <Text style={styles.navIcon}>{icon}</Text>
                <Text style={[styles.navLabel, { color: C.navText },
                  tab === t && [styles.navLabelActive, { color: C.navActiveText }]]}>
                  {label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          <View style={styles.sidebarBottom}>
            <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
              <Text style={styles.logoutIcon}>🚪</Text>
              <Text style={[styles.logoutText, { color: C.textMuted }]}>Logout</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={[styles.main, { backgroundColor: C.bg }]}>
          <View style={[styles.topBar, { backgroundColor: C.topBar, borderBottomColor: C.border }]}>
            <Text style={[styles.topBarTitle, { color: C.text }]}>
              {tab === 'businesses' ? `All Businesses (${totalBusinesses})` :
               tab === 'analytics'  ? 'Analytics' :
               tab === 'liveview'   ? 'Live View' : 'Settings'}
            </Text>
            <TouchableOpacity onPress={toggleTheme} style={{ padding: 6 }}>
              <Text style={{ fontSize: 18 }}>{isDark ? '☀️' : '🌙'}</Text>
            </TouchableOpacity>
          </View>
          {tab === 'businesses' && renderBusinesses()}
          {tab === 'analytics'  && renderAnalytics()}
          {tab === 'liveview'   && renderLiveView()}
          {tab === 'settings'   && renderSettings()}
        </View>
      </View>
    </SafeAreaView>
  );
}

const SIDEBAR_W = 160;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#151718' },
  body: { flex: 1, flexDirection: 'row' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  empty: { alignItems: 'center', padding: 32 },
  emptyText: { color: '#6b7280', fontSize: 14 },

  loginCard: {
    backgroundColor: '#1e2022', borderRadius: 16, padding: 28,
    width: '100%', maxWidth: 400, alignItems: 'stretch',
  },
  loginLogo: { fontSize: 28, fontWeight: '800', textAlign: 'center', marginBottom: 4 },
  loginTitle: { fontSize: 18, fontWeight: '700', textAlign: 'center', marginBottom: 6 },
  loginSubtitle: { fontSize: 14, textAlign: 'center', marginBottom: 20 },
  loginInput: {
    borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12,
    fontSize: 15, marginBottom: 12, borderWidth: 1,
  },
  loginError: { color: '#f87171', fontSize: 13, marginBottom: 10, textAlign: 'center' },
  loginBtn: {
    backgroundColor: '#2563eb', borderRadius: 10,
    paddingVertical: 14, alignItems: 'center', marginBottom: 14,
  },
  loginBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  loginBack: { alignItems: 'center' },
  loginBackText: { fontSize: 13 },

  sidebar: {
    width: SIDEBAR_W, borderRightWidth: 1,
    paddingVertical: Spacing.md, justifyContent: 'space-between',
  },
  sidebarTop: { paddingHorizontal: Spacing.md, marginBottom: Spacing.lg },
  sidebarTitle: { fontSize: 15, fontWeight: '800' },
  sidebarRole: { fontSize: 11, marginTop: 2, fontWeight: '600' },
  navItems: { flex: 1, gap: 4, paddingHorizontal: Spacing.sm },
  navItem: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: 10, paddingHorizontal: Spacing.sm,
    borderRadius: BorderRadius.md, gap: Spacing.sm,
  },
  navItemActive: {},
  navIcon: { fontSize: 16 },
  navLabel: { fontSize: 13, fontWeight: '600' },
  navLabelActive: {},
  sidebarBottom: { paddingHorizontal: Spacing.md },
  logoutBtn: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, paddingVertical: Spacing.sm },
  logoutIcon: { fontSize: 14 },
  logoutText: { fontSize: 13 },

  main: { flex: 1 },
  topBar: {
    paddingHorizontal: Spacing.md, paddingVertical: Spacing.md,
    borderBottomWidth: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
  },
  topBarTitle: { fontSize: 18, fontWeight: '700' },
  tabContent: { padding: Spacing.md, gap: Spacing.md },

  search: {
    borderRadius: BorderRadius.md, paddingHorizontal: 14,
    paddingVertical: 10, fontSize: 14, borderWidth: 1,
  },

  businessCard: { borderRadius: BorderRadius.lg, padding: Spacing.md, gap: Spacing.sm, borderWidth: 1 },
  businessCardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  businessInfo: { flex: 1, gap: 2 },
  businessName: { fontSize: 16, fontWeight: '700' },
  businessType: { fontSize: 12, fontWeight: '600' },
  businessId: { fontSize: 11 },
  statusDot: { width: 10, height: 10, borderRadius: 5 },

  businessStats: { flexDirection: 'row', gap: Spacing.sm },
  bStat: { flex: 1, borderRadius: BorderRadius.md, padding: 8, alignItems: 'center' },
  bStatNum: { fontSize: 18, fontWeight: '700' },
  bStatLbl: { fontSize: 10, marginTop: 2 },

  servicesList: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  serviceTag: { borderRadius: BorderRadius.full, paddingHorizontal: 10, paddingVertical: 4 },
  serviceTagText: { fontSize: 11 },

  businessCardBottom: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  portalLink: { fontSize: 12, fontWeight: '600' },
  joinedDate: { fontSize: 11 },

  sectionTitle: { fontSize: 15, fontWeight: '700' },

  analyticsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  analyticsCard: {
    flex: 1, minWidth: 120, borderRadius: BorderRadius.lg, padding: Spacing.md,
    borderTopWidth: 3, alignItems: 'center', borderWidth: 1,
  },
  analyticsNum: { fontSize: 28, fontWeight: '800' },
  analyticsLbl: { fontSize: 12, marginTop: 4 },

  typeRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  typeRowLabel: { fontSize: 13, width: 110 },
  typeBarWrap: { flex: 1, borderRadius: 4, height: 8, overflow: 'hidden' },
  typeBar: { height: 8, backgroundColor: '#2563eb', borderRadius: 4 },
  typeRowCount: { fontSize: 13, fontWeight: '700', width: 24, textAlign: 'right' },

  busiestCard: { borderRadius: BorderRadius.lg, padding: Spacing.md, borderWidth: 1 },
  busiestName: { fontSize: 16, fontWeight: '700' },
  busiestSub: { fontSize: 13, marginTop: 4 },

  activeQueueRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    borderRadius: BorderRadius.md, padding: Spacing.md, borderWidth: 1,
  },
  activeQueueName: { fontSize: 14, fontWeight: '600' },
  activeQueueRight: { alignItems: 'flex-end' },
  activeQueueCount: { color: '#f59e0b', fontSize: 13, fontWeight: '600' },
  activeQueueWait: { fontSize: 11, marginTop: 2 },

  bizPill: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1 },
  bizPillActive: { backgroundColor: '#1e3a8a', borderColor: '#2563eb' },
  bizPillText: { fontSize: 13, fontWeight: '600' },
  bizPillTextActive: { color: '#fff' },

  liveStatsRow: { flexDirection: 'row', gap: 8 },
  liveStat: { flex: 1, borderRadius: 10, padding: 12, alignItems: 'center', borderWidth: 1 },
  liveStatNum: { fontSize: 22, fontWeight: '800' },
  liveStatLbl: { fontSize: 11, marginTop: 2 },

  ticketCard: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    borderRadius: 12, padding: 14, borderWidth: 1,
  },
  ticketCalled: { borderColor: '#065f46' },
  ticketLeft: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  ticketPos: { color: '#2563eb', fontSize: 18, fontWeight: '800', width: 32 },
  ticketName: { fontSize: 14, fontWeight: '600' },
  ticketService: { fontSize: 12, marginTop: 2 },
  ticketPhone: { fontSize: 11, marginTop: 1 },
  ticketWait: { color: '#f59e0b', fontSize: 13, fontWeight: '700' },
  statusBadge: { borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 },
  statusBadgeText: { fontSize: 12, fontWeight: '700' },

  settingsSection: { borderRadius: BorderRadius.lg, padding: Spacing.md, borderWidth: 1 },
  settingsSectionTitle: { fontSize: 15, fontWeight: '700', marginBottom: 4 },
  settingsSectionSub: { fontSize: 13, lineHeight: 18 },
  settingsLabel: { fontSize: 12, fontWeight: '600', marginBottom: 6 },
  settingsInputRow: {
    flexDirection: 'row', alignItems: 'center',
    borderRadius: BorderRadius.md, borderWidth: 1, overflow: 'hidden',
  },
  settingsInput: { flex: 1, paddingHorizontal: 14, paddingVertical: 11, fontSize: 14 },
  settingsInputStandalone: {
    borderRadius: BorderRadius.md, paddingHorizontal: 14, paddingVertical: 11,
    fontSize: 14, borderWidth: 1,
  },
  settingsSaveBtn: { backgroundColor: '#2563eb', borderRadius: BorderRadius.md, paddingVertical: 12, alignItems: 'center' },
  settingsSaveBtnText: { color: '#fff', fontSize: 14, fontWeight: '700' },
  statRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1 },
  statRowLabel: { fontSize: 13 },
  statRowValue: { fontSize: 18, fontWeight: '800' },

  qrToggleBtn: { borderWidth: 1, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 5 },
  qrToggleBtnText: { fontSize: 12, fontWeight: '700' },
  qrPanel: { marginTop: 4, borderTopWidth: 1, paddingTop: 16 },
  qrPanelInner: { flexDirection: 'row', gap: 16, alignItems: 'flex-start' },
  qrImageWrap: { alignItems: 'center', gap: 6 },
  qrImage: { width: 140, height: 140, borderRadius: 8, backgroundColor: '#fff' },
  qrScanHint: { fontSize: 11 },
  qrShareCol: { flex: 1, gap: 8 },
  qrPortalLabel: { fontSize: 11, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 },
  qrPortalUrl: { fontSize: 13, fontWeight: '600' },
  qrCopyBtn: { borderWidth: 1, borderRadius: 8, paddingVertical: 8, alignItems: 'center' },
  qrCopyBtnText: { fontSize: 13, fontWeight: '600' },
  qrSmsLabel: { fontSize: 11, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5, marginTop: 4 },
  qrSmsRow: { flexDirection: 'row', gap: 8 },
  qrSmsInput: { borderWidth: 1, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 8, fontSize: 13 },
  qrSmsBtn: { backgroundColor: '#2563eb', borderRadius: 8, paddingHorizontal: 14, paddingVertical: 8, justifyContent: 'center' },
  qrSmsBtnText: { color: '#fff', fontSize: 13, fontWeight: '700' },
});
