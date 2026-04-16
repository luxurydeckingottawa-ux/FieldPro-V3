/**
 * useCustomers — Customer state management hook
 *
 * Extracted from App.tsx (Phase 5 Step 1) to reduce the root component's
 * surface area. Owns customer state, update handler, and Supabase persistence.
 */

import { useState, useCallback } from 'react';
import { Customer } from '../types';
import { dataService } from '../services/dataService';

export interface UseCustomersReturn {
  customers: Customer[];
  setCustomers: React.Dispatch<React.SetStateAction<Customer[]>>;
  handleUpdateCustomer: (customerId: string, updates: Partial<Customer>) => void;
}

export function useCustomers(): UseCustomersReturn {
  const [customers, setCustomers] = useState<Customer[]>([]);

  const handleUpdateCustomer = useCallback((customerId: string, updates: Partial<Customer>) => {
    setCustomers(prev => prev.map(c => c.id === customerId ? { ...c, ...updates } : c));
    // Persist to Supabase
    dataService.updateCustomer(customerId, updates).catch(() => { /* state already updated above */ });
  }, []);

  return { customers, setCustomers, handleUpdateCustomer };
}
