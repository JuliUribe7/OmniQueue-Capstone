// API calls for queue operations
// talks to the backend's queueController.js endpoints

import AsyncStorage from '@react-native-async-storage/async-storage';

// Base URL for the backend API - change this to your actual server
const API_BASE_URL = 'http://localhost:3001';

// types — match the backend's Prisma models

export interface Service {
  id: string;
  name: string;
  avgTime: number;      // average service time in minutes
  currentQueue: number; // how many people currently waiting
}

export interface Ticket {
  id: string;
  serviceId: string;
  serviceName: string;
  position: number;
  estimatedWait: number;
  status: 'waiting' | 'snoozed' | 'active' | 'served' | 'canceled';
  phoneNumber?: string;
}

export interface QueueStatus {
  position: number;
  estimatedWait: number;
  status: 'waiting' | 'snoozed' | 'active' | 'served' | 'canceled';
  aheadCount: number;
}

// grab auth token from storage
async function getAuthToken(): Promise<string | null> {
  return await AsyncStorage.getItem('omniqueue_session');
}

// API functions

/**
 * Fetch all available services/queues for a business
 * Called when user first opens the app after scanning QR code
 */
export async function getServices(businessId: string): Promise<Service[]> {
  try {
    const response = await fetch(`${API_BASE_URL}/queues/${businessId}/services`);

    if (!response.ok) {
      throw new Error('Failed to fetch services');
    }

    return await response.json();
  } catch (error) {
    console.error('Error fetching services:', error);
    throw error;
  }
}

/**
 * Join a queue for a specific service
 * Creates a Ticket in the database and triggers SMS confirmation if phone provided
 */
export async function joinQueue(
  serviceId: string,
  phoneNumber?: string
): Promise<Ticket> {
  try {
    const token = await getAuthToken();

    const response = await fetch(`${API_BASE_URL}/queues/join`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ serviceId, phoneNumber }),
    });

    if (!response.ok) {
      throw new Error('Failed to join queue');
    }

    const ticket = await response.json();

    // Save ticket locally so we can recover if app closes
    await AsyncStorage.setItem('omniqueue_ticket', JSON.stringify(ticket));

    return ticket;
  } catch (error) {
    console.error('Error joining queue:', error);
    throw error;
  }
}

/**
 * Get current status of a ticket (position, wait time, etc.)
 * Called periodically to update the waiting screen
 */
export async function getQueueStatus(ticketId: string): Promise<QueueStatus> {
  try {
    const token = await getAuthToken();

    const response = await fetch(`${API_BASE_URL}/queues/status/${ticketId}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      throw new Error('Failed to fetch queue status');
    }

    return await response.json();
  } catch (error) {
    console.error('Error fetching queue status:', error);
    throw error;
  }
}

/**
 * Snooze a ticket - move back in the queue
 * Called when user is running late and needs more time
 */
export async function snoozeTicket(
  ticketId: string,
  minutes: number
): Promise<Ticket> {
  try {
    const token = await getAuthToken();

    const response = await fetch(`${API_BASE_URL}/queues/snooze`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ ticketId, minutes }),
    });

    if (!response.ok) {
      throw new Error('Failed to snooze ticket');
    }

    const ticket = await response.json();

    // Update stored ticket
    await AsyncStorage.setItem('omniqueue_ticket', JSON.stringify(ticket));

    return ticket;
  } catch (error) {
    console.error('Error snoozing ticket:', error);
    throw error;
  }
}

/**
 * Cancel a ticket - leave the queue entirely
 */
export async function cancelTicket(ticketId: string): Promise<void> {
  try {
    const token = await getAuthToken();

    const response = await fetch(`${API_BASE_URL}/queues/cancel`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ ticketId }),
    });

    if (!response.ok) {
      throw new Error('Failed to cancel ticket');
    }

    // Clear stored ticket
    await AsyncStorage.removeItem('omniqueue_ticket');
  } catch (error) {
    console.error('Error canceling ticket:', error);
    throw error;
  }
}

/**
 * Get any existing ticket from storage
 * Used when app reopens to restore user's place in line
 */
export async function getStoredTicket(): Promise<Ticket | null> {
  try {
    const data = await AsyncStorage.getItem('omniqueue_ticket');
    return data ? JSON.parse(data) : null;
  } catch (error) {
    console.error('Error getting stored ticket:', error);
    return null;
  }
}

/**
 * Clear stored ticket data
 * Called after ticket is completed or canceled
 */
export async function clearStoredTicket(): Promise<void> {
  await AsyncStorage.removeItem('omniqueue_ticket');
}


// mock data — remove once the backend is connected

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
    serviceName: service.name,
    position: service.currentQueue + 1,
    estimatedWait: service.avgTime * service.currentQueue,
    status: 'waiting',
    phoneNumber,
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
