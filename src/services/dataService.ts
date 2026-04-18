/**
 * Data Service Layer
 * 
 * All data read/write operations go through this service.
 * When Supabase is configured, data goes to the database.
 * When it's not (local dev), data falls back to localStorage.
 * 
 * This means the rest of the app never calls localStorage directly.
 * When we flip on Supabase, everything just works across devices.
 */

import { supabase, isSupabaseConfigured, LUXURY_DECKING_ORG_ID } from '../lib/supabase';
import { safeSetItem, safeGetItem } from '../utils/storage';
import { Job, EstimatorIntake, ChatSession, User, Invoice, Customer, JobNote, JobFile, Role } from '../types';
import { APP_USERS } from '../constants';

// Supabase row shapes for notes, files, and chat messages
interface SupabaseNoteRow {
  id: string;
  job_id: string;
  author: string;
  text: string;
  created_at: string;
  note_type: 'office' | 'site';
}

interface SupabaseFileRow {
  id: string;
  job_id: string;
  name: string;
  url: string;
  file_type: JobFile['type'];
  uploaded_at: string;
}

interface SupabaseChatMessageRow {
  id: string;
  sender_id: string;
  sender_name: string;
  text: string;
  created_at: string;
  is_from_client: boolean;
  status: string;
  template_id?: string;
}

// ============================================================
// Type converters: camelCase (app) <-> snake_case (database)
// ============================================================

function jobToRow(job: Job): Record<string, unknown> {
  return {
    id: job.id,
    org_id: LUXURY_DECKING_ORG_ID,
    job_number: job.jobNumber,
    client_name: job.clientName,
    client_phone: job.clientPhone || null,
    client_email: job.clientEmail || null,
    project_address: job.projectAddress,
    latitude: job.latitude || null,
    longitude: job.longitude || null,
    project_type: job.projectType,
    assigned_users: job.assignedUsers || [],
    assigned_crew: job.assignedCrewOrSubcontractor || '',
    scheduled_date: job.scheduledDate || null,
    material_delivery_date: job.materialDeliveryDate || null,
    scope_summary: job.scopeSummary || '',
    current_stage: job.currentStage || 0,
    status: job.status,
    pipeline_stage: job.pipelineStage,
    signoff_status: job.signoffStatus || 'pending',
    invoice_support_status: job.invoiceSupportStatus || 'not_required',
    final_submission_status: job.finalSubmissionStatus || 'pending',
    field_status: job.fieldStatus || null,
    completion_package_status: job.completionPackageStatus || null,
    photo_completion_status: job.photoCompletionStatus || null,
    completion_readiness_status: job.completionReadinessStatus || null,
    office_review_status: job.officeReviewStatus || 'NOT_READY',
    planned_start_date: job.plannedStartDate || null,
    planned_duration_days: job.plannedDurationDays || null,
    planned_finish_date: job.plannedFinishDate || null,
    official_schedule_status: job.officialScheduleStatus || null,
    material_cost: job.materialCost || null,
    labour_cost: job.labourCost || null,
    total_amount: job.totalAmount || null,
    paid_amount: job.paidAmount || null,
    estimate_amount: job.estimateAmount || null,
    lifecycle_stage: job.lifecycleStage || null,
    lead_source: job.leadSource || null,
    assigned_salesperson: job.assignedSalesperson || null,
    last_contact_date: job.lastContactDate || null,
    next_follow_up_date: job.nextFollowUpDate || null,
    follow_up_status: job.followUpStatus || null,
    follow_up_reason: job.followUpReason || null,
    lost_reason: job.lostReason || null,
    portal_status: job.portalStatus || 'not_set',
    engagement_heat: job.engagementHeat || null,
    estimate_status: job.estimateStatus || null,
    estimate_sent_date: job.estimateSentDate || null,
    accepted_option_id: job.acceptedOptionId || null,
    accepted_option_name: job.acceptedOptionName || null,
    accepted_date: job.acceptedDate || null,
    deposit_status: job.depositStatus || null,
    sold_workflow_status: job.soldWorkflowStatus || null,
    deposit_amount: job.depositAmount || null,
    verified_build_passport_url: job.verifiedBuildPassportUrl || null,
    subcontractor_invoice_url: job.subcontractorInvoiceUrl || null,
    customer_portal_token: job.customerPortalToken || null,
    // JSONB fields
    office_checklists: job.officeChecklists || [],
    build_details: job.buildDetails || {},
    field_forecast: job.fieldForecast || null,
    forecast_review_status: job.forecastReviewStatus || null,
    field_progress: job.fieldProgress || null,
    time_entries: job.timeEntries || [],
    estimate_data: job.estimateData || null,
    accepted_build_summary: job.acceptedBuildSummary || null,
    portal_engagement: job.portalEngagement || null,
    ai_insights: job.aiInsights || null,
    next_action: job.nextAction || null,
    activities: job.activities || [],
    selected_add_on_ids: job.selectedAddOnIds || null,
    flagged_issues: job.flaggedIssues || [],
    nurture_sequence: job.nurtureSequence || null,
    nurture_step: job.nurtureStep || null,
    nurture_status: job.nurtureStatus || null,
    post_project_status: job.postProjectStatus || null,
    drip_campaign: job.dripCampaign || null,
  };
}

export function rowToJob(row: Record<string, unknown>): Job {
  return {
    id: row.id,
    jobNumber: row.job_number,
    clientName: row.client_name,
    clientPhone: row.client_phone,
    clientEmail: row.client_email,
    projectAddress: row.project_address,
    latitude: row.latitude,
    longitude: row.longitude,
    projectType: row.project_type,
    assignedUsers: row.assigned_users || [],
    assignedCrewOrSubcontractor: row.assigned_crew || '',
    scheduledDate: row.scheduled_date || '',
    materialDeliveryDate: row.material_delivery_date,
    scopeSummary: row.scope_summary || '',
    currentStage: row.current_stage || 0,
    status: row.status,
    pipelineStage: row.pipeline_stage,
    signoffStatus: row.signoff_status || 'pending',
    invoiceSupportStatus: row.invoice_support_status || 'not_required',
    finalSubmissionStatus: row.final_submission_status || 'pending',
    fieldStatus: row.field_status,
    completionPackageStatus: row.completion_package_status,
    photoCompletionStatus: row.photo_completion_status,
    completionReadinessStatus: row.completion_readiness_status,
    officeReviewStatus: row.office_review_status,
    updatedAt: row.updated_at,
    plannedStartDate: row.planned_start_date,
    plannedDurationDays: row.planned_duration_days,
    plannedFinishDate: row.planned_finish_date,
    officialScheduleStatus: row.official_schedule_status,
    materialCost: row.material_cost,
    labourCost: row.labour_cost,
    totalAmount: row.total_amount,
    paidAmount: row.paid_amount,
    estimateAmount: row.estimate_amount,
    lifecycleStage: row.lifecycle_stage,
    leadSource: row.lead_source,
    assignedSalesperson: row.assigned_salesperson,
    lastContactDate: row.last_contact_date,
    nextFollowUpDate: row.next_follow_up_date,
    followUpStatus: row.follow_up_status,
    followUpReason: row.follow_up_reason,
    lostReason: row.lost_reason,
    portalStatus: row.portal_status,
    engagementHeat: row.engagement_heat,
    estimateStatus: row.estimate_status,
    estimateSentDate: row.estimate_sent_date,
    acceptedOptionId: row.accepted_option_id,
    acceptedOptionName: row.accepted_option_name,
    acceptedDate: row.accepted_date,
    depositStatus: row.deposit_status,
    soldWorkflowStatus: row.sold_workflow_status,
    depositAmount: row.deposit_amount,
    verifiedBuildPassportUrl: row.verified_build_passport_url,
    subcontractorInvoiceUrl: row.subcontractor_invoice_url,
    customerPortalToken: row.customer_portal_token,
    officeChecklists: row.office_checklists || [],
    buildDetails: row.build_details,
    fieldForecast: row.field_forecast,
    forecastReviewStatus: row.forecast_review_status,
    fieldProgress: row.field_progress,
    timeEntries: row.time_entries || [],
    geofenceReminders: row.geofence_reminders || [],
    estimateData: row.estimate_data,
    acceptedBuildSummary: row.accepted_build_summary,
    portalEngagement: row.portal_engagement,
    aiInsights: row.ai_insights,
    nextAction: row.next_action,
    activities: row.activities || [],
    selectedAddOnIds: row.selected_add_on_ids,
    flaggedIssues: row.flagged_issues || [],
    nurtureSequence: row.nurture_sequence,
    nurtureStep: row.nurture_step,
    nurtureStatus: row.nurture_status,
    postProjectStatus: row.post_project_status,
    dripCampaign: row.drip_campaign || undefined,
    officeNotes: [], // loaded separately from job_notes table
    siteNotes: [],
    files: [], // loaded separately from job_files table
  } as Job;
}

// ============================================================
// INVOICE converters
// ============================================================

function invoiceToRow(invoice: Invoice): Record<string, unknown> {
  return {
    id: invoice.id,
    org_id: LUXURY_DECKING_ORG_ID,
    job_id: invoice.jobId,
    invoice_number: invoice.invoiceNumber,
    customer_name: invoice.customerName,
    customer_phone: invoice.customerPhone || null,
    customer_email: invoice.customerEmail || null,
    job_title: invoice.jobTitle,
    job_address: invoice.jobAddress,
    type: invoice.type,
    status: invoice.status,
    subtotal: invoice.subtotal,
    hst_rate: invoice.hstRate,
    hst_amount: invoice.hstAmount,
    total: invoice.total,
    description: invoice.description,
    issued_date: invoice.issuedDate || null,
    due_date: invoice.dueDate || null,
    paid_date: invoice.paidDate || null,
    notes: invoice.notes || null,
    created_at: invoice.createdAt || new Date().toISOString(),
  };
}

function rowToInvoice(row: Record<string, unknown>): Invoice {
  return {
    id: row.id,
    invoiceNumber: row.invoice_number,
    jobId: row.job_id,
    customerName: row.customer_name,
    customerPhone: row.customer_phone,
    customerEmail: row.customer_email,
    jobTitle: row.job_title,
    jobAddress: row.job_address,
    type: row.type,
    status: row.status,
    subtotal: Number(row.subtotal),
    hstRate: Number(row.hst_rate),
    hstAmount: Number(row.hst_amount),
    total: Number(row.total),
    description: row.description,
    issuedDate: row.issued_date,
    dueDate: row.due_date,
    paidDate: row.paid_date,
    notes: row.notes,
    createdAt: row.created_at,
  };
}

// ============================================================
// CUSTOMER converters
// ============================================================

function customerToRow(customer: Customer): Record<string, unknown> {
  return {
    id: customer.id,
    org_id: LUXURY_DECKING_ORG_ID,
    first_name: customer.firstName,
    last_name: customer.lastName,
    display_name: customer.displayName,
    company: customer.company || null,
    email: customer.email || null,
    phone: customer.phone || null,
    home_phone: customer.homePhone || null,
    customer_type: customer.customerType,
    status: customer.status,
    addresses: customer.addresses || [],
    tags: customer.tags || [],
    notes: customer.notes || '',
    lead_source: customer.leadSource || null,
    lifetime_value: customer.lifetimeValue || 0,
    last_service_date: customer.lastServiceDate || null,
    hcp_id: customer.hcpId || null,
    do_not_service: customer.doNotService || false,
    created_at: customer.createdAt || new Date().toISOString(),
  };
}

function rowToCustomer(row: Record<string, unknown>): Customer {
  return {
    id: row.id,
    firstName: row.first_name || '',
    lastName: row.last_name || '',
    displayName: row.display_name || '',
    phone: row.phone || '',
    homePhone: row.home_phone,
    email: row.email || '',
    company: row.company,
    customerType: row.customer_type || 'homeowner',
    addresses: row.addresses || [],
    tags: row.tags || [],
    notes: row.notes || '',
    leadSource: row.lead_source,
    lifetimeValue: Number(row.lifetime_value) || 0,
    lastServiceDate: row.last_service_date,
    hcpId: row.hcp_id,
    createdAt: row.created_at,
    status: row.status || 'cold_lead',
    doNotService: row.do_not_service || false,
  };
}

// ============================================================
// JOBS
// ============================================================

export const dataService = {
  // ----- JOBS -----

  async loadJobs(): Promise<Job[]> {
    if (isSupabaseConfigured()) {
      const { data, error } = await supabase!
        .from('jobs')
        .select('*')
        .order('updated_at', { ascending: false });
      
      if (error) {
        console.error('Failed to load jobs from Supabase:', error);
        return [];
      }

      // Also load notes and files for each job
      const jobs = (data || []).map(rowToJob);
      
      // Batch load notes and files
      const jobIds = jobs.map(j => j.id);
      if (jobIds.length > 0) {
        const [notesResult, filesResult] = await Promise.all([
          supabase!.from('job_notes').select('*').in('job_id', jobIds),
          supabase!.from('job_files').select('*').in('job_id', jobIds),
        ]);

        const notesByJob: Record<string, JobNote[]> = {};
        const filesByJob: Record<string, JobFile[]> = {};

        (notesResult.data || []).forEach(n => {
          if (!notesByJob[n.job_id]) notesByJob[n.job_id] = [];
          notesByJob[n.job_id].push({
            id: n.id,
            author: n.author,
            text: n.text,
            timestamp: n.created_at,
            type: n.note_type,
          });
        });

        (filesResult.data || []).forEach(f => {
          if (!filesByJob[f.job_id]) filesByJob[f.job_id] = [];
          filesByJob[f.job_id].push({
            id: f.id,
            name: f.name,
            url: f.url,
            type: f.file_type,
            uploadedAt: f.uploaded_at,
          });
        });

        jobs.forEach(job => {
          const allNotes = notesByJob[job.id] || [];
          job.officeNotes = allNotes.filter(n => n.type === 'office');
          job.siteNotes = allNotes.filter(n => n.type === 'site');
          job.files = filesByJob[job.id] || [];
        });
      }

      return jobs;
    }
    
    // localStorage fallback
    try {
      const saved = safeGetItem('luxury_decking_jobs_v5');
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      console.error('Failed to parse jobs from localStorage:', e);
      return [];
    }
  },

  async getJobById(jobId: string): Promise<Job | null> {
    if (!isSupabaseConfigured()) return null;
    const { data, error } = await supabase!.from('jobs').select('*').eq('id', jobId).single();
    if (error || !data) return null;
    const job = rowToJob(data);
    const [notesResult, filesResult] = await Promise.all([
      supabase!.from('job_notes').select('*').eq('job_id', jobId),
      supabase!.from('job_files').select('*').eq('job_id', jobId),
    ]);
    const allNotes = (notesResult.data || []).map((n: SupabaseNoteRow) => ({
      id: n.id, author: n.author, text: n.text, timestamp: n.created_at, type: n.note_type,
    }));
    job.officeNotes = allNotes.filter((n: JobNote) => n.type === 'office');
    job.siteNotes = allNotes.filter((n: JobNote) => n.type === 'site');
    job.files = (filesResult.data || []).map((f: SupabaseFileRow) => ({
      id: f.id, name: f.name, url: f.url, type: f.file_type, uploadedAt: f.uploaded_at,
    }));
    return job;
  },

  async getJobByPortalToken(token: string): Promise<Job | null> {
    if (isSupabaseConfigured()) {
      const { data, error } = await supabase!
        .from('jobs')
        .select('*')
        .eq('customer_portal_token', token)
        .single();
      if (error || !data) return null;
      return rowToJob(data);
    }
    // localStorage fallback
    try {
      const saved = safeGetItem('luxury_decking_jobs_v5');
      const jobs: Job[] = saved ? JSON.parse(saved) : [];
      return jobs.find(j => j.customerPortalToken === token) || null;
    } catch (e) {
      return null;
    }
  },

  async saveJobs(jobs: Job[]): Promise<void> {
    if (isSupabaseConfigured()) {
      // With Supabase, individual updates are handled by updateJob/createJob.
      // This bulk save is only used for localStorage mode.
      return;
    }
    safeSetItem('luxury_decking_jobs_v5', JSON.stringify(jobs));
  },

  async createJob(job: Job): Promise<Job | null> {
    if (isSupabaseConfigured()) {
      const row = jobToRow(job);
      const { data, error } = await supabase!
        .from('jobs')
        .insert(row)
        .select()
        .single();
      
      if (error) {
        console.error('Failed to create job:', error);
        return null;
      }

      // Insert notes
      const allNotes = [
        ...(job.officeNotes || []).map(n => ({ ...n, note_type: 'office' })),
        ...(job.siteNotes || []).map(n => ({ ...n, note_type: 'site' })),
      ];
      if (allNotes.length > 0) {
        await supabase!.from('job_notes').insert(
          allNotes.map(n => ({
            id: n.id,
            job_id: job.id,
            org_id: LUXURY_DECKING_ORG_ID,
            author: n.author,
            text: n.text,
            note_type: n.note_type || n.type,
          }))
        );
      }

      // Insert files
      if (job.files?.length) {
        await supabase!.from('job_files').insert(
          job.files.map(f => ({
            id: f.id,
            job_id: job.id,
            org_id: LUXURY_DECKING_ORG_ID,
            name: f.name,
            url: f.url,
            file_type: f.type,
          }))
        );
      }

      return rowToJob(data);
    }
    
    // localStorage: handled by the caller saving the full jobs array
    return job;
  },

  async upsertJob(job: Job): Promise<Job | null> {
    if (isSupabaseConfigured()) {
      const row = jobToRow(job);
      const { data, error } = await supabase!
        .from('jobs')
        .upsert(row, { onConflict: 'id' })
        .select()
        .single();
      if (error) {
        console.error('[upsertJob] Supabase upsert failed:', error);
        return null;
      }
      return data ? rowToJob(data as Record<string, unknown>) : null;
    }
    return job;
  },

  async updateJob(jobId: string, updates: Partial<Job>): Promise<void> {
    if (isSupabaseConfigured()) {
      // Convert only the provided updates to snake_case
      const row: Record<string, unknown> = {};
      const keyMap: Record<string, string> = {
        jobNumber: 'job_number', clientName: 'client_name', clientPhone: 'client_phone',
        clientEmail: 'client_email', projectAddress: 'project_address',
        projectType: 'project_type', assignedUsers: 'assigned_users',
        assignedCrewOrSubcontractor: 'assigned_crew', scheduledDate: 'scheduled_date',
        materialDeliveryDate: 'material_delivery_date', scopeSummary: 'scope_summary',
        currentStage: 'current_stage', status: 'status', pipelineStage: 'pipeline_stage',
        signoffStatus: 'signoff_status', invoiceSupportStatus: 'invoice_support_status',
        finalSubmissionStatus: 'final_submission_status', fieldStatus: 'field_status',
        completionPackageStatus: 'completion_package_status',
        photoCompletionStatus: 'photo_completion_status',
        completionReadinessStatus: 'completion_readiness_status',
        officeReviewStatus: 'office_review_status',
        plannedStartDate: 'planned_start_date', plannedDurationDays: 'planned_duration_days',
        plannedFinishDate: 'planned_finish_date', officialScheduleStatus: 'official_schedule_status',
        materialCost: 'material_cost', labourCost: 'labour_cost',
        totalAmount: 'total_amount', paidAmount: 'paid_amount', estimateAmount: 'estimate_amount',
        lifecycleStage: 'lifecycle_stage', leadSource: 'lead_source',
        assignedSalesperson: 'assigned_salesperson', lastContactDate: 'last_contact_date',
        nextFollowUpDate: 'next_follow_up_date', followUpStatus: 'follow_up_status',
        followUpReason: 'follow_up_reason', lostReason: 'lost_reason',
        portalStatus: 'portal_status', engagementHeat: 'engagement_heat',
        estimateStatus: 'estimate_status', estimateSentDate: 'estimate_sent_date',
        acceptedOptionId: 'accepted_option_id', acceptedOptionName: 'accepted_option_name',
        acceptedDate: 'accepted_date', depositStatus: 'deposit_status',
        soldWorkflowStatus: 'sold_workflow_status', depositAmount: 'deposit_amount',
        verifiedBuildPassportUrl: 'verified_build_passport_url',
        subcontractorInvoiceUrl: 'subcontractor_invoice_url',
        customerPortalToken: 'customer_portal_token',
        officeChecklists: 'office_checklists', buildDetails: 'build_details',
        fieldForecast: 'field_forecast', forecastReviewStatus: 'forecast_review_status',
        fieldProgress: 'field_progress', timeEntries: 'time_entries',
        estimateData: 'estimate_data', acceptedBuildSummary: 'accepted_build_summary',
        portalEngagement: 'portal_engagement', aiInsights: 'ai_insights',
        nextAction: 'next_action', activities: 'activities',
        selectedAddOnIds: 'selected_add_on_ids', flaggedIssues: 'flagged_issues',
        nurtureSequence: 'nurture_sequence', nurtureStep: 'nurture_step',
        nurtureStatus: 'nurture_status', postProjectStatus: 'post_project_status',
        dripCampaign: 'drip_campaign',
        // Fields previously missing from keyMap (added per SCOUT/ATLAS audit D-01)
        digitalWorkOrder: 'digital_work_order',
        needsJobSetup: 'needs_job_setup',
        liveEstimate: 'live_estimate',
        calculatorSelections: 'calculator_selections',
        calculatorDimensions: 'calculator_dimensions',
        calculatorOptions: 'calculator_options',
        customerSignature: 'customer_signature',
        customerSignatureCloudinaryUrl: 'customer_signature_cloudinary_url',
        contractPdfUrl: 'contract_pdf_url',
        contractSignedDate: 'contract_signed_date',
        depositRequestedDate: 'deposit_requested_date',
        invoices: 'invoices',
        jobFiles: 'job_files_json',
        description: 'description',
        acceptedPackageTier: 'accepted_package_tier',
        acceptedMonthlyPayment: 'accepted_monthly_payment',
        declinedReason: 'declined_reason',
        notes: 'notes',
        siteNotes: 'site_notes',
        officeNotes: 'office_notes',
      };

      for (const [camelKey, value] of Object.entries(updates)) {
        const snakeKey = keyMap[camelKey];
        if (snakeKey) {
          row[snakeKey] = value;
        }
      }

      if (Object.keys(row).length > 0) {
        const { error } = await supabase!
          .from('jobs')
          .update(row)
          .eq('id', jobId);

        if (error) {
          console.error('Failed to update job:', error);
          throw new Error(`Supabase update failed: ${error.message}`);
        }
      }
      return;
    }
    
    // localStorage: handled by the caller saving the full jobs array
  },

  async deleteJob(jobId: string): Promise<void> {
    if (isSupabaseConfigured()) {
      const { error } = await supabase!
        .from('jobs')
        .delete()
        .eq('id', jobId);
      if (error) {
        console.error('Failed to delete job:', error);
        throw new Error(`Supabase delete failed: ${error.message}`);
      }
    }
    // localStorage: handled by the caller filtering the jobs array
  },

  /**
   * Upsert files into the job_files table.
   * Safe to call with an empty array (no-op).
   * Skips files whose URL is a raw data URI (too large for DB — must be a Cloudinary URL).
   */
  async saveFiles(jobId: string, files: { id: string; name: string; url: string; type: string; uploadedAt?: string }[]): Promise<void> {
    if (!isSupabaseConfigured()) return;
    const validFiles = files.filter(f => f.url && !f.url.startsWith('data:'));
    if (!validFiles.length) return;
    const rows = validFiles.map(f => ({
      id: f.id,
      job_id: jobId,
      org_id: LUXURY_DECKING_ORG_ID,
      name: f.name,
      url: f.url,
      file_type: f.type,
      uploaded_at: f.uploadedAt || new Date().toISOString(),
    }));
    const { error } = await supabase!
      .from('job_files')
      .upsert(rows, { onConflict: 'id' });
    if (error) {
      console.error('Failed to save files:', error);
    }
  },

  // ----- ESTIMATOR INTAKES -----

  async saveEstimatorIntake(intake: EstimatorIntake): Promise<void> {
    if (isSupabaseConfigured()) {
      const row = {
        job_id: intake.jobId,
        org_id: LUXURY_DECKING_ORG_ID,
        checklist: intake.checklist,
        measure_sheet: intake.measureSheet,
        sketch: intake.sketch,
        photos: intake.photos,
        notes: intake.notes,
        status: intake.status,
        ai_insights: intake.aiInsights || null,
      };

      // Upsert: if an intake already exists for this job, update it
      const { error } = await supabase!
        .from('estimator_intakes')
        .upsert(row, { onConflict: 'job_id' })
        .select();
      
      if (error) {
        // If upsert fails (no unique constraint on job_id yet), try insert then update
        const { error: insertError } = await supabase!
          .from('estimator_intakes')
          .insert(row);
        
        if (insertError) {
          // Try update instead
          await supabase!
            .from('estimator_intakes')
            .update(row)
            .eq('job_id', intake.jobId);
        }
      }
      return;
    }
    
    // localStorage fallback
    safeSetItem(`estimator_intake_${intake.jobId}`, JSON.stringify(intake));
  },

  async loadEstimatorIntake(jobId: string): Promise<EstimatorIntake | null> {
    if (isSupabaseConfigured()) {
      const { data, error } = await supabase!
        .from('estimator_intakes')
        .select('*')
        .eq('job_id', jobId)
        .order('updated_at', { ascending: false })
        .limit(1)
        .single();
      
      if (error || !data) return null;

      return {
        jobId: data.job_id,
        checklist: data.checklist,
        measureSheet: data.measure_sheet,
        sketch: data.sketch,
        photos: data.photos,
        notes: data.notes,
        status: data.status,
        updatedAt: data.updated_at,
        aiInsights: data.ai_insights,
      };
    }
    
    // localStorage fallback
    try {
      const saved = safeGetItem(`estimator_intake_${jobId}`);
      return saved ? JSON.parse(saved) : null;
    } catch (e) {
      return null;
    }
  },

  async loadAllEstimatorIntakes(): Promise<EstimatorIntake[]> {
    if (isSupabaseConfigured()) {
      const { data, error } = await supabase!
        .from('estimator_intakes')
        .select('*')
        .order('updated_at', { ascending: false });
      
      if (error || !data) return [];

      return data.map(row => ({
        jobId: row.job_id,
        checklist: row.checklist,
        measureSheet: row.measure_sheet,
        sketch: row.sketch,
        photos: row.photos,
        notes: row.notes,
        status: row.status,
        updatedAt: row.updated_at,
        aiInsights: row.ai_insights,
      }));
    }
    
    // localStorage fallback: scan for all intake keys
    const intakes: EstimatorIntake[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith('estimator_intake_')) {
        try {
          const data = JSON.parse(localStorage.getItem(key) || '');
          if (data) intakes.push(data);
        } catch (e) { /* skip malformed entries */ }
      }
    }
    return intakes;
  },

  /** Load intakes that are marked as submitted / completed (ready for office to pick up) */
  async loadPendingIntakes(): Promise<EstimatorIntake[]> {
    if (isSupabaseConfigured()) {
      const { data, error } = await supabase!
        .from('estimator_intakes')
        .select('*')
        .in('status', ['completed', 'submitted_to_office'])
        .order('updated_at', { ascending: false });
      
      if (error || !data) return [];

      return data.map(row => ({
        jobId: row.job_id,
        checklist: row.checklist,
        measureSheet: row.measure_sheet,
        sketch: row.sketch,
        photos: row.photos,
        notes: row.notes,
        status: row.status,
        updatedAt: row.updated_at,
        aiInsights: row.ai_insights,
      }));
    }
    
    // localStorage fallback
    return (await this.loadAllEstimatorIntakes()).filter(
      i => i.status === 'completed' || (i.status as string) === 'submitted_to_office'
    );
  },

  // ----- CHAT -----

  async loadChatSessions(): Promise<ChatSession[]> {
    if (isSupabaseConfigured()) {
      const { data, error } = await supabase!
        .from('chat_sessions')
        .select('*, chat_messages(*)')
        .order('last_message_at', { ascending: false });
      
      if (error || !data) return [];

      return data.map(row => ({
        id: row.id,
        jobId: row.job_id,
        clientName: row.client_name,
        clientPhone: row.client_phone,
        clientEmail: row.client_email,
        unreadCount: row.unread_count,
        lastMessage: row.last_message,
        lastMessageTimestamp: row.last_message_at,
        messages: (row.chat_messages || []).map((m: SupabaseChatMessageRow) => ({
          id: m.id,
          senderId: m.sender_id,
          senderName: m.sender_name,
          text: m.text,
          timestamp: m.created_at,
          isFromClient: m.is_from_client,
          status: m.status,
          templateId: m.template_id,
        })),
      }));
    }
    
    // localStorage fallback
    try {
      const saved = safeGetItem('luxury_decking_chat_v1');
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      return [];
    }
  },

  async saveChatSessions(sessions: ChatSession[]): Promise<void> {
    if (isSupabaseConfigured()) {
      // Individual chat operations handled elsewhere
      return;
    }
    safeSetItem('luxury_decking_chat_v1', JSON.stringify(sessions));
  },

  // ----- AUTH -----

  async signIn(email: string, password: string): Promise<User | null> {
    if (isSupabaseConfigured()) {
      const { data: authData, error: authError } = await supabase!.auth.signInWithPassword({
        email,
        password,
      });

      if (authError || !authData.user) {
        throw new Error(authError?.message || 'Invalid email or password.');
      }

      // Load profile
      const { data: profile, error: profileError } = await supabase!
        .from('profiles')
        .select('*')
        .eq('id', authData.user.id)
        .single();

      if (profileError || !profile) {
        throw new Error('Account profile not found. Contact your administrator.');
      }

      // Map Supabase UUID back to APP_USERS mock ID (by email) so that
      // job.assignedUsers entries (which store mock IDs) match currentUser.id.
      const appUser = APP_USERS.find(u => u.email.toLowerCase() === profile.email.toLowerCase());
      return {
        id: appUser?.id || profile.id,
        email: profile.email,
        name: profile.name || appUser?.name || '',
        role: (profile.role || appUser?.role) as Role,
      };
    }

    // localStorage/mock fallback: handled by the caller using APP_USERS
    return null;
  },

  async signOut(): Promise<void> {
    if (isSupabaseConfigured()) {
      await supabase!.auth.signOut();
    }
  },

  async getCurrentUser(): Promise<User | null> {
    if (isSupabaseConfigured()) {
      const { data: { user } } = await supabase!.auth.getUser();
      if (!user) return null;

      const { data: profile } = await supabase!
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (!profile) return null;

      return {
        id: profile.id,
        email: profile.email,
        name: profile.name,
        role: profile.role as Role,
      };
    }
    return null;
  },

  // ----- INVOICES -----

  async loadInvoices(): Promise<Invoice[]> {
    if (isSupabaseConfigured()) {
      const { data, error } = await supabase!
        .from('invoices')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Failed to load invoices from Supabase:', error);
        return [];
      }

      return (data || []).map(rowToInvoice);
    }

    // localStorage fallback
    try {
      const saved = safeGetItem('fieldpro_invoices_v1');
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      console.error('Failed to parse invoices from localStorage:', e);
      return [];
    }
  },

  async createInvoice(invoice: Invoice): Promise<Invoice> {
    if (isSupabaseConfigured()) {
      const row = invoiceToRow(invoice);
      const { data, error } = await supabase!
        .from('invoices')
        .insert(row)
        .select()
        .single();

      if (error) {
        console.error('Failed to create invoice:', error);
        return invoice; // return the original on failure so UI still works
      }

      return rowToInvoice(data);
    }

    // localStorage fallback
    const existing = await this.loadInvoices();
    existing.unshift(invoice);
    safeSetItem('fieldpro_invoices_v1', JSON.stringify(existing));
    return invoice;
  },

  async updateInvoice(invoiceId: string, updates: Partial<Invoice>): Promise<void> {
    if (isSupabaseConfigured()) {
      const row: Record<string, unknown> = {};
      const keyMap: Record<string, string> = {
        invoiceNumber: 'invoice_number',
        jobId: 'job_id',
        customerName: 'customer_name',
        customerPhone: 'customer_phone',
        customerEmail: 'customer_email',
        jobTitle: 'job_title',
        jobAddress: 'job_address',
        type: 'type',
        status: 'status',
        subtotal: 'subtotal',
        hstRate: 'hst_rate',
        hstAmount: 'hst_amount',
        total: 'total',
        description: 'description',
        issuedDate: 'issued_date',
        dueDate: 'due_date',
        paidDate: 'paid_date',
        notes: 'notes',
      };

      for (const [camelKey, value] of Object.entries(updates)) {
        const snakeKey = keyMap[camelKey];
        if (snakeKey) {
          row[snakeKey] = value;
        }
      }

      if (Object.keys(row).length > 0) {
        const { error } = await supabase!
          .from('invoices')
          .update(row)
          .eq('id', invoiceId);

        if (error) {
          console.error('Failed to update invoice:', error);
          throw new Error(`Supabase invoice update failed: ${error.message}`);
        }
      }
      return;
    }

    // localStorage fallback
    const existing = await this.loadInvoices();
    const idx = existing.findIndex(i => i.id === invoiceId);
    if (idx !== -1) {
      existing[idx] = { ...existing[idx], ...updates };
      safeSetItem('fieldpro_invoices_v1', JSON.stringify(existing));
    }
  },

  async deleteInvoice(invoiceId: string): Promise<void> {
    if (isSupabaseConfigured()) {
      const { error } = await supabase!
        .from('invoices')
        .delete()
        .eq('id', invoiceId);
      if (error) {
        console.error('Failed to delete invoice:', error);
        throw new Error(`Supabase invoice delete failed: ${error.message}`);
      }
      return;
    }

    // localStorage fallback
    const existing = await this.loadInvoices();
    const filtered = existing.filter(i => i.id !== invoiceId);
    safeSetItem('fieldpro_invoices_v1', JSON.stringify(filtered));
  },

  // ----- CUSTOMERS -----

  async loadCustomers(): Promise<Customer[]> {
    if (isSupabaseConfigured()) {
      const { data, error } = await supabase!
        .from('customers')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Failed to load customers from Supabase:', error);
        return [];
      }

      return (data || []).map(rowToCustomer);
    }

    // localStorage fallback
    try {
      const saved = safeGetItem('fieldpro_customers_v1');
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      console.error('Failed to parse customers from localStorage:', e);
      return [];
    }
  },

  async createCustomer(customer: Customer): Promise<Customer> {
    if (isSupabaseConfigured()) {
      const row = customerToRow(customer);
      const { data, error } = await supabase!
        .from('customers')
        .insert(row)
        .select()
        .single();

      if (error) {
        console.error('Failed to create customer:', error);
        return customer;
      }

      return rowToCustomer(data);
    }

    // localStorage fallback
    const existing = await this.loadCustomers();
    existing.unshift(customer);
    safeSetItem('fieldpro_customers_v1', JSON.stringify(existing));
    return customer;
  },

  async updateCustomer(customerId: string, updates: Partial<Customer>): Promise<void> {
    if (isSupabaseConfigured()) {
      const row: Record<string, unknown> = {};
      const keyMap: Record<string, string> = {
        firstName: 'first_name',
        lastName: 'last_name',
        displayName: 'display_name',
        company: 'company',
        email: 'email',
        phone: 'phone',
        homePhone: 'home_phone',
        customerType: 'customer_type',
        status: 'status',
        addresses: 'addresses',
        tags: 'tags',
        notes: 'notes',
        leadSource: 'lead_source',
        lifetimeValue: 'lifetime_value',
        lastServiceDate: 'last_service_date',
        doNotService: 'do_not_service',
      };

      for (const [camelKey, value] of Object.entries(updates)) {
        const snakeKey = keyMap[camelKey];
        if (snakeKey) {
          row[snakeKey] = value;
        }
      }

      if (Object.keys(row).length > 0) {
        const { error } = await supabase!
          .from('customers')
          .update(row)
          .eq('id', customerId);

        if (error) {
          console.error('Failed to update customer:', error);
          throw new Error(`Supabase customer update failed: ${error.message}`);
        }
      }
      return;
    }

    // localStorage fallback
    const existing = await this.loadCustomers();
    const idx = existing.findIndex(c => c.id === customerId);
    if (idx !== -1) {
      existing[idx] = { ...existing[idx], ...updates };
      safeSetItem('fieldpro_customers_v1', JSON.stringify(existing));
    }
  },
};
