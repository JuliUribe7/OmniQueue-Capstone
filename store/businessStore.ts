// Business store — manages business accounts, services, and authentication
// All mock data for now. When USE_MOCK is false, replace with real API calls.

const BUSINESS_STORAGE_KEY = 'omniqueue_businesses';
const AUTH_STORAGE_KEY = 'omniqueue_auth';

export type BusinessType = 'barbershop' | 'doctors_office' | 'salon' | 'dental' | 'other';

export interface Service {
  id: string;
  name: string;
  avgTime: number; // minutes
}

export interface Business {
  id: string;
  name: string;
  email: string;
  password: string; // plain text in mock — real backend will hash this
  type: BusinessType;
  services: Service[];
  createdAt: string;
}

export type AuthSession =
  | { type: 'business'; id: string }
  | { type: 'admin' };

// Default services loaded when a business signs up based on their type
export const DEFAULT_SERVICES: Record<BusinessType, Service[]> = {
  barbershop: [
    { id: 's1', name: 'Haircut',         avgTime: 25 },
    { id: 's2', name: 'Beard Trim',      avgTime: 15 },
    { id: 's3', name: 'Haircut + Beard', avgTime: 35 },
    { id: 's4', name: 'Kids Cut',        avgTime: 20 },
  ],
  doctors_office: [
    { id: 's1', name: 'General Checkup', avgTime: 30 },
    { id: 's2', name: 'Follow-up',       avgTime: 15 },
    { id: 's3', name: 'Consultation',    avgTime: 45 },
    { id: 's4', name: 'Vaccination',     avgTime: 10 },
  ],
  salon: [
    { id: 's1', name: 'Haircut',   avgTime: 45 },
    { id: 's2', name: 'Color',     avgTime: 90 },
    { id: 's3', name: 'Blowout',   avgTime: 30 },
    { id: 's4', name: 'Treatment', avgTime: 60 },
  ],
  dental: [
    { id: 's1', name: 'Cleaning',      avgTime: 45 },
    { id: 's2', name: 'Checkup',       avgTime: 30 },
    { id: 's3', name: 'X-Ray',         avgTime: 20 },
    { id: 's4', name: 'Consultation',  avgTime: 30 },
  ],
  other: [
    { id: 's1', name: 'Service 1', avgTime: 30 },
    { id: 's2', name: 'Service 2', avgTime: 30 },
  ],
};

// No pre-seeded businesses — businesses are created via the signup page
const INITIAL_BUSINESSES: Business[] = [];

type Listener = () => void;
let listeners: Listener[] = [];

function read(): Business[] {
  if (typeof window === 'undefined') return INITIAL_BUSINESSES;
  try {
    const stored = localStorage.getItem(BUSINESS_STORAGE_KEY);
    if (stored) return JSON.parse(stored);
    localStorage.setItem(BUSINESS_STORAGE_KEY, JSON.stringify(INITIAL_BUSINESSES));
    return INITIAL_BUSINESSES;
  } catch {
    return INITIAL_BUSINESSES;
  }
}

function save(businesses: Business[]) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(BUSINESS_STORAGE_KEY, JSON.stringify(businesses));
  listeners.forEach(l => l());
}

export const businessStore = {
  subscribe(listener: Listener) {
    listeners.push(listener);
    return () => { listeners = listeners.filter(l => l !== listener); };
  },

  getAll(): Business[] {
    return read();
  },

  getById(id: string): Business | null {
    return read().find(b => b.id === id) ?? null;
  },

  // Business login — returns the business or null if credentials are wrong
  login(email: string, password: string): Business | null {
    const business = read().find(b => b.email === email && b.password === password) ?? null;
    if (business && typeof window !== 'undefined') {
      localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify({ type: 'business', id: business.id }));
      listeners.forEach(l => l());
    }
    return business;
  },

  // Super admin login — fixed password for mock mode
  adminLogin(password: string): boolean {
    if (password !== 'admin1234') return false;
    if (typeof window !== 'undefined') {
      localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify({ type: 'admin' }));
      listeners.forEach(l => l());
    }
    return true;
  },

  logout() {
    if (typeof window !== 'undefined') {
      localStorage.removeItem(AUTH_STORAGE_KEY);
    }
    listeners.forEach(l => l());
  },

  getSession(): AuthSession | null {
    if (typeof window === 'undefined') return null;
    try {
      const stored = localStorage.getItem(AUTH_STORAGE_KEY);
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  },

  // Create a new business account with default services for their type
  signup(name: string, email: string, password: string, type: BusinessType): Business | null {
    const businesses = read();
    if (businesses.find(b => b.email === email)) return null; // email taken

    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    const id = `${slug}-${Date.now().toString(36)}`;

    const newBusiness: Business = {
      id,
      name,
      email,
      password,
      type,
      services: DEFAULT_SERVICES[type].map(s => ({ ...s })),
      createdAt: new Date().toISOString(),
    };

    businesses.push(newBusiness);
    save(businesses);

    if (typeof window !== 'undefined') {
      localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify({ type: 'business', id: newBusiness.id }));
    }

    return newBusiness;
  },

  // Update a business's service list from their dashboard
  updateServices(businessId: string, services: Service[]) {
    const businesses = read();
    const idx = businesses.findIndex(b => b.id === businessId);
    if (idx === -1) return;
    businesses[idx].services = services;
    save(businesses);
  },
};
