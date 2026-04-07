import { PhotoUpload, InvoicingData, User, Role, Job, JobStatus, OfficeReviewStatus, FieldResource, ResourceCategory, ScheduleStatus, PipelineStage, OfficeChecklist, FieldStatus, CompletionPackageStatus, PhotoCompletionStatus, CompletionReadinessStatus, BuildDetails, ChatSession, PipelineAutomation, PunchType, TimeEntry, CustomerLifecycle, DepositStatus, SoldWorkflowStatus } from './types';

export const LOST_REASONS = [
  'Too expensive',
  'No response',
  'Went with competitor',
  'Project postponed',
  'Project cancelled',
  'Timing issue',
  'Other'
];

export const MOCK_USERS: User[] = [
  { id: 'u1', email: 'admin@luxurydecking.ca', password: 'admin', name: 'Admin User', role: Role.ADMIN },
  { id: 'u2', email: 'estimator@luxurydecking.ca', password: 'estimator', name: 'Field Estimator', role: Role.ESTIMATOR },
  { id: 'u3', email: 'field@luxurydecking.ca', password: 'field', name: 'Field Lead', role: Role.FIELD_EMPLOYEE },
  { id: 'u4', email: 'sub@external.ca', password: 'sub', name: 'Subcontractor A', role: Role.SUBCONTRACTOR },
];

export const PIPELINE_STAGES = [
  { id: PipelineStage.JOB_SOLD, label: 'Job Sold' },
  { id: PipelineStage.ADMIN_SETUP, label: 'Admin Setup' },
  { id: PipelineStage.PRE_PRODUCTION, label: 'Pre-Production' },
  { id: PipelineStage.READY_TO_START, label: 'Ready to Start' },
  { id: PipelineStage.IN_FIELD, label: 'In Field' },
  { id: PipelineStage.COMPLETION, label: 'Completion' },
  { id: PipelineStage.PAID_CLOSED, label: 'Paid & Closed' }
];

export const OFFICE_CHECKLIST_CONFIG: Record<PipelineStage, string[]> = {
  [PipelineStage.JOB_SOLD]: [
    "Signed contract confirmed",
    "Send deposit invoice",
    "Deposit paid"
  ],
  [PipelineStage.ADMIN_SETUP]: [
    "Contract / scope documents attached",
    "Set target date",
    "Set job duration (estimated number of days)",
    "Assign installer / subcontractor",
    "Prepare build plan",
    "Upload build plan to file",
    "Prepare material list"
  ],
  [PipelineStage.PRE_PRODUCTION]: [
    "Order material (1 week before start date)",
    "Arrange payment if needed",
    "Book bin if needed",
    "Arrange delivery and notify customer of delivery date",
    "Send 30% invoice upon material delivery"
  ],
  [PipelineStage.READY_TO_START]: [
    "Notify customer of confirmed start date 48 hours before start",
    "Confirm access / parking / site notes",
    "Confirm all necessary docs are attached to file"
  ],
  [PipelineStage.IN_FIELD]: [
    "Daily logs being submitted",
    "Photos being uploaded",
    "Timeline updates confirmed"
  ],
  [PipelineStage.COMPLETION]: [
    "Final walk-through complete",
    "Deficiency list addressed",
    "Final photos uploaded",
    "Client sign-off obtained",
    "Final invoice sent"
  ],
  [PipelineStage.PAID_CLOSED]: [
    "Final payment received",
    "Warranty documents sent",
    "Review request sent",
    "Job archived"
  ]
};

export const createDefaultOfficeChecklists = (): OfficeChecklist[] => {
  return PIPELINE_STAGES.map(stage => ({
    stage: stage.id,
    items: OFFICE_CHECKLIST_CONFIG[stage.id].map((label, i) => ({
      id: `office-${stage.id}-${i}`,
      label,
      completed: false
    }))
  }));
};

export const MOCK_ESTIMATOR_APPOINTMENTS: EstimatorAppointment[] = [
  {
    id: 'apt-1',
    jobId: 'j8',
    clientName: 'Sarah Jenkins',
    address: '452 Maple Ave, Ottawa',
    startTime: new Date(new Date().setHours(10, 30, 0, 0)).toISOString(),
    endTime: new Date(new Date().setHours(11, 30, 0, 0)).toISOString(),
    status: 'confirmed',
    jobNumber: 'LD-2024-008'
  },
  {
    id: 'apt-2',
    jobId: 'j10',
    clientName: 'Robert Wilson',
    address: '128 Oak St, Nepean',
    startTime: new Date(new Date().setHours(14, 0, 0, 0)).toISOString(),
    endTime: new Date(new Date().setHours(15, 0, 0, 0)).toISOString(),
    status: 'confirmed',
    jobNumber: 'LD-2024-010'
  },
  {
    id: 'apt-3',
    jobId: 'j11',
    clientName: 'Emily Chen',
    address: '89 Pine Ridge, Kanata',
    startTime: new Date(new Date().setDate(new Date().getDate() + 1)).toISOString(),
    endTime: new Date(new Date().setDate(new Date().getDate() + 1)).toISOString(),
    status: 'pending',
    jobNumber: 'LD-2024-011'
  }
];

export const MOCK_INSTALL_SCHEDULE: InstallBlock[] = [
  {
    id: 'ins-1',
    jobName: 'Thompson Deck Build',
    crewName: 'Alpha Crew',
    leadName: 'Mike Ross',
    startDate: new Date(new Date().setDate(new Date().getDate() - 2)).toISOString(),
    endDate: new Date(new Date().setDate(new Date().getDate() + 5)).toISOString(),
    progress: 35
  },
  {
    id: 'ins-2',
    jobName: 'Gomez Patio Install',
    crewName: 'Bravo Crew',
    leadName: 'Harvey Specter',
    startDate: new Date(new Date().setDate(new Date().getDate() - 10)).toISOString(),
    endDate: new Date(new Date().setDate(new Date().getDate() - 1)).toISOString(),
    progress: 100
  },
  {
    id: 'ins-3',
    jobName: 'Miller Pool Deck',
    crewName: 'Charlie Crew',
    leadName: 'Louis Litt',
    startDate: new Date(new Date().setDate(new Date().getDate() + 2)).toISOString(),
    endDate: new Date(new Date().setDate(new Date().getDate() + 12)).toISOString(),
    progress: 0
  }
];

export const createDefaultBuildDetails = (): BuildDetails => ({
  sitePrep: {
    demolitionRequired: false,
    permitsRequired: false,
    locatesRequired: false,
    binRequired: false,
    siteProtection: false,
    inspectionRequired: false,
    notes: ''
  },
  footings: {
    type: '',
    attachedToHouse: false,
    floating: false,
    bracketType: '',
    notes: ''
  },
  framing: {
    type: '',
    joistSize: '',
    joistSpacing: '',
    joistProtection: false,
    joistProtectionType: '',
    notes: ''
  },
  landscaping: {
    prepType: '',
    notes: ''
  },
  electrical: {
    lightingIncluded: false,
    lightingType: '',
    roughInNotes: '',
    notes: ''
  },
  decking: {
    type: '',
    brand: '',
    color: '',
    accentNote: '',
    notes: ''
  },
  railing: {
    included: false,
    type: '',
    notes: ''
  },
  skirting: {
    included: false,
    type: '',
    trapDoor: false,
    notes: ''
  },
  stairs: {
    included: false,
    type: '',
    style: '',
    notes: ''
  },
  features: {
    privacyWall: false,
    privacyWallType: '',
    customNotes: ''
  }
});

export const MOCK_JOBS: Job[] = [
  {
    id: 'j1',
    jobNumber: 'LD-2026-001',
    clientName: 'John Smith',
    clientPhone: '613-555-0123',
    clientEmail: 'john.smith@example.com',
    customerPortalToken: 'portal-j1',
    projectAddress: '24 Sussex Dr, Ottawa, ON K1M 1M4',
    latitude: 45.4444,
    longitude: -75.6939,
    projectType: 'Composite Deck w/ Glass Railing',
    assignedUsers: ['u3'],
    assignedCrewOrSubcontractor: 'Luxury Crew A',
    scheduledDate: '2026-03-15',
    currentStage: 1,
    status: JobStatus.IN_PROGRESS,
    pipelineStage: PipelineStage.IN_FIELD,
    officeChecklists: createDefaultOfficeChecklists(),
    buildDetails: createDefaultBuildDetails(),
    scopeSummary: 'Build a 20x15 composite deck with black aluminum glass railings and integrated lighting. Includes removal of existing 10x10 wood deck.',
    officeNotes: [
      { id: 'n1', author: 'Office Admin', text: 'Customer requested extra care around the prize-winning rose bushes on the north side.', timestamp: '2026-03-01T10:00:00Z', type: 'office' },
      { id: 'n2', author: 'Project Manager', text: 'Ensure ledger flashing is tucked under the existing siding properly. Siding is brittle.', timestamp: '2026-03-02T14:30:00Z', type: 'office' }
    ],
    siteNotes: [
      { id: 'n3', author: 'Field Lead', text: 'Site is tight, material delivery should be at the curb, not the driveway.', timestamp: '2026-03-05T08:00:00Z', type: 'site' }
    ],
    files: [
      { id: 'f1', name: 'Approved Site Plan.pdf', url: '#', type: 'drawing', uploadedAt: '2026-03-01T09:00:00Z' },
      { id: 'f2', name: 'Building Permit #12345.pdf', url: '#', type: 'permit', uploadedAt: '2026-03-01T09:05:00Z' }
    ],
    flaggedIssues: [],
    signoffStatus: 'pending',
    invoiceSupportStatus: 'pending',
    finalSubmissionStatus: 'pending',
    fieldStatus: FieldStatus.PENDING,
    completionPackageStatus: CompletionPackageStatus.NOT_SUBMITTED,
    photoCompletionStatus: PhotoCompletionStatus.NOT_CONFIRMED,
    completionReadinessStatus: CompletionReadinessStatus.NOT_READY,
    officeReviewStatus: OfficeReviewStatus.NOT_READY,
    updatedAt: '2026-03-05T08:00:00Z',
    stageUpdatedAt: '2026-03-15T10:00:00Z',
    portalStatus: 'shared',
    plannedStartDate: '2026-03-15',
    plannedDurationDays: 5,
    plannedFinishDate: '2026-03-20',
    officialScheduleStatus: ScheduleStatus.ON_SCHEDULE,
    materialCost: 4500,
    labourCost: 3200,
    fieldForecast: {
      status: ScheduleStatus.ON_SCHEDULE,
      estimatedDaysRemaining: 4,
      note: 'Foundations complete, starting framing tomorrow.',
      updatedAt: '2026-03-16T10:00:00Z',
      updatedBy: 'Field Lead'
    }
  },
  {
    id: 'j2',
    jobNumber: 'LD-2026-002',
    clientName: 'Sarah Johnson',
    clientPhone: '613-555-0456',
    clientEmail: 'sarah.j@example.com',
    customerPortalToken: 'portal-j2',
    projectAddress: '15 Lansdowne Way, Ottawa, ON K1S 5T9',
    latitude: 45.3997,
    longitude: -75.6835,
    projectType: 'Pressure Treated Deck',
    assignedUsers: ['u4'],
    assignedCrewOrSubcontractor: 'Subcontractor A',
    scheduledDate: '2026-03-20',
    currentStage: 0,
    status: JobStatus.SCHEDULED,
    pipelineStage: PipelineStage.READY_TO_START,
    officeChecklists: createDefaultOfficeChecklists(),
    buildDetails: createDefaultBuildDetails(),
    scopeSummary: 'Standard pressure treated deck replacement. 12x12 footprint with 3 steps to grade.',
    officeNotes: [
      { id: 'n4', author: 'Office Admin', text: 'Subcontractor must provide proof of WSIB before starting.', timestamp: '2026-03-05T09:00:00Z', type: 'office' }
    ],
    siteNotes: [],
    files: [
      { id: 'f5', name: 'Standard 12x12 Drawing.pdf', url: '#', type: 'drawing', uploadedAt: '2026-03-05T10:00:00Z' }
    ],
    flaggedIssues: [],
    signoffStatus: 'pending',
    invoiceSupportStatus: 'not_required',
    finalSubmissionStatus: 'pending',
    fieldStatus: FieldStatus.PENDING,
    completionPackageStatus: CompletionPackageStatus.NOT_SUBMITTED,
    photoCompletionStatus: PhotoCompletionStatus.NOT_CONFIRMED,
    completionReadinessStatus: CompletionReadinessStatus.NOT_READY,
    officeReviewStatus: OfficeReviewStatus.NOT_READY,
    updatedAt: '2026-03-05T10:00:00Z',
    stageUpdatedAt: '2026-03-20T09:00:00Z',
    portalStatus: 'ready',
    plannedStartDate: '2026-03-20',
    plannedDurationDays: 3,
    plannedFinishDate: '2026-03-23',
    officialScheduleStatus: ScheduleStatus.ON_SCHEDULE
  },
  {
    id: 'j3',
    jobNumber: 'LD-2026-003',
    clientName: 'Michael Brown',
    clientPhone: '613-555-0789',
    clientEmail: 'm.brown@example.com',
    customerPortalToken: 'portal-j3',
    projectAddress: '45 Glebe Ave, Ottawa, ON K1S 2C1',
    latitude: 45.4035,
    longitude: -75.6885,
    projectType: 'PVC Decking w/ Privacy Screen',
    assignedUsers: [],
    assignedCrewOrSubcontractor: '',
    scheduledDate: '2026-04-01',
    currentStage: 0,
    status: JobStatus.SCHEDULED,
    pipelineStage: PipelineStage.JOB_SOLD,
    officeChecklists: createDefaultOfficeChecklists(),
    buildDetails: createDefaultBuildDetails(),
    scopeSummary: 'Premium PVC deck with custom integrated privacy screens and matching skirting.',
    officeNotes: [
      { id: 'n5', author: 'Sales', text: 'Customer is very particular about the grain orientation of the PVC boards.', timestamp: '2026-03-08T11:00:00Z', type: 'office' }
    ],
    siteNotes: [],
    files: [],
    flaggedIssues: [],
    signoffStatus: 'pending',
    invoiceSupportStatus: 'not_required',
    finalSubmissionStatus: 'pending',
    fieldStatus: FieldStatus.PENDING,
    completionPackageStatus: CompletionPackageStatus.NOT_SUBMITTED,
    photoCompletionStatus: PhotoCompletionStatus.NOT_CONFIRMED,
    completionReadinessStatus: CompletionReadinessStatus.NOT_READY,
    officeReviewStatus: OfficeReviewStatus.NOT_READY,
    updatedAt: '2026-03-08T11:00:00Z',
    plannedStartDate: '2026-04-01',
    plannedDurationDays: 7,
    plannedFinishDate: '2026-04-08',
    officialScheduleStatus: ScheduleStatus.ON_SCHEDULE,
    lifecycleStage: CustomerLifecycle.ESTIMATE_SENT,
    portalStatus: 'shared',
    portalEngagement: {
      totalOpens: 8,
      totalTimeSpentSeconds: 450,
      lastOpenedAt: new Date().toISOString(),
      optionClicks: { 'opt-1': 2, 'opt-2': 5, 'opt-3': 1 },
      addOnInteractions: { 'add-1': 3, 'add-2': 1 }
    },
    estimateData: {
      options: [
        { id: 'opt-1', name: 'Essential', title: 'Pressure Treated', description: 'Standard PT deck.', price: 9500, features: [], differences: [], isRecommended: false },
        { id: 'opt-2', name: 'Signature', title: 'Composite', description: 'Popular composite deck.', price: 14500, features: [], differences: [], isRecommended: true },
        { id: 'opt-3', name: 'Elite', title: 'PVC', description: 'Premium PVC deck.', price: 19500, features: [], differences: [], isRecommended: false }
      ],
      addOns: [
        { id: 'add-1', name: 'Lighting', description: 'LED lighting.', price: 800 },
        { id: 'add-2', name: 'Privacy Screen', description: 'Cedar screen.', price: 1200 }
      ],
      paymentStructure: [
        '10% Deposit to secure your spot in our production queue',
        '40% Material payment 2 weeks before start date',
        '50% Final payment upon project completion'
      ],
      whatHappensNext: [
        { title: 'Accept & Secure Spot', desc: 'Choose your preferred option and pay the 10% deposit. This locks your project into our production calendar.', icon: 'CheckCircle2' },
        { title: 'Project Concierge', desc: 'You\'ll be assigned a dedicated Project Manager who handles all permits, HOA approvals, and utility locates.', icon: 'ShieldCheck' },
        { title: 'Site Finalization', desc: 'We perform a final technical site visit to laser-measure and confirm your color selections.', icon: 'Calendar' },
        { title: 'The Build Experience', desc: 'Construction begins. You\'ll receive daily photo updates and progress reports directly through this portal.', icon: 'Zap' }
      ]
    }
  },
  {
    id: 'j4',
    jobNumber: 'LD-2026-004',
    clientName: 'Emily Davis',
    clientPhone: '613-555-0999',
    clientEmail: 'emily.davis@example.com',
    customerPortalToken: 'portal-j4',
    projectAddress: '12 Rockcliffe Way, Ottawa, ON K1M 1A1',
    latitude: 45.4485,
    longitude: -75.6755,
    projectType: 'Multi-Level Composite Deck',
    assignedUsers: [],
    assignedCrewOrSubcontractor: 'Luxury Crew B',
    scheduledDate: '2026-03-25',
    currentStage: 0,
    status: JobStatus.SCHEDULED,
    pipelineStage: PipelineStage.PRE_PRODUCTION,
    officeChecklists: createDefaultOfficeChecklists(),
    buildDetails: createDefaultBuildDetails(),
    scopeSummary: 'Large multi-level composite deck with wrap-around stairs and built-in planters.',
    officeNotes: [
      { id: 'n6', author: 'Project Manager', text: 'Permit is still pending, follow up with the city on Monday.', timestamp: '2026-03-07T09:30:00Z', type: 'office' }
    ],
    siteNotes: [],
    files: [],
    flaggedIssues: [],
    signoffStatus: 'pending',
    invoiceSupportStatus: 'not_required',
    finalSubmissionStatus: 'pending',
    fieldStatus: FieldStatus.PENDING,
    completionPackageStatus: CompletionPackageStatus.NOT_SUBMITTED,
    photoCompletionStatus: PhotoCompletionStatus.NOT_CONFIRMED,
    completionReadinessStatus: CompletionReadinessStatus.NOT_READY,
    officeReviewStatus: OfficeReviewStatus.NOT_READY,
    updatedAt: '2026-03-07T09:30:00Z',
    plannedStartDate: '2026-03-25',
    plannedDurationDays: 10,
    plannedFinishDate: '2026-04-04',
    officialScheduleStatus: ScheduleStatus.ON_SCHEDULE,
    lifecycleStage: CustomerLifecycle.ESTIMATE_SENT,
    portalStatus: 'shared',
    portalEngagement: {
      totalOpens: 3,
      totalTimeSpentSeconds: 120,
      lastOpenedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
      optionClicks: { 'opt-1': 1, 'opt-2': 2 },
      addOnInteractions: { 'add-1': 1 }
    },
    estimateData: {
      options: [
        { id: 'opt-1', name: 'Essential', title: 'Pressure Treated', description: 'Standard PT deck.', price: 15500, features: [], differences: [], isRecommended: false },
        { id: 'opt-2', name: 'Signature', title: 'Composite', description: 'Popular composite deck.', price: 22500, features: [], differences: [], isRecommended: true }
      ],
      addOns: [
        { id: 'add-1', name: 'Lighting', description: 'LED lighting.', price: 1500 }
      ],
      paymentStructure: [
        '10% Deposit to secure your spot in our production queue',
        '40% Material payment 2 weeks before start date',
        '40% Progress payment upon framing completion',
        '10% Final payment upon project completion'
      ],
      whatHappensNext: [
        { title: 'Accept & Secure Spot', desc: 'Choose your preferred option and pay the 10% deposit. This locks your project into our production calendar.', icon: 'CheckCircle2' },
        { title: 'Project Concierge', desc: 'You\'ll be assigned a dedicated Project Manager who handles all permits, HOA approvals, and utility locates.', icon: 'ShieldCheck' },
        { title: 'Site Finalization', desc: 'We perform a final technical site visit to laser-measure and confirm your color selections.', icon: 'Calendar' },
        { title: 'The Build Experience', desc: 'Construction begins. You\'ll receive daily photo updates and progress reports directly through this portal.', icon: 'Zap' }
      ]
    }
  },
  {
    id: 'j5',
    jobNumber: 'LD-2026-005',
    clientName: 'David Wilson',
    clientPhone: '613-555-0888',
    clientEmail: 'd.wilson@example.com',
    customerPortalToken: 'portal-j5',
    projectAddress: '88 Sunnyside Ave, Ottawa, ON K1S 0P9',
    latitude: 45.3945,
    longitude: -75.6855,
    projectType: 'Deck Repair & Resurfacing',
    assignedUsers: ['u3'],
    assignedCrewOrSubcontractor: 'Luxury Crew A',
    scheduledDate: '2026-03-12',
    currentStage: 0,
    status: JobStatus.SCHEDULED,
    pipelineStage: PipelineStage.READY_TO_START,
    officeChecklists: createDefaultOfficeChecklists(),
    buildDetails: createDefaultBuildDetails(),
    scopeSummary: 'Remove existing cedar decking and replace with new composite. Inspect framing for rot.',
    officeNotes: [
      { id: 'n7', author: 'Office Admin', text: 'Materials are staged at the warehouse, ready for pickup.', timestamp: '2026-03-09T08:00:00Z', type: 'office' }
    ],
    siteNotes: [],
    files: [],
    flaggedIssues: [],
    signoffStatus: 'pending',
    invoiceSupportStatus: 'not_required',
    finalSubmissionStatus: 'pending',
    fieldStatus: FieldStatus.PENDING,
    completionPackageStatus: CompletionPackageStatus.NOT_SUBMITTED,
    photoCompletionStatus: PhotoCompletionStatus.NOT_CONFIRMED,
    completionReadinessStatus: CompletionReadinessStatus.NOT_READY,
    officeReviewStatus: OfficeReviewStatus.NOT_READY,
    updatedAt: '2026-03-09T08:00:00Z',
    plannedStartDate: '2026-03-12',
    plannedDurationDays: 2,
    plannedFinishDate: '2026-03-14',
    officialScheduleStatus: ScheduleStatus.ON_SCHEDULE
  },
  {
    id: 'j6',
    jobNumber: 'LD-2026-006',
    clientName: 'Jessica Taylor',
    clientPhone: '613-555-0777',
    clientEmail: 'jess.t@example.com',
    customerPortalToken: 'portal-j6',
    projectAddress: '102 Fourth Ave, Ottawa, ON K1S 2L3',
    latitude: 45.4015,
    longitude: -75.6895,
    projectType: 'Ipe Hardwood Deck',
    assignedUsers: ['u3'],
    assignedCrewOrSubcontractor: 'Luxury Crew A',
    scheduledDate: '2026-02-20',
    currentStage: 5,
    status: JobStatus.COMPLETED,
    pipelineStage: PipelineStage.COMPLETION,
    officeChecklists: createDefaultOfficeChecklists(),
    buildDetails: createDefaultBuildDetails(),
    scopeSummary: 'High-end Ipe hardwood deck with hidden fasteners and stainless steel cable railing.',
    officeNotes: [
      { id: 'n8', author: 'Office Admin', text: 'Field work is done. Waiting for final photo package to be verified.', timestamp: '2026-03-05T15:00:00Z', type: 'office' }
    ],
    siteNotes: [
      { id: 'n9', author: 'Field Lead', text: 'Final oiling complete. Customer is thrilled.', timestamp: '2026-03-04T16:00:00Z', type: 'site' }
    ],
    verifiedBuildPassportUrl: 'https://picsum.photos/seed/passport/800/1200',
    files: [
      { id: 'f-passport-j6', name: 'Luxury Decking Verified Build Passport.pdf', url: 'https://picsum.photos/seed/passport/800/1200', type: 'closeout', uploadedAt: '2026-03-05T15:00:00Z' }
    ],
    flaggedIssues: [],
    signoffStatus: 'signed',
    invoiceSupportStatus: 'not_required',
    finalSubmissionStatus: 'submitted',
    fieldStatus: FieldStatus.COMPLETE,
    completionPackageStatus: CompletionPackageStatus.SUBMITTED,
    photoCompletionStatus: PhotoCompletionStatus.CONFIRMED,
    completionReadinessStatus: CompletionReadinessStatus.READY,
    officeReviewStatus: OfficeReviewStatus.READY_FOR_REVIEW,
    updatedAt: '2026-03-05T15:00:00Z',
    plannedStartDate: '2026-02-20',
    plannedDurationDays: 8,
    plannedFinishDate: '2026-02-28',
    officialScheduleStatus: ScheduleStatus.ON_SCHEDULE
  },
  {
    id: 'j7',
    jobNumber: 'LD-2026-007',
    clientName: 'Robert Miller',
    clientPhone: '613-555-0666',
    clientEmail: 'r.miller@example.com',
    customerPortalToken: 'portal-j7',
    projectAddress: '55 Fifth Ave, Ottawa, ON K1S 2M8',
    latitude: 45.4005,
    longitude: -75.6875,
    projectType: 'Pool Deck w/ Glass Surround',
    assignedUsers: ['u4'],
    assignedCrewOrSubcontractor: 'Subcontractor A',
    scheduledDate: '2026-02-10',
    currentStage: 5,
    status: JobStatus.COMPLETED,
    pipelineStage: PipelineStage.PAID_CLOSED,
    officeChecklists: createDefaultOfficeChecklists(),
    buildDetails: createDefaultBuildDetails(),
    scopeSummary: 'Large pool-side deck with integrated glass safety surround and custom lighting.',
    officeNotes: [
      { id: 'n10', author: 'Finance', text: 'Final payment received. Warranty package sent.', timestamp: '2026-03-01T10:00:00Z', type: 'office' }
    ],
    siteNotes: [],
    verifiedBuildPassportUrl: 'https://picsum.photos/seed/passport2/800/1200',
    subcontractorInvoiceUrl: 'https://picsum.photos/seed/invoice/800/1200',
    files: [
      { id: 'f-passport-j7', name: 'Luxury Decking Verified Build Passport.pdf', url: 'https://picsum.photos/seed/passport2/800/1200', type: 'closeout', uploadedAt: '2026-03-01T10:00:00Z' },
      { id: 'f-invoice-j7', name: 'Subcontractor Invoice Package.pdf', url: 'https://picsum.photos/seed/invoice/800/1200', type: 'closeout', uploadedAt: '2026-03-01T10:00:00Z' }
    ],
    flaggedIssues: [],
    signoffStatus: 'signed',
    invoiceSupportStatus: 'submitted',
    finalSubmissionStatus: 'submitted',
    fieldStatus: FieldStatus.COMPLETE,
    completionPackageStatus: CompletionPackageStatus.RECEIVED_READY,
    photoCompletionStatus: PhotoCompletionStatus.CONFIRMED,
    completionReadinessStatus: CompletionReadinessStatus.READY,
    officeReviewStatus: OfficeReviewStatus.REVIEW_COMPLETE,
    updatedAt: '2026-03-01T10:00:00Z',
    plannedStartDate: '2026-02-10',
    plannedDurationDays: 12,
    plannedFinishDate: '2026-02-22',
    officialScheduleStatus: ScheduleStatus.ON_SCHEDULE,
    stageUpdatedAt: '2026-03-28T14:00:00Z',
    portalStatus: 'not_set',
  },
  {
    id: 'j8',
    jobNumber: 'LD-2026-008',
    clientName: 'Alice Cooper',
    clientPhone: '613-555-7788',
    clientEmail: 'alice@example.com',
    customerPortalToken: 'portal-j8',
    projectAddress: '123 Rock Rd, Ottawa',
    projectType: 'Cedar Deck',
    assignedUsers: [],
    assignedCrewOrSubcontractor: '',
    scheduledDate: '2026-04-10',
    currentStage: 0,
    status: JobStatus.SCHEDULED,
    pipelineStage: PipelineStage.JOB_SOLD,
    officeChecklists: createDefaultOfficeChecklists(),
    buildDetails: createDefaultBuildDetails(),
    scopeSummary: 'New cedar deck.',
    officeNotes: [],
    siteNotes: [],
    files: [],
    flaggedIssues: [],
    signoffStatus: 'pending',
    invoiceSupportStatus: 'not_required',
    finalSubmissionStatus: 'pending',
    updatedAt: '2026-03-25T10:00:00Z',
    stageUpdatedAt: '2026-03-25T10:00:00Z',
    lifecycleStage: 'NEW_LEAD' as any,
    estimateAmount: 12000,
    estimateStatus: 'pending',
    portalStatus: 'not_set',
  },
  {
    id: 'j9',
    jobNumber: 'LD-2026-009',
    clientName: 'Bob Dylan',
    clientPhone: '613-555-9988',
    clientEmail: 'bob@example.com',
    customerPortalToken: 'portal-j9',
    projectAddress: '456 Folk St, Ottawa',
    projectType: 'Composite Deck',
    assignedUsers: [],
    assignedCrewOrSubcontractor: '',
    scheduledDate: '2026-04-15',
    currentStage: 0,
    status: JobStatus.SCHEDULED,
    pipelineStage: PipelineStage.JOB_SOLD,
    officeChecklists: createDefaultOfficeChecklists(),
    buildDetails: createDefaultBuildDetails(),
    scopeSummary: 'Composite deck upgrade.',
    officeNotes: [],
    siteNotes: [],
    files: [],
    flaggedIssues: [],
    signoffStatus: 'pending',
    invoiceSupportStatus: 'not_required',
    finalSubmissionStatus: 'pending',
    updatedAt: '2026-03-10T10:00:00Z',
    stageUpdatedAt: '2026-03-25T10:00:00Z',
    lifecycleStage: CustomerLifecycle.WON_SOLD,
    estimateAmount: 20100,
    totalAmount: 20100,
    acceptedOptionId: 'opt-2',
    acceptedOptionName: 'Signature',
    acceptedDate: '2026-03-25T10:00:00Z',
    selectedAddOnIds: ['add-1'],
    estimateStatus: 'accepted',
    portalStatus: 'shared',
    estimateData: {
      options: [
        {
          id: 'opt-1',
          name: 'Essential',
          title: 'Premium Pressure Treated Deck',
          description: 'A high-quality, cost-effective solution using premium brown pressure treated lumber. Perfect for those who want a beautiful deck with a classic look.',
          price: 12500,
          features: ['Premium Brown PT Lumber', 'Standard Railing System', 'Hidden Fasteners', '2-Year Workmanship Warranty'],
          differences: ['Requires regular staining/sealing', 'Natural wood characteristics (checking/cracking)'],
          isRecommended: false
        },
        {
          id: 'opt-2',
          name: 'Signature',
          title: 'Luxury Composite Decking',
          description: 'Our most popular choice. Low-maintenance composite decking that looks like real wood but lasts much longer without the maintenance.',
          price: 18900,
          features: ['Trex Enhance Composite', 'Aluminum Railing System', 'Hidden Fasteners', '25-Year Material Warranty', '5-Year Workmanship Warranty'],
          differences: ['Low maintenance (soap & water only)', 'No splintering or rotting', 'Higher upfront cost, lower lifetime cost'],
          isRecommended: true
        },
        {
          id: 'opt-3',
          name: 'Elite',
          title: 'Ultra-Low Maintenance PVC',
          description: 'The pinnacle of outdoor living. Ultra-low maintenance PVC decking with superior heat dissipation and scratch resistance.',
          price: 24500,
          features: ['TimberTech AZEK PVC', 'Premium Glass Railing', 'Integrated Lighting Package', '50-Year Material Warranty', '10-Year Workmanship Warranty'],
          differences: ['Stays cooler in the sun', 'Best scratch & stain resistance', 'Most durable option available'],
          isRecommended: false
        }
      ],
      addOns: [
        { id: 'add-1', name: 'Integrated LED Lighting', description: 'Stair lights and post cap lights for ambiance and safety.', price: 1200 },
        { id: 'add-2', name: 'Privacy Screen (8ft)', description: 'Custom cedar privacy screen for one side of the deck.', price: 1850 },
        { id: 'add-3', name: 'Under-Deck Drainage', description: 'Keep the area below your deck dry for storage or living space.', price: 3200 }
      ],
      paymentStructure: [
        '10% Deposit to secure your spot in our production queue',
        '40% Material payment 2 weeks before start date',
        '40% Progress payment upon framing completion',
        '10% Final payment upon project completion and QC sign-off'
      ],
      whatHappensNext: [
        { title: 'Accept & Secure Spot', desc: 'Choose your preferred option and pay the 10% deposit. This locks your project into our production calendar.', icon: 'CheckCircle2' },
        { title: 'Project Concierge', desc: 'You\'ll be assigned a dedicated Project Manager who handles all permits, HOA approvals, and utility locates.', icon: 'ShieldCheck' },
        { title: 'Site Finalization', desc: 'We perform a final technical site visit to laser-measure and confirm your color selections.', icon: 'Calendar' },
        { title: 'The Build Experience', desc: 'Construction begins. You\'ll receive daily photo updates and progress reports directly through this portal.', icon: 'Zap' }
      ]
    }
  },
  {
    id: 'j10',
    jobNumber: 'EST-2026-010',
    clientName: 'Sarah Jenkins',
    clientPhone: '613-555-1122',
    clientEmail: 's.jenkins@example.com',
    customerPortalToken: 'portal-j10',
    projectAddress: '123 Glebe Ave, Ottawa, ON K1S 2C3',
    latitude: 45.4012,
    longitude: -75.6922,
    projectType: 'Multi-Level Cedar Deck',
    assignedUsers: [],
    assignedCrewOrSubcontractor: '',
    scheduledDate: '2026-05-01',
    currentStage: 0,
    status: JobStatus.SCHEDULED,
    lifecycleStage: CustomerLifecycle.ESTIMATE_SENT,
    officeChecklists: createDefaultOfficeChecklists(),
    buildDetails: createDefaultBuildDetails(),
    scopeSummary: 'Proposed multi-level cedar deck with built-in seating and planters.',
    officeNotes: [
      { id: 'n1', text: 'Client loves the look of natural wood but is worried about maintenance.', author: 'Office Admin', timestamp: '2026-03-20T09:00:00Z' }
    ],
    siteNotes: [
      { id: 'sn1', text: 'Backyard has a steep slope. Multi-level design is necessary.', author: 'Field Estimator', timestamp: '2026-03-21T11:00:00Z' },
      { id: 'sn2', text: 'Gas line for BBQ needs to be relocated.', author: 'Field Estimator', timestamp: '2026-03-21T11:15:00Z' }
    ],
    files: [
      { id: 'f1', name: 'Backyard Slope.jpg', url: 'https://picsum.photos/seed/slope/800/600', type: 'photo', uploadedAt: '2026-03-21T11:20:00Z', size: '3.1MB' },
      { id: 'f2', name: 'Current Deck.jpg', url: 'https://picsum.photos/seed/olddeck/800/600', type: 'photo', uploadedAt: '2026-03-21T11:21:00Z', size: '2.5MB' }
    ],
    flaggedIssues: [],
    signoffStatus: 'pending',
    invoiceSupportStatus: 'not_required',
    finalSubmissionStatus: 'pending',
    fieldStatus: FieldStatus.PENDING,
    completionPackageStatus: CompletionPackageStatus.NOT_SUBMITTED,
    photoCompletionStatus: PhotoCompletionStatus.NOT_CONFIRMED,
    completionReadinessStatus: CompletionReadinessStatus.NOT_READY,
    officeReviewStatus: OfficeReviewStatus.NOT_READY,
    updatedAt: new Date().toISOString(),
    portalStatus: 'shared',
    estimateData: {
      options: [
        {
          id: 'opt-1',
          name: 'Classic Cedar',
          title: 'Western Red Cedar Deck',
          description: 'Beautiful, natural Western Red Cedar. A timeless look with natural rot resistance.',
          price: 15500,
          features: ['Premium Western Red Cedar', 'Cedar Railing with Black Balusters', 'Hidden Fasteners', '2-Year Workmanship Warranty'],
          differences: ['Requires regular maintenance', 'Natural aging to silver-grey if not stained'],
          isRecommended: true
        },
        {
          id: 'opt-2',
          name: 'Hybrid',
          title: 'Cedar Frame w/ Composite Decking',
          description: 'The best of both worlds. A natural cedar frame with low-maintenance composite floor boards.',
          price: 19500,
          features: ['Cedar Framing', 'Trex Select Decking', 'Aluminum Railing', '25-Year Material Warranty'],
          differences: ['Low maintenance surface', 'Natural wood look for railing and structure'],
          isRecommended: false
        }
      ],
      addOns: [
        { id: 'add-1', name: 'Built-in Cedar Benches', description: 'Two 6ft built-in cedar benches with backrests.', price: 1400 },
        { id: 'add-2', name: 'Integrated Planter Boxes', description: 'Three matching cedar planter boxes.', price: 950 }
      ],
      paymentStructure: [
        '10% Deposit',
        '40% Materials',
        '50% Completion'
      ],
      whatHappensNext: [
        { title: 'Accept & Secure Spot', desc: 'Choose your preferred option and pay the 10% deposit. This locks your project into our production calendar.', icon: 'CheckCircle2' },
        { title: 'Project Concierge', desc: 'You\'ll be assigned a dedicated Project Manager who handles all permits, HOA approvals, and utility locates.', icon: 'ShieldCheck' },
        { title: 'Site Finalization', desc: 'We perform a final technical site visit to laser-measure and confirm your color selections.', icon: 'Calendar' },
        { title: 'The Build Experience', desc: 'Construction begins. You\'ll receive daily photo updates and progress reports directly through this portal.', icon: 'Zap' }
      ]
    }
  },
  {
    id: 'j11',
    jobNumber: 'EST-2026-011',
    clientName: 'Michael Chan',
    clientPhone: '613-555-3344',
    clientEmail: 'm.chen@example.com',
    customerPortalToken: 'portal-j11',
    projectAddress: '77 Rockcliffe Park, Ottawa, ON K1M 1B5',
    latitude: 45.4512,
    longitude: -75.6722,
    projectType: 'Modern PVC Deck w/ Glass Railing',
    assignedUsers: [],
    assignedCrewOrSubcontractor: '',
    scheduledDate: '2026-06-15',
    currentStage: 0,
    status: JobStatus.SCHEDULED,
    lifecycleStage: CustomerLifecycle.WON_SOLD,
    pipelineStage: PipelineStage.JOB_SOLD,
    acceptedOptionId: 'opt-1',
    acceptedOptionName: 'Modern PVC',
    acceptedDate: '2026-03-28T09:00:00Z',
    selectedAddOnIds: ['add-1'],
    estimateAmount: 34200,
    totalAmount: 34200,
    officeChecklists: createDefaultOfficeChecklists(),
    buildDetails: createDefaultBuildDetails(),
    scopeSummary: 'Ultra-modern PVC deck with frameless glass railing and custom lighting.',
    officeNotes: [
      { id: 'n1', text: 'Client is interested in the highest-end PVC options.', author: 'Office Admin', timestamp: '2026-03-25T10:00:00Z' }
    ],
    siteNotes: [
      { id: 'sn1', text: 'Rooftop access requires specialized lifting equipment.', author: 'Field Estimator', timestamp: '2026-03-26T14:00:00Z' },
      { id: 'sn2', text: 'Existing structure needs reinforcement.', author: 'Field Estimator', timestamp: '2026-03-26T14:05:00Z' }
    ],
    files: [
      { id: 'f1', name: 'Existing Terrace.jpg', url: 'https://picsum.photos/seed/terrace/800/600', type: 'photo', uploadedAt: '2026-03-26T14:10:00Z', size: '2.4MB' },
      { id: 'f2', name: 'Access Point.jpg', url: 'https://picsum.photos/seed/access/800/600', type: 'photo', uploadedAt: '2026-03-26T14:11:00Z', size: '1.8MB' },
      { id: 'f3', name: 'House Elevation.jpg', url: 'https://picsum.photos/seed/elevation/800/600', type: 'photo', uploadedAt: '2026-03-26T14:12:00Z', size: '2.1MB' }
    ],
    flaggedIssues: [],
    signoffStatus: 'pending',
    invoiceSupportStatus: 'not_required',
    finalSubmissionStatus: 'pending',
    fieldStatus: FieldStatus.PENDING,
    completionPackageStatus: CompletionPackageStatus.NOT_SUBMITTED,
    photoCompletionStatus: PhotoCompletionStatus.NOT_CONFIRMED,
    completionReadinessStatus: CompletionReadinessStatus.NOT_READY,
    officeReviewStatus: OfficeReviewStatus.NOT_READY,
    updatedAt: new Date().toISOString(),
    portalStatus: 'shared',
    estimateData: {
      options: [
        {
          id: 'opt-1',
          name: 'Modern PVC',
          title: 'TimberTech AZEK PVC Deck',
          description: 'Top-of-the-line PVC decking for maximum durability and heat resistance.',
          price: 32000,
          features: ['TimberTech AZEK PVC', 'Glass Railing System', 'Hidden Fasteners', '50-Year Warranty'],
          differences: ['Best heat dissipation', 'Superior scratch resistance'],
          isRecommended: true
        }
      ],
      addOns: [
        { id: 'add-1', name: 'Full Perimeter LED Lighting', description: 'Subtle under-rim lighting for the entire deck.', price: 2200 },
        { id: 'add-2', name: 'Outdoor Kitchen Prep', description: 'Reinforced framing and utility rough-ins for future kitchen.', price: 3500 }
      ],
      paymentStructure: [
        '15% Deposit',
        '45% Materials',
        '40% Completion'
      ],
      whatHappensNext: [
        { title: 'Accept & Secure Spot', desc: 'Choose your preferred option and pay the 10% deposit. This locks your project into our production calendar.', icon: 'CheckCircle2' },
        { title: 'Project Concierge', desc: 'You\'ll be assigned a dedicated Project Manager who handles all permits, HOA approvals, and utility locates.', icon: 'ShieldCheck' },
        { title: 'Site Finalization', desc: 'We perform a final technical site visit to laser-measure and confirm your color selections.', icon: 'Calendar' },
        { title: 'The Build Experience', desc: 'Construction begins. You\'ll receive daily photo updates and progress reports directly through this portal.', icon: 'Zap' }
      ]
    }
  },
  {
    id: 'j12',
    jobNumber: 'EST-2026-012',
    clientName: 'Robert Wilson',
    clientPhone: '613-555-0444',
    clientEmail: 'robert@example.com',
    customerPortalToken: 'portal-j12',
    projectAddress: '444 Oak St, Ottawa, ON K1S 5R5',
    latitude: 45.3950,
    longitude: -75.7100,
    projectType: 'Luxury Deck Build',
    assignedUsers: [],
    assignedCrewOrSubcontractor: '',
    scheduledDate: '2026-05-15',
    currentStage: 0,
    status: JobStatus.ESTIMATING,
    lifecycleStage: CustomerLifecycle.ESTIMATE_SENT,
    officeChecklists: createDefaultOfficeChecklists(),
    buildDetails: createDefaultBuildDetails(),
    scopeSummary: 'Multi-level luxury deck project with integrated kitchen and louvered roof.',
    officeNotes: [],
    siteNotes: [],
    files: [],
    flaggedIssues: [],
    signoffStatus: 'pending',
    invoiceSupportStatus: 'not_required',
    finalSubmissionStatus: 'pending',
    fieldStatus: FieldStatus.PENDING,
    completionPackageStatus: CompletionPackageStatus.NOT_SUBMITTED,
    photoCompletionStatus: PhotoCompletionStatus.NOT_CONFIRMED,
    completionReadinessStatus: CompletionReadinessStatus.NOT_READY,
    officeReviewStatus: OfficeReviewStatus.NOT_READY,
    updatedAt: new Date().toISOString(),
    portalStatus: 'shared',
    estimateData: {
      introduction: "Robert, it was a pleasure meeting you. Here is the comprehensive proposal for your multi-level luxury deck project.",
      options: [
        {
          id: 'opt-1',
          name: 'Premium Ipe Multi-Level',
          title: 'Premium Ipe Hardwood Multi-Level Deck',
          description: 'The ultimate in luxury and durability. Multi-level design with integrated seating and lighting.',
          price: 42500,
          features: ['Premium Ipe Hardwood', 'Hidden Fasteners', 'Integrated LED Lighting', 'Built-in Benches', 'Glass Railing System'],
          differences: ['Highest durability', 'Natural exotic wood look'],
          isRecommended: true
        },
        {
          id: 'opt-2',
          name: 'Composite Masterpiece',
          title: 'Trex Transcend Composite Deck',
          description: 'Low maintenance luxury using top-tier composite materials.',
          price: 36800,
          features: ['Trex Transcend Line', 'Picture Frame Border', 'Aluminum Railing', 'Under-deck Storage'],
          differences: ['Minimal maintenance', 'Consistent color'],
          isRecommended: false
        }
      ],
      addOns: [
        {
          id: 'ao-1',
          name: 'Outdoor Kitchen Island',
          description: 'Integrated stone island with grill and prep area.',
          price: 12500
        },
        {
          id: 'ao-2',
          name: 'Automated Louvered Roof',
          description: 'Control your shade and rain protection with a touch of a button.',
          price: 18000
        }
      ],
      paymentStructure: ['10% Deposit', '40% Materials', '50% Completion'],
      whatHappensNext: ['Accept option', 'Contract signing', 'Deposit payment'],
      expirationDate: '2026-04-28T00:00:00Z'
    }
  },
  {
    id: 'j13',
    jobNumber: 'EST-2026-013',
    clientName: 'Emily Chen',
    clientPhone: '613-555-0555',
    clientEmail: 'emily@example.com',
    customerPortalToken: 'portal-j13',
    projectAddress: '555 Maple Ave, Ottawa, ON K1Y 2Z2',
    latitude: 45.4100,
    longitude: -75.7200,
    projectType: 'Deck Refurbishment',
    assignedUsers: [],
    assignedCrewOrSubcontractor: '',
    scheduledDate: '2026-04-20',
    currentStage: 0,
    status: JobStatus.ESTIMATING,
    lifecycleStage: CustomerLifecycle.ESTIMATE_SENT,
    officeChecklists: createDefaultOfficeChecklists(),
    buildDetails: createDefaultBuildDetails(),
    scopeSummary: 'Sanding, board replacement and staining of existing deck.',
    officeNotes: [],
    siteNotes: [],
    files: [],
    flaggedIssues: [],
    signoffStatus: 'pending',
    invoiceSupportStatus: 'not_required',
    finalSubmissionStatus: 'pending',
    fieldStatus: FieldStatus.PENDING,
    completionPackageStatus: CompletionPackageStatus.NOT_SUBMITTED,
    photoCompletionStatus: PhotoCompletionStatus.NOT_CONFIRMED,
    completionReadinessStatus: CompletionReadinessStatus.NOT_READY,
    officeReviewStatus: OfficeReviewStatus.NOT_READY,
    updatedAt: new Date().toISOString(),
    portalStatus: 'shared',
    estimateData: {
      introduction: "Hi Emily, here is the quote for the refurbishment of your existing deck structure.",
      options: [
        {
          id: 'opt-1',
          name: 'Standard Refurbish',
          title: 'Professional Deck Refurbishment',
          description: 'Sanding, board replacement where needed, and premium staining.',
          price: 4800,
          features: ['Board Inspection', 'Power Wash', 'Premium Stain Application', 'Hardware Tightening'],
          differences: ['Extends life of current deck', 'Cost-effective refresh'],
          isRecommended: true
        }
      ],
      addOns: [
        {
          id: 'ao-1',
          name: 'Post Cap Lighting',
          description: 'Solar powered LED post caps for evening ambiance.',
          price: 650
        }
      ],
      paymentStructure: ['50% Deposit', '50% Completion'],
      whatHappensNext: ['Accept quote', 'Schedule work', 'Deposit payment'],
      expirationDate: '2026-04-15T00:00:00Z'
    }
  },
  {
    id: 'j14',
    jobNumber: 'EST-2026-014',
    clientName: 'Marcus Thorne',
    clientPhone: '613-555-0666',
    clientEmail: 'marcus@example.com',
    customerPortalToken: 'portal-j14',
    projectAddress: '666 Pine Ridge, Ottawa, ON K2M 1A1',
    latitude: 45.3000,
    longitude: -75.8500,
    projectType: 'Cedar Deck & Pergola',
    assignedUsers: [],
    assignedCrewOrSubcontractor: '',
    scheduledDate: '2026-06-10',
    currentStage: 0,
    status: JobStatus.ESTIMATING,
    lifecycleStage: CustomerLifecycle.ESTIMATE_SENT,
    officeChecklists: createDefaultOfficeChecklists(),
    buildDetails: createDefaultBuildDetails(),
    scopeSummary: 'New cedar deck with integrated pergola and privacy screens.',
    officeNotes: [],
    siteNotes: [],
    files: [],
    flaggedIssues: [],
    signoffStatus: 'pending',
    invoiceSupportStatus: 'not_required',
    finalSubmissionStatus: 'pending',
    fieldStatus: FieldStatus.PENDING,
    completionPackageStatus: CompletionPackageStatus.NOT_SUBMITTED,
    photoCompletionStatus: PhotoCompletionStatus.NOT_CONFIRMED,
    completionReadinessStatus: CompletionReadinessStatus.NOT_READY,
    officeReviewStatus: OfficeReviewStatus.NOT_READY,
    updatedAt: new Date().toISOString(),
    portalStatus: 'shared',
    estimateData: {
      introduction: "Marcus, here are three options for your backyard transformation, ranging from essential to fully featured.",
      options: [
        {
          id: 'opt-1',
          name: 'The Full Experience',
          title: 'Cedar Deck, Pergola & Privacy Screens',
          description: 'Large cedar deck with integrated pergola and privacy screens.',
          price: 28500,
          features: ['Western Red Cedar', '12x12 Pergola', 'Privacy Slat Walls', 'Wide Stairs'],
          differences: ['Complete backyard transformation', 'Maximum privacy'],
          isRecommended: true
        },
        {
          id: 'opt-2',
          name: 'Essential Deck & Pergola',
          title: 'Cedar Deck with Pergola',
          description: 'Standard size cedar deck with a beautiful pergola.',
          price: 22000,
          features: ['Western Red Cedar', '10x10 Pergola', 'Standard Railing'],
          differences: ['Great balance of features', 'Solid value'],
          isRecommended: false
        },
        {
          id: 'opt-3',
          name: 'Essential Deck Only',
          title: 'Premium Cedar Deck',
          description: 'High quality cedar deck without the pergola.',
          price: 16500,
          features: ['Western Red Cedar', 'Standard Railing', 'Solid Construction'],
          differences: ['Focus on quality deck surface', 'Most affordable'],
          isRecommended: false
        }
      ],
      addOns: [
        {
          id: 'ao-1',
          name: 'Integrated Planter Boxes',
          description: 'Matching cedar planter boxes built into the deck railing.',
          price: 1200
        }
      ],
      paymentStructure: ['10% Deposit', '40% Materials', '50% Completion'],
      whatHappensNext: ['Accept option', 'Contract signing', 'Deposit payment'],
      expirationDate: '2026-04-20T00:00:00Z'
    }
  },
  {
    id: 'j15',
    jobNumber: 'EST-2026-015',
    clientName: 'Linda Thompson',
    clientPhone: '613-555-0777',
    clientEmail: 'linda@example.com',
    customerPortalToken: 'portal-j15',
    projectAddress: '777 Riverside Dr, Ottawa, ON K1V 1A1',
    latitude: 45.3800,
    longitude: -75.6900,
    projectType: 'Poolside Composite Deck',
    assignedUsers: [],
    assignedCrewOrSubcontractor: '',
    scheduledDate: '2026-07-01',
    currentStage: 0,
    status: JobStatus.ESTIMATING,
    lifecycleStage: CustomerLifecycle.ESTIMATE_SENT,
    officeChecklists: createDefaultOfficeChecklists(),
    buildDetails: createDefaultBuildDetails(),
    scopeSummary: 'Large poolside deck using slip-resistant composite materials.',
    officeNotes: [],
    siteNotes: [],
    files: [],
    flaggedIssues: [],
    signoffStatus: 'pending',
    invoiceSupportStatus: 'not_required',
    finalSubmissionStatus: 'pending',
    fieldStatus: FieldStatus.PENDING,
    completionPackageStatus: CompletionPackageStatus.NOT_SUBMITTED,
    photoCompletionStatus: PhotoCompletionStatus.NOT_CONFIRMED,
    completionReadinessStatus: CompletionReadinessStatus.NOT_READY,
    officeReviewStatus: OfficeReviewStatus.NOT_READY,
    updatedAt: new Date().toISOString(),
    portalStatus: 'shared',
    estimateData: {
      introduction: "Linda, it was great to see your pool area. Here is the proposal for a safe, low-maintenance poolside deck.",
      options: [
        {
          id: 'opt-1',
          name: 'Slip-Resistant Composite',
          title: 'Pool-Safe Composite Decking',
          description: 'High-traction composite boards designed specifically for wet areas.',
          price: 31200,
          features: ['Slip-Resistant Surface', 'Heat-Dissipating Technology', 'Hidden Fasteners', 'Stainless Steel Hardware'],
          differences: ['Safest for wet feet', 'Stays cooler in direct sun'],
          isRecommended: true
        }
      ],
      addOns: [
        {
          id: 'ao-1',
          name: 'Integrated Bench Seating',
          description: 'Built-in composite benches around the perimeter.',
          price: 2400
        }
      ],
      paymentStructure: ['10% Deposit', '50% Materials', '40% Completion'],
      whatHappensNext: ['Accept option', 'Site measurement', 'Deposit payment'],
      expirationDate: '2026-06-15T00:00:00Z'
    }
  },
  {
    id: 'j16',
    jobNumber: 'EST-2026-016',
    clientName: 'Gregory Vance',
    clientPhone: '613-555-0888',
    clientEmail: 'greg@example.com',
    customerPortalToken: 'portal-j16',
    projectAddress: '123 Elgin St, Ottawa, ON K1P 5K6',
    latitude: 45.4200,
    longitude: -75.6900,
    projectType: 'Modern Rooftop Terrace',
    assignedUsers: [],
    assignedCrewOrSubcontractor: '',
    scheduledDate: '2026-08-15',
    currentStage: 0,
    status: JobStatus.ESTIMATING,
    lifecycleStage: CustomerLifecycle.ESTIMATE_SENT,
    officeChecklists: createDefaultOfficeChecklists(),
    buildDetails: createDefaultBuildDetails(),
    scopeSummary: 'Rooftop terrace with pedestal system and porcelain pavers.',
    officeNotes: [
      { id: 'n1', text: 'Gregory is looking for a very modern, clean aesthetic.', author: 'Office Admin', timestamp: '2026-03-28T10:00:00Z' }
    ],
    siteNotes: [
      { id: 'sn1', text: 'Rooftop has existing membrane that must be protected.', author: 'Field Estimator', timestamp: '2026-03-29T14:00:00Z' }
    ],
    files: [
      { id: 'f1', name: 'Rooftop View.jpg', url: 'https://picsum.photos/seed/rooftop/800/600', type: 'photo', uploadedAt: '2026-03-29T14:10:00Z', size: '2.8MB' }
    ],
    flaggedIssues: [],
    signoffStatus: 'pending',
    invoiceSupportStatus: 'not_required',
    finalSubmissionStatus: 'pending',
    fieldStatus: FieldStatus.PENDING,
    completionPackageStatus: CompletionPackageStatus.NOT_SUBMITTED,
    photoCompletionStatus: PhotoCompletionStatus.NOT_CONFIRMED,
    completionReadinessStatus: CompletionReadinessStatus.NOT_READY,
    officeReviewStatus: OfficeReviewStatus.NOT_READY,
    updatedAt: new Date().toISOString(),
    portalStatus: 'shared',
    estimateData: {
      introduction: "Gregory, your rooftop has incredible potential. Here is the design for a modern, durable terrace.",
      options: [
        {
          id: 'opt-1',
          name: 'Porcelain Paver System',
          title: 'Modern Porcelain Rooftop Terrace',
          description: 'High-end porcelain pavers on an adjustable pedestal system.',
          price: 19500,
          features: ['Italian Porcelain Pavers', 'Adjustable Pedestal System', 'Wind-Uplift Protection', 'Low Weight Load'],
          differences: ['Ultra-modern look', 'Extremely easy to clean'],
          isRecommended: true
        }
      ],
      addOns: [
        {
          id: 'ao-1',
          name: 'Custom Planter Boxes',
          description: 'Lightweight aluminum planters with integrated irrigation.',
          price: 3800
        }
      ],
      paymentStructure: ['20% Deposit', '40% Materials', '40% Completion'],
      whatHappensNext: ['Accept option', 'Engineering review', 'Deposit payment'],
      expirationDate: '2026-07-30T00:00:00Z'
    }
  },
  {
    id: 'j17',
    jobNumber: 'EST-2026-017',
    clientName: 'Sophia Loren',
    clientPhone: '613-555-0999',
    clientEmail: 'sophia@example.com',
    customerPortalToken: 'portal-j17',
    projectAddress: '888 Carling Ave, Ottawa, ON K1S 5E7',
    latitude: 45.3900,
    longitude: -75.7100,
    projectType: 'Traditional Cedar Deck',
    assignedUsers: [],
    assignedCrewOrSubcontractor: '',
    scheduledDate: '2026-05-01',
    currentStage: 0,
    status: JobStatus.ESTIMATING,
    lifecycleStage: CustomerLifecycle.ESTIMATE_SENT,
    officeChecklists: createDefaultOfficeChecklists(),
    buildDetails: createDefaultBuildDetails(),
    scopeSummary: 'Traditional cedar deck with wrap-around stairs.',
    officeNotes: [
      { id: 'n1', text: 'Sophia wants a deck that matches the heritage style of her home.', author: 'Office Admin', timestamp: '2026-03-27T10:00:00Z' }
    ],
    siteNotes: [
      { id: 'sn1', text: 'Old deck needs removal. Foundation seems solid.', author: 'Field Estimator', timestamp: '2026-03-28T14:00:00Z' }
    ],
    files: [
      { id: 'f1', name: 'Heritage Home Rear.jpg', url: 'https://picsum.photos/seed/heritage/800/600', type: 'photo', uploadedAt: '2026-03-28T14:10:00Z', size: '3.5MB' }
    ],
    flaggedIssues: [],
    signoffStatus: 'pending',
    invoiceSupportStatus: 'not_required',
    finalSubmissionStatus: 'pending',
    fieldStatus: FieldStatus.PENDING,
    completionPackageStatus: CompletionPackageStatus.NOT_SUBMITTED,
    photoCompletionStatus: PhotoCompletionStatus.NOT_CONFIRMED,
    completionReadinessStatus: CompletionReadinessStatus.NOT_READY,
    officeReviewStatus: OfficeReviewStatus.NOT_READY,
    updatedAt: new Date().toISOString(),
    portalStatus: 'shared',
    estimateData: {
      introduction: "Sophia, here is the proposal for your traditional cedar deck. A timeless addition to your home.",
      options: [
        {
          id: 'opt-1',
          name: 'Traditional Cedar',
          title: 'Classic Western Red Cedar Deck',
          description: 'High-quality cedar decking with a traditional design.',
          price: 14200,
          features: ['Western Red Cedar', 'Wrap-Around Stairs', 'Wood Railing', 'Stain-Ready Surface'],
          differences: ['Classic aesthetic', 'Natural material'],
          isRecommended: true
        }
      ],
      addOns: [],
      paymentStructure: ['15% Deposit', '45% Materials', '40% Completion'],
      whatHappensNext: ['Accept option', 'Schedule start', 'Deposit payment'],
      expirationDate: '2026-04-15T00:00:00Z'
    }
  },
  {
    id: 'j18',
    jobNumber: 'EST-2026-018',
    clientName: 'Arthur Morgan',
    clientPhone: '613-555-1010',
    clientEmail: 'arthur@example.com',
    customerPortalToken: 'portal-j18',
    projectAddress: '101 Blackwater Rd, Ottawa, ON K2S 1B1',
    latitude: 45.3500,
    longitude: -75.8000,
    projectType: 'Rustic Log Cabin Deck',
    assignedUsers: [],
    assignedCrewOrSubcontractor: '',
    scheduledDate: '2026-09-01',
    currentStage: 0,
    status: JobStatus.ESTIMATING,
    lifecycleStage: CustomerLifecycle.ESTIMATE_SENT,
    officeChecklists: createDefaultOfficeChecklists(),
    buildDetails: createDefaultBuildDetails(),
    scopeSummary: 'Heavy-duty rustic deck using large timber posts and rough-sawn cedar.',
    officeNotes: [],
    siteNotes: [],
    files: [],
    flaggedIssues: [],
    signoffStatus: 'pending',
    invoiceSupportStatus: 'not_required',
    finalSubmissionStatus: 'pending',
    fieldStatus: FieldStatus.PENDING,
    completionPackageStatus: CompletionPackageStatus.NOT_SUBMITTED,
    photoCompletionStatus: PhotoCompletionStatus.NOT_CONFIRMED,
    completionReadinessStatus: CompletionReadinessStatus.NOT_READY,
    officeReviewStatus: OfficeReviewStatus.NOT_READY,
    updatedAt: new Date().toISOString(),
    portalStatus: 'shared',
    estimateData: {
      introduction: "Arthur, here is the proposal for your rustic cabin deck. We've selected materials that match the rugged aesthetic of your property.",
      options: [
        {
          id: 'opt-1',
          name: 'Rustic Timber',
          title: 'Rough-Sawn Cedar Timber Deck',
          description: 'Massive 8x8 timber posts and thick rough-sawn cedar decking for a truly rustic feel.',
          price: 22800,
          features: ['8x8 Cedar Posts', 'Rough-Sawn Decking', 'Custom Timber Railing', 'Hidden Structural Brackets'],
          differences: ['Unmatched structural feel', 'Perfectly matches cabin style'],
          isRecommended: true
        }
      ],
      addOns: [
        {
          id: 'ao-1',
          name: 'Integrated Fire Pit Area',
          description: 'Reinforced section of the deck with non-combustible stone inlay for a fire pit.',
          price: 4500
        }
      ],
      paymentStructure: ['15% Deposit', '50% Materials', '35% Completion'],
      whatHappensNext: ['Accept option', 'Material sourcing', 'Deposit payment'],
      expirationDate: '2026-08-15T00:00:00Z'
    }
  },
  {
    id: 'j19',
    jobNumber: 'EST-2026-019',
    clientName: 'Isabella Garcia',
    clientPhone: '613-555-2020',
    clientEmail: 'isabella@example.com',
    customerPortalToken: 'portal-j19',
    projectAddress: '202 Valencia St, Ottawa, ON K1N 6N5',
    latitude: 45.4300,
    longitude: -75.6800,
    projectType: 'Mediterranean Style Terrace',
    assignedUsers: [],
    assignedCrewOrSubcontractor: '',
    scheduledDate: '2026-05-20',
    currentStage: 0,
    status: JobStatus.ESTIMATING,
    lifecycleStage: CustomerLifecycle.ESTIMATE_SENT,
    officeChecklists: createDefaultOfficeChecklists(),
    buildDetails: createDefaultBuildDetails(),
    scopeSummary: 'Terracotta tiled deck with wrought iron railings and white-washed accents.',
    officeNotes: [],
    siteNotes: [],
    files: [],
    flaggedIssues: [],
    signoffStatus: 'pending',
    invoiceSupportStatus: 'not_required',
    finalSubmissionStatus: 'pending',
    fieldStatus: FieldStatus.PENDING,
    completionPackageStatus: CompletionPackageStatus.NOT_SUBMITTED,
    photoCompletionStatus: PhotoCompletionStatus.NOT_CONFIRMED,
    completionReadinessStatus: CompletionReadinessStatus.NOT_READY,
    officeReviewStatus: OfficeReviewStatus.NOT_READY,
    updatedAt: new Date().toISOString(),
    portalStatus: 'shared',
    estimateData: {
      introduction: "Isabella, we've designed a Mediterranean-inspired terrace that will make you feel like you're in Spain.",
      options: [
        {
          id: 'opt-1',
          name: 'Mediterranean Terrace',
          title: 'Terracotta & Wrought Iron Terrace',
          description: 'Beautiful terracotta tiles on a reinforced deck structure with custom wrought iron railings.',
          price: 26400,
          features: ['Premium Terracotta Tiles', 'Custom Wrought Iron Railing', 'White-Washed Privacy Walls', 'Integrated Planters'],
          differences: ['Unique aesthetic in Ottawa', 'Extremely durable surface'],
          isRecommended: true
        }
      ],
      addOns: [
        {
          id: 'ao-1',
          name: 'Custom Pergola with Vines',
          description: 'White-washed cedar pergola designed for climbing vines.',
          price: 5200
        }
      ],
      paymentStructure: ['20% Deposit', '40% Materials', '40% Completion'],
      whatHappensNext: ['Accept option', 'Tile selection', 'Deposit payment'],
      expirationDate: '2026-05-01T00:00:00Z'
    }
  },
  {
    id: 'j20',
    jobNumber: 'EST-2026-020',
    clientName: 'Victor Stone',
    clientPhone: '613-555-3030',
    clientEmail: 'victor@example.com',
    customerPortalToken: 'portal-j20',
    projectAddress: '303 Tech Way, Kanata, ON K2K 3M3',
    latitude: 45.3300,
    longitude: -75.9000,
    projectType: 'High-Tech Smart Deck',
    assignedUsers: [],
    assignedCrewOrSubcontractor: '',
    scheduledDate: '2026-07-15',
    currentStage: 0,
    status: JobStatus.ESTIMATING,
    lifecycleStage: CustomerLifecycle.ESTIMATE_SENT,
    officeChecklists: createDefaultOfficeChecklists(),
    buildDetails: createDefaultBuildDetails(),
    scopeSummary: 'Composite deck with fully integrated smart lighting, sound, and heating.',
    officeNotes: [],
    siteNotes: [],
    files: [],
    flaggedIssues: [],
    signoffStatus: 'pending',
    invoiceSupportStatus: 'not_required',
    finalSubmissionStatus: 'pending',
    fieldStatus: FieldStatus.PENDING,
    completionPackageStatus: CompletionPackageStatus.NOT_SUBMITTED,
    photoCompletionStatus: PhotoCompletionStatus.NOT_CONFIRMED,
    completionReadinessStatus: CompletionReadinessStatus.NOT_READY,
    officeReviewStatus: OfficeReviewStatus.NOT_READY,
    updatedAt: new Date().toISOString(),
    portalStatus: 'shared',
    estimateData: {
      introduction: "Victor, here is the ultimate smart deck proposal. Fully integrated with your home automation system.",
      options: [
        {
          id: 'opt-1',
          name: 'The Smart Deck',
          title: 'Fully Integrated Smart Composite Deck',
          description: 'Top-tier composite deck with integrated smart home technology for every feature.',
          price: 48900,
          features: ['Premium Composite Decking', 'Smart LED Lighting (RGBW)', 'Integrated Outdoor Audio', 'Smart Radiant Heating', 'Wi-Fi Extender'],
          differences: ['Full automation control', 'Ultimate entertainment space'],
          isRecommended: true
        }
      ],
      addOns: [
        {
          id: 'ao-1',
          name: 'Weather Station Integration',
          description: 'Automated louvered roof and heating based on real-time weather data.',
          price: 3500
        }
      ],
      paymentStructure: ['15% Deposit', '45% Materials', '40% Completion'],
      whatHappensNext: ['Accept option', 'Tech consultation', 'Deposit payment'],
      expirationDate: '2026-06-30T00:00:00Z'
    }
  },
  {
    id: 'j21',
    jobNumber: 'EST-2026-021',
    clientName: 'Diana Prince',
    clientPhone: '613-555-4455',
    clientEmail: 'diana@example.com',
    customerPortalToken: 'portal-j21',
    projectAddress: '1 Paradise Island, Ottawa, ON K1S 1A1',
    projectType: 'Elite PVC Deck',
    assignedUsers: ['u3'],
    assignedCrewOrSubcontractor: 'Luxury Crew A',
    scheduledDate: '2026-04-20',
    currentStage: 0,
    status: JobStatus.SCHEDULED,
    pipelineStage: PipelineStage.ADMIN_SETUP,
    lifecycleStage: CustomerLifecycle.WON_SOLD,
    acceptedOptionId: 'opt-1',
    acceptedOptionName: 'Elite',
    acceptedDate: '2026-03-28T09:00:00Z',
    selectedAddOnIds: ['add-1'],
    estimateAmount: 28900,
    totalAmount: 28900,
    officeChecklists: createDefaultOfficeChecklists(),
    buildDetails: createDefaultBuildDetails(),
    scopeSummary: 'Elite PVC deck with glass railing and under-deck drainage.',
    updatedAt: new Date().toISOString(),
    portalStatus: 'shared',
    estimateData: {
      options: [
        { id: 'opt-1', name: 'Elite', title: 'Ultra-Low Maintenance PVC', description: 'The pinnacle of outdoor living.', price: 24500, features: ['TimberTech AZEK PVC', 'Premium Glass Railing'], differences: [], isRecommended: true, specs: { maintenance: 'Zero', longevity: '50+ Years', warranty: '50 Years', heat: 'Coolest' } }
      ],
      addOns: [
        { id: 'add-1', name: 'Integrated LED Lighting', description: 'Stair lights and post cap lights.', price: 1200 }
      ],
      paymentStructure: ['10% Deposit', '40% Material', '50% Completion'],
      whatHappensNext: [
        { title: 'Accept & Secure Spot', desc: 'Choose your preferred option and pay the 10% deposit. This locks your project into our production calendar.', icon: 'CheckCircle2' },
        { title: 'Project Concierge', desc: 'You\'ll be assigned a dedicated Project Manager who handles all permits, HOA approvals, and utility locates.', icon: 'ShieldCheck' },
        { title: 'Site Finalization', desc: 'We perform a final technical site visit to laser-measure and confirm your color selections.', icon: 'Calendar' },
        { title: 'The Build Experience', desc: 'Construction begins. You\'ll receive daily photo updates and progress reports directly through this portal.', icon: 'Zap' }
      ]
    }
  },
  {
    id: 'j22',
    jobNumber: 'EST-2026-022',
    clientName: 'Bruce Wayne',
    clientPhone: '613-555-9988',
    clientEmail: 'bruce@waynecorp.com',
    customerPortalToken: 'portal-j22',
    projectAddress: '1007 Mountain Drive, Gotham, ON K1A 0B1',
    projectType: 'Modern Composite Deck',
    assignedUsers: ['u1'],
    assignedCrewOrSubcontractor: '',
    scheduledDate: '2026-05-10',
    currentStage: 0,
    status: JobStatus.SCHEDULED,
    pipelineStage: PipelineStage.JOB_SOLD,
    lifecycleStage: CustomerLifecycle.WON_SOLD,
    depositStatus: DepositStatus.REQUESTED,
    soldWorkflowStatus: SoldWorkflowStatus.AWAITING_DEPOSIT,
    depositAmount: 3200,
    depositRequestedDate: '2026-03-30T10:00:00Z',
    acceptedOptionId: 'opt-2',
    acceptedOptionName: 'Signature',
    acceptedDate: '2026-03-29T15:30:00Z',
    selectedAddOnIds: ['add-2'],
    estimateAmount: 32000,
    totalAmount: 32000,
    officeChecklists: createDefaultOfficeChecklists(),
    buildDetails: createDefaultBuildDetails(),
    scopeSummary: 'Modern composite deck with integrated lighting and custom privacy screen.',
    acceptedBuildSummary: {
      optionName: 'Signature',
      basePrice: 28500,
      addOns: [{ name: 'Privacy Screen', price: 3500 }],
      totalPrice: 32000,
      acceptedDate: '2026-03-29T15:30:00Z',
      scopeSummary: 'Modern composite deck with integrated lighting and custom privacy screen.'
    },
    updatedAt: new Date().toISOString(),
    portalStatus: 'shared',
    estimateData: {
      options: [
        { id: 'opt-2', name: 'Signature', title: 'Luxury Composite Decking', description: 'Our most popular choice.', price: 28500, features: ['Trex Transcend', 'Aluminum Railing'], differences: [], isRecommended: true }
      ],
      addOns: [
        { id: 'add-2', name: 'Privacy Screen', description: 'Custom cedar privacy screen.', price: 3500 }
      ],
      paymentStructure: ['10% Deposit', '40% Material', '50% Completion'],
      whatHappensNext: []
    }
  },
  {
    id: 'j23',
    jobNumber: 'EST-2026-023',
    clientName: 'Clark Kent',
    clientPhone: '613-555-1122',
    clientEmail: 'clark@dailyplanet.com',
    customerPortalToken: 'portal-j23',
    projectAddress: '344 Clinton St, Metropolis, ON K2B 8L9',
    projectType: 'Rooftop Terrace',
    assignedUsers: ['u2'],
    assignedCrewOrSubcontractor: 'Luxury Crew B',
    scheduledDate: '2026-06-01',
    currentStage: 0,
    status: JobStatus.SCHEDULED,
    pipelineStage: PipelineStage.ADMIN_SETUP,
    lifecycleStage: CustomerLifecycle.WON_SOLD,
    depositStatus: DepositStatus.RECEIVED,
    soldWorkflowStatus: SoldWorkflowStatus.READY_FOR_SETUP,
    depositAmount: 4500,
    depositRequestedDate: '2026-03-25T09:00:00Z',
    depositReceivedDate: '2026-03-27T14:20:00Z',
    acceptedOptionId: 'opt-3',
    acceptedOptionName: 'Elite',
    acceptedDate: '2026-03-24T11:00:00Z',
    selectedAddOnIds: [],
    estimateAmount: 45000,
    totalAmount: 45000,
    officeChecklists: createDefaultOfficeChecklists(),
    buildDetails: createDefaultBuildDetails(),
    scopeSummary: 'High-end rooftop terrace with PVC decking and custom planters.',
    acceptedBuildSummary: {
      optionName: 'Elite',
      basePrice: 45000,
      addOns: [],
      totalPrice: 45000,
      acceptedDate: '2026-03-24T11:00:00Z',
      scopeSummary: 'High-end rooftop terrace with PVC decking and custom planters.'
    },
    updatedAt: new Date().toISOString(),
    portalStatus: 'shared',
    estimateData: {
      options: [
        { id: 'opt-3', name: 'Elite', title: 'Ultra-Low Maintenance PVC', description: 'Premium rooftop solution.', price: 45000, features: ['AZEK PVC', 'Glass Railing'], differences: [], isRecommended: true }
      ],
      addOns: [],
      paymentStructure: ['10% Deposit', '40% Material', '50% Completion'],
      whatHappensNext: []
    }
  }
];

export const MOCK_RESOURCES: FieldResource[] = [
  {
    id: 'r1',
    title: 'Master Deck Build SOP',
    category: ResourceCategory.SOP,
    description: 'Standard Operating Procedure for all deck construction projects. Covers site prep to final cleanup.',
    fileUrl: '#',
    fileType: 'pdf',
    updatedAt: '2024-01-15',
    visibleToRoles: [Role.ADMIN, Role.MANAGER, Role.FIELD_USER, Role.SUBCONTRACTOR]
  },
  {
    id: 'r2',
    title: 'Field Installation Handbook',
    category: ResourceCategory.HANDBOOK,
    description: 'Comprehensive guide for on-site installation techniques and safety protocols.',
    fileUrl: '#',
    fileType: 'pdf',
    updatedAt: '2024-02-01',
    visibleToRoles: [Role.ADMIN, Role.MANAGER, Role.FIELD_USER, Role.SUBCONTRACTOR]
  },
  {
    id: 'r3',
    title: 'Composite Decking Build Standards',
    category: ResourceCategory.STANDARDS,
    description: 'Specific standards for composite decking, including gapping, fastening, and picture framing.',
    fileUrl: '#',
    fileType: 'pdf',
    updatedAt: '2023-11-20',
    visibleToRoles: [Role.ADMIN, Role.MANAGER, Role.FIELD_USER, Role.SUBCONTRACTOR]
  },
  {
    id: 'r4',
    title: 'QC Inspection Checklist Reference',
    category: ResourceCategory.QC,
    description: 'Visual reference for quality control inspections. What "Good" looks like.',
    fileUrl: '#',
    fileType: 'image',
    updatedAt: '2024-02-15',
    visibleToRoles: [Role.ADMIN, Role.MANAGER, Role.FIELD_USER]
  },
  {
    id: 'r5',
    title: 'Helical Pile Installation Guide',
    category: ResourceCategory.TRAINING,
    description: 'Technical guide for installing helical piles and verifying torque requirements.',
    fileUrl: '#',
    fileType: 'pdf',
    updatedAt: '2023-09-10',
    visibleToRoles: [Role.ADMIN, Role.MANAGER, Role.FIELD_USER, Role.SUBCONTRACTOR]
  },
  {
    id: 'r6',
    title: 'General Field Safety Instructions',
    category: ResourceCategory.GENERAL,
    description: 'Daily safety protocols, PPE requirements, and emergency procedures.',
    fileUrl: '#',
    fileType: 'pdf',
    updatedAt: '2024-01-05',
    visibleToRoles: [Role.ADMIN, Role.MANAGER, Role.FIELD_USER, Role.SUBCONTRACTOR]
  }
];

export const PAGE_TITLES = [
  "Job Information",
  "Day One: Site Arrival",
  "Framing & Ledger QC",
  "Decking Installation QC",
  "Stairs & Railings QC",
  "Final Completion & PDI",
  "Invoicing"
];

export const PAGE_CONFIGS: Record<number, { checklist: string[], photos: PhotoUpload[] }> = {
  1: {
    checklist: [
      "Crew lead introduced to homeowner",
      "Confirmed access points and work hours",
      "Confirmed power and water access",
      "Discussed pets, children, and safety boundaries",
      "Reviewed drawings and scope of work",
      "Confirmed deck size, height, and layout location",
      "Confirmed layout height and stair landing",
      "Existing conditions photographed",
      "Siding, doors, and windows protected",
      "Correct materials on site",
      "Customer expectations confirmed"
    ],
    photos: [
      { label: "House / Ledger Area", key: "ledger" },
      { label: "Yard Overview", key: "yard" },
      { label: "Stair Landing Area", key: "stairs" }
    ]
  },
  2: {
    checklist: [
      "Deck location matches approved drawings",
      "Deck size and projection confirmed",
      "Deck layout square (diagonals checked)",
      "Footings installed at correct locations",
      "Footing depth suitable (~1.2m)",
      "Ledger attachment approved for house condition",
      "Proper flashing installed above ledger",
      "Posts plumb and centred on footings",
      "Beams straight and level",
      "Joists installed at 16 in on centre",
      "Joists crowned consistently",
      "Blocking installed for picture frame borders",
      "Joist tape or liquid protection installed",
      "Stair opening framed correctly",
      "Entire structure solid and square"
    ],
    photos: [
      { label: "Full Framing Overview", key: "framing_full" },
      { label: "Beam-to-Post Connections", key: "beam_post" },
      { label: "Blocking / Cross-Bracing", key: "blocking" },
      { label: "Ledger Flashing Detail", key: "flashing" }
    ]
  },
  3: {
    checklist: [
      "Framing approved, joists flat",
      "Starter board straight, parallel to house",
      "Side gaps consistent (do not force tight)",
      "End gaps set for temperature (never butt tight)",
      "Hidden fasteners seated, not over-driven",
      "Face fasteners clean and flush (if used)",
      "Picture frame: mitres clean",
      "Fascia: straight, gapped",
      "Surface swept, no marks or debris",
      "Site left clean and safe"
    ],
    photos: [
      { label: "Decking at House", key: "deck_house" },
      { label: "Picture Frame Corners", key: "corners" },
      { label: "Finished Surface Overview", key: "surface" }
    ]
  },
  4: {
    checklist: [
      "Stair width planned at 48 in",
      "Riser heights uniform",
      "Stringers solidly attached to deck",
      "Treads installed level and secure",
      "Guard height meets OBC (900/1070mm)",
      "Handrail height consistent",
      "Railing posts plumb and secured",
      "Infill spacing meets OBC (<100mm)",
      "Stair triangle openings meet rule (<150mm)",
      "Area clean and safe for use"
    ],
    photos: [
      { label: "Full Stair Run", key: "stair_run" },
      { label: "Guard Height Measurement", key: "guard_height" },
      { label: "Infill Spacing Close-up", key: "infill" },
      { label: "Stringer Attachment", key: "stringer" }
    ]
  },
  5: {
    checklist: [
      "Deck structure complete and secure",
      "Decking installed and finished",
      "Stairs installed and safe",
      "Railings and guards installed and secure",
      "Site cleaned and debris removed",
      "Landscaping restored",
      "Customer walkthrough complete",
      "Handed customer 'Review Card' (Google Review QR Code)",
      "Stairs and railings demonstrated",
      "Customer questions addressed"
    ],
    photos: [
      { label: "Completed Deck (Angle 1)", key: "final_1" },
      { label: "Completed Deck (Angle 2)", key: "final_2" },
      { label: "Stairs and Railing Detail", key: "final_stairs" },
      { label: "Clean Site Overview", key: "final_site" }
    ]
  }
};

export const INITIAL_INVOICE: InvoicingData = {
  deckSqft: 0,
  joistTapeSqft: 0,
  joistPaintSqft: 0,
  deckBlocks: 0,
  dugFootings: 0,
  helicalPiles: 0,
  groundScrews: 0,
  foundationBrackets: 0,
  standardStairLf: 0,
  hasClosedRisers: false,
  premiumStairLf: 0,
  hasMitreSteps: false,
  singleBorderLf: 0,
  doubleBorderLf: 0,
  fasciaLf: 0,
  woodRailingLf: 0,
  hasAluminumSpindles: false,
  railingPosts: 0,
  standardRailingSections: 0,
  adjustableStairSections: 0,
  glassRailingSections: 0,
  framelessGlassSections: 0,
  railingGates: 0,
  skirtingSqft: 0,
  skirtingGates: 0,
  privacyPostCount: 0,
  privacyPanels: 0,
  pvcPrivacyPostCount: 0,
  pvcPrivacyBoardsLf: 0,
  woodPrivacyLf: 0,
  landscapeFabricSqft: 0,
  deckRemovalSqft: 0,
  ledgerPrepLf: 0,
  drainageSqft: 0,
  lightingKits: 0,
  lightingControlBoxes: 0,
  lightingFixtures: 0,
  trackLightingLf: 0,
  pergolaCount: 0,
  customWorkDescription: '',
  customWorkAmount: 0
};

export const RATES = {
  // Core
  deckSqft: 5.00,
  joistTapeSqft: 1.00,
  joistPaintSqft: 1.00,

  // Footings
  deckBlocks: 40.00,
  dugFootings: 125.00,
  helicalPiles: 350.00,
  groundScrews: 125.00,
  foundationBrackets: 50.00,

  // Stairs
  standardStairLf: 15.00,
  closedRiserAddon: 2.00,
  premiumStairLf: 20.00,
  mitreStepAddon: 10.00,

  // Detail
  singleBorderLf: 5.00,
  doubleBorderLf: 8.00,
  fasciaLf: 2.00,

  // Railings
  woodRailingLf: 10.00,
  aluminumSpindleAddon: 5.00,
  railingPosts: 20.00,
  standardRailingSections: 50.00,
  adjustableStairSections: 75.00,
  glassRailingSections: 50.00,
  framelessGlassSections: 100.00,
  railingGates: 100.00,

  // Skirting & Privacy
  skirtingSqft: 5.00,
  skirtingGates: 75.00,
  privacyPostCount: 50.00,
  privacyPanels: 50.00,
  pvcPrivacyPostCount: 50.00,
  pvcPrivacyBoardsLf: 5.00,
  woodPrivacyLf: 25.00,

  // Site Prep
  landscapeFabricSqft: 1.00,
  deckRemovalSqft: 2.00,
  ledgerPrepLf: 15.00,
  drainageSqft: 4.50,

  // Misc
  lightingKits: 150.00,
  lightingControlBoxes: 50.00,
  lightingFixtures: 25.00,
  trackLightingLf: 5.00,
  pergolaCount: 500.00
};

export const DEFAULT_AUTOMATIONS: PipelineAutomation[] = [
  {
    stage: PipelineStage.JOB_SOLD,
    messageTemplate: "Hi {clientName}, thank you for choosing Luxury Decking! Your project {jobNumber} is now in our system. We will notify you once admin setup is complete.",
    enabled: true
  },
  {
    stage: PipelineStage.READY_TO_START,
    messageTemplate: "Hi {clientName}, your project {jobNumber} is ready to start! Our team will be on site on {scheduledDate}. Please ensure the work area is clear.",
    enabled: true
  },
  {
    stage: PipelineStage.COMPLETION,
    messageTemplate: "Hi {clientName}, your project {jobNumber} is complete! We hope you love your new deck. A final walkthrough will be scheduled shortly.",
    enabled: true
  }
];

export const MESSAGE_TEMPLATES: MessageTemplate[] = [
  {
    id: 't1',
    title: 'Start Date Confirmation',
    category: 'start',
    content: "Hi {clientName}, this is Luxury Decking. We are confirming your project {jobNumber} is scheduled to start on {startDate}. Our team will arrive between 8-9 AM. Please ensure the work area is clear.",
    type: 'both',
    stage: PipelineStage.READY_TO_START
  },
  {
    id: 't2',
    title: 'Material Delivery Notice',
    category: 'delivery',
    content: "Hi {clientName}, your materials for project {jobNumber} are scheduled for delivery on {deliveryDate}. They will be placed on your driveway. Please let us know if you have specific placement instructions.",
    type: 'both',
    stage: PipelineStage.PRE_PRODUCTION
  },
  {
    id: 't3',
    title: 'Schedule Delay Update',
    category: 'delay',
    content: "Hi {clientName}, due to {reason}, we have a slight adjustment to your schedule for {jobNumber}. Your new estimated start date is {newDate}. We apologize for the inconvenience.",
    type: 'both'
  },
  {
    id: 't4',
    title: 'Completion Follow-Up',
    category: 'completion',
    content: "Hi {clientName}, your project {jobNumber} is now complete! We hope you love your new outdoor space. A final walkthrough has been logged. Our office will follow up with final documents shortly.",
    type: 'both',
    stage: PipelineStage.COMPLETION
  },
  {
    id: 't5',
    title: 'Google Review Request',
    category: 'review',
    content: "Hi {clientName}, it was a pleasure working on your project {jobNumber}! If you have a moment, we would greatly appreciate a review on Google: https://g.page/r/luxury-decking/review. Thank you!",
    type: 'sms',
    stage: PipelineStage.PAID_CLOSED
  },
  {
    id: 't6',
    title: 'Payment Reminder',
    category: 'payment',
    content: "Hi {clientName}, this is a friendly reminder regarding the outstanding balance for project {jobNumber}. You can pay via the link in your email or via e-transfer to office@luxurydecking.ca.",
    type: 'both'
  },
  {
    id: 't7',
    title: 'Final Warranty Package',
    category: 'warranty',
    content: "Hi {clientName}, please find your final warranty and closeout package for project {jobNumber} attached. It has been a pleasure building for you!",
    type: 'email',
    stage: PipelineStage.PAID_CLOSED
  }
];

export const MOCK_COMMUNICATION_LOGS: CommunicationLog[] = [
  {
    id: 'log1',
    jobId: 'j1',
    type: 'sms',
    direction: 'outbound',
    timestamp: '2026-03-10T10:00:00Z',
    summary: 'Start date confirmation sent',
    status: 'delivered'
  },
  {
    id: 'log2',
    jobId: 'j1',
    type: 'sms',
    direction: 'inbound',
    timestamp: '2026-03-10T10:05:00Z',
    summary: 'Client confirmed start date',
    status: 'received'
  },
  {
    id: 'log3',
    jobId: 'j2',
    type: 'email',
    direction: 'outbound',
    timestamp: '2026-03-15T09:00:00Z',
    summary: 'Material delivery notice sent',
    status: 'sent'
  }
];

export const MOCK_CHAT_SESSIONS: ChatSession[] = [
  {
    id: 'chat1',
    jobId: 'j1',
    clientName: 'John Smith',
    clientPhone: '613-555-0123',
    unreadCount: 1,
    messages: [
      { id: 'm1', senderId: 'u1', senderName: 'Admin', text: 'Hi John, we are confirming your start date for next week.', timestamp: '2026-03-10T10:00:00Z', isFromClient: false, status: 'read' },
      { id: 'm2', senderId: 'client', senderName: 'John Smith', text: 'Sounds good, thank you!', timestamp: '2026-03-10T10:05:00Z', isFromClient: true, status: 'read' },
      { id: 'm3', senderId: 'client', senderName: 'John Smith', text: 'Will you need access to the garage?', timestamp: '2026-03-28T14:00:00Z', isFromClient: true, status: 'delivered' }
    ],
    lastMessage: 'Will you need access to the garage?',
    lastMessageTimestamp: '2026-03-28T14:00:00Z'
  },
  {
    id: 'chat2',
    jobId: 'j2',
    clientName: 'Sarah Johnson',
    clientPhone: '613-555-0456',
    unreadCount: 0,
    messages: [
      { id: 'm4', senderId: 'u1', senderName: 'Admin', text: 'Hi Sarah, your materials have been ordered.', timestamp: '2026-03-15T09:00:00Z', isFromClient: false, status: 'read' }
    ],
    lastMessage: 'Hi Sarah, your materials have been ordered.',
    lastMessageTimestamp: '2026-03-15T09:00:00Z'
  }
];

export const GEOFENCE_RADIUS_METERS = 200;
export const ESTIMATED_HOURLY_RATE = 35; // Default rate for labour cost estimation

export const MOCK_TIME_ENTRIES: TimeEntry[] = [
  {
    id: 'te1',
    userId: 'u5',
    userName: 'Employee Tech',
    jobId: 'j1',
    jobNumber: 'LD-2026-001',
    type: PunchType.CHECK_IN,
    timestamp: '2026-03-28T08:00:00Z',
    location: {
      latitude: 45.4445,
      longitude: -75.6940,
      inBounds: true,
      distanceFromSite: 15
    }
  },
  {
    id: 'te2',
    userId: 'u5',
    userName: 'Employee Tech',
    jobId: 'j1',
    jobNumber: 'LD-2026-001',
    type: PunchType.CHECK_OUT,
    timestamp: '2026-03-28T16:30:00Z',
    location: {
      latitude: 45.4443,
      longitude: -75.6938,
      inBounds: true,
      distanceFromSite: 12
    }
  }
];
