/**
 * useInvoices — Invoice state management hook
 *
 * Extracted from App.tsx (Phase 5 Step 1) to reduce the root component's
 * surface area. Owns invoice state, generate/update handlers, and Supabase persistence.
 *
 * Dependencies:
 *   - setJobs / setSelectedJob: needed to co-locate invoices on job records
 *   - selectedJob: needed to keep selectedJob.invoices in sync
 */

import { useState, useCallback } from 'react';
import { Job, Invoice, InvoiceType } from '../types';
import { createInvoice } from '../utils/invoiceUtils';
import { dataService } from '../services/dataService';

export interface UseInvoicesParams {
  setJobs: React.Dispatch<React.SetStateAction<Job[]>>;
  selectedJob: Job | null;
  setSelectedJob: React.Dispatch<React.SetStateAction<Job | null>>;
}

export interface UseInvoicesReturn {
  invoices: Invoice[];
  setInvoices: React.Dispatch<React.SetStateAction<Invoice[]>>;
  handleGenerateInvoice: (job: Job, type: InvoiceType) => void;
  handleUpdateInvoice: (invoiceId: string, updates: Partial<Invoice>) => void;
}

export function useInvoices({ setJobs, selectedJob, setSelectedJob }: UseInvoicesParams): UseInvoicesReturn {
  const [invoices, setInvoices] = useState<Invoice[]>([]);

  const handleGenerateInvoice = useCallback((job: Job, type: InvoiceType) => {
    const newInvoice = createInvoice(job, type, invoices);
    setInvoices(prev => [...prev, newInvoice]);
    setJobs(prev => prev.map(j =>
      j.id === job.id
        ? { ...j, invoices: [...(j.invoices || []), newInvoice] }
        : j
    ));
    if (selectedJob?.id === job.id) {
      setSelectedJob(prev => prev
        ? { ...prev, invoices: [...(prev.invoices || []), newInvoice] }
        : prev
      );
    }
    // Persist to Supabase
    dataService.createInvoice(newInvoice).catch(() => { /* state already updated above */ });
  }, [invoices, selectedJob, setJobs, setSelectedJob]);

  const handleUpdateInvoice = useCallback((invoiceId: string, updates: Partial<Invoice>) => {
    setInvoices(prev => prev.map(inv => inv.id === invoiceId ? { ...inv, ...updates } : inv));
    // Persist to Supabase
    dataService.updateInvoice(invoiceId, updates).catch(() => { /* state already updated above */ });
  }, []);

  return { invoices, setInvoices, handleGenerateInvoice, handleUpdateInvoice };
}
