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
import { COMPANY } from '../config/company';

const JOBS_STORAGE_KEY = 'luxury_decking_jobs_v5';

const INTERNAL_SECRET = import.meta.env.VITE_INTERNAL_API_SECRET as string | undefined;
const internalHeaders = (extra: Record<string, string> = {}) => ({
  'Content-Type': 'application/json',
  ...(INTERNAL_SECRET ? { 'X-Internal-Secret': INTERNAL_SECRET } : {}),
  ...extra,
});

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
              fetch('/.netlify/functions/send-sms', {
                method: 'POST',
                headers: internalHeaders(),
                body: JSON.stringify({ to: jobToUpdate.clientPhone, message: messageText }),
              }).then(res => res.json()).then(data => {
                if (!data.success) console.error('Auto SMS failed:', data.error);
              }).catch(err => console.error('Auto SMS error:', err));
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

    // Auto-send Google review request + warranty SMS when job moves to Paid & Closed
    // Respect SMS quiet hours (9 AM – 8 PM) — if outside window, these will
    // need to be sent manually or via a scheduled job.
    if (newStage === PipelineStage.PAID_CLOSED && job) {
      const hour = new Date().getHours();
      const smsOk = hour >= 9 && hour < 20;
      const reviewUrl = import.meta.env.VITE_GOOGLE_REVIEW_URL || 'https://g.page/r/luxury-decking/review';
      const firstName = job.clientName?.split(' ')[0] || 'there';
      const reviewMsg = `Hi ${firstName}, thank you for choosing ${COMPANY.name}! We'd love it if you could take a moment to leave us a Google review: ${reviewUrl} — Your feedback means the world to us!`;
      if (job.clientPhone && smsOk) {
        fetch('/.netlify/functions/send-sms', {
          method: 'POST',
          headers: internalHeaders(),
          body: JSON.stringify({ to: job.clientPhone, message: reviewMsg }),
        }).catch(err => console.warn('[review-sms] failed:', err));
      }

      // Auto-send warranty delivery SMS
      if (job.clientPhone && job.customerPortalToken && smsOk) {
        const portalUrl = `${window.location.origin}?portal=${job.customerPortalToken}`;
        const warrantyMsg = `Hi ${firstName}, your ${COMPANY.name} project is officially complete! Your 5-year warranty is now active. Access your Project Portal and Warranty Package here: ${portalUrl}`;
        fetch('/.netlify/functions/send-sms', {
          method: 'POST',
          headers: internalHeaders(),
          body: JSON.stringify({ to: job.clientPhone, message: warrantyMsg }),
        }).catch(err => console.warn('[warranty-sms] failed:', err));
      }

      // Auto-send warranty delivery EMAIL
      if (job.clientEmail && job.customerPortalToken) {
        const portalUrl = `${window.location.origin}?portal=${job.customerPortalToken}`;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const pdfUrl = (job as any).verifiedBuildPassportUrl as string | undefined;
        const warrantyHtml = `<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;background:#0a0a0a;color:#fff;padding:40px;border-radius:16px">
  <div style="text-align:center;margin-bottom:32px">
    <p style="margin:0;font-size:11px;font-weight:900;color:#c9a227;letter-spacing:3px;text-transform:uppercase">${COMPANY.name}</p>
    <h1 style="margin:8px 0 0;font-size:28px;font-weight:900;color:#fff">Your Project is Complete!</h1>
  </div>
  <p style="color:#aaa;font-size:15px;line-height:1.6">Hi ${firstName},</p>
  <p style="color:#aaa;font-size:15px;line-height:1.6">Your ${COMPANY.name} project is officially complete. Your <strong style="color:#c9a227">5-year warranty is now active</strong>.</p>
  <div style="background:#111;border:1px solid #333;border-radius:12px;padding:24px;margin:24px 0;text-align:center">
    <p style="margin:0 0 4px;font-size:11px;font-weight:900;color:#888;letter-spacing:2px;text-transform:uppercase">Your Warranty</p>
    <p style="margin:0;font-size:20px;font-weight:900;color:#c9a227">5-Year Structural Warranty</p>
    <p style="margin:4px 0 0;font-size:13px;color:#666">Access your full warranty certificate and project documentation below</p>
  </div>
  <a href="${portalUrl}" style="display:block;background:#c9a227;color:#000;text-align:center;padding:16px;border-radius:12px;font-weight:900;text-decoration:none;font-size:14px;letter-spacing:1px;text-transform:uppercase;margin:24px 0">Access Your Project Portal \u2192</a>
  ${pdfUrl ? `<a href="${pdfUrl}" style="display:block;border:1px solid #333;color:#c9a227;text-align:center;padding:14px;border-radius:12px;font-weight:700;text-decoration:none;font-size:13px;margin:0 0 24px 0">Download Warranty Certificate (PDF)</a>` : ''}
  <p style="color:#555;font-size:12px;text-align:center">Questions? Call us at ${COMPANY.phone}<br>${COMPANY.name} \u2014 ${COMPANY.fullAddress}</p>
</div>`;
        fetch('/.netlify/functions/send-email', {
          method: 'POST',
          headers: internalHeaders(),
          body: JSON.stringify({
            to: job.clientEmail,
            subject: `Your ${COMPANY.name} Warranty is Now Active`,
            htmlBody: warrantyHtml,
          }),
        }).catch(err => console.warn('[warranty-email] failed:', err));
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

    // Build and persist estimateData for portal multi-option view
    const existingJob = jobs.find(j => j.id === targetJobId);
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
    const updatedOptions = [
      ...existingOptions.filter(o => o.name !== newOptionName),
      newOption,
    ];
    const estimateData: EstimateData = {
      options: updatedOptions,
      addOns: existingJob?.estimateData?.addOns || [],
    };
    handleUpdateJob(targetJobId!, { estimateData });

    // Send HTML estimate email
    const portalUrl = `${window.location.origin}?portal=${portalToken}`;
    const clientEmail = jobs.find(j => j.id === targetJobId)?.clientEmail || '';
    if (clientEmail) {
      const estimateHtml = `<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;background:#0a0a0a;color:#fff;padding:40px;border-radius:16px">
  <div style="text-align:center;margin-bottom:32px">
    <p style="margin:0;font-size:11px;font-weight:900;color:#c9a227;letter-spacing:3px;text-transform:uppercase">${COMPANY.name}</p>
    <h1 style="margin:8px 0 0;font-size:28px;font-weight:900;color:#fff">Your Custom Estimate is Ready</h1>
  </div>
  <p style="color:#aaa;font-size:15px;line-height:1.6">Hi ${data.clientName},</p>
  <p style="color:#aaa;font-size:15px;line-height:1.6">Thank you for your interest in ${COMPANY.name}. Your custom deck estimate is ready to review online.</p>
  <div style="background:#111;border:1px solid #333;border-radius:12px;padding:24px;margin:24px 0">
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px">
      <span style="font-size:11px;font-weight:900;color:#888;letter-spacing:2px;text-transform:uppercase">Estimate Total</span>
      <span style="font-size:28px;font-weight:900;color:#c9a227">$${totalAmount.toLocaleString()}</span>
    </div>
    <div style="border-top:1px solid #222;padding-top:12px">
      <p style="margin:0;font-size:12px;color:#666">Estimate #${data.estimateNumber} \u2022 ${data.clientAddress}</p>
    </div>
  </div>
  <a href="${portalUrl}" style="display:block;background:#c9a227;color:#000;text-align:center;padding:16px;border-radius:12px;font-weight:900;text-decoration:none;font-size:14px;letter-spacing:1px;text-transform:uppercase;margin:24px 0">Review Your Estimate Online \u2192</a>
  <p style="color:#aaa;font-size:14px;line-height:1.6">Your portal lets you:</p>
  <ul style="color:#888;font-size:14px;line-height:2;padding-left:20px">
    <li>Review the full estimate breakdown</li>
    <li>Accept and secure your spot with a deposit</li>
    <li>Track your project from start to finish</li>
  </ul>
  <p style="color:#555;font-size:12px;text-align:center;margin-top:32px">Questions? Call us at <strong style="color:#c9a227">${COMPANY.phone}</strong> or reply to this email.<br>${COMPANY.name} \u2014 ${COMPANY.fullAddress}</p>
</div>`;
      fetch('/.netlify/functions/send-email', {
        method: 'POST',
        headers: internalHeaders(),
        body: JSON.stringify({
          to: clientEmail,
          subject: `Your ${COMPANY.name} Estimate #${data.estimateNumber} \u2014 $${totalAmount.toLocaleString()}`,
          htmlBody: estimateHtml,
        }),
      }).catch(err => console.warn('[estimate-email] failed:', err));
    } else {
      // Fallback: open mailto if no email on file
      const emailSubject = encodeURIComponent('Your ${COMPANY.name} Estimate');
      const emailBody = encodeURIComponent(
        `Hi ${data.clientName},\n\nYour custom estimate is ready: ${portalUrl}\n\n${COMPANY.name} \u2014 ${COMPANY.phone}`
      );
      const mailLink = document.createElement('a');
      mailLink.href = `mailto:?subject=${emailSubject}&body=${emailBody}`;
      mailLink.click();
    }

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
