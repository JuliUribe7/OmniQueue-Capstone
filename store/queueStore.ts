// Shared in-memory queue store
// Used in mock mode so the customer portal and dashboard share the same state.
// When USE_MOCK is flipped to false in both hooks, this store is bypassed
// entirely and both hooks talk directly to the real backend API.

export interface ActiveTicket {
  id: string;
  position: number;
  customerName: string;
  phoneNumber: string;
  serviceName: string;
  serviceId: string;
  serviceAvgTime: number; // used to recalculate wait times when someone is served
  status: 'Waiting' | 'Called' | 'Served' | 'Canceled';
  joinedAt: string;
  estimatedWait: number; // minutes
}

type Listener = () => void;

const STORAGE_KEY = 'omniqueue_mock_tickets';

const DEFAULT_TICKETS: ActiveTicket[] = [
  { id: 'ticket_001', position: 1, customerName: 'Marcus Johnson', phoneNumber: '(555) 234-5678', serviceName: 'Haircut',         serviceId: '1', serviceAvgTime: 25, status: 'Waiting', joinedAt: new Date(Date.now() - 32 * 60000).toISOString(), estimatedWait: 25 },
  { id: 'ticket_002', position: 2, customerName: 'Derek Williams', phoneNumber: '(555) 345-6789', serviceName: 'Beard Trim',      serviceId: '2', serviceAvgTime: 15, status: 'Waiting', joinedAt: new Date(Date.now() - 20 * 60000).toISOString(), estimatedWait: 40 },
  { id: 'ticket_003', position: 3, customerName: 'Andre Thompson', phoneNumber: '(555) 456-7890', serviceName: 'Haircut + Beard', serviceId: '3', serviceAvgTime: 35, status: 'Waiting', joinedAt: new Date(Date.now() - 10 * 60000).toISOString(), estimatedWait: 75 },
  { id: 'ticket_004', position: 4, customerName: 'James Rivera',   phoneNumber: '(555) 567-8901', serviceName: 'Kids Cut',        serviceId: '4', serviceAvgTime: 20, status: 'Waiting', joinedAt: new Date(Date.now() - 5  * 60000).toISOString(), estimatedWait: 95 },
];

function readFromStorage(): ActiveTicket[] | null {
  try {
    if (typeof localStorage !== 'undefined') {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) return JSON.parse(saved);
    }
  } catch {}
  return null;
}

function saveToStorage(t: ActiveTicket[]) {
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(t));
    }
  } catch {}
}

// Always read latest from localStorage before mutating so we don't overwrite
// changes made in another browser tab (e.g. walk-in added in dashboard tab
// while customer portal tab was already open)
function getLatest(): ActiveTicket[] {
  return readFromStorage() ?? tickets;
}

// module-level singleton
let tickets: ActiveTicket[] = readFromStorage() ?? DEFAULT_TICKETS;

const listeners = new Set<Listener>();

function notify() {
  saveToStorage(tickets);
  listeners.forEach(l => l());
}

// Listen for localStorage changes from OTHER browser tabs.
// When the dashboard marks someone done, this fires in the customer portal tab
// so the countdown and position update instantly without any polling.
if (typeof window !== 'undefined') {
  window.addEventListener('storage', (e: StorageEvent) => {
    if (e.key === STORAGE_KEY && e.newValue) {
      try {
        tickets = JSON.parse(e.newValue);
        listeners.forEach(l => l());
      } catch {}
    }
  });
}

export const queueStore = {
  subscribe(listener: Listener): () => void {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },

  getTickets(): ActiveTicket[] {
    return tickets;
  },

  getTicketById(id: string): ActiveTicket | null {
    return tickets.find(t => t.id === id) || null;
  },

  addTicket(ticket: ActiveTicket): void {
    // read latest first so we don't lose tickets added in another tab
    tickets = [...getLatest(), ticket];
    notify();
  },

  // removes the ticket, renumbers everyone, reduces their wait times
  markDone(ticketId: string): ActiveTicket | null {
    tickets = getLatest();
    const done = tickets.find(t => t.id === ticketId) || null;
    if (!done) return null;

    tickets = tickets
      .filter(t => t.id !== ticketId)
      .map((t, i) => ({
        ...t,
        position: i + 1,
        estimatedWait: Math.max(0, t.estimatedWait - done.serviceAvgTime),
      }));

    notify();
    return done;
  },

  updateStatus(ticketId: string, status: ActiveTicket['status']): void {
    tickets = getLatest().map(t => t.id === ticketId ? { ...t, status } : t);
    notify();
  },

  updateWaitTime(ticketId: string, minutes: number): void {
    tickets = getLatest().map(t => t.id === ticketId ? { ...t, estimatedWait: minutes } : t);
    notify();
  },

  removeTicket(ticketId: string): void {
    tickets = getLatest()
      .filter(t => t.id !== ticketId)
      .map((t, i) => ({ ...t, position: i + 1 }));
    notify();
  },

  reset(): void {
    tickets = DEFAULT_TICKETS.map(t => ({ ...t }));
    notify();
  },
};
