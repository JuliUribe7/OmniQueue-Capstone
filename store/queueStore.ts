// Shared in-memory queue store — now scoped per business (multi-tenant)
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
  serviceAvgTime: number;
  status: 'Waiting' | 'Called' | 'Served' | 'Canceled';
  joinedAt: string;
  estimatedWait: number; // minutes
}

type Listener = () => void;

// Creates an isolated queue store for a specific business
function createQueueStore(businessId: string) {
  const STORAGE_KEY = `omniqueue_tickets_${businessId}`;
  const listeners = new Set<Listener>();

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

  // All businesses start with an empty queue
  let tickets: ActiveTicket[] = readFromStorage() ?? [];

  function getLatest(): ActiveTicket[] {
    return readFromStorage() ?? tickets;
  }

  function notify() {
    saveToStorage(tickets);
    listeners.forEach(l => l());
  }

  // Cross-tab sync — updates instantly when another tab changes the queue
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

  return {
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
      tickets = [...getLatest(), ticket];
      notify();
    },

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
      tickets = [];
      notify();
    },
  };
}

// Cache store instances so each businessId always gets the same instance
const storeInstances: Record<string, ReturnType<typeof createQueueStore>> = {};

export function getQueueStore(businessId: string) {
  if (!storeInstances[businessId]) {
    storeInstances[businessId] = createQueueStore(businessId);
  }
  return storeInstances[businessId];
}

// Backwards-compatible default export — points to the demo business
// Existing code using queueStore directly will still work
export const queueStore = {
  subscribe: (l: Listener) => getQueueStore('classic-cuts').subscribe(l),
  getTickets: () => getQueueStore('classic-cuts').getTickets(),
  getTicketById: (id: string) => getQueueStore('classic-cuts').getTicketById(id),
  addTicket: (t: ActiveTicket) => getQueueStore('classic-cuts').addTicket(t),
  markDone: (id: string) => getQueueStore('classic-cuts').markDone(id),
  updateStatus: (id: string, s: ActiveTicket['status']) => getQueueStore('classic-cuts').updateStatus(id, s),
  updateWaitTime: (id: string, m: number) => getQueueStore('classic-cuts').updateWaitTime(id, m),
  removeTicket: (id: string) => getQueueStore('classic-cuts').removeTicket(id),
  reset: () => getQueueStore('classic-cuts').reset(),
};
