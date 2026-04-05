// API service — all backend calls go through here
// Uses relative URLs so it works on both localhost and the VPS via Caddy

async function apiFetch(path: string, options: RequestInit = {}) {
  const res = await fetch(path, {
    ...options,
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', ...options.headers },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    const error = new Error(err.error ?? 'Request failed') as Error & { status: number };
    error.status = res.status;
    throw error;
  }
  return res.json();
}

export interface ApiBusiness {
  id: string;
  userId: string;
  name: string;
  type: string;
  createdAt: string;
  updatedAt: string;
}

export interface ApiService {
  id: string;
  businessId: string;
  name: string;
  avgTime: number;
  createdAt: string;
  updatedAt: string;
}

export interface ApiTicket {
  id: string;
  position: number;
  status: 'Waiting' | 'Called' | 'Done';
  serviceId: string;
  customerToken: string;
  phoneNumber: string;
  customerName: string;
  createdAt: string;
  updatedAt: string;
  serviceName: string;
  avgTime: number;
}

export const api = {
  // Auth
  signUp: (email: string, password: string, name: string) =>
    apiFetch('/api/auth/sign-up/email', { method: 'POST', body: JSON.stringify({ email, password, name }) }),
  signIn: (email: string, password: string) =>
    apiFetch('/api/auth/sign-in/email', { method: 'POST', body: JSON.stringify({ email, password }) }),

  // Business profile
  createBusiness: (name: string, type: string): Promise<{ business: ApiBusiness }> =>
    apiFetch('/api/businesses', { method: 'POST', body: JSON.stringify({ name, type }) }),
  getMyBusiness: (): Promise<{ business: ApiBusiness }> =>
    apiFetch('/api/businesses/me'),
  updateMyBusiness: (name: string, type: string) =>
    apiFetch('/api/businesses/me', { method: 'PUT', body: JSON.stringify({ name, type }) }),

  // Services
  getServices: (): Promise<{ services: ApiService[] }> =>
    apiFetch('/api/businesses/me/services'),
  addService: (name: string, avgTime: number): Promise<{ service: ApiService }> =>
    apiFetch('/api/businesses/me/services', { method: 'POST', body: JSON.stringify({ name, avgTime }) }),
  updateService: (serviceId: string, name: string, avgTime: number) =>
    apiFetch(`/api/services/${serviceId}`, { method: 'PUT', body: JSON.stringify({ name, avgTime }) }),
  deleteService: (serviceId: string) =>
    apiFetch(`/api/services/${serviceId}`, { method: 'DELETE' }),

  // Queue (staff)
  getQueue: (): Promise<{ tickets: ApiTicket[] }> =>
    apiFetch('/api/businesses/me/queue'),
  addWalkin: (customerName: string, phoneNumber: string, serviceId: string) =>
    apiFetch('/api/businesses/me/queue/walkin', {
      method: 'POST',
      body: JSON.stringify({ customerName, phoneNumber, serviceId }),
    }),
  markDone: (ticketId: string) =>
    apiFetch(`/api/tickets/${ticketId}/done`, { method: 'PUT' }),
  callTicket: (ticketId: string) =>
    apiFetch(`/api/tickets/${ticketId}/call`, { method: 'PUT' }),
  removeTicket: (ticketId: string) =>
    apiFetch(`/api/tickets/${ticketId}`, { method: 'DELETE' }),

  // Public (customer-facing, no auth)
  getPublicBusiness: (businessId: string): Promise<{ business: { id: string; name: string; type: string; services: { id: string; name: string; avgTime: number }[] } }> =>
    apiFetch(`/api/businesses/${businessId}/public`),
  joinQueue: (businessId: string, customerName: string, phoneNumber: string, serviceId: string): Promise<{ ticket: ApiTicket; token: string }> =>
    apiFetch(`/api/businesses/${businessId}/queue/join`, {
      method: 'POST',
      body: JSON.stringify({ customerName, phoneNumber, serviceId }),
    }),
  getTicketByToken: (token: string): Promise<{ ticket: ApiTicket }> =>
    apiFetch(`/api/entries/${token}`),
};
