export enum Role {
  ADMIN = 'ADMIN',
  ESTIMATOR = 'ESTIMATOR',
  FIELD_EMPLOYEE = 'FIELD_EMPLOYEE',
  SUBCONTRACTOR = 'SUBCONTRACTOR'
}

export enum JobStatus {
  SCHEDULED = 'SCHEDULED',
  IN_PROGRESS = 'IN_PROGRESS',
  QC_PENDING = 'QC_PENDING',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED'
}

export interface User {
  id: string;
  email: string;
  password?: string;
  name: string;
  role: Role;
}

export interface JobFile {
  id: string;
  name: string;
  url: string;
  type: 'drawing' | 'permit' | 'photo' | 'closeout' | 'contract' | 'other';
  uploadedAt: string;
  uploadedBy?: string;
}

export interface JobNote {
  id: string;
  author: string;
  text: string;
  timestamp: string;
  type: 'office' | 'site';
}

export enum OfficeReviewStatus {
  NOT_READY = 'NOT_READY',
  READY_FOR_REVIEW = 'READY_FOR_REVIEW',
  UNDER_REVIEW = 'UNDER_REVIEW',
  REVIEW_COMPLETE = 'REVIEW_COMPLETE'
}

export enum ResourceCategory {
  SOP = 'SOP / Procedures',
  HANDBOOK = 'Installation Handbook',
  STANDARDS = 'Build Standards',
  QC = 'QC / Inspection References',
  TRAINING = 'Training / Reference',
  GENERAL = 'General Field Instructions'
}

export interface FieldResource {
  id: string;
  title: string;
  category: ResourceCategory;
  description: string;
  fileUrl: string;
  fileType: 'pdf' | 'video' | 'link' | 'image';
  updatedAt: string;
  visibleToRoles: Role[];
}

export enum ScheduleStatus {
  ON_SCHEDULE = 'ON_SCHEDULE',
  AHEAD = 'AHEAD',
  BEHIND = 'BEHIND',
  DELAYED = 'DELAYED'
}

export interface FieldScheduleForecast {
  status: ScheduleStatus;
  estimatedDaysRemaining: number;
  delayReason?: string;
  note?: string;
  updatedAt: string;
  updatedBy: string;
}

export enum PipelineStage {
  // Lead stages
  LEAD_IN = 'LEAD_IN',
  FIRST_CONTACT = 'FIRST_CONTACT',
  SECOND_CONTACT = 'SECOND_CONTACT',
  THIRD_CONTACT = 'THIRD_CONTACT',
  LEAD_ON_HOLD = 'LEAD_ON_HOLD',
  LEAD_WON = 'LEAD_WON',
  LEAD_LOST = 'LEAD_LOST',
  // Estimate stages
  EST_UNSCHEDULED = 'EST_UNSCHEDULED',
  EST_SCHEDULED = 'EST_SCHEDULED',
  EST_IN_PROGRESS = 'EST_IN_PROGRESS',
  EST_COMPLETED = 'EST_COMPLETED',
  EST_SENT = 'EST_SENT',
  EST_ON_HOLD = 'EST_ON_HOLD',
  EST_APPROVED = 'EST_APPROVED',
  EST_REJECTED = 'EST_REJECTED',
  // Legacy pre-sale stages (keep for backward compatibility)
  SITE_VISIT_SCHEDULED = 'SITE_VISIT_SCHEDULED',
  ESTIMATE_IN_PROGRESS = 'ESTIMATE_IN_PROGRESS',
  ESTIMATE_SENT = 'ESTIMATE_SENT',
  FOLLOW_UP = 'FOLLOW_UP',
  // Job stages (post-sale)
  JOB_SOLD = 'JOB_SOLD',
  ADMIN_SETUP = 'ADMIN_SETUP',
  PRE_PRODUCTION = 'PRE_PRODUCTION',
  READY_TO_START = 'READY_TO_START',
  IN_FIELD = 'IN_FIELD',
  COMPLETION = 'COMPLETION',
  PAID_CLOSED = 'PAID_CLOSED'
}

export enum DepositStatus {
  NOT_SENT = 'NOT_SENT',
  REQUESTED = 'REQUESTED',
  RECEIVED = 'RECEIVED'
}

export enum SoldWorkflowStatus {
  ACCEPTED = 'ACCEPTED',
  AWAITING_DEPOSIT = 'AWAITING_DEPOSIT',
  DEPOSIT_RECEIVED = 'DEPOSIT_RECEIVED',
  READY_FOR_SETUP = 'READY_FOR_SETUP',
  MOVED_TO_ADMIN = 'MOVED_TO_ADMIN'
}

export enum CustomerLifecycle {
  NEW_LEAD = 'NEW_LEAD',
  CONTACTED = 'CONTACTED',
  ESTIMATE_IN_PROGRESS = 'ESTIMATE_IN_PROGRESS',
  ESTIMATE_SENT = 'ESTIMATE_SENT',
  FOLLOW_UP_NEEDED = 'FOLLOW_UP_NEEDED',
  WON_SOLD = 'WON_SOLD',
  ACTIVE_JOB = 'ACTIVE_JOB',
  COMPLETED = 'COMPLETED',
  WARRANTY_FOLLOW_UP = 'WARRANTY_FOLLOW_UP'
}

export enum NurtureSequence {
  NONE = 'NONE',
  ESTIMATE_FOLLOW_UP = 'ESTIMATE_FOLLOW_UP',
  WARM_LEAD_NURTURE = 'WARM_LEAD_NURTURE',
  AWAITING_CLIENT_DECISION = 'AWAITING_CLIENT_DECISION',
  POST_PROJECT_REVIEW = 'POST_PROJECT_REVIEW',
  REFERRAL_FOLLOW_UP = 'REFERRAL_FOLLOW_UP',
  WARRANTY_CHECK_IN = 'WARRANTY_CHECK_IN'
}

export enum PostProjectStatus {
  NONE = 'NONE',
  REVIEW_REQUESTED = 'REVIEW_REQUESTED',
  REVIEW_RECEIVED = 'REVIEW_RECEIVED',
  REFERRAL_OPPORTUNITY = 'REFERRAL_OPPORTUNITY',
  WARRANTY_ACTIVE = 'WARRANTY_ACTIVE',
  FOLLOW_UP_DUE = 'FOLLOW_UP_DUE'
}

export interface OfficeChecklist {
  stage: PipelineStage;
  items: ChecklistItem[];
}

export enum FieldStatus {
  PENDING = 'PENDING',
  COMPLETE = 'COMPLETE'
}

export enum CompletionPackageStatus {
  NOT_SUBMITTED = 'NOT_SUBMITTED',
  SUBMITTED = 'SUBMITTED',
  RECEIVED_READY = 'RECEIVED_READY'
}

export enum PhotoCompletionStatus {
  NOT_CONFIRMED = 'NOT_CONFIRMED',
  CONFIRMED = 'CONFIRMED'
}

export enum CompletionReadinessStatus {
  NOT_READY = 'NOT_READY',
  NEEDS_ATTENTION = 'NEEDS_ATTENTION',
  READY = 'READY'
}

export interface BuildDetails {
  sitePrep: {
    demolitionRequired: boolean;
    permitsRequired: boolean;
    locatesRequired: boolean;
    binRequired: boolean;
    siteProtection: boolean;
    inspectionRequired: boolean;
    notes: string;
  };
  footings: {
    type: string;
    attachedToHouse: boolean;
    floating: boolean;
    bracketType: string;
    notes: string;
  };
  framing: {
    type: string;
    joistSize: string;
    joistSpacing: string;
    joistProtection: boolean;
    joistProtectionType: string;
    notes: string;
  };
  landscaping: {
    prepType: string;
    notes: string;
  };
  electrical: {
    lightingIncluded: boolean;
    lightingType: string;
    roughInNotes: string;
    notes: string;
  };
  decking: {
    type: string;
    brand: string;
    color: string;
    accentNote: string;
    notes: string;
  };
  railing: {
    included: boolean;
    type: string;
    notes: string;
  };
  skirting: {
    included: boolean;
    type: string;
    trapDoor: boolean;
    notes: string;
  };
  stairs: {
    included: boolean;
    type: string;
    style: string;
    notes: string;
  };
  features: {
    privacyWall: boolean;
    privacyWallType: string;
    customNotes: string;
  };
}

export enum ForecastReviewStatus {
  UP_TO_DATE = 'UP_TO_DATE',
  REVIEW_NEEDED = 'REVIEW_NEEDED',
  REJECTED = 'REJECTED'
}

export interface WeatherDay {
  date: string;
  condition: 'sunny' | 'cloudy' | 'rainy' | 'stormy' | 'snowy';
  precipitationChance: number;
  highTemp?: number;
  lowTemp?: number;
}

export interface Job {
  id: string;
  jobNumber: string;
  clientName: string;
  clientPhone?: string;
  clientEmail?: string;
  projectAddress: string;
  latitude?: number;
  longitude?: number;
  projectType: string;
  assignedUsers: string[]; // User IDs
  assignedCrewOrSubcontractor: string;
  scheduledDate: string;
  materialDeliveryDate?: string;
  currentStage: number; // 0-5 matching existing workflow
  status: JobStatus;
  pipelineStage: PipelineStage;
  officeChecklists: OfficeChecklist[];
  scopeSummary: string;
  officeNotes: JobNote[];
  siteNotes: JobNote[];
  files: JobFile[];
  flaggedIssues: string[];
  signoffStatus: 'pending' | 'signed';
  invoiceSupportStatus: 'not_required' | 'pending' | 'submitted';
  finalSubmissionStatus: 'pending' | 'submitted';
  fieldStatus?: FieldStatus;
  completionPackageStatus?: CompletionPackageStatus;
  photoCompletionStatus?: PhotoCompletionStatus;
  completionReadinessStatus?: CompletionReadinessStatus;
  officeReviewStatus?: OfficeReviewStatus;
  updatedAt?: string;
  
  // Module 7: Scheduling
  plannedStartDate?: string;
  plannedDurationDays?: number;
  plannedFinishDate?: string;
  officialScheduleStatus?: ScheduleStatus;
  fieldForecast?: FieldScheduleForecast;
  forecastReviewStatus?: ForecastReviewStatus;
  lastScheduleUpdateAt?: string;
  lastScheduleUpdatedBy?: string;
  materialCost?: number;
  labourCost?: number;
  totalAmount?: number;
  paidAmount?: number;

  // Module: Closeout
  verifiedBuildPassportUrl?: string;
  subcontractorInvoiceUrl?: string;

  // Module: New Job Intake / Build Details
  buildDetails?: BuildDetails;

  // Module: Live Field Status
  fieldProgress?: Record<number, PageState>;
  
  // Module: Time Tracking
  timeEntries?: TimeEntry[];
  geofenceReminders?: GeofenceReminder[];

  // Module: Customer Portal
  customerPortalToken?: string;

  // Module: CRM / Customer Lifecycle
  lifecycleStage?: CustomerLifecycle;
  stageUpdatedAt?: string;
  leadSource?: string;
  assignedSalesperson?: string;
  lastContactDate?: string;
  nextFollowUpDate?: string;
  followUpStatus?: 'needed' | 'scheduled' | 'completed' | 'overdue' | 'due_today' | 'waiting';
  followUpReason?: string;
  nextAction?: {
    type: 'call' | 'email' | 'estimate' | 'consultation' | 'convert' | 'review' | 'referral' | 'none';
    label: string;
    dueDate?: string;
  };
  activities?: ActivityItem[];
  lostReason?: string;
  portalStatus?: 'not_set' | 'ready' | 'shared' | 'viewed';
  previousJobs?: string[];
  
  // Module: CRM / Estimates
  estimateStatus?: 'pending' | 'in_progress' | 'sent' | 'revised' | 'accepted' | 'declined';
  estimateAmount?: number;
  estimateSentDate?: string;
  estimateVersion?: string;
  projectedSaleDate?: string;
  estimateData?: EstimateData;
  acceptedOptionId?: string;
  acceptedOptionName?: string;
  acceptedDate?: string;
  selectedAddOnIds?: string[];
  portalEngagement?: PortalEngagement;
  aiInsights?: {
    staleLeadSummary?: string;
    activitySummary?: string;
    nextActionRecommendation?: {
      action: string;
      reasoning: string;
    };
    lastFollowUpDraft?: string;
    projectHistorySummary?: string;
  };
  lastContactDate?: string;
  engagementHeat?: 'cold' | 'warm' | 'hot';

  // Module: Phase 5 Sold Workflow
  depositStatus?: DepositStatus;
  soldWorkflowStatus?: SoldWorkflowStatus;
  depositAmount?: number;
  depositRequestedDate?: string;
  depositReceivedDate?: string;
  contractSignedDate?: string;
  customerSignature?: string;
  contractPdfUrl?: string;
  acceptedBuildSummary?: {
    optionName: string;
    basePrice: number;
    addOns: { name: string; price: number }[];
    totalPrice: number;
    scopeSummary: string;
    acceptedDate: string;
  };

  // Estimator field intake data
  estimatorIntake?: EstimatorIntake;
  // Calculator selections (materials, options chosen during estimating)
  calculatorSelections?: Record<string, string>;
  calculatorDimensions?: Record<string, number>;

  // Module: CRM / Nurture & Automation
  nurtureSequence?: NurtureSequence;
  nurtureStep?: number;
  nurtureStatus?: 'active' | 'paused' | 'completed' | 'none';
  postProjectStatus?: PostProjectStatus;

  // Drip Campaign
  dripCampaign?: {
    campaignType: 'LEAD_FOLLOW_UP' | 'ESTIMATE_FOLLOW_UP';
    startedAt: string;
    currentTouch: number;
    completedTouches: string[];
    nextTouchAt?: string;
    nextTouchId?: string;
    status: 'active' | 'paused' | 'completed' | 'cancelled';
    pauseReason?: string;
    lastEngagementTier?: string;
    sentMessages: Array<{
      touchId: string;
      channel: 'sms' | 'email';
      sentAt: string;
      engagementTier?: string;
    }>;
  };

  // Campaign scheduler state (used by automated follow-up engine)
  campaignState?: {
    leadStep?: number;
    estimateStep?: number;
    campaignStartDate?: string;
    touchesSent?: Record<string, string>;
    clientReplied?: boolean;
    paused?: boolean;
  };

  // Module: Job Acceptance — Digital Work Order
  digitalWorkOrder?: {
    clientName?: string;
    clientPhone?: string;
    clientEmail?: string;
    projectAddress?: string;
    siteAccessNotes?: string;
    parkingNotes?: string;
    packageTier?: string;
    totalPrice?: number;
    deckSqFt?: string;
    deckingMaterial?: string;
    railingType?: string;
    footingType?: string;
    stairs?: string;
    addOns?: string[];
    scopeNotes?: string;
    estimatedStartDate?: string;
    estimatedDuration?: number;
    assignedTo?: string;
    permitRequired?: boolean;
    permitNumber?: string;
    railingSystem?: string;
    footingSystem?: string;
    fastenerType?: string;
    materialDeliveryDate?: string;
    deliveryNotes?: string;
    completedAt?: string;
  };
}

export interface EstimateOption {
  id: string;
  name: string; // e.g. "Good", "Better", "Best"
  title: string;
  description: string;
  price: number;
  features: string[];
  differences: string[];
  warrantyInfo?: string;
  imageUrl?: string;
  isRecommended?: boolean;
}

export interface EstimateAddOn {
  id: string;
  name: string;
  description: string;
  price: number;
  icon?: string;
}

export interface JourneyStep {
  title: string;
  desc: string;
  icon?: string;
}

export interface EstimateData {
  options: EstimateOption[];
  addOns: EstimateAddOn[];
  expiresAt?: string;
  introduction?: string;
  whatHappensNext?: JourneyStep[];
  paymentStructure?: string[];
}

export interface PortalEngagement {
  firstOpenedAt?: string;
  lastOpenedAt?: string;
  totalOpens: number;
  optionClicks: Record<string, number>;
  addOnInteractions: Record<string, number>;
  totalTimeSpentSeconds: number;
  heatLevel?: 'Cold' | 'Warm' | 'Hot';
  viewCount?: number;
  lastViewedAt?: string;
}

export enum PunchType {
  CHECK_IN = 'CHECK_IN',
  CHECK_OUT = 'CHECK_OUT'
}

export interface PunchLocation {
  latitude: number;
  longitude: number;
  accuracy?: number;
  inBounds: boolean;
  distanceFromSite?: number; // in meters
}

export interface TimeEntry {
  id: string;
  userId: string;
  userName: string;
  jobId: string;
  jobNumber: string;
  type: PunchType;
  timestamp: string;
  location: PunchLocation;
  note?: string;
  isException?: boolean;
}

export enum LeaveSiteAction {
  ANOTHER_JOB = 'ANOTHER_JOB',
  SHOP_SUPPLIER = 'SHOP_SUPPLIER',
  RETURNING_SHORTLY = 'RETURNING_SHORTLY',
  DONE_FOR_DAY = 'DONE_FOR_DAY'
}

export interface GeofenceReminder {
  id: string;
  userId: string;
  jobId: string;
  timestamp: string;
  location: {
    latitude: number;
    longitude: number;
  };
  actionTaken?: LeaveSiteAction;
  note?: string;
}

export enum UserRole {
  FIELD_EMPLOYEE = 'FIELD_EMPLOYEE',
  SUBCONTRACTOR = 'SUBCONTRACTOR'
}

export interface JobInfo {
  jobName: string;
  jobAddress: string;
  customerName: string;
  crewLeadName: string;
  date: string;
  jobType: string;
}

export interface PhotoUpload {
  label: string;
  key: string;
  url?: string;
  cloudinaryUrl?: string;
}

export interface ChecklistItem {
  id: string;
  label: string;
  completed: boolean;
  isNA?: boolean;
}

export interface PageState {
  completed: boolean;
  checklist: ChecklistItem[];
  photos: PhotoUpload[];
}

export interface InvoicingData {
  deckSqft: number;
  joistTapeSqft: number;
  joistPaintSqft: number;
  deckBlocks: number;
  dugFootings: number;
  helicalPiles: number;
  groundScrews: number;
  foundationBrackets: number;
  standardStairLf: number;
  hasClosedRisers: boolean;
  premiumStairLf: number;
  hasMitreSteps: boolean;
  singleBorderLf: number;
  doubleBorderLf: number;
  fasciaLf: number;
  woodRailingLf: number;
  hasAluminumSpindles: boolean;
  railingPosts: number;
  standardRailingSections: number;
  adjustableStairSections: number;
  glassRailingSections: number;
  framelessGlassSections: number;
  railingGates: number;
  skirtingSqft: number;
  skirtingGates: number;
  privacyPostCount: number;
  privacyPanels: number;
  pvcPrivacyPostCount: number;
  pvcPrivacyBoardsLf: number;
  woodPrivacyLf: number;
  landscapeFabricSqft: number;
  deckRemovalSqft: number;
  ledgerPrepLf: number;
  drainageSqft: number;
  lightingKits: number;
  lightingControlBoxes: number;
  lightingFixtures: number;
  trackLightingLf: number;
  pergolaCount: number;
  customWorkDescription: string;
  customWorkAmount: number;
}

export type SyncStatus = 'synced' | 'pending' | 'syncing' | 'error';

export interface AppState {
  jobId?: string;
  currentPage: number;
  userRole: UserRole | null;
  jobInfo: JobInfo;
  pages: Record<number, PageState>;
  invoicing: InvoicingData;
  customerSignature?: string;
  customerSignatureCloudinaryUrl?: string;
  isJobSubmitted: boolean;
  fieldForecast?: FieldScheduleForecast;
  syncStatus: SyncStatus;
  lastSyncedAt?: string;
  submissionLinks?: {
    closeoutPdf?: string;
    invoicePdf?: string;
  };
}

export interface ChatMessage {
  id: string;
  senderId: string;
  senderName: string;
  text: string;
  timestamp: string;
  isFromClient: boolean;
  status: 'sent' | 'delivered' | 'read';
  templateId?: string;
}

export interface ChatSession {
  id: string;
  jobId: string;
  clientName: string;
  clientPhone?: string;
  clientEmail?: string;
  lastMessage?: string;
  lastMessageTimestamp?: string;
  unreadCount: number;
  messages: ChatMessage[];
}

export interface MessageTemplate {
  id: string;
  title: string;
  category: 'start' | 'delivery' | 'delay' | 'completion' | 'review' | 'payment' | 'warranty' | 'general';
  content: string;
  type: 'sms' | 'email' | 'both';
  stage?: PipelineStage;
}

export interface CommunicationLog {
  id: string;
  jobId: string;
  type: 'sms' | 'email' | 'call';
  direction: 'inbound' | 'outbound';
  timestamp: string;
  summary: string;
  status: string;
}

export interface ActivityItem {
  id: string;
  type: 'lead_created' | 'estimate_sent' | 'message_sent' | 'client_replied' | 'follow_up_scheduled' | 'follow_up_completed' | 'job_created' | 'stage_changed' | 'payment_received' | 'note_added' | 'nurture_started' | 'nurture_step_completed' | 'review_requested' | 'referral_prompted';
  description: string;
  timestamp: string;
  author?: string;
}

export interface PipelineAutomation {
  stage: PipelineStage;
  messageTemplate: string;
  enabled: boolean;
}

// Estimator Role Types
export interface SiteIntakeChecklist {
  elevationConfirmed: boolean;
  elevationMeasurement?: string;
  accessConfirmed: boolean;
  removalRequired: boolean;
  helicalPileAccess: boolean;
  gateOpeningMeasurement?: string;
  obstaclesIdentified: boolean;
  marketingSource?: string;
  marketingDetail?: string;
}

export interface MeasureSheet {
  // Footings
  footingType: 'helical' | 'concrete' | 'other';
  footingCount: number;
  namiFixCount: number;
  
  // Deck Structure
  ledgerLength: number;
  deckSqft: number;
  fasciaLf: number;
  pictureFrameLf: number;
  joistProtection: boolean;
  
  // Stairs & Railing
  stairLf: number;
  woodRailingLf: number;
  aluminumPostCount: number;
  aluminum6ftSections: number;
  aluminum8ftSections: number;
  aluminumStairSections: number;
  aluminumStair8Sections: number;
  glassSection6Count: number;
  glassPanelsLf: number;
  framelessSectionCount: number;
  framelessLf: number;
  drinkRailLf: number;
  
  // Skirting & Privacy
  privacyWallLf: number;
  privacyPostCount: number;
  privacyScreenCount: number;
  skirtingSqft: number;

  // Site & Landscaping
  removeDispose: boolean;
  demoSqft: number;
  fabricStoneSqft: number;
  riverWashSqft: number;
  mulchSqft: number;
  steppingStonesCount: number;
  
  // Extras
  pergolaRequired: boolean;
  pergolaSize?: string;
  lightingFixtures: number;
  permitRequired: boolean;
  elevationNote?: string;
}

export interface EstimatorAppointment {
  id: string;
  clientName: string;
  address: string;
  time: string;
  date: string;
  type: 'estimate' | 'site_visit';
  status: 'scheduled' | 'completed' | 'cancelled';
  notes?: string;
}

export interface InstallBlock {
  id: string;
  clientName: string;
  address: string;
  startDate: string;
  endDate: string;
  crewName: string;
  status: 'confirmed' | 'tentative';
}

export interface SketchPoint {
  x: number;
  y: number;
}

export interface SketchStroke {
  points: number[]; // [x, y, x, y, ...]
  color: string;
  width: number;
}

export interface SketchLabel {
  id: string;
  text: string;
  x: number;
  y: number;
}

export interface SketchData {
  strokes: SketchStroke[];
  labels?: SketchLabel[];
  backgroundImage?: string;
}

export interface EstimatorPhoto {
  id: string;
  url: string;
  category: 'site' | 'obstacle' | 'access' | 'other';
  note?: string;
  timestamp: string;
}

export interface AiFlag {
  id: string;
  type: 'missing' | 'mismatch' | 'suggestion' | 'reminder';
  category: 'intake' | 'measures' | 'sketch' | 'photos';
  message: string;
  severity: 'low' | 'medium' | 'high';
  resolved: boolean;
}

export interface AiHandoffSummary {
  keyMeasurements: string[];
  siteConditions: string[];
  constraints: string[];
  upgrades: string[];
  missingItems: string[];
  overallCompletion: number;
}

export interface EstimatorIntake {
  jobId: string;
  checklist: SiteIntakeChecklist;
  measureSheet: MeasureSheet;
  sketch: SketchData;
  photos: EstimatorPhoto[];
  notes: string;
  status: 'in_progress' | 'completed';
  updatedAt: string;
  aiInsights?: {
    flags: AiFlag[];
    summary?: string;
    handoff?: AiHandoffSummary;
    lastCheckedAt?: string;
  };
}
