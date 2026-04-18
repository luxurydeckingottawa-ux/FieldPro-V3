/**
 * useJobs — Job state management hook
 *
 * Extracted from App.tsx (Phase 5 Step 1). This is the heaviest state domain
 * in the app: job list, selected job, realtime subscriptions, and all job
 * mutation handlers including pipeline stage transitions with automations,
 * drip campaigns, SMS, and email side-effects.
 *
 * Dependencies passed in via params:
 *   - currentUser: auth context
 *   - navigateTo: router function
 *   - invoices: needed by handleEstimateAccepted / handleEstimateSaved for option dedup
 *   - setInvoices: not needed here (invoice mutations are in useInvoices)
 *   - handleSendMessage: chat integration for automation SMS
 */

import React, { useState, useCallback, useEffect } from 'react';
import {
  Job, User, Role, JobStatus, PipelineStage, CustomerLifecycle,
  NurtureSequence, EstimateData, EstimateOption,
  LiveEstimate, LiveEstimateItem,
} from '../types';
import { createDefaultOfficeChecklists, createDefaultBuildDetails, DEFAULT_AUTOMATIONS } from '../constants';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { dataService } from '../services/dataService';
// estimatePdf pulls in jspdf (~150 KB). Lazy-loaded below inside the async PDF
// generation block so it does not bloat the main chunk.
import { sendSms, sendGoogleReviewSms, sendWarrantySms, sendWarrantyEmail, sendEstimateEmail } from '../utils/communications';

const JOBS_STORAGE_KEY = 'luxury_decking_jobs_v5';

/**
 * Strip raw camera photo data URIs from fieldProgress before saving to Supabase.
 * Keeps cloudinary https:// URLs, drops data: URIs that would exceed DB payload limits.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const stripPhotoDataUris = (pages: any): any => {
  if (!pages || typeof pages !== 'object') return pages;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const result: any = {};
  for (const [pageNum, page] of Object.entries(pages)) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const p = page as any;
    result[pageNum] = {
      ...p,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      photos: (p.photos || []).map((photo: any) => ({
        ...photo,
        url: photo.cloudinaryUrl || (typeof photo.url === 'string' && photo.url.startsWith('http') ? photo.url : ''),
      })),
    };
  }
  return result;
};

// ── Types ──────────────────────────────────────────────────────────────────

export interface UseJobsParams {
  currentUser: User | null;
  navigateTo: (view: string, id?: string) => void;
  handleSendMessage: (sessionId: string, text: string, isFromClient?: boolean) => void;
}

export interface UseJobsReturn {
  jobs: Job[];
  setJobs: React.Dispatch<React.SetStateAction<Job[]>>;
  selectedJob: Job | null;
  setSelectedJob: React.Dispatch<React.SetStateAction<Job | null>>;
  handleUpdateJob: (jobId: string, updates: Partial<Job>) => void;
  handleDeleteJob: (jobId: string) => void;
  handleUpdatePipelineStage: (jobId: string, newStage: PipelineStage) => void;
  handleEstimateAccepted: (data: EstimateAcceptedData) => void;
  handleEstimateSaved: (data: EstimateSavedData) => void;
  stripPhotoDataUris: typeof stripPhotoDataUris;
  /** Calculator state management */
  calculatorSourceJobId: string | null;
  setCalculatorSourceJobId: React.Dispatch<React.SetStateAction<string | null>>;
}

export interface EstimateAcceptedData {
  clientName: string;
  clientAddress: string;
  estimateNumber: number;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  selections: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  dimensions: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  pricingSummary: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  activePackage: any;
  /** All options for multi-option estimates. Each option carries its own
   *  dimensions/selections/pricing so the customer portal can show them
   *  side-by-side. When undefined or length === 1, legacy single-option
   *  path is used. */
  allOptions?: Array<{
    id: string;
    name: string;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    selections: any;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    dimensions: any;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    pricingSummary: any;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    activePackage: any;
  }>;
}

export type EstimateSavedData = EstimateAcceptedData;

// ── Hook ───────────────────────────────────────────────────────────────────

export function useJobs({ currentUser, navigateTo, handleSendMessage }: UseJobsParams): UseJobsReturn {

  // ── State ────────────────────────────────────────────────────────────────

  const [jobs, setJobs] = useState<Job[]>(() => {
    let currentJobs: Job[] = [];
    try {
      const saved = localStorage.getItem(JOBS_STORAGE_KEY);
      if (saved) {
        currentJobs = JSON.parse(saved);
      }
    } catch (e) {
      console.error("Failed to parse jobs state", e);
    }

    return currentJobs.map(job => ({
      ...job,
      officeChecklists: job.officeChecklists || createDefaultOfficeChecklists(),
      buildDetails: job.buildDetails || createDefaultBuildDetails(),
      customerPortalToken: job.customerPortalToken || crypto.randomUUID()
    }));
  });

  const [selectedJob, setSelectedJob] = useState<Job | null>(() => {
    const params = new URLSearchParams(window.location.search);
    const portalToken = params.get('portal')
      || (window.location.pathname.startsWith('/portal/') ? window.location.pathname.split('/')[2] : null);
    if (portalToken) {
      let currentJobs: Job[] = [];
      try {
        const saved = localStorage.getItem(JOBS_STORAGE_KEY);
        if (saved) {
          currentJobs = JSON.parse(saved);
        }
      } catch (e) {
        console.error("Failed to parse jobs state for portal", e);
      }

      const migratedJobs = currentJobs.map(job => ({
        ...job,
        officeChecklists: job.officeChecklists || createDefaultOfficeChecklists(),
        buildDetails: job.buildDetails || createDefaultBuildDetails(),
        customerPortalToken: job.customerPortalToken || crypto.randomUUID()
      }));

      const foundJob = migratedJobs.find(j => j.customerPortalToken === portalToken);
      return foundJob || null;
    }
    return null;
  });

  const [calculatorSourceJobId, setCalculatorSourceJobId] = useState<string | null>(null);

  // ── localStorage persistence ─────────────────────────────────────────────

  useEffect(() => {
    try {
      localStorage.setItem(JOBS_STORAGE_KEY, JSON.stringify(jobs));
    } catch {
      // quota exceeded -- handled by safeSetItem in other places
    }
  }, [jobs]);

  // ── Supabase Realtime subscription ───────────────────────────────────────

  useEffect(() => {
    if (!supabase || !currentUser) return;

    const jobsChannel = supabase
      .channel('jobs-realtime')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'jobs' },
        async (payload) => {
          const updated = await dataService.getJobById(payload.new.id as string);
          if (!updated) return;
          setJobs(prev => prev.map(j => j.id === updated.id ? {
            ...updated,
            officeChecklists: updated.officeChecklists || createDefaultOfficeChecklists(),
            buildDetails: updated.buildDetails || createDefaultBuildDetails(),
          } : j));
          setSelectedJob(prev => prev?.id === updated.id ? updated : prev);
        }
      )
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'jobs' },
        async (payload) => {
          const inserted = await dataService.getJobById(payload.new.id as string);
          if (!inserted) return;
          setJobs(prev => {
            if (prev.find(j => j.id === inserted.id)) return prev;
            return [inserted, ...prev];
          });
        }
      )
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'jobs' },
        (payload) => {
          setJobs(prev => prev.filter(j => j.id !== payload.old.id));
          setSelectedJob(prev => prev?.id === payload.old.id ? null : prev);
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(jobsChannel); };
  }, [currentUser]);

  // ── Core handlers ────────────────────────────────────────────────────────

  const handleUpdateJob = useCallback((jobId: string, updates: Partial<Job>) => {
    setJobs(prevJobs => {
      const jobToUpdate = prevJobs.find(j => j.id === jobId);

      // Check for stage change to trigger automation
      if (jobToUpdate && updates.pipelineStage && updates.pipelineStage !== jobToUpdate.pipelineStage) {
        const automation = DEFAULT_AUTOMATIONS.find(a => a.stage === updates.pipelineStage && a.enabled);
        if (automation) {
          const messageText = automation.messageTemplate
            .replace('{clientName}', jobToUpdate.clientName)
            .replace('{jobNumber}', jobToUpdate.jobNumber);

          const sessionId = `session-${jobToUpdate.id}`;
          setTimeout(() => {
            handleSendMessage(sessionId, messageText);
            if (jobToUpdate.clientPhone) {
              sendSms(jobToUpdate.clientPhone, messageText);
            }
          }, 1000);
        }
      }

      return prevJobs.map(job =>
        job.id === jobId ? { ...job, ...updates, updatedAt: new Date().toISOString() } : job
      );
    });

    setSelectedJob(prev => {
      if (prev && prev.id === jobId) {
        return { ...prev, ...updates, updatedAt: new Date().toISOString() };
      }
      return prev;
    });

    // Persist to Supabase
    dataService.updateJob(jobId, updates).catch(err =>
      console.error('[handleUpdateJob] Supabase write failed:', err)
    );
  }, [handleSendMessage]);

  const handleDeleteJob = useCallback((jobId: string) => {
    setJobs(prev => prev.filter(j => j.id !== jobId));
    setSelectedJob(prev => prev?.id === jobId ? null : prev);
    navigateTo('office-pipeline');
    dataService.deleteJob(jobId).catch(err => console.error('Failed to delete job from DB:', err));
  }, [navigateTo]);

  const handleUpdatePipelineStage = useCallback((jobId: string, newStage: PipelineStage) => {
    const job = jobs.find(j => j.id === jobId) || selectedJob;
    const updates: Partial<Job> = { pipelineStage: newStage };
    if (newStage === PipelineStage.IN_FIELD && job?.status === JobStatus.SCHEDULED) {
      updates.status = JobStatus.IN_PROGRESS;
    }
    handleUpdateJob(jobId, updates);

    // Auto-send Google review request + warranty SMS/email when job moves to Paid & Closed
    // Respect SMS quiet hours (9 AM - 8 PM) for SMS only.
    if (newStage === PipelineStage.PAID_CLOSED && job) {
      const hour = new Date().getHours();
      const smsOk = hour >= 9 && hour < 20;

      if (job.clientPhone && smsOk) {
        sendGoogleReviewSms(job.clientPhone, job.clientName);
      }

      if (job.clientPhone && job.customerPortalToken && smsOk) {
        const portalUrl = `${window.location.origin}?portal=${job.customerPortalToken}`;
        sendWarrantySms(job.clientPhone, job.clientName, portalUrl);
      }

      if (job.clientEmail && job.customerPortalToken) {
        const portalUrl = `${window.location.origin}?portal=${job.customerPortalToken}`;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const pdfUrl = (job as any).verifiedBuildPassportUrl as string | undefined;
        sendWarrantyEmail(job.clientEmail, job.clientName, portalUrl, pdfUrl);
      }
    }
  }, [jobs, selectedJob, handleUpdateJob]);

  // ── Estimate Accepted (calculator flow) ──────────────────────────────────

  const handleEstimateAccepted = useCallback((data: EstimateAcceptedData) => {
    const now = new Date().toISOString();
    const totalAmount = Math.round(data.pricingSummary.finalTotal);
    const estimateAmount = Math.round(data.pricingSummary.subTotal);

    const acceptedBuildSummary = {
      optionName: data.activePackage
        ? `${data.activePackage.size} ${data.activePackage.level} Package`
        : 'Custom Deck Build',
      basePrice: estimateAmount,
      addOns: data.pricingSummary.impacts
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .filter((imp: any) => Math.round(imp.value) !== 0)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .map((imp: any) => ({ name: imp.label, price: Math.round(imp.value) })) as { name: string; price: number }[],
      totalPrice: totalAmount,
      acceptedDate: now,
      scopeSummary: data.pricingSummary.impacts
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .filter((imp: any) => Math.round(imp.value) !== 0)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .map((imp: any) => imp.label)
        .join(', ')
    };

    if (calculatorSourceJobId) {
      handleUpdateJob(calculatorSourceJobId, {
        clientName: data.clientName,
        projectAddress: data.clientAddress,
        totalAmount,
        estimateAmount,
        acceptedBuildSummary,
        calculatorSelections: data.selections,
        calculatorDimensions: data.dimensions,
        calculatorOptions: data.allOptions && data.allOptions.length > 0
          ? data.allOptions.map(o => ({
              id: o.id,
              name: o.name,
              selections: o.selections,
              dimensions: o.dimensions,
              lightingQuantities: (o as any).lightingQuantities ?? {},
              activePackage: o.activePackage,
            }))
          : [{
              id: 'A',
              name: 'Option A',
              selections: data.selections,
              dimensions: data.dimensions,
              lightingQuantities: {},
              activePackage: data.activePackage,
            }],
        pipelineStage: PipelineStage.EST_COMPLETED,
        estimateStatus: 'completed' as const,
        estimateSentDate: now,
        updatedAt: now,
      });
      const updatedJob = jobs.find(j => j.id === calculatorSourceJobId);
      if (updatedJob) {
        const jobForModal = {
          ...updatedJob,
          totalAmount, estimateAmount, acceptedBuildSummary,
          calculatorSelections: data.selections,
          calculatorDimensions: data.dimensions,
          pipelineStage: PipelineStage.EST_COMPLETED,
          clientName: data.clientName,
          projectAddress: data.clientAddress,
        };
        // Return the job for the modal via setSelectedJob + the acceptance callback
        // The caller (App.tsx) will handle setCalculatorAcceptanceJob / setShowCalculatorAcceptance
        setSelectedJob(jobForModal);
      }
    } else {
      // Use crypto.randomUUID() — Supabase jobs.id is UUID PRIMARY KEY.
      // The old j-est-${Date.now()} format was rejected by Postgres UUID type,
      // silently failing the INSERT and causing estimates to vanish on next login.
      const newJobId = crypto.randomUUID();
      const newJob: Job = {
        id: newJobId,
        jobNumber: `EST-${new Date().getFullYear()}-${String(data.estimateNumber).padStart(3, '0')}`,
        clientName: data.clientName,
        clientEmail: '',
        clientPhone: '',
        customerPortalToken: crypto.randomUUID(),
        projectAddress: data.clientAddress,
        projectType: data.activePackage
          ? `${data.activePackage.level} Package Deck`
          : 'Custom Deck Build',
        assignedUsers: [],
        assignedCrewOrSubcontractor: '',
        scheduledDate: '',
        currentStage: 0,
        status: JobStatus.SCHEDULED,
        pipelineStage: PipelineStage.EST_COMPLETED,
        officeChecklists: createDefaultOfficeChecklists(),
        buildDetails: createDefaultBuildDetails(),
        scopeSummary: acceptedBuildSummary.scopeSummary,
        officeNotes: [],
        siteNotes: [],
        files: [],
        flaggedIssues: [],
        signoffStatus: 'pending',
        invoiceSupportStatus: 'not_required',
        finalSubmissionStatus: 'pending',
        updatedAt: now,
        totalAmount,
        estimateAmount,
        acceptedBuildSummary,
        estimateStatus: 'completed' as const,
        estimateSentDate: now,
        portalStatus: 'ready',
      };
      setJobs(prev => [newJob, ...prev]);
      setSelectedJob(newJob);
      dataService.createJob(newJob).catch(err => console.error('[handleEstimateAccepted] Failed to persist new job:', err));
    }
  }, [calculatorSourceJobId, handleUpdateJob, jobs]);

  // ── Estimate Saved (save + send quote flow) ──────────────────────────────

  const handleEstimateSaved = useCallback(async (data: EstimateSavedData) => {
    const now = new Date().toISOString();
    const totalAmount = Math.round(data.pricingSummary.finalTotal);
    const estimateAmount = Math.round(data.pricingSummary.subTotal);

    const acceptedBuildSummary = {
      optionName: data.activePackage
        ? `${data.activePackage.size} ${data.activePackage.level} Package`
        : 'Custom Deck Build',
      basePrice: estimateAmount,
      addOns: data.pricingSummary.impacts
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .filter((imp: any) => Math.round(imp.value) !== 0)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .map((imp: any) => ({ name: imp.label, price: Math.round(imp.value) })) as { name: string; price: number }[],
      totalPrice: totalAmount,
      acceptedDate: now,
      scopeSummary: data.pricingSummary.impacts
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .filter((imp: any) => Math.round(imp.value) !== 0)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .map((imp: any) => imp.label)
        .join(', ')
    };

    // Build liveEstimate from impacts + synthetic base-deck line item.
    //
    // The pricing engine adds the base deck cost (sqft × base price + steps +
    // fascia) directly to subTotal without pushing an impact for it. As a
    // result, the itemized estimate used to show only UPGRADES (footings,
    // railings, privacy walls, etc.) with no line for the base deck itself.
    //
    // To fix, we synthesize a "Base Deck Construction" item equal to
    // subTotal − sum(non-zero impacts). This preserves math (line items sum
    // to subTotal) and makes the list read like an actual itemized estimate.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const impactItems: LiveEstimateItem[] = (data.pricingSummary.impacts ?? [])
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .filter((imp: any) => Math.round(imp.value) !== 0)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .map((imp: any, idx: number) => {
        const match = imp.label.match(/\(([^)]+)\)\s*$/);
        return {
          id: `item-${Date.now()}-${idx}`,
          label: match ? imp.label.replace(/\s*\([^)]+\)\s*$/, '').trim() : imp.label,
          quantity: match ? match[1] : '',
          value: Math.round(imp.value),
        } as LiveEstimateItem;
      });

    const impactsSum = impactItems.reduce((s, it) => s + it.value, 0);
    const baseCost = Math.round(data.pricingSummary.subTotal - impactsSum);
    const sqft = Math.round((data.dimensions?.sqft ?? 0));
    const baseItem: LiveEstimateItem | null = baseCost > 0
      ? {
          id: `item-base-${Date.now()}`,
          label: 'Base Deck Construction',
          quantity: sqft > 0 ? `${sqft} sqft` : '',
          value: baseCost,
        }
      : null;

    const liveEstimate: LiveEstimate = {
      items: baseItem ? [baseItem, ...impactItems] : impactItems,
      discount: 0,
      discountNote: '',
      lastUpdated: now,
    };

    let targetJobId = calculatorSourceJobId;
    let portalToken = '';
    let createdNewJob: Job | null = null;
    let supabaseBaseJob: Job | null = null; // captured from existence check for later upsert
    let estimateJobUpdates: Partial<Job> = {}; // populated in existing-job path for upsert

    // ── Resolve the target job for Supabase persistence ──────────────────────
    //
    // Three cases based on the source job's ID format and Supabase state:
    //
    // CASE A — Old j-timestamp ID (created before Session 29 UUID fix):
    //   The job is localStorage-only; Supabase rejects the non-UUID format.
    //   Fix: assign a new UUID, INSERT the migrated job into Supabase, update
    //   local state so the job now has a proper UUID. Then take the UPDATE path
    //   with the migrated ID — no duplicate is created.
    //
    // CASE B — Valid UUID, found in Supabase:
    //   Normal path. Use the Supabase row as the authoritative base for upsert.
    //
    // CASE C — Valid UUID, NOT found in Supabase (failed INSERT previously):
    //   Don't create a duplicate. Use local state as the base for a fresh upsert.
    //   If upsert succeeds the job lands in Supabase. If it fails again the job
    //   stays local — at least no second phantom copy is created.

    const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

    if (targetJobId && isSupabaseConfigured()) {
      const idIsValidUUID = UUID_REGEX.test(targetJobId);

      if (!idIsValidUUID) {
        // ── CASE A: migrate old j-timestamp job to Supabase ─────────────────
        const localJob = jobs.find(j => j.id === targetJobId);
        if (localJob) {
          const migratedId = crypto.randomUUID();
          const migratedJob: Job = {
            ...localJob,
            id: migratedId,
            customerPortalToken: localJob.customerPortalToken || crypto.randomUUID(),
          };
          console.log(`[handleEstimateSaved] CASE A — migrating old-format job "${targetJobId}" → "${migratedId}"`);
          // Replace old ID in local state immediately (avoids phantom duplicate)
          setJobs(prev => prev.map(j => j.id === targetJobId ? { ...j, id: migratedId } : j));
          // Insert the full migrated record into Supabase
          const inserted = await dataService.createJob(migratedJob);
          if (inserted) {
            supabaseBaseJob = inserted;
            console.log('[handleEstimateSaved] CASE A migration INSERT succeeded for', migratedId);
          } else {
            // INSERT failed (logged inside createJob). Use local copy as base;
            // the upsert below will try again with the full estimate payload.
            supabaseBaseJob = migratedJob;
            console.warn('[handleEstimateSaved] CASE A migration INSERT failed — will attempt upsert with estimate data');
          }
          targetJobId = migratedId;
        } else {
          // Old-format ID but job not even in local state — fall through to CREATE
          console.warn(`[handleEstimateSaved] Old-format job ${targetJobId} not found in local state either — creating fresh`);
          targetJobId = null;
        }

      } else {
        // ── CASE B / C: valid UUID ───────────────────────────────────────────
        supabaseBaseJob = await dataService.getJobById(targetJobId);
        if (!supabaseBaseJob) {
          // CASE C: UUID job not in Supabase — use local copy, no duplicate
          const localJob = jobs.find(j => j.id === targetJobId);
          if (localJob) {
            supabaseBaseJob = localJob;
            console.warn(`[handleEstimateSaved] CASE C — job ${targetJobId} not in Supabase, using local base for upsert`);
          } else {
            // Not in Supabase OR local state — create fresh
            console.warn(`[handleEstimateSaved] Job ${targetJobId} not found anywhere — creating fresh`);
            targetJobId = null;
          }
        } else {
          console.log(`[handleEstimateSaved] CASE B — job ${targetJobId} found in Supabase, upsert will update`);
        }
      }
    }

    if (targetJobId) {
      const existingJob = jobs.find(j => j.id === targetJobId);
      portalToken = existingJob?.customerPortalToken || crypto.randomUUID();
      // Capture updates for the authoritative upsert below (estimateData added later)
      estimateJobUpdates = {
        clientName: data.clientName,
        projectAddress: data.clientAddress,
        totalAmount,
        estimateAmount,
        acceptedBuildSummary,
        liveEstimate,
        calculatorSelections: data.selections,
        calculatorDimensions: data.dimensions,
        // Persist the full options array so the estimator can be fully
        // restored when reopened from the pipeline. This captures every
        // option (A, B, C…) with its exact dimensions, selections, and
        // lighting — not just the active option.
        calculatorOptions: data.allOptions && data.allOptions.length > 0
          ? data.allOptions.map(o => ({
              id: o.id,
              name: o.name,
              selections: o.selections,
              dimensions: o.dimensions,
              lightingQuantities: (o as any).lightingQuantities ?? {},
              activePackage: o.activePackage,
            }))
          : [{
              id: 'A',
              name: 'Option A',
              selections: data.selections,
              dimensions: data.dimensions,
              lightingQuantities: {},
              activePackage: data.activePackage,
            }],
        pipelineStage: PipelineStage.EST_SENT,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        estimateStatus: 'sent' as any,
        estimateSentDate: now,
        nurtureSequence: NurtureSequence.ESTIMATE_FOLLOW_UP,
        nurtureStatus: 'active',
        nurtureStep: 0,
        followUpStatus: 'scheduled',
        followUpReason: 'Estimate sent - automated follow-up sequence active',
        lastContactDate: now,
        dripCampaign: {
          campaignType: 'ESTIMATE_FOLLOW_UP',
          startedAt: now,
          currentTouch: 1,
          completedTouches: ['est-fu1-day0'],
          status: 'active',
          sentMessages: [{ touchId: 'est-fu1-day0', channel: 'email' as const, sentAt: now, engagementTier: 'COLD' }],
        },
        updatedAt: now,
      };
      handleUpdateJob(targetJobId, estimateJobUpdates);
    } else {
      // ── NEW JOB from estimator ──────────────────────────────────────────
      // CRITICAL: use crypto.randomUUID() not `j-est-${Date.now()}`.
      // Supabase jobs.id is UUID PRIMARY KEY — a text ID like j-est-1716... fails
      // the INSERT silently (.catch only logs). The job lands in localStorage only
      // and disappears the next time loadJobs() from Supabase replaces local state.
      const newJobId = crypto.randomUUID();
      portalToken = crypto.randomUUID();
      targetJobId = newJobId; // set early so estimateData uses it below

      // Build estimateData HERE (before createJob) to avoid the race condition
      // where handleUpdateJob({ estimateData }) fires an UPDATE before the INSERT
      // has been acknowledged by Supabase. Including estimateData in the initial
      // payload means it's persisted atomically with the rest of the job.
      // eslint-disable-next-line prefer-const
      let earlyUpdatedOptions: EstimateOption[];
      if (data.allOptions && data.allOptions.length > 0) {
        earlyUpdatedOptions = data.allOptions.map((opt, idx) => {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const impacts = (opt.pricingSummary?.impacts ?? []) as any[];
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const nonZeroImpacts = impacts.filter((imp: any) => Math.round(imp.value) !== 0);
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const impactItems = nonZeroImpacts.map((imp: any, i: number) => {
            const match = imp.label.match(/\(([^)]+)\)\s*$/);
            return { id: `opt-${opt.id}-item-${Date.now()}-${i}`, label: match ? imp.label.replace(/\s*\([^)]+\)\s*$/, '').trim() : imp.label, quantity: match ? match[1] : '', value: Math.round(imp.value) };
          });
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const optSum = impactItems.reduce((s: number, it: any) => s + it.value, 0);
          const optBase = Math.round(opt.pricingSummary.subTotal - optSum);
          const optSqft = Math.round(opt.dimensions?.sqft ?? 0);
          const optItems = optBase > 0 ? [{ id: `opt-${opt.id}-item-base-${Date.now()}`, label: 'Base Deck Construction', quantity: optSqft > 0 ? `${optSqft} sqft` : '', value: optBase }, ...impactItems] : impactItems;
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const sel = (opt.selections ?? {}) as Record<string, any>;
          const deckingName = sel.decking?.name ? `${sel.decking.brand ? sel.decking.brand + ' ' : ''}${sel.decking.name}` : 'Standard Decking';
          const framingName = sel.framing?.name || '2×8 PT @ 16" OC (Standard)';
          const railingName = sel.railing?.name ? `${sel.railing.brand ? sel.railing.brand + ' ' : ''}${sel.railing.name}` : 'No Railing';
          const foundationName = sel.foundation?.name || 'Concrete Deck Blocks (Standard)';
          const deckStr = deckingName.toLowerCase();
          const materialWarranty = /azek|timbertech/.test(deckStr) ? '50-Year Material' : /fiberon|trex|clubhouse|eva-?last/.test(deckStr) ? '25-Year Material' : /cedar/.test(deckStr) ? '10-Year Natural Wood' : '5-Year PT Lumber';
          return { id: `opt-${opt.id}-${Date.now()}-${idx}`, name: opt.name, title: opt.activePackage ? `${opt.activePackage.size} ${opt.activePackage.level} Package` : '', description: nonZeroImpacts.map(i => i.label).filter(l => !/^upgrade\s+/i.test(l)).slice(0, 3).join(' · ') || 'Custom deck build', price: Math.round(opt.pricingSummary.finalTotal), features: nonZeroImpacts.map(i => i.label), differences: [], itemizedItems: optItems, keyFeatures: { decking: deckingName, framing: framingName, railing: railingName, foundation: foundationName, materialWarranty, workmanshipWarranty: '5-Year Workmanship Warranty', addOns: [] } };
        });
      } else {
        earlyUpdatedOptions = [{ id: `opt-${Date.now()}`, name: data.activePackage ? `${data.activePackage.level}` : 'Custom', title: data.activePackage ? `${data.activePackage.size} ${data.activePackage.level} Package` : '', description: acceptedBuildSummary.scopeSummary || '', price: totalAmount, features: data.pricingSummary.impacts?.filter((imp: any) => Math.round(imp.value) !== 0)?.map((imp: any) => imp.label) || [], differences: [] }];
      }
      const earlyEstimateData: EstimateData = { options: earlyUpdatedOptions, addOns: [] };

      const newJob: Job = {
        id: newJobId,
        jobNumber: `EST-${new Date().getFullYear()}-${String(data.estimateNumber).padStart(3, '0')}`,
        clientName: data.clientName,
        clientEmail: '',
        clientPhone: '',
        customerPortalToken: portalToken,
        projectAddress: data.clientAddress,
        projectType: data.activePackage
          ? `${data.activePackage.level} Package Deck`
          : 'Custom Deck Build',
        assignedUsers: [],
        assignedCrewOrSubcontractor: '',
        scheduledDate: '',
        currentStage: 0,
        status: JobStatus.SCHEDULED,
        pipelineStage: PipelineStage.EST_SENT,
        officeChecklists: createDefaultOfficeChecklists(),
        buildDetails: createDefaultBuildDetails(),
        scopeSummary: acceptedBuildSummary.scopeSummary,
        officeNotes: [],
        siteNotes: [],
        files: [],
        flaggedIssues: [],
        signoffStatus: 'pending',
        invoiceSupportStatus: 'not_required',
        finalSubmissionStatus: 'pending',
        updatedAt: now,
        totalAmount,
        estimateAmount,
        acceptedBuildSummary,
        liveEstimate,
        estimateData: earlyEstimateData,   // ← included in initial INSERT, no race
        calculatorSelections: data.selections,
        calculatorDimensions: data.dimensions,
        calculatorOptions: data.allOptions && data.allOptions.length > 0
          ? data.allOptions.map(o => ({
              id: o.id,
              name: o.name,
              selections: o.selections,
              dimensions: o.dimensions,
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              lightingQuantities: (o as any).lightingQuantities ?? {},
              activePackage: o.activePackage,
            }))
          : [{
              id: 'A',
              name: 'Option A',
              selections: data.selections,
              dimensions: data.dimensions,
              lightingQuantities: {},
              activePackage: data.activePackage,
            }],
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        estimateStatus: 'sent' as any,
        estimateSentDate: now,
        portalStatus: 'ready',
        nurtureSequence: NurtureSequence.ESTIMATE_FOLLOW_UP,
        nurtureStatus: 'active',
        nurtureStep: 0,
        followUpStatus: 'scheduled',
        followUpReason: 'Estimate sent - 3/4/7 day follow-up sequence',
        lastContactDate: now,
        dripCampaign: {
          campaignType: 'ESTIMATE_FOLLOW_UP',
          startedAt: now,
          currentTouch: 1,
          completedTouches: ['est-fu1-day0'],
          status: 'active',
          sentMessages: [{ touchId: 'est-fu1-day0', channel: 'email' as const, sentAt: now, engagementTier: 'COLD' }],
        },
      };
      setJobs(prev => [newJob, ...prev]);
      const savedJob = await dataService.createJob(newJob);
      if (!savedJob) {
        // createJob returns null when Supabase INSERT fails (error is logged inside
        // createJob). The job is in local state so it looks fine right now, but
        // will vanish on the next page refresh when loadJobs() replaces local state.
        // Log with enough context to diagnose via Supabase dashboard logs.
        console.error(
          '[handleEstimateSaved] createJob returned null — Supabase INSERT failed.',
          'Job ID:', newJobId, '| Org ID:', newJob.org_id ?? 'MISSING',
          '| estimateData present:', !!newJob.estimateData,
        );
      }
      createdNewJob = newJob;
    }

    // Build and persist estimateData for portal multi-option view.
    // For NEW jobs, estimateData was already included in the createJob payload above.
    // For EXISTING jobs, we re-compute and update via handleUpdateJob.
    const existingJob = jobs.find(j => j.id === targetJobId);
    let updatedOptions: EstimateOption[];

    if (data.allOptions && data.allOptions.length > 0) {
      // Multi-option estimate path — used for ALL saves now (single or multi).
      // Builds rich EstimateOption objects with itemizedItems + keyFeatures
      // for every option. Replaces the full options array (estimator is source
      // of truth). The old single-option legacy path below is only a fallback
      // when allOptions is missing entirely (pre-migration data).
      updatedOptions = data.allOptions.map((opt, idx) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const impacts = (opt.pricingSummary?.impacts ?? []) as any[];
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const nonZeroImpacts = impacts.filter((imp: any) => Math.round(imp.value) !== 0);
        const featureLabels = nonZeroImpacts.map((imp) => imp.label);

        // Build per-option itemized list (same shape as liveEstimate items).
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const impactItems = nonZeroImpacts.map((imp: any, i: number) => {
          const match = imp.label.match(/\(([^)]+)\)\s*$/);
          return {
            id: `opt-${opt.id}-item-${Date.now()}-${i}`,
            label: match ? imp.label.replace(/\s*\([^)]+\)\s*$/, '').trim() : imp.label,
            quantity: match ? match[1] : '',
            value: Math.round(imp.value),
          };
        });
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const optSum = impactItems.reduce((s: number, it: any) => s + it.value, 0);
        const optBase = Math.round(opt.pricingSummary.subTotal - optSum);
        const optSqft = Math.round(opt.dimensions?.sqft ?? 0);
        const optItems = optBase > 0
          ? [
              {
                id: `opt-${opt.id}-item-base-${Date.now()}`,
                label: 'Base Deck Construction',
                quantity: optSqft > 0 ? `${optSqft} sqft` : '',
                value: optBase,
              },
              ...impactItems,
            ]
          : impactItems;

        // Derive structured keyFeatures from the selections on this option.
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const sel = (opt.selections ?? {}) as Record<string, any>;
        const deckingName = sel.decking?.name
          ? `${sel.decking.brand ? sel.decking.brand + ' ' : ''}${sel.decking.name}`
          : 'Standard Decking';
        const framingName = sel.framing?.name || '2×8 PT @ 16" OC (Standard)';
        const railingName = sel.railing?.name
          ? `${sel.railing.brand ? sel.railing.brand + ' ' : ''}${sel.railing.name}`
          : 'No Railing';
        const foundationName = sel.foundation?.name || 'Concrete Deck Blocks (Standard)';

        // Material warranty lookup based on decking brand
        const deckingStr = deckingName.toLowerCase();
        let materialWarranty = 'No Material Warranty';
        if (/azek|timbertech/.test(deckingStr)) materialWarranty = '50-Year Material';
        else if (/trex\s+transcend|trex\s+signature/.test(deckingStr)) materialWarranty = '50-Year Material';
        else if (/fiberon|trex|clubhouse|eva-?last/.test(deckingStr)) materialWarranty = '25-Year Material';
        else if (/pressure.?treated|\bpt\b|cedar/.test(deckingStr)) materialWarranty = 'No Material Warranty';

        // Collect add-ons from impact labels that don't match the main categories
        const addOns: string[] = [];
        for (const label of featureLabels) {
          const l = label.toLowerCase();
          if (/decking|framing|railing|foundation/.test(l)) continue;
          if (/privacy|skirting|lighting|pergola|drink|cover|landscaping|extended|warranty/.test(l)) {
            addOns.push(label);
          }
        }

        return {
          id: `opt-${opt.id}-${Date.now()}-${idx}`,
          name: opt.name,
          title: opt.activePackage
            ? `${opt.activePackage.size} ${opt.activePackage.level} Package`
            : '',
          description: featureLabels.filter(l => !/^upgrade\s+/i.test(l)).slice(0, 3).join(' · ') || 'Custom deck build',
          price: Math.round(opt.pricingSummary.finalTotal),
          features: featureLabels,
          differences: [],
          itemizedItems: optItems,
          keyFeatures: {
            decking: deckingName,
            framing: framingName,
            railing: railingName,
            foundation: foundationName,
            materialWarranty,
            workmanshipWarranty: '5-Year Workmanship Warranty',
            addOns,
          },
        };
      });
    } else {
      // Single-option legacy path (also covers allOptions.length === 1)
      const existingOptions: EstimateOption[] = existingJob?.estimateData?.options || [];
      const newOptionName = data.activePackage ? `${data.activePackage.level}` : 'Custom';
      const newOption: EstimateOption = {
        id: `opt-${Date.now()}`,
        name: newOptionName,
        title: data.activePackage
          ? `${data.activePackage.size} ${data.activePackage.level} Package`
          : '',
        description: acceptedBuildSummary.scopeSummary || '',
        price: totalAmount,
        features: data.pricingSummary.impacts
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          ?.filter((imp: any) => Math.round(imp.value) !== 0)
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          ?.map((imp: any) => imp.label) || [],
        differences: [],
      };
      updatedOptions = [
        ...existingOptions.filter(o => o.name !== newOptionName),
        newOption,
      ];
    }

    const estimateData: EstimateData = {
      options: updatedOptions,
      addOns: existingJob?.estimateData?.addOns || [],
    };
    // For NEW jobs estimateData was already baked into the createJob payload above —
    // skip the redundant UPDATE to avoid a race condition where UPDATE fires before
    // the INSERT is acknowledged by Supabase.
    if (!createdNewJob) {
      handleUpdateJob(targetJobId!, { estimateData });
      // Authoritative upsert — sends the COMPLETE merged job to Supabase.
      // This guarantees persistence even if the handleUpdateJob UPDATE silently
      // hits 0 rows (which happens when Supabase returns success but no row
      // was matched, e.g. RLS blocks without error or concurrent state issue).
      // The upsert result confirms whether the write landed.
      if (supabaseBaseJob) {
        const mergedJob: Job = {
          ...supabaseBaseJob,
          ...(estimateJobUpdates as Partial<Job>),
          estimateData,
          updatedAt: now,
        };
        const upsertResult = await dataService.upsertJob(mergedJob);
        if (!upsertResult) {
          console.error(
            '[handleEstimateSaved] upsertJob failed for existing job. Job ID:', targetJobId,
            '| pipeline_stage in merged job:', mergedJob.pipelineStage,
            '| estimateData present:', !!mergedJob.estimateData,
          );
        } else {
          console.log('[handleEstimateSaved] upsertJob succeeded for job', targetJobId, '— pipeline_stage:', upsertResult.pipelineStage);
        }
      }
    }

    // Send HTML estimate email (or fallback to mailto if no email on file)
    const portalUrl = `${window.location.origin}?portal=${portalToken}`;
    const clientEmail = jobs.find(j => j.id === targetJobId)?.clientEmail || '';
    sendEstimateEmail(clientEmail, data.clientName, portalUrl, totalAmount, data.estimateNumber, data.clientAddress);

    // Generate itemized estimate PDF and attach to job files (async, non-blocking)
    const jobNumberForPdf = createdNewJob?.jobNumber
      ?? jobs.find(j => j.id === targetJobId)?.jobNumber
      ?? `EST-${new Date().getFullYear()}-${String(data.estimateNumber).padStart(3, '0')}`;
    const existingFilesForPdf = createdNewJob?.files
      ?? jobs.find(j => j.id === targetJobId)?.files
      ?? [];
    const capturedTargetJobId = targetJobId;
    ;(async () => {
      try {
        const { generateEstimatePDF } = await import('../utils/estimatePdf');
        const pdfDataUri = await generateEstimatePDF({
          jobNumber: jobNumberForPdf,
          clientName: data.clientName,
          clientAddress: data.clientAddress,
          estimateDate: now,
          lineItems: data.pricingSummary.impacts ?? [],
          subTotal: data.pricingSummary.subTotal,
          hst: data.pricingSummary.hst,
          total: data.pricingSummary.finalTotal,
          monthly: data.pricingSummary.monthly,
        });
        const pdfFile = {
          id: `estimate-pdf-${Date.now()}`,
          name: `Estimate-${jobNumberForPdf}.pdf`,
          url: pdfDataUri,
          type: 'estimate' as const,
          uploadedAt: now,
          uploadedBy: 'system',
        };
        const filteredFiles = existingFilesForPdf.filter((f: { type: string }) => f.type !== 'estimate');
        handleUpdateJob(capturedTargetJobId!, { files: [...filteredFiles, pdfFile] });
      } catch (pdfErr) {
        console.warn('[estimate-pdf] generation failed:', pdfErr);
      }
    })();

    // Navigate to estimate detail.
    // IMPORTANT: spread estimateData into selectedJob so the detail view and
    // portal see all options immediately — the jobs[] state update is async
    // and selectedJob must reflect the save outcome before navigation.
    const updatedJob = createdNewJob ?? jobs.find(j => j.id === targetJobId);
    if (updatedJob) {
      setSelectedJob({
        ...updatedJob,
        totalAmount,
        estimateAmount,
        acceptedBuildSummary,
        liveEstimate,
        estimateData,          // ← critical: ensures all options are visible immediately
        pipelineStage: PipelineStage.EST_SENT,
      });
    }
    navigateTo('estimate-detail', targetJobId);
  }, [calculatorSourceJobId, handleUpdateJob, jobs, navigateTo]);

  // ── Return ───────────────────────────────────────────────────────────────

  return {
    jobs,
    setJobs,
    selectedJob,
    setSelectedJob,
    handleUpdateJob,
    handleDeleteJob,
    handleUpdatePipelineStage,
    handleEstimateAccepted,
    handleEstimateSaved,
    stripPhotoDataUris,
    calculatorSourceJobId,
    setCalculatorSourceJobId,
  };
}
