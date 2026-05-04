// Business dashboard — scoped to a specific business
// Accessed via /:businessId/dashboard after login

import React, { useState, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, TextInput, StyleSheet,
  SafeAreaView, Modal, ActivityIndicator, ScrollView,
  KeyboardAvoidingView, Platform, Image,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { BorderRadius, Spacing } from '../../constants/theme';
import { api, ApiBusiness, ApiService, ApiTicket, ApiStaff } from '../../services/api';

type Tab = 'home' | 'queue' | 'walkin' | 'services' | 'staff' | 'appointments' | 'customers' | 'subscription' | 'settings';

const LIGHT = {
  bg: '#f5f7fa', surface: '#ffffff', surfaceAlt: '#f0f2f5', border: '#e2e8f0',
  text: '#111827', textSub: '#4b5563', textMuted: '#9ca3af',
  primary: '#2563eb', navActive: '#eff6ff', navActiveText: '#0a7ea4', navText: '#4b5563',
  sidebar: '#ffffff', sidebarBorder: '#e2e8f0', topBar: '#ffffff',
  inputBg: '#f9fafb', inputBorder: '#d1d5db', placeholder: '#9ca3af',
};
const DARK = {
  bg: '#151718', surface: '#1e1e1e', surfaceAlt: '#2a2a2a', border: '#2a2a2a',
  text: '#ffffff', textSub: '#9ba1a6', textMuted: '#6b7280',
  primary: '#2563eb', navActive: '#0a7ea422', navActiveText: '#0a7ea4', navText: '#6b7280',
  sidebar: '#111111', sidebarBorder: '#2a2a2a', topBar: '#151718',
  inputBg: '#1e1e1e', inputBorder: '#3a3a3a', placeholder: '#4a4a4a',
};

function readTheme(): boolean {
  try { return (typeof localStorage !== 'undefined') && localStorage.getItem('omniqueue_theme') === 'dark'; }
  catch { return false; }
}

const NAV_ITEMS: { tab: Tab; icon: string; label: string }[] = [
  { tab: 'home',         icon: '🏠', label: 'Home'         },
  { tab: 'queue',        icon: '📋', label: 'Live Queue'   },
  { tab: 'walkin',       icon: '➕', label: 'Add Walk-in'  },
  { tab: 'services',     icon: '⚙️',  label: 'Services'    },
  { tab: 'staff',        icon: '👤', label: 'Staff'        },
  { tab: 'appointments', icon: '📅', label: 'Appointments' },
  { tab: 'customers',    icon: '📊', label: 'Analytics'    },
  { tab: 'subscription', icon: '💳', label: 'Subscription' },
  { tab: 'settings',     icon: '🔧', label: 'Settings'     },
];

function timeAgo(iso: string): string {
  const mins = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  return `${Math.floor(mins / 60)}h ${mins % 60}m ago`;
}

export default function BusinessDashboard() {
  const router = useRouter();
  const { businessId } = useLocalSearchParams<{ businessId: string }>();

  // ── API state ──────────────────────────────────────────────────────────────
  const [business, setBusiness]   = useState<ApiBusiness | null>(null);
  const [tickets, setTickets]     = useState<ApiTicket[]>([]);
  const [services, setServices]   = useState<ApiService[]>([]);
  const [loading, setLoading]     = useState(true);
  const [activeTab, setActiveTab] = useState<Tab>('home');

  // Theme
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

  // Services management
  const [newServiceName, setNewServiceName] = useState('');
  const [newServiceTime, setNewServiceTime] = useState('');
  const [servicesSaved, setServicesSaved]   = useState(false);
  const [savingServices, setSavingServices] = useState(false);

  // Walk-in form
  const [walkInName, setWalkInName]           = useState('');
  const [walkInPhone, setWalkInPhone]         = useState('');
  const [walkInServiceId, setWalkInServiceId] = useState('');
  const [walkInSuccess, setWalkInSuccess]     = useState(false);
  const [walkInLoading, setWalkInLoading]     = useState(false);
  const [walkInError, setWalkInError]         = useState('');

  // Confirm modal
  const [confirmModal, setConfirmModal] = useState<{
    visible: boolean; action: 'done' | 'remove' | 'call' | null; ticket: ApiTicket | null;
  }>({ visible: false, action: null, ticket: null });

  // Message modal
  const [messageModal, setMessageModal] = useState<{
    visible: boolean; name: string; phone: string;
  }>({ visible: false, name: '', phone: '' });

  // QR share state
  const [qrOpen, setQrOpen]             = useState(false);
  const [qrSmsPhone, setQrSmsPhone]     = useState('');
  const [qrSmsSent, setQrSmsSent]       = useState(false);
  const [qrLinkCopied, setQrLinkCopied] = useState(false);

  // Portal URL + QR helpers
  const portalUrl = typeof window !== 'undefined'
    ? `${window.location.origin}/${businessId}`
    : `/${businessId}`;
  const qrSrc = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&color=000000&bgcolor=ffffff&data=${encodeURIComponent(portalUrl)}`;

  // Settings tab state
  const [settingsHours, setSettingsHours] = useState({
    mon: '9:00 AM – 6:00 PM', tue: '9:00 AM – 6:00 PM', wed: '9:00 AM – 6:00 PM',
    thu: '9:00 AM – 6:00 PM', fri: '9:00 AM – 6:00 PM',
    sat: '10:00 AM – 4:00 PM', sun: 'Closed',
  });
  const [hoursSaved, setHoursSaved] = useState(false);
  const [notificationChannel, setNotificationChannel] = useState<'sms' | 'email' | 'both'>('sms');
  const [notifSaved, setNotifSaved] = useState(false);

  // Staff (localStorage)
  const [staff, setStaff] = useState<ApiStaff[]>([]);
  const [newStaffName, setNewStaffName]   = useState('');
  const [newStaffRole, setNewStaffRole]   = useState('');
  const [newStaffPhone, setNewStaffPhone] = useState('');
  const [newStaffPhoto, setNewStaffPhoto] = useState('');

  // Appointments
  const [appointments, setAppointments] = useState<import('../../services/api').ApiAppointment[]>([]);
  const [calView, setCalView] = useState<'today' | 'week' | 'month'>('today');

  // Google Calendar
  const [googleConnected, setGoogleConnected]   = useState(false);
  const [googleConnecting, setGoogleConnecting] = useState(false);
  const [googleSaved, setGoogleSaved]           = useState(false);

  // Subscription plan
  const [plan, setPlan] = useState<'basic' | 'pro'>('basic');

  // Stripe checkout state
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [checkoutError, setCheckoutError]     = useState('');
  const [stripeSuccess, setStripeSuccess]     = useState(false);

  // ── Handle URL params (Google OAuth callback + Stripe success) ────────────
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    const rawTokens = params.get('google_tokens');
    const isSuccess = params.get('success') === 'true';

    // Stripe success — plan is now pro
    if (isSuccess) {
      setPlan('pro');
      setStripeSuccess(true);
      setTimeout(() => setStripeSuccess(false), 6000);
    }

    if (!rawTokens) {
      // Just check current status
      api.getGoogleStatus().then(r => setGoogleConnected(r.connected)).catch(() => {});
      const clean = window.location.pathname;
      if (isSuccess) window.history.replaceState({}, '', clean);
      return;
    }
    // Tokens came back from Google OAuth — save them then clean the URL
    try {
      const tokens = JSON.parse(decodeURIComponent(rawTokens));
      api.saveGoogleTokens(tokens)
        .then(() => { setGoogleConnected(true); setGoogleSaved(true); setTimeout(() => setGoogleSaved(false), 4000); })
        .catch(() => {});
    } catch {}
    const clean = window.location.pathname;
    window.history.replaceState({}, '', clean);
  }, []);

  // ── Load data on mount ──────────────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false;
    async function init() {
      try {
        const [
          { business: biz },
          { services: svcs },
          { tickets: tix },
          staffRes,
          apptRes,
        ] = await Promise.all([
          api.getMyBusiness(),
          api.getServices(),
          api.getQueue(),
          api.getStaff().catch(() => ({ staff: [] })),
          api.getMyAppointments().catch(() => ({ appointments: [] })),
        ]);
        if (cancelled) return;
        setBusiness(biz);
        setServices(svcs);
        setTickets(tix);
        setStaff(staffRes.staff);
        setPlan(biz.plan ?? 'basic');
        setAppointments(apptRes.appointments);
        if (svcs.length > 0) setWalkInServiceId(svcs[0].id);
      } catch {
        if (!cancelled) router.replace('/');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    init();
    return () => { cancelled = true; };
  }, [businessId]);

  // ── Poll queue every 5 seconds ─────────────────────────────────────────────
  useEffect(() => {
    const id = setInterval(async () => {
      try {
        const { tickets: tix } = await api.getQueue();
        setTickets(tix);
      } catch {}
    }, 5000);
    return () => clearInterval(id);
  }, []);

  // ── Helpers ────────────────────────────────────────────────────────────────
  function shareViaSMS() {
    const body = encodeURIComponent(`Join the queue here: ${portalUrl}`);
    const cleaned = qrSmsPhone.replace(/\D/g, '');
    if (typeof window !== 'undefined') window.open(`sms:${cleaned}?body=${body}`, '_self');
    setQrSmsSent(true);
    setTimeout(() => setQrSmsSent(false), 3000);
  }

  function copyLink() {
    try { navigator.clipboard?.writeText(portalUrl); } catch {}
    setQrLinkCopied(true);
    setTimeout(() => setQrLinkCopied(false), 2000);
  }

  async function handleLogout() {
    try { await fetch('/api/auth/sign-out', { method: 'POST', credentials: 'include' }); } catch {}
    router.replace('/');
  }

  // ── Walk-in ────────────────────────────────────────────────────────────────
  async function handleAddWalkIn() {
    if (!walkInName.trim() || walkInPhone.trim().length < 10) return;
    setWalkInLoading(true);
    setWalkInError('');
    try {
      const serviceId = walkInServiceId || services[0]?.id;
      await api.addWalkin(walkInName.trim(), walkInPhone.trim(), serviceId);
      const { tickets: tix } = await api.getQueue();
      setTickets(tix);
      setWalkInSuccess(true);
      setWalkInName(''); setWalkInPhone('');
      if (services.length > 0) setWalkInServiceId(services[0].id);
      setTimeout(() => setWalkInSuccess(false), 3000);
    } catch (e: any) {
      setWalkInError(e?.message ?? 'Failed to add customer');
    } finally {
      setWalkInLoading(false);
    }
  }

  async function handleConfirm() {
    const { action, ticket } = confirmModal;
    setConfirmModal({ visible: false, action: null, ticket: null });
    if (!ticket) return;
    try {
      if (action === 'done')   await api.markDone(ticket.id);
      if (action === 'remove') await api.removeTicket(ticket.id);
      if (action === 'call')   await api.callTicket(ticket.id);
      const { tickets: tix } = await api.getQueue();
      setTickets(tix);
    } catch {}
  }

  async function saveServices() {
    setSavingServices(true);
    try {
      await Promise.all(services.map(s => api.updateService(s.id, s.name, s.avgTime)));
      setServicesSaved(true);
      setTimeout(() => setServicesSaved(false), 2500);
    } catch {}
    setSavingServices(false);
  }

  async function addService() {
    if (!newServiceName.trim() || !newServiceTime.trim()) return;
    const time = parseInt(newServiceTime, 10);
    if (isNaN(time) || time <= 0) return;
    try {
      await api.addService(newServiceName.trim(), time);
      const { services: svcs } = await api.getServices();
      setServices(svcs);
      setNewServiceName(''); setNewServiceTime('');
    } catch {}
  }

  async function removeService(id: string) {
    try {
      await api.deleteService(id);
      setServices(prev => prev.filter(s => s.id !== id));
    } catch {}
  }

  function updateServiceLocal(id: string, field: 'name' | 'avgTime', value: string) {
    setServices(prev => prev.map(s =>
      s.id === id ? { ...s, [field]: field === 'avgTime' ? parseInt(value, 10) || s.avgTime : value } : s
    ));
  }

  // ── Stats ──────────────────────────────────────────────────────────────────
  const liveTickets    = tickets.filter(t => t.status !== 'Done');
  const servedToday    = tickets.filter(t => t.status === 'Done');
  const waitingTickets = tickets.filter(t => t.status === 'Waiting');
  const calledTickets  = tickets.filter(t => t.status === 'Called');
  const avgWait = waitingTickets.length > 0
    ? Math.round(waitingTickets.reduce((s, t) => s + t.avgTime, 0) / waitingTickets.length) : 0;

  // Tab visibility based on plan
  const BASIC_TABS: Tab[] = ['home', 'services', 'appointments', 'subscription', 'settings'];
  const visibleNavItems = plan === 'pro' ? NAV_ITEMS : NAV_ITEMS.filter(n => BASIC_TABS.includes(n.tab));

  function statusColor(status: ApiTicket['status']) {
    if (status === 'Called')  return '#10b981';
    if (status === 'Waiting') return '#f59e0b';
    return '#6b7280';
  }

  // Loading screen
  if (loading) {
    return (
      <View style={[styles.centered, { backgroundColor: isDark ? '#151718' : '#f5f7fa' }]}>
        <ActivityIndicator size="large" color="#2563eb" />
      </View>
    );
  }

  // Visit badge — counts same phone in current queue
  function VisitBadge({ phone }: { phone: string }) {
    const count = tickets.filter(t => t.phoneNumber === phone).length;
    if (count > 1) return (
      <View style={styles.visitBadgeBlue}>
        <Text style={styles.visitBadgeBlueText}>Repeat</Text>
      </View>
    );
    return (
      <View style={styles.visitBadgeAmber}>
        <Text style={styles.visitBadgeAmberText}>1st Visit</Text>
      </View>
    );
  }

  // ── Ticket card ────────────────────────────────────────────────────────────
  function TicketCard({ item, index = 0, compact = false }: { item: ApiTicket; index?: number; compact?: boolean }) {
    const isCalled = item.status === 'Called';
    const joinedAt = (() => {
      const d = new Date(item.createdAt);
      const h = d.getHours(); const m = d.getMinutes();
      const ampm = h >= 12 ? 'PM' : 'AM';
      const h12 = h > 12 ? h - 12 : h === 0 ? 12 : h;
      return `${h12}:${String(m).padStart(2,'0')} ${ampm}`;
    })();
    const waitMins = Math.floor((Date.now() - new Date(item.createdAt).getTime()) / 60000);
    return (
      <View style={[styles.ticketCard, isCalled && styles.ticketCardCalled, compact && styles.ticketCardCompact,
        { backgroundColor: C.surface, borderColor: isCalled ? '#10b981' : C.border }]}>
        <View style={styles.ticketTop}>
          <View style={[styles.positionBadge, { backgroundColor: statusColor(item.status) }]}>
            <Text style={styles.positionText}>#{index + 1}</Text>
          </View>
          <View style={styles.customerInfo}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <Text style={[styles.customerName, { color: C.text }]}>{item.customerName}</Text>
              {item.phoneNumber ? <VisitBadge phone={item.phoneNumber} /> : null}
            </View>
            <Text style={[styles.customerPhone, { color: C.textMuted }]}>{item.phoneNumber}</Text>
          </View>
          <View style={[styles.statusPill, { backgroundColor: statusColor(item.status) + '22' }]}>
            <Text style={[styles.statusPillText, { color: statusColor(item.status) }]}>
              {isCalled ? 'Called' : 'Waiting'}
            </Text>
          </View>
        </View>

        <View style={styles.ticketMeta}>
          <Text style={[styles.metaText, { color: C.textSub }]}>✂ {item.serviceName}</Text>
          <Text style={[styles.metaDot, { color: C.border }]}>·</Text>
          <Text style={[styles.metaText, { color: C.textSub }]}>Joined {joinedAt}</Text>
          <Text style={[styles.metaDot, { color: C.border }]}>·</Text>
          <Text style={[styles.metaText, { color: C.textSub }]}>{waitMins}m waiting</Text>
          {!compact && (
            <>
              <Text style={[styles.metaDot, { color: C.border }]}>·</Text>
              <Text style={[styles.metaText, { color: C.textSub }]}>~{item.avgTime}m svc</Text>
            </>
          )}
        </View>

        {!compact && (
          <View style={styles.ticketActions}>
            {!isCalled && (
              <TouchableOpacity style={styles.callBtn} onPress={() => setConfirmModal({ visible: true, action: 'call', ticket: item })}>
                <Text style={styles.callBtnText}>▶ Serve</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity style={styles.doneBtn} onPress={() => setConfirmModal({ visible: true, action: 'done', ticket: item })}>
              <Text style={styles.doneBtnText}>✓ Done</Text>
            </TouchableOpacity>
            {item.phoneNumber ? (
              <TouchableOpacity style={[styles.removeBtn, { borderColor: '#2563eb22', backgroundColor: '#eff6ff' }]}
                onPress={() => setMessageModal({ visible: true, name: item.customerName, phone: item.phoneNumber })}>
                <Text style={[styles.removeBtnText, { color: '#2563eb' }]}>✉ Message</Text>
              </TouchableOpacity>
            ) : null}
            <TouchableOpacity style={[styles.removeBtn, { borderColor: C.border }]} onPress={() => setConfirmModal({ visible: true, action: 'remove', ticket: item })}>
              <Text style={[styles.removeBtnText, { color: C.textSub }]}>Remove</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    );
  }

  // ── Home tab ───────────────────────────────────────────────────────────────
  function renderHome() {
    const preview = liveTickets.slice(0, 3);
    return (
      <ScrollView contentContainerStyle={styles.tabContent} showsVerticalScrollIndicator={false}>
        <View style={styles.statsRow}>
          {[
            { val: waitingTickets.length, label: 'Waiting',  accent: '#f59e0b', numColor: C.text },
            { val: calledTickets.length,  label: 'Called',   accent: '#10b981', numColor: '#10b981' },
            { val: `${avgWait}m`,         label: 'Avg Wait', accent: '#8b5cf6', numColor: '#8b5cf6' },
          ].map(({ val, label, accent, numColor }) => (
            <View key={label} style={[styles.statCard, { backgroundColor: C.surface, borderTopColor: accent }]}>
              <Text style={[styles.statNum, { color: numColor }]}>{val}</Text>
              <Text style={[styles.statLbl, { color: C.textMuted }]}>{label}</Text>
            </View>
          ))}
        </View>

        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: C.text }]}>Live Queue</Text>
          <TouchableOpacity onPress={() => setActiveTab('queue')}>
            <Text style={styles.sectionLink}>View All →</Text>
          </TouchableOpacity>
        </View>

        {liveTickets.length === 0 ? (
          <View style={[styles.emptyPreview, { backgroundColor: C.surface }]}>
            <Text style={[styles.emptyPreviewText, { color: C.textMuted }]}>No customers in queue</Text>
          </View>
        ) : (
          preview.map((ticket, i) => (
            <TouchableOpacity key={ticket.id} onPress={() => setActiveTab('queue')} activeOpacity={0.8}>
              <TicketCard item={ticket} index={i} compact />
            </TouchableOpacity>
          ))
        )}

        {/* Today's Appointments preview */}
        {(() => {
          const todayKey = new Date().toISOString().split('T')[0];
          const todayAppts = appointments
            .filter(a => a.date === todayKey)
            .sort((a, b) => a.time.localeCompare(b.time))
            .slice(0, 3);

          function fmtTime(t: string) {
            const [h, m] = t.split(':').map(Number);
            const ampm = h >= 12 ? 'PM' : 'AM';
            const h12 = h > 12 ? h - 12 : h === 0 ? 12 : h;
            return `${h12}:${m.toString().padStart(2, '0')} ${ampm}`;
          }

          return (
            <>
              <View style={styles.sectionHeader}>
                <Text style={[styles.sectionTitle, { color: C.text }]}>Today's Appointments</Text>
                <TouchableOpacity onPress={() => setActiveTab('appointments')}>
                  <Text style={styles.sectionLink}>View All →</Text>
                </TouchableOpacity>
              </View>

              {todayAppts.length === 0 ? (
                <View style={[styles.emptyPreview, { backgroundColor: C.surface }]}>
                  <Text style={[styles.emptyPreviewText, { color: C.textMuted }]}>No appointments today</Text>
                </View>
              ) : (
                todayAppts.map(appt => {
                  const svc = services.find(s => s.id === appt.serviceId);
                  const staffMember = staff.find(s => s.id === appt.staffId);
                  return (
                    <View key={appt.id} style={[styles.apptCard, { backgroundColor: C.surface, borderColor: C.border, flexDirection: 'column', alignItems: 'stretch' }]}>
                      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <View style={styles.apptTimeCol}>
                          <Text style={[styles.apptTime, { color: C.primary }]}>{fmtTime(appt.time)}</Text>
                        </View>
                        <View style={styles.apptInfo}>
                          <Text style={[styles.apptName, { color: C.text }]}>{appt.customerName}</Text>
                          <Text style={[styles.apptService, { color: C.textSub }]}>{svc?.name ?? 'Service'}</Text>
                          {staffMember && (
                            <Text style={[styles.apptStaff, { color: C.textMuted }]}>with {staffMember.name}</Text>
                          )}
                        </View>
                        <View style={{ backgroundColor: '#eff6ff', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 }}>
                          <Text style={{ fontSize: 11, fontWeight: '600', color: '#2563eb' }}>Booked</Text>
                        </View>
                      </View>
                      {appt.phoneNumber ? (
                        <View style={{ flexDirection: 'row', gap: 8, marginTop: 8 }}>
                          <TouchableOpacity
                            style={{ flex: 1, backgroundColor: '#eff6ff', borderRadius: 8, paddingVertical: 7, alignItems: 'center', borderWidth: 1, borderColor: '#2563eb22' }}
                            onPress={() => setMessageModal({ visible: true, name: appt.customerName, phone: appt.phoneNumber })}>
                            <Text style={{ fontSize: 12, fontWeight: '600', color: '#2563eb' }}>✉ Message</Text>
                          </TouchableOpacity>
                          <TouchableOpacity
                            style={{ flex: 1, backgroundColor: C.surfaceAlt, borderRadius: 8, paddingVertical: 7, alignItems: 'center', borderWidth: 1, borderColor: C.border }}
                            onPress={() => setActiveTab('appointments')}>
                            <Text style={{ fontSize: 12, fontWeight: '600', color: C.textSub }}>View All →</Text>
                          </TouchableOpacity>
                        </View>
                      ) : null}
                    </View>
                  );
                })
              )}
            </>
          );
        })()}

      </ScrollView>
    );
  }

  // ── Queue tab ──────────────────────────────────────────────────────────────
  function renderQueue() {
    if (liveTickets.length === 0 && servedToday.length === 0) {
      return (
        <View style={styles.centered}>
          <Text style={styles.emptyIcon}>✅</Text>
          <Text style={[styles.emptyTitle, { color: C.text }]}>Queue is empty</Text>
          <Text style={[styles.emptySub, { color: C.textMuted }]}>No customers waiting right now</Text>
        </View>
      );
    }
    return (
      <ScrollView contentContainerStyle={styles.tabContent} showsVerticalScrollIndicator={false}>
        {liveTickets.length > 0 && (
          <>
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { color: C.text }]}>Live Queue</Text>
              <View style={[styles.navBadge, { backgroundColor: '#2563eb' }]}>
                <Text style={styles.navBadgeText}>{liveTickets.length}</Text>
              </View>
            </View>
            {liveTickets.map((item, i) => <TicketCard key={item.id} item={item} index={i} />)}
          </>
        )}

        {servedToday.length > 0 && (
          <>
            <View style={[styles.sectionHeader, { marginTop: 20 }]}>
              <Text style={[styles.sectionTitle, { color: C.text }]}>Served Today</Text>
              <View style={[styles.navBadge, { backgroundColor: '#10b981' }]}>
                <Text style={styles.navBadgeText}>{servedToday.length}</Text>
              </View>
            </View>
            {servedToday.map(item => (
              <View key={item.id} style={[styles.ticketCard, { backgroundColor: C.surface, borderColor: C.border, opacity: 0.7 }]}>
                <View style={styles.ticketTop}>
                  <View style={[styles.positionBadge, { backgroundColor: '#10b981' }]}>
                    <Text style={styles.positionText}>✓</Text>
                  </View>
                  <View style={styles.customerInfo}>
                    <Text style={[styles.customerName, { color: C.text }]}>{item.customerName}</Text>
                    <Text style={[styles.customerPhone, { color: C.textMuted }]}>{item.phoneNumber}</Text>
                  </View>
                  <View style={[styles.statusPill, { backgroundColor: '#10b98122' }]}>
                    <Text style={[styles.statusPillText, { color: '#10b981' }]}>Done</Text>
                  </View>
                </View>
                <View style={styles.ticketMeta}>
                  <Text style={[styles.metaText, { color: C.textSub }]}>✂ {item.serviceName}</Text>
                  <Text style={[styles.metaDot, { color: C.border }]}>·</Text>
                  <Text style={[styles.metaText, { color: C.textSub }]}>{timeAgo(item.updatedAt)}</Text>
                </View>
              </View>
            ))}
          </>
        )}
      </ScrollView>
    );
  }

  // ── Walk-in tab ────────────────────────────────────────────────────────────
  function renderWalkIn() {
    const selectedService = services.find(s => s.id === walkInServiceId) ?? services[0];
    const estWait = selectedService ? (waitingTickets.length + 1) * selectedService.avgTime : 0;

    return (
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.tabContent} showsVerticalScrollIndicator={false}>
          <Text style={[styles.sectionTitle, { color: C.text }]}>Add Walk-in Customer</Text>

          {walkInSuccess && (
            <View style={styles.successBanner}>
              <Text style={styles.successText}>✅ Added to queue — position #{tickets.length}</Text>
            </View>
          )}
          {!!walkInError && (
            <View style={[styles.successBanner, { backgroundColor: '#fee2e2' }]}>
              <Text style={[styles.successText, { color: '#dc2626' }]}>❌ {walkInError}</Text>
            </View>
          )}

          <Text style={[styles.fieldLabel, { color: C.textSub }]}>Full Name</Text>
          <TextInput
            style={[styles.input, { backgroundColor: C.surface, borderColor: C.inputBorder, color: C.text }]}
            value={walkInName} onChangeText={setWalkInName}
            placeholder="Customer name" placeholderTextColor={C.placeholder}
            autoCapitalize="words"
          />

          <Text style={[styles.fieldLabel, { color: C.textSub }]}>Phone Number</Text>
          <TextInput
            style={[styles.input, { backgroundColor: C.surface, borderColor: C.inputBorder, color: C.text }]}
            value={walkInPhone} onChangeText={setWalkInPhone}
            placeholder="(555) 000-0000" placeholderTextColor={C.placeholder}
            keyboardType="phone-pad"
          />

          <Text style={[styles.fieldLabel, { color: C.textSub }]}>Service</Text>
          <View style={styles.serviceChips}>
            {services.map(service => (
              <TouchableOpacity
                key={service.id}
                style={[styles.serviceChip, { backgroundColor: C.surface, borderColor: C.inputBorder },
                  walkInServiceId === service.id && styles.serviceChipSelected]}
                onPress={() => setWalkInServiceId(service.id)}
              >
                <Text style={[styles.serviceChipText, { color: C.textSub },
                  walkInServiceId === service.id && styles.serviceChipTextSelected]}>
                  {service.name}
                </Text>
                <Text style={[styles.serviceChipTime, { color: C.textMuted },
                  walkInServiceId === service.id && styles.serviceChipTextSelected]}>
                  ~{service.avgTime} min
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {selectedService && (
            <View style={[styles.previewCard, { backgroundColor: C.surface, borderColor: C.border }]}>
              <Text style={[styles.previewTitle, { color: C.textMuted }]}>Queue Preview</Text>
              {[
                { label: 'Position', val: `#${tickets.length + 1}` },
                { label: 'Service',  val: selectedService.name },
                { label: 'Est. Wait', val: `~${estWait} min` },
              ].map(({ label, val }) => (
                <View key={label} style={styles.previewRow}>
                  <Text style={[styles.previewLabel, { color: C.textMuted }]}>{label}</Text>
                  <Text style={[styles.previewValue, { color: C.text }]}>{val}</Text>
                </View>
              ))}
            </View>
          )}

          <TouchableOpacity
            style={[styles.addBtn, (!walkInName.trim() || walkInPhone.trim().length < 10) && styles.addBtnDisabled]}
            onPress={handleAddWalkIn}
            disabled={!walkInName.trim() || walkInPhone.trim().length < 10 || walkInLoading}
          >
            {walkInLoading ? <ActivityIndicator color="#fff" /> : <Text style={styles.addBtnText}>Add to Queue</Text>}
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    );
  }

  // ── Services tab ───────────────────────────────────────────────────────────
  function renderServices() {
    return (
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.tabContent} showsVerticalScrollIndicator={false}>
          <Text style={[styles.sectionTitle, { color: C.text }]}>Your Services</Text>
          <Text style={[styles.sectionSub, { color: C.textMuted }]}>
            These are the services customers will see on your portal.
          </Text>

          {servicesSaved && (
            <View style={styles.successBanner}>
              <Text style={styles.successText}>✅ Services saved</Text>
            </View>
          )}

          {services.map(service => (
            <View key={service.id} style={[styles.serviceEditRow, { backgroundColor: C.surface, borderColor: C.border }]}>
              <View style={styles.serviceEditLeft}>
                <TextInput
                  style={[styles.serviceEditInput, { backgroundColor: C.surfaceAlt, borderColor: C.border, color: C.text }]}
                  value={service.name}
                  onChangeText={v => updateServiceLocal(service.id, 'name', v)}
                  placeholder="Service name" placeholderTextColor={C.placeholder}
                />
                <View style={styles.serviceTimeRow}>
                  <TextInput
                    style={[styles.serviceTimeInput, { backgroundColor: C.surfaceAlt, borderColor: C.border, color: C.text }]}
                    value={String(service.avgTime)}
                    onChangeText={v => updateServiceLocal(service.id, 'avgTime', v)}
                    keyboardType="number-pad" placeholder="min" placeholderTextColor={C.placeholder}
                  />
                  <Text style={[styles.serviceTimeLabel, { color: C.textMuted }]}>min avg</Text>
                </View>
              </View>
              <TouchableOpacity onPress={() => removeService(service.id)} style={styles.removeServiceBtn}>
                <Text style={[styles.removeServiceText, { color: C.textMuted }]}>✕</Text>
              </TouchableOpacity>
            </View>
          ))}

          <View style={styles.addServiceRow}>
            <TextInput
              style={[styles.serviceEditInput, { flex: 1, backgroundColor: C.surface, borderColor: C.inputBorder, color: C.text }]}
              value={newServiceName} onChangeText={setNewServiceName}
              placeholder="New service name" placeholderTextColor={C.placeholder}
            />
            <TextInput
              style={[styles.serviceTimeInput, { width: 70, backgroundColor: C.surface, borderColor: C.inputBorder, color: C.text }]}
              value={newServiceTime} onChangeText={setNewServiceTime}
              keyboardType="number-pad" placeholder="min" placeholderTextColor={C.placeholder}
            />
            <TouchableOpacity style={styles.addServiceBtn} onPress={addService}>
              <Text style={styles.addServiceBtnText}>+ Add</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity style={styles.saveServicesBtn} onPress={saveServices} disabled={savingServices}>
            {savingServices ? <ActivityIndicator color="#fff" /> : <Text style={styles.addBtnText}>Save Services</Text>}
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    );
  }

  // ── Analytics tab ─────────────────────────────────────────────────────────
  function renderCustomers() {
    const todayKey = new Date().toISOString().split('T')[0];

    const servedCount  = tickets.filter(t => t.status === 'Done').length;
    const totalToday   = tickets.length;

    // Scheduled vs walk-in
    const todayAppts   = appointments.filter(a => a.date === todayKey);
    const scheduledCnt = todayAppts.length;
    const apptPhones   = new Set(todayAppts.map(a => a.phoneNumber));
    const walkinCnt    = tickets.filter(t =>
      t.createdAt.startsWith(todayKey) && !apptPhones.has(t.phoneNumber)
    ).length;
    const totalInflow  = scheduledCnt + walkinCnt || 1;

    // Busiest hours
    const hourCounts: Record<number, number> = {};
    tickets.forEach(t => {
      const h = new Date(t.createdAt).getHours();
      hourCounts[h] = (hourCounts[h] ?? 0) + 1;
    });
    const maxHourCount  = Math.max(1, ...Object.values(hourCounts));
    const businessHours = Array.from({ length: 12 }, (_, i) => i + 8);

    function fmtHour(h: number) {
      const ampm = h >= 12 ? 'PM' : 'AM';
      const h12  = h > 12 ? h - 12 : h === 0 ? 12 : h;
      return `${h12}${ampm}`;
    }

    // Service breakdown
    const svcCounts: Record<string, number> = {};
    tickets.forEach(t => { svcCounts[t.serviceName] = (svcCounts[t.serviceName] ?? 0) + 1; });
    const svcEntries  = Object.entries(svcCounts).sort((a, b) => b[1] - a[1]);
    const maxSvcCount = Math.max(1, ...Object.values(svcCounts));

    // New vs repeat
    const visitMap: Record<string, number> = {};
    tickets.forEach(t => {
      if (t.phoneNumber) visitMap[t.phoneNumber] = (visitMap[t.phoneNumber] ?? 0) + 1;
    });
    const uniquePhones = Object.keys(visitMap);
    const repeatCount  = uniquePhones.filter(p => visitMap[p] > 1).length;
    const newCount     = uniquePhones.length - repeatCount;
    const totalUnique  = uniquePhones.length || 1;

    return (
      <ScrollView contentContainerStyle={styles.tabContent} showsVerticalScrollIndicator={false}>

        {/* Today at a Glance */}
        <Text style={[styles.sectionTitle, { color: C.text }]}>Today at a Glance</Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
          {[
            { val: totalToday,          label: 'Total Customers', accent: '#2563eb' },
            { val: servedCount,         label: 'Served',           accent: '#10b981' },
            { val: liveTickets.length,  label: 'In Queue Now',     accent: '#f59e0b' },
            { val: `${avgWait}m`,       label: 'Avg Wait',         accent: '#8b5cf6' },
          ].map(({ val, label, accent }) => (
            <View key={label} style={[styles.analyticStatCard, { backgroundColor: C.surface, borderColor: C.border, borderTopColor: accent }]}>
              <Text style={[styles.analyticStatNum, { color: accent }]}>{val}</Text>
              <Text style={[styles.analyticStatLbl, { color: C.textMuted }]}>{label}</Text>
            </View>
          ))}
        </View>

        {/* How Customers Come In */}
        <View style={[styles.analyticCard, { backgroundColor: C.surface, borderColor: C.border }]}>
          <Text style={[styles.analyticCardTitle, { color: C.text }]}>How Customers Come In</Text>
          <Text style={[styles.analyticCardSub, { color: C.textMuted }]}>Scheduled appointments vs same-day walk-ins</Text>
          <View style={{ gap: 14, marginTop: 14 }}>
            {[
              { label: 'Scheduled Appointments', count: scheduledCnt, color: '#2563eb' },
              { label: 'Walk-ins / Portal',       count: walkinCnt,   color: '#f59e0b' },
            ].map(({ label, count, color }) => (
              <View key={label}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 5 }}>
                  <Text style={{ fontSize: 13, fontWeight: '600', color: C.textSub }}>{label}</Text>
                  <Text style={{ fontSize: 13, fontWeight: '700', color }}>{count}</Text>
                </View>
                <View style={{ height: 8, backgroundColor: C.surfaceAlt, borderRadius: 4, overflow: 'hidden' }}>
                  <View style={{ height: 8, borderRadius: 4, backgroundColor: color,
                    width: `${Math.round((count / totalInflow) * 100)}%` as any }} />
                </View>
                <Text style={{ fontSize: 11, color: C.textMuted, marginTop: 3 }}>
                  {Math.round((count / totalInflow) * 100)}% of today's traffic
                </Text>
              </View>
            ))}
          </View>
        </View>

        {/* Busiest Hours */}
        <View style={[styles.analyticCard, { backgroundColor: C.surface, borderColor: C.border }]}>
          <Text style={[styles.analyticCardTitle, { color: C.text }]}>Busiest Hours</Text>
          <Text style={[styles.analyticCardSub, { color: C.textMuted }]}>Customer volume by time of day</Text>
          {tickets.length === 0 ? (
            <Text style={{ color: C.textMuted, fontSize: 13, marginTop: 12 }}>No data yet for today</Text>
          ) : (
            <View style={{ gap: 5, marginTop: 14 }}>
              {businessHours.map(h => {
                const cnt  = hourCounts[h] ?? 0;
                const pct  = Math.round((cnt / maxHourCount) * 100);
                const peak = cnt === maxHourCount && cnt > 0;
                return (
                  <View key={h} style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <Text style={{ fontSize: 11, color: C.textMuted, width: 36, textAlign: 'right' }}>{fmtHour(h)}</Text>
                    <View style={{ flex: 1, height: 16, backgroundColor: C.surfaceAlt, borderRadius: 4, overflow: 'hidden' }}>
                      {cnt > 0 && (
                        <View style={{ height: 16, borderRadius: 4,
                          backgroundColor: peak ? '#2563eb' : '#2563eb55',
                          width: `${pct}%` as any }} />
                      )}
                    </View>
                    <Text style={{ fontSize: 11, fontWeight: '600', color: peak ? '#2563eb' : C.textMuted, width: 16 }}>
                      {cnt > 0 ? cnt : ''}
                    </Text>
                    {peak ? <Text style={{ fontSize: 10, color: '#2563eb', fontWeight: '700', width: 30 }}>Peak</Text>
                           : <View style={{ width: 30 }} />}
                  </View>
                );
              })}
            </View>
          )}
        </View>

        {/* Service Breakdown */}
        <View style={[styles.analyticCard, { backgroundColor: C.surface, borderColor: C.border }]}>
          <Text style={[styles.analyticCardTitle, { color: C.text }]}>Most Popular Services</Text>
          <Text style={[styles.analyticCardSub, { color: C.textMuted }]}>Ranked by number of customers</Text>
          {svcEntries.length === 0 ? (
            <Text style={{ color: C.textMuted, fontSize: 13, marginTop: 12 }}>No data yet</Text>
          ) : (
            <View style={{ gap: 12, marginTop: 14 }}>
              {svcEntries.map(([name, cnt], i) => {
                const colors = ['#10b981', '#2563eb', '#8b5cf6', '#f59e0b', '#ef4444'];
                const color  = colors[i % colors.length];
                return (
                  <View key={name}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 5 }}>
                      <Text style={{ fontSize: 13, fontWeight: '600', color: C.textSub }}>{name}</Text>
                      <Text style={{ fontSize: 13, fontWeight: '700', color }}>{cnt} customers</Text>
                    </View>
                    <View style={{ height: 8, backgroundColor: C.surfaceAlt, borderRadius: 4, overflow: 'hidden' }}>
                      <View style={{ height: 8, borderRadius: 4, backgroundColor: color,
                        width: `${Math.round((cnt / maxSvcCount) * 100)}%` as any }} />
                    </View>
                  </View>
                );
              })}
            </View>
          )}
        </View>

        {/* New vs Repeat */}
        <View style={[styles.analyticCard, { backgroundColor: C.surface, borderColor: C.border }]}>
          <Text style={[styles.analyticCardTitle, { color: C.text }]}>Customer Retention</Text>
          <Text style={[styles.analyticCardSub, { color: C.textMuted }]}>New vs returning customers</Text>
          <View style={{ flexDirection: 'row', gap: 12, marginTop: 14 }}>
            {[
              { label: 'New Customers', count: newCount,    color: '#10b981', pct: Math.round((newCount / totalUnique) * 100) },
              { label: 'Returning',     count: repeatCount, color: '#2563eb', pct: Math.round((repeatCount / totalUnique) * 100) },
            ].map(({ label, count, color, pct }) => (
              <View key={label} style={{ flex: 1, backgroundColor: C.surfaceAlt, borderRadius: 12, padding: 14, alignItems: 'center', gap: 4 }}>
                <Text style={{ fontSize: 28, fontWeight: '800', color }}>{count}</Text>
                <Text style={{ fontSize: 12, fontWeight: '600', color: C.textSub }}>{label}</Text>
                <Text style={{ fontSize: 11, color: C.textMuted }}>{pct}% of total</Text>
              </View>
            ))}
          </View>
        </View>

      </ScrollView>
    );
  }

  // ── Staff tab ──────────────────────────────────────────────────────────────
  function renderStaff() {
    const maxStaff = plan === 'pro' ? Infinity : 3;
    const atLimit = staff.length >= maxStaff;

    async function addApiStaff() {
      if (!newStaffName.trim()) return;
      try {
        const { staff: member } = await api.addStaff(
          newStaffName.trim(), newStaffRole.trim() || 'Staff',
          newStaffPhone.trim(), newStaffPhoto.trim(),
        );
        setStaff(prev => [...prev, member]);
        setNewStaffName(''); setNewStaffRole(''); setNewStaffPhone(''); setNewStaffPhoto('');
      } catch {}
    }

    async function removeApiStaff(id: string) {
      try {
        await api.deleteStaff(id);
        setStaff(prev => prev.filter(s => s.id !== id));
      } catch {}
    }

    return (
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.tabContent} showsVerticalScrollIndicator={false}>
          <Text style={[styles.sectionTitle, { color: C.text }]}>Staff Members</Text>
          <Text style={[styles.sectionSub, { color: C.textMuted }]}>
            Customers can choose a specific staff member when joining the queue.
          </Text>

          {plan === 'basic' && (
            <View style={[styles.planBanner, { backgroundColor: '#fef3c7', borderColor: '#f59e0b' }]}>
              <Text style={{ color: '#92400e', fontWeight: '600', fontSize: 13 }}>
                Basic plan: up to 3 staff members. Upgrade to Pro for unlimited.
              </Text>
            </View>
          )}

          <View style={{ gap: 12, marginTop: 8 }}>
            {staff.map(member => (
              <View key={member.id} style={[styles.staffCard, { backgroundColor: C.surface, borderColor: C.border }]}>
                <View style={[styles.staffAvatar, { backgroundColor: C.primary + '22' }]}>
                  {member.photoUrl ? (
                    <Image source={{ uri: member.photoUrl }} style={styles.staffAvatarImg} />
                  ) : (
                    <Text style={[styles.staffAvatarText, { color: C.primary }]}>
                      {member.name.charAt(0).toUpperCase()}
                    </Text>
                  )}
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.staffName, { color: C.text }]}>{member.name}</Text>
                  <Text style={[styles.staffRole, { color: C.textMuted }]}>{member.role}</Text>
                  {!!member.phone && <Text style={[styles.staffPhone, { color: C.textSub }]}>{member.phone}</Text>}
                </View>
                <TouchableOpacity onPress={() => removeApiStaff(member.id)} style={{ padding: 8 }}>
                  <Text style={{ color: C.textMuted, fontSize: 18 }}>✕</Text>
                </TouchableOpacity>
              </View>
            ))}
          </View>

          {atLimit && plan === 'basic' ? (
            <TouchableOpacity style={[styles.addBtn, { marginTop: 16, backgroundColor: '#f59e0b' }]} onPress={() => setActiveTab('subscription')}>
              <Text style={styles.addBtnText}>Upgrade to Pro for More Staff</Text>
            </TouchableOpacity>
          ) : (
            <View style={[styles.settingsCard, { backgroundColor: C.surface, borderColor: C.border, marginTop: 16 }]}>
              <Text style={[styles.settingsCardTitle, { color: C.text }]}>Add Staff Member</Text>
              {[
                { label: 'Name *', value: newStaffName, setter: setNewStaffName, placeholder: 'e.g. James Rivera' },
                { label: 'Role', value: newStaffRole, setter: setNewStaffRole, placeholder: 'e.g. Barber, Doctor' },
                { label: 'Phone (optional)', value: newStaffPhone, setter: setNewStaffPhone, placeholder: '(555) 000-0000' },
                { label: 'Photo URL (optional)', value: newStaffPhoto, setter: setNewStaffPhoto, placeholder: 'https://...' },
              ].map(({ label, value, setter, placeholder }) => (
                <View key={label}>
                  <Text style={[styles.fieldLabel, { color: C.textSub }]}>{label}</Text>
                  <TextInput
                    style={[styles.input, { backgroundColor: C.inputBg, borderColor: C.inputBorder, color: C.text }]}
                    value={value} onChangeText={setter}
                    placeholder={placeholder} placeholderTextColor={C.placeholder}
                  />
                </View>
              ))}
              <TouchableOpacity
                style={[styles.addBtn, { marginTop: 8 }, !newStaffName.trim() && styles.addBtnDisabled]}
                onPress={addApiStaff}
                disabled={!newStaffName.trim()}
              >
                <Text style={styles.addBtnText}>Add Staff Member</Text>
              </TouchableOpacity>
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    );
  }

  // ── Subscription tab ────────────────────────────────────────────────────────
  function renderSubscription() {
    async function handleUpgrade() {
      const biz = business;
      if (!biz) return;
      setCheckoutLoading(true);
      setCheckoutError('');
      try {
        const { url } = await api.createCheckoutSession(biz.name, biz.id);
        if (typeof window !== 'undefined') window.location.href = url;
      } catch (e: any) {
        setCheckoutError(e?.message ?? 'Could not start checkout. Please try again.');
        setCheckoutLoading(false);
      }
    }

    async function handleDowngrade() {
      setPlan('basic');
      try { await api.updateSubscription('basic'); } catch {}
    }

    const plans = [
      {
        key: 'basic' as const,
        name: 'Basic',
        price: 'Free',
        color: '#6b7280',
        features: [
          '✅ Home dashboard',
          '✅ Manage services',
          '✅ Settings',
          '✅ Customer portal + QR code',
          '❌ Live queue management',
          '❌ Add walk-in customers',
          '❌ Staff management',
          '❌ Analytics',
          '❌ Calendar/appointment booking',
        ],
      },
      {
        key: 'pro' as const,
        name: 'Pro',
        price: '$20/mo',
        color: '#2563eb',
        features: [
          '✅ Everything in Basic',
          '✅ Live queue management',
          '✅ Add walk-in customers',
          '✅ Staff management (unlimited)',
          '✅ Analytics dashboard',
          '✅ Calendar/appointment booking',
          '✅ SMS notifications',
          '✅ Priority support',
        ],
      },
    ];

    return (
      <ScrollView contentContainerStyle={styles.tabContent} showsVerticalScrollIndicator={false}>
        {stripeSuccess && (
          <View style={[styles.successBanner, { backgroundColor: '#d1fae5', marginBottom: 12 }]}>
            <Text style={[styles.successText, { color: '#065f46', fontSize: 15 }]}>
              🎉 You're now on Pro! All features unlocked.
            </Text>
          </View>
        )}
        <Text style={[styles.sectionTitle, { color: C.text }]}>Subscription Plan</Text>
        <Text style={[styles.sectionSub, { color: C.textMuted }]}>
          Current plan:{' '}
          <Text style={{ fontWeight: '700', color: plan === 'pro' ? '#2563eb' : '#6b7280' }}>
            {plan === 'pro' ? 'Pro — $20/mo' : 'Basic — Free'}
          </Text>
        </Text>

        <View style={{ gap: 16, marginTop: 12 }}>
          {plans.map(p => {
            const isActive = plan === p.key;
            return (
              <View key={p.key} style={[styles.planCard, {
                backgroundColor: C.surface, borderColor: isActive ? p.color : C.border,
                borderWidth: isActive ? 2 : 1,
              }]}>
                <View style={styles.planCardHeader}>
                  <View>
                    <Text style={[styles.planName, { color: p.color }]}>{p.name}</Text>
                    <Text style={[styles.planPrice, { color: C.text }]}>{p.price}</Text>
                  </View>
                  {isActive ? (
                    <View style={[styles.planActiveBadge, { backgroundColor: p.color + '22', borderColor: p.color }]}>
                      <Text style={[styles.planActiveBadgeText, { color: p.color }]}>Current Plan</Text>
                    </View>
                  ) : (
                    p.key === 'basic' ? (
                      <TouchableOpacity
                        style={[styles.planSelectBtn, { backgroundColor: '#6b7280' }]}
                        onPress={handleDowngrade}
                      >
                        <Text style={styles.planSelectBtnText}>Downgrade</Text>
                      </TouchableOpacity>
                    ) : null
                  )}
                </View>
                <View style={{ gap: 6, marginTop: 12 }}>
                  {p.features.map(f => (
                    <Text key={f} style={[styles.planFeature, { color: f.startsWith('❌') ? C.textMuted : C.text }]}>{f}</Text>
                  ))}
                </View>
              </View>
            );
          })}
        </View>

        {plan === 'basic' && (
          <View style={[styles.planCard, { backgroundColor: C.surface, borderColor: '#2563eb', borderWidth: 1, marginTop: 8 }]}>
            <Text style={[styles.settingsCardTitle, { color: C.text }]}>Upgrade to Pro — $20/mo</Text>
            <Text style={[styles.sectionSub, { color: C.textMuted, marginBottom: 12 }]}>
              Unlock live queue, walk-ins, staff management, analytics, and calendar booking.
            </Text>

            {!!checkoutError && (
              <View style={[styles.successBanner, { backgroundColor: '#fee2e2', marginBottom: 8 }]}>
                <Text style={[styles.successText, { color: '#dc2626' }]}>{checkoutError}</Text>
              </View>
            )}

            <TouchableOpacity
              style={[styles.addBtn, { backgroundColor: '#2563eb' }, checkoutLoading && { opacity: 0.7 }]}
              onPress={handleUpgrade}
              disabled={checkoutLoading}
            >
              {checkoutLoading
                ? <ActivityIndicator color="#fff" />
                : <Text style={styles.addBtnText}>Upgrade to Pro — $20/mo</Text>}
            </TouchableOpacity>

            <Text style={[styles.sectionSub, { color: C.textMuted, textAlign: 'center', marginTop: 8, fontSize: 11 }]}>
              🔒 Powered by Stripe · Cancel anytime
            </Text>
          </View>
        )}
      </ScrollView>
    );
  }

  // ── Appointments tab ───────────────────────────────────────────────────────
  function renderAppointments() {
    const now      = new Date();
    const todayKey = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`;
    const HOUR_H  = 52;
    const START_H = 8;
    const END_H   = 19;
    const TOTAL_H = (END_H - START_H) * HOUR_H;
    const TIME_W  = 44;
    const COLORS  = ['#2563eb', '#10b981', '#8b5cf6', '#f59e0b', '#ef4444', '#06b6d4'];
    const hours   = Array.from({ length: END_H - START_H }, (_, i) => START_H + i);

    function fmtTime(t: string) {
      const [h, m] = t.split(':').map(Number);
      const ampm = h >= 12 ? 'PM' : 'AM';
      const h12  = h > 12 ? h - 12 : h === 0 ? 12 : h;
      return `${h12}:${m.toString().padStart(2, '0')} ${ampm}`;
    }
    function fmtHr(h: number) {
      const ampm = h >= 12 ? 'PM' : 'AM';
      const h12  = h > 12 ? h - 12 : h === 0 ? 12 : h;
      return `${h12} ${ampm}`;
    }
    function dKey(d: Date) {
      return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
    }
    function pad2(n: number) { return String(n).padStart(2, '0'); }

    const byDate: Record<string, typeof appointments> = {};
    appointments.forEach(a => {
      if (!byDate[a.date]) byDate[a.date] = [];
      byDate[a.date].push(a);
    });

    function getWeekStart(d: Date): Date {
      const n = new Date(d); n.setHours(0,0,0,0);
      const day = n.getDay();
      n.setDate(n.getDate() - (day === 0 ? 6 : day - 1));
      return n;
    }
    function apptTop(time: string) {
      const [h, m] = time.split(':').map(Number);
      return ((h - START_H) + m / 60) * HOUR_H;
    }
    function apptH(serviceId: string) {
      const svc = services.find(s => s.id === serviceId);
      return Math.max(((svc?.avgTime ?? 30) / 60) * HOUR_H, 28);
    }

    // ── Today — simple card list ──
    function TodayView() {
      const dayAppts = (byDate[todayKey] ?? []).sort((a, b) => a.time.localeCompare(b.time));
      if (dayAppts.length === 0) {
        return (
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
            <Text style={{ fontSize: 36, marginBottom: 10 }}>📅</Text>
            <Text style={{ fontSize: 16, fontWeight: '700', color: C.text }}>No appointments today</Text>
            <Text style={{ fontSize: 13, color: C.textMuted, marginTop: 4 }}>
              {now.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
            </Text>
          </View>
        );
      }
      return (
        <ScrollView contentContainerStyle={{ padding: 14, gap: 10 }} showsVerticalScrollIndicator={false}>
          <Text style={{ fontSize: 13, color: C.textMuted, marginBottom: 2 }}>
            {now.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })} · {dayAppts.length} appointment{dayAppts.length !== 1 ? 's' : ''}
          </Text>
          {dayAppts.map((appt, i) => {
            const svc    = services.find(s => s.id === appt.serviceId);
            const member = staff.find(s => s.id === appt.staffId);
            const color  = COLORS[i % COLORS.length];
            return (
              <View key={appt.id} style={{ backgroundColor: C.surface, borderRadius: 12, padding: 14,
                borderLeftWidth: 4, borderLeftColor: color,
                shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 8, elevation: 2, gap: 4 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Text style={{ fontSize: 16, fontWeight: '700', color: C.text }}>{fmtTime(appt.time)}</Text>
                  {svc && (
                    <View style={{ backgroundColor: color + '20', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20 }}>
                      <Text style={{ fontSize: 11, fontWeight: '600', color }}>{svc.name}</Text>
                    </View>
                  )}
                </View>
                <Text style={{ fontSize: 14, fontWeight: '600', color: C.text }}>{appt.customerName}</Text>
                <View style={{ flexDirection: 'row', gap: 12 }}>
                  {appt.phoneNumber ? <Text style={{ fontSize: 12, color: C.textMuted }}>📞 {appt.phoneNumber}</Text> : null}
                  {member ? <Text style={{ fontSize: 12, color: C.textMuted }}>👤 {member.name}</Text> : null}
                </View>
                {appt.phoneNumber ? (
                  <TouchableOpacity
                    style={{ marginTop: 8, backgroundColor: color + '18', borderRadius: 8, paddingVertical: 7,
                      alignItems: 'center', borderWidth: 1, borderColor: color + '40' }}
                    onPress={() => setMessageModal({ visible: true, name: appt.customerName, phone: appt.phoneNumber })}>
                    <Text style={{ fontSize: 12, fontWeight: '600', color }}>✉ Message Customer</Text>
                  </TouchableOpacity>
                ) : null}
              </View>
            );
          })}
        </ScrollView>
      );
    }

    // ── This Week — time grid anchored to current week ──
    function WeekView() {
      const ws       = getWeekStart(now);
      const weekDays = Array.from({ length: 7 }, (_, i) => { const d = new Date(ws); d.setDate(ws.getDate() + i); return d; });
      const DLABELS  = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
      return (
        <ScrollView showsVerticalScrollIndicator={false}>
          <View style={{ flexDirection: 'row', paddingLeft: TIME_W, borderBottomWidth: 1, borderBottomColor: C.border, backgroundColor: C.surface }}>
            {weekDays.map((d, i) => {
              const isToday = dKey(d) === todayKey;
              return (
                <View key={i} style={{ flex: 1, alignItems: 'center', paddingVertical: 7 }}>
                  <Text style={{ fontSize: 10, fontWeight: '600', color: C.textMuted }}>{DLABELS[i]}</Text>
                  <View style={{ width: 24, height: 24, borderRadius: 12, marginTop: 2,
                    backgroundColor: isToday ? C.primary : 'transparent', alignItems: 'center', justifyContent: 'center' }}>
                    <Text style={{ fontSize: 12, fontWeight: '700', color: isToday ? '#fff' : C.text }}>{d.getDate()}</Text>
                  </View>
                </View>
              );
            })}
          </View>
          <View style={{ flexDirection: 'row' }}>
            <View style={{ width: TIME_W }}>
              {hours.map(h => (
                <View key={h} style={{ height: HOUR_H, paddingTop: 4 }}>
                  <Text style={{ fontSize: 9, color: C.textMuted, textAlign: 'right', paddingRight: 6 }}>{fmtHr(h)}</Text>
                </View>
              ))}
            </View>
            {weekDays.map((d, di) => {
              const key      = dKey(d);
              const dayAppts = (byDate[key] ?? []).sort((a, b) => a.time.localeCompare(b.time));
              return (
                <View key={di} style={{ flex: 1, height: TOTAL_H, position: 'relative', borderLeftWidth: 0.5, borderLeftColor: C.border }}>
                  {hours.map(h => (
                    <View key={h} style={{ position: 'absolute', top: (h - START_H) * HOUR_H, left: 0, right: 0, height: 0.5, backgroundColor: C.border }} />
                  ))}
                  {dayAppts.map((appt, i) => {
                    const svc   = services.find(s => s.id === appt.serviceId);
                    const color = COLORS[i % COLORS.length];
                    return (
                      <View key={appt.id} style={{ position: 'absolute', top: apptTop(appt.time),
                        left: 1, right: 1, height: apptH(appt.serviceId),
                        backgroundColor: color + '22', borderLeftWidth: 2, borderLeftColor: color,
                        borderRadius: 3, padding: 3, overflow: 'hidden' }}>
                        <Text numberOfLines={1} style={{ fontSize: 9, fontWeight: '700', color }}>{fmtTime(appt.time)}</Text>
                        <Text numberOfLines={1} style={{ fontSize: 9, color: C.text }}>{appt.customerName}</Text>
                        {svc && <Text numberOfLines={1} style={{ fontSize: 8, color: C.textMuted }}>{svc.name}</Text>}
                      </View>
                    );
                  })}
                </View>
              );
            })}
          </View>
        </ScrollView>
      );
    }

    // ── This Month — full calendar grid anchored to current month ──
    function MonthView() {
      const year        = now.getFullYear();
      const month       = now.getMonth();
      const firstDay    = new Date(year, month, 1).getDay();
      const daysInMonth = new Date(year, month + 1, 0).getDate();
      const offset      = firstDay === 0 ? 6 : firstDay - 1;
      function mDayKey(d: number) { return `${year}-${pad2(month+1)}-${pad2(d)}`; }
      const calCells: (number | null)[] = [
        ...Array(offset).fill(null),
        ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
      ];
      while (calCells.length % 7 !== 0) calCells.push(null);
      const DLABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
      return (
        <ScrollView contentContainerStyle={{ padding: 8 }} showsVerticalScrollIndicator={false}>
          <Text style={{ fontSize: 14, fontWeight: '700', color: C.text, textAlign: 'center', marginBottom: 8 }}>
            {now.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
          </Text>
          <View style={{ flexDirection: 'row', marginBottom: 4 }}>
            {DLABELS.map(d => (
              <View key={d} style={{ flex: 1, alignItems: 'center', paddingVertical: 4 }}>
                <Text style={{ fontSize: 10, fontWeight: '700', color: C.textMuted }}>{d}</Text>
              </View>
            ))}
          </View>
          {Array.from({ length: calCells.length / 7 }, (_, row) => (
            <View key={row} style={{ flexDirection: 'row' }}>
              {calCells.slice(row * 7, row * 7 + 7).map((day, col) => {
                if (!day) return <View key={col} style={{ flex: 1, minHeight: 72, borderWidth: 0.5, borderColor: C.border, backgroundColor: C.surfaceAlt, opacity: 0.3 }} />;
                const key      = mDayKey(day);
                const isToday  = key === todayKey;
                const dayAppts = byDate[key] ?? [];
                return (
                  <View key={col} style={{ flex: 1, minHeight: 72, borderWidth: 0.5, borderColor: C.border,
                    padding: 3, backgroundColor: isToday ? C.primary + '12' : C.surface }}>
                    <View style={{ width: 20, height: 20, borderRadius: 10,
                      backgroundColor: isToday ? C.primary : 'transparent',
                      alignItems: 'center', justifyContent: 'center', marginBottom: 2 }}>
                      <Text style={{ fontSize: 11, fontWeight: isToday ? '700' : '400', color: isToday ? '#fff' : C.text }}>{day}</Text>
                    </View>
                    {dayAppts.slice(0, 2).map((a, i) => {
                      const color = COLORS[i % COLORS.length];
                      const svc   = services.find(s => s.id === a.serviceId);
                      return (
                        <View key={a.id} style={{ backgroundColor: color + '22', borderLeftWidth: 2,
                          borderLeftColor: color, borderRadius: 2, paddingHorizontal: 2, paddingVertical: 1, marginBottom: 1 }}>
                          <Text numberOfLines={1} style={{ fontSize: 7, color, fontWeight: '600' }}>
                            {fmtTime(a.time)} {svc?.name ?? ''}
                          </Text>
                        </View>
                      );
                    })}
                    {dayAppts.length > 2 && <Text style={{ fontSize: 7, color: C.textMuted }}>+{dayAppts.length - 2}</Text>}
                  </View>
                );
              })}
            </View>
          ))}
        </ScrollView>
      );
    }

    return (
      <View style={{ flex: 1, backgroundColor: C.bg }}>

        {/* Tab switcher — Today / This Week / This Month */}
        <View style={{ flexDirection: 'row', backgroundColor: C.surface, borderBottomWidth: 1, borderBottomColor: C.border }}>
          {([['today', 'Today'], ['week', 'This Week'], ['month', 'This Month']] as const).map(([v, label]) => (
            <TouchableOpacity key={v} onPress={() => setCalView(v)}
              style={{ flex: 1, paddingVertical: 13, alignItems: 'center',
                borderBottomWidth: 2, borderBottomColor: calView === v ? C.primary : 'transparent' }}>
              <Text style={{ fontSize: 13, fontWeight: '600', color: calView === v ? C.primary : C.textMuted }}>{label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Views */}
        <View style={{ flex: 1 }}>
          {calView === 'today' && <TodayView />}
          {calView === 'week'  && <WeekView />}
          {calView === 'month' && <MonthView />}
        </View>

        {/* Google Calendar status — bottom */}
        <TouchableOpacity
          style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 14, paddingVertical: 10,
            backgroundColor: googleConnected ? '#f0fdf4' : C.surface,
            borderTopWidth: 1, borderTopColor: googleConnected ? '#bbf7d0' : C.border }}
          onPress={() => setActiveTab('settings')} activeOpacity={0.8}>
          <Text style={{ fontSize: 14 }}>🗓</Text>
          <Text style={{ fontSize: 12, fontWeight: '600', flex: 1, color: googleConnected ? '#065f46' : C.textSub }}>
            {googleConnected ? 'Google Calendar connected' : 'Connect Google Calendar in Settings →'}
          </Text>
          {googleConnected && <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: '#10b981' }} />}
        </TouchableOpacity>
      </View>
    );
  }

  // ── Settings tab ───────────────────────────────────────────────────────────
  function renderSettings() {
    const days = [
      { key: 'mon', label: 'Monday' }, { key: 'tue', label: 'Tuesday' },
      { key: 'wed', label: 'Wednesday' }, { key: 'thu', label: 'Thursday' },
      { key: 'fri', label: 'Friday' }, { key: 'sat', label: 'Saturday' },
      { key: 'sun', label: 'Sunday' },
    ];

    const typeLabel: Record<string, string> = {
      barbershop: 'Barbershop', doctors_office: "Doctor's Office",
      salon: 'Salon', dental: 'Dental', other: 'Other',
    };

    return (
      <ScrollView contentContainerStyle={styles.tabContent} showsVerticalScrollIndicator={false}>
        {/* Business Profile */}
        <View style={[styles.settingsCard, { backgroundColor: C.surface, borderColor: C.border }]}>
          <Text style={[styles.settingsCardTitle, { color: C.text }]}>Business Profile</Text>
          {[
            { label: 'Business Name', val: business?.name ?? '' },
            { label: 'Business Type', val: typeLabel[business?.type ?? ''] ?? business?.type ?? '' },
            { label: 'Business ID',   val: business?.id ?? '' },
            { label: 'Customer Portal', val: `/${business?.id ?? ''}` },
          ].map(({ label, val }) => (
            <View key={label} style={[styles.profileRow, { borderBottomColor: C.border }]}>
              <Text style={[styles.profileLabel, { color: C.textMuted }]}>{label}</Text>
              <Text style={[styles.profileValue, { color: C.text }]}>{val}</Text>
            </View>
          ))}
        </View>

        {/* Operating Hours */}
        <View style={[styles.settingsCard, { backgroundColor: C.surface, borderColor: C.border }]}>
          <Text style={[styles.settingsCardTitle, { color: C.text }]}>Operating Hours</Text>
          <Text style={[styles.settingsCardSub, { color: C.textMuted }]}>
            Set your business hours so customers know when you're open.
          </Text>

          {hoursSaved && (
            <View style={[styles.successBanner, { marginTop: 12 }]}>
              <Text style={styles.successText}>✅ Hours saved</Text>
            </View>
          )}

          <View style={{ marginTop: 12, gap: 10 }}>
            {days.map(({ key, label }) => (
              <View key={key} style={styles.hoursRow}>
                <Text style={[styles.hoursDay, { color: C.textSub }]}>{label}</Text>
                <TextInput
                  style={[styles.hoursInput, { backgroundColor: C.surfaceAlt, borderColor: C.border, color: C.text }]}
                  value={settingsHours[key as keyof typeof settingsHours]}
                  onChangeText={v => setSettingsHours(h => ({ ...h, [key]: v }))}
                  placeholder="e.g. 9:00 AM – 6:00 PM"
                  placeholderTextColor={C.placeholder}
                />
              </View>
            ))}
          </View>

          <TouchableOpacity
            style={[styles.saveServicesBtn, { marginTop: 16 }]}
            onPress={() => { setHoursSaved(true); setTimeout(() => setHoursSaved(false), 2500); }}
          >
            <Text style={styles.addBtnText}>Save Hours</Text>
          </TouchableOpacity>
        </View>

        {/* Notification Channel */}
        <View style={[styles.settingsCard, { backgroundColor: C.surface, borderColor: C.border }]}>
          <Text style={[styles.settingsCardTitle, { color: C.text }]}>Customer Notifications</Text>
          <Text style={[styles.settingsCardSub, { color: C.textMuted }]}>
            Choose how customers get notified when it's their turn.
          </Text>

          {notifSaved && (
            <View style={[styles.successBanner, { marginTop: 12 }]}>
              <Text style={styles.successText}>✅ Notification preference saved</Text>
            </View>
          )}

          <View style={{ flexDirection: 'row', gap: 10, marginTop: 14, flexWrap: 'wrap' }}>
            {([
              { key: 'sms',   label: '📱 SMS Only' },
              { key: 'email', label: '✉️ Email Only' },
              { key: 'both',  label: '📲 Both' },
            ] as { key: 'sms' | 'email' | 'both'; label: string }[]).map(({ key, label }) => (
              <TouchableOpacity
                key={key}
                style={{
                  paddingVertical: 10, paddingHorizontal: 16,
                  borderRadius: 10, borderWidth: 1.5,
                  borderColor: notificationChannel === key ? '#2563eb' : C.border,
                  backgroundColor: notificationChannel === key ? '#eff6ff' : C.surfaceAlt,
                }}
                onPress={() => setNotificationChannel(key)}
                activeOpacity={0.7}
              >
                <Text style={{ fontSize: 14, fontWeight: '600', color: notificationChannel === key ? '#2563eb' : C.textSub }}>
                  {label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <TouchableOpacity
            style={[styles.saveServicesBtn, { marginTop: 16 }]}
            onPress={async () => {
              if (!business) return;
              try {
                await api.updateMyBusiness(business.name, business.type, notificationChannel);
                setNotifSaved(true);
                setTimeout(() => setNotifSaved(false), 2500);
              } catch {}
            }}
          >
            <Text style={styles.addBtnText}>Save Notification Preference</Text>
          </TouchableOpacity>
        </View>

        {/* Google Calendar */}
        <View style={[styles.settingsCard, { backgroundColor: C.surface, borderColor: C.border }]}>
          <Text style={[styles.settingsCardTitle, { color: C.text }]}>Google Calendar</Text>
          <Text style={[styles.settingsCardSub, { color: C.textMuted }]}>
            Connect your Google account so appointments automatically appear in your calendar.
          </Text>

          {googleSaved && (
            <View style={[styles.successBanner, { marginTop: 12 }]}>
              <Text style={styles.successText}>✅ Google Calendar connected!</Text>
            </View>
          )}

          {googleConnected ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 14,
              backgroundColor: '#f0fdf4', borderRadius: 10, padding: 12 }}>
              <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: '#10b981' }} />
              <Text style={{ fontSize: 14, fontWeight: '600', color: '#065f46' }}>Google Calendar connected</Text>
            </View>
          ) : (
            <TouchableOpacity
              style={[styles.addBtn, { marginTop: 14, backgroundColor: '#ffffff', borderWidth: 1, borderColor: '#d1d5db' },
                googleConnecting && { opacity: 0.6 }]}
              disabled={googleConnecting}
              onPress={async () => {
                setGoogleConnecting(true);
                try {
                  const { url } = await api.getGoogleAuthUrl();
                  if (typeof window !== 'undefined') window.location.href = url;
                } catch {
                  setGoogleConnecting(false);
                }
              }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, justifyContent: 'center' }}>
                <Text style={{ fontSize: 18 }}>🗓</Text>
                <Text style={{ fontSize: 15, fontWeight: '700', color: '#111827' }}>
                  {googleConnecting ? 'Redirecting...' : 'Connect Google Calendar'}
                </Text>
              </View>
            </TouchableOpacity>
          )}
        </View>

      </ScrollView>
    );
  }

  // ── Root ───────────────────────────────────────────────────────────────────
  return (
    <SafeAreaView style={[styles.container, { backgroundColor: C.bg }]}>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <View style={styles.body}>

        {/* ── Left sidebar — nav ──────────────────────────────── */}
        <View style={[styles.sidebar, { backgroundColor: C.sidebar, borderRightColor: C.sidebarBorder }]}>
          <View style={styles.sidebarTop}>
            <Text style={[styles.sidebarBusiness, { color: C.text }]} numberOfLines={2}>{business.name}</Text>
            <Text style={[styles.sidebarRole, { color: C.textMuted }]}>Staff Dashboard</Text>
          </View>

          <View style={styles.navItems}>
            {visibleNavItems.map(({ tab, icon, label }) => {
              const isActive = activeTab === tab;
              const badge = tab === 'queue' ? liveTickets.length : 0;
              return (
                <TouchableOpacity
                  key={tab}
                  style={[styles.navItem, isActive && [styles.navItemActive, { backgroundColor: C.navActive }]]}
                  onPress={() => setActiveTab(tab)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.navIcon}>{icon}</Text>
                  <Text style={[styles.navLabel, { color: C.navText }, isActive && [styles.navLabelActive, { color: C.navActiveText }]]}>
                    {label}
                  </Text>
                  {badge > 0 && (
                    <View style={styles.navBadge}>
                      <Text style={styles.navBadgeText}>{badge}</Text>
                    </View>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>

          <View style={styles.sidebarBottom}>
            <View style={styles.liveIndicator}>
              <View style={styles.liveDot} />
              <Text style={styles.liveText}>Live</Text>
            </View>
            <TouchableOpacity style={styles.lockBtn} onPress={handleLogout}>
              <Text style={styles.lockIcon}>🚪</Text>
              <Text style={[styles.lockText, { color: C.textMuted }]}>Logout</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* ── Main content ────────────────────────────────────── */}
        <View style={[styles.main, { backgroundColor: C.bg }]}>
          <View style={[styles.topBar, { backgroundColor: C.topBar, borderBottomColor: C.border }]}>
            <Text style={[styles.topBarTitle, { color: C.text }]}>
              {activeTab === 'home'         && 'Overview'}
              {activeTab === 'queue'        && 'Live Queue'}
              {activeTab === 'walkin'       && 'Add Walk-in'}
              {activeTab === 'services'     && 'Manage Services'}
              {activeTab === 'staff'        && 'Staff Members'}
              {activeTab === 'appointments' && 'Appointments'}
              {activeTab === 'customers'    && 'Analytics'}
              {activeTab === 'subscription' && 'Subscription'}
              {activeTab === 'settings'     && 'Settings'}
            </Text>
            <TouchableOpacity onPress={toggleTheme} style={{ padding: 6 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Text style={{ fontSize: 12, fontWeight: '500', color: C.textMuted }}>{isDark ? 'Light' : 'Dark'}</Text>
                <View style={{ width: 36, height: 20, borderRadius: 10, backgroundColor: isDark ? '#2563eb' : '#d1d5db', padding: 2, justifyContent: 'center' }}>
                  <View style={{ width: 16, height: 16, borderRadius: 8, backgroundColor: '#fff', transform: [{ translateX: isDark ? 16 : 0 }] }} />
                </View>
              </View>
            </TouchableOpacity>
          </View>

          {activeTab === 'home'         && renderHome()}
          {activeTab === 'queue'        && renderQueue()}
          {activeTab === 'walkin'       && renderWalkIn()}
          {activeTab === 'services'     && renderServices()}
          {activeTab === 'staff'        && renderStaff()}
          {activeTab === 'appointments' && renderAppointments()}
          {activeTab === 'customers'    && renderCustomers()}
          {activeTab === 'subscription' && renderSubscription()}
          {activeTab === 'settings'     && renderSettings()}
        </View>

        {/* ── Right sidebar — QR panel ────────────────────────── */}
        <View style={[styles.qrSidebar, { backgroundColor: C.sidebar, borderLeftColor: C.sidebarBorder }]}>
          <Text style={[styles.qrSidebarLabel, { color: C.textMuted }]}>Customer Portal</Text>
          <Image source={{ uri: qrSrc }} style={styles.qrSidebarImg} resizeMode="contain" />
          <TouchableOpacity
            style={[styles.qrShareBtn, { backgroundColor: C.primary }]}
            onPress={() => setQrOpen(true)}
          >
            <Text style={styles.qrShareBtnText}>Share QR Code</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* QR share popup */}
      <Modal visible={qrOpen} transparent animationType="fade" onRequestClose={() => setQrOpen(false)}>
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setQrOpen(false)}>
          <TouchableOpacity activeOpacity={1} onPress={() => {}}>
            <View style={[styles.qrPopup, { backgroundColor: C.surface }]}>
              <Text style={[styles.qrPopupTitle, { color: C.text }]}>Share Customer Portal</Text>
              <Text style={[styles.qrPopupUrl, { color: C.primary }]} numberOfLines={1}>{portalUrl}</Text>

              <Image source={{ uri: qrSrc }} style={styles.qrPopupImg} resizeMode="contain" />

              {/* Copy link */}
              <TouchableOpacity
                style={[styles.qrCopyBtn, { backgroundColor: qrLinkCopied ? '#10b981' : C.surfaceAlt, borderColor: qrLinkCopied ? '#10b981' : C.border }]}
                onPress={copyLink}
              >
                <Text style={[styles.qrCopyBtnText, { color: qrLinkCopied ? '#fff' : C.text }]}>
                  {qrLinkCopied ? '✓ Link Copied!' : '📋 Copy Link'}
                </Text>
              </TouchableOpacity>

              {/* SMS share */}
              <Text style={[styles.qrSmsLabel, { color: C.textMuted }]}>Send link via SMS</Text>
              <View style={styles.qrSmsRow}>
                <TextInput
                  style={[styles.qrSmsInput, { backgroundColor: C.inputBg, borderColor: C.inputBorder, color: C.text, flex: 1 }]}
                  placeholder="(555) 000-0000"
                  placeholderTextColor={C.placeholder}
                  value={qrSmsPhone}
                  onChangeText={setQrSmsPhone}
                  keyboardType="phone-pad"
                />
                <TouchableOpacity
                  style={[styles.qrSmsBtn, { opacity: qrSmsPhone.replace(/\D/g, '').length < 10 ? 0.4 : 1 }]}
                  onPress={shareViaSMS}
                  disabled={qrSmsPhone.replace(/\D/g, '').length < 10}
                >
                  <Text style={styles.qrSmsBtnText}>{qrSmsSent ? '✓ Sent' : 'Send'}</Text>
                </TouchableOpacity>
              </View>

              <TouchableOpacity onPress={() => setQrOpen(false)} style={styles.qrPopupClose}>
                <Text style={[styles.qrPopupCloseText, { color: C.textMuted }]}>Close</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      {/* Confirm modal */}
      <Modal visible={confirmModal.visible} transparent animationType="fade"
        onRequestClose={() => setConfirmModal({ visible: false, action: null, ticket: null })}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalBox, { backgroundColor: C.surface }]}>
            <Text style={[styles.modalTitle, { color: C.text }]}>
              {confirmModal.action === 'done' ? 'Mark as Done?' : 'Remove from Queue?'}
            </Text>
            {confirmModal.ticket && (
              <Text style={[styles.modalBody, { color: C.textSub }]}>
                {confirmModal.ticket.customerName} — {confirmModal.ticket.serviceName}
              </Text>
            )}
            <View style={styles.modalBtns}>
              <TouchableOpacity style={[styles.modalCancelBtn, { borderColor: C.border }]}
                onPress={() => setConfirmModal({ visible: false, action: null, ticket: null })}>
                <Text style={[styles.modalCancelText, { color: C.textSub }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalConfirmBtn} onPress={handleConfirm}>
                <Text style={styles.modalConfirmText}>Confirm</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Message modal */}
      <Modal visible={messageModal.visible} transparent animationType="fade"
        onRequestClose={() => setMessageModal({ visible: false, name: '', phone: '' })}>
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1}
          onPress={() => setMessageModal({ visible: false, name: '', phone: '' })}>
          <TouchableOpacity activeOpacity={1} onPress={() => {}}>
            <View style={[styles.modalBox, { backgroundColor: C.surface, width: 300 }]}>
              <Text style={[styles.modalTitle, { color: C.text }]}>Message Customer</Text>
              <Text style={[styles.modalBody, { color: C.textSub, marginBottom: 16 }]}>
                {messageModal.name} · {messageModal.phone}
              </Text>
              <TouchableOpacity
                style={[styles.addBtn, { backgroundColor: '#10b981', marginBottom: 10 }]}
                onPress={() => {
                  const cleaned = messageModal.phone.replace(/\D/g, '');
                  if (typeof window !== 'undefined') window.open(`sms:${cleaned}`, '_self');
                  setMessageModal({ visible: false, name: '', phone: '' });
                }}
              >
                <Text style={styles.addBtnText}>💬 Send SMS</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.addBtn, { backgroundColor: '#2563eb', marginBottom: 10 }]}
                onPress={() => {
                  const subject = encodeURIComponent('Your appointment update');
                  const body = encodeURIComponent(`Hi ${messageModal.name}, we wanted to reach out about your visit.`);
                  if (typeof window !== 'undefined') window.open(`mailto:?subject=${subject}&body=${body}`, '_self');
                  setMessageModal({ visible: false, name: '', phone: '' });
                }}
              >
                <Text style={styles.addBtnText}>✉ Send Email</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.modalCancelBtn, { borderColor: C.border, alignItems: 'center' }]}
                onPress={() => setMessageModal({ visible: false, name: '', phone: '' })}>
                <Text style={[styles.modalCancelText, { color: C.textSub }]}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

    </SafeAreaView>
  );
}

const SIDEBAR_W = 160;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#151718' },
  body: { flex: 1, flexDirection: 'row' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },

  sidebar: {
    width: SIDEBAR_W, backgroundColor: '#111',
    borderLeftWidth: 1, borderLeftColor: '#2a2a2a',
    paddingVertical: Spacing.md, justifyContent: 'space-between',
  },
  sidebarTop: { paddingHorizontal: Spacing.md, marginBottom: Spacing.lg },
  sidebarBusiness: { color: '#fff', fontSize: 14, fontWeight: '700' },
  sidebarRole: { color: '#6b7280', fontSize: 11, marginTop: 2 },
  navItems: { flex: 1, gap: 2, paddingHorizontal: Spacing.sm },
  navItem: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: 9, paddingHorizontal: Spacing.sm,
    borderRadius: BorderRadius.md, gap: Spacing.sm,
  },
  navItemActive: { backgroundColor: '#0a7ea422' },
  navIcon: { fontSize: 14 },
  navLabel: { color: '#6b7280', fontSize: 12, fontWeight: '600', flex: 1 },
  navLabelActive: { color: '#0a7ea4' },
  navBadge: {
    backgroundColor: '#f59e0b', borderRadius: BorderRadius.full,
    minWidth: 18, height: 18, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 4,
  },
  navBadgeText: { color: '#000', fontSize: 10, fontWeight: '700' },
  sidebarBottom: { paddingHorizontal: Spacing.md, gap: Spacing.sm },
  liveIndicator: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  liveDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#10b981' },
  liveText: { color: '#10b981', fontSize: 12, fontWeight: '600' },
  lockBtn: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, paddingVertical: Spacing.sm },
  lockIcon: { fontSize: 14 },
  lockText: { color: '#6b7280', fontSize: 13 },
  qrSidebar: {
    width: 150, borderLeftWidth: 1,
    paddingVertical: Spacing.lg, paddingHorizontal: Spacing.sm,
    alignItems: 'center', gap: Spacing.sm,
  },
  qrSidebarLabel: { fontSize: 11, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5, textAlign: 'center' },
  qrSidebarImg: { width: 120, height: 120, borderRadius: 8, backgroundColor: '#fff' },
  qrShareBtn: { borderRadius: BorderRadius.md, paddingVertical: 9, paddingHorizontal: Spacing.sm, alignItems: 'center', width: '100%' },
  qrShareBtnText: { color: '#fff', fontSize: 12, fontWeight: '700', textAlign: 'center' },

  // QR popup modal
  qrPopup: {
    borderRadius: BorderRadius.xl, padding: Spacing.lg, width: 300,
    gap: Spacing.sm, shadowColor: '#000', shadowOpacity: 0.3, shadowRadius: 16, elevation: 10,
  },
  qrPopupTitle: { fontSize: 16, fontWeight: '700', textAlign: 'center', marginBottom: 2 },
  qrPopupUrl: { fontSize: 12, textAlign: 'center', marginBottom: 4 },
  qrPopupImg: { width: 180, height: 180, alignSelf: 'center', borderRadius: 8, backgroundColor: '#fff' },
  qrPopupClose: { alignItems: 'center', marginTop: 4 },
  qrPopupCloseText: { fontSize: 13, fontWeight: '600' },

  main: { flex: 1 },
  topBar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: Spacing.md, paddingVertical: Spacing.md,
    borderBottomWidth: 1, borderBottomColor: '#2a2a2a',
  },
  topBarTitle: { color: '#fff', fontSize: 18, fontWeight: '700' },
  tabContent: { padding: Spacing.md, gap: Spacing.md },

  statsRow: { flexDirection: 'row', gap: Spacing.sm },
  statCard: {
    flex: 1, backgroundColor: '#1e1e1e', borderRadius: BorderRadius.lg,
    padding: Spacing.md, borderTopWidth: 3, alignItems: 'center',
  },
  statNum: { fontSize: 22, fontWeight: '700' },
  statLbl: { color: '#6b7280', fontSize: 11, marginTop: 4 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  sectionTitle: { fontSize: 15, fontWeight: '700' },
  sectionLink: { color: '#0a7ea4', fontSize: 13, fontWeight: '600' },
  sectionSub: { fontSize: 13, marginTop: -Spacing.sm },
  emptyPreview: { borderRadius: BorderRadius.lg, padding: Spacing.lg, alignItems: 'center' },
  emptyPreviewText: { fontSize: 14 },
  serviceRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    borderRadius: BorderRadius.md, padding: Spacing.md,
  },
  serviceRowName: { fontSize: 14, fontWeight: '600' },
  serviceRowRight: { alignItems: 'flex-end' },
  serviceRowCount: { color: '#f59e0b', fontSize: 13, fontWeight: '600' },
  serviceRowTime: { fontSize: 11, marginTop: 2 },
  qrSection: {
    borderRadius: BorderRadius.lg, padding: Spacing.md,
    alignItems: 'center', gap: 6, borderWidth: 1,
  },
  qrTitle: { fontSize: 12, fontWeight: '600' },
  qrCode: { fontSize: 16, fontWeight: '700' },
  qrHint: { fontSize: 11 },

  ticketCard: {
    borderRadius: BorderRadius.lg, padding: Spacing.md,
    borderWidth: 1, gap: Spacing.sm,
  },
  ticketCardCalled: { borderWidth: 1.5 },
  ticketCardCompact: { opacity: 0.9 },
  ticketTop: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  positionBadge: { width: 38, height: 38, borderRadius: 19, justifyContent: 'center', alignItems: 'center' },
  positionText: { color: '#fff', fontSize: 12, fontWeight: '700' },
  customerInfo: { flex: 1 },
  customerName: { fontSize: 15, fontWeight: '700' },
  customerPhone: { fontSize: 12, marginTop: 2 },
  statusPill: { paddingHorizontal: Spacing.sm, paddingVertical: 3, borderRadius: BorderRadius.full },
  statusPillText: { fontSize: 11, fontWeight: '600' },
  ticketMeta: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 4 },
  metaText: { fontSize: 12 },
  metaDot: { fontSize: 12 },
  editWaitRow: { flexDirection: 'row', alignItems: 'center' },
  editLabel: { color: '#0a7ea4', fontSize: 12, fontWeight: '600' },
  ticketActions: { flexDirection: 'row', gap: Spacing.sm, marginTop: 4 },
  callBtn: { flex: 1, backgroundColor: '#8b5cf6', borderRadius: BorderRadius.md, paddingVertical: 9, alignItems: 'center' },
  callBtnText: { color: '#fff', fontSize: 13, fontWeight: '700' },
  doneBtn: { flex: 1, backgroundColor: '#10b981', borderRadius: BorderRadius.md, paddingVertical: 9, alignItems: 'center' },
  doneBtnText: { color: '#fff', fontSize: 13, fontWeight: '700' },
  removeBtn: { paddingHorizontal: Spacing.md, paddingVertical: 9, borderRadius: BorderRadius.md, borderWidth: 1, alignItems: 'center' },
  removeBtnText: { fontSize: 13 },

  emptyIcon: { fontSize: 44 },
  emptyTitle: { fontSize: 18, fontWeight: '700' },
  emptySub: { fontSize: 13, textAlign: 'center' },

  fieldLabel: { fontSize: 13, fontWeight: '600', marginBottom: -Spacing.sm },
  input: {
    borderRadius: BorderRadius.md, borderWidth: 1,
    fontSize: 16, padding: Spacing.md,
  },
  serviceChips: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  serviceChip: {
    paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full, borderWidth: 1, alignItems: 'center',
  },
  serviceChipSelected: { backgroundColor: '#0a7ea4', borderColor: '#0a7ea4' },
  serviceChipText: { fontSize: 14, fontWeight: '600' },
  serviceChipTextSelected: { color: '#fff' },
  serviceChipTime: { fontSize: 11, marginTop: 2 },
  previewCard: { borderRadius: BorderRadius.lg, padding: Spacing.md, gap: 8, borderWidth: 1 },
  previewTitle: { fontSize: 12, fontWeight: '600', marginBottom: 4 },
  previewRow: { flexDirection: 'row', justifyContent: 'space-between' },
  previewLabel: { fontSize: 14 },
  previewValue: { fontSize: 14, fontWeight: '700' },
  addBtn: { backgroundColor: '#0a7ea4', borderRadius: BorderRadius.md, paddingVertical: 14, alignItems: 'center' },
  addBtnDisabled: { opacity: 0.4 },
  addBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  successBanner: { backgroundColor: '#064e3b', borderRadius: BorderRadius.md, padding: Spacing.md, alignItems: 'center' },
  successText: { color: '#d1fae5', fontSize: 14, fontWeight: '600' },

  serviceEditRow: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
    borderRadius: BorderRadius.md, padding: Spacing.sm, borderWidth: 1,
  },
  serviceEditLeft: { flex: 1, gap: 6 },
  serviceEditInput: {
    borderRadius: BorderRadius.sm, fontSize: 14,
    paddingHorizontal: 10, paddingVertical: 8, borderWidth: 1,
  },
  serviceTimeRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  serviceTimeInput: {
    borderRadius: BorderRadius.sm, fontSize: 14,
    paddingHorizontal: 10, paddingVertical: 6,
    borderWidth: 1, width: 60, textAlign: 'center',
  },
  serviceTimeLabel: { fontSize: 12 },
  removeServiceBtn: { padding: 8 },
  removeServiceText: { fontSize: 16 },
  addServiceRow: { flexDirection: 'row', gap: Spacing.sm, alignItems: 'center' },
  addServiceBtn: { backgroundColor: '#2563eb', borderRadius: BorderRadius.md, paddingHorizontal: Spacing.md, paddingVertical: 10 },
  addServiceBtnText: { color: '#fff', fontSize: 13, fontWeight: '700' },
  saveServicesBtn: { backgroundColor: '#10b981', borderRadius: BorderRadius.md, paddingVertical: 14, alignItems: 'center' },

  // Customers tab
  customerCard: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    borderRadius: BorderRadius.lg, padding: Spacing.md, borderWidth: 1,
  },
  customerCardLeft: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  customerAvatar: { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center' },
  customerAvatarText: { fontSize: 18, fontWeight: '800' },
  customerCardName: { fontSize: 15, fontWeight: '700' },
  customerCardPhone: { fontSize: 12, marginTop: 1 },
  customerCardService: { fontSize: 12, marginTop: 1 },
  customerCardRight: { alignItems: 'flex-end', gap: 6 },
  customerCardStatus: { fontSize: 12, fontWeight: '600' },

  // Settings tab
  settingsCard: { borderRadius: BorderRadius.lg, padding: Spacing.md, borderWidth: 1 },
  settingsCardTitle: { fontSize: 15, fontWeight: '700', marginBottom: 4 },
  settingsCardSub: { fontSize: 13, lineHeight: 18, marginBottom: 4 },
  profileRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingVertical: 10, borderBottomWidth: 1,
  },
  profileLabel: { fontSize: 13 },
  profileValue: { fontSize: 13, fontWeight: '600', maxWidth: '55%', textAlign: 'right' },
  hoursRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  hoursDay: { fontSize: 13, fontWeight: '600', width: 80 },
  hoursInput: {
    flex: 1, borderRadius: BorderRadius.sm, paddingHorizontal: 10, paddingVertical: 7,
    fontSize: 13, borderWidth: 1,
  },

  // Visit badges
  visitBadgeAmber: { backgroundColor: '#fef3c7', borderRadius: 6, paddingHorizontal: 7, paddingVertical: 2 },
  visitBadgeAmberText: { color: '#92400e', fontSize: 10, fontWeight: '700' },
  visitBadgeBlue: { backgroundColor: '#dbeafe', borderRadius: 6, paddingHorizontal: 7, paddingVertical: 2 },
  visitBadgeBlueText: { color: '#1e40af', fontSize: 10, fontWeight: '700' },

  // QR panel (Home tab)
  qrPanelInner: { flexDirection: 'row', gap: 16, alignItems: 'flex-start' },
  qrImageWrap: { alignItems: 'center', gap: 6 },
  qrImage: { width: 130, height: 130, borderRadius: 8, backgroundColor: '#fff' },
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

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center', padding: Spacing.lg },
  modalBox: { borderRadius: BorderRadius.xl, padding: Spacing.lg, width: '100%', maxWidth: 400, gap: Spacing.md },
  modalTitle: { fontSize: 18, fontWeight: '700', textAlign: 'center' },
  modalBody: { fontSize: 14, textAlign: 'center' },
  modalNote: { fontSize: 13, textAlign: 'center' },
  editInput: {
    borderRadius: BorderRadius.md, fontSize: 28,
    fontWeight: '700', padding: Spacing.md, textAlign: 'center', borderWidth: 1,
  },
  modalBtns: { flexDirection: 'row', gap: Spacing.sm, marginTop: Spacing.sm },
  modalCancelBtn: { flex: 1, paddingVertical: 12, borderRadius: BorderRadius.md, borderWidth: 1, alignItems: 'center' },
  modalCancelText: { fontSize: 15, fontWeight: '600' },
  modalConfirmBtn: { flex: 1, paddingVertical: 12, borderRadius: BorderRadius.md, backgroundColor: '#0a7ea4', alignItems: 'center' },
  modalConfirmText: { color: '#fff', fontSize: 15, fontWeight: '700' },

  // Staff
  planBanner: { borderWidth: 1, borderRadius: BorderRadius.md, padding: Spacing.md, marginBottom: 12 },
  staffCard: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderRadius: BorderRadius.lg, padding: Spacing.md, gap: Spacing.md },
  staffAvatar: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  staffAvatarImg: { width: 48, height: 48, borderRadius: 24 },
  staffAvatarText: { fontSize: 20, fontWeight: '700' },
  staffName: { fontSize: 15, fontWeight: '700' },
  staffRole: { fontSize: 12, marginTop: 1 },
  staffPhone: { fontSize: 12, marginTop: 1 },

  // Subscription
  planCard: { borderRadius: BorderRadius.xl, borderWidth: 1, padding: Spacing.lg },
  planCardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  planName: { fontSize: 20, fontWeight: '800' },
  planPrice: { fontSize: 16, fontWeight: '600', marginTop: 2 },
  planActiveBadge: { borderWidth: 1, borderRadius: BorderRadius.full, paddingHorizontal: 12, paddingVertical: 4 },
  planActiveBadgeText: { fontSize: 12, fontWeight: '700' },
  planSelectBtn: { borderRadius: BorderRadius.md, paddingHorizontal: 16, paddingVertical: 8 },
  planSelectBtnText: { color: '#fff', fontWeight: '700', fontSize: 13 },
  planFeature: { fontSize: 13 },

  // Analytics
  analyticStatCard: {
    flex: 1, minWidth: '45%', borderRadius: 12, padding: 14,
    borderTopWidth: 3, borderWidth: 1, alignItems: 'center',
  },
  analyticStatNum: { fontSize: 24, fontWeight: '800' },
  analyticStatLbl: { fontSize: 11, marginTop: 4, textAlign: 'center' },
  analyticCard: { borderRadius: 14, padding: 16, borderWidth: 1 },
  analyticCardTitle: { fontSize: 15, fontWeight: '700' },
  analyticCardSub: { fontSize: 12, marginTop: 2 },

  apptCard: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    borderRadius: 12, padding: 14, borderWidth: 1,
  },
  apptTimeCol: { alignItems: 'center', minWidth: 56 },
  apptTime: { fontSize: 14, fontWeight: '700' },
  apptDate: { fontSize: 11, marginTop: 2 },
  apptInfo: { flex: 1, gap: 2 },
  apptName: { fontSize: 14, fontWeight: '600' },
  apptService: { fontSize: 12 },
  apptStaff: { fontSize: 11 },
  apptPhone: { fontSize: 11 },
});
