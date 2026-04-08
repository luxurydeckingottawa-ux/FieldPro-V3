import React, { useState, useEffect, useCallback } from 'react';
import { UserRole, AppState, PageState, User, Job, Role, JobStatus, OfficeReviewStatus, ForecastReviewStatus, ChatSession, ChatMessage, CustomerLifecycle, PipelineStage, PortalEngagement, DepositStatus, SoldWorkflowStatus, EstimatorIntake } from './types';
import { PAGE_CONFIGS, PAGE_TITLES, INITIAL_INVOICE as EMPTY_INVOICE, createDefaultOfficeChecklists, createDefaultBuildDetails, DEFAULT_AUTOMATIONS, PIPELINE_STAGES } from './constants';
import LoginView from './views/LoginView';
import JobsListView from './views/JobsListView';
import JobDetailView from './views/JobDetailView';
import OfficeDashboardView from './views/OfficeDashboardView';
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
import { EstimatorCalendar } from './components/EstimatorCalendar';
import ChatView from './components/ChatView';
import UserManagementView from './views/UserManagementView';
import { LogOut, User as UserIcon, LayoutDashboard, BookOpen, Calendar, Kanban, Sun, Moon, MessageSquare, Users, AlertCircle, ChevronLeft, Settings, Calculator } from 'lucide-react';
import UnifiedPipelineView from './views/UnifiedPipelineView';

import { geminiService } from './services/geminiService';
import EstimatorCalculatorView from './estimator/EstimatorCalculatorView';
import { measureSheetToCalculatorDimensions, jobToCalculatorClientInfo, loadEstimatorIntake } from './estimator/dataBridge';
import { dataService } from './services/dataService';

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
const OFFICE_EMAIL = 'luxurydeckingteam@gmail.com';

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
  const [view, setView] = useState<'login' | 'jobs' | 'detail' | 'workflow' | 'office-dashboard' | 'resources' | 'scheduling' | 'office-pipeline' | 'office-job-detail' | 'office-new-job' | 'chat' | 'customer-portal' | 'customers' | 'estimate-portal' | 'estimator-dashboard' | 'estimator-workflow' | 'estimator-calendar' | 'estimator-calculator' | 'user-management'>(() => {
    const params = new URLSearchParams(window.location.search);
    const portalToken = params.get('portal');
    if (portalToken) {
      return 'customer-portal'; 
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
      customerPortalToken: job.customerPortalToken || `portal-${job.id.replace(/[^a-z0-9]/gi, '')}`
    }));
  });

  const [selectedJob, setSelectedJob] = useState<Job | null>(() => {
    const params = new URLSearchParams(window.location.search);
    const portalToken = params.get('portal');
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
        customerPortalToken: job.customerPortalToken || `portal-${job.id.replace(/[^a-z0-9]/gi, '')}`
      }));
      
      const foundJob = migratedJobs.find(j => j.customerPortalToken === portalToken);
      return foundJob || null;
    }
    return null;
  });

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

  // Sync URL with portal token for refreshes
  useEffect(() => {
    if (view === 'customer-portal' && selectedJob) {
      const params = new URLSearchParams(window.location.search);
      if (params.get('portal') !== selectedJob.customerPortalToken) {
        params.set('portal', selectedJob.customerPortalToken || '');
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
        const automation = DEFAULT_AUTOMATIONS.find(a => a.stageId === updates.pipelineStage && a.enabled);
        if (automation) {
          const messageText = automation.messageTemplate
            .replace('{clientName}', jobToUpdate.clientName)
            .replace('{jobNumber}', jobToUpdate.jobNumber);
          
          // Simulate sending automated message
          const sessionId = `session-${jobToUpdate.id}`;
          setTimeout(() => {
            handleSendMessage(sessionId, messageText);
            console.log(`Automated SMS sent for job ${jobToUpdate.jobNumber}: ${messageText}`);
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
  }, [handleSendMessage]);

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

  const handleLogin = useCallback((user: User) => {
    setCurrentUser(user);
    if (user.role === Role.ADMIN) {
      setView('office-dashboard');
    } else if (user.role === Role.ESTIMATOR) {
      setView('estimator-dashboard');
    } else {
      setView('jobs');
    }
  }, []);

  const handleLogout = useCallback(() => {
    dataService.signOut();
    setCurrentUser(null);
    setView('login');
    setSelectedJob(null);
  }, []);

  const handleSelectJob = useCallback((job: Job) => {
    console.log('handleSelectJob called with job:', job?.id, job?.clientName);
    setSelectedJob(job);
    (window as any).selectedJobId = job?.id;
    if (!currentUser) {
      console.warn('No current user found during job selection');
      return;
    }
    if (currentUser.role === Role.ADMIN) {
      setView('office-job-detail');
    } else if (currentUser.role === Role.ESTIMATOR) {
      console.log('Navigating to estimator-workflow for job:', job.id);
      setView('estimator-workflow');
    } else {
      setView('detail');
    }
  }, [currentUser]);

  const handleUpdatePipelineStage = useCallback((jobId: string, newStage: PipelineStage) => {
    setJobs(prevJobs => prevJobs.map(job => {
      if (job.id === jobId) {
        let status = job.status;
        if (newStage === PipelineStage.IN_FIELD && status === JobStatus.SCHEDULED) {
          status = JobStatus.IN_PROGRESS;
        }
        return { ...job, pipelineStage: newStage, status, updatedAt: new Date().toISOString() };
      }
      return job;
    }));
    setSelectedJob(prev => {
      if (prev && prev.id === jobId) {
        let status = prev.status;
        if (newStage === PipelineStage.IN_FIELD && status === JobStatus.SCHEDULED) {
          status = JobStatus.IN_PROGRESS;
        }
        return { ...prev, pipelineStage: newStage, status, updatedAt: new Date().toISOString() };
      }
      return prev;
    });
  }, []);

  const handleUpdateOfficeChecklist = useCallback((jobId: string, stage: PipelineStage, itemId: string, completed: boolean, isNA: boolean = false) => {
    setJobs(prevJobs => prevJobs.map(job => {
      if (job.id === jobId) {
        const checklists = job.officeChecklists || [];
        const updatedChecklists = checklists.map(cl => {
          if (cl.stage === stage) {
            return {
              ...cl,
              items: (cl.items || []).map(item => item.id === itemId ? { ...item, completed, isNA } : item)
            };
          }
          return cl;
        });

        // Auto-advance: check if ALL items in the current stage are completed or N/A
        const currentChecklist = updatedChecklists.find(cl => cl.stage === stage);
        const allComplete = currentChecklist?.items.every(item => item.completed || item.isNA) || false;
        
        let updatedJob = { ...job, officeChecklists: updatedChecklists, updatedAt: new Date().toISOString() };

        if (allComplete && job.pipelineStage === stage) {
          // Find the next stage in the pipeline
          const stageOrder = PIPELINE_STAGES.map(s => s.id);
          const currentIndex = stageOrder.indexOf(stage as PipelineStage);
          if (currentIndex >= 0 && currentIndex < stageOrder.length - 1) {
            const nextStage = stageOrder[currentIndex + 1];
            updatedJob = { ...updatedJob, pipelineStage: nextStage };
            console.log(`Auto-advanced job ${job.jobNumber} from ${stage} to ${nextStage}`);
          }
        }

        return updatedJob;
      }
      return job;
    }));

    setSelectedJob(prev => {
      if (prev && prev.id === jobId) {
        const checklists = prev.officeChecklists || [];
        const updatedChecklists = checklists.map(cl => {
          if (cl.stage === stage) {
            return {
              ...cl,
              items: (cl.items || []).map(item => item.id === itemId ? { ...item, completed, isNA } : item)
            };
          }
          return cl;
        });

        let updatedJob = { ...prev, officeChecklists: updatedChecklists, updatedAt: new Date().toISOString() };

        const currentChecklist = updatedChecklists.find(cl => cl.stage === stage);
        const allComplete = currentChecklist?.items.every(item => item.completed || item.isNA) || false;

        if (allComplete && prev.pipelineStage === stage) {
          const stageOrder = PIPELINE_STAGES.map(s => s.id);
          const currentIndex = stageOrder.indexOf(stage as PipelineStage);
          if (currentIndex >= 0 && currentIndex < stageOrder.length - 1) {
            updatedJob = { ...updatedJob, pipelineStage: stageOrder[currentIndex + 1] };
          }
        }

        return updatedJob;
      }
      return prev;
    });
  }, []);

  const handleAcceptEstimateOption = useCallback((jobId: string, optionId: string, selectedAddOns: string[]) => {
    const updateJob = (job: Job): Job => {
      if (job.id === jobId) {
        const selectedOption = job.estimateData?.options.find(o => o.id === optionId);
        const selectedAddOnObjects = job.estimateData?.addOns.filter(a => selectedAddOns.includes(a.id)) || [];
        const addOnsTotal = selectedAddOnObjects.reduce((sum, a) => sum + a.price, 0);
        const basePrice = selectedOption?.price || 0;
        const totalAmount = basePrice + addOnsTotal;

        return {
          ...job,
          acceptedOptionId: optionId,
          acceptedOptionName: selectedOption?.name || 'Selected Option',
          acceptedDate: new Date().toISOString(),
          selectedAddOnIds: selectedAddOns,
          estimateAmount: totalAmount,
          totalAmount: totalAmount,
          lifecycleStage: CustomerLifecycle.WON_SOLD,
          pipelineStage: PipelineStage.JOB_SOLD,
          status: JobStatus.SCHEDULED,
          depositStatus: DepositStatus.NOT_SENT,
          soldWorkflowStatus: SoldWorkflowStatus.ACCEPTED,
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

        return { ...job, portalEngagement: updated };
      }
      return job;
    }));
  }, []);

  const handleCreateJob = useCallback((newJob: Job) => {
    setJobs(prev => [newJob, ...prev]);
    setView('office-pipeline');
  }, []);

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
          date: job.scheduledDate,
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
    setView('workflow');
  }, [currentUser?.name, currentUser?.role, workflowState.jobId]);

  const uploadFileToCloudinary = async (file: string, filename: string): Promise<string> => {
    try {
      const response = await fetch('/.netlify/functions/upload', {
        method: 'POST',
        body: JSON.stringify({ file, filename, folder: `luxury_decking/${workflowState.jobInfo.jobName}` }),
      });
      
      if (response.ok) {
        const data = await response.json();
        return data.url;
      }
      
      // Fallback for demo/dev environment if function is missing
      console.warn('Upload function not found or failed, using mock URL for demo');
      return `https://res.cloudinary.com/demo/image/upload/v1234567890/mock_${filename}.png`;
    } catch (error) {
      console.error('Upload error:', error);
      // Fallback for demo/dev environment
      return `https://res.cloudinary.com/demo/image/upload/v1234567890/mock_${filename}.png`;
    }
  };

  const handleFullSubmission = async () => {
    console.log("Starting full submission for job:", workflowState.jobId);
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
            const url = await uploadFileToCloudinary(photo.url, `${photo.key}_${Date.now()}`);
            photo.cloudinaryUrl = url;
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
      const verifiedBuildPassportUrl = await uploadFileToCloudinary(closeoutDataUri, `Passport_${workflowState.jobInfo.jobName}_${Date.now()}`);

      let subcontractorInvoiceUrl = '';
      if (workflowState.userRole === UserRole.SUBCONTRACTOR) {
        setUploadProgress('Generating Subcontractor Invoice Package...');
        const invoiceDataUri = await generateInvoicePDF(updatedStateWithPhotos);
        subcontractorInvoiceUrl = await uploadFileToCloudinary(invoiceDataUri, `Invoice_${workflowState.jobInfo.jobName}_${Date.now()}`);
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
    window.location.href = `mailto:${OFFICE_EMAIL}?subject=${subject}&body=${encodeURIComponent(body)}`;
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
  }, []);

  const handleUpdateEstimatorIntake = useCallback((intake: EstimatorIntake) => {
    console.log('Saving estimator intake:', intake);
    
    // Save to Supabase (or localStorage fallback)
    dataService.saveEstimatorIntake(intake).catch(err => {
      console.error('Failed to save intake:', err);
    });

    // Also keep localStorage as a local cache for offline support
    localStorage.setItem(`estimator_intake_${intake.jobId}`, JSON.stringify(intake));
    
    // Update the job in state
    setJobs(prev => prev.map(job => 
      job.id === intake.jobId ? { ...job, updatedAt: new Date().toISOString() } : job
    ));
    
    console.log('Intake data saved successfully!');
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

  const handleClosePortal = useCallback(() => {
    if (selectedJob) {
      setView('office-job-detail');
    } else {
      setView('office-dashboard');
    }
  }, [selectedJob]);

  // --- Estimator Calculator Integration ---
  const [calculatorInitialDimensions, setCalculatorInitialDimensions] = useState<any>(undefined);
  const [calculatorInitialClientInfo, setCalculatorInitialClientInfo] = useState<{ name: string; address: string } | undefined>(undefined);
  const [calculatorSourceJobId, setCalculatorSourceJobId] = useState<string | null>(null);

  /** Open the calculator fresh (New Estimate from office) */
  const handleOpenNewEstimate = useCallback(() => {
    setCalculatorInitialDimensions(undefined);
    setCalculatorInitialClientInfo(undefined);
    setCalculatorSourceJobId(null);
    setView('estimator-calculator');
  }, []);

  /** Open the calculator pre-filled from a field estimator's intake data */
  const handlePushToEstimating = useCallback((intake: EstimatorIntake) => {
    const dims = measureSheetToCalculatorDimensions(intake.measureSheet);
    setCalculatorInitialDimensions(dims);
    // Find the job to get client info
    const job = jobs.find(j => j.id === intake.jobId);
    if (job) {
      setCalculatorInitialClientInfo(jobToCalculatorClientInfo(job));
      setCalculatorSourceJobId(job.id);
    }
    setView('estimator-calculator');
  }, [jobs]);

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
    setView('estimator-calculator');
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
      addOns: [] as { name: string; price: number }[],
      totalPrice: totalAmount,
      acceptedDate: now,
      scopeSummary: data.pricingSummary.impacts
        .filter((imp: any) => Math.round(imp.value) !== 0)
        .map((imp: any) => imp.label)
        .join(', ')
    };

    if (calculatorSourceJobId) {
      // Update existing job
      handleUpdateJob(calculatorSourceJobId, {
        clientName: data.clientName,
        projectAddress: data.clientAddress,
        totalAmount,
        estimateAmount,
        acceptedBuildSummary,
        acceptedDate: now,
        pipelineStage: PipelineStage.JOB_SOLD,
        lifecycleStage: CustomerLifecycle.WON_SOLD,
        status: JobStatus.SCHEDULED,
        depositStatus: DepositStatus.NOT_SENT,
        soldWorkflowStatus: SoldWorkflowStatus.ACCEPTED,
        estimateStatus: 'accepted' as const,
        estimateSentDate: now,
      });
    } else {
      // Create new job from a fresh estimate
      const newJobId = `j-est-${Date.now()}`;
      const newJob: Job = {
        id: newJobId,
        jobNumber: `EST-${new Date().getFullYear()}-${String(data.estimateNumber).padStart(3, '0')}`,
        clientName: data.clientName,
        clientEmail: '',
        clientPhone: '',
        customerPortalToken: `portal-${newJobId}`,
        projectAddress: data.clientAddress,
        projectType: data.activePackage 
          ? `${data.activePackage.level} Package Deck` 
          : 'Custom Deck Build',
        assignedUsers: [],
        assignedCrewOrSubcontractor: '',
        scheduledDate: '',
        currentStage: 0,
        status: JobStatus.SCHEDULED,
        pipelineStage: PipelineStage.JOB_SOLD,
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
        acceptedDate: now,
        lifecycleStage: CustomerLifecycle.WON_SOLD,
        depositStatus: DepositStatus.NOT_SENT,
        soldWorkflowStatus: SoldWorkflowStatus.ACCEPTED,
        estimateStatus: 'accepted' as const,
        estimateSentDate: now,
        portalStatus: 'ready',
      };
      handleCreateJob(newJob);
    }

    // Navigate to the pipeline to see the new/updated job in Job Sold
    setView('office-pipeline');
  }, [calculatorSourceJobId, handleUpdateJob, handleCreateJob]);

  if (view === 'login') {
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
        onExit={() => setView('detail')}
      />
    );
  }

  if (view === 'estimator-calculator') {
    return (
      <EstimatorCalculatorView
        initialDimensions={calculatorInitialDimensions}
        initialClientInfo={calculatorInitialClientInfo}
        onEstimateAccepted={handleEstimateAccepted}
        onExit={() => setView(currentUser?.role === Role.ADMIN ? 'office-pipeline' : 'estimator-dashboard')}
      />
    );
  }

  if (view === 'customer-portal') {
      return (
        <div className="min-h-screen bg-slate-50">
          {selectedJob ? (
            (selectedJob.lifecycleStage === CustomerLifecycle.ESTIMATE_SENT || 
             selectedJob.lifecycleStage === CustomerLifecycle.FOLLOW_UP_NEEDED ||
             (selectedJob.lifecycleStage === CustomerLifecycle.WON_SOLD && selectedJob.pipelineStage === PipelineStage.JOB_SOLD) ||
             !selectedJob.pipelineStage) ? (
              <EstimatePortalView 
                job={selectedJob} 
                onAcceptOption={onAcceptOption}
                onTrackEngagement={onTrackEngagement}
                onClose={(currentUser?.role === Role.ADMIN || currentUser?.role === Role.MANAGER) ? handleClosePortal : undefined}
              />
            ) : (
              <CustomerPortalView 
                job={selectedJob} 
                allJobs={jobs}
                chatSessions={chatSessions}
                onSendMessage={(sessionId, text) => handleSendMessage(sessionId, text, true)}
                onBack={(currentUser?.role === Role.ADMIN || currentUser?.role === Role.MANAGER) ? handleClosePortal : undefined}
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
                    onClick={() => setView('office-dashboard')}
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
      <nav className="bg-[var(--bg-primary)]/80 border-b border-[var(--border-color)] sticky top-0 z-50 px-6 h-20 backdrop-blur-2xl shadow-lg dark:shadow-[0_8px_32px_rgba(0,0,0,0.5)]">
        <div className="max-w-7xl mx-auto h-full flex items-center justify-between">
          <div className="flex items-center group cursor-pointer" onClick={() => setView(currentUser?.role === Role.ADMIN ? 'office-dashboard' : 'jobs')}>
            <div className="h-10 w-10 bg-emerald-600 rounded-xl flex items-center justify-center mr-4 shadow-[0_0_20px_rgba(16,185,129,0.2)] group-hover:scale-110 transition-transform duration-500">
              <span className="text-black font-black text-sm tracking-tighter">LD</span>
            </div>
            <div className="hidden sm:block">
              <p className="font-label mb-1.5 opacity-70">Luxury Decking</p>
              <p className="text-base font-display italic">Field Pro</p>
            </div>
          </div>

          <div className="flex items-center space-x-2 md:space-x-4 h-full">
            <button 
              onClick={() => setTheme(prev => prev === 'dark' ? 'light' : 'dark')}
              className="p-2.5 text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--text-primary)]/5 rounded-xl transition-all active:scale-90 border border-transparent hover:border-[var(--border-color)] h-10 w-10 flex items-center justify-center"
              title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
            >
              {theme === 'dark' ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
            </button>
            {currentUser && (
              <button 
                onClick={() => setView('resources')}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl font-label transition-all h-10 ${
                  view === 'resources' ? 'bg-[var(--text-primary)]/10 text-emerald-600 dark:text-emerald-400 border border-[var(--border-color)] shadow-xl' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--text-primary)]/5'
                }`}
              >
                <BookOpen className="w-3.5 h-3.5" />
                <span className="hidden lg:inline">Resources</span>
              </button>
            )}
            {currentUser?.role === Role.ESTIMATOR && (
              <button 
                onClick={() => setView('estimator-dashboard')}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl font-label transition-all h-10 ${
                  view === 'estimator-dashboard' || view === 'estimator-workflow' ? 'bg-[var(--text-primary)]/10 text-emerald-600 dark:text-emerald-400 border border-[var(--border-color)] shadow-xl' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--text-primary)]/5'
                }`}
              >
                <LayoutDashboard className="w-3.5 h-3.5" />
                <span className="hidden lg:inline">Dashboard</span>
              </button>
            )}
            {currentUser?.role === Role.ADMIN && (
              <button 
                onClick={() => setView('user-management')}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl font-label transition-all h-10 ${
                  view === 'user-management' ? 'bg-[var(--text-primary)]/10 text-emerald-600 dark:text-emerald-400 border border-[var(--border-color)] shadow-xl' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--text-primary)]/5'
                }`}
              >
                <Settings className="w-3.5 h-3.5" />
                <span className="hidden lg:inline">Users</span>
              </button>
            )}
            {(currentUser?.role === Role.ADMIN) && (
              <div className="flex bg-[var(--text-primary)]/5 p-1 rounded-[1.25rem] border border-[var(--border-color)] shadow-inner h-12 items-center">
                <button 
                  onClick={() => setView('office-pipeline')}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl font-label transition-all h-10 ${
                    view === 'office-pipeline' || view === 'office-job-detail' || view === 'customers' ? 'bg-[var(--bg-primary)]/80 dark:bg-white/10 text-emerald-600 dark:text-emerald-400 shadow-lg border border-[var(--border-color)]' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--text-primary)]/5'
                  }`}
                >
                  <Kanban className="w-3.5 h-3.5" />
                  <span className="hidden md:inline">Pipeline</span>
                </button>
                <button 
                  onClick={() => setView('office-dashboard')}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl font-label transition-all h-10 ${
                    view === 'office-dashboard' ? 'bg-[var(--bg-primary)]/80 dark:bg-white/10 text-emerald-600 dark:text-emerald-400 shadow-lg border border-[var(--border-color)]' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--text-primary)]/5'
                  }`}
                >
                  <LayoutDashboard className="w-3.5 h-3.5" />
                  <span className="hidden md:inline">Dashboard</span>
                </button>
                <button 
                  onClick={() => setView('scheduling')}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl font-label transition-all h-10 ${
                    view === 'scheduling' ? 'bg-[var(--bg-primary)]/80 dark:bg-white/10 text-emerald-600 dark:text-emerald-400 shadow-lg border border-[var(--border-color)]' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--text-primary)]/5'
                  }`}
                >
                  <Calendar className="w-3.5 h-3.5" />
                  <span className="hidden md:inline">Schedule</span>
                </button>
                <button 
                  onClick={() => setView('chat')}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl font-label transition-all h-10 ${
                    view === 'chat' ? 'bg-[var(--bg-primary)]/80 dark:bg-white/10 text-emerald-600 dark:text-emerald-400 shadow-lg border border-[var(--border-color)]' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--text-primary)]/5'
                  }`}
                >
                  <MessageSquare className="w-3.5 h-3.5" />
                  <span className="hidden md:inline">Chat</span>
                </button>
                <button 
                  onClick={handleOpenNewEstimate}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl font-label transition-all h-10 ${
                    view === 'estimator-calculator' ? 'bg-[var(--bg-primary)]/80 dark:bg-white/10 text-emerald-600 dark:text-emerald-400 shadow-lg border border-[var(--border-color)]' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--text-primary)]/5'
                  }`}
                >
                  <Calculator className="w-3.5 h-3.5" />
                  <span className="hidden md:inline">Estimator</span>
                </button>
              </div>
            )}
            <div className="flex items-center bg-[var(--text-primary)]/5 px-4 h-12 rounded-xl border border-[var(--border-color)] shadow-inner group hover:border-[var(--text-primary)]/20 transition-all">
              <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center mr-3 border border-emerald-500/20 group-hover:scale-105 transition-transform">
                <UserIcon className="h-4 w-4 text-emerald-500" />
              </div>
              <div className="text-left hidden xs:block">
                <p className="font-label opacity-60 leading-none mb-1">{currentUser?.role}</p>
                <p className="text-xs font-bold text-[var(--text-primary)] tracking-tight">{currentUser?.name}</p>
              </div>
            </div>
            <button 
              onClick={handleLogout}
              className="p-2.5 text-[var(--text-secondary)] hover:text-rose-500 hover:bg-rose-500/10 rounded-xl transition-all active:scale-90 border border-transparent hover:border-rose-500/20 h-10 w-10 flex items-center justify-center"
              title="Logout"
            >
              <LogOut className="h-5 w-5" />
            </button>
          </div>
        </div>
      </nav>

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
              onClick={() => setView('user-management')}
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
            onViewResources={() => setView('resources')}
          />
        )}
        {(view === 'office-pipeline' || view === 'customers') && currentUser && (
          <UnifiedPipelineView 
            jobs={jobs}
            onSelectJob={handleSelectJob}
            onNewJob={() => setView('office-new-job')}
            onOpenEstimator={handleOpenNewEstimate}
          />
        )}
        {view === 'office-new-job' && currentUser && (
          <NewJobIntakeView 
            onSave={handleCreateJob}
            onCancel={() => setView('office-pipeline')}
          />
        )}
        {view === 'office-job-detail' && selectedJob && currentUser && (
          <OfficeJobDetailView 
            job={selectedJob}
            allJobs={jobs}
            onBack={() => setView('office-pipeline')}
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
              setView('customer-portal');
            }}
          />
        )}
        {view === 'office-dashboard' && currentUser && (
          <OfficeDashboardView 
            jobs={jobs}
            onSelectJob={handleSelectJob} 
            onViewResources={() => setView('resources')}
            onNewJob={() => setView('office-new-job')}
          />
        )}
        {view === 'detail' && selectedJob && currentUser && (
          <JobDetailView 
            job={selectedJob} 
            user={currentUser}
            allJobs={jobs}
            onBack={() => setView(currentUser.role === Role.ADMIN ? 'office-dashboard' : 'jobs')}
            onOpenWorkflow={handleOpenWorkflow}
            onUpdateOfficeReviewStatus={handleUpdateOfficeReviewStatus}
            onUpdateSchedule={handleUpdateSchedule}
            onUpdateFieldForecast={handleUpdateFieldForecast}
            onSendMessage={handleSendMessage}
          />
        )}
        {view === 'user-management' && currentUser?.role === Role.ADMIN && (
          <UserManagementView onBack={() => setView('office-dashboard')} />
        )}
        {view === 'resources' && currentUser && (
          <FieldResourcesView 
            user={currentUser} 
            onBack={() => setView(currentUser.role === Role.ADMIN ? 'office-dashboard' : 'jobs')}
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
            onOpenCalendar={() => setView('estimator-calendar')}
          />
        )}
        {view === 'estimator-calendar' && currentUser && (
          <div className="flex flex-col h-full overflow-hidden">
            <div className="bg-[var(--bg-primary)] p-2 border-b border-[var(--border-color)]">
              <button 
                onClick={() => setView('estimator-dashboard')}
                className="flex items-center gap-2 px-4 py-2 text-sm font-bold text-emerald-600 hover:bg-emerald-600/5 rounded-xl transition-all"
              >
                <ChevronLeft className="w-4 h-4" />
                Back to Dashboard
              </button>
            </div>
            <div className="flex-1 overflow-hidden">
              <EstimatorCalendar 
                appointments={[]}
                installSchedule={[]}
              />
            </div>
          </div>
        )}
        {view === 'estimator-workflow' && selectedJob && currentUser && (
          <EstimatorWorkflowView 
            key={selectedJob.id}
            job={selectedJob}
            onBack={() => setView('estimator-dashboard')}
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
