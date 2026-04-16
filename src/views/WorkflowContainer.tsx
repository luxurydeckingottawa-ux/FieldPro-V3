import React, { useState } from 'react';
import { AppState, PageState, UserRole, ScheduleStatus } from '../types';
import { PAGE_TITLES } from '../constants';
import ProgressBar from '../components/ProgressBar';
import ConnectivityStatus from '../components/ConnectivityStatus';
import JobInfoView from '../views/JobInfoView';
import ChecklistView from '../views/ChecklistView';
import FinalCompletionView from '../views/FinalCompletionView';
import InvoicingView from '../views/InvoicingView';
import ReviewView from '../views/ReviewView';
import { CheckCircle2, CloudUpload, Mail, ArrowLeft, MessageSquare, Calendar } from 'lucide-react';
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
  const [showScheduleUpdate, setShowScheduleUpdate] = useState(false);
  const [daysRemaining, setDaysRemaining] = useState(3);
  const [scheduleStatus, setScheduleStatus] = useState<ScheduleStatus>(ScheduleStatus.ON_SCHEDULE);
  const [scheduleNote, setScheduleNote] = useState('');

  const handleNext = () => setState(prev => ({ ...prev, currentPage: prev.currentPage + 1 }));
  const handleBack = () => setState(prev => ({ ...prev, currentPage: Math.max(0, prev.currentPage - 1) }));

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
            <ProgressBar current={state.currentPage} total={state.userRole === UserRole.SUBCONTRACTOR ? 7 : 6} />
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

      {/* Floating schedule update widget — field workers only */}
      {(state.userRole === UserRole.FIELD_EMPLOYEE || state.userRole === UserRole.SUBCONTRACTOR) && onScheduleUpdate && (
        <div className="fixed bottom-20 right-4 z-40">
          <button
            onClick={() => setShowScheduleUpdate(prev => !prev)}
            className="w-12 h-12 rounded-full bg-[var(--brand-gold)] shadow-xl flex items-center justify-center hover:brightness-110 transition-all active:scale-95"
            title="Update finish estimate"
          >
            <Calendar size={18} className="text-black" />
          </button>
          {showScheduleUpdate && (
            <div className="absolute bottom-14 right-0 w-72 bg-[#0a0a0a] border border-white/10 rounded-2xl p-4 shadow-2xl">
              <p className="text-[10px] font-black text-[var(--text-secondary)] uppercase tracking-widest mb-3">Daily Schedule Update</p>

              {/* Status selector */}
              <div className="grid grid-cols-3 gap-1.5 mb-3">
                {([
                  { value: ScheduleStatus.ON_SCHEDULE, label: 'On Track', color: 'emerald' },
                  { value: ScheduleStatus.BEHIND, label: 'Behind', color: 'rose' },
                  { value: ScheduleStatus.AHEAD, label: 'Ahead', color: 'blue' },
                ] as { value: ScheduleStatus; label: string; color: string }[]).map(opt => (
                  <button
                    key={opt.value}
                    onClick={() => setScheduleStatus(opt.value)}
                    className={`py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all border ${
                      scheduleStatus === opt.value
                        ? opt.color === 'emerald' ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-400'
                          : opt.color === 'rose' ? 'bg-rose-500/20 border-rose-500/40 text-rose-400'
                          : 'bg-blue-500/20 border-blue-500/40 text-blue-400'
                        : 'bg-white/5 border-white/10 text-[var(--text-tertiary)] hover:bg-white/10'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>

              {/* Days remaining */}
              <div className="flex items-center gap-2 mb-3">
                <input
                  type="number"
                  min={1}
                  max={30}
                  value={daysRemaining}
                  onChange={e => setDaysRemaining(Number(e.target.value))}
                  className="flex-1 bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white text-sm text-center"
                />
                <span className="text-[10px] text-[var(--text-tertiary)]">days left</span>
              </div>

              {/* Note / reason (optional) */}
              {scheduleStatus !== ScheduleStatus.ON_SCHEDULE && (
                <input
                  type="text"
                  placeholder={scheduleStatus === ScheduleStatus.BEHIND ? 'Reason for delay...' : 'What got you ahead?'}
                  value={scheduleNote}
                  onChange={e => setScheduleNote(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white text-xs mb-3 placeholder-gray-600"
                />
              )}

              <button
                onClick={() => {
                  onScheduleUpdate(daysRemaining, scheduleStatus, scheduleNote);
                  setShowScheduleUpdate(false);
                  setScheduleNote('');
                }}
                className="w-full py-2 bg-[var(--brand-gold)] text-black text-[10px] font-black uppercase tracking-widest rounded-xl hover:brightness-110 transition-all active:scale-95"
              >
                Submit Update
              </button>
            </div>
          )}
        </div>
      )}

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
