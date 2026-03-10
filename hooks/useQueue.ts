// useQueue — handles all queue state for the customer portal
// joining, snoozing, canceling, position tracking

import { useState, useEffect, useCallback } from 'react';
import {
  Service,
  Ticket,
  MOCK_SERVICES,
  mockJoinQueue,
  estimateServiceFromDescription,
  getStoredTicket,
  clearStoredTicket,
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
  description: string;
  ticket: Ticket | null;
  queuePosition: number | null;
  estimatedWait: number | null;
  isLoading: boolean;
  error: string | null;

  // Actions
  setCurrentStep: (step: QueueStep) => void;
  setDescription: (text: string) => void;
  selectService: (service: Service) => void;
  submitDescription: () => void;
  joinQueue: (phoneNumber?: string) => void;
  snoozeSpot: (minutes: number) => void;
  leaveQueue: () => void;
  goBack: () => void;
}

export function useQueue(): UseQueueReturn {
  // State
  const [currentStep, setCurrentStep] = useState<QueueStep>('select');
  const [services, setServices] = useState<Service[]>(MOCK_SERVICES);
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [description, setDescription] = useState('');
  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [queuePosition, setQueuePosition] = useState<number | null>(null);
  const [estimatedWait, setEstimatedWait] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Check for existing ticket on mount (in case app was closed)
  useEffect(() => {
    async function checkExistingTicket() {
      const storedTicket = await getStoredTicket();
      if (storedTicket && storedTicket.status === 'waiting') {
        setTicket(storedTicket);
        setQueuePosition(storedTicket.position);
        setEstimatedWait(storedTicket.estimatedWait);
        setSelectedService({
          id: storedTicket.serviceId,
          name: storedTicket.serviceName,
          avgTime: 25, // default, would come from API
          currentQueue: storedTicket.position - 1,
        });
        setCurrentStep('waiting');
      }
    }
    checkExistingTicket();
  }, []);

  // Simulate queue movement (for demo purposes)
  // In production, this would be replaced with real-time updates from the server
  useEffect(() => {
    if (currentStep === 'waiting' && queuePosition && queuePosition > 1 && selectedService) {
      const timer = setInterval(() => {
        setQueuePosition(prev => {
          if (!prev || prev <= 1) {
            setCurrentStep('called');
            clearInterval(timer);
            return 1;
          }
          // Also update estimated wait time
          setEstimatedWait(wait =>
            Math.max(0, (wait || 0) - selectedService.avgTime)
          );
          return prev - 1;
        });
      }, 8000); // Move up every 8 seconds for demo

      return () => clearInterval(timer);
    }
  }, [currentStep, queuePosition, selectedService]);

  // Trigger "called" when position reaches 1
  useEffect(() => {
    if (queuePosition === 1 && currentStep === 'waiting') {
      setCurrentStep('called');
    }
  }, [queuePosition, currentStep]);

  // Actions

  // User selected a service from the grid
  const selectService = useCallback((service: Service) => {
    setSelectedService(service);
    setCurrentStep('confirm');
  }, []);

  // User submitted their description
  const submitDescription = useCallback(() => {
    if (description.trim()) {
      const estimatedService = estimateServiceFromDescription(description);
      // Add the description to the service object so we can show it later
      setSelectedService({
        ...estimatedService,
        description: description.trim(),
      } as Service & { description: string });
      setCurrentStep('confirm');
    }
  }, [description]);

  // User confirmed and wants to join the queue
  const joinQueue = useCallback((phoneNumber?: string) => {
    if (!selectedService) return;

    setIsLoading(true);
    setError(null);

    try {
      // Using mock for now - replace with real API call
      const newTicket = mockJoinQueue(selectedService, phoneNumber);

      setTicket(newTicket);
      setQueuePosition(newTicket.position);
      setEstimatedWait(newTicket.estimatedWait);
      setCurrentStep('waiting');
    } catch (err) {
      setError('Failed to join queue. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }, [selectedService]);

  // User wants to snooze their spot
  const snoozeSpot = useCallback((minutes: number) => {
    if (!selectedService || !queuePosition) return;

    // Calculate how many spots to move back based on snooze time
    const spotsToMove = Math.ceil(minutes / selectedService.avgTime);

    setQueuePosition(prev => (prev || 1) + spotsToMove);
    setEstimatedWait(prev => (prev || 0) + minutes);

    // Briefly show "snoozed" confirmation
    setCurrentStep('snoozed');
    setTimeout(() => setCurrentStep('waiting'), 2000);
  }, [selectedService, queuePosition]);

  // User wants to leave the queue
  const leaveQueue = useCallback(async () => {
    await clearStoredTicket();

    // Reset all state
    setCurrentStep('select');
    setSelectedService(null);
    setDescription('');
    setTicket(null);
    setQueuePosition(null);
    setEstimatedWait(null);
  }, []);

  // Handle back navigation
  const goBack = useCallback(() => {
    switch (currentStep) {
      case 'describe':
        setCurrentStep('select');
        break;
      case 'confirm':
        // Go back to description if they came from there
        if ((selectedService as any)?.description) {
          setCurrentStep('describe');
        } else {
          setCurrentStep('select');
        }
        break;
      default:
        setCurrentStep('select');
    }
  }, [currentStep, selectedService]);

  // Return everything the components need
  return {
    currentStep,
    services,
    selectedService,
    description,
    ticket,
    queuePosition,
    estimatedWait,
    isLoading,
    error,
    setCurrentStep,
    setDescription,
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
