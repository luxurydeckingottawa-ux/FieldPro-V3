/**
 * AppRouter -- Extracted from App.tsx (Phase 5, A-04).
 *
 * Contains ALL view routing logic: early returns (login, workflow,
 * calculator, public booking, customer portal) and the main shell
 * (NavBar + ErrorBoundary + view switch + JobAcceptanceModal).
 *
 * App.tsx renders `<AppRouter {...routerProps} />` and nothing else in JSX.
 */

import React from 'react';
import {
  User, Job, Role, AppState, PipelineStage, CustomerLifecycle,
  ChatSession, PortalEngagement, OfficeReviewStatus,
  EstimatorIntake, Invoice, Customer,
} from '../types';
import { ESTIMATE_STAGES } from '../constants';
// LoginView remains statically imported — it is on the landing path for logged-out
// users and lazy-loading it would cause a visible loading spinner on login.
import LoginView from '../views/LoginView';
import NavBar from './NavBar';
import AcceptanceModal from './AcceptanceModal';
import JobAcceptanceModal from './JobAcceptanceModal';
import { EstimatorCalendar } from './EstimatorCalendar';
import { AlertCircle, ChevronLeft } from 'lucide-react';
import { aggressiveFreeSpace, getStorageUsageKB } from '../utils/storage';
import { COMPANY } from '../config/company';
import { sendAppointmentConfirmationSms } from '../utils/communications';

// Code-split views — every non-login route is lazy so the main shell stays lean.
import {
  // Originally lazy
  EstimatorCalculatorView, OfficeJobDetailView, CustomerPortalView,
  EstimateDetailView, StatsView, ChatView,
  // Newly lazy (Phase 2 cohesion pass — bundle split)
  WorkflowContainer, PublicBookingView, EstimatePortalView,
  JobsListView, JobDetailView, OfficeDashboardView, NewJobIntakeView,
  EstimatorDashboardView, EstimatorWorkflowView, BookingSettingsView,
  AutomationSettingsView, BusinessInfoView, PriceBookView, CustomersView,
  InvoicesView, FieldResourcesView, UserManagementView, UnifiedPipelineView,
  SchedulingCalendarView,
} from '../LazyViews';

// ── Error Boundary (co-located -- only used by AppRouter) ──────────────────

class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; error: Error | null }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('ErrorBoundary caught an error', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="p-8 bg-rose-50 border-2 border-rose-200 rounded-2xl m-4">
          <h2 className="text-2xl font-bold text-rose-700 mb-4 flex items-center gap-2">
            <AlertCircle className="w-8 h-8" />
            Something went wrong
          </h2>
          <pre className="bg-white p-4 rounded-xl border border-rose-100 text-rose-600 overflow-auto max-h-[400px] text-sm font-mono">
            {this.state.error?.stack || this.state.error?.message}
          </pre>
          <button
            onClick={() => window.location.reload()}
            className="mt-6 px-6 py-3 bg-rose-600 text-white rounded-xl font-bold hover:bg-rose-700 transition-colors"
          >
            Reload Application
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

// ── Props ──────────────────────────────────────────────────────────────────

export interface AppRouterProps {
  // Auth & nav
  view: string;
  currentUser: User | null;
  theme: 'dark' | 'light';
  navigateTo: (view: string, id?: string) => void;
  handleLogin: (user: User) => void;
  handleLogout: () => void;
  setTheme: React.Dispatch<React.SetStateAction<'dark' | 'light'>>;

  // Jobs
  jobs: Job[];
  setJobs: React.Dispatch<React.SetStateAction<Job[]>>;
  selectedJob: Job | null;
  setSelectedJob: React.Dispatch<React.SetStateAction<Job | null>>;
  handleSelectJob: (job: Job) => void;
  handleUpdateJob: (jobId: string, updates: Partial<Job>) => void;
  handleDeleteJob: (jobId: string) => void;
  handleUpdatePipelineStage: (jobId: string, newStage: PipelineStage) => void;
  handleCreateJob: (job: Job) => void;
  handleOpenWorkflow: (job: Job) => void;
  handleUpdateOfficeChecklist: (jobId: string, stage: PipelineStage, itemId: string, completed: boolean, isNA?: boolean) => void;
  handleUpdateSchedule: (jobId: string, updates: Partial<Job>) => void;
  handleUpdateOfficeReviewStatus: (jobId: string, status: OfficeReviewStatus) => void;
  handleUpdateFieldForecast: (jobId: string, forecast: unknown) => void;
  handleUpdateEstimatorIntake: (intake: EstimatorIntake) => void;

  // Estimator / calculator
  handleOpenNewEstimate: () => void;
  handleOpenEstimateForJob: (job: Job) => Promise<void>;
  handlePushToEstimating: (intake: EstimatorIntake) => void;
  handleEstimateAcceptedLocal: (data: {
    clientName: string;
    clientAddress: string;
    estimateNumber: number;
    selections: unknown;
    dimensions: unknown;
    pricingSummary: unknown;
    activePackage: unknown;
  }) => void;
  handleEstimateSaved: (data: unknown) => void;
  calculatorInitialDimensions: unknown;
  calculatorInitialClientInfo: { name: string; address: string } | undefined;
  calculatorInitialSelections: unknown;
  /** Full options array for restoring a multi-option estimate on reopen */
  calculatorInitialOptions?: unknown[];
  calculatorSourceJobId: string | null;
  showCalculatorAcceptance: boolean;
  setShowCalculatorAcceptance: React.Dispatch<React.SetStateAction<boolean>>;
  calculatorAcceptanceJob: Job | null;

  // Portal
  portalLoading: boolean;
  onAcceptOption: (optionId: string, addOns: string[]) => void;
  onSignContract: (jobId: string, signature: string) => Promise<void>;
  onTrackEngagement: (engagement: Partial<PortalEngagement>) => void;
  handleClosePortal: () => void;

  // Workflow (field)
  workflowState: AppState;
  setWorkflowState: React.Dispatch<React.SetStateAction<AppState>>;
  isOnline: boolean;
  isUploading: boolean;
  uploadProgress: string;
  submissionError: string | null;
  handleFullSubmission: () => Promise<void>;
  handleFieldScheduleUpdate: (daysRemaining: number, status?: unknown, note?: string) => void;

  // Chat
  chatSessions: ChatSession[];
  handleSendMessage: (sessionId: string, text: string, isFromClient?: boolean) => void;

  // Customers
  customers: Customer[];
  handleUpdateCustomer: (customerId: string, updates: Partial<Customer>) => void;

  // Invoices
  invoices: Invoice[];
  handleUpdateInvoice: (invoiceId: string, updates: Partial<Invoice>) => void;
  handleGenerateInvoice: (type: unknown) => void;

  // Job acceptance wizard
  pendingJobAcceptance: Job | null;
  setPendingJobAcceptance: React.Dispatch<React.SetStateAction<Job | null>>;

  // New job intake
  newJobInitialStage: PipelineStage;
  setNewJobInitialStage: React.Dispatch<React.SetStateAction<PipelineStage>>;
  newJobPrefilledDate: string | undefined;
  setNewJobPrefilledDate: React.Dispatch<React.SetStateAction<string | undefined>>;
  newJobPrefilledContact: { clientName?: string; clientPhone?: string; clientEmail?: string; projectAddress?: string } | undefined;
  setNewJobPrefilledContact: React.Dispatch<React.SetStateAction<{ clientName?: string; clientPhone?: string; clientEmail?: string; projectAddress?: string } | undefined>>;

  // Alerts
  aiError: string | null;
  storageError: boolean;
}

// ── Component ──────────────────────────────────────────────────────────────

const AppRouter: React.FC<AppRouterProps> = (props) => {
  const {
    view, currentUser, theme, navigateTo, handleLogin, handleLogout, setTheme,
    jobs, setJobs, selectedJob, setSelectedJob,
    handleSelectJob, handleUpdateJob, handleDeleteJob, handleUpdatePipelineStage,
    handleCreateJob, handleOpenWorkflow,
    handleUpdateOfficeChecklist, handleUpdateSchedule,
    handleUpdateOfficeReviewStatus, handleUpdateFieldForecast,
    handleUpdateEstimatorIntake,
    handleOpenNewEstimate, handleOpenEstimateForJob, handlePushToEstimating,
    handleEstimateAcceptedLocal, handleEstimateSaved,
    calculatorInitialDimensions, calculatorInitialClientInfo, calculatorInitialSelections,
    calculatorInitialOptions,
    calculatorSourceJobId,
    showCalculatorAcceptance, setShowCalculatorAcceptance, calculatorAcceptanceJob,
    portalLoading, onAcceptOption, onSignContract, onTrackEngagement, handleClosePortal,
    workflowState, setWorkflowState, isOnline, isUploading, uploadProgress,
    submissionError, handleFullSubmission, handleFieldScheduleUpdate,
    chatSessions, handleSendMessage,
    customers, handleUpdateCustomer,
    invoices, handleUpdateInvoice, handleGenerateInvoice,
    pendingJobAcceptance, setPendingJobAcceptance,
    newJobInitialStage, setNewJobInitialStage,
    newJobPrefilledDate, setNewJobPrefilledDate,
    newJobPrefilledContact, setNewJobPrefilledContact,
    aiError, storageError,
  } = props;

  // ── Early returns (full-screen views without NavBar shell) ───────────────

  if (view === 'login') {
    return <LoginView onLogin={handleLogin} />;
  }

  const PUBLIC_VIEWS = ['customer-portal', 'estimate-portal'];
  if (!currentUser && !PUBLIC_VIEWS.includes(view)) {
    return <LoginView onLogin={handleLogin} />;
  }

  if (view === 'workflow') {
    return (
      <WorkflowContainer
        state={workflowState}
        setState={setWorkflowState}
        isOnline={isOnline}
        isUploading={isUploading}
        uploadProgress={uploadProgress}
        error={submissionError}
        onFullSubmission={handleFullSubmission}
        onExit={() => navigateTo('detail', selectedJob?.id)}
        clientPhone={selectedJob?.clientPhone}
        onScheduleUpdate={handleFieldScheduleUpdate}
      />
    );
  }

  if (view === 'estimator-calculator') {
    return (
      <>
        <EstimatorCalculatorView
          initialOptions={calculatorInitialOptions as any}
          initialDimensions={calculatorInitialOptions ? undefined : calculatorInitialDimensions}
          initialClientInfo={calculatorInitialClientInfo}
          initialSelections={calculatorInitialOptions ? undefined : calculatorInitialSelections}
          onEstimateAccepted={handleEstimateAcceptedLocal}
          onEstimateSaved={handleEstimateSaved}
          onExit={() => navigateTo(currentUser?.role === Role.ADMIN ? 'office-pipeline' : 'estimator-dashboard')}
        />
        {showCalculatorAcceptance && calculatorAcceptanceJob && (
          <AcceptanceModal
            job={calculatorAcceptanceJob}
            isOpen={showCalculatorAcceptance}
            onClose={() => setShowCalculatorAcceptance(false)}
            onAccept={(jobId, updates) => {
              handleUpdateJob(jobId, updates);
              if (updates.pipelineStage) {
                handleUpdatePipelineStage(jobId, updates.pipelineStage);
              }
              setShowCalculatorAcceptance(false);
              const jobForSetup = jobs.find(j => j.id === jobId) ?? calculatorAcceptanceJob;
              if (jobForSetup) {
                setPendingJobAcceptance({ ...jobForSetup, ...updates });
              } else {
                navigateTo('office-job-detail', jobId);
              }
            }}
          />
        )}
      </>
    );
  }

  if (view === 'public-booking') {
    return (
      <PublicBookingView
        existingJobs={jobs}
        onBookingComplete={(job) => {
          setJobs(prev => [job, ...prev]);
        }}
      />
    );
  }

  if (view === 'customer-portal') {
    return (
      <div className="min-h-screen bg-slate-50">
        {portalLoading ? (
          <div className="min-h-screen flex items-center justify-center bg-[#FDFCFB]">
            <div className="text-center space-y-4">
              <div className="h-12 w-12 border-4 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto" />
              <p className="text-slate-500 text-sm">Loading your project...</p>
            </div>
          </div>
        ) : selectedJob ? (
          (selectedJob.pipelineStage === PipelineStage.EST_SENT ||
           selectedJob.pipelineStage === PipelineStage.EST_COMPLETED ||
           selectedJob.pipelineStage === PipelineStage.EST_APPROVED ||
           selectedJob.pipelineStage === PipelineStage.EST_ON_HOLD ||
           selectedJob.pipelineStage === PipelineStage.EST_IN_PROGRESS ||
           selectedJob.pipelineStage === PipelineStage.EST_UNSCHEDULED ||
           selectedJob.pipelineStage === PipelineStage.EST_SCHEDULED ||
           selectedJob.pipelineStage === PipelineStage.EST_REJECTED ||
           ((selectedJob.lifecycleStage === CustomerLifecycle.ESTIMATE_SENT ||
             selectedJob.lifecycleStage === CustomerLifecycle.FOLLOW_UP_NEEDED) &&
            ![PipelineStage.JOB_SOLD, PipelineStage.ADMIN_SETUP, PipelineStage.PRE_PRODUCTION,
              PipelineStage.READY_TO_START, PipelineStage.IN_FIELD, PipelineStage.COMPLETION,
              PipelineStage.PAID_CLOSED].includes(selectedJob.pipelineStage)) ||
           !selectedJob.pipelineStage) ? (
            <EstimatePortalView
              job={selectedJob}
              onAcceptOption={onAcceptOption}
              onSignContract={onSignContract}
              onTrackEngagement={onTrackEngagement}
              onClose={(currentUser?.role === Role.ADMIN || false) ? handleClosePortal : undefined}
            />
          ) : (
            <CustomerPortalView
              job={selectedJob}
              allJobs={jobs}
              chatSessions={chatSessions}
              onSendMessage={(sessionId, text) => handleSendMessage(sessionId, text, true)}
              onBack={(currentUser?.role === Role.ADMIN || false) ? handleClosePortal : undefined}
            />
          )
        ) : (
          <div className="min-h-screen flex items-center justify-center bg-[#FDFCFB]">
            <div className="text-center space-y-4 px-6">
              <div className="h-16 w-16 bg-rose-100 text-rose-600 rounded-full flex items-center justify-center mx-auto mb-6">
                <AlertCircle className="w-8 h-8" />
              </div>
              <h2 className="text-2xl font-bold tracking-tight text-slate-900">Invalid Portal Link</h2>
              <p className="text-slate-500 max-w-xs mx-auto">This project link is no longer active or is incorrect. Please check with your project manager.</p>
              <div className="flex flex-col gap-3 pt-6">
                {currentUser && (currentUser.role === Role.ADMIN) ? (
                  <button
                    onClick={() => navigateTo('office-dashboard')}
                    className="px-6 py-3 bg-slate-900 text-white rounded-xl font-bold shadow-lg shadow-slate-900/20"
                  >
                    Return to Dashboard
                  </button>
                ) : (
                  <button
                    onClick={() => { window.location.href = window.location.origin; }}
                    className="px-6 py-3 bg-slate-900 text-white rounded-xl font-bold shadow-lg shadow-slate-900/20"
                  >
                    Go to Homepage
                  </button>
                )}
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest pt-4">
                  {COMPANY.name} Field Pro
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // ── Main shell (NavBar + ErrorBoundary + view switch) ────────────────────

  return (
    <div className="min-h-screen bg-[var(--bg-primary)] text-[var(--text-primary)] transition-colors duration-300">
      {currentUser && (
        <NavBar
          currentUser={currentUser}
          view={view}
          theme={theme}
          onNavigate={(v) => navigateTo(v)}
          onLogout={handleLogout}
          onToggleTheme={() => setTheme(prev => prev === 'dark' ? 'light' : 'dark')}
          onOpenEstimator={handleOpenNewEstimate}
          onNewLead={() => {
            setNewJobInitialStage(PipelineStage.LEAD_IN);
            navigateTo('office-new-job');
          }}
          onNewEstimateAppointment={() => {
            setNewJobInitialStage(PipelineStage.EST_UNSCHEDULED);
            navigateTo('office-new-job');
          }}
          onNewJob={() => {
            setNewJobInitialStage(PipelineStage.JOB_SOLD);
            navigateTo('office-new-job');
          }}
        />
      )}

      <main className="py-0 max-w-7xl mx-auto px-6 mt-6">
        {aiError && (
          <div className="mb-6 p-4 bg-rose-50 border border-rose-200 rounded-xl flex items-center gap-3 text-rose-700 animate-in fade-in slide-in-from-top-4 duration-300">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <div className="flex-1">
              <p className="font-bold text-sm">AI Configuration Issue</p>
              <p className="text-xs opacity-90">{aiError}</p>
            </div>
            {window.aistudio && (
              <button
                onClick={() => window.aistudio?.openSelectKey()}
                className="px-3 py-1.5 bg-rose-600 text-white text-xs font-bold rounded-lg hover:bg-rose-700 transition-colors"
              >
                Select Key
              </button>
            )}
          </div>
        )}

        {storageError && (
          <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-xl flex items-center gap-3 text-amber-700 animate-in fade-in slide-in-from-top-4 duration-300">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <div className="flex-1">
              <p className="font-bold text-sm">Device Storage Full ({(getStorageUsageKB() / 1024).toFixed(1)} MB / 5 MB)</p>
              <p className="text-xs opacity-90">All job data is safely on the server. Tap Clear Cache to free space on this device — nothing will be lost.</p>
            </div>
            <button
              onClick={() => {
                const freed = aggressiveFreeSpace();
                alert(`Cleared ${(freed / 1024).toFixed(1)} MB. Your data is safely backed up.`);
                window.location.reload();
              }}
              className="px-3 py-1.5 bg-amber-600 text-white text-xs font-bold rounded-lg hover:bg-amber-700 transition-colors whitespace-nowrap"
            >
              Clear Cache
            </button>
          </div>
        )}

        <ErrorBoundary>
          {view === 'jobs' && currentUser && (
            <JobsListView
              user={currentUser}
              jobs={jobs}
              onSelectJob={handleSelectJob}
              onViewResources={() => navigateTo('resources')}
            />
          )}
          {view === 'office-pipeline' && currentUser && (
            <UnifiedPipelineView
              jobs={jobs}
              onSelectJob={handleSelectJob}
              onNewJob={(stage) => { setNewJobInitialStage(stage); navigateTo('office-new-job'); }}
              onOpenEstimator={handleOpenNewEstimate}
              onUpdatePipelineStage={handleUpdatePipelineStage}
              onAutomationSettings={() => navigateTo('automation-settings')}
            />
          )}
          {view === 'customers' && currentUser && (
            <CustomersView
              customers={customers}
              onUpdateCustomer={handleUpdateCustomer}
              onBack={() => navigateTo('office-pipeline')}
            />
          )}
          {view === 'invoices' && currentUser && (
            <InvoicesView
              invoices={invoices}
              onUpdateInvoice={handleUpdateInvoice}
              onBack={() => navigateTo('office-dashboard')}
            />
          )}
          {view === 'office-new-job' && currentUser && (
            <NewJobIntakeView
              onSave={(job) => { setNewJobPrefilledDate(undefined); setNewJobPrefilledContact(undefined); handleCreateJob(job); }}
              onCancel={() => { setNewJobPrefilledDate(undefined); setNewJobPrefilledContact(undefined); navigateTo(currentUser?.role === Role.ESTIMATOR ? 'estimator-dashboard' : 'office-pipeline'); }}
              initialStage={newJobInitialStage}
              initialDate={newJobPrefilledDate}
              allJobs={jobs}
              prefilledContact={newJobPrefilledContact}
            />
          )}
          {view === 'office-job-detail' && selectedJob && currentUser && (
            <OfficeJobDetailView
              job={selectedJob}
              allJobs={jobs}
              onBack={() => navigateTo('office-pipeline')}
              onUpdatePipelineStage={handleUpdatePipelineStage}
              onUpdateOfficeChecklist={handleUpdateOfficeChecklist}
              onUpdateJob={handleUpdateJob}
              onUpdateSchedule={handleUpdateSchedule}
              onOpenFieldWorkflow={(job) => {
                setSelectedJob(job);
                handleOpenWorkflow(job);
              }}
              onSendMessage={handleSendMessage}
              onPreviewPortal={(job) => {
                if (!job) return;
                setSelectedJob(job);
                navigateTo('customer-portal', selectedJob?.customerPortalToken || selectedJob?.id);
              }}
              onDeleteJob={handleDeleteJob}
              onOpenJobSetup={() => setPendingJobAcceptance(selectedJob)}
              onGenerateInvoice={handleGenerateInvoice}
              jobInvoices={invoices.filter(i => i.jobId === selectedJob.id)}
            />
          )}
          {view === 'estimate-detail' && selectedJob && currentUser && (
            <EstimateDetailView
              job={selectedJob}
              onBack={() => navigateTo('office-pipeline')}
              onUpdateJob={handleUpdateJob}
              onUpdatePipelineStage={(jobId, newStage) => {
                handleUpdatePipelineStage(jobId, newStage);
                if (newStage === PipelineStage.JOB_SOLD) {
                  const jobForSetup = jobs.find(j => j.id === jobId) ?? selectedJob;
                  if (jobForSetup) {
                    setPendingJobAcceptance({ ...jobForSetup, pipelineStage: newStage });
                  }
                }
              }}
              onOpenEstimator={(job) => {
                setSelectedJob(job);
                handleOpenEstimateForJob(job);
              }}
              onPreviewPortal={(job) => {
                setSelectedJob(job);
                navigateTo('customer-portal', selectedJob?.customerPortalToken || selectedJob?.id);
              }}
              onDeleteJob={handleDeleteJob}
              onJobAccepted={(jobId) => {
                const jobForSetup = jobs.find(j => j.id === jobId) ?? selectedJob;
                if (jobForSetup) {
                  setPendingJobAcceptance(jobForSetup);
                } else {
                  navigateTo('office-job-detail', jobId);
                }
              }}
              onBookAppointment={(job) => {
                setNewJobInitialStage(PipelineStage.EST_UNSCHEDULED);
                setNewJobPrefilledContact({
                  clientName: job.clientName,
                  clientPhone: job.clientPhone,
                  clientEmail: job.clientEmail,
                  projectAddress: job.projectAddress,
                });
                navigateTo('office-new-job');
              }}
            />
          )}
          {view === 'office-dashboard' && currentUser && (
            <OfficeDashboardView
              jobs={jobs}
              onSelectJob={handleSelectJob}
              onViewResources={() => navigateTo('resources')}
              onNewJob={() => { setNewJobInitialStage(PipelineStage.LEAD_IN); navigateTo('office-new-job'); }}
            />
          )}
          {view === 'stats' && currentUser && (
            <StatsView
              jobs={jobs}
              onBack={() => navigateTo('office-dashboard')}
            />
          )}
          {view === 'detail' && selectedJob && currentUser && (
            <JobDetailView
              job={selectedJob}
              user={currentUser}
              allJobs={jobs}
              onBack={() => navigateTo(currentUser.role === Role.ADMIN ? 'office-dashboard' : 'jobs')}
              onOpenWorkflow={handleOpenWorkflow}
              onUpdateOfficeReviewStatus={handleUpdateOfficeReviewStatus}
              onUpdateSchedule={handleUpdateSchedule}
              onUpdateFieldForecast={handleUpdateFieldForecast}
              onSendMessage={handleSendMessage}
            />
          )}
          {view === 'user-management' && currentUser?.role === Role.ADMIN && (
            <UserManagementView onBack={() => navigateTo('office-dashboard')} />
          )}
          {view === 'resources' && currentUser && (
            <FieldResourcesView
              user={currentUser}
              onBack={() => navigateTo(currentUser.role === Role.ADMIN ? 'office-dashboard' : 'jobs')}
            />
          )}
          {view === 'scheduling' && currentUser && (
            <SchedulingCalendarView
              jobs={jobs}
              onSelectJob={handleSelectJob}
              onUpdateSchedule={handleUpdateSchedule}
              onNewAppointment={(date) => {
                setNewJobPrefilledDate(date);
                setNewJobInitialStage(PipelineStage.EST_UNSCHEDULED);
                navigateTo('office-new-job');
              }}
              onSendMessage={(phone, name) => sendAppointmentConfirmationSms(phone, name)}
            />
          )}
          {view === 'chat' && currentUser && (
            <ChatView
              sessions={chatSessions}
              currentUser={currentUser}
              jobs={jobs}
              onSendMessage={handleSendMessage}
            />
          )}
          {view === 'estimator-dashboard' && currentUser && (
            <EstimatorDashboardView
              jobs={jobs}
              onSelectJob={handleSelectJob}
              onOpenCalendar={() => navigateTo('estimator-calendar')}
              onNewEstimate={() => { setNewJobInitialStage(PipelineStage.EST_UNSCHEDULED); navigateTo('office-new-job'); }}
            />
          )}
          {view === 'estimator-calendar' && currentUser && (
            <div className="flex flex-col h-full overflow-hidden">
              <div className="bg-[var(--bg-primary)] p-2 border-b border-[var(--border-color)]">
                <button
                  onClick={() => navigateTo('estimator-dashboard')}
                  className="flex items-center gap-2 px-4 py-2 text-sm font-bold text-[var(--brand-gold)] hover:bg-[var(--brand-gold)]/5 rounded-xl transition-all"
                >
                  <ChevronLeft className="w-4 h-4" />
                  Back to Dashboard
                </button>
              </div>
              <div className="flex-1 overflow-hidden">
                <EstimatorCalendar
                  appointments={jobs
                    .filter(j => j.scheduledDate && j.clientName)
                    .map(j => ({
                      id: j.id,
                      clientName: j.clientName,
                      address: j.projectAddress || '',
                      time: '',
                      date: j.scheduledDate!,
                      type: 'estimate' as const,
                      status: 'scheduled' as const,
                    }))}
                  installSchedule={jobs
                    .filter(j => j.plannedStartDate && j.pipelineStage && [
                      PipelineStage.JOB_SOLD, PipelineStage.ADMIN_SETUP, PipelineStage.PRE_PRODUCTION,
                      PipelineStage.READY_TO_START, PipelineStage.IN_FIELD
                    ].includes(j.pipelineStage))
                    .map(j => ({
                      id: j.id,
                      clientName: j.clientName,
                      address: j.projectAddress || '',
                      startDate: j.plannedStartDate!,
                      endDate: j.plannedFinishDate || j.plannedStartDate!,
                      crewName: j.assignedCrewOrSubcontractor || 'Unassigned',
                      status: 'tentative' as const,
                    }))}
                />
              </div>
            </div>
          )}
          {view === 'estimator-workflow' && !selectedJob && (
            <div className="flex flex-col items-center justify-center h-full gap-4 text-[var(--text-secondary)]">
              <p className="text-lg font-bold">No job selected.</p>
              <button
                onClick={() => navigateTo('office-pipeline')}
                className="px-6 py-3 bg-[var(--brand-gold)] text-white rounded-xl font-bold hover:opacity-90 transition-all"
              >
                Go to Pipeline
              </button>
            </div>
          )}
          {view === 'estimator-workflow' && selectedJob && currentUser && (
            <EstimatorWorkflowView
              key={selectedJob.id}
              job={selectedJob}
              onBack={() => navigateTo('estimator-dashboard')}
              onSave={handleUpdateEstimatorIntake}
              onPushToEstimating={handlePushToEstimating}
            />
          )}
          {view === 'booking-settings' && currentUser && (
            <BookingSettingsView
              onBack={() => navigateTo('office-dashboard')}
              onNavigate={navigateTo}
            />
          )}
          {view === 'automation-settings' && currentUser && (
            <AutomationSettingsView
              onBack={() => navigateTo('office-pipeline')}
            />
          )}
          {view === 'business-info' && currentUser?.role === Role.ADMIN && (
            <BusinessInfoView
              onBack={() => navigateTo('booking-settings')}
            />
          )}
          {view === 'price-book' && currentUser?.role === Role.ADMIN && (
            <PriceBookView
              onBack={() => navigateTo('booking-settings')}
            />
          )}
        </ErrorBoundary>
      </main>

      {/* Job Acceptance Wizard -- intercepts JOB_SOLD transition */}
      {pendingJobAcceptance && (
        <JobAcceptanceModal
          key={pendingJobAcceptance.id}
          job={pendingJobAcceptance}
          onComplete={(updates) => {
            const jobId = pendingJobAcceptance.id;
            handleUpdateJob(jobId, updates);
            setPendingJobAcceptance(null);
            navigateTo('office-job-detail', jobId);
          }}
          onSkip={() => {
            const jobId = pendingJobAcceptance.id;
            setPendingJobAcceptance(null);
            navigateTo('office-job-detail', jobId);
          }}
          onFillLater={() => {
            const jobId = pendingJobAcceptance.id;
            handleUpdateJob(jobId, { needsJobSetup: true });
            setPendingJobAcceptance(null);
            navigateTo('office-job-detail', jobId);
          }}
        />
      )}
    </div>
  );
};

export default AppRouter;
