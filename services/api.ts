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
  plan: 'basic' | 'pro';
  allowStaffSelection: boolean;
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
  status: 'Waiting' | 'Called' | 'Done' | 'Unserved';
  serviceId: string;
  staffId?: string;
  staffName?: string;
  customerToken: string;
  phoneNumber: string;
  customerName: string;
  createdAt: string;
  updatedAt: string;
  serviceName: string;
  avgTime: number;
}

export interface ApiStaff {
  id: string;
  businessId: string;
  name: string;
  role: string;
  phone: string;
  photoUrl: string;
  color?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ApiReview {
  id: string;
  businessId: string;
  ticketId: string;
  customerName: string;
  rating: number;
  comment?: string;
  createdAt: string;
}

export interface ApiReviewStats {
  total: number;
  average: number;
  five: number;
  four: number;
  three: number;
  two: number;
  one: number;
}

export interface ApiAppointment {
  id: string;
  businessId: string;
  serviceId: string;
  staffId: string;
  customerName: string;
  phoneNumber: string;
  date: string;
  time: string;
  createdAt: string;
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
  updateMyBusiness: (name: string, type: string, notificationChannel?: string, allowStaffSelection?: boolean) =>
    apiFetch('/api/businesses/me', { method: 'PUT', body: JSON.stringify({ name, type, notificationChannel, allowStaffSelection }) }),

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
  addWalkin: (customerName: string, phoneNumber: string, serviceId: string, staffId?: string) =>
    apiFetch('/api/businesses/me/queue/walkin', {
      method: 'POST',
      body: JSON.stringify({ customerName, phoneNumber, serviceId, staffId }),
    }),
  markDone: (ticketId: string) =>
    apiFetch(`/api/tickets/${ticketId}/done`, { method: 'PUT' }),
  callTicket: (ticketId: string) =>
    apiFetch(`/api/tickets/${ticketId}/call`, { method: 'PUT' }),
  removeTicket: (ticketId: string) =>
    apiFetch(`/api/tickets/${ticketId}`, { method: 'DELETE' }),

  // Staff (auth required)
  getStaff: (): Promise<{ staff: ApiStaff[] }> =>
    apiFetch('/api/businesses/me/staff'),
  addStaff: (name: string, role: string, phone: string, photoUrl: string): Promise<{ staff: ApiStaff }> =>
    apiFetch('/api/businesses/me/staff', { method: 'POST', body: JSON.stringify({ name, role, phone, photoUrl }) }),
  updateStaff: (staffId: string, name: string, role: string, phone: string, photoUrl: string): Promise<{ staff: ApiStaff }> =>
    apiFetch(`/api/staff/${staffId}`, { method: 'PUT', body: JSON.stringify({ name, role, phone, photoUrl }) }),
  deleteStaff: (staffId: string) =>
    apiFetch(`/api/staff/${staffId}`, { method: 'DELETE' }),

  // Staff (public — customer portal)
  getPublicStaff: (businessId: string): Promise<{ staff: ApiStaff[] }> =>
    apiFetch(`/api/businesses/${businessId}/staff`),

  // Appointments (public — customer-facing)
  createAppointment: (businessId: string, serviceId: string, staffId: string, customerName: string, phoneNumber: string, date: string, time: string, customerEmail?: string): Promise<{ appointment: ApiAppointment }> =>
    apiFetch(`/api/businesses/${businessId}/appointments`, {
      method: 'POST',
      body: JSON.stringify({ serviceId, staffId, customerName, phoneNumber, date, time, customerEmail }),
    }),
  getPublicAppointments: (businessId: string, date: string, staffId?: string): Promise<{ bookedSlots: { time: string; count: number }[] }> =>
    apiFetch(`/api/businesses/${businessId}/appointments/public?date=${encodeURIComponent(date)}${staffId ? `&staffId=${encodeURIComponent(staffId)}` : ''}`),

  // Appointments (auth — staff dashboard)
  getMyAppointments: (): Promise<{ appointments: ApiAppointment[] }> =>
    apiFetch('/api/businesses/me/appointments'),

  // Subscription
  getSubscription: (): Promise<{ plan: 'basic' | 'pro' }> =>
    apiFetch('/api/businesses/me/subscription'),
  updateSubscription: (plan: 'basic' | 'pro'): Promise<{ plan: 'basic' | 'pro' }> =>
    apiFetch('/api/businesses/me/subscription', { method: 'PUT', body: JSON.stringify({ plan }) }),

  // Stripe
  createCheckoutSession: (businessName: string, businessId: string, email?: string): Promise<{ url: string }> =>
    apiFetch('/api/payments/create-checkout', {
      method: 'POST',
      body: JSON.stringify({ businessName, businessId, email }),
    }),

  // Google Calendar
  getGoogleAuthUrl: (): Promise<{ url: string }> =>
    apiFetch('/api/google/auth'),
  saveGoogleTokens: (tokens: object): Promise<{ success: boolean }> =>
    apiFetch('/api/google/save-tokens', { method: 'POST', body: JSON.stringify({ tokens }) }),
  getGoogleStatus: (): Promise<{ connected: boolean }> =>
    apiFetch('/api/google/status'),

  // Admin
  getAdminBusinesses: (): Promise<{ businesses: { id: string; name: string; type: string; plan: string; createdAt: string; services: { id: string; name: string; avgTime: number }[]; tickets: ApiTicket[] }[] }> =>
    apiFetch('/api/admin/businesses'),

  // Reviews (public — customer-facing)
  submitReview: (businessId: string, ticketId: string, customerName: string, rating: number, comment?: string): Promise<{ review: ApiReview }> =>
    apiFetch(`/api/businesses/${businessId}/reviews`, {
      method: 'POST',
      body: JSON.stringify({ ticketId, customerName, rating, comment }),
    }),
  getPublicReviews: (businessId: string): Promise<{ reviews: ApiReview[]; stats: ApiReviewStats }> =>
    apiFetch(`/api/businesses/${businessId}/reviews`),

  // Reviews (auth — business owner)
  getMyReviews: (): Promise<{ reviews: ApiReview[]; stats: ApiReviewStats }> =>
    apiFetch('/api/businesses/me/reviews'),

  // Public (customer-facing, no auth)
  getPublicBusiness: (businessId: string): Promise<{ business: { id: string; name: string; type: string; services: { id: string; name: string; avgTime: number }[] } }> =>
    apiFetch(`/api/businesses/${businessId}/public`),
  joinQueue: (businessId: string, customerName: string, phoneNumber: string, serviceId: string, customerEmail?: string, staffId?: string): Promise<{ ticket: ApiTicket; token: string }> =>
    apiFetch(`/api/businesses/${businessId}/queue/join`, {
      method: 'POST',
      body: JSON.stringify({ customerName, phoneNumber, serviceId, customerEmail, staffId }),
    }),
  getTicketByToken: (token: string): Promise<{ ticket: ApiTicket }> =>
    apiFetch(`/api/entries/${token}`),
};
