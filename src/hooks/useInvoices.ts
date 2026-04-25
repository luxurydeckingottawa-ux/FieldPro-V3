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
  handleGenerateInvoice: (job: Job, type: InvoiceType) => Invoice;
  handleGenerateAndSendInvoice: (job: Job, type: InvoiceType) => Invoice;
  handleUpdateInvoice: (invoiceId: string, updates: Partial<Invoice>) => void;
}

export function useInvoices({ setJobs, selectedJob, setSelectedJob }: UseInvoicesParams): UseInvoicesReturn {
  const [invoices, setInvoices] = useState<Invoice[]>([]);

  const handleGenerateInvoice = useCallback((job: Job, type: InvoiceType): Invoice => {
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
    return newInvoice;
  }, [invoices, selectedJob, setJobs, setSelectedJob]);

  // Generate AND immediately mark as sent — one-click flow from the
  // pipeline payment schedule. Once Stripe is wired, this will also fire
  // a portal payment-link SMS; for now it just creates the invoice in
  // 'sent' status so the customer-facing portal surfaces it immediately
  // (no second trip to the Invoices hub to flip the status).
  const handleGenerateAndSendInvoice = useCallback((job: Job, type: InvoiceType): Invoice => {
    const sentInvoice = { ...createInvoice(job, type, invoices), status: 'sent' as const };
    setInvoices(prev => [...prev, sentInvoice]);
    setJobs(prev => prev.map(j =>
      j.id === job.id
        ? { ...j, invoices: [...(j.invoices || []), sentInvoice] }
        : j
    ));
    if (selectedJob?.id === job.id) {
      setSelectedJob(prev => prev
        ? { ...prev, invoices: [...(prev.invoices || []), sentInvoice] }
        : prev
      );
    }
    dataService.createInvoice(sentInvoice).catch(() => { /* state already updated above */ });
    return sentInvoice;
  }, [invoices, selectedJob, setJobs, setSelectedJob]);

  const handleUpdateInvoice = useCallback((invoiceId: string, updates: Partial<Invoice>) => {
    setInvoices(prev => prev.map(inv => inv.id === invoiceId ? { ...inv, ...updates } : inv));
    // Persist to Supabase
    dataService.updateInvoice(invoiceId, updates).catch(() => { /* state already updated above */ });
  }, []);

  return { invoices, setInvoices, handleGenerateInvoice, handleGenerateAndSendInvoice, handleUpdateInvoice };
}
