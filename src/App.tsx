import React, { useState, useEffect, useCallback } from 'react';
import { UserRole, AppState, PageState, User, Job, Role, JobStatus, OfficeReviewStatus, ForecastReviewStatus, ChatSession, ChatMessage, CustomerLifecycle, PipelineStage, PortalEngagement, DepositStatus, SoldWorkflowStatus, EstimatorIntake, NurtureSequence } from './types';
import { useAppRouter, pathToView } from './hooks/useAppRouter';
import { PAGE_CONFIGS, PAGE_TITLES, INITIAL_INVOICE as EMPTY_INVOICE, createDefaultOfficeChecklists, createDefaultBuildDetails, DEFAULT_AUTOMATIONS, PIPELINE_STAGES, ESTIMATE_STAGES, RATES } from './constants';
import LoginView from './views/LoginView';
import JobsListView from './views/JobsListView';
import JobDetailView from './views/JobDetailView';
import OfficeDashboardView from './views/OfficeDashboardView';
import StatsView from './views/StatsView';
import WorkflowContainer from './views/WorkflowContainer';
import FieldResourcesView from './views/FieldResourcesView';
import { generateCloseoutPDF, generateInvoicePDF } from './utils/pdfGenerator';
import { safeSetItem } from './utils/storage';
import SchedulingCalendarView from './views/SchedulingCalendarView';
import OfficeJobDetailView from './views/OfficeJobDetailView';
import NewJobIntakeView from './views/NewJobIntakeView';
import CustomerPortalView from './views/CustomerPortalView';
import EstimatePortalView from './views/EstimatePortalView';
import EstimatorDashboardView from './views/EstimatorDashboardView';
import EstimatorWorkflowView from './views/EstimatorWorkflowView';
import EstimateDetailView from './views/EstimateDetailView';
import NavBar from './components/NavBar';
import AcceptanceModal from './components/AcceptanceModal';
import { EstimatorCalendar } from './components/EstimatorCalendar';
import ChatView from './components/ChatView';
import UserManagementView from './views/UserManagementView';
import { Calendar, Users, AlertCircle, ChevronLeft, Calculator } from 'lucide-react';
import UnifiedPipelineView from './views/UnifiedPipelineView';

import { geminiService } from './services/geminiService';
import { supabase } from './lib/supabase';
import EstimatorCalculatorView from './estimator/EstimatorCalculatorView';
import { measureSheetToCalculatorDimensions, jobToCalculatorClientInfo, loadEstimatorIntake } from './estimator/dataBridge';
import { dataService } from './services/dataService';

const INTERNAL_SECRET = import.meta.env.VITE_INTERNAL_API_SECRET as string | undefined;
const internalHeaders = (extra: Record<string, string> = {}) => ({
  'Content-Type': 'application/json',
  ...(INTERNAL_SECRET ? { 'X-Internal-Secret': INTERNAL_SECRET } : {}),
  ...extra,
});

// Simple Error Boundary
class ErrorBoundary extends React.Component<{ children: React.ReactNode }, { hasError: boolean, error: Error | null }> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("ErrorBoundary caught an error", error, errorInfo);
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

const STORAGE_KEY = 'luxury_decking_app_state_v4';
const JOBS_STORAGE_KEY = 'luxury_decking_jobs_v5'; // v5: mock data removed, clean start
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
    // Check for portal token in query params (legacy support)
    const params = new URLSearchParams(window.location.search);
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
    // Check both ?portal=TOKEN (legacy) and /portal/:token (path-based)
    const portalToken = params.get('portal')
      || (window.location.pathname.startsWith('/portal/') ? window.location.pathname.split('/')[2] : null);
    if (portalToken) {
      // Use the logic above to get the full list of migrated jobs
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
  const [portalLoading, setPortalLoading] = useState(false);

  // Router hook - provides navigateTo() which updates both URL and view state
  const { navigateTo } = useAppRouter(setView, selectedJob?.id);

  const [newJobInitialStage, setNewJobInitialStage] = useState<PipelineStage>(PipelineStage.LEAD_IN);

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

  // Subscribe to Supabase Realtime for live job updates (multi-device sync)
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
          fetch('/.netlify/functions/send-sms', {
            method: 'POST',
            headers: internalHeaders(),
            body: JSON.stringify({ to: session.clientPhone, message: text }),
          }).then(res => res.json()).then(data => {
            if (!data.success) console.error('SMS failed:', data.error);
          }).catch(err => console.error('SMS error:', err));
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
          
          // Send automated SMS via Twilio
          const sessionId = `session-${jobToUpdate.id}`;
          setTimeout(() => {
            handleSendMessage(sessionId, messageText);
            // Also send real SMS if client has phone
            if (jobToUpdate.clientPhone) {
              fetch('/.netlify/functions/send-sms', {
                method: 'POST',
                headers: internalHeaders(),
                body: JSON.stringify({ to: jobToUpdate.clientPhone, message: messageText }),
              }).then(res => res.json()).then(data => {
                if (data.success) { /* auto SMS sent */ }
                else console.error('Auto SMS failed:', data.error);
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
  }, []);

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

  useEffect(() => {
    if (currentUser) {
      safeSetItem(AUTH_KEY, JSON.stringify(currentUser));
    } else {
      localStorage.removeItem(AUTH_KEY);
    }
  }, [currentUser]);

  useEffect(() => {
    safeSetItem(STORAGE_KEY, JSON.stringify(workflowState));
  }, [workflowState]);

  useEffect(() => {
    safeSetItem(JOBS_STORAGE_KEY, JSON.stringify(jobs));
  }, [jobs]);

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
          officeChecklists: job.officeChecklists || createDefaultOfficeChecklists(),
          buildDetails: job.buildDetails || createDefaultBuildDetails(),
          customerPortalToken: job.customerPortalToken || crypto.randomUUID(),
        })));
      }
    }).catch(() => { /* Supabase unavailable — localStorage data stays */ });
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
      // Estimator: route to estimate detail for pre-sale, job detail for post-sale
      if (ESTIMATE_STAGES.includes(job.pipelineStage)) {
        navigateTo('estimate-detail', job.id);
      } else {
        navigateTo('office-job-detail', job.id);
      }
    } else {
      navigateTo('detail', job.id);
    }
  }, [currentUser]);

  const handleUpdatePipelineStage = useCallback((jobId: string, newStage: PipelineStage) => {
    const job = jobs.find(j => j.id === jobId) || selectedJob;
    const updates: Partial<Job> = { pipelineStage: newStage };
    if (newStage === PipelineStage.IN_FIELD && job?.status === JobStatus.SCHEDULED) {
      updates.status = JobStatus.IN_PROGRESS;
    }
    handleUpdateJob(jobId, updates);

    // Auto-send Google review request when job moves to Paid & Closed
    if (newStage === PipelineStage.PAID_CLOSED && job) {
      const reviewUrl = import.meta.env.VITE_GOOGLE_REVIEW_URL || 'https://g.page/r/luxury-decking/review';
      const firstName = job.clientName?.split(' ')[0] || 'there';
      const reviewMsg = `Hi ${firstName}, thank you for choosing Luxury Decking! We'd love it if you could take a moment to leave us a Google review: ${reviewUrl} — Your feedback means the world to us!`;
      if (job.clientPhone) {
        fetch('/.netlify/functions/send-sms', {
          method: 'POST',
          headers: internalHeaders(),
          body: JSON.stringify({ to: job.clientPhone, message: reviewMsg }),
        }).catch(err => console.warn('[review-sms] failed:', err));
      }

      // Auto-send warranty delivery SMS
      if (job.clientPhone && job.customerPortalToken) {
        const portalUrl = `${window.location.origin}?portal=${job.customerPortalToken}`;
        const warrantyMsg = `Hi ${firstName}, your Luxury Decking project is officially complete! Your 5-year warranty is now active. Access your Project Portal and Warranty Package here: ${portalUrl}`;
        fetch('/.netlify/functions/send-sms', {
          method: 'POST',
          headers: internalHeaders(),
          body: JSON.stringify({ to: job.clientPhone, message: warrantyMsg }),
        }).catch(err => console.warn('[warranty-sms] failed:', err));
      }
    }
  }, [jobs, selectedJob, handleUpdateJob]);

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
          addOnInteractions: { ...current.addOnInteractions }
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

        // Calculate engagement heat
        const isRecentlyOpened = updated.lastOpenedAt && (Date.now() - new Date(updated.lastOpenedAt).getTime()) < 24 * 60 * 60 * 1000;
        let heat: 'cold' | 'warm' | 'hot' = 'cold';
        if (updated.totalOpens > 5 || updated.totalTimeSpentSeconds > 300 || isRecentlyOpened) heat = 'hot';
        else if (updated.totalOpens > 2 || updated.totalTimeSpentSeconds > 60) heat = 'warm';

        return { ...job, portalEngagement: updated, engagementHeat: heat };
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
        currentTouch: 0,
        completedTouches: [],
        status: 'active' as const,
        sentMessages: [],
      }
    } : newJob;

    setJobs(prev => [jobWithCampaign, ...prev]);
    dataService.createJob(jobWithCampaign).catch(err => console.error('Failed to persist new job:', err));
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
      const closeoutDataUri = await generateCloseoutPDF(updatedStateWithPhotos);
      let verifiedBuildPassportUrl = '';
      try {
        verifiedBuildPassportUrl = await uploadFileToCloudinary(closeoutDataUri, `Passport_${workflowState.jobInfo.jobName}_${Date.now()}`);
      } catch (pdfUploadErr) {
        console.warn('Closeout PDF upload to Cloudinary failed, using local URI:', pdfUploadErr);
        verifiedBuildPassportUrl = closeoutDataUri;
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
                officeReviewStatus: OfficeReviewStatus.READY_FOR_REVIEW,
                verifiedBuildPassportUrl,
                subcontractorInvoiceUrl,
                ...(workflowState.userRole === UserRole.SUBCONTRACTOR ? { labourCost: subInvoiceTotal } : {}),
                files: [
                  ...(job.files || []),
                  {
                    id: `f-passport-${Date.now()}`,
                    name: `Luxury Decking Verified Build Passport - ${job.clientName}.pdf`,
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
            officeReviewStatus: OfficeReviewStatus.READY_FOR_REVIEW,
            verifiedBuildPassportUrl,
            subcontractorInvoiceUrl,
            ...(workflowState.userRole === UserRole.SUBCONTRACTOR ? { labourCost: subInvoiceTotal } : {}),
            files: [
              ...(prev.files || []),
              {
                id: `f-passport-${Date.now()}`,
                name: `Luxury Decking Verified Build Passport - ${prev.clientName}.pdf`,
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

      // Persist completion to Supabase — await so a failure surfaces to the crew (not silent)
      if (workflowState.jobId) {
        await dataService.updateJob(workflowState.jobId, {
          status: JobStatus.COMPLETED,
          currentStage: 5,
          pipelineStage: PipelineStage.COMPLETION,
          signoffStatus: 'signed' as const,
          finalSubmissionStatus: 'submitted' as const,
          invoiceSupportStatus: workflowState.userRole === UserRole.SUBCONTRACTOR ? 'submitted' as const : 'not_required' as const,
          officeReviewStatus: OfficeReviewStatus.READY_FOR_REVIEW,
          verifiedBuildPassportUrl,
          subcontractorInvoiceUrl,
          ...(workflowState.userRole === UserRole.SUBCONTRACTOR ? { labourCost: subInvoiceTotal } : {}),
          ...(workflowState.fieldForecast ? { fieldForecast: workflowState.fieldForecast } : {}),
          updatedAt: new Date().toISOString()
        });
      }

      // Netlify form submission (non-blocking for UI)
      try {
        await fetch("/", {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: formData.toString(),
        });
      } catch (e) {
        console.warn("Netlify form submission failed, but local state is updated:", e);
      }

      sendEmailIntent(verifiedBuildPassportUrl, subcontractorInvoiceUrl);

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
    body += `\nFull documentation verified via Luxury Decking Field Pro.`;
    const mailLink = document.createElement('a'); mailLink.href = `mailto:${OFFICE_EMAIL}?subject=${subject}&body=${encodeURIComponent(body)}`; mailLink.click();
  }, [workflowState.userRole, workflowState.jobInfo.jobName]);

  const handleUpdateOfficeReviewStatus = useCallback((jobId: string, status: OfficeReviewStatus) => {
    setJobs(prevJobs => prevJobs.map(job =>
      job.id === jobId ? { ...job, officeReviewStatus: status, updatedAt: new Date().toISOString() } : job
    ));
    setSelectedJob(prev => {
      if (prev && prev.id === jobId) {
        return { ...prev, officeReviewStatus: status, updatedAt: new Date().toISOString() };
      }
      return prev;
    });
    dataService.updateJob(jobId, { officeReviewStatus: status }).catch(err =>
      console.error('[handleUpdateOfficeReviewStatus] Supabase write failed:', err)
    );
  }, []);

  const handleUpdateSchedule = useCallback((jobId: string, updates: Partial<Job>) => {
    setJobs(prevJobs => prevJobs.map(job => {
      if (job.id === jobId) {
        const updatedJob = { ...job, ...updates };
        const startOrDurationChanged = 'plannedStartDate' in updates || 'plannedDurationDays' in updates;
        const finishNotExplicitlySet = !('plannedFinishDate' in updates);

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
        const updatedJob = { ...prev, ...updates };
        const startOrDurationChanged = 'plannedStartDate' in updates || 'plannedDurationDays' in updates;
        const finishNotExplicitlySet = !('plannedFinishDate' in updates);

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
    dataService.updateJob(jobId, updates).catch(err =>
      console.error('[handleUpdateSchedule] Supabase write failed:', err)
    );
  }, []);

  // Field worker schedule update: receives days-remaining from WorkflowContainer,
  // computes a new plannedFinishDate from today and persists via handleUpdateSchedule.
  const handleFieldScheduleUpdate = useCallback((daysRemaining: number) => {
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
    });
  }, [workflowState.jobId, jobs, handleUpdateSchedule]);

  const handleUpdateEstimatorIntake = useCallback((intake: EstimatorIntake) => {
    
    // Save to Supabase (or localStorage fallback)
    dataService.saveEstimatorIntake(intake).catch(err => {
      console.error('Failed to save intake:', err);
    });

    // Also keep localStorage as a local cache for offline support
    localStorage.setItem(`estimator_intake_${intake.jobId}`, JSON.stringify(intake));
    
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
    setJobs(prevJobs => prevJobs.map(job => 
      job.id === jobId ? { 
        ...job, 
        fieldForecast: {
          ...forecast,
          updatedAt: new Date().toISOString(),
          updatedBy: currentUser?.name || 'Unknown'
        },
        forecastReviewStatus: ForecastReviewStatus.REVIEW_NEEDED,
        updatedAt: new Date().toISOString() 
      } : job
    ));
    setSelectedJob(prev => {
      if (prev && prev.id === jobId) {
        return {
          ...prev,
          fieldForecast: {
            ...forecast,
            updatedAt: new Date().toISOString(),
            updatedBy: currentUser?.name || 'Unknown'
          },
          forecastReviewStatus: ForecastReviewStatus.REVIEW_NEEDED,
          updatedAt: new Date().toISOString()
        };
      }
      return prev;
    });
    const forecastPayload = {
      ...forecast,
      updatedAt: new Date().toISOString(),
      updatedBy: currentUser?.name || 'Unknown'
    };
    dataService.updateJob(jobId, {
      fieldForecast: forecastPayload,
      forecastReviewStatus: ForecastReviewStatus.REVIEW_NEEDED
    }).catch(err =>
      console.error('[handleUpdateFieldForecast] Supabase write failed:', err)
    );
  }, [currentUser?.name]);

  const onAcceptOption = useCallback((optionId: string, addOns: string[]) => {
    if (selectedJob) {
      handleAcceptEstimateOption(selectedJob.id, optionId, addOns);
    }
  }, [selectedJob, handleAcceptEstimateOption]);

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
    const { generateContractPDF } = await import('./utils/contractPdf');
    const { generateDepositInvoice } = await import('./utils/depositInvoice');
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
  const [calculatorSourceJobId, setCalculatorSourceJobId] = useState<string | null>(null);
  const [showCalculatorAcceptance, setShowCalculatorAcceptance] = useState(false);
  const [calculatorAcceptanceJob, setCalculatorAcceptanceJob] = useState<Job | null>(null);

  /** Open the calculator fresh (New Estimate from office) */
  const handleOpenNewEstimate = useCallback(() => {
    setCalculatorInitialDimensions(undefined);
    setCalculatorInitialClientInfo(undefined);
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
    // Try loading from Supabase first (cross-device), then localStorage
    const intake = await dataService.loadEstimatorIntake(job.id);
    if (intake?.measureSheet) {
      const dims = measureSheetToCalculatorDimensions(intake.measureSheet);
      setCalculatorInitialDimensions(dims);
    } else {
      // Sync fallback for local-only data
      const localSheet = loadEstimatorIntake(job.id);
      if (localSheet) {
        setCalculatorInitialDimensions(measureSheetToCalculatorDimensions(localSheet));
      } else {
        setCalculatorInitialDimensions(undefined);
      }
    }
    setCalculatorInitialClientInfo(jobToCalculatorClientInfo(job));
    setCalculatorSourceJobId(job.id);
    setSelectedJob(job);
    navigateTo('estimator-calculator');
  }, []);

  /** Called when the customer/office accepts a quote in the calculator */
  const handleEstimateAccepted = useCallback((data: {
    clientName: string;
    clientAddress: string;
    estimateNumber: number;
    selections: any;
    dimensions: any;
    pricingSummary: any;
    activePackage: any;
  }) => {
    const now = new Date().toISOString();
    const totalAmount = Math.round(data.pricingSummary.finalTotal);
    const estimateAmount = Math.round(data.pricingSummary.subTotal);

    // Build the accepted summary
    const acceptedBuildSummary = {
      optionName: data.activePackage
        ? `${data.activePackage.size} ${data.activePackage.level} Package`
        : `Custom Estimate #${data.estimateNumber}`,
      basePrice: estimateAmount,
      addOns: data.pricingSummary.impacts
        .filter((imp: any) => Math.round(imp.value) !== 0)
        .map((imp: any) => ({ name: imp.label, price: Math.round(imp.value) })) as { name: string; price: number }[],
      totalPrice: totalAmount,
      acceptedDate: now,
      scopeSummary: data.pricingSummary.impacts
        .filter((imp: any) => Math.round(imp.value) !== 0)
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
        const jobForModal = { ...updatedJob, totalAmount, estimateAmount, acceptedBuildSummary, calculatorSelections: data.selections, calculatorDimensions: data.dimensions, pipelineStage: PipelineStage.EST_COMPLETED, clientName: data.clientName, projectAddress: data.clientAddress };
        setCalculatorAcceptanceJob(jobForModal);
        setSelectedJob(jobForModal);
      }
      setShowCalculatorAcceptance(true);
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
      setCalculatorAcceptanceJob(newJob);
      setShowCalculatorAcceptance(true);
    }
  }, [calculatorSourceJobId, handleUpdateJob, jobs]);

  /** Called when user clicks "Save Estimate, Send Quote" - saves data and emails portal link */
  const handleEstimateSaved = useCallback((data: {
    clientName: string;
    clientAddress: string;
    estimateNumber: number;
    selections: any;
    dimensions: any;
    pricingSummary: any;
    activePackage: any;
  }) => {
    const now = new Date().toISOString();
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
      acceptedDate: now,
      scopeSummary: data.pricingSummary.impacts
        .filter((imp: any) => Math.round(imp.value) !== 0)
        .map((imp: any) => imp.label)
        .join(', ')
    };

    let targetJobId = calculatorSourceJobId;
    let portalToken = '';
    let createdNewJob: Job | null = null;

    if (targetJobId) {
      // Update existing job to EST_SENT
      const existingJob = jobs.find(j => j.id === targetJobId);
      portalToken = existingJob?.customerPortalToken || crypto.randomUUID();
      handleUpdateJob(targetJobId, {
        clientName: data.clientName,
        projectAddress: data.clientAddress,
        totalAmount,
        estimateAmount,
        acceptedBuildSummary,
        calculatorSelections: data.selections,
        calculatorDimensions: data.dimensions,
        pipelineStage: PipelineStage.EST_SENT,
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
          currentTouch: 0,
          completedTouches: [],
          status: 'active',
          sentMessages: [],
        },
        updatedAt: now,
      });
    } else {
      // Create new job at EST_SENT
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
          currentTouch: 0,
          completedTouches: [],
          status: 'active',
          sentMessages: [],
        },
      };
      setJobs(prev => [newJob, ...prev]);
      dataService.createJob(newJob).catch(err => console.error('Failed to persist estimate job:', err));
      targetJobId = newJobId;
      createdNewJob = newJob;
    }

    // Open email to send the portal link to the client
    const portalUrl = `${window.location.origin}?portal=${portalToken}`;
    const clientEmail = jobs.find(j => j.id === targetJobId)?.clientEmail || '';
    const emailSubject = encodeURIComponent('Your Luxury Decking Estimate');
    const emailBody = encodeURIComponent(
      `Hi ${data.clientName},\n\nThank you for your interest in Luxury Decking. Your custom estimate is ready to view.\n\nClick the link below to see your personalized estimate:\n${portalUrl}\n\nIf you have any questions, feel free to reply to this email or call us at 613-707-3060.\n\nBest regards,\nThe Luxury Decking Team`
    );
    // Use hidden anchor to open email without blank tab
    const mailLink = document.createElement('a');
    mailLink.href = `mailto:${clientEmail}?subject=${emailSubject}&body=${emailBody}`;
    mailLink.click();

    // Navigate to estimate detail — use createdNewJob for fresh jobs (jobs state is stale for new records)
    const updatedJob = createdNewJob ?? jobs.find(j => j.id === targetJobId);
    if (updatedJob) {
      setSelectedJob({ ...updatedJob, totalAmount, estimateAmount, acceptedBuildSummary, pipelineStage: PipelineStage.EST_SENT });
    }
    navigateTo('estimate-detail', targetJobId);
  }, [calculatorSourceJobId, handleUpdateJob, jobs]);

  useEffect(() => {
    if (selectedJob && !selectedJob.estimatorIntake) {
      dataService.loadEstimatorIntake(selectedJob.id).then(intake => {
        if (intake) {
          setSelectedJob(prev => prev ? { ...prev, estimatorIntake: intake } : prev);
        }
      });
    }
  }, [selectedJob?.id]);

  if (view === 'login') {
    return <LoginView onLogin={handleLogin} />;
  }

  // Auth guard: unauthenticated access to any non-public view redirects to login
  // customer-portal and estimate-portal are publicly accessible via token
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
          initialDimensions={calculatorInitialDimensions}
          initialClientInfo={calculatorInitialClientInfo}
          onEstimateAccepted={handleEstimateAccepted}
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
              // Job is now at JOB_SOLD, navigate to the job detail page
              navigateTo('office-job-detail', selectedJob?.id);
            }}
          />
        )}
      </>
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
             // Legacy lifecycle stages (only if NOT at a job stage)
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
                    onClick={() => window.location.href = window.location.origin}
                    className="px-6 py-3 bg-slate-900 text-white rounded-xl font-bold shadow-lg shadow-slate-900/20"
                  >
                    Go to Homepage
                  </button>
                )}
                
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest pt-4">
                  Luxury Decking Field Pro
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

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
              <p className="font-bold text-sm">Storage Almost Full</p>
              <p className="text-xs opacity-90">Local storage is reaching its limit. Some data may not be saved. We've automatically pruned old data, but you may want to clear your browser cache or old jobs.</p>
            </div>
            <button 
              onClick={() => navigateTo('user-management')}
              className="px-3 py-1.5 bg-amber-600 text-white text-xs font-bold rounded-lg hover:bg-amber-700 transition-colors"
            >
              Manage Storage
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
        {(view === 'office-pipeline' || view === 'customers') && currentUser && (
          <UnifiedPipelineView 
            jobs={jobs}
            onSelectJob={handleSelectJob}
            onNewJob={(stage) => { setNewJobInitialStage(stage); navigateTo('office-new-job'); }}
            onOpenEstimator={handleOpenNewEstimate}
            onUpdatePipelineStage={handleUpdatePipelineStage}
          />
        )}
        {view === 'office-new-job' && currentUser && (
          <NewJobIntakeView 
            onSave={handleCreateJob}
            onCancel={() => navigateTo(currentUser?.role === Role.ESTIMATOR ? 'estimator-dashboard' : 'office-pipeline')}
            initialStage={newJobInitialStage}
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
          />
        )}
        {view === 'estimate-detail' && selectedJob && currentUser && (
          <EstimateDetailView
            job={selectedJob}
            onBack={() => navigateTo('office-pipeline')}
            onUpdateJob={handleUpdateJob}
            onUpdatePipelineStage={handleUpdatePipelineStage}
            onOpenEstimator={(job) => {
              setSelectedJob(job);
              handleOpenEstimateForJob(job);
            }}
            onPreviewPortal={(job) => {
              setSelectedJob(job);
              navigateTo('customer-portal', selectedJob?.customerPortalToken || selectedJob?.id);
            }}
            onDeleteJob={handleDeleteJob}
            onJobAccepted={() => navigateTo('office-job-detail', selectedJob?.id)}
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
        </ErrorBoundary>
      </main>
    </div>
  );
};

export default App;
