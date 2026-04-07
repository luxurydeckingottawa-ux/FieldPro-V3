import { Job, PipelineStage, ScheduleStatus, OfficeReviewStatus } from '../types';

export interface JobIssue {
  type: 'warning' | 'error' | 'info';
  label: string;
  description?: string;
}

export const getJobIssues = (job: Job): JobIssue[] => {
  const issues: JobIssue[] = [];

  // 1. Stage-specific logic
  switch (job.pipelineStage) {
    case PipelineStage.JOB_SOLD: {
      const soldChecklist = job.officeChecklists?.find(cl => cl.stage === PipelineStage.JOB_SOLD);
      if (soldChecklist) {
        // Based on OFFICE_CHECKLIST_CONFIG in constants.ts
        // 0: Signed contract confirmed
        // 2: Deposit paid
        if (soldChecklist.items[0] && !soldChecklist.items[0].completed) {
          issues.push({ type: 'error', label: 'Contract Missing', description: 'Signed contract not confirmed' });
        }
        if (soldChecklist.items[2] && !soldChecklist.items[2].completed) {
          issues.push({ type: 'error', label: 'Deposit Missing', description: 'Deposit not paid' });
        }
      }
      if (!job.plannedStartDate) {
        issues.push({ type: 'warning', label: 'Start Date Missing' });
      }
      break;
    }

    case PipelineStage.ADMIN_SETUP:
    case PipelineStage.PRE_PRODUCTION: {
      if (!job.assignedCrewOrSubcontractor) {
        issues.push({ type: 'error', label: 'Assignment Missing' });
      }
      if (!job.plannedStartDate) {
        issues.push({ type: 'error', label: 'Start Date Missing' });
      }
      
      const hasBuildPlan = job.files?.some(f => f.type === 'drawing');
      if (!hasBuildPlan) {
        issues.push({ type: 'warning', label: 'Build Plan Missing' });
      }
      break;
    }

    case PipelineStage.READY_TO_START: {
      if (!job.assignedCrewOrSubcontractor) {
        issues.push({ type: 'error', label: 'Assignment Missing' });
      }
      const readyChecklist = job.officeChecklists?.find(cl => cl.stage === PipelineStage.READY_TO_START);
      const allReady = readyChecklist?.items.every(i => i.completed);
      if (!allReady) {
        issues.push({ type: 'error', label: 'Start Prep Incomplete' });
      }
      break;
    }

    case PipelineStage.IN_FIELD:
      if (job.fieldForecast?.status === ScheduleStatus.BEHIND || job.fieldForecast?.status === ScheduleStatus.DELAYED) {
        issues.push({ type: 'error', label: 'Behind Schedule', description: job.fieldForecast.delayReason });
      }
      // If field submitted a forecast but it hasn't been "applied" (cleared or synced)
      if (job.fieldForecast && job.fieldForecast.status !== job.officialScheduleStatus) {
        issues.push({ type: 'info', label: 'Office Review Needed', description: 'Field submitted schedule update' });
      }
      break;

    case PipelineStage.COMPLETION:
      if (job.signoffStatus === 'pending') {
        issues.push({ type: 'warning', label: 'Signoff Pending' });
      }
      if (job.completionPackageStatus === 'NOT_SUBMITTED') {
        issues.push({ type: 'warning', label: 'Package Missing' });
      }
      if (job.photoCompletionStatus === 'NOT_CONFIRMED') {
        issues.push({ type: 'warning', label: 'Photos Pending' });
      }
      if (job.officeReviewStatus === OfficeReviewStatus.NOT_READY || job.officeReviewStatus === OfficeReviewStatus.UNDER_REVIEW) {
        issues.push({ type: 'info', label: 'Office Review Needed' });
      }
      if (!job.materialCost || !job.labourCost) {
        issues.push({ type: 'warning', label: 'Costs Missing' });
      }
      break;
  }

  // 2. Global issues
  if (job.flaggedIssues && job.flaggedIssues.length > 0) {
    issues.push({ type: 'error', label: 'Field Issue Flagged', description: job.flaggedIssues[0] });
  }

  return issues;
};

export const getJobReadiness = (job: Job): 'ready' | 'not-ready' | 'needs-attention' => {
  const issues = getJobIssues(job);
  if (issues.some(i => i.type === 'error')) return 'not-ready';
  if (issues.some(i => i.type === 'warning')) return 'needs-attention';
  return 'ready';
};
