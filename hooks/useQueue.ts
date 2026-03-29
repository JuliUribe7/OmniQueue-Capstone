// useQueue — handles all queue state for the customer portal
// joining, snoozing, canceling, position tracking

import { useState, useEffect, useCallback } from 'react';
import {
  Service,
  Ticket,
  MOCK_SERVICES,
  joinQueue as apiJoinQueue,
  getQueueStatus,
  getStoredSession,
  clearStoredSession,
  estimateServiceFromDescription,
} from '../services/queueService';
import { queueStore } from '../store/queueStore';

// Snooze time options (15 min increments up to 2 hours)
export const SNOOZE_OPTIONS = [
  { value: 15,  label: '15 min' },
  { value: 30,  label: '30 min' },
  { value: 45,  label: '45 min' },
  { value: 60,  label: '1 hr' },
  { value: 75,  label: '1 hr 15 min' },
  { value: 90,  label: '1 hr 30 min' },
  { value: 105, label: '1 hr 45 min' },
  { value: 120, label: '2 hr' },
];

export type QueueStep =
  | 'contact'
  | 'select'
  | 'describe'
  | 'confirm'
  | 'waiting'
  | 'called'
  | 'snoozed';

interface UseQueueReturn {
  currentStep: QueueStep;
  services: Service[];
  selectedService: Service | null;
  customerName: string;
  phoneNumber: string;
  description: string;
  ticket: Ticket | null;
  queuePosition: number | null;
  estimatedWait: number | null;
  isLoading: boolean;
  error: string | null;
  setCurrentStep: (step: QueueStep) => void;
  setCustomerName: (name: string) => void;
  setPhoneNumber: (phone: string) => void;
  setDescription: (text: string) => void;
  submitContact: () => void;
  selectService: (service: Service) => void;
  submitDescription: () => void;
  joinQueue: () => void;
  snoozeSpot: (minutes: number) => void;
  leaveQueue: () => void;
  goBack: () => void;
}

// flip to false once backend is deployed
const USE_MOCK = true;

// localStorage key for persisting the customer's active session across refreshes
const SESSION_KEY = 'omniqueue_customer_session';

interface MockSession {
  ticketId: string;
  customerName: string;
  phoneNumber: string;
  serviceId: string;
}

function saveMockSession(session: MockSession) {
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(SESSION_KEY, JSON.stringify(session));
    }
  } catch {}
}

function loadMockSession(): MockSession | null {
  try {
    if (typeof localStorage !== 'undefined') {
      const s = localStorage.getItem(SESSION_KEY);
      if (s) return JSON.parse(s);
    }
  } catch {}
  return null;
}

function clearMockSession() {
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem(SESSION_KEY);
    }
  } catch {}
}

export function useQueue(): UseQueueReturn {
  const [currentStep, setCurrentStep] = useState<QueueStep>('contact');
  const [services] = useState<Service[]>(MOCK_SERVICES);
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [customerName, setCustomerName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [description, setDescription] = useState('');
  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [myTicketId, setMyTicketId] = useState<string | null>(null);
  const [customerToken, setCustomerToken] = useState<string | null>(null);
  const [queuePosition, setQueuePosition] = useState<number | null>(null);
  const [estimatedWait, setEstimatedWait] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Restore customer session on mount (survives browser refresh)
  useEffect(() => {
    if (USE_MOCK) {
      const session = loadMockSession();
      if (!session) return;

      const storeTicket = queueStore.getTicketById(session.ticketId);
      if (storeTicket && storeTicket.status !== 'Served' && storeTicket.status !== 'Canceled') {
        const service = MOCK_SERVICES.find(s => s.id === session.serviceId) || null;
        setMyTicketId(session.ticketId);
        setCustomerName(session.customerName);
        setPhoneNumber(session.phoneNumber);
        setSelectedService(service);
        setQueuePosition(storeTicket.position);
        setEstimatedWait(storeTicket.estimatedWait);
        setCurrentStep(storeTicket.status === 'Called' ? 'called' : 'waiting');
      } else {
        // ticket no longer exists or was served — clear stale session
        clearMockSession();
      }
      return;
    }

    // real backend session restore
    async function restoreSession() {
      const session = await getStoredSession();
      if (!session) return;
      const liveTicket = await getQueueStatus(session.customerToken);
      if (liveTicket && liveTicket.status === 'Waiting') {
        const matchedService = MOCK_SERVICES.find(s => s.id === session.serviceId) || null;
        setTicket(liveTicket);
        setCustomerToken(session.customerToken);
        setQueuePosition(liveTicket.position);
        setEstimatedWait(matchedService ? liveTicket.position * matchedService.avgTime : null);
        setSelectedService(matchedService);
        setCurrentStep('waiting');
      }
    }
    restoreSession();
  }, []);

  // Subscribe to store changes — updates position and wait time when staff marks someone done.
  // Also fires when another browser tab changes localStorage (cross-tab sync via storage event).
  useEffect(() => {
    if (!USE_MOCK || !myTicketId) return;

    const unsubscribe = queueStore.subscribe(() => {
      const updated = queueStore.getTicketById(myTicketId);
      if (!updated) return;
      setQueuePosition(updated.position);
      setEstimatedWait(updated.estimatedWait);
      if (updated.status === 'Called') setCurrentStep('called');
    });

    return unsubscribe;
  }, [myTicketId]);

  // Countdown timer — ticks down estimatedWait by 1 every real minute
  // Gives the customer a live countdown between store updates
  useEffect(() => {
    if (currentStep !== 'waiting' && currentStep !== 'snoozed') return;
    if (estimatedWait === null || estimatedWait <= 0) return;

    const timer = setInterval(() => {
      setEstimatedWait(prev => {
        if (prev === null || prev <= 1) return 0;
        return prev - 1;
      });
    }, 60000); // tick every real minute

    return () => clearInterval(timer);
  }, [currentStep, estimatedWait]);

  // Poll real backend every 10s when waiting (live backend only)
  useEffect(() => {
    if (currentStep !== 'waiting' || !customerToken || USE_MOCK) return;

    const interval = setInterval(async () => {
      const updated = await getQueueStatus(customerToken);
      if (!updated) return;
      setTicket(updated);
      setQueuePosition(updated.position);
      if (updated.status === 'Called') {
        setCurrentStep('called');
        clearInterval(interval);
      }
    }, 10000);

    return () => clearInterval(interval);
  }, [currentStep, customerToken]);

  const submitContact = useCallback(() => {
    if (customerName.trim() && phoneNumber.trim()) setCurrentStep('select');
  }, [customerName, phoneNumber]);

  const selectService = useCallback((service: Service) => {
    setSelectedService(service);
    setCurrentStep('confirm');
  }, []);

  const submitDescription = useCallback(() => {
    if (description.trim()) {
      const estimatedService = estimateServiceFromDescription(description);
      setSelectedService({ ...estimatedService, description: description.trim() } as Service & { description: string });
      setCurrentStep('confirm');
    }
  }, [description]);

  const joinQueue = useCallback(async () => {
    if (!selectedService) return;
    setIsLoading(true);
    setError(null);

    try {
      if (USE_MOCK) {
        const existing = queueStore.getTickets();
        const nextPosition = existing.length + 1;
        const lastWait = existing.length > 0 ? existing[existing.length - 1].estimatedWait : 0;
        const estWait = lastWait + selectedService.avgTime;
        const ticketId = `ticket_${Date.now()}`;

        queueStore.addTicket({
          id: ticketId,
          position: nextPosition,
          customerName,
          phoneNumber,
          serviceName: selectedService.name,
          serviceId: selectedService.id,
          serviceAvgTime: selectedService.avgTime,
          status: 'Waiting',
          joinedAt: new Date().toISOString(),
          estimatedWait: estWait,
        });

        // save session to localStorage so refresh restores the waiting screen
        saveMockSession({ ticketId, customerName, phoneNumber, serviceId: selectedService.id });

        const newTicket: Ticket = {
          id: ticketId,
          serviceId: selectedService.id,
          position: nextPosition,
          status: 'Waiting',
          customerToken: ticketId,
          phoneNumber,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };

        setTicket(newTicket);
        setMyTicketId(ticketId);
        setQueuePosition(nextPosition);
        setEstimatedWait(estWait);
        setCurrentStep('waiting');
      } else {
        const { ticket: newTicket, customerToken: token } = await apiJoinQueue(selectedService.id, phoneNumber);
        setTicket(newTicket);
        setCustomerToken(token);
        setQueuePosition(newTicket.position);
        setEstimatedWait(newTicket.position * selectedService.avgTime);
        setCurrentStep('waiting');
      }
    } catch (err: any) {
      setError(`Error: ${err?.message || String(err)}`);
    } finally {
      setIsLoading(false);
    }
  }, [selectedService, customerName, phoneNumber]);

  const snoozeSpot = useCallback((minutes: number) => {
    if (!selectedService || !queuePosition) return;
    const spotsToMove = Math.ceil(minutes / selectedService.avgTime);
    setQueuePosition(prev => (prev || 1) + spotsToMove);
    setEstimatedWait(prev => (prev || 0) + minutes);
    setCurrentStep('snoozed');
    setTimeout(() => setCurrentStep('waiting'), 2000);
  }, [selectedService, queuePosition]);

  const leaveQueue = useCallback(async () => {
    if (USE_MOCK && myTicketId) {
      queueStore.removeTicket(myTicketId);
      clearMockSession();
    }
    await clearStoredSession();
    setCurrentStep('contact');
    setSelectedService(null);
    setCustomerName('');
    setPhoneNumber('');
    setDescription('');
    setTicket(null);
    setMyTicketId(null);
    setCustomerToken(null);
    setQueuePosition(null);
    setEstimatedWait(null);
  }, [myTicketId]);

  const goBack = useCallback(() => {
    switch (currentStep) {
      case 'select':   setCurrentStep('contact'); break;
      case 'describe': setCurrentStep('select');  break;
      case 'confirm':
        setCurrentStep((selectedService as any)?.description ? 'describe' : 'select');
        break;
      default: setCurrentStep('contact');
    }
  }, [currentStep, selectedService]);

  return {
    currentStep, services, selectedService, customerName, phoneNumber,
    description, ticket, queuePosition, estimatedWait, isLoading, error,
    setCurrentStep, setCustomerName, setPhoneNumber, setDescription,
    submitContact, selectService, submitDescription, joinQueue,
    snoozeSpot, leaveQueue, goBack,
  };
}

// format minutes into a readable string e.g. 90 -> "1 hr 30 min"
export function formatWaitTime(minutes: number): string {
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (mins === 0) return `${hours} hr`;
  return `${hours} hr ${mins} min`;
}

// total wait = avg time per person × people in line
export function calculateWaitTime(service: Service): number {
  return service.avgTime * service.currentQueue;
}
