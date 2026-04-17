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
import { supabase } from '../lib/supabase';
import { dataService } from '../services/dataService';
import { generateEstimatePDF } from '../utils/estimatePdf';
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
        : `Custom Estimate #${data.estimateNumber}`,
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
      const newJobId = `j-est-${Date.now()}`;
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
      // D-02: Persist to Supabase — was missing, new jobs from calculator vanished on refresh
      dataService.createJob(newJob).catch(err => console.error('[handleEstimateAccepted] Failed to persist new job:', err));
    }
  }, [calculatorSourceJobId, handleUpdateJob, jobs]);

  // ── Estimate Saved (save + send quote flow) ──────────────────────────────

  const handleEstimateSaved = useCallback((data: EstimateSavedData) => {
    const now = new Date().toISOString();
    const totalAmount = Math.round(data.pricingSummary.finalTotal);
    const estimateAmount = Math.round(data.pricingSummary.subTotal);

    const acceptedBuildSummary = {
      optionName: data.activePackage
        ? `${data.activePackage.size} ${data.activePackage.level} Package`
        : `Custom Estimate #${data.estimateNumber}`,
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

    // Build liveEstimate from impacts
    const liveEstimate: LiveEstimate = {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      items: (data.pricingSummary.impacts ?? [])
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
        }),
      discount: 0,
      discountNote: '',
      lastUpdated: now,
    };

    let targetJobId = calculatorSourceJobId;
    let portalToken = '';
    let createdNewJob: Job | null = null;

    if (targetJobId) {
      const existingJob = jobs.find(j => j.id === targetJobId);
      portalToken = existingJob?.customerPortalToken || crypto.randomUUID();
      handleUpdateJob(targetJobId, {
        clientName: data.clientName,
        projectAddress: data.clientAddress,
        totalAmount,
        estimateAmount,
        acceptedBuildSummary,
        liveEstimate,
        calculatorSelections: data.selections,
        calculatorDimensions: data.dimensions,
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
      });
    } else {
      const newJobId = `j-est-${Date.now()}`;
      portalToken = crypto.randomUUID();
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
      dataService.createJob(newJob).catch(err => console.error('Failed to persist estimate job:', err));
      targetJobId = newJobId;
      createdNewJob = newJob;
    }

    // Build and persist estimateData for portal multi-option view.
    // When the estimator sent `allOptions` with >1 entry, persist ALL
    // options as a clean snapshot (replacing any previously-saved options
    // for this estimate). Otherwise fall back to single-option merge logic.
    const existingJob = jobs.find(j => j.id === targetJobId);
    let updatedOptions: EstimateOption[];

    if (data.allOptions && data.allOptions.length > 1) {
      // Multi-option estimate: map each option to an EstimateOption and
      // replace the full options array. No dedup/merge since each option
      // in the estimator is the source of truth.
      updatedOptions = data.allOptions.map((opt, idx) => ({
        id: `opt-${opt.id}-${Date.now()}-${idx}`,
        name: opt.name,
        title: opt.activePackage
          ? `${opt.activePackage.size} ${opt.activePackage.level} Package`
          : `Custom Estimate #${data.estimateNumber}-${opt.id}`,
        description: opt.pricingSummary.impacts
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          ?.filter((imp: any) => Math.round(imp.value) !== 0)
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          ?.map((imp: any) => imp.label).join(', ') || '',
        price: Math.round(opt.pricingSummary.finalTotal),
        features: opt.pricingSummary.impacts
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          ?.filter((imp: any) => Math.round(imp.value) !== 0)
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          ?.map((imp: any) => imp.label) || [],
        differences: [],
      }));
    } else {
      // Single-option legacy path (also covers allOptions.length === 1)
      const existingOptions: EstimateOption[] = existingJob?.estimateData?.options || [];
      const newOptionName = data.activePackage ? `${data.activePackage.level}` : 'Custom';
      const newOption: EstimateOption = {
        id: `opt-${Date.now()}`,
        name: newOptionName,
        title: data.activePackage
          ? `${data.activePackage.size} ${data.activePackage.level} Package`
          : `Custom Estimate #${data.estimateNumber}`,
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
    handleUpdateJob(targetJobId!, { estimateData });

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

    // Navigate to estimate detail
    const updatedJob = createdNewJob ?? jobs.find(j => j.id === targetJobId);
    if (updatedJob) {
      setSelectedJob({ ...updatedJob, totalAmount, estimateAmount, acceptedBuildSummary, liveEstimate, pipelineStage: PipelineStage.EST_SENT });
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
