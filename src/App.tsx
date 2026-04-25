import React, { useState, useEffect, useCallback } from 'react';
import {
  UserRole, AppState, PageState, User, Job, Role, JobStatus,
  ForecastReviewStatus, ChatSession, ChatMessage,
  CustomerLifecycle, PipelineStage, PortalEngagement, DepositStatus,
  SoldWorkflowStatus, EstimatorIntake, ScheduleStatus, // Customer, Invoice used by AppRouter via hooks
} from './types';
import { useAppRouter, pathToView } from './hooks/useAppRouter';
import { PAGE_CONFIGS, PAGE_TITLES, INITIAL_INVOICE as EMPTY_INVOICE, createDefaultOfficeChecklists, reconcileOfficeChecklists, createDefaultBuildDetails, PIPELINE_STAGES, ESTIMATE_STAGES, RATES } from './constants';
// pdfGenerator pulls in jspdf + jspdf-autotable (~150 KB). Lazy-loaded at call sites
// below so it does not bloat the main chunk for every user on landing.
import { safeSetItem } from './utils/storage';
import { geminiService } from './services/geminiService';
import { supabase } from './lib/supabase';
import { measureSheetToCalculatorDimensions, jobToCalculatorClientInfo, loadEstimatorIntake } from './estimator/dataBridge';
import { dataService } from './services/dataService';
import { useJobs } from './hooks/useJobs';
import { COMPANY } from './config/company';
import { useInvoices } from './hooks/useInvoices';
import { useCustomers } from './hooks/useCustomers';
import { sendGoogleReviewEmail, sendLeadAcknowledgementSms, sendSms } from './utils/communications';
import AppRouter from './components/AppRouter';

const INTERNAL_SECRET = import.meta.env.VITE_INTERNAL_API_SECRET as string | undefined;
const internalHeaders = (extra: Record<string, string> = {}) => ({
  'Content-Type': 'application/json',
  ...(INTERNAL_SECRET ? { 'X-Internal-Secret': INTERNAL_SECRET } : {}),
  ...extra,
});

const STORAGE_KEY = 'luxury_decking_app_state_v4';
// JOBS_STORAGE_KEY moved to useJobs hook
const AUTH_KEY = 'luxury_decking_auth_v1';
const THEME_KEY = 'luxury_decking_theme_v1';
const OFFICE_EMAIL = import.meta.env.VITE_OFFICE_EMAIL || 'luxurydeckingteam@gmail.com';

const createDefaultPageState = (pageIndex: number): PageState => {
  const config = PAGE_CONFIGS[pageIndex];
  if (!config) return { completed: false, checklist: [], photos: [] };
  
  return {
    completed: false,
    checklist: config.checklist.map((label, i) => ({ id: `item-${pageIndex}-${i}`, label, completed: false })),
    photos: config.photos.map(p => ({ ...p }))
  };
};

const App: React.FC = () => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [aiError, setAiError] = useState<string | null>(null);
  const [storageError, setStorageError] = useState<boolean>(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState('');
  const [submissionError, setSubmissionError] = useState<string | null>(null);
  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    const saved = localStorage.getItem(THEME_KEY);
    return (saved as 'dark' | 'light') || 'dark';
  });
  
  // Auth & Navigation State
  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    try {
      const saved = localStorage.getItem(AUTH_KEY);
      return saved ? JSON.parse(saved) : null;
    } catch (e) {
      console.error("Failed to parse auth state", e);
      return null;
    }
  });
  
  const [view, setView] = useState<string>(() => {
    // Check for public booking widget
    const params = new URLSearchParams(window.location.search);
    if (params.get('booking') === 'true') {
      return 'public-booking';
    }

    // Check for portal token in query params (legacy support)
    const portalToken = params.get('portal');
    if (portalToken) {
      return 'customer-portal';
    }

    // Check URL path for initial view
    const { view: urlView } = pathToView(window.location.pathname);
    if (urlView !== 'office-dashboard' || window.location.pathname !== '/') {
      return urlView;
    }

    if (!currentUser) return 'login';
    if (currentUser.role === Role.ADMIN) return 'office-dashboard';
    if (currentUser.role === Role.ESTIMATOR) return 'estimator-dashboard';
    return 'jobs';
  });

  // ── Extracted hooks: customer, job, and invoice state management ─────────
  const { customers, setCustomers, handleUpdateCustomer } = useCustomers();

  // Ref-forwarding pattern: handleSendMessage and navigateTo are declared below
  // but needed by useJobs for automation SMS and navigation. We use refs so the
  // hooks receive stable function identities that always call the latest version.
  const sendMessageRef = React.useRef<(sessionId: string, text: string, isFromClient?: boolean) => void>(() => {});
  const navigateToRef = React.useRef<(view: string, id?: string) => void>(() => {});

  const stableSendMessage = useCallback((sessionId: string, text: string, isFromClient?: boolean) => {
    sendMessageRef.current(sessionId, text, isFromClient);
  }, []);
  const stableNavigateTo = useCallback((view: string, id?: string) => {
    navigateToRef.current(view, id);
  }, []);

  const {
    jobs, setJobs, selectedJob, setSelectedJob,
    handleUpdateJob, handleDeleteJob, handleUpdatePipelineStage,
    handleEstimateAccepted, handleEstimateSaved,
    stripPhotoDataUris,
    calculatorSourceJobId, setCalculatorSourceJobId,
  } = useJobs({ currentUser, navigateTo: stableNavigateTo, handleSendMessage: stableSendMessage });

  const {
    invoices, setInvoices, handleGenerateInvoice, handleGenerateAndSendInvoice, handleUpdateInvoice,
  } = useInvoices({ setJobs, selectedJob, setSelectedJob });

  const [portalLoading, setPortalLoading] = useState(false);

  // Router hook - provides navigateTo() which updates both URL and view state
  const { navigateTo } = useAppRouter(setView, selectedJob?.id);

  // Keep refs up-to-date with the latest navigateTo
  useEffect(() => { navigateToRef.current = navigateTo; }, [navigateTo]);

  const [newJobInitialStage, setNewJobInitialStage] = useState<PipelineStage>(PipelineStage.LEAD_IN);
  const [newJobPrefilledDate, setNewJobPrefilledDate] = useState<string | undefined>(undefined);
  const [newJobPrefilledContact, setNewJobPrefilledContact] = useState<{ clientName?: string; clientPhone?: string; clientEmail?: string; projectAddress?: string } | undefined>(undefined);

  useEffect(() => {
    const handleAiKeyError = (e: any) => {
      setAiError(e.detail.message);
      // Auto-clear after 10 seconds
      setTimeout(() => setAiError(null), 10000);
    };

    const handleStorageError = () => {
      setStorageError(true);
      setTimeout(() => setStorageError(false), 10000);
    };

    window.addEventListener('ai-key-error', handleAiKeyError);
    window.addEventListener('storage-quota-error', handleStorageError);

    return () => {
      window.removeEventListener('ai-key-error', handleAiKeyError);
      window.removeEventListener('storage-quota-error', handleStorageError);
    };
  }, []);

  // Fetch portal job from Supabase when accessed directly (no localStorage data)
  const portalFetchAttempted = React.useRef(false);
  useEffect(() => {
    if (view !== 'customer-portal' || selectedJob !== null || portalFetchAttempted.current) return;
    const params = new URLSearchParams(window.location.search);
    const token = params.get('portal')
      || (window.location.pathname.startsWith('/portal/') ? window.location.pathname.split('/')[2] : null);
    if (!token) return;
    portalFetchAttempted.current = true;
    setPortalLoading(true);
    dataService.getJobByPortalToken(token).then(job => {
      if (job) setSelectedJob(job);
      setPortalLoading(false);
    });
  }, [view, selectedJob]);

  // Sync URL with portal token for refreshes
  useEffect(() => {
    if (view === 'customer-portal' && selectedJob) {
      const params = new URLSearchParams(window.location.search);
      if (params.get('portal') !== selectedJob.customerPortalToken) {
        params.set('portal', selectedJob.customerPortalToken || '');
        // replaceState is intentional here: updating a legacy query-param (?portal=TOKEN)
        // that lives outside React Router's route config. Does not affect navigation stack.
        window.history.replaceState({}, '', `${window.location.pathname}?${params.toString()}`);
      }

      // Ensure chat session exists for this job
      setChatSessions(prev => {
        if (!prev.find(s => s.jobId === selectedJob.id)) {
          const newSession: ChatSession = {
            id: `session-${selectedJob.id}`,
            jobId: selectedJob.id,
            clientName: selectedJob.clientName,
            clientPhone: selectedJob.clientPhone,
            unreadCount: 0,
            messages: [],
            lastMessage: '',
            lastMessageTimestamp: new Date().toISOString()
          };
          return [...prev, newSession];
        }
        return prev;
      });
    }
  }, [view, selectedJob]);

  const [chatSessions, setChatSessions] = useState<ChatSession[]>(() => {
    try {
      const saved = localStorage.getItem('luxury_decking_chat_v1');
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      console.error("Failed to parse chat sessions", e);
      return [];
    }
  });

  useEffect(() => {
    safeSetItem('luxury_decking_chat_v1', JSON.stringify(chatSessions));
  }, [chatSessions]);

  // Subscribe to Supabase Realtime for incoming SMS messages
  useEffect(() => {
    if (!supabase || !currentUser || currentUser.role !== Role.ADMIN) return;

    const normalizePhone = (p: string) => (p || '').replace(/\D/g, '').slice(-10);

    const processIncomingMessage = async (msg: Record<string, unknown>) => {
      const fromNorm = normalizePhone(msg.from_number as string);

      setChatSessions(prev => {
        let updated = [...prev];
        let session = updated.find(s => {
          const sessionPhoneNorm = normalizePhone(s.clientPhone || '');
          return sessionPhoneNorm === fromNorm && sessionPhoneNorm.length >= 10;
        });

        if (!session) return updated;

        const newMsg: ChatMessage = {
          id: `incoming-${msg.id}`,
          senderId: 'client',
          senderName: session.clientName,
          text: msg.message_body as string,
          timestamp: msg.received_at as string,
          isFromClient: true,
          status: 'delivered'
        };

        if (session.messages.find(m => m.id === newMsg.id)) return updated;

        session = {
          ...session,
          messages: [...session.messages, newMsg],
          lastMessage: msg.message_body as string,
          lastMessageTimestamp: msg.received_at as string,
          unreadCount: session.unreadCount + 1
        };
        return updated.map(s => s.id === session!.id ? session! : s);
      });

      // Mark as read
      await supabase
        .from('incoming_messages')
        .update({ read: true })
        .eq('id', msg.id);
    };

    // Subscribe to new messages via Realtime (requires Realtime enabled on incoming_messages table)
    const channel = supabase
      .channel('incoming-sms-realtime')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'incoming_messages' },
        (payload) => { processIncomingMessage(payload.new as Record<string, unknown>); }
      )
      .subscribe();

    // Initial fetch: pick up any unread messages that arrived before the subscription started
    (async () => {
      const { data, error } = await supabase
        .from('incoming_messages')
        .select('*')
        .eq('read', false)
        .order('received_at', { ascending: true });
      if (!error && data) {
        for (const msg of data) await processIncomingMessage(msg);
      }
    })();

    return () => { supabase.removeChannel(channel); };
  }, [currentUser]);

  // Supabase Realtime for jobs is now handled inside useJobs()

  // Workflow State
  const [workflowState, setWorkflowState] = useState<AppState>(() => {
    const initialState: AppState = {
      jobId: undefined,
      currentPage: 0,
      userRole: null,
      jobInfo: {
        jobName: '',
        jobAddress: '',
        customerName: '',
        crewLeadName: '',
        date: new Date().toISOString().split('T')[0],
        jobType: ''
      },
      pages: {
        1: createDefaultPageState(1),
        2: createDefaultPageState(2),
        3: createDefaultPageState(3),
        4: createDefaultPageState(4),
        5: createDefaultPageState(5)
      },
      invoicing: { ...EMPTY_INVOICE },
      isJobSubmitted: false,
      syncStatus: 'synced' as const
    };

    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        const mergedPages = { ...initialState.pages, ...(parsed.pages || {}) };
        const mergedJobInfo = { ...initialState.jobInfo, ...(parsed.jobInfo || {}) };
        const mergedInvoicing = { ...initialState.invoicing, ...(parsed.invoicing || {}) };
        
        return { 
          ...initialState, 
          ...parsed, 
          jobInfo: mergedJobInfo,
          pages: mergedPages, 
          invoicing: mergedInvoicing,
          isJobSubmitted: parsed.isJobSubmitted || false,
          syncStatus: parsed.syncStatus || 'synced',
          isUploading: false 
        };
      }
    } catch (e) {
      console.error("Failed to parse saved state", e);
    }
    return initialState;
  });

  const handleSendMessage = useCallback((sessionId: string, text: string, isFromClient: boolean = false) => {
    setChatSessions(prev => prev.map(session => {
      if (session.id === sessionId) {
        const newMessage: ChatMessage = {
          id: `msg-${Date.now()}`,
          senderId: isFromClient ? 'client' : (currentUser?.id || 'office'),
          senderName: isFromClient ? session.clientName : (currentUser?.name || 'Office'),
          text,
          timestamp: new Date().toISOString(),
          isFromClient,
          status: 'sent'
        };

        // Send real SMS via Twilio if message is from office and client has a phone number
        if (!isFromClient && session.clientPhone) {
          sendSms(session.clientPhone, text);
        }

        return {
          ...session,
          messages: [...session.messages, newMessage],
          lastMessage: text,
          lastMessageTimestamp: newMessage.timestamp,
          unreadCount: isFromClient ? session.unreadCount + 1 : 0
        };
      }
      return session;
    }));
  }, [currentUser?.id, currentUser?.name]);

  // Wire up the ref so useJobs can call handleSendMessage
  sendMessageRef.current = handleSendMessage;

  // handleUpdateJob, handleDeleteJob, stripPhotoDataUris, handleUpdatePipelineStage,
  // handleEstimateAccepted, handleEstimateSaved are all provided by useJobs() above.

  // Sync workflow progress back to the jobs list
  useEffect(() => {
    if (workflowState.jobId) {
      const stageToSync = Math.min(workflowState.currentPage, 5);
      
      setJobs(prevJobs => {
        const jobToUpdate = prevJobs.find(job => job.id === workflowState.jobId);
        if (!jobToUpdate) return prevJobs;

        const stageChanged = jobToUpdate.currentStage !== stageToSync;
        const forecastChanged = JSON.stringify(jobToUpdate.fieldForecast) !== JSON.stringify(workflowState.fieldForecast);
        const progressChanged = JSON.stringify(jobToUpdate.fieldProgress) !== JSON.stringify(workflowState.pages);
        
        if (!stageChanged && !forecastChanged && !progressChanged) return prevJobs;
        
        return prevJobs.map(job =>
          job.id === workflowState.jobId
            ? {
                ...job,
                currentStage: stageToSync,
                fieldForecast: workflowState.fieldForecast,
                fieldProgress: workflowState.pages
              }
            : job
        );
      });

      // Also update selectedJob if it's the one being worked on
      if (selectedJob && selectedJob.id === workflowState.jobId) {
        const stageChanged = selectedJob.currentStage !== stageToSync;
        const forecastChanged = JSON.stringify(selectedJob.fieldForecast) !== JSON.stringify(workflowState.fieldForecast);
        const progressChanged = JSON.stringify(selectedJob.fieldProgress) !== JSON.stringify(workflowState.pages);

        if (stageChanged || forecastChanged || progressChanged) {
          setSelectedJob(prev => prev ? {
            ...prev,
            currentStage: stageToSync,
            fieldForecast: workflowState.fieldForecast,
            fieldProgress: workflowState.pages
          } : null);
        }
      }

      // Auto-save progress to Supabase (strip photo data URIs — keep only cloud URLs)
      dataService.updateJob(workflowState.jobId, {
        currentStage: stageToSync,
        fieldProgress: stripPhotoDataUris(workflowState.pages),
        ...(workflowState.fieldForecast ? { fieldForecast: workflowState.fieldForecast } : {}),
      }).catch(err => console.warn('[progress-autosave] Supabase sync failed:', err));
    }
  }, [workflowState.currentPage, workflowState.jobId, workflowState.fieldForecast, workflowState.pages, selectedJob]); 

  const lastTrackedJobId = React.useRef<string | null>(null);

  // The portal view is handled by the initial state of view and selectedJob.
  useEffect(() => {
    if (view === 'customer-portal' && selectedJob && lastTrackedJobId.current !== selectedJob.id) {
      const updates = geminiService.trackPortalView(selectedJob);
      handleUpdateJob(selectedJob.id, updates);
      lastTrackedJobId.current = selectedJob.id;
    }
  }, [view, selectedJob, handleUpdateJob]);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // ── Hydrate from Supabase on mount when currentUser is already set ───────
  // handleLogin pulls fresh data, but a user who's already authenticated and
  // just refreshes the browser never re-runs it — their `jobs`/`invoices`/
  // `customers` state stays at whatever localStorage held. If local state got
  // out of sync (e.g. a row present in Supabase but stripped locally), the
  // user sees stale data until they log out and back in. This effect closes
  // that gap by doing one authoritative refresh on every mount.
  const hasHydratedFromSupabase = React.useRef(false);
  useEffect(() => {
    if (!currentUser || hasHydratedFromSupabase.current) return;
    hasHydratedFromSupabase.current = true;

    dataService.loadJobs().then(supabaseJobs => {
      if (supabaseJobs.length > 0) {
        setJobs(supabaseJobs.map(job => ({
          ...job,
          officeChecklists: reconcileOfficeChecklists(job.officeChecklists),
          buildDetails: job.buildDetails || createDefaultBuildDetails(),
          customerPortalToken: job.customerPortalToken || crypto.randomUUID(),
        })));
      }
    }).catch(() => { /* Supabase unavailable — keep localStorage data */ });

    dataService.loadInvoices().then(supabaseInvoices => {
      if (supabaseInvoices.length > 0) setInvoices(supabaseInvoices);
    }).catch(() => {});

    dataService.loadCustomers().then(supabaseCustomers => {
      if (supabaseCustomers.length > 0) setCustomers(supabaseCustomers);
    }).catch(() => {});
  }, [currentUser, setJobs, setInvoices, setCustomers]);

  useEffect(() => {
    if (currentUser) {
      // SECURITY: Never persist the password field to localStorage
      const { password: _pw, ...safeUser } = currentUser;
      safeSetItem(AUTH_KEY, JSON.stringify(safeUser));
    } else {
      localStorage.removeItem(AUTH_KEY);
    }
  }, [currentUser]);

  useEffect(() => {
    safeSetItem(STORAGE_KEY, JSON.stringify(workflowState));
  }, [workflowState]);

  // Jobs localStorage persistence is now handled inside useJobs()

  // ── Drip Campaign ───────────────────────────────────────────────────────
  // D-09: Client-side drip processor REMOVED. The server-side Supabase
  // Edge Function (process-drip-campaigns) runs hourly via pg_cron and
  // handles all automated campaign touches. Running both created a
  // double-send risk. The Edge Function is the single source of truth.
  // ─────────────────────────────────────────────────────────────────────────

  useEffect(() => {
    safeSetItem(THEME_KEY, theme);
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [theme]);

  // Auto-redirect: ensure users see the correct view for their role
  useEffect(() => {
    // Auth guard: unauthenticated users can only see login or customer portal
    if (!currentUser) {
      if (view !== 'login' && view !== 'customer-portal') {
        navigateTo('login');
      }
      return;
    }

    if (view === 'login') {
      if (currentUser.role === Role.ADMIN) navigateTo('office-dashboard');
      else if (currentUser.role === Role.ESTIMATOR) navigateTo('estimator-dashboard');
      else navigateTo('jobs');
      return;
    }

    // Field employees and subcontractors should not see admin views
    const adminOnlyViews = ['office-dashboard', 'office-pipeline', 'stats', 'chat', 'user-management'];
    if ((currentUser.role === Role.FIELD_EMPLOYEE || currentUser.role === Role.SUBCONTRACTOR) && adminOnlyViews.includes(view)) {
      navigateTo('jobs');
    }
  }, [currentUser, view]);

  const handleLogin = useCallback((user: User) => {
    setCurrentUser(user);
    // Load jobs from Supabase on login (replaces stale localStorage snapshot)
    dataService.loadJobs().then(supabaseJobs => {
      if (supabaseJobs.length > 0) {
        setJobs(supabaseJobs.map(job => ({
          ...job,
          officeChecklists: reconcileOfficeChecklists(job.officeChecklists),
          buildDetails: job.buildDetails || createDefaultBuildDetails(),
          customerPortalToken: job.customerPortalToken || crypto.randomUUID(),
        })));
      }
    }).catch(() => { /* Supabase unavailable -- localStorage data stays */ });
    // Load invoices from Supabase
    dataService.loadInvoices().then(supabaseInvoices => {
      if (supabaseInvoices.length > 0) {
        setInvoices(supabaseInvoices);
      }
    }).catch(() => { /* Supabase unavailable -- empty state stays */ });
    // Load customers from Supabase
    dataService.loadCustomers().then(supabaseCustomers => {
      if (supabaseCustomers.length > 0) {
        setCustomers(supabaseCustomers);
      }
    }).catch(() => { /* Supabase unavailable -- empty state stays */ });
    if (user.role === Role.ADMIN) {
      navigateTo('office-dashboard');
    } else if (user.role === Role.ESTIMATOR) {
      navigateTo('estimator-dashboard');
    } else {
      navigateTo('jobs');
    }
  }, [navigateTo]);

  const handleLogout = useCallback(() => {
    dataService.signOut();
    setCurrentUser(null);
    navigateTo('login');
    setSelectedJob(null);
  }, []);

  const handleSelectJob = useCallback((job: Job) => {
    setSelectedJob(job);
    if (!currentUser) {
      console.warn('No current user found during job selection');
      return;
    }
    if (currentUser.role === Role.ADMIN) {
      // Route to estimate detail for pre-sale stages, job detail for post-sale
      if (ESTIMATE_STAGES.includes(job.pipelineStage)) {
        navigateTo('estimate-detail', job.id);
      } else {
        navigateTo('office-job-detail', job.id);
      }
    } else if (currentUser.role === Role.ESTIMATOR) {
      // Estimator: stages before EST_SENT → open estimator workflow (intake/site data)
      // EST_SENT and beyond → estimate-detail (read-only review)
      const ESTIMATOR_WORKFLOW_STAGES = new Set([
        PipelineStage.EST_UNSCHEDULED, PipelineStage.EST_SCHEDULED,
        PipelineStage.EST_IN_PROGRESS, PipelineStage.EST_COMPLETED, PipelineStage.EST_ON_HOLD,
      ]);
      if (ESTIMATOR_WORKFLOW_STAGES.has(job.pipelineStage)) {
        setSelectedJob(job);
        navigateTo('estimator-workflow', job.id);
      } else if (ESTIMATE_STAGES.includes(job.pipelineStage)) {
        navigateTo('estimate-detail', job.id);
      } else {
        navigateTo('office-job-detail', job.id);
      }
    } else {
      navigateTo('detail', job.id);
    }
  }, [currentUser]);

  // handleUpdatePipelineStage is now provided by useJobs()

  const handleUpdateOfficeChecklist = useCallback((jobId: string, stage: PipelineStage, itemId: string, completed: boolean, isNA: boolean = false) => {
    const buildUpdatedJob = (job: Job): Job => {
      if (job.id !== jobId) return job;

      const updatedChecklists = (job.officeChecklists || []).map(cl => {
        if (cl.stage === stage) {
          return {
            ...cl,
            items: (cl.items || []).map(item => item.id === itemId ? { ...item, completed, isNA } : item)
          };
        }
        return cl;
      });

      const currentChecklist = updatedChecklists.find(cl => cl.stage === stage);
      const allComplete = currentChecklist?.items.every(item => item.completed || item.isNA) || false;

      let updatedJob = { ...job, officeChecklists: updatedChecklists, updatedAt: new Date().toISOString() };

      if (allComplete && job.pipelineStage === stage) {
        const stageOrder = PIPELINE_STAGES.map(s => s.id);
        const currentIndex = stageOrder.indexOf(stage as PipelineStage);
        if (currentIndex >= 0 && currentIndex < stageOrder.length - 1) {
          updatedJob = { ...updatedJob, pipelineStage: stageOrder[currentIndex + 1] as PipelineStage };
        }
      }

      return updatedJob;
    };

    const original = jobs.find(j => j.id === jobId);
    setJobs(prevJobs => prevJobs.map(buildUpdatedJob));
    setSelectedJob(prev => prev ? buildUpdatedJob(prev) : null);

    // Persist to Supabase
    if (original) {
      const updated = buildUpdatedJob(original);
      const dbUpdates: Partial<Job> = { officeChecklists: updated.officeChecklists };
      if (updated.pipelineStage !== original.pipelineStage) dbUpdates.pipelineStage = updated.pipelineStage;
      dataService.updateJob(jobId, dbUpdates).catch(err =>
        console.error('[handleUpdateOfficeChecklist] Supabase write failed:', err)
      );
    }
  }, [jobs]);

  const handleAcceptEstimateOption = useCallback((jobId: string, optionId: string, selectedAddOns: string[]) => {
    const updateJob = (job: Job): Job => {
      if (job.id === jobId) {
        const selectedOption = job.estimateData?.options.find(o => o.id === optionId);
        if (!selectedOption) {
          console.error(`[handleAcceptEstimateOption] Option ${optionId} not found on job ${jobId} — acceptance aborted`);
          return job;
        }
        const selectedAddOnObjects = job.estimateData?.addOns.filter(a => selectedAddOns.includes(a.id)) || [];
        const addOnsTotal = selectedAddOnObjects.reduce((sum, a) => sum + a.price, 0);
        const basePrice = selectedOption.price;
        const totalAmount = basePrice + addOnsTotal;

        return {
          ...job,
          acceptedOptionId: optionId,
          acceptedOptionName: selectedOption?.name || 'Selected Option',
          acceptedDate: new Date().toISOString(),
          selectedAddOnIds: selectedAddOns,
          estimateAmount: totalAmount,
          totalAmount: totalAmount,
          pipelineStage: PipelineStage.EST_APPROVED,
          estimateStatus: 'approved' as any,
          updatedAt: new Date().toISOString(),
          acceptedBuildSummary: {
            optionName: selectedOption?.name || 'Selected Option',
            basePrice: basePrice,
            addOns: selectedAddOnObjects.map(a => ({ name: a.name, price: a.price })),
            totalPrice: totalAmount,
            acceptedDate: new Date().toISOString(),
            scopeSummary: job.scopeSummary || 'Standard build as per accepted option.'
          },
          buildDetails: {
            ...job.buildDetails,
            packageSelection: selectedOption?.name || job.buildDetails?.packageSelection
          }
        };
      }
      return job;
    };

    setJobs(prevJobs => prevJobs.map(updateJob));
    setSelectedJob(prev => prev ? updateJob(prev) : null);
  }, []);

  const handleTrackPortalEngagement = useCallback((jobId: string, engagement: Partial<PortalEngagement>) => {
    setJobs(prevJobs => prevJobs.map(job => {
      if (job.id === jobId) {
        const current = job.portalEngagement || {
          totalOpens: 0,
          optionClicks: {},
          addOnInteractions: {},
          totalTimeSpentSeconds: 0
        };
        
        const updated: PortalEngagement = {
          ...current,
          firstOpenedAt: engagement.firstOpenedAt || current.firstOpenedAt,
          lastOpenedAt: new Date().toISOString(),
          totalOpens: current.totalOpens + (engagement.totalOpens || 0),
          totalTimeSpentSeconds: current.totalTimeSpentSeconds + (engagement.totalTimeSpentSeconds || 0),
          optionClicks: { ...current.optionClicks },
          addOnInteractions: { ...current.addOnInteractions },
          sharesSent: [...(current.sharesSent || [])],
          partnerOpens: current.partnerOpens || 0,
          lastPartnerOpenAt: current.lastPartnerOpenAt,
        };

        if (engagement.optionClicks) {
          Object.entries(engagement.optionClicks).forEach(([id, count]) => {
            updated.optionClicks[id] = (updated.optionClicks[id] || 0) + count;
          });
        }

        if (engagement.addOnInteractions) {
          Object.entries(engagement.addOnInteractions).forEach(([id, count]) => {
            updated.addOnInteractions[id] = (updated.addOnInteractions[id] || 0) + count;
          });
        }

        // Append new share events.
        if (engagement.sharesSent && engagement.sharesSent.length > 0) {
          updated.sharesSent = [...(updated.sharesSent || []), ...engagement.sharesSent];
        }

        // Partner-open signal: when the portal detected a ?s=1 link this session,
        // the engagement payload includes partnerOpens: 1. Roll it into the counter
        // (which rides alongside totalOpens rather than replacing it).
        if (engagement.partnerOpens) {
          updated.partnerOpens = (updated.partnerOpens || 0) + engagement.partnerOpens;
          updated.lastPartnerOpenAt = new Date().toISOString();
        }

        // Append new PDF-download events (contractor comparison checklist).
        if (engagement.pdfDownloads && engagement.pdfDownloads.length > 0) {
          updated.pdfDownloads = [...(updated.pdfDownloads || []), ...engagement.pdfDownloads];
        }

        // Angela advisor widget — flat "latest state" fields overwrite each
        // exchange (per-message telemetry). Only update when the new payload
        // actually carries a value so partial updates from either ANGELA_MESSAGE
        // or ANGELA_SUMMARY don't wipe the other set.
        if (engagement.angelaQuestionCount !== undefined)  updated.angelaQuestionCount  = engagement.angelaQuestionCount;
        if (engagement.angelaLastQuestion   !== undefined) updated.angelaLastQuestion   = engagement.angelaLastQuestion;
        if (engagement.angelaLastMessageAt  !== undefined) updated.angelaLastMessageAt  = engagement.angelaLastMessageAt;
        if (engagement.angelaSentiment      !== undefined) updated.angelaSentiment      = engagement.angelaSentiment;
        if (engagement.angelaCloseReadiness !== undefined) updated.angelaCloseReadiness = engagement.angelaCloseReadiness;

        // Angela conversation summary — received once per ended session.
        // We also keep the last summary text on the engagement blob for fast
        // dashboard reads, but the authoritative log is the appended array on
        // the job row (see ANGELA_SUMMARY branch below).
        if (engagement.angelaConversationSummary !== undefined)    updated.angelaConversationSummary    = engagement.angelaConversationSummary;
        if (engagement.angelaConversationEscalated !== undefined)  updated.angelaConversationEscalated  = engagement.angelaConversationEscalated;
        if (engagement.angelaConversationQuestions !== undefined)  updated.angelaConversationQuestions  = engagement.angelaConversationQuestions;
        if (engagement.angelaConversationEndedAt !== undefined)    updated.angelaConversationEndedAt    = engagement.angelaConversationEndedAt;

        // Calculate engagement heat
        const isRecentlyOpened = updated.lastOpenedAt && (Date.now() - new Date(updated.lastOpenedAt).getTime()) < 24 * 60 * 60 * 1000;
        let heat: 'cold' | 'warm' | 'hot' = 'cold';
        if (updated.totalOpens > 5 || updated.totalTimeSpentSeconds > 300 || isRecentlyOpened) heat = 'hot';
        else if (updated.totalOpens > 2 || updated.totalTimeSpentSeconds > 60) heat = 'warm';

        // Angela conversation append — if this payload carries a full summary
        // (ANGELA_SUMMARY event), push a new record onto the running log so
        // the office can audit the whole history, not just the most recent.
        // The flat fields above still get written too so "last question /
        // sentiment / close readiness" reads stay cheap.
        //
        // Persistence: because portal_engagement auto-persistence is
        // deliberately deferred (to avoid write amplification on every chip
        // click), we hit dataService.updateJob directly for angela_conversations
        // so an ended conversation is saved immediately — losing one because
        // the customer closed the tab before a batch flush would be a bad
        // experience.
        let nextConversations = job.angelaConversations || [];
        if (
          engagement.angelaConversationSummary !== undefined ||
          engagement.angelaConversationEndedAt !== undefined
        ) {
          const entry: AngelaConversation = {
            endedAt: engagement.angelaConversationEndedAt || new Date().toISOString(),
            questionCount: engagement.angelaQuestionCount,
            questions: engagement.angelaConversationQuestions,
            summary: engagement.angelaConversationSummary,
            sentiment: engagement.angelaSentiment,
            closeReadiness: engagement.angelaCloseReadiness,
            escalated: engagement.angelaConversationEscalated,
          };
          nextConversations = [...nextConversations, entry];
          // Fire-and-forget DB write so the summary survives tab close.
          dataService
            .updateJob(job.id, { angelaConversations: nextConversations })
            .catch((err) =>
              console.error('[Angela] failed to persist conversation summary:', err),
            );
        }

        return {
          ...job,
          portalEngagement: updated,
          engagementHeat: heat,
          angelaConversations: nextConversations,
        };
      }
      return job;
    }));
  }, []);

  const handleCreateJob = useCallback((newJob: Job) => {
    const now = new Date().toISOString();
    // Auto-start lead follow-up campaign for new leads
    const leadStages = [PipelineStage.LEAD_IN, PipelineStage.FIRST_CONTACT, PipelineStage.EST_UNSCHEDULED, PipelineStage.EST_SCHEDULED];
    const jobWithCampaign = leadStages.includes(newJob.pipelineStage) ? {
      ...newJob,
      dripCampaign: {
        campaignType: 'LEAD_FOLLOW_UP' as const,
        startedAt: now,
        currentTouch: 1,
        // T1 (instant SMS) fires below — pre-mark so auto-processor doesn't re-fire it
        completedTouches: ['lead-t1-sms'],
        status: 'active' as const,
        sentMessages: [{ touchId: 'lead-t1-sms', channel: 'sms' as const, sentAt: now, engagementTier: 'COLD' as const }],
      }
    } : newJob;

    setJobs(prev => [jobWithCampaign, ...prev]);
    dataService.createJob(jobWithCampaign).catch(err => console.error('Failed to persist new job:', err));

    // Auto-fire Touch 1: instant SMS acknowledgement for new leads.
    //
    // The campaign was created above with T1 pre-marked as completed. This
    // prevents the cron from double-firing T1 during the ~5 min window after
    // lead creation while the sync send is in flight.
    //
    // HOWEVER — if the sync send fails OR we're in quiet hours and skip the
    // send entirely, we roll back the pre-mark so the cron picks it up on
    // the next run. Without this rollback the lead would silently never
    // receive T1 at all (prior bug — every failed/quiet-hour creation lost
    // its first-touch forever).
    //
    // Quiet hours: only sync-send between 9 AM - 8 PM local. Outside that
    // window we un-mark T1 so the cron fires it during the next business
    // window (the cron enforces its own ET quiet-hours check).
    //
    // When T1 sends successfully, advance the lead forward from LEAD_IN to
    // FIRST_CONTACT (mirrors the auto-advance logic in the Edge Function).
    const rollbackT1 = (reason: string) => {
      console.warn(`[T1 sync] rolling back pre-mark (reason: ${reason}) so cron retries`);
      setJobs(prev => prev.map(j => {
        if (j.id !== newJob.id) return j;
        if (!j.dripCampaign) return j;
        return {
          ...j,
          dripCampaign: {
            ...j.dripCampaign,
            completedTouches: j.dripCampaign.completedTouches.filter(t => t !== 'lead-t1-sms'),
            sentMessages: j.dripCampaign.sentMessages.filter(m => m.touchId !== 'lead-t1-sms'),
          },
        };
      }));
      dataService.updateJob(newJob.id, {
        dripCampaign: {
          ...jobWithCampaign.dripCampaign!,
          completedTouches: [],
          sentMessages: [],
        },
      }).catch(err => console.warn('[T1 rollback persist] failed:', err));
    };

    if (newJob.pipelineStage === PipelineStage.LEAD_IN && newJob.clientPhone) {
      const hour = new Date().getHours();
      if (hour >= 9 && hour < 20) {
        sendLeadAcknowledgementSms(newJob.clientPhone, newJob.clientName)
          .then(ok => {
            if (!ok) {
              rollbackT1('sms send returned !ok');
              return;
            }
            // Send succeeded — advance pipeline stage forward.
            // Only advance if the job is still at LEAD_IN (never move backward,
            // never overwrite a manual forward move made in the meantime).
            setJobs(prev => prev.map(j => {
              if (j.id !== newJob.id) return j;
              if (j.pipelineStage !== PipelineStage.LEAD_IN) return j;
              return { ...j, pipelineStage: PipelineStage.FIRST_CONTACT };
            }));
            dataService.updateJob(newJob.id, { pipelineStage: PipelineStage.FIRST_CONTACT })
              .catch(err => console.warn('[T1 auto-advance] persist failed:', err));
          })
          .catch(err => {
            console.error('[T1 sync send] threw:', err);
            rollbackT1('sms send threw');
          });
      } else {
        // Quiet hours — skip sync send, let the cron handle T1 at next business window.
        rollbackT1(`quiet hours (local hour=${hour})`);
      }
    } else if (newJob.pipelineStage === PipelineStage.LEAD_IN && !newJob.clientPhone) {
      // No phone number — nothing to sync-send. Cron will handle email-only touches
      // (T3, T5, T7) if an email is present. Roll back the SMS pre-mark so cron
      // knows T1 was never actually sent.
      rollbackT1('no client phone');
    }

    // Always route to estimator workflow — the on-site checklist, measurements, sketch, and photos
    // must be completed before the job moves into the pipeline regardless of who created it
    setSelectedJob(jobWithCampaign);
    navigateTo('estimator-workflow', jobWithCampaign.id);
  }, [currentUser]);

  const handleOpenWorkflow = useCallback((job: Job) => {
    // Initialize workflow state with job info if not already set or if it's a different job
    if (workflowState.jobId !== job.id) {
      setWorkflowState(prev => ({
        ...prev,
        jobId: job.id,
        currentPage: job.currentStage || 0,
        isJobSubmitted: false,
        jobInfo: {
          jobName: job.clientName,
          jobAddress: job.projectAddress,
          customerName: job.clientName,
          crewLeadName: currentUser?.name || '',
          date: job.scheduledDate || new Date().toISOString().split('T')[0],
          jobType: job.projectType
        },
        // Initialize pages from job.fieldProgress if available, otherwise reset to avoid cross-contamination
        pages: job.fieldProgress || {
          1: createDefaultPageState(1),
          2: createDefaultPageState(2),
          3: createDefaultPageState(3),
          4: createDefaultPageState(4),
          5: createDefaultPageState(5)
        },
        invoicing: { ...EMPTY_INVOICE },
        fieldForecast: job.fieldForecast,
        userRole: currentUser?.role === Role.SUBCONTRACTOR ? UserRole.SUBCONTRACTOR : UserRole.FIELD_EMPLOYEE
      }));

      // Update job status to IN_PROGRESS if it was SCHEDULED
      setJobs(prevJobs => prevJobs.map(j => 
        j.id === job.id && j.status === JobStatus.SCHEDULED
          ? { ...j, status: JobStatus.IN_PROGRESS }
          : j
      ));
    }
    navigateTo('workflow', job.id);
  }, [currentUser?.name, currentUser?.role, workflowState.jobId]);

  const uploadFileToCloudinary = async (file: string, filename: string): Promise<string> => {
    const response = await fetch('/.netlify/functions/upload', {
      method: 'POST',
      headers: internalHeaders(),
      body: JSON.stringify({ file, filename, folder: `luxury_decking/${workflowState.jobInfo.jobName}` }),
    });

    if (!response.ok) {
      const text = await response.text().catch(() => response.statusText);
      throw new Error(`Photo upload failed (${response.status}): ${text}`);
    }

    const data = await response.json();
    if (!data.url) throw new Error(`Photo upload succeeded but returned no URL for ${filename}`);
    return data.url;
  };

  const handleFullSubmission = async () => {
    try {
      setIsUploading(true);
      setUploadProgress('Uploading project photos...');
      
      const updatedPages = { ...workflowState.pages };
      
      for (let i = 1; i <= 5; i++) {
        const page = updatedPages[i];
        if (!page) continue;
        for (let j = 0; j < page.photos.length; j++) {
          const photo = page.photos[j];
          if (photo.url && !photo.cloudinaryUrl) {
            setUploadProgress(`Uploading ${PAGE_TITLES[i]} photo ${j+1}...`);
            try {
              const url = await uploadFileToCloudinary(photo.url, `${photo.key}_${Date.now()}`);
              photo.cloudinaryUrl = url;
            } catch (uploadErr) {
              console.warn(`Photo upload skipped for ${photo.key}, using local URL as fallback:`, uploadErr);
              photo.cloudinaryUrl = photo.url; // use data URL as fallback
            }
          }
        }
      }

      let sigUrl = workflowState.customerSignatureCloudinaryUrl;
      if (workflowState.customerSignature && !sigUrl) {
        setUploadProgress('Uploading customer signature...');
        sigUrl = await uploadFileToCloudinary(workflowState.customerSignature, `signature_${Date.now()}`);
      }

      setUploadProgress('Generating Verified Build Passport...');
      const updatedStateWithPhotos = { ...workflowState, pages: updatedPages, customerSignatureCloudinaryUrl: sigUrl };
      // Lazy-load jspdf-heavy module only at submission time.
      const { generateCloseoutPDF, generateInvoicePDF } = await import('./utils/pdfGenerator');
      const closeoutDataUri = await generateCloseoutPDF(updatedStateWithPhotos);
      let verifiedBuildPassportUrl = '';
      try {
        verifiedBuildPassportUrl = await uploadFileToCloudinary(closeoutDataUri, `Passport_${workflowState.jobInfo.jobName}_${Date.now()}`);
      } catch (pdfUploadErr) {
        // Do NOT fall back to the raw data URI — it's too large for Supabase and will
        // silently drop the entire job update. Leave the URL empty; the passport can be
        // regenerated from the office side via the Build Passport button.
        console.warn('Closeout PDF upload to Cloudinary failed — passport URL will be empty:', pdfUploadErr);
        verifiedBuildPassportUrl = '';
      }

      let subcontractorInvoiceUrl = '';
      let subInvoiceTotal = 0;
      if (workflowState.userRole === UserRole.SUBCONTRACTOR) {
        setUploadProgress('Generating Subcontractor Invoice Package...');
        const invoiceDataUri = await generateInvoicePDF(updatedStateWithPhotos);
        subcontractorInvoiceUrl = await uploadFileToCloudinary(invoiceDataUri, `Invoice_${workflowState.jobInfo.jobName}_${Date.now()}`);
        // Calculate invoice total using same rate logic as pdfGenerator.ts lines 207-234
        const r = RATES as any;
        const d = workflowState.invoicing as any;
        let invSubtotal = 0;
        if (d?.deckSqft > 0) invSubtotal += (d.deckSqft * r.deckSqft);
        if (d?.standardStairLf > 0) invSubtotal += (d.standardStairLf * r.standardStairLf);
        if (d?.helicalPiles > 0) invSubtotal += (d.helicalPiles * r.helicalPiles);
        if (d?.railingPosts > 0) invSubtotal += (d.railingPosts * r.railingPosts);
        if (d?.customWorkAmount > 0) invSubtotal += d.customWorkAmount;
        subInvoiceTotal = Math.round(invSubtotal * 1.13); // with HST
      }

      setUploadProgress('Finalizing submission...');

      const formData = new URLSearchParams();
      formData.append('form-name', 'complete-job');
      formData.append('job_name', workflowState.jobInfo.jobName);
      formData.append('job_address', workflowState.jobInfo.jobAddress);
      formData.append('crew_name', workflowState.jobInfo.crewLeadName);
      formData.append('job_status', `Verified Build Passport Completed as ${workflowState.userRole}`);
      formData.append('closeout_pdf_url', verifiedBuildPassportUrl);
      formData.append('invoice_pdf_url', subcontractorInvoiceUrl);
      formData.append('customer_signature_url', sigUrl || '');
      
      const photoLinks = [1, 2, 3, 4, 5]
        .filter(i => updatedPages[i])
        .map(i => `${PAGE_TITLES[i]}: ${updatedPages[i].photos.map(p => p.cloudinaryUrl).filter(u => !!u).join(', ')}`)
        .join('\n');
      formData.append('photo_links_summary', photoLinks);

      // Update local state first for immediate UI feedback
      setWorkflowState(prev => ({
        ...prev,
        pages: updatedPages,
        customerSignatureCloudinaryUrl: sigUrl,
        isJobSubmitted: true,
        submissionLinks: {
          closeoutPdf: verifiedBuildPassportUrl,
          invoicePdf: subcontractorInvoiceUrl
        }
      }));

      // Update job status in the main list
      if (workflowState.jobId) {
        setJobs(prevJobs => {
          const updatedJobs = prevJobs.map(job => {
            if (job.id === workflowState.jobId) {
              return {
                ...job,
                status: JobStatus.COMPLETED,
                currentStage: 5,
                pipelineStage: job.pipelineStage === PipelineStage.IN_FIELD ? PipelineStage.COMPLETION : job.pipelineStage,
                signoffStatus: 'signed' as const,
                finalSubmissionStatus: 'submitted' as const,
                invoiceSupportStatus: workflowState.userRole === UserRole.SUBCONTRACTOR ? 'submitted' as const : 'not_required' as const,
                verifiedBuildPassportUrl,
                subcontractorInvoiceUrl,
                ...(workflowState.userRole === UserRole.SUBCONTRACTOR ? { labourCost: subInvoiceTotal } : {}),
                files: [
                  ...(job.files || []),
                  {
                    id: `f-passport-${Date.now()}`,
                    name: `${COMPANY.name} Verified Build Passport - ${job.clientName}.pdf`,
                    url: verifiedBuildPassportUrl,
                    type: 'closeout',
                    uploadedAt: new Date().toISOString()
                  },
                  ...(workflowState.userRole === UserRole.SUBCONTRACTOR ? [{
                    id: `f-invoice-${Date.now()}`,
                    name: `Subcontractor Invoice Package - ${job.clientName}.pdf`,
                    url: subcontractorInvoiceUrl,
                    type: 'closeout',
                    uploadedAt: new Date().toISOString()
                  }] : [])
                ],
                updatedAt: new Date().toISOString()
              };
            }
            return job;
          });
          return updatedJobs;
        });
        
        // Also update selectedJob if it's the one being submitted
        if (selectedJob && selectedJob.id === workflowState.jobId) {
          setSelectedJob(prev => prev ? {
            ...prev,
            status: JobStatus.COMPLETED,
            currentStage: 5,
            pipelineStage: prev.pipelineStage === PipelineStage.IN_FIELD ? PipelineStage.COMPLETION : prev.pipelineStage,
            signoffStatus: 'signed' as const,
            finalSubmissionStatus: 'submitted' as const,
            invoiceSupportStatus: workflowState.userRole === UserRole.SUBCONTRACTOR ? 'submitted' as const : 'not_required' as const,
            verifiedBuildPassportUrl,
            subcontractorInvoiceUrl,
            ...(workflowState.userRole === UserRole.SUBCONTRACTOR ? { labourCost: subInvoiceTotal } : {}),
            files: [
              ...(prev.files || []),
              {
                id: `f-passport-${Date.now()}`,
                name: `${COMPANY.name} Verified Build Passport - ${prev.clientName}.pdf`,
                url: verifiedBuildPassportUrl,
                type: 'closeout',
                uploadedAt: new Date().toISOString()
              },
              ...(workflowState.userRole === UserRole.SUBCONTRACTOR ? [{
                id: `f-invoice-${Date.now()}`,
                name: `Subcontractor Invoice Package - ${prev.clientName}.pdf`,
                url: subcontractorInvoiceUrl,
                type: 'closeout',
                uploadedAt: new Date().toISOString()
              }] : [])
            ],
            updatedAt: new Date().toISOString()
          } : null);
        }
      }

      // Persist completion to Supabase. The user-facing error message used to
      // fire on ANY Supabase hiccup, even though Netlify form (the office's
      // primary notification channel) almost always succeeded — leading to
      // scary "cloud sync failed" warnings while the office HAD in fact
      // received the closeout. Now we:
      //   1. Try Netlify form first and remember whether it succeeded
      //   2. Try the Supabase update; on failure, retry once WITHOUT the
      //      heavy fieldProgress payload (most common cause of row-size
      //      rejections from PostgREST)
      //   3. Only surface a warning if BOTH paths failed
      let supabaseSynced = false;
      let netlifySynced = false;

      // Netlify form submission — primary office notification channel.
      try {
        const resp = await fetch("/", {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: formData.toString(),
        });
        netlifySynced = resp.ok;
        if (!resp.ok) {
          console.warn(`Netlify form responded ${resp.status} ${resp.statusText}`);
        }
      } catch (e) {
        console.warn("Netlify form submission failed:", e);
      }

      if (workflowState.jobId) {
        const fullUpdate = {
          status: JobStatus.COMPLETED,
          currentStage: 5,
          pipelineStage: PipelineStage.COMPLETION,
          signoffStatus: 'signed' as const,
          finalSubmissionStatus: 'submitted' as const,
          invoiceSupportStatus: workflowState.userRole === UserRole.SUBCONTRACTOR ? 'submitted' as const : 'not_required' as const,
          verifiedBuildPassportUrl: verifiedBuildPassportUrl || undefined,
          subcontractorInvoiceUrl: subcontractorInvoiceUrl || undefined,
          fieldProgress: stripPhotoDataUris(updatedPages), // checklist + cloudinary URLs only
          ...(workflowState.userRole === UserRole.SUBCONTRACTOR ? { labourCost: subInvoiceTotal } : {}),
          ...(workflowState.fieldForecast ? { fieldForecast: workflowState.fieldForecast } : {}),
        };
        try {
          await dataService.updateJob(workflowState.jobId, fullUpdate);
          supabaseSynced = true;
        } catch (supabaseErr) {
          console.error('Supabase job update failed (full payload):', supabaseErr);
          // Retry without fieldProgress — its photo metadata can occasionally
          // exceed Postgres jsonb row-size limits when many photos exist.
          try {
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            const { fieldProgress: _drop, ...lean } = fullUpdate;
            await dataService.updateJob(workflowState.jobId, lean);
            supabaseSynced = true;
            console.warn('Supabase update succeeded on retry without fieldProgress');
          } catch (retryErr) {
            console.error('Supabase job update retry also failed:', retryErr);
          }
        }

        // Persist build passport file to job_files table
        const filesToSave = [
          ...(verifiedBuildPassportUrl ? [{
            id: `f-passport-${workflowState.jobId}`,
            name: `${COMPANY.name} Verified Build Passport - ${workflowState.jobInfo.jobName}.pdf`,
            url: verifiedBuildPassportUrl,
            type: 'closeout',
            uploadedAt: new Date().toISOString(),
          }] : []),
          ...(subcontractorInvoiceUrl ? [{
            id: `f-invoice-${workflowState.jobId}`,
            name: `Subcontractor Invoice Package - ${workflowState.jobInfo.jobName}.pdf`,
            url: subcontractorInvoiceUrl,
            type: 'closeout',
            uploadedAt: new Date().toISOString(),
          }] : []),
        ];
        if (filesToSave.length) {
          dataService.saveFiles(workflowState.jobId, filesToSave).catch(err =>
            console.warn('Failed to persist files to job_files:', err)
          );
        }
      }

      // Only warn if BOTH delivery paths failed. If Netlify succeeded, the
      // office has the closeout email — Supabase is just an internal cache.
      if (!netlifySynced && !supabaseSynced) {
        setSubmissionError('Could not reach the office. Please check your connection and tap Try Again.');
      }

      // Google Review Request Email -- fire after submission (peak happiness)
      const completedJob = jobs.find(j => j.id === workflowState.jobId);
      if (completedJob?.clientEmail) {
        sendGoogleReviewEmail(completedJob.clientEmail, completedJob.clientName);
      }

    } catch (error) {
      console.error("Submission pipeline failed:", error);
      setSubmissionError("Submission failed. Please check your internet connection and try again.");
    } finally {
      setIsUploading(false);
    }
  };

  const sendEmailIntent = useCallback((closeoutUrl: string, invoiceUrl: string) => {
    const isSub = workflowState.userRole === UserRole.SUBCONTRACTOR;
    const typeTag = isSub ? 'INVOICE' : 'COMPLETION';
    const subject = encodeURIComponent(`${typeTag} SUBMISSION: ${workflowState.jobInfo.jobName}`);
    let body = `Job Close-out Package: ${closeoutUrl}\n`;
    if (invoiceUrl) body += `Subcontractor Invoice: ${invoiceUrl}\n`;
    body += `\nFull documentation verified via ${COMPANY.name} Field Pro.`;
    const mailLink = document.createElement('a'); mailLink.href = `mailto:${OFFICE_EMAIL}?subject=${subject}&body=${encodeURIComponent(body)}`; mailLink.click();
  }, [workflowState.userRole, workflowState.jobInfo.jobName]);

  // handleUpdateOfficeReviewStatus (closeout review) removed — the closeout
  // review pill is gone. Nothing writes to office_review_status now.
  //
  // handleConfirmFieldForecast — clears forecastReviewStatus back to
  // UP_TO_DATE after the office has reviewed a field-submitted schedule
  // change. Called from the dashboard "Schedule Change" surface and from the
  // job detail "Acknowledge" button. Does NOT touch the official schedule
  // dates — use "Apply to Official Schedule" for that.
  const handleConfirmFieldForecast = useCallback((jobId: string) => {
    setJobs(prevJobs => prevJobs.map(job =>
      job.id === jobId ? {
        ...job,
        forecastReviewStatus: ForecastReviewStatus.UP_TO_DATE,
        updatedAt: new Date().toISOString()
      } : job
    ));
    setSelectedJob(prev => {
      if (prev && prev.id === jobId) {
        return {
          ...prev,
          forecastReviewStatus: ForecastReviewStatus.UP_TO_DATE,
          updatedAt: new Date().toISOString()
        };
      }
      return prev;
    });
    dataService.updateJob(jobId, {
      forecastReviewStatus: ForecastReviewStatus.UP_TO_DATE
    }).catch(err =>
      console.error('[handleConfirmFieldForecast] Supabase write failed:', err)
    );
  }, []);

  const handleUpdateSchedule = useCallback((jobId: string, updates: Partial<Job>) => {
    // If the office is clearing the field forecast (i.e. clicking
    // "Apply to Official Schedule"), that IS the confirmation — also flip
    // forecastReviewStatus back to UP_TO_DATE so the dashboard chip clears.
    const clearingForecast = 'fieldForecast' in updates && !updates.fieldForecast;
    const enriched: Partial<Job> = clearingForecast
      ? { ...updates, forecastReviewStatus: ForecastReviewStatus.UP_TO_DATE }
      : updates;

    setJobs(prevJobs => prevJobs.map(job => {
      if (job.id === jobId) {
        const updatedJob = { ...job, ...enriched };
        const startOrDurationChanged = 'plannedStartDate' in enriched || 'plannedDurationDays' in enriched;
        const finishNotExplicitlySet = !('plannedFinishDate' in enriched);

        if (startOrDurationChanged && finishNotExplicitlySet && updatedJob.plannedStartDate && updatedJob.plannedDurationDays) {
          const start = new Date(updatedJob.plannedStartDate);
          const finish = new Date(start);
          finish.setDate(start.getDate() + updatedJob.plannedDurationDays);
          updatedJob.plannedFinishDate = finish.toISOString().split('T')[0];
        }
        return { ...updatedJob, updatedAt: new Date().toISOString() };
      }
      return job;
    }));

    setSelectedJob(prev => {
      if (prev && prev.id === jobId) {
        const updatedJob = { ...prev, ...enriched };
        const startOrDurationChanged = 'plannedStartDate' in enriched || 'plannedDurationDays' in enriched;
        const finishNotExplicitlySet = !('plannedFinishDate' in enriched);

        if (startOrDurationChanged && finishNotExplicitlySet && updatedJob.plannedStartDate && updatedJob.plannedDurationDays) {
          const start = new Date(updatedJob.plannedStartDate);
          const finish = new Date(start);
          finish.setDate(start.getDate() + updatedJob.plannedDurationDays);
          updatedJob.plannedFinishDate = finish.toISOString().split('T')[0];
        }
        return { ...updatedJob, updatedAt: new Date().toISOString() };
      }
      return prev;
    });

    // Persist to Supabase
    dataService.updateJob(jobId, enriched).catch(err =>
      console.error('[handleUpdateSchedule] Supabase write failed:', err)
    );
  }, []);

  // Field worker schedule update: receives days-remaining from WorkflowContainer,
  // computes a new plannedFinishDate from today and persists via handleUpdateSchedule.
  const handleFieldScheduleUpdate = useCallback((daysRemaining: number, status: ScheduleStatus = ScheduleStatus.ON_SCHEDULE, note: string = '') => {
    if (!workflowState.jobId) return;
    const newFinish = new Date();
    newFinish.setDate(newFinish.getDate() + daysRemaining);
    const finishStr = newFinish.toISOString().split('T')[0];
    const job = jobs.find(j => j.id === workflowState.jobId);
    let newDuration = daysRemaining;
    if (job?.plannedStartDate) {
      const start = new Date(job.plannedStartDate);
      newDuration = Math.ceil((newFinish.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
    }
    handleUpdateSchedule(workflowState.jobId, {
      plannedFinishDate: finishStr,
      plannedDurationDays: newDuration,
      fieldForecast: {
        status,
        estimatedDaysRemaining: daysRemaining,
        note,
        updatedAt: new Date().toISOString(),
        updatedBy: 'field',
      },
    });
  }, [workflowState.jobId, jobs, handleUpdateSchedule]);

  const handleUpdateEstimatorIntake = useCallback((intake: EstimatorIntake) => {
    
    // Save to Supabase (or localStorage fallback)
    dataService.saveEstimatorIntake(intake).catch(err => {
      console.error('Failed to save intake:', err);
    });

    // Also keep localStorage as a local cache for offline support.
    // IMPORTANT: use safeSetItem (never bare localStorage.setItem) so a
    // QuotaExceededError doesn't crash the callback chain and prevent
    // navigation to the estimator / pipeline stage transitions.
    safeSetItem(`estimator_intake_${intake.jobId}`, JSON.stringify(intake));
    
    // Update the job in state WITH the estimatorIntake data
    const marketingSource = intake.checklist?.marketingSource || '';
    const marketingDetail = intake.checklist?.marketingDetail || '';
    const leadSourceStr = marketingDetail ? `${marketingSource} - ${marketingDetail}` : marketingSource;
    
    setJobs(prev => prev.map(job => 
      job.id === intake.jobId ? { 
        ...job, 
        estimatorIntake: intake,
        leadSource: leadSourceStr || job.leadSource,
        updatedAt: new Date().toISOString() 
      } : job
    ));
    setSelectedJob(prev => {
      if (prev && prev.id === intake.jobId) {
        return { ...prev, estimatorIntake: intake, leadSource: leadSourceStr || prev.leadSource, updatedAt: new Date().toISOString() };
      }
      return prev;
    });
    
  }, []);

  const handleUpdateFieldForecast = useCallback((jobId: string, forecast: any) => {
    // When a field tech / subcontractor submits a schedule update, flag the
    // job as REVIEW_NEEDED so the office sees a "Schedule Change — Confirm
    // Updated Dates" surface on the dashboard, calendar, and pipeline card.
    // Office clears the flag by either applying the change to the official
    // schedule, or clicking "Acknowledge" on the job file.
    const forecastPayload = {
      ...forecast,
      updatedAt: new Date().toISOString(),
      updatedBy: currentUser?.name || 'Unknown'
    };
    setJobs(prevJobs => prevJobs.map(job =>
      job.id === jobId ? {
        ...job,
        fieldForecast: forecastPayload,
        forecastReviewStatus: ForecastReviewStatus.REVIEW_NEEDED,
        updatedAt: new Date().toISOString()
      } : job
    ));
    setSelectedJob(prev => {
      if (prev && prev.id === jobId) {
        return {
          ...prev,
          fieldForecast: forecastPayload,
          forecastReviewStatus: ForecastReviewStatus.REVIEW_NEEDED,
          updatedAt: new Date().toISOString()
        };
      }
      return prev;
    });
    dataService.updateJob(jobId, {
      fieldForecast: forecastPayload,
      forecastReviewStatus: ForecastReviewStatus.REVIEW_NEEDED
    }).catch(err =>
      console.error('[handleUpdateFieldForecast] Supabase write failed:', err)
    );
  }, [currentUser?.name]);

  const onAcceptOption = useCallback((
    optionId: string,
    addOns: string[],
    deckingSwap?: {
      optionId: string;
      fromId: string;
      fromName: string;
      toId: string;
      toName: string;
      toBrand?: string;
      priceImpact: number;
    },
  ) => {
    if (!selectedJob) return;
    handleAcceptEstimateOption(selectedJob.id, optionId, addOns);

    // Persist the decking swap (if any) onto the job so the office sees it as
    // a pending reconciliation before production can kick off.
    if (deckingSwap) {
      const swapEntry = {
        optionId: deckingSwap.optionId,
        category: 'decking' as const,
        fromId: deckingSwap.fromId,
        fromName: deckingSwap.fromName,
        toId: deckingSwap.toId,
        toName: deckingSwap.toName,
        toBrand: deckingSwap.toBrand,
        priceImpact: deckingSwap.priceImpact,
        timestamp: new Date().toISOString(),
      };
      const existing = selectedJob.customerRequestedSwaps || [];
      handleUpdateJob(selectedJob.id, {
        customerRequestedSwaps: [...existing, swapEntry],
      });
    }
  }, [selectedJob, handleAcceptEstimateOption, handleUpdateJob]);

  const onTrackEngagement = useCallback((engagement: Partial<PortalEngagement>) => {
    if (selectedJob) {
      handleTrackPortalEngagement(selectedJob.id, engagement);
    }
  }, [selectedJob, handleTrackPortalEngagement]);

  /** Called when customer signs the contract on the portal */
  const onSignContract = useCallback(async (jobId: string, signature: string) => {
    const job = jobs.find(j => j.id === jobId);
    if (!job) return;

    const now = new Date().toISOString();
    // contractPdf and depositInvoice are lightweight (no heavy deps) — use dynamic
    // import to keep them out of the main chunk. AcceptanceModal still imports them
    // statically; Vite groups both imports into the same chunk, which is correct:
    // the two call sites share a logical "acceptance" code path.
    const [{ generateContractPDF }, { generateDepositInvoice }] = await Promise.all([
      import('./utils/contractPdf'),
      import('./utils/depositInvoice'),
    ]);
    const amount = job.totalAmount || job.estimateAmount || 0;

    try {
      // Generate PDFs (returns blob: URL)
      const contractBlobUrl = await generateContractPDF({
        jobNumber: job.jobNumber || '',
        clientName: job.clientName || '',
        clientEmail: job.clientEmail || '',
        clientPhone: job.clientPhone || '',
        projectAddress: job.projectAddress || '',
        totalAmount: amount,
        depositAmount: Math.round(amount * 0.3),
        scopeSummary: job.scopeSummary || job.acceptedBuildSummary?.scopeSummary || '',
        signature,
        acceptedDate: now,
      });

      const depositBlobUrl = generateDepositInvoice({
        jobNumber: job.jobNumber || '',
        clientName: job.clientName || '',
        clientEmail: job.clientEmail || '',
        clientPhone: job.clientPhone || '',
        projectAddress: job.projectAddress || '',
        totalAmount: amount,
        depositPercent: 30,
        invoiceDate: now,
      });

      // Upload to Cloudinary for permanent storage (avoid ephemeral blob: URLs)
      let contractPdfUrl = contractBlobUrl;
      let depositInvoiceUrl = depositBlobUrl;
      try {
        [contractPdfUrl, depositInvoiceUrl] = await Promise.all([
          uploadFileToCloudinary(contractBlobUrl, `contract-${job.jobNumber}-${Date.now()}`),
          uploadFileToCloudinary(depositBlobUrl, `deposit-invoice-${job.jobNumber}-${Date.now()}`),
        ]);
        // Revoke the temporary blob: URLs
        URL.revokeObjectURL(contractBlobUrl);
        URL.revokeObjectURL(depositBlobUrl);
      } catch {
        // Upload failed — fall back to blob: URLs (works in current session only)
      }

      // Auto-check "Signed contract confirmed" and "Send deposit invoice" in JOB_SOLD checklist
      const autoCheckedChecklists = (job.officeChecklists || createDefaultOfficeChecklists()).map(cl => {
        if (cl.stage === PipelineStage.JOB_SOLD) {
          return {
            ...cl,
            items: cl.items.map(item =>
              (item.id === 'office-JOB_SOLD-0' || item.id === 'office-JOB_SOLD-1')
                ? { ...item, completed: true }
                : item
            )
          };
        }
        return cl;
      });

      handleUpdateJob(jobId, {
        pipelineStage: PipelineStage.JOB_SOLD,
        lifecycleStage: CustomerLifecycle.WON_SOLD,
        status: JobStatus.SCHEDULED,
        depositStatus: DepositStatus.REQUESTED,
        depositRequestedDate: now,
        depositAmount: Math.round(amount * 0.3),
        soldWorkflowStatus: SoldWorkflowStatus.AWAITING_DEPOSIT,
        customerSignature: signature,
        contractPdfUrl: contractPdfUrl,
        contractSignedDate: now,
        acceptedDate: now,
        updatedAt: now,
        officeChecklists: autoCheckedChecklists,
        files: [
          ...(job.files || []),
          {
            id: `contract-${Date.now()}`,
            name: `Contract-${job.jobNumber}.pdf`,
            url: contractPdfUrl,
            type: 'contract' as const,
            uploadedAt: now,
            uploadedBy: 'system'
          },
          {
            id: `deposit-inv-${Date.now()}`,
            name: `Deposit-Invoice-${job.jobNumber}.pdf`,
            url: depositInvoiceUrl,
            type: 'other' as const,
            uploadedAt: now,
            uploadedBy: 'system'
          }
        ]
      });
    } catch (err) {
      console.error('Contract generation failed:', err);
      handleUpdateJob(jobId, {
        pipelineStage: PipelineStage.JOB_SOLD,
        lifecycleStage: CustomerLifecycle.WON_SOLD,
        status: JobStatus.SCHEDULED,
        depositStatus: DepositStatus.NOT_SENT,
        soldWorkflowStatus: SoldWorkflowStatus.ACCEPTED,
        customerSignature: signature,
        contractSignedDate: now,
        acceptedDate: now,
        updatedAt: now,
      });
    }
  }, [jobs, handleUpdateJob]);

  const handleClosePortal = useCallback(() => {
    if (selectedJob) {
      // Return to the correct detail view based on stage
      if (ESTIMATE_STAGES.includes(selectedJob.pipelineStage)) {
        navigateTo('estimate-detail', selectedJob?.id);
      } else {
        navigateTo('office-job-detail', selectedJob?.id);
      }
    } else {
      navigateTo('office-dashboard');
    }
  }, [selectedJob]);

  // --- Estimator Calculator Integration ---
  const [calculatorInitialDimensions, setCalculatorInitialDimensions] = useState<any>(undefined);
  const [calculatorInitialClientInfo, setCalculatorInitialClientInfo] = useState<{ name: string; address: string } | undefined>(undefined);
  const [calculatorInitialSelections, setCalculatorInitialSelections] = useState<any>(undefined);
  /** Full options array for restoring a multi-option estimate when reopening from pipeline */
  const [calculatorInitialOptions, setCalculatorInitialOptions] = useState<any[] | undefined>(undefined);
  // calculatorSourceJobId and setCalculatorSourceJobId are provided by useJobs()
  const [showCalculatorAcceptance, setShowCalculatorAcceptance] = useState(false);
  const [calculatorAcceptanceJob, setCalculatorAcceptanceJob] = useState<Job | null>(null);
  const [pendingJobAcceptance, setPendingJobAcceptance] = useState<Job | null>(null);

  /** Open the calculator fresh (New Estimate from office) */
  const handleOpenNewEstimate = useCallback(() => {
    setCalculatorInitialDimensions(undefined);
    setCalculatorInitialClientInfo(undefined);
    setCalculatorInitialSelections(undefined);
    setCalculatorSourceJobId(null);
    navigateTo('estimator-calculator');
  }, []);

  /** Open the calculator pre-filled from a field estimator's intake data */
  const handlePushToEstimating = useCallback((intake: EstimatorIntake) => {
    const dims = measureSheetToCalculatorDimensions(intake.measureSheet);
    setCalculatorInitialDimensions(dims);
    // Find the job to get client info and save intake data
    const job = jobs.find(j => j.id === intake.jobId);
    if (job) {
      setCalculatorInitialClientInfo(jobToCalculatorClientInfo(job));
      setCalculatorSourceJobId(job.id);
      // Save the estimator intake data to the job record
      handleUpdateJob(job.id, {
        estimatorIntake: intake,
        pipelineStage: PipelineStage.EST_IN_PROGRESS,
      });
    }
    navigateTo('estimator-calculator');
  }, [jobs, handleUpdateJob]);

  /** Open the calculator pre-filled from an existing job (e.g. from OfficeJobDetail) */
  const handleOpenEstimateForJob = useCallback(async (job: Job) => {
    // ── Priority 1: restore from the full calculatorOptions array ──────────
    // This is the modern path — set whenever an estimate is saved/accepted.
    // It captures ALL options (A, B, C…) with their exact dimensions,
    // selections, and lighting quantities so the estimator reopens exactly
    // as it was left.
    if (job.calculatorOptions && job.calculatorOptions.length > 0) {
      setCalculatorInitialOptions(job.calculatorOptions);
      // Still set client info and source job; clear legacy single-option state
      setCalculatorInitialDimensions(undefined);
      setCalculatorInitialSelections(undefined);
      setCalculatorInitialClientInfo(jobToCalculatorClientInfo(job));
      setCalculatorSourceJobId(job.id);
      setSelectedJob(job);
      navigateTo('estimator-calculator');
      return;
    }

    // ── Priority 1b: reconstruct option tabs from estimate_data.options ─────
    // When the job has presentation-layer options (set by handleEstimateSaved
    // via estimateData) but calculator_options is missing — e.g. an older
    // save path ran before calculatorOptions was added, or a subsequent
    // update wiped it — seed the estimator with option tabs carrying the
    // saved names and client info, plus the accepted option's dimensions
    // where possible. This prevents the calculator from opening at 0-0 with
    // no tabs, which silently loses the context that there were multiple
    // options. Dimensions/selections are left empty for each tab so the user
    // can re-enter them without starting from a blank slate.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const estData = (job as any).estimateData as { options?: Array<{ id: string; name: string }> } | undefined;
    if (estData?.options && estData.options.length > 0) {
      const fallbackOptions = estData.options.map((opt) => ({
        id: opt.id,
        name: opt.name || `Option ${opt.id}`,
        selections: {},
        dimensions: job.calculatorDimensions || {},
        lightingQuantities: {},
        activePackage: undefined,
      }));
      setCalculatorInitialOptions(fallbackOptions);
      setCalculatorInitialDimensions(undefined);
      setCalculatorInitialSelections(undefined);
      setCalculatorInitialClientInfo(jobToCalculatorClientInfo(job));
      setCalculatorSourceJobId(job.id);
      setSelectedJob(job);
      navigateTo('estimator-calculator');
      return;
    }

    // ── Priority 2: legacy single-option restore ───────────────────────────
    // Used for estimates saved before calculatorOptions was introduced.
    setCalculatorInitialOptions(undefined);

    // Restore dimensions — prefer saved calculatorDimensions, fall back to measureSheet
    if (job.calculatorDimensions && Object.keys(job.calculatorDimensions).length > 0) {
      setCalculatorInitialDimensions(job.calculatorDimensions);
    } else {
      // Try loading from Supabase first (cross-device), then localStorage
      const intake = await dataService.loadEstimatorIntake(job.id);
      if (intake?.measureSheet) {
        setCalculatorInitialDimensions(measureSheetToCalculatorDimensions(intake.measureSheet));
      } else {
        const localSheet = loadEstimatorIntake(job.id);
        if (localSheet) {
          setCalculatorInitialDimensions(measureSheetToCalculatorDimensions(localSheet));
        } else {
          setCalculatorInitialDimensions(undefined);
        }
      }
    }

    // Restore saved material/option selections from the last time this estimate was built
    if (job.calculatorSelections && Object.keys(job.calculatorSelections).length > 0) {
      setCalculatorInitialSelections(job.calculatorSelections);
    } else {
      setCalculatorInitialSelections(undefined);
    }

    // Client info + source job
    setCalculatorInitialClientInfo(jobToCalculatorClientInfo(job));
    setCalculatorSourceJobId(job.id);
    setSelectedJob(job);
    navigateTo('estimator-calculator');
  }, []);

  /** Called when the customer/office accepts a quote in the calculator */
  const handleEstimateAcceptedLocal = useCallback((data: {
    clientName: string;
    clientAddress: string;
    estimateNumber: number;
    selections: any;
    dimensions: any;
    pricingSummary: any;
    activePackage: any;
  }) => {
    // Delegate data mutation to the hook
    handleEstimateAccepted(data);
    // Handle UI-specific modal state (not in the hook)
    const totalAmount = Math.round(data.pricingSummary.finalTotal);
    const estimateAmount = Math.round(data.pricingSummary.subTotal);
    const acceptedBuildSummary = {
      optionName: data.activePackage
        ? `${data.activePackage.size} ${data.activePackage.level} Package`
        : `Custom Estimate #${data.estimateNumber}`,
      basePrice: estimateAmount,
      addOns: data.pricingSummary.impacts
        .filter((imp: any) => Math.round(imp.value) !== 0)
        .map((imp: any) => ({ name: imp.label, price: Math.round(imp.value) })) as { name: string; price: number }[],
      totalPrice: totalAmount,
      acceptedDate: new Date().toISOString(),
      scopeSummary: data.pricingSummary.impacts
        .filter((imp: any) => Math.round(imp.value) !== 0)
        .map((imp: any) => imp.label)
        .join(', ')
    };
    if (calculatorSourceJobId) {
      const updatedJob = jobs.find(j => j.id === calculatorSourceJobId);
      if (updatedJob) {
        const jobForModal = { ...updatedJob, totalAmount, estimateAmount, acceptedBuildSummary, calculatorSelections: data.selections, calculatorDimensions: data.dimensions, pipelineStage: PipelineStage.EST_COMPLETED, clientName: data.clientName, projectAddress: data.clientAddress };
        setCalculatorAcceptanceJob(jobForModal);
      }
    }
    setShowCalculatorAcceptance(true);
  }, [handleEstimateAccepted, calculatorSourceJobId, jobs]);

  // handleEstimateSaved is now provided by useJobs()

  useEffect(() => {
    if (selectedJob && !selectedJob.estimatorIntake) {
      dataService.loadEstimatorIntake(selectedJob.id).then(intake => {
        if (intake) {
          setSelectedJob(prev => prev ? { ...prev, estimatorIntake: intake } : prev);
        }
      });
    }
  }, [selectedJob?.id]);

  return (
    <AppRouter
      view={view}
      currentUser={currentUser}
      theme={theme}
      navigateTo={navigateTo}
      handleLogin={handleLogin}
      handleLogout={handleLogout}
      setTheme={setTheme}
      jobs={jobs}
      setJobs={setJobs}
      selectedJob={selectedJob}
      setSelectedJob={setSelectedJob}
      handleSelectJob={handleSelectJob}
      handleUpdateJob={handleUpdateJob}
      handleDeleteJob={handleDeleteJob}
      handleUpdatePipelineStage={handleUpdatePipelineStage}
      handleCreateJob={handleCreateJob}
      handleOpenWorkflow={handleOpenWorkflow}
      handleUpdateOfficeChecklist={handleUpdateOfficeChecklist}
      handleUpdateSchedule={handleUpdateSchedule}
      handleConfirmFieldForecast={handleConfirmFieldForecast}
      handleUpdateFieldForecast={handleUpdateFieldForecast}
      handleUpdateEstimatorIntake={handleUpdateEstimatorIntake}
      handleOpenNewEstimate={handleOpenNewEstimate}
      handleOpenEstimateForJob={handleOpenEstimateForJob}
      handlePushToEstimating={handlePushToEstimating}
      handleEstimateAcceptedLocal={handleEstimateAcceptedLocal}
      handleEstimateSaved={handleEstimateSaved}
      calculatorInitialDimensions={calculatorInitialDimensions}
      calculatorInitialClientInfo={calculatorInitialClientInfo}
      calculatorInitialSelections={calculatorInitialSelections}
      calculatorInitialOptions={calculatorInitialOptions}
      calculatorSourceJobId={calculatorSourceJobId}
      showCalculatorAcceptance={showCalculatorAcceptance}
      setShowCalculatorAcceptance={setShowCalculatorAcceptance}
      calculatorAcceptanceJob={calculatorAcceptanceJob}
      portalLoading={portalLoading}
      onAcceptOption={onAcceptOption}
      onSignContract={onSignContract}
      onTrackEngagement={onTrackEngagement}
      handleClosePortal={handleClosePortal}
      workflowState={workflowState}
      setWorkflowState={setWorkflowState}
      isOnline={isOnline}
      isUploading={isUploading}
      uploadProgress={uploadProgress}
      submissionError={submissionError}
      handleFullSubmission={handleFullSubmission}
      handleFieldScheduleUpdate={handleFieldScheduleUpdate}
      chatSessions={chatSessions}
      handleSendMessage={handleSendMessage}
      customers={customers}
      handleUpdateCustomer={handleUpdateCustomer}
      invoices={invoices}
      handleUpdateInvoice={handleUpdateInvoice}
      handleGenerateInvoice={handleGenerateInvoice}
      handleGenerateAndSendInvoice={handleGenerateAndSendInvoice}
      pendingJobAcceptance={pendingJobAcceptance}
      setPendingJobAcceptance={setPendingJobAcceptance}
      newJobInitialStage={newJobInitialStage}
      setNewJobInitialStage={setNewJobInitialStage}
      newJobPrefilledDate={newJobPrefilledDate}
      setNewJobPrefilledDate={setNewJobPrefilledDate}
      newJobPrefilledContact={newJobPrefilledContact}
      setNewJobPrefilledContact={setNewJobPrefilledContact}
      aiError={aiError}
      storageError={storageError}
    />
  );
};

export default App;
