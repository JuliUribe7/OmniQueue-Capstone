// useQueue — handles all queue state for the customer portal
// joining, snoozing, canceling, position tracking

import { useState, useEffect, useCallback } from 'react';
import {
  Service,
  Ticket,
  MOCK_SERVICES,
  mockJoinQueue,
  joinQueue as apiJoinQueue,
  getQueueStatus,
  getStoredSession,
  clearStoredSession,
  estimateServiceFromDescription,
} from '../services/queueService';

// Snooze time options (15 min increments up to 2 hours)
export const SNOOZE_OPTIONS = [
  { value: 15, label: '15 min' },
  { value: 30, label: '30 min' },
  { value: 45, label: '45 min' },
  { value: 60, label: '1 hr' },
  { value: 75, label: '1 hr 15 min' },
  { value: 90, label: '1 hr 30 min' },
  { value: 105, label: '1 hr 45 min' },
  { value: 120, label: '2 hr' },
];

// The different screens/steps in the customer flow
export type QueueStep =
  | 'contact'   // entering name and phone number (first screen)
  | 'select'    // choosing a service
  | 'describe'  // typing what they need
  | 'confirm'   // reviewing before joining
  | 'waiting'   // in the queue
  | 'called'    // it's their turn
  | 'snoozed';  // just used snooze (brief state)

interface UseQueueReturn {
  // Current state
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

  // Actions
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

// flip to true to use mock data instead of the real backend
const USE_MOCK = true; // flip to false once backend is deployed

export function useQueue(): UseQueueReturn {
  // State
  const [currentStep, setCurrentStep] = useState<QueueStep>('contact');
  const [services] = useState<Service[]>(MOCK_SERVICES);
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [customerName, setCustomerName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [description, setDescription] = useState('');
  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [customerToken, setCustomerToken] = useState<string | null>(null);
  const [queuePosition, setQueuePosition] = useState<number | null>(null);
  const [estimatedWait, setEstimatedWait] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Check for existing session on mount (in case app was closed mid-queue)
  useEffect(() => {
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

  // Poll the real backend every 10s for live position updates when waiting
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

  // Simulate queue movement in mock mode (for demo without backend)
  useEffect(() => {
    if (!USE_MOCK) return;
    if (currentStep === 'waiting' && queuePosition && queuePosition > 1 && selectedService) {
      const timer = setInterval(() => {
        setQueuePosition(prev => {
          if (!prev || prev <= 1) {
            setCurrentStep('called');
            clearInterval(timer);
            return 1;
          }
          setEstimatedWait(wait => Math.max(0, (wait || 0) - selectedService.avgTime));
          return prev - 1;
        });
      }, 8000);

      return () => clearInterval(timer);
    }
  }, [currentStep, queuePosition, selectedService]);

  // Trigger "called" when position reaches 1 in mock mode
  useEffect(() => {
    if (USE_MOCK && queuePosition === 1 && currentStep === 'waiting') {
      setCurrentStep('called');
    }
  }, [queuePosition, currentStep]);

  // Actions

  // Customer submitted their name and phone number
  const submitContact = useCallback(() => {
    if (customerName.trim() && phoneNumber.trim()) {
      setCurrentStep('select');
    }
  }, [customerName, phoneNumber]);

  // User selected a service from the grid
  const selectService = useCallback((service: Service) => {
    setSelectedService(service);
    setCurrentStep('confirm');
  }, []);

  // User submitted their description
  const submitDescription = useCallback(() => {
    if (description.trim()) {
      const estimatedService = estimateServiceFromDescription(description);
      setSelectedService({
        ...estimatedService,
        description: description.trim(),
      } as Service & { description: string });
      setCurrentStep('confirm');
    }
  }, [description]);

  // User confirmed and wants to join the queue
  const joinQueue = useCallback(async () => {
    if (!selectedService) return;

    setIsLoading(true);
    setError(null);

    try {
      if (USE_MOCK) {
        const newTicket = mockJoinQueue(selectedService, phoneNumber);
        setTicket(newTicket);
        setQueuePosition(newTicket.position);
        setEstimatedWait(selectedService.avgTime * selectedService.currentQueue);
        setCurrentStep('waiting');
      } else {
        const { ticket: newTicket, customerToken: token } = await apiJoinQueue(
          selectedService.id,
          phoneNumber
        );
        setTicket(newTicket);
        setCustomerToken(token);
        setQueuePosition(newTicket.position);
        setEstimatedWait(newTicket.position * selectedService.avgTime);
        setCurrentStep('waiting');
      }
    } catch (err: any) {
      const msg = err?.message || String(err);
      setError(`Error: ${msg}`);
      console.error('[joinQueue]', err);
    } finally {
      setIsLoading(false);
    }
  }, [selectedService, phoneNumber]);

  // User wants to snooze their spot — no backend endpoint yet, frontend only
  const snoozeSpot = useCallback((minutes: number) => {
    if (!selectedService || !queuePosition) return;

    const spotsToMove = Math.ceil(minutes / selectedService.avgTime);
    setQueuePosition(prev => (prev || 1) + spotsToMove);
    setEstimatedWait(prev => (prev || 0) + minutes);

    setCurrentStep('snoozed');
    setTimeout(() => setCurrentStep('waiting'), 2000);
  }, [selectedService, queuePosition]);

  // User wants to leave the queue
  const leaveQueue = useCallback(async () => {
    await clearStoredSession();

    setCurrentStep('contact');
    setSelectedService(null);
    setCustomerName('');
    setPhoneNumber('');
    setDescription('');
    setTicket(null);
    setCustomerToken(null);
    setQueuePosition(null);
    setEstimatedWait(null);
  }, []);

  // Handle back navigation
  const goBack = useCallback(() => {
    switch (currentStep) {
      case 'select':
        setCurrentStep('contact');
        break;
      case 'describe':
        setCurrentStep('select');
        break;
      case 'confirm':
        if ((selectedService as any)?.description) {
          setCurrentStep('describe');
        } else {
          setCurrentStep('select');
        }
        break;
      default:
        setCurrentStep('contact');
    }
  }, [currentStep, selectedService]);

  // Return everything the components need
  return {
    currentStep,
    services,
    selectedService,
    customerName,
    phoneNumber,
    description,
    ticket,
    queuePosition,
    estimatedWait,
    isLoading,
    error,
    setCurrentStep,
    setCustomerName,
    setPhoneNumber,
    setDescription,
    submitContact,
    selectService,
    submitDescription,
    joinQueue,
    snoozeSpot,
    leaveQueue,
    goBack,
  };
}


// helper functions

// format minutes into a readable string e.g. 90 -> "1 hr 30 min"
export function formatWaitTime(minutes: number): string {
  if (minutes < 60) {
    return `${minutes} min`;
  }
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (mins === 0) {
    return `${hours} hr`;
  }
  return `${hours} hr ${mins} min`;
}

// total wait = avg time per person × people in line
export function calculateWaitTime(service: Service): number {
  return service.avgTime * service.currentQueue;
}
