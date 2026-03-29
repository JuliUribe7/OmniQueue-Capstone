// Staff/Admin Dashboard
// Sidebar navigation: Home | Live Queue | Add Walk-in

import React, { useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  SafeAreaView,
  Modal,
  ActivityIndicator,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useRouter } from 'expo-router';
import { useDashboard, timeAgo, formatTime, ServedFilter } from '@/hooks/useDashboard';
import { DashboardTicket, MOCK_SERVICES } from '@/services/queueService';
import { BorderRadius, Spacing } from '@/constants/theme';

const BUSINESS_NAME = 'Classic Cuts';
type Tab = 'home' | 'queue' | 'walkin';

const NAV_ITEMS: { tab: Tab; icon: string; label: string }[] = [
  { tab: 'home',   icon: '🏠', label: 'Home'       },
  { tab: 'queue',  icon: '📋', label: 'Live Queue' },
  { tab: 'walkin', icon: '➕', label: 'Add Walk-in' },
];

export default function Dashboard() {
  const router = useRouter();
  const {
    tickets,
    servedHistory,
    servedFilter,
    setServedFilter,
    isLoading,
    error,
    lastRefreshed,
    refresh,
    markDone,
    callNext,
    removeTicket,
    editWaitTime,
    addWalkIn,
  } = useDashboard();

  const [activeTab, setActiveTab] = useState<Tab>('home');

  // confirm modal
  const [confirmModal, setConfirmModal] = useState<{
    visible: boolean;
    action: 'done' | 'remove' | 'call' | null;
    ticket: DashboardTicket | null;
  }>({ visible: false, action: null, ticket: null });

  // edit wait time modal
  const [editModal, setEditModal] = useState<{
    visible: boolean;
    ticket: DashboardTicket | null;
    value: string;
  }>({ visible: false, ticket: null, value: '' });

  // served history modal
  const [showServedModal, setShowServedModal] = useState(false);

  // walk-in form
  const [walkInName, setWalkInName] = useState('');
  const [walkInPhone, setWalkInPhone] = useState('');
  const [walkInServiceId, setWalkInServiceId] = useState(MOCK_SERVICES[0].id);
  const [walkInSuccess, setWalkInSuccess] = useState(false);
  const [walkInLoading, setWalkInLoading] = useState(false);

  const waitingTickets = tickets.filter(t => t.status === 'Waiting');
  const calledTickets  = tickets.filter(t => t.status === 'Called');
  const avgWait = tickets.length > 0
    ? Math.round(tickets.reduce((s, t) => s + t.estimatedWait, 0) / tickets.length)
    : 0;

  function openConfirm(action: 'done' | 'remove' | 'call', ticket: DashboardTicket) {
    setConfirmModal({ visible: true, action, ticket });
  }

  async function handleConfirm() {
    const { action, ticket } = confirmModal;
    setConfirmModal({ visible: false, action: null, ticket: null });
    if (!ticket) return;
    if (action === 'done')   await markDone(ticket.id);
    if (action === 'call')   await callNext(ticket.serviceId);
    if (action === 'remove') await removeTicket(ticket.id);
  }

  function openEditWait(ticket: DashboardTicket) {
    setEditModal({ visible: true, ticket, value: String(ticket.estimatedWait) });
  }

  function handleSaveWait() {
    const mins = parseInt(editModal.value, 10);
    if (editModal.ticket && !isNaN(mins) && mins > 0) editWaitTime(editModal.ticket.id, mins);
    setEditModal({ visible: false, ticket: null, value: '' });
  }

  async function handleAddWalkIn() {
    if (!walkInName.trim() || walkInPhone.trim().length < 10) return;
    setWalkInLoading(true);
    await addWalkIn(walkInName.trim(), walkInPhone.trim(), walkInServiceId);
    setWalkInLoading(false);
    setWalkInSuccess(true);
    setWalkInName('');
    setWalkInPhone('');
    setWalkInServiceId(MOCK_SERVICES[0].id);
    setTimeout(() => setWalkInSuccess(false), 3000);
  }

  function statusColor(status: DashboardTicket['status']) {
    if (status === 'Called')  return '#10b981';
    if (status === 'Waiting') return '#f59e0b';
    return '#6b7280';
  }

  // ── Ticket card (shared between home preview and live queue) ──────────────
  function TicketCard({ item, compact = false }: { item: DashboardTicket; compact?: boolean }) {
    const isCalled = item.status === 'Called';
    return (
      <View style={[styles.ticketCard, isCalled && styles.ticketCardCalled, compact && styles.ticketCardCompact]}>
        <View style={styles.ticketTop}>
          <View style={[styles.positionBadge, { backgroundColor: statusColor(item.status) }]}>
            <Text style={styles.positionText}>#{item.position}</Text>
          </View>
          <View style={styles.customerInfo}>
            <Text style={styles.customerName}>{item.customerName}</Text>
            <Text style={styles.customerPhone}>{item.phoneNumber}</Text>
          </View>
          <View style={[styles.statusPill, { backgroundColor: statusColor(item.status) + '22' }]}>
            <Text style={[styles.statusPillText, { color: statusColor(item.status) }]}>
              {isCalled ? 'Called' : 'Waiting'}
            </Text>
          </View>
        </View>

        <View style={styles.ticketMeta}>
          <Text style={styles.metaText}>✂ {item.serviceName}</Text>
          <Text style={styles.metaDot}>·</Text>
          <Text style={styles.metaText}>🕐 {timeAgo(item.joinedAt)}</Text>
          {!compact && (
            <>
              <Text style={styles.metaDot}>·</Text>
              <TouchableOpacity onPress={() => openEditWait(item)} style={styles.editWaitRow}>
                <Text style={styles.metaText}>⏱ ~{item.estimatedWait} min</Text>
                <Text style={styles.editLabel}> Edit</Text>
              </TouchableOpacity>
            </>
          )}
        </View>

        {!compact && (
          <View style={styles.ticketActions}>
            {item.status === 'Waiting' && item.position === 1 && (
              <TouchableOpacity style={styles.callBtn} onPress={() => openConfirm('call', item)}>
                <Text style={styles.callBtnText}>Call In</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity style={styles.doneBtn} onPress={() => openConfirm('done', item)}>
              <Text style={styles.doneBtnText}>✓ Done</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.removeBtn} onPress={() => openConfirm('remove', item)}>
              <Text style={styles.removeBtnText}>Remove</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    );
  }

  // ── Home Tab ──────────────────────────────────────────────────────────────
  function renderHome() {
    const preview = tickets.slice(0, 3);
    return (
      <ScrollView contentContainerStyle={styles.tabContent} showsVerticalScrollIndicator={false}>

        {/* Stats row */}
        <View style={styles.statsRow}>
          <View style={[styles.statCard, { borderTopColor: '#f59e0b' }]}>
            <Text style={styles.statNum}>{waitingTickets.length}</Text>
            <Text style={styles.statLbl}>Waiting</Text>
          </View>
          <View style={[styles.statCard, { borderTopColor: '#10b981' }]}>
            <Text style={[styles.statNum, { color: '#10b981' }]}>{calledTickets.length}</Text>
            <Text style={styles.statLbl}>Called</Text>
          </View>
          <TouchableOpacity
            style={[styles.statCard, { borderTopColor: '#0a7ea4' }]}
            onPress={() => setShowServedModal(true)}
            activeOpacity={0.7}
          >
            <Text style={[styles.statNum, { color: '#0a7ea4' }]}>{servedHistory.length}</Text>
            <Text style={styles.statLbl}>Served</Text>
            <Text style={styles.statTap}>tap to view ›</Text>
          </TouchableOpacity>
          <View style={[styles.statCard, { borderTopColor: '#8b5cf6' }]}>
            <Text style={[styles.statNum, { color: '#8b5cf6' }]}>{avgWait}m</Text>
            <Text style={styles.statLbl}>Avg Wait</Text>
          </View>
        </View>

        {/* Live queue preview */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Live Queue</Text>
          <TouchableOpacity onPress={() => setActiveTab('queue')}>
            <Text style={styles.sectionLink}>View All →</Text>
          </TouchableOpacity>
        </View>

        {tickets.length === 0 ? (
          <View style={styles.emptyPreview}>
            <Text style={styles.emptyPreviewText}>No customers in queue</Text>
          </View>
        ) : (
          preview.map(ticket => (
            <TouchableOpacity key={ticket.id} onPress={() => setActiveTab('queue')} activeOpacity={0.8}>
              <TicketCard item={ticket} compact />
            </TouchableOpacity>
          ))
        )}

        {tickets.length > 3 && (
          <TouchableOpacity style={styles.viewMoreBtn} onPress={() => setActiveTab('queue')}>
            <Text style={styles.viewMoreText}>+{tickets.length - 3} more in queue — View All</Text>
          </TouchableOpacity>
        )}

        {/* Queue by service */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>By Service</Text>
        </View>
        {MOCK_SERVICES.map(service => {
          const count = tickets.filter(t => t.serviceId === service.id).length;
          return (
            <View key={service.id} style={styles.serviceRow}>
              <Text style={styles.serviceRowName}>{service.name}</Text>
              <View style={styles.serviceRowRight}>
                <Text style={styles.serviceRowCount}>{count} in line</Text>
                <Text style={styles.serviceRowTime}>~{service.avgTime} min/person</Text>
              </View>
            </View>
          );
        })}

        {lastRefreshed && (
          <Text style={styles.lastUpdated}>
            Auto-refreshes every 8s · Last: {lastRefreshed.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
          </Text>
        )}
      </ScrollView>
    );
  }

  // ── Live Queue Tab ────────────────────────────────────────────────────────
  function renderQueue() {
    if (isLoading && tickets.length === 0) {
      return <View style={styles.centered}><ActivityIndicator size="large" color="#0a7ea4" /></View>;
    }
    if (tickets.length === 0) {
      return (
        <View style={styles.centered}>
          <Text style={styles.emptyIcon}>✅</Text>
          <Text style={styles.emptyTitle}>Queue is empty</Text>
          <Text style={styles.emptySub}>No customers waiting right now</Text>
        </View>
      );
    }
    return (
      <FlatList
        data={tickets}
        keyExtractor={item => item.id}
        renderItem={({ item }) => <TicketCard item={item} />}
        contentContainerStyle={styles.tabContent}
        showsVerticalScrollIndicator={false}
        refreshing={isLoading}
        onRefresh={refresh}
      />
    );
  }

  // ── Walk-in Tab ───────────────────────────────────────────────────────────
  function renderWalkIn() {
    const selectedService = MOCK_SERVICES.find(s => s.id === walkInServiceId)!;
    const nextPosition = tickets.length + 1;
    const estWait = tickets.length > 0
      ? (tickets[tickets.length - 1]?.estimatedWait ?? 0) + selectedService.avgTime
      : selectedService.avgTime;

    return (
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.tabContent} showsVerticalScrollIndicator={false}>
          <Text style={styles.sectionTitle}>Add Walk-in Customer</Text>
          <Text style={styles.sectionSub}>
            Customer is added to the queue and gets an SMS with their position and estimated wait.
          </Text>

          {walkInSuccess && (
            <View style={styles.successBanner}>
              <Text style={styles.successText}>✅ Added to queue — position #{tickets.length}</Text>
            </View>
          )}

          <Text style={styles.fieldLabel}>Full Name</Text>
          <TextInput
            style={styles.input}
            value={walkInName}
            onChangeText={setWalkInName}
            placeholder="Customer name"
            placeholderTextColor="#4a4a4a"
            autoCapitalize="words"
          />

          <Text style={styles.fieldLabel}>Phone Number</Text>
          <TextInput
            style={styles.input}
            value={walkInPhone}
            onChangeText={setWalkInPhone}
            placeholder="(555) 000-0000"
            placeholderTextColor="#4a4a4a"
            keyboardType="phone-pad"
          />

          <Text style={styles.fieldLabel}>Service</Text>
          <View style={styles.serviceChips}>
            {MOCK_SERVICES.map(service => (
              <TouchableOpacity
                key={service.id}
                style={[styles.serviceChip, walkInServiceId === service.id && styles.serviceChipSelected]}
                onPress={() => setWalkInServiceId(service.id)}
              >
                <Text style={[styles.serviceChipText, walkInServiceId === service.id && styles.serviceChipTextSelected]}>
                  {service.name}
                </Text>
                <Text style={[styles.serviceChipTime, walkInServiceId === service.id && styles.serviceChipTextSelected]}>
                  ~{service.avgTime} min
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <View style={styles.previewCard}>
            <Text style={styles.previewTitle}>Queue Preview</Text>
            <View style={styles.previewRow}>
              <Text style={styles.previewLabel}>Position</Text>
              <Text style={styles.previewValue}>#{nextPosition}</Text>
            </View>
            <View style={styles.previewRow}>
              <Text style={styles.previewLabel}>Service</Text>
              <Text style={styles.previewValue}>{selectedService.name}</Text>
            </View>
            <View style={styles.previewRow}>
              <Text style={styles.previewLabel}>Est. Wait</Text>
              <Text style={styles.previewValue}>~{estWait} min</Text>
            </View>
          </View>

          <TouchableOpacity
            style={[styles.addBtn, (!walkInName.trim() || walkInPhone.trim().length < 10) && styles.addBtnDisabled]}
            onPress={handleAddWalkIn}
            disabled={!walkInName.trim() || walkInPhone.trim().length < 10 || walkInLoading}
          >
            {walkInLoading
              ? <ActivityIndicator color="#fff" />
              : <Text style={styles.addBtnText}>Add to Queue</Text>
            }
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    );
  }

  // ── Root ──────────────────────────────────────────────────────────────────
  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="light" />

      <View style={styles.body}>

        {/* Left sidebar */}
        <View style={styles.sidebar}>
          <View style={styles.sidebarTop}>
            <Text style={styles.sidebarBusiness}>{BUSINESS_NAME}</Text>
            <Text style={styles.sidebarRole}>Staff Dashboard</Text>
          </View>

          <View style={styles.navItems}>
            {NAV_ITEMS.map(({ tab, icon, label }) => {
              const isActive = activeTab === tab;
              const badge = tab === 'queue' ? tickets.length : 0;
              return (
                <TouchableOpacity
                  key={tab}
                  style={[styles.navItem, isActive && styles.navItemActive]}
                  onPress={() => setActiveTab(tab)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.navIcon}>{icon}</Text>
                  <Text style={[styles.navLabel, isActive && styles.navLabelActive]}>{label}</Text>
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
            {lastRefreshed && (
              <View style={styles.liveIndicator}>
                <View style={styles.liveDot} />
                <Text style={styles.liveText}>Live</Text>
              </View>
            )}
            <TouchableOpacity style={styles.lockBtn} onPress={() => router.replace('/staff-login')}>
              <Text style={styles.lockIcon}>🔒</Text>
              <Text style={styles.lockText}>Lock</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Main content */}
        <View style={styles.main}>
          {/* Top bar */}
          <View style={styles.topBar}>
            <Text style={styles.topBarTitle}>
              {activeTab === 'home'   && 'Overview'}
              {activeTab === 'queue'  && 'Live Queue'}
              {activeTab === 'walkin' && 'Add Walk-in'}
            </Text>
            <TouchableOpacity onPress={refresh} style={styles.refreshBtn}>
              <Text style={styles.refreshText}>↻ Refresh</Text>
            </TouchableOpacity>
          </View>

          {error && (
            <View style={styles.errorBanner}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}

          {activeTab === 'home'   && renderHome()}
          {activeTab === 'queue'  && renderQueue()}
          {activeTab === 'walkin' && renderWalkIn()}
        </View>
      </View>

      {/* Confirm modal */}
      <Modal
        visible={confirmModal.visible}
        transparent
        animationType="fade"
        onRequestClose={() => setConfirmModal({ visible: false, action: null, ticket: null })}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <Text style={styles.modalTitle}>
              {confirmModal.action === 'done'   && 'Mark as Done?'}
              {confirmModal.action === 'call'   && 'Call Customer In?'}
              {confirmModal.action === 'remove' && 'Remove from Queue?'}
            </Text>
            {confirmModal.ticket && (
              <Text style={styles.modalBody}>
                {confirmModal.ticket.customerName} — {confirmModal.ticket.serviceName}
              </Text>
            )}
            {confirmModal.action === 'done' && (
              <Text style={styles.modalNote}>Removes them from the queue and moves everyone up.</Text>
            )}
            <View style={styles.modalBtns}>
              <TouchableOpacity style={styles.modalCancelBtn} onPress={() => setConfirmModal({ visible: false, action: null, ticket: null })}>
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalConfirmBtn} onPress={handleConfirm}>
                <Text style={styles.modalConfirmText}>Confirm</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Edit wait time modal */}
      <Modal
        visible={editModal.visible}
        transparent
        animationType="fade"
        onRequestClose={() => setEditModal({ visible: false, ticket: null, value: '' })}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <Text style={styles.modalTitle}>Edit Wait Time</Text>
            {editModal.ticket && <Text style={styles.modalBody}>{editModal.ticket.customerName}</Text>}
            <TextInput
              style={styles.editInput}
              value={editModal.value}
              onChangeText={v => setEditModal(prev => ({ ...prev, value: v }))}
              keyboardType="number-pad"
              placeholder="Minutes"
              placeholderTextColor="#4a4a4a"
              autoFocus
            />
            <Text style={styles.modalNote}>Enter updated wait time in minutes</Text>
            <View style={styles.modalBtns}>
              <TouchableOpacity style={styles.modalCancelBtn} onPress={() => setEditModal({ visible: false, ticket: null, value: '' })}>
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalConfirmBtn} onPress={handleSaveWait}>
                <Text style={styles.modalConfirmText}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Served history modal */}
      <Modal
        visible={showServedModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowServedModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.servedModalBox}>
            <View style={styles.servedModalHeader}>
              <Text style={styles.modalTitle}>Served Customers</Text>
              <TouchableOpacity onPress={() => setShowServedModal(false)}>
                <Text style={styles.closeBtn}>✕</Text>
              </TouchableOpacity>
            </View>

            {/* Today / This Week toggle */}
            <View style={styles.filterToggle}>
              {(['today', 'week'] as ServedFilter[]).map(f => (
                <TouchableOpacity
                  key={f}
                  style={[styles.filterBtn, servedFilter === f && styles.filterBtnActive]}
                  onPress={() => setServedFilter(f)}
                >
                  <Text style={[styles.filterBtnText, servedFilter === f && styles.filterBtnTextActive]}>
                    {f === 'today' ? 'Today' : 'This Week'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <ScrollView showsVerticalScrollIndicator={false} style={styles.servedList}>
              {servedHistory.length === 0 ? (
                <Text style={styles.emptySub}>No customers served {servedFilter === 'today' ? 'today' : 'this week'}</Text>
              ) : (
                servedHistory.map(entry => (
                  <View key={entry.id} style={styles.servedEntry}>
                    <View style={styles.servedEntryLeft}>
                      <Text style={styles.servedName}>{entry.customerName}</Text>
                      <Text style={styles.servedPhone}>{entry.phoneNumber}</Text>
                    </View>
                    <View style={styles.servedEntryRight}>
                      <Text style={styles.servedService}>{entry.serviceName}</Text>
                      <Text style={styles.servedTime}>{formatTime(entry.servedAt)} · {entry.waitedMinutes} min wait</Text>
                    </View>
                  </View>
                ))
              )}
            </ScrollView>

            <View style={styles.servedSummary}>
              <Text style={styles.servedSummaryText}>
                {servedHistory.length} customer{servedHistory.length !== 1 ? 's' : ''} served {servedFilter === 'today' ? 'today' : 'this week'}
              </Text>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const SIDEBAR_W = 160;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#151718' },
  body: { flex: 1, flexDirection: 'row' },

  // sidebar
  sidebar: {
    width: SIDEBAR_W,
    backgroundColor: '#111',
    borderRightWidth: 1,
    borderRightColor: '#2a2a2a',
    paddingVertical: Spacing.md,
    justifyContent: 'space-between',
  },
  sidebarTop: { paddingHorizontal: Spacing.md, marginBottom: Spacing.lg },
  sidebarBusiness: { color: '#fff', fontSize: 15, fontWeight: '700' },
  sidebarRole: { color: '#6b7280', fontSize: 11, marginTop: 2 },
  navItems: { flex: 1, gap: 4, paddingHorizontal: Spacing.sm },
  navItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: Spacing.sm,
    borderRadius: BorderRadius.md,
    gap: Spacing.sm,
  },
  navItemActive: { backgroundColor: '#0a7ea422' },
  navIcon: { fontSize: 16 },
  navLabel: { color: '#6b7280', fontSize: 13, fontWeight: '600', flex: 1 },
  navLabelActive: { color: '#0a7ea4' },
  navBadge: {
    backgroundColor: '#f59e0b',
    borderRadius: BorderRadius.full,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  navBadgeText: { color: '#000', fontSize: 11, fontWeight: '700' },
  sidebarBottom: { paddingHorizontal: Spacing.md, gap: Spacing.sm },
  liveIndicator: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  liveDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#10b981' },
  liveText: { color: '#10b981', fontSize: 12, fontWeight: '600' },
  lockBtn: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, paddingVertical: Spacing.sm },
  lockIcon: { fontSize: 14 },
  lockText: { color: '#6b7280', fontSize: 13 },

  // main
  main: { flex: 1, backgroundColor: '#151718' },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: '#2a2a2a',
  },
  topBarTitle: { color: '#fff', fontSize: 18, fontWeight: '700' },
  refreshBtn: { padding: Spacing.sm },
  refreshText: { color: '#0a7ea4', fontSize: 13, fontWeight: '600' },
  errorBanner: { backgroundColor: '#7f1d1d', padding: Spacing.sm },
  errorText: { color: '#fee2e2', fontSize: 13, textAlign: 'center' },

  // shared tab content
  tabContent: { padding: Spacing.md, gap: Spacing.md },

  // home tab
  statsRow: { flexDirection: 'row', gap: Spacing.sm },
  statCard: {
    flex: 1,
    backgroundColor: '#1e1e1e',
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    borderTopWidth: 3,
    alignItems: 'center',
  },
  statNum: { color: '#fff', fontSize: 22, fontWeight: '700' },
  statLbl: { color: '#6b7280', fontSize: 11, marginTop: 4 },
  statTap: { color: '#0a7ea4', fontSize: 10, marginTop: 2 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  sectionTitle: { color: '#fff', fontSize: 15, fontWeight: '700' },
  sectionLink: { color: '#0a7ea4', fontSize: 13, fontWeight: '600' },
  sectionSub: { color: '#6b7280', fontSize: 13, marginTop: -Spacing.sm },
  emptyPreview: {
    backgroundColor: '#1e1e1e', borderRadius: BorderRadius.lg,
    padding: Spacing.lg, alignItems: 'center',
  },
  emptyPreviewText: { color: '#6b7280', fontSize: 14 },
  viewMoreBtn: {
    backgroundColor: '#1e1e1e', borderRadius: BorderRadius.md,
    padding: Spacing.md, alignItems: 'center',
  },
  viewMoreText: { color: '#0a7ea4', fontSize: 13, fontWeight: '600' },
  serviceRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    backgroundColor: '#1e1e1e', borderRadius: BorderRadius.md, padding: Spacing.md,
  },
  serviceRowName: { color: '#fff', fontSize: 14, fontWeight: '600' },
  serviceRowRight: { alignItems: 'flex-end' },
  serviceRowCount: { color: '#f59e0b', fontSize: 13, fontWeight: '600' },
  serviceRowTime: { color: '#6b7280', fontSize: 11, marginTop: 2 },
  lastUpdated: { color: '#3a3a3a', fontSize: 11, textAlign: 'center' },

  // ticket cards
  ticketCard: {
    backgroundColor: '#1e1e1e', borderRadius: BorderRadius.lg,
    padding: Spacing.md, borderWidth: 1, borderColor: '#2a2a2a', gap: Spacing.sm,
  },
  ticketCardCalled: { borderColor: '#10b981', borderWidth: 1.5 },
  ticketCardCompact: { opacity: 0.9 },
  ticketTop: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  positionBadge: { width: 38, height: 38, borderRadius: 19, justifyContent: 'center', alignItems: 'center' },
  positionText: { color: '#fff', fontSize: 12, fontWeight: '700' },
  customerInfo: { flex: 1 },
  customerName: { color: '#fff', fontSize: 15, fontWeight: '700' },
  customerPhone: { color: '#9ba1a6', fontSize: 12, marginTop: 2 },
  statusPill: { paddingHorizontal: Spacing.sm, paddingVertical: 3, borderRadius: BorderRadius.full },
  statusPillText: { fontSize: 11, fontWeight: '600' },
  ticketMeta: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 4 },
  metaText: { color: '#9ba1a6', fontSize: 12 },
  metaDot: { color: '#3a3a3a', fontSize: 12 },
  editWaitRow: { flexDirection: 'row', alignItems: 'center' },
  editLabel: { color: '#0a7ea4', fontSize: 12, fontWeight: '600' },
  ticketActions: { flexDirection: 'row', gap: Spacing.sm, marginTop: 4 },
  callBtn: { flex: 1, backgroundColor: '#0a7ea4', borderRadius: BorderRadius.md, paddingVertical: 9, alignItems: 'center' },
  callBtnText: { color: '#fff', fontSize: 13, fontWeight: '700' },
  doneBtn: { flex: 1, backgroundColor: '#10b981', borderRadius: BorderRadius.md, paddingVertical: 9, alignItems: 'center' },
  doneBtnText: { color: '#fff', fontSize: 13, fontWeight: '700' },
  removeBtn: { paddingHorizontal: Spacing.md, paddingVertical: 9, borderRadius: BorderRadius.md, borderWidth: 1, borderColor: '#3a3a3a', alignItems: 'center' },
  removeBtnText: { color: '#9ba1a6', fontSize: 13 },

  // queue tab
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: Spacing.md },
  emptyIcon: { fontSize: 44 },
  emptyTitle: { color: '#fff', fontSize: 18, fontWeight: '700' },
  emptySub: { color: '#6b7280', fontSize: 13, textAlign: 'center' },

  // walk-in tab
  fieldLabel: { color: '#9ba1a6', fontSize: 13, fontWeight: '600', marginBottom: -Spacing.sm },
  input: {
    backgroundColor: '#1e1e1e', borderRadius: BorderRadius.md, borderWidth: 1,
    borderColor: '#3a3a3a', color: '#fff', fontSize: 16, padding: Spacing.md,
  },
  serviceChips: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  serviceChip: {
    paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full, backgroundColor: '#1e1e1e',
    borderWidth: 1, borderColor: '#3a3a3a', alignItems: 'center',
  },
  serviceChipSelected: { backgroundColor: '#0a7ea4', borderColor: '#0a7ea4' },
  serviceChipText: { color: '#9ba1a6', fontSize: 14, fontWeight: '600' },
  serviceChipTextSelected: { color: '#fff' },
  serviceChipTime: { color: '#6b7280', fontSize: 11, marginTop: 2 },
  previewCard: {
    backgroundColor: '#1e1e1e', borderRadius: BorderRadius.lg,
    padding: Spacing.md, gap: 8, borderWidth: 1, borderColor: '#2a2a2a',
  },
  previewTitle: { color: '#6b7280', fontSize: 12, fontWeight: '600', marginBottom: 4 },
  previewRow: { flexDirection: 'row', justifyContent: 'space-between' },
  previewLabel: { color: '#6b7280', fontSize: 14 },
  previewValue: { color: '#fff', fontSize: 14, fontWeight: '700' },
  addBtn: { backgroundColor: '#0a7ea4', borderRadius: BorderRadius.md, paddingVertical: 14, alignItems: 'center' },
  addBtnDisabled: { opacity: 0.4 },
  addBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  successBanner: { backgroundColor: '#064e3b', borderRadius: BorderRadius.md, padding: Spacing.md, alignItems: 'center' },
  successText: { color: '#d1fae5', fontSize: 14, fontWeight: '600' },

  // modals shared
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.75)', justifyContent: 'center', alignItems: 'center', padding: Spacing.lg },
  modalBox: { backgroundColor: '#1e1e1e', borderRadius: BorderRadius.xl, padding: Spacing.lg, width: '100%', maxWidth: 400, gap: Spacing.md },
  modalTitle: { color: '#fff', fontSize: 18, fontWeight: '700', textAlign: 'center' },
  modalBody: { color: '#9ba1a6', fontSize: 14, textAlign: 'center' },
  modalNote: { color: '#6b7280', fontSize: 13, textAlign: 'center' },
  editInput: {
    backgroundColor: '#2a2a2a', borderRadius: BorderRadius.md, color: '#fff',
    fontSize: 28, fontWeight: '700', padding: Spacing.md, textAlign: 'center',
    borderWidth: 1, borderColor: '#3a3a3a',
  },
  modalBtns: { flexDirection: 'row', gap: Spacing.sm, marginTop: Spacing.sm },
  modalCancelBtn: { flex: 1, paddingVertical: 12, borderRadius: BorderRadius.md, borderWidth: 1, borderColor: '#3a3a3a', alignItems: 'center' },
  modalCancelText: { color: '#9ba1a6', fontSize: 15, fontWeight: '600' },
  modalConfirmBtn: { flex: 1, paddingVertical: 12, borderRadius: BorderRadius.md, backgroundColor: '#0a7ea4', alignItems: 'center' },
  modalConfirmText: { color: '#fff', fontSize: 15, fontWeight: '700' },

  // served history modal
  servedModalBox: {
    backgroundColor: '#1e1e1e', borderRadius: BorderRadius.xl,
    padding: Spacing.lg, width: '100%', maxWidth: 480, maxHeight: '80%', gap: Spacing.md,
  },
  servedModalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  closeBtn: { color: '#6b7280', fontSize: 18, padding: Spacing.sm },
  filterToggle: { flexDirection: 'row', backgroundColor: '#2a2a2a', borderRadius: BorderRadius.md, padding: 3 },
  filterBtn: { flex: 1, paddingVertical: 8, borderRadius: BorderRadius.sm, alignItems: 'center' },
  filterBtnActive: { backgroundColor: '#0a7ea4' },
  filterBtnText: { color: '#6b7280', fontSize: 14, fontWeight: '600' },
  filterBtnTextActive: { color: '#fff' },
  servedList: { maxHeight: 380 },
  servedEntry: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingVertical: Spacing.sm, borderBottomWidth: 1, borderBottomColor: '#2a2a2a',
  },
  servedEntryLeft: { flex: 1 },
  servedName: { color: '#fff', fontSize: 14, fontWeight: '600' },
  servedPhone: { color: '#6b7280', fontSize: 12, marginTop: 2 },
  servedEntryRight: { alignItems: 'flex-end' },
  servedService: { color: '#9ba1a6', fontSize: 13 },
  servedTime: { color: '#6b7280', fontSize: 11, marginTop: 2 },
  servedSummary: { borderTopWidth: 1, borderTopColor: '#2a2a2a', paddingTop: Spacing.sm },
  servedSummaryText: { color: '#6b7280', fontSize: 13, textAlign: 'center' },
});