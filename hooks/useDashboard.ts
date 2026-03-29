// useDashboard — state and actions for the staff/admin dashboard

import { useState, useEffect, useCallback } from 'react';
import {
  getDashboardTickets,
  callNextCustomer,
  markTicketServed,
  joinQueue as apiJoinQueue,
  DashboardTicket,
  MOCK_SERVICES,
} from '../services/queueService';
import { queueStore } from '../store/queueStore';

const USE_MOCK = true;

export interface ServedEntry {
  id: string;
  customerName: string;
  phoneNumber: string;
  serviceName: string;
  servedAt: string;
  waitedMinutes: number;
}

const day = (daysAgo: number, hour: number, min = 0) => {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  d.setHours(hour, min, 0, 0);
  return d.toISOString();
};

const MOCK_SERVED_HISTORY: ServedEntry[] = [
  { id: 'h1',  customerName: 'Tyrone Banks',   phoneNumber: '(555) 111-2222', serviceName: 'Haircut',         servedAt: day(0, 10, 15), waitedMinutes: 20 },
  { id: 'h2',  customerName: 'Carlos Mendez',  phoneNumber: '(555) 222-3333', serviceName: 'Beard Trim',      servedAt: day(0, 11, 0),  waitedMinutes: 12 },
  { id: 'h3',  customerName: 'David Lee',       phoneNumber: '(555) 333-4444', serviceName: 'Haircut + Beard', servedAt: day(0, 12, 30), waitedMinutes: 35 },
  { id: 'h4',  customerName: 'Marcus Johnson', phoneNumber: '(555) 234-5678', serviceName: 'Haircut',         servedAt: day(1, 9, 45),  waitedMinutes: 18 },
  { id: 'h5',  customerName: 'Kevin Patel',    phoneNumber: '(555) 444-5555', serviceName: 'Kids Cut',        servedAt: day(1, 11, 20), waitedMinutes: 15 },
  { id: 'h6',  customerName: 'Jerome Watson',  phoneNumber: '(555) 555-6666', serviceName: 'Haircut',         servedAt: day(1, 14, 0),  waitedMinutes: 30 },
  { id: 'h7',  customerName: 'Samuel Ortiz',   phoneNumber: '(555) 666-7777', serviceName: 'Beard Trim',      servedAt: day(2, 10, 0),  waitedMinutes: 10 },
  { id: 'h8',  customerName: 'Brian Thompson', phoneNumber: '(555) 777-8888', serviceName: 'Haircut + Beard', servedAt: day(2, 13, 15), waitedMinutes: 40 },
  { id: 'h9',  customerName: 'Andre Mitchell', phoneNumber: '(555) 888-9999', serviceName: 'Haircut',         servedAt: day(3, 9, 0),   waitedMinutes: 25 },
  { id: 'h10', customerName: 'Ray Coleman',    phoneNumber: '(555) 999-0000', serviceName: 'Kids Cut',        servedAt: day(4, 15, 30), waitedMinutes: 20 },
  { id: 'h11', customerName: 'Tony Nguyen',    phoneNumber: '(555) 100-2000', serviceName: 'Haircut',         servedAt: day(5, 11, 0),  waitedMinutes: 22 },
  { id: 'h12', customerName: 'Chris Evans',    phoneNumber: '(555) 200-3000', serviceName: 'Beard Trim',      servedAt: day(6, 10, 45), waitedMinutes: 14 },
];

export type ServedFilter = 'today' | 'week';

export interface UseDashboardReturn {
  tickets: DashboardTicket[];
  servedHistory: ServedEntry[];
  servedFilter: ServedFilter;
  setServedFilter: (f: ServedFilter) => void;
  isLoading: boolean;
  error: string | null;
  lastRefreshed: Date | null;
  refresh: () => void;
  markDone: (ticketId: string) => Promise<void>;
  callNext: (serviceId: string) => Promise<void>;
  removeTicket: (ticketId: string) => Promise<void>;
  editWaitTime: (ticketId: string, newMinutes: number) => void;
  addWalkIn: (name: string, phone: string, serviceId: string) => Promise<void>;
}

export function useDashboard(): UseDashboardReturn {
  const [tickets, setTickets] = useState<DashboardTicket[]>(() =>
    USE_MOCK ? (queueStore.getTickets() as DashboardTicket[]) : []
  );
  const [servedHistory, setServedHistory] = useState<ServedEntry[]>(MOCK_SERVED_HISTORY);
  const [servedFilter, setServedFilter] = useState<ServedFilter>('today');
  const [isLoading, setIsLoading] = useState(!USE_MOCK);
  const [error, setError] = useState<string | null>(null);
  const [lastRefreshed, setLastRefreshed] = useState<Date | null>(USE_MOCK ? new Date() : null);

  // In mock mode: subscribe to the shared store so the dashboard updates
  // immediately when a customer joins from the portal or staff adds a walk-in
  useEffect(() => {
    if (!USE_MOCK) return;

    const unsubscribe = queueStore.subscribe(() => {
      setTickets(queueStore.getTickets() as DashboardTicket[]);
      setLastRefreshed(new Date());
    });

    return unsubscribe;
  }, []);

  const refresh = useCallback(async () => {
    if (USE_MOCK) {
      setTickets(queueStore.getTickets() as DashboardTicket[]);
      setLastRefreshed(new Date());
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const data = await getDashboardTickets();
      setTickets(data);
      setLastRefreshed(new Date());
    } catch (err: any) {
      setError(err?.message || 'Failed to load queue');
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Poll real backend every 8 seconds (only in live mode)
  useEffect(() => {
    if (USE_MOCK) return;
    refresh();
    const interval = setInterval(refresh, 8000);
    return () => clearInterval(interval);
  }, [refresh]);

  const markDone = useCallback(async (ticketId: string) => {
    try {
      if (USE_MOCK) {
        const done = queueStore.markDone(ticketId);
        if (done) {
          const entry: ServedEntry = {
            id: `served_${Date.now()}`,
            customerName: done.customerName,
            phoneNumber: done.phoneNumber,
            serviceName: done.serviceName,
            servedAt: new Date().toISOString(),
            waitedMinutes: Math.floor((Date.now() - new Date(done.joinedAt).getTime()) / 60000),
          };
          setServedHistory(h => [entry, ...h]);
        }
      } else {
        await markTicketServed(ticketId);
        await refresh();
      }
    } catch (err: any) {
      setError(err?.message || 'Failed to mark as done');
    }
  }, [refresh]);

  const callNext = useCallback(async (serviceId: string) => {
    try {
      if (USE_MOCK) {
        queueStore.updateStatus(
          queueStore.getTickets().find(
            t => t.serviceId === serviceId && t.status === 'Waiting' && t.position === 1
          )?.id || '',
          'Called'
        );
      } else {
        await callNextCustomer(serviceId);
        await refresh();
      }
    } catch (err: any) {
      setError(err?.message || 'Failed to call next customer');
    }
  }, [refresh]);

  const removeTicket = useCallback(async (ticketId: string) => {
    if (USE_MOCK) {
      queueStore.removeTicket(ticketId);
    }
  }, []);

  const editWaitTime = useCallback((ticketId: string, newMinutes: number) => {
    if (USE_MOCK) {
      queueStore.updateWaitTime(ticketId, newMinutes);
    } else {
      setTickets(prev =>
        prev.map(t => (t.id === ticketId ? { ...t, estimatedWait: newMinutes } : t))
      );
    }
  }, []);

  const addWalkIn = useCallback(async (name: string, phone: string, serviceId: string) => {
    if (!USE_MOCK) {
      await apiJoinQueue(serviceId, phone);
      await refresh();
      return;
    }
    const service = MOCK_SERVICES.find(s => s.id === serviceId) || MOCK_SERVICES[0];
    const existing = queueStore.getTickets();
    const nextPosition = existing.length + 1;
    const baseWait = existing.length > 0
      ? existing[existing.length - 1].estimatedWait + service.avgTime
      : service.avgTime;

    queueStore.addTicket({
      id: `ticket_walkin_${Date.now()}`,
      position: nextPosition,
      customerName: name,
      phoneNumber: phone,
      serviceName: service.name,
      serviceId: service.id,
      serviceAvgTime: service.avgTime,
      status: 'Waiting',
      joinedAt: new Date().toISOString(),
      estimatedWait: baseWait,
    });
  }, [refresh]);

  // filter served history based on selected period
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const startOfWeek = startOfToday - 6 * 24 * 60 * 60 * 1000;

  const filteredServedHistory = servedHistory.filter(e => {
    const t = new Date(e.servedAt).getTime();
    return servedFilter === 'today' ? t >= startOfToday : t >= startOfWeek;
  });

  return {
    tickets,
    servedHistory: filteredServedHistory,
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
  };
}

export function timeAgo(isoString: string): string {
  const diff = Math.floor((Date.now() - new Date(isoString).getTime()) / 60000);
  if (diff < 1) return 'just now';
  if (diff === 1) return '1 min ago';
  return `${diff} min ago`;
}

export function formatTime(isoString: string): string {
  return new Date(isoString).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}
