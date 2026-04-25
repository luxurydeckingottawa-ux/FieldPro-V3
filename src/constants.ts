import { PhotoUpload, InvoicingData, User, Role, Job, PipelineStage, OfficeChecklist, BuildDetails, PipelineAutomation, MessageTemplate } from './types';
import { COMPANY } from './config/company';

// Pre-sale pipeline stages — jobs in these stages route to estimate-detail view
export const ESTIMATE_STAGES: PipelineStage[] = [
  PipelineStage.LEAD_IN, PipelineStage.FIRST_CONTACT, PipelineStage.SECOND_CONTACT,
  PipelineStage.THIRD_CONTACT, PipelineStage.LEAD_ON_HOLD, PipelineStage.LEAD_WON, PipelineStage.LEAD_LOST,
  PipelineStage.EST_UNSCHEDULED, PipelineStage.EST_SCHEDULED, PipelineStage.EST_IN_PROGRESS,
  PipelineStage.EST_COMPLETED, PipelineStage.EST_SENT, PipelineStage.EST_ON_HOLD,
  PipelineStage.EST_APPROVED, PipelineStage.EST_REJECTED,
  PipelineStage.SITE_VISIT_SCHEDULED, PipelineStage.ESTIMATE_IN_PROGRESS,
  PipelineStage.ESTIMATE_SENT, PipelineStage.FOLLOW_UP,
];

export const LOST_REASONS = [
  'Too expensive',
  'No response',
  'Went with competitor',
  'Project postponed',
  'Project cancelled',
  'Timing issue',
  'Other'
];

export const APP_USERS: User[] = [
  { id: 'u1', email: 'admin@luxurydecking.ca', name: 'Admin User', role: Role.ADMIN },
  { id: 'u2', email: 'estimator@luxurydecking.ca', name: 'Field Estimator', role: Role.ESTIMATOR },
  { id: 'u3', email: 'field@luxurydecking.ca', name: 'Field Lead', role: Role.FIELD_EMPLOYEE },
  { id: 'u4', email: 'sub@external.ca', name: 'Subcontractor A', role: Role.SUBCONTRACTOR },
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
    "Book helical piles if needed (sets project start window)",
    "Order special-order materials if needed",
    "Order lighting if needed",
    "Request locates if needed",
    "Apply for permits if needed",
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

// Merge stored checklists with the latest OFFICE_CHECKLIST_CONFIG so that
// jobs created before a constant change still surface newly added items.
// Match priority: by id (legacy index-based), then by exact label. Items
// present in stored but not in config are kept (covers custom additions
// or labels Jack renamed historically).
export const reconcileOfficeChecklists = (stored: OfficeChecklist[] | undefined): OfficeChecklist[] => {
  const baseline = createDefaultOfficeChecklists();
  if (!stored || stored.length === 0) return baseline;

  return baseline.map(baseStage => {
    const storedStage = stored.find(s => s.stage === baseStage.stage);
    if (!storedStage) return baseStage;

    const merged = baseStage.items.map(baseItem => {
      const byId = storedStage.items.find(si => si.id === baseItem.id);
      if (byId && byId.label === baseItem.label) return byId; // index AND label match — straight reuse
      const byLabel = storedStage.items.find(si => si.label === baseItem.label);
      if (byLabel) return { ...baseItem, completed: byLabel.completed, isNA: byLabel.isNA }; // label match — preserve state
      return baseItem; // brand new item — uncompleted
    });

    // Preserve any stored items that are NOT in the current config (e.g. user-added or
    // historically renamed). They render at the bottom so the canonical order stays first.
    const baselineLabels = new Set(baseStage.items.map(i => i.label));
    const orphans = storedStage.items.filter(si => !baselineLabels.has(si.label));

    return { stage: baseStage.stage, items: [...merged, ...orphans] };
  });
};

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

export const PAGE_TITLES = [
  "Job Information",
  "Day One: Site Arrival",
  "Framing & Ledger QC",
  "Decking Installation QC",
  "Stairs & Railings QC",
  "Final Completion & PDI",
  "Invoicing"
];

/**
 * Field workflow page configs.
 *
 * `appliesTo` (optional) controls which job types include the page.
 * When omitted, the page is shown for every job type. Used to skip the
 * Stairs & Railings QC page (page 4) on Deck-only jobs so techs aren't
 * walked through irrelevant items. See `getActivePageIndices()` below.
 *
 * Job type strings come from JobInfoView's <select>:
 *   "Deck"           = Deck Only (no stairs, no railings)
 *   "Deck+Stairs"    = Deck with stairs (low-rise, no rails)
 *   "Deck+Railings"  = Deck with railings (no separate stair run)
 *   "FullBuild"      = Deck + Stairs + Railings
 */
export type FieldJobType = 'Deck' | 'Deck+Stairs' | 'Deck+Railings' | 'FullBuild';

export const PAGE_CONFIGS: Record<number, {
  checklist: string[];
  photos: PhotoUpload[];
  appliesTo?: FieldJobType[];
}> = {
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
      "Correct materials on site"
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
    // Skipped on Deck-only jobs — no stairs, no railings to inspect.
    appliesTo: ['Deck+Stairs', 'Deck+Railings', 'FullBuild'],
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
      "Customer walkthrough complete",
      "Handed customer 'Review Card' (Google Review QR Code)",
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

/**
 * Returns the ordered list of page indices that apply to a given job type.
 * Always starts with 0 (JobInfoView) and ends with the workflow tail
 * (page 5 = Final PDI, page 6 = Invoicing/Review). Checklist pages 1-5
 * are filtered using each PAGE_CONFIGS entry's `appliesTo`.
 *
 * Example: jobType="Deck" returns [0, 1, 2, 3, 5, 6, 7] — page 4
 *   (Stairs & Railings QC) is skipped.
 */
export function getActivePageIndices(jobType?: string): number[] {
  const checklistPages = [1, 2, 3, 4, 5].filter(idx => {
    const cfg = PAGE_CONFIGS[idx];
    if (!cfg?.appliesTo) return true; // shown for all job types by default
    if (!jobType) return true; // unknown job type — be permissive
    return cfg.appliesTo.includes(jobType as FieldJobType);
  });
  // 0 = JobInfoView, then filtered checklist pages, then 6 (invoicing) and 7 (review)
  return [0, ...checklistPages, 6, 7];
}

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
    messageTemplate: "Hi {clientName}, thank you for choosing {companyName}! Your project {jobNumber} is now in our system. We will reach out if we need any additional information from you.",
    enabled: true
  },
  {
    // Manual-only — Jack triggers this from the Pre-Production checklist
    // "Notify customer and confirm start date 48 hours before" Text button,
    // which opens QuickMessageModal pre-filled with this template so he
    // can drop the actual date in before sending.
    stage: PipelineStage.READY_TO_START,
    messageTemplate: "Hi {clientName}, your project {jobNumber} is ready to start! Our team will be on site on {scheduledDate}. Please ensure the work area is clear.",
    enabled: false
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
    content: "Hi {clientName}, this is {companyName}. We are confirming your project {jobNumber} is scheduled to start on {startDate}. Our team will arrive between 8-9 AM. Please ensure the work area is clear.",
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

export const GEOFENCE_RADIUS_METERS = 200;
export const ESTIMATED_HOURLY_RATE = 35; // Default rate for labour cost estimation

