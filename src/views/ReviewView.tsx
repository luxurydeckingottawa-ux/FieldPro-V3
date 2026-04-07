import React from 'react';
import { AppState } from '../types';
import { FileText, Image as ImageIcon, CheckCircle2, Loader2, AlertTriangle } from 'lucide-react';

interface ReviewViewProps {
  state: AppState;
  isUploading: boolean;
  uploadProgress: string;
  onBack: () => void;
  onSubmit: () => void;
}

const ReviewView: React.FC<ReviewViewProps> = ({ state, isUploading, uploadProgress, onBack, onSubmit }) => {
  const photoCount = [1, 2, 3, 4, 5].reduce((acc, idx) => {
    const page = state.pages?.[idx];
    if (!page) return acc;
    return acc + (page.photos?.filter(p => !!p.url).length || 0);
  }, 0);

  const canSubmit = !!state.customerSignature;

  return (
    <div className="p-6 pb-40 space-y-8 bg-[var(--bg-primary)] text-[var(--text-primary)]">
      <div className="card-base p-10 relative overflow-hidden group">
        <div className="relative z-10">
          <h2 className="text-3xl font-display mb-2 leading-none">Review & Submit</h2>
          <p className="font-label mt-3">Final QC Compliance Package</p>
        </div>
        <div className="absolute top-0 right-0 p-6 opacity-5 group-hover:opacity-10 transition-opacity">
          <FileText size={140} />
        </div>
        <div className="absolute bottom-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-emerald-500/20 to-transparent"></div>
      </div>

      <div className="space-y-6">
        <section className="card-base p-8">
          <h3 className="font-label mb-6">Project Summary</h3>
          <div className="grid grid-cols-2 gap-8">
            <div>
              <p className="font-label opacity-60 mb-1">Project</p>
              <p className="text-sm font-bold truncate tracking-tight">{state.jobInfo?.jobName || 'N/A'}</p>
            </div>
            <div>
              <p className="font-label opacity-60 mb-1">Role</p>
              <p className="text-sm font-bold tracking-tight">{state.userRole || 'N/A'}</p>
            </div>
          </div>
        </section>

        <section className="card-base p-8">
          <h3 className="font-label mb-6">Asset Status</h3>
          <div className="space-y-6">
            <div className="flex items-center justify-between group/item">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[var(--bg-primary)]/50 flex items-center justify-center border border-[var(--border-color)] group-hover/item:border-emerald-500/30 transition-colors">
                  <ImageIcon size={18} className="text-[var(--text-secondary)] group-hover/item:text-emerald-500 transition-colors" />
                </div>
                <span className="text-sm font-bold text-[var(--text-secondary)] tracking-tight">Project Photos</span>
              </div>
              <span className="font-label px-3 py-1 bg-[var(--bg-primary)]/50 rounded-full border border-[var(--border-color)]">{photoCount} Uploaded</span>
            </div>
            
            <div className="flex items-center justify-between group/item">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[var(--bg-primary)]/50 flex items-center justify-center border border-[var(--border-color)] group-hover/item:border-emerald-500/30 transition-colors">
                  <CheckCircle2 size={18} className="text-[var(--text-secondary)] group-hover/item:text-emerald-500 transition-colors" />
                </div>
                <span className="text-sm font-bold text-[var(--text-secondary)] tracking-tight">Customer Signature</span>
              </div>
              {state.customerSignature ? (
                <div className="flex flex-col items-end gap-3">
                  <span className="font-label text-emerald-500 bg-emerald-500/10 px-3 py-1 rounded-full border border-emerald-500/20">Captured</span>
                  <div className="h-14 w-28 bg-[var(--bg-primary)]/50 border border-[var(--border-color)] rounded-2xl overflow-hidden flex items-center justify-center p-2 group-hover/item:border-emerald-500/30 transition-colors">
                    <img src={state.customerSignature} alt="Signature Preview" className="max-h-full max-w-full object-contain dark:invert opacity-70 group-hover/item:opacity-100 transition-opacity" />
                  </div>
                </div>
              ) : (
                <span className="font-label text-red-500 bg-red-500/10 px-3 py-1 rounded-full border border-red-500/20">Missing</span>
              )}
            </div>
          </div>
        </section>

        {isUploading && (
          <div className="fixed inset-0 bg-[var(--bg-primary)]/95 backdrop-blur-2xl z-[100] flex flex-col items-center justify-center p-12 text-center">
            <div className="relative mb-10">
              <div className="w-24 h-24 bg-emerald-500/10 rounded-[2rem] flex items-center justify-center border border-emerald-500/20 shadow-2xl shadow-emerald-500/20">
                <Loader2 className="animate-spin text-emerald-500" size={48} />
              </div>
              <div className="absolute -inset-4 bg-emerald-500/10 blur-2xl rounded-full animate-pulse"></div>
            </div>
            <h3 className="text-[var(--text-primary)] text-3xl font-display mb-3">Packaging Job...</h3>
            <p className="font-label mb-10 max-w-xs leading-relaxed opacity-60">Uploading secure assets and generating compliance documentation.</p>
            
            <div className="w-full bg-[var(--bg-secondary)] h-1.5 rounded-full overflow-hidden max-w-xs border border-[var(--border-color)]">
              <div className="bg-emerald-500 h-full transition-all duration-500 shadow-[0_0_20px_rgba(16,185,129,0.5)]" style={{ width: '100%' }} />
            </div>
            
            <p className="text-emerald-500 font-label mt-6 animate-pulse">
              {uploadProgress}
            </p>
          </div>
        )}

        {!state.customerSignature && (
          <div className="p-8 bg-red-500/5 border border-red-500/10 rounded-[2.5rem] flex items-start gap-5 shadow-2xl">
            <div className="w-10 h-10 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center justify-center shrink-0">
              <AlertTriangle className="text-red-500" size={20} />
            </div>
            <div className="space-y-1">
              <p className="font-label text-red-500">Submission Blocked</p>
              <p className="text-xs text-[var(--text-secondary)] font-medium leading-relaxed">
                You must return to step 5 and capture the customer signature before submitting to the office.
              </p>
            </div>
          </div>
        )}
      </div>

      <div className="fixed bottom-0 left-0 right-0 p-6 bg-[var(--bg-primary)]/80 backdrop-blur-xl border-t border-[var(--border-color)] z-40">
        <div className="max-w-4xl mx-auto flex gap-4">
          <button 
            onClick={onBack}
            className="flex-1 py-5 bg-[var(--bg-secondary)] text-[var(--text-secondary)] border border-[var(--border-color)] rounded-[2rem] font-label text-[10px] hover:bg-[var(--bg-primary)] hover:text-[var(--text-primary)] transition-all active:scale-[0.98]"
          >
            Back
          </button>
          <button 
            onClick={onSubmit}
            disabled={!canSubmit || isUploading}
            className={`flex-[2] py-5 rounded-[2rem] font-label text-[10px] transition-all active:scale-[0.98] shadow-2xl ${
              canSubmit && !isUploading
                ? 'bg-emerald-600 text-black hover:bg-emerald-500' 
                : 'bg-[var(--bg-secondary)] text-[var(--text-secondary)] opacity-50 cursor-not-allowed border border-[var(--border-color)]'
            }`}
          >
            {isUploading ? 'Submitting...' : 'Submit to Office'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ReviewView;