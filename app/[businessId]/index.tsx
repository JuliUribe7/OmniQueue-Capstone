// Customer portal — /{businessId}
// Customers can join the live queue or book an appointment.

import React, { useState, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  SafeAreaView, ScrollView, ActivityIndicator, KeyboardAvoidingView, Platform,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { api, ApiStaff } from '../../services/api';
import { BorderRadius, Spacing } from '../../constants/theme';

type PublicService  = { id: string; name: string; avgTime: number };
type PublicBusiness = { id: string; name: string; type: string; services: PublicService[] };
type ConfirmedBooking = {
  id: string; date: string; time: string;
  serviceId: string; serviceName: string;
  staffId: string; staffName: string;
  customerName: string; phoneNumber: string; createdAt: string;
};

function formatDisplayDate(d: Date): string {
  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
}

function getTimeSlots(): string[] {
  const slots: string[] = [];
  for (let h = 9; h <= 17; h++) {
    slots.push(`${h.toString().padStart(2, '0')}:00`);
    slots.push(`${h.toString().padStart(2, '0')}:30`);
  }
  slots.push('18:00');
  return slots;
}

function formatTime(t: string): string {
  const [h, m] = t.split(':').map(Number);
  const ampm = h >= 12 ? 'PM' : 'AM';
  const h12 = h > 12 ? h - 12 : h === 0 ? 12 : h;
  return `${h12}:${m.toString().padStart(2, '0')} ${ampm}`;
}


export default function CustomerPortal() {
  const router = useRouter();
  const { businessId } = useLocalSearchParams<{ businessId: string }>();

  const [business, setBusiness]   = useState<PublicBusiness | null>(null);
  const [loadError, setLoadError] = useState('');
  const [loading, setLoading]     = useState(true);
  const [staffList, setStaffList] = useState<ApiStaff[]>([]);
  const [bookedSlots, setBookedSlots] = useState<{ time: string; count: number }[]>([]);

  // Mode
  const [mode, setMode] = useState<'queue' | 'book'>('queue');

  // Join queue state
  const [name, setName]           = useState('');
  const [phone, setPhone]         = useState('');
  const [email, setEmail]         = useState('');
  const [serviceId, setServiceId] = useState('');
  const [staffId, setStaffId]     = useState('any');
  const [joining, setJoining]     = useState(false);
  const [joinError, setJoinError] = useState('');

  // Booking state
  const [bookServiceId, setBookServiceId] = useState('');
  const [bookDate, setBookDate]           = useState('');
  const [bookTime, setBookTime]           = useState('');
  const [bookStaffId, setBookStaffId]     = useState('any');
  const [bookName, setBookName]           = useState('');
  const [bookPhone, setBookPhone]         = useState('');
  const [bookError, setBookError]         = useState('');
  const [bookConfirmed, setBookConfirmed] = useState<ConfirmedBooking | null>(null);
  const [booking, setBooking]             = useState(false);
  const [calMonth, setCalMonth]           = useState<Date>(() => { const d = new Date(); d.setDate(1); d.setHours(0,0,0,0); return d; });

  // Fetch booked slots from backend when date changes
  useEffect(() => {
    if (!bookDate || !businessId) return;
    api.getPublicAppointments(businessId, bookDate)
      .then(({ bookedSlots: slots }) => setBookedSlots(slots))
      .catch(() => setBookedSlots([]));
  }, [bookDate, businessId]);

  useEffect(() => {
    api.getPublicBusiness(businessId)
      .then(({ business: biz }) => {
        setBusiness(biz);
        if (biz.services?.length > 0) {
          setServiceId(biz.services[0].id);
          setBookServiceId(biz.services[0].id);
        }
        api.getPublicStaff(businessId).then(r => setStaffList(r.staff)).catch(() => {});
      })
      .catch(() => setLoadError('Business not found or no longer available.'))
      .finally(() => setLoading(false));
  }, [businessId]);

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar style="dark" />
        <View style={styles.centered}><ActivityIndicator size="large" color="#2563eb" /></View>
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
          <Text style={styles.errorSub}>{loadError || 'This link may be invalid.'}</Text>
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
      const { token } = await api.joinQueue(businessId, name.trim(), phone.trim(), selectedService.id, email.trim());
      router.push(`/${businessId}/waiting?token=${token}`);
    } catch (e: any) {
      setJoinError(e?.message ?? 'Could not join queue. Please try again.');
    } finally {
      setJoining(false);
    }
  }

  // Booking helpers
  const TIME_SLOTS = getTimeSlots();
  const bookSelectedService = services.find(s => s.id === bookServiceId) ?? services[0];

  function isSlotAvailable(_date: string, time: string): boolean {
    const slot = bookedSlots.find(s => s.time === time);
    const booked = slot?.count ?? 0;
    const maxCap = staffList.length > 0 ? staffList.length : 1;
    return booked < maxCap;
  }

  const canBook =
    !!bookServiceId && !!bookDate && !!bookTime &&
    bookName.trim().length >= 2 && bookPhone.replace(/\D/g, '').length >= 10;

  async function handleBook() {
    if (!canBook || !bookSelectedService) return;
    setBookError('');
    setBooking(true);
    try {
      const staffMember = staffList.find(s => s.id === bookStaffId);
      const { appointment } = await api.createAppointment(
        businessId,
        bookServiceId,
        bookStaffId !== 'any' ? bookStaffId : '',
        bookName.trim(),
        bookPhone.trim(),
        bookDate,
        bookTime,
      );
      setBookConfirmed({
        id: appointment.id,
        date: bookDate,
        time: bookTime,
        serviceId: bookServiceId,
        serviceName: bookSelectedService.name,
        staffId: bookStaffId,
        staffName: staffMember?.name ?? 'Any available',
        customerName: bookName.trim(),
        phoneNumber: bookPhone.trim(),
        createdAt: appointment.createdAt,
      });
      // Immediately mark this slot as taken so no other customer can double-book
      setBookedSlots(prev => {
        const existing = prev.find(s => s.time === bookTime);
        if (existing) {
          return prev.map(s => s.time === bookTime ? { ...s, count: s.count + 1 } : s);
        }
        return [...prev, { time: bookTime, count: 1 }];
      });
    } catch (e: any) {
      setBookError(e?.message ?? 'Could not book appointment. Please try again.');
    } finally {
      setBooking(false);
    }
  }

  const typeLabel: Record<string, string> = {
    barbershop: '✂️ Barbershop', doctors_office: '🏥 Doctor\'s Office',
    salon: '💇 Salon', dental: '🦷 Dental', other: '🏢 Business',
  };

  // ── Booking confirmed screen ──────────────────────────────────────────────
  if (bookConfirmed) {
    const dateObj = new Date(bookConfirmed.date + 'T12:00:00');
    const displayDate = formatDisplayDate(dateObj);
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar style="dark" />
        <View style={styles.centered}>
          <View style={styles.confirmedCircle}>
            <Text style={{ fontSize: 40 }}>📅</Text>
          </View>
          <Text style={styles.confirmedTitle}>Appointment Confirmed!</Text>
          <Text style={styles.confirmedSub}>
            We'll see you on {displayDate} at {formatTime(bookConfirmed.time)}.
          </Text>

          <View style={styles.confirmedCard}>
            {[
              { label: 'Service', val: bookConfirmed.serviceName },
              { label: 'Date', val: displayDate },
              { label: 'Time', val: formatTime(bookConfirmed.time) },
              { label: 'Staff', val: bookConfirmed.staffName },
              { label: 'Name', val: bookConfirmed.customerName },
              { label: 'Phone', val: bookConfirmed.phoneNumber },
            ].map(({ label, val }) => (
              <View key={label} style={styles.confirmedRow}>
                <Text style={styles.confirmedLabel}>{label}</Text>
                <Text style={styles.confirmedValue}>{val}</Text>
              </View>
            ))}
          </View>

          <View style={[styles.confirmedCard, { backgroundColor: '#eff6ff', borderColor: '#bfdbfe' }]}>
            <Text style={{ color: '#1e40af', fontSize: 13, textAlign: 'center', lineHeight: 20 }}>
              📲 On the day of your appointment, you'll receive a link with your position in line and estimated wait time.
            </Text>
          </View>

          <TouchableOpacity
            style={[styles.joinBtn, { backgroundColor: '#059669', marginTop: 4 }]}
            onPress={() => {
              if (typeof window === 'undefined') return;
              const [h, m] = bookConfirmed.time.split(':').map(Number);
              const dateStr = bookConfirmed.date.replace(/-/g, '');
              const pad = (n: number) => String(n).padStart(2, '0');
              const dtStart = `${dateStr}T${pad(h)}${pad(m)}00`;
              const endH = Math.floor((h * 60 + m + 30) / 60);
              const endM = (h * 60 + m + 30) % 60;
              const dtEnd = `${dateStr}T${pad(endH)}${pad(endM)}00`;
              const ics = [
                'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//OmniQueue//EN',
                'BEGIN:VEVENT',
                `DTSTART:${dtStart}`,
                `DTEND:${dtEnd}`,
                `SUMMARY:${bookConfirmed.serviceName} at ${business!.name}`,
                `DESCRIPTION:Appointment for ${bookConfirmed.customerName}`,
                `LOCATION:${business!.name}`,
                'END:VEVENT', 'END:VCALENDAR',
              ].join('\r\n');
              const blob = new Blob([ics], { type: 'text/calendar' });
              const url = URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url; a.download = 'appointment.ics'; a.click();
              URL.revokeObjectURL(url);
            }}
          >
            <Text style={styles.joinBtnText}>📅 Save to Calendar</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.joinBtn, { marginTop: 4 }]}
            onPress={() => {
              setBookConfirmed(null);
              setBookDate(''); setBookTime(''); setBookStaffId('any');
              setBookName(''); setBookPhone('');
            }}
          >
            <Text style={styles.joinBtnText}>Book Another Appointment</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="dark" />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

          <View style={styles.header}>
            <Text style={styles.businessName}>{business.name}</Text>
            <Text style={styles.businessType}>{typeLabel[business.type] ?? '🏢 Business'}</Text>
          </View>

          {/* Mode toggle */}
          <View style={styles.modeToggle}>
            {(['queue', 'book'] as const).map(m => (
              <TouchableOpacity
                key={m}
                style={[styles.modeBtn, mode === m && styles.modeBtnActive]}
                onPress={() => setMode(m)}
                activeOpacity={0.7}
              >
                <Text style={[styles.modeBtnText, mode === m && styles.modeBtnTextActive]}>
                  {m === 'queue' ? '👥 Join Queue' : '📅 Book Appointment'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* ── JOIN QUEUE MODE ── */}
          {mode === 'queue' && (
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Join the Queue</Text>
              <Text style={styles.cardSub}>Enter your info and we'll hold your spot.</Text>

              <Text style={styles.fieldLabel}>Your Name</Text>
              <TextInput style={styles.input} value={name} onChangeText={setName}
                placeholder="First and last name" placeholderTextColor="#9ca3af" autoCapitalize="words" />

              <Text style={styles.fieldLabel}>Phone Number</Text>
              <TextInput style={styles.input} value={phone} onChangeText={setPhone}
                placeholder="(555) 000-0000" placeholderTextColor="#9ca3af" keyboardType="phone-pad" />

              <Text style={styles.fieldLabel}>Email (optional)</Text>
              <TextInput style={styles.input} value={email} onChangeText={setEmail}
                placeholder="you@example.com" placeholderTextColor="#9ca3af" keyboardType="email-address" autoCapitalize="none" />
              <Text style={styles.fieldHint}>We'll notify you when it's your turn.</Text>

              <Text style={styles.fieldLabel}>Choose a Service</Text>
              <View style={styles.chipWrap}>
                {services.map(s => (
                  <TouchableOpacity key={s.id}
                    style={[styles.chip, serviceId === s.id && styles.chipSelected]}
                    onPress={() => setServiceId(s.id)} activeOpacity={0.7}>
                    <Text style={[styles.chipName, serviceId === s.id && styles.chipNameSelected]}>{s.name}</Text>
                    <Text style={[styles.chipTime, serviceId === s.id && styles.chipTimeSelected]}>~{s.avgTime} min</Text>
                  </TouchableOpacity>
                ))}
              </View>

              {staffList.length > 0 && (
                <>
                  <Text style={styles.fieldLabel}>Choose Staff (optional)</Text>
                  <View style={styles.chipWrap}>
                    <TouchableOpacity
                      style={[styles.chip, staffId === 'any' && styles.chipSelected]}
                      onPress={() => setStaffId('any')} activeOpacity={0.7}>
                      <Text style={[styles.chipName, staffId === 'any' && styles.chipNameSelected]}>Any Available</Text>
                    </TouchableOpacity>
                    {staffList.map(s => (
                      <TouchableOpacity key={s.id}
                        style={[styles.chip, staffId === s.id && styles.chipSelected]}
                        onPress={() => setStaffId(s.id)} activeOpacity={0.7}>
                        <View style={[styles.staffInitial, { backgroundColor: staffId === s.id ? '#2563eb' : '#e5e7eb' }]}>
                          <Text style={[styles.staffInitialText, { color: staffId === s.id ? '#fff' : '#374151' }]}>
                            {s.name.charAt(0).toUpperCase()}
                          </Text>
                        </View>
                        <Text style={[styles.chipName, staffId === s.id && styles.chipNameSelected]}>{s.name}</Text>
                        <Text style={[styles.chipTime, staffId === s.id && styles.chipTimeSelected]}>{s.role}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </>
              )}

              {!!joinError && <Text style={styles.errorText}>{joinError}</Text>}

              <TouchableOpacity style={[styles.joinBtn, !canJoin && styles.joinBtnDisabled]}
                onPress={handleJoin} disabled={!canJoin || joining} activeOpacity={0.85}>
                {joining ? <ActivityIndicator color="#fff" /> : <Text style={styles.joinBtnText}>Join Queue</Text>}
              </TouchableOpacity>
            </View>
          )}

          {/* ── BOOK APPOINTMENT MODE ── */}
          {mode === 'book' && (
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Book an Appointment</Text>
              <Text style={styles.cardSub}>Pick a date and time that works for you.</Text>

              {/* Service */}
              <Text style={styles.fieldLabel}>Choose a Service</Text>
              <View style={styles.chipWrap}>
                {services.map(s => (
                  <TouchableOpacity key={s.id}
                    style={[styles.chip, bookServiceId === s.id && styles.chipSelected]}
                    onPress={() => { setBookServiceId(s.id); setBookDate(''); setBookTime(''); }}
                    activeOpacity={0.7}>
                    <Text style={[styles.chipName, bookServiceId === s.id && styles.chipNameSelected]}>{s.name}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Date picker — month calendar grid */}
              <Text style={[styles.fieldLabel, { marginTop: 8 }]}>Choose a Date</Text>
              <View style={styles.calGrid}>
                {/* Month nav */}
                <View style={styles.calNav}>
                  <TouchableOpacity
                    onPress={() => {
                      const prev = new Date(calMonth.getFullYear(), calMonth.getMonth() - 1, 1);
                      const todayFirst = new Date(); todayFirst.setDate(1); todayFirst.setHours(0,0,0,0);
                      if (prev >= todayFirst) setCalMonth(prev);
                    }}
                    style={styles.calNavBtn}>
                    <Text style={styles.calNavArrow}>‹</Text>
                  </TouchableOpacity>
                  <Text style={styles.calMonthLabel}>
                    {calMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                  </Text>
                  <TouchableOpacity
                    onPress={() => {
                      const next = new Date(calMonth.getFullYear(), calMonth.getMonth() + 1, 1);
                      const maxDate = new Date(); maxDate.setDate(maxDate.getDate() + 60);
                      if (next.getFullYear() < maxDate.getFullYear() ||
                          (next.getFullYear() === maxDate.getFullYear() && next.getMonth() <= maxDate.getMonth())) {
                        setCalMonth(next);
                      }
                    }}
                    style={styles.calNavBtn}>
                    <Text style={styles.calNavArrow}>›</Text>
                  </TouchableOpacity>
                </View>
                {/* Day of week headers */}
                <View style={styles.calRow}>
                  {['Su','Mo','Tu','We','Th','Fr','Sa'].map(d => (
                    <Text key={d} style={styles.calDowLabel}>{d}</Text>
                  ))}
                </View>
                {/* Day cells */}
                {(() => {
                  const today = new Date(); today.setHours(0,0,0,0);
                  const maxDate = new Date(today); maxDate.setDate(today.getDate() + 60);
                  const firstDow = new Date(calMonth.getFullYear(), calMonth.getMonth(), 1).getDay();
                  const daysInMonth = new Date(calMonth.getFullYear(), calMonth.getMonth() + 1, 0).getDate();
                  const cells: (number | null)[] = [];
                  for (let i = 0; i < firstDow; i++) cells.push(null);
                  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
                  while (cells.length % 7 !== 0) cells.push(null);
                  const rows: (number | null)[][] = [];
                  for (let i = 0; i < cells.length; i += 7) rows.push(cells.slice(i, i + 7));
                  return rows.map((row, ri) => (
                    <View key={ri} style={styles.calRow}>
                      {row.map((day, ci) => {
                        if (!day) return <View key={ci} style={styles.calCell} />;
                        const cellDate = new Date(calMonth.getFullYear(), calMonth.getMonth(), day);
                        cellDate.setHours(0,0,0,0);
                        const key = `${calMonth.getFullYear()}-${String(calMonth.getMonth()+1).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
                        const disabled = cellDate <= today || cellDate > maxDate;
                        const isSelected = bookDate === key;
                        return (
                          <TouchableOpacity
                            key={ci}
                            style={[styles.calCell, isSelected && styles.calCellSelected, disabled && styles.calCellDisabled]}
                            onPress={() => { if (!disabled) { setBookDate(key); setBookTime(''); } }}
                            activeOpacity={disabled ? 1 : 0.7}
                            disabled={disabled}>
                            <Text style={[styles.calDayNum, isSelected && { color: '#fff' }, disabled && { color: '#d1d5db' }]}>
                              {day}
                            </Text>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  ));
                })()}
              </View>

              {/* Time slots */}
              {!!bookDate && (
                <>
                  <Text style={[styles.fieldLabel, { marginTop: 10 }]}>
                    Available Times — {new Date(bookDate + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                  </Text>
                  <View style={styles.timeGrid}>
                    {TIME_SLOTS.map(t => {
                      const available = isSlotAvailable(bookDate, t);
                      const isSelected = bookTime === t;
                      return (
                        <TouchableOpacity key={t}
                          style={[styles.timeCell,
                            isSelected && styles.timeCellSelected,
                            !available && styles.timeCellUnavailable]}
                          onPress={() => available && setBookTime(t)}
                          activeOpacity={available ? 0.7 : 1}
                          disabled={!available}>
                          <Text style={[styles.timeCellText,
                            isSelected && { color: '#fff' },
                            !available && { color: '#c4c4c4' }]}>
                            {formatTime(t)}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </>
              )}

              {/* Staff selection */}
              {!!bookTime && staffList.length > 0 && (
                <>
                  <Text style={[styles.fieldLabel, { marginTop: 12 }]}>Choose Staff (optional)</Text>
                  <View style={styles.chipWrap}>
                    <TouchableOpacity
                      style={[styles.chip, bookStaffId === 'any' && styles.chipSelected]}
                      onPress={() => setBookStaffId('any')} activeOpacity={0.7}>
                      <Text style={[styles.chipName, bookStaffId === 'any' && styles.chipNameSelected]}>Any Available</Text>
                    </TouchableOpacity>
                    {staffList.map(s => (
                      <TouchableOpacity key={s.id}
                        style={[styles.chip, bookStaffId === s.id && styles.chipSelected]}
                        onPress={() => setBookStaffId(s.id)} activeOpacity={0.7}>
                        <View style={[styles.staffInitial, { backgroundColor: bookStaffId === s.id ? '#2563eb' : '#e5e7eb' }]}>
                          <Text style={[styles.staffInitialText, { color: bookStaffId === s.id ? '#fff' : '#374151' }]}>
                            {s.name.charAt(0).toUpperCase()}
                          </Text>
                        </View>
                        <Text style={[styles.chipName, bookStaffId === s.id && styles.chipNameSelected]}>{s.name}</Text>
                        <Text style={[styles.chipTime, bookStaffId === s.id && styles.chipTimeSelected]}>{s.role}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </>
              )}

              {/* Customer info — shown after date+time selected */}
              {!!bookTime && (
                <>
                  <Text style={[styles.fieldLabel, { marginTop: 12 }]}>Your Name</Text>
                  <TextInput style={styles.input} value={bookName} onChangeText={setBookName}
                    placeholder="First and last name" placeholderTextColor="#9ca3af" autoCapitalize="words" />

                  <Text style={styles.fieldLabel}>Phone Number</Text>
                  <TextInput style={styles.input} value={bookPhone} onChangeText={setBookPhone}
                    placeholder="(555) 000-0000" placeholderTextColor="#9ca3af" keyboardType="phone-pad" />
                  <Text style={styles.fieldHint}>We'll send you a reminder on the day of your appointment.</Text>

                  {!!bookError && <Text style={styles.errorText}>{bookError}</Text>}

                  <TouchableOpacity
                    style={[styles.joinBtn, !canBook && styles.joinBtnDisabled, { backgroundColor: '#059669' }]}
                    onPress={handleBook} disabled={!canBook || booking} activeOpacity={0.85}>
                    {booking ? <ActivityIndicator color="#fff" /> : <Text style={styles.joinBtnText}>Confirm Appointment</Text>}
                  </TouchableOpacity>
                </>
              )}
            </View>
          )}

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

  header: { alignItems: 'center', paddingVertical: Spacing.md, gap: 4 },
  businessName: { fontSize: 28, fontWeight: '800', color: '#111827', textAlign: 'center', letterSpacing: -0.5 },
  businessType: { fontSize: 15, color: '#6b7280' },

  modeToggle: { flexDirection: 'row', backgroundColor: '#e5e7eb', borderRadius: BorderRadius.lg, padding: 3, gap: 3 },
  modeBtn: { flex: 1, paddingVertical: 10, borderRadius: BorderRadius.md, alignItems: 'center' },
  modeBtnActive: { backgroundColor: '#fff', shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 4, elevation: 2 },
  modeBtnText: { fontSize: 13, fontWeight: '600', color: '#6b7280' },
  modeBtnTextActive: { color: '#111827' },

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
  chip: { borderWidth: 1.5, borderColor: '#e5e7eb', borderRadius: BorderRadius.md, paddingVertical: 10, paddingHorizontal: 14, backgroundColor: '#f9fafb', alignItems: 'center', minWidth: 100 },
  chipSelected: { borderColor: '#2563eb', backgroundColor: '#eff6ff' },
  chipName: { fontSize: 14, fontWeight: '600', color: '#374151' },
  chipNameSelected: { color: '#2563eb' },
  chipTime: { fontSize: 12, color: '#9ca3af', marginTop: 2 },
  chipTimeSelected: { color: '#3b82f6' },

  staffInitial: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
  staffInitialText: { fontSize: 13, fontWeight: '700' },

  calGrid: { borderWidth: 1, borderColor: '#e5e7eb', borderRadius: BorderRadius.lg, overflow: 'hidden', marginTop: 4 },
  calNav: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 8, paddingVertical: 6, backgroundColor: '#f9fafb', borderBottomWidth: 1, borderBottomColor: '#e5e7eb' },
  calNavBtn: { paddingHorizontal: 10, paddingVertical: 4, alignItems: 'center' },
  calNavArrow: { fontSize: 20, color: '#2563eb', fontWeight: '700' },
  calMonthLabel: { fontSize: 13, fontWeight: '700', color: '#111827' },
  calRow: { flexDirection: 'row' },
  calDowLabel: { flex: 1, textAlign: 'center', fontSize: 10, fontWeight: '700', color: '#9ca3af', paddingVertical: 4, backgroundColor: '#f9fafb' },
  calCell: { flex: 1, height: 34, alignItems: 'center', justifyContent: 'center', borderWidth: 0.5, borderColor: '#f3f4f6' },
  calCellSelected: { backgroundColor: '#2563eb', borderRadius: 4 },
  calCellDisabled: { backgroundColor: '#fafafa' },
  calDayNum: { fontSize: 13, fontWeight: '600', color: '#111827' },

  timeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  timeCell: { width: '23%', paddingVertical: 9, alignItems: 'center', borderRadius: BorderRadius.md, backgroundColor: '#f0f4f8', borderWidth: 1.5, borderColor: '#e5e7eb' },
  timeCellSelected: { backgroundColor: '#2563eb', borderColor: '#2563eb' },
  timeCellUnavailable: { backgroundColor: '#f9fafb', borderColor: '#f3f4f6', opacity: 0.5 },
  timeCellText: { fontSize: 12, fontWeight: '600', color: '#374151' },

  joinBtn: { backgroundColor: '#2563eb', borderRadius: BorderRadius.lg, paddingVertical: 16, alignItems: 'center', marginTop: 8 },
  joinBtnDisabled: { opacity: 0.4 },
  joinBtnText: { color: '#fff', fontSize: 17, fontWeight: '700' },

  confirmedCircle: { width: 90, height: 90, borderRadius: 45, backgroundColor: '#dcfce7', alignItems: 'center', justifyContent: 'center' },
  confirmedTitle: { fontSize: 26, fontWeight: '800', color: '#111827', textAlign: 'center' },
  confirmedSub: { fontSize: 15, color: '#6b7280', textAlign: 'center' },
  confirmedCard: { backgroundColor: '#fff', borderRadius: BorderRadius.xl, borderWidth: 1, borderColor: '#e5e7eb', padding: Spacing.lg, width: '100%', gap: 8 },
  confirmedRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4, borderBottomWidth: 1, borderBottomColor: '#f3f4f6' },
  confirmedLabel: { fontSize: 13, color: '#6b7280', fontWeight: '500' },
  confirmedValue: { fontSize: 13, color: '#111827', fontWeight: '600', flexShrink: 1, textAlign: 'right' },

  errorText: { color: '#ef4444', fontSize: 13, textAlign: 'center' },
  errorIcon: { fontSize: 48 },
  errorTitle: { fontSize: 20, fontWeight: '700', color: '#111827' },
  errorSub: { fontSize: 14, color: '#6b7280', textAlign: 'center' },

  footer: { textAlign: 'center', fontSize: 12, color: '#9ca3af', marginTop: 8 },
});
