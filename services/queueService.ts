// API calls for queue operations
// talks to the backend's queueController.js endpoints

import AsyncStorage from '@react-native-async-storage/async-storage';

// Base URL for the backend API
// points to the deployed backend — works from anywhere, no local network needed
// set EXPO_PUBLIC_API_URL in your .env to override
const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://192.168.12.74';

// types — match the backend's Prisma models

export interface Service {
  id: string;
  name: string;
  avgTime: number;      // average service time in minutes
  currentQueue: number; // how many people currently waiting
}

// Ticket shape returned from the real backend
export interface Ticket {
  id: string;
  serviceId: string;
  position: number;
  status: 'Waiting' | 'Called' | 'Served' | 'Canceled';
  customerToken: string;
  phoneNumber?: string;
  createdAt: string;
  updatedAt: string;
}

// API functions

/**
 * Join a queue for a specific service
 * POST /api/queues/:serviceId/join
 * Returns the ticket and a customerToken we use to poll status later
 */
export async function joinQueue(
  serviceId: string,
  phoneNumber?: string
): Promise<{ ticket: Ticket; customerToken: string }> {
  // generate or reuse a token so the customer can be identified across sessions
  const existing = await AsyncStorage.getItem('omniqueue_customer_token');
  const customerToken = existing || undefined;

  const response = await fetch(`${API_BASE_URL}/api/queues/${serviceId}/join`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ phoneNumber, customerToken }),
  });

  if (!response.ok) {
    const body = await response.text().catch(() => '');
    throw new Error(`${response.status} ${body}`);
  }

  const data = await response.json();

  // save the token so we can look up status if the app closes and reopens
  await AsyncStorage.setItem('omniqueue_customer_token', data.customerToken);
  await AsyncStorage.setItem('omniqueue_service_id', serviceId);

  return data;
}

/**
 * Get current ticket status using the customerToken
 * GET /api/entries/:token
 */
export async function getQueueStatus(customerToken: string): Promise<Ticket | null> {
  const response = await fetch(`${API_BASE_URL}/api/entries/${customerToken}`);

  if (response.status === 404) return null;
  if (!response.ok) throw new Error('Failed to fetch queue status');

  const data = await response.json();
  return data.ticket;
}

/**
 * Get stored customerToken — used when app reopens to restore the waiting screen
 */
export async function getStoredSession(): Promise<{ customerToken: string; serviceId: string } | null> {
  try {
    const customerToken = await AsyncStorage.getItem('omniqueue_customer_token');
    const serviceId = await AsyncStorage.getItem('omniqueue_service_id');
    if (customerToken && serviceId) return { customerToken, serviceId };
    return null;
  } catch {
    return null;
  }
}

/**
 * Clear stored session data when leaving the queue
 */
export async function clearStoredSession(): Promise<void> {
  await AsyncStorage.multiRemove(['omniqueue_customer_token', 'omniqueue_service_id']);
}


// mock data — remove once the backend is connected
// note: there's no /services endpoint on the backend yet, so we keep this for now

export const MOCK_SERVICES: Service[] = [
  { id: '1', name: 'Haircut', avgTime: 25, currentQueue: 4 },
  { id: '2', name: 'Beard Trim', avgTime: 15, currentQueue: 2 },
  { id: '3', name: 'Haircut + Beard', avgTime: 35, currentQueue: 3 },
  { id: '4', name: 'Kids Cut', avgTime: 20, currentQueue: 1 },
];

/**
 * Mock function to simulate joining queue (for testing without backend)
 */
export function mockJoinQueue(service: Service, phoneNumber?: string): Ticket {
  return {
    id: `ticket_${Date.now()}`,
    serviceId: service.id,
    position: service.currentQueue + 1,
    status: 'Waiting',
    customerToken: `mock_token_${Date.now()}`,
    phoneNumber,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

/**
 * Mock function to estimate service from description
 * In production, this could use AI/ML on the backend
 */
export function estimateServiceFromDescription(description: string): Service {
  const lower = description.toLowerCase();

  if (lower.includes('beard') && (lower.includes('hair') || lower.includes('cut'))) {
    return MOCK_SERVICES[2]; // Haircut + Beard
  } else if (lower.includes('beard') || lower.includes('trim') || lower.includes('shave')) {
    return MOCK_SERVICES[1]; // Beard Trim
  } else if (lower.includes('kid') || lower.includes('child') || lower.includes('son') || lower.includes('daughter')) {
    return MOCK_SERVICES[3]; // Kids Cut
  } else {
    return MOCK_SERVICES[0]; // Haircut (default)
  }
}
