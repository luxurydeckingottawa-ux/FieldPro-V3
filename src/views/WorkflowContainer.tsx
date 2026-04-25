import React, { useState, useEffect } from 'react';
import { AppState, PageState, UserRole, ScheduleStatus } from '../types';
import { PAGE_TITLES, getActivePageIndices } from '../constants';
import ProgressBar from '../components/ProgressBar';
import ConnectivityStatus from '../components/ConnectivityStatus';
import JobInfoView from '../views/JobInfoView';
import ChecklistView from '../views/ChecklistView';
import FinalCompletionView from '../views/FinalCompletionView';
import InvoicingView from '../views/InvoicingView';
import ReviewView from '../views/ReviewView';
import { CheckCircle2, CloudUpload, Mail, ArrowLeft, MessageSquare } from 'lucide-react';
import { COMPANY } from '../config/company';

interface WorkflowContainerProps {
  state: AppState;
  setState: React.Dispatch<React.SetStateAction<AppState>>;
  isOnline: boolean;
  isUploading: boolean;
  uploadProgress: string;
  error?: string | null;
  onFullSubmission: () => Promise<void>;
  onExit: () => void;
  clientPhone?: string;
  onScheduleUpdate?: (daysRemaining: number, status: ScheduleStatus, note: string) => void;
}

const WorkflowContainer: React.FC<WorkflowContainerProps> = ({
  state,
  setState,
  isOnline,
  isUploading,
  uploadProgress,
  error,
  onFullSubmission,
  onExit,
  clientPhone,
  onScheduleUpdate,
}) => {
  // Daily schedule gate — force the tech back to JobInfoView (page 0) every
  // calendar day so they MUST mark Ahead/On Schedule/Behind before resuming
  // work. Without this, reopening on day 3 jumps straight to whatever step
  // they were on and the office never gets a fresh status update.
  useEffect(() => {
    const lastUpdate = state.fieldForecast?.updatedAt;
    const sameDay = lastUpdate
      ? new Date(lastUpdate).toDateString() === new Date().toDateString()
      : false;
    if (!sameDay && state.currentPage !== 0) {
      setState(prev => ({
        ...prev,
        currentPage: 0,
        // Clear forecast so the gate banner re-engages and they can't just
        // tap Next without re-confirming today's status.
        fieldForecast: undefined,
      }));
    }
    // Run once on mount — we don't want this re-firing mid-session.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Active page list — filters out checklist pages that don't apply to this
  // job type (e.g. Stairs & Railings QC is skipped on Deck-only jobs).
  // Then trim the tail based on user role: subcontractors see Invoicing (6)
  // then Review (7); employees skip Invoicing — page 6 falls through to
  // ReviewView and they never reach page 7.
  const activePages = getActivePageIndices(state.jobInfo.jobType).filter(p => {
    if (state.userRole === UserRole.SUBCONTRACTOR) return true;
    return p !== 7;
  });

  const handleNext = () => setState(prev => {
    const idx = activePages.indexOf(prev.currentPage);
    const nextPage = idx >= 0 && idx < activePages.length - 1
      ? activePages[idx + 1]
      : prev.currentPage + 1;
    return { ...prev, currentPage: nextPage };
  });
  const handleBack = () => setState(prev => {
    const idx = activePages.indexOf(prev.currentPage);
    const prevPage = idx > 0 ? activePages[idx - 1] : Math.max(0, prev.currentPage - 1);
    return { ...prev, currentPage: prevPage };
  });

  const updatePage = (pageIndex: number, updates: Partial<PageState>) => {
    setState(prev => ({
      ...prev,
      pages: {
        ...prev.pages,
        [pageIndex]: { ...prev.pages[pageIndex], ...updates }
      }
    }));
  };

  const renderPage = () => {
    if (error) {
      return (
        <div className="card-base max-w-2xl mx-auto mt-12 p-12 text-center border-red-500/20 bg-red-500/5">
          <div className="w-24 h-24 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-8 border border-red-500/20">
            <CheckCircle2 className="h-12 w-12 text-red-500 rotate-45" />
          </div>
          <h2 className="text-3xl font-black text-white mb-4 italic uppercase tracking-tight">Submission Failed</h2>
          <p className="text-[var(--text-secondary)] mb-12 leading-relaxed">{error}</p>
          <button 
            onClick={onFullSubmission}
            className="btn-primary w-full py-4 text-sm"
          >
            Try Again
          </button>
        </div>
      );
    }

    if (state.isJobSubmitted) {
      return (
        <div className="card-base max-w-2xl mx-auto mt-12 p-12 text-center">
          <div className="w-24 h-24 bg-[var(--brand-gold)]/10 rounded-full flex items-center justify-center mx-auto mb-8 border border-[var(--brand-gold)]/20">
            <CheckCircle2 className="h-12 w-12 text-[var(--brand-gold)]" />
          </div>
          <h2 className="text-4xl font-display mb-4">Submission Successful!</h2>
          <p className="font-label mb-10 leading-relaxed">
            The close-out package for <span className="text-[var(--text-primary)] font-bold">{state.jobInfo.jobName}</span> has been verified and submitted to the office.
          </p>
          
          <div className="grid grid-cols-1 gap-4 mb-10">
            {state.submissionLinks?.closeoutPdf && (
              <a 
                href={state.submissionLinks.closeoutPdf} 
                target="_blank" 
                rel="noreferrer"
                className="flex items-center justify-center p-6 bg-[var(--bg-primary)]/50 rounded-2xl border border-[var(--border-color)] hover:bg-[var(--bg-primary)] hover:border-[var(--brand-gold)]/50 transition-all group"
              >
                <CloudUpload className="h-5 w-5 mr-4 text-[var(--brand-gold)]" />
                <span className="font-label group-hover:text-[var(--text-primary)]">View Close-out PDF</span>
              </a>
            )}
            {state.submissionLinks?.invoicePdf && (
              <a 
                href={state.submissionLinks.invoicePdf} 
                target="_blank" 
                rel="noreferrer"
                className="flex items-center justify-center p-6 bg-[var(--bg-primary)]/50 rounded-2xl border border-[var(--border-color)] hover:bg-[var(--bg-primary)] hover:border-[var(--brand-gold)]/50 transition-all group"
              >
                <Mail className="h-5 w-5 mr-4 text-[var(--brand-gold)]" />
                <span className="font-label group-hover:text-[var(--text-primary)]">View Invoice PDF</span>
              </a>
            )}
          </div>

          <button 
            onClick={onExit}
            className="w-full py-5 bg-[var(--text-primary)] text-[var(--bg-primary)] rounded-[2rem] font-label text-xs hover:bg-[var(--brand-gold)] transition-all active:scale-95 shadow-xl"
          >
            Return to Job Details
          </button>
        </div>
      );
    }

    switch (state.currentPage) {
      case 0:
        return (
          <JobInfoView 
            info={state.jobInfo} 
            role={state.userRole}
            forecast={state.fieldForecast}
            onUpdate={(updates) => setState(prev => ({ ...prev, jobInfo: { ...prev.jobInfo, ...updates } }))}
            onForecastUpdate={(forecast) => setState(prev => ({ ...prev, fieldForecast: forecast }))}
            setRole={(userRole) => setState(prev => ({ ...prev, userRole }))}
            onNext={handleNext}
          />
        );
      case 1:
      case 2:
      case 3:
      case 4:
        return (
          <ChecklistView
            title={PAGE_TITLES[state.currentPage]}
            pageIndex={state.currentPage}
            state={state.pages[state.currentPage]}
            folderName={state.jobInfo.jobName}
            onUpdate={(updates) => updatePage(state.currentPage, updates)}
            onNext={handleNext}
            onBack={handleBack}
          />
        );
      case 5:
        return (
          <FinalCompletionView
            state={state.pages[5]}
            signature={state.customerSignature}
            folderName={state.jobInfo.jobName}
            onUpdate={(updates) => updatePage(5, updates)}
            onSignatureUpdate={(sig) => setState(prev => ({ ...prev, customerSignature: sig }))}
            onNext={handleNext}
            onBack={handleBack}
          />
        );
      case 6:
        if (state.userRole === UserRole.SUBCONTRACTOR) {
          return (
            <InvoicingView 
              data={state.invoicing}
              onUpdate={(updates) => setState(prev => ({ ...prev, invoicing: { ...prev.invoicing, ...updates } }))}
              onNext={handleNext}
              onBack={handleBack}
            />
          );
        }
        // Fallthrough to review if not subcontractor
        return (
          <ReviewView 
            state={state}
            onBack={handleBack}
            onSubmit={onFullSubmission}
            isUploading={isUploading}
            uploadProgress={uploadProgress}
          />
        );
      case 7:
        return (
          <ReviewView 
            state={state}
            onBack={handleBack}
            onSubmit={onFullSubmission}
            isUploading={isUploading}
            uploadProgress={uploadProgress}
          />
        );
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-[var(--bg-primary)] text-[var(--text-primary)] pb-20">
      <nav className="bg-[var(--bg-secondary)]/80 border-b border-[var(--border-color)] sticky top-0 z-30 px-4 py-4 backdrop-blur-xl">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <button
            onClick={onExit}
            className="p-2.5 hover:bg-[var(--bg-primary)]/50 rounded-xl transition-all text-[var(--text-secondary)] hover:text-[var(--text-primary)] border border-transparent hover:border-[var(--border-color)]"
            title="Exit Workflow"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div className="flex-1 px-8">
            <ProgressBar
              current={Math.max(0, activePages.indexOf(state.currentPage))}
              total={Math.max(1, activePages.length - 1)}
            />
          </div>
          <div className="flex items-center gap-2">
            {/* Message Client button — field workers only */}
            {(state.userRole === UserRole.FIELD_EMPLOYEE || state.userRole === UserRole.SUBCONTRACTOR) &&
              clientPhone && (
              <button
                onClick={() => {
                  const firstName = state.jobInfo.customerName?.split(' ')[0] || 'there';
                  const msg = `Hi ${firstName}, this is your ${COMPANY.name} crew. `;
                  window.location.href = `sms:${clientPhone}?body=${encodeURIComponent(msg)}`;
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-[9px] font-black uppercase tracking-widest text-[var(--text-secondary)] hover:text-white transition-all"
                title="Message client"
              >
                <MessageSquare size={12} /> Message Client
              </button>
            )}
            <ConnectivityStatus isOnline={isOnline} />
          </div>
        </div>
      </nav>

      <main className="max-w-4xl mx-auto px-4 py-10">
        {renderPage()}
      </main>

      {/* In-workflow floating Daily Schedule widget removed — schedule status
          is now captured upfront on JobInfoView (page 0) and the daily reset
          effect above forces a fresh capture every calendar day. Avoids
          duplication and prevents day-3 reopens from skipping the gate. */}

      {isUploading && (
        <div className="fixed inset-0 bg-[var(--bg-primary)]/80 backdrop-blur-xl z-50 flex items-center justify-center p-6">
          <div className="card-base p-12 max-w-sm w-full text-center">
            <div className="relative w-24 h-24 mx-auto mb-8">
              <div className="absolute inset-0 border-4 border-[var(--border-color)] rounded-full"></div>
              <div className="absolute inset-0 border-4 border-[var(--brand-gold)] rounded-full border-t-transparent animate-spin"></div>
              <CloudUpload className="absolute inset-0 m-auto h-10 w-10 text-[var(--brand-gold)]" />
            </div>
            <h3 className="text-2xl font-display mb-3">Submitting Report</h3>
            <p className="font-label mb-6">{uploadProgress}</p>
            <div className="w-full bg-[var(--bg-primary)]/50 rounded-full h-1.5 overflow-hidden">
              <div className="bg-[var(--brand-gold)] h-full animate-pulse w-full"></div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default WorkflowContainer;
