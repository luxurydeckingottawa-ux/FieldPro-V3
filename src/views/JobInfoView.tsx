import { JobInfo, UserRole, FieldScheduleForecast } from '../types';
import Logo from '../components/Logo';
import { AlertCircle } from 'lucide-react';

interface JobInfoViewProps {
  info: JobInfo;
  /** Kept in the prop type for compatibility with WorkflowContainer wiring,
   *  but the field workflow no longer asks the tech to pick a role here —
   *  Employee vs Subcontractor is determined by which portal they're in. */
  role?: UserRole | null;
  forecast?: FieldScheduleForecast;
  setRole?: (role: UserRole) => void;
  onUpdate: (info: Partial<JobInfo>) => void;
  onForecastUpdate: (forecast: FieldScheduleForecast) => void;
  onNext: () => void;
}

const JobInfoView: React.FC<JobInfoViewProps> = ({ info, onUpdate, onNext }) => {
  // Daily Schedule Tracker gate moved OUT of the workflow and INTO the
  // customer file detail view (JobDetailView). Resumed mid-stage workflows
  // bypassed page 0, so the gate has to live before "Resume Workflow" is
  // pressable — not inside the workflow itself.
  const isComplete = !!(info.jobName && info.jobAddress && info.customerName && info.jobType);

  return (
    <div className="p-6 pt-10 pb-40 bg-[var(--bg-primary)] text-[var(--text-primary)]">
      <div className="mb-12 flex flex-col items-center">
        <Logo size="lg" className="mb-6 shadow-2xl" />
        <p className="font-label opacity-60">Field Operations & Compliance</p>
      </div>

      <div className="space-y-12">
        {/* Login Identity selector removed — Employee vs Subcontractor is now
            determined by which portal the user is in (separate apps), so we
            don't make the tech pick every time they open a job. */}

        <section className="space-y-6">
          <label className="block font-label">Project Identification</label>
          
          <div className="space-y-6">
            <div>
              <label className="block font-label opacity-60 mb-2">Job Name</label>
              <input 
                type="text" 
                value={info.jobName}
                onChange={(e) => onUpdate({ jobName: e.target.value })}
                placeholder="e.g. Smith Deck Build"
                className="w-full p-5 bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-2xl focus:ring-2 focus:ring-[var(--brand-gold)]/50 focus:border-[var(--brand-gold)]/50 outline-none font-bold text-sm placeholder:text-[var(--text-secondary)]/30 transition-all"
              />
            </div>
            <div>
              <label className="block font-label opacity-60 mb-2">Job Address</label>
              <input 
                type="text" 
                value={info.jobAddress}
                onChange={(e) => onUpdate({ jobAddress: e.target.value })}
                placeholder="123 Ottawa St."
                className="w-full p-5 bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-2xl focus:ring-2 focus:ring-[var(--brand-gold)]/50 focus:border-[var(--brand-gold)]/50 outline-none font-bold text-sm placeholder:text-[var(--text-secondary)]/30 transition-all"
              />
            </div>
            <div>
              <label className="block font-label opacity-60 mb-2">Customer Name</label>
              <input 
                type="text" 
                value={info.customerName}
                onChange={(e) => onUpdate({ customerName: e.target.value })}
                placeholder="John Smith"
                className="w-full p-5 bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-2xl focus:ring-2 focus:ring-[var(--brand-gold)]/50 focus:border-[var(--brand-gold)]/50 outline-none font-bold text-sm placeholder:text-[var(--text-secondary)]/30 transition-all"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block font-label opacity-60 mb-2">Crew Lead</label>
                <input 
                  type="text" 
                  value={info.crewLeadName}
                  onChange={(e) => onUpdate({ crewLeadName: e.target.value })}
                  placeholder="Lead Name"
                  className="w-full p-5 bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-2xl focus:ring-2 focus:ring-[var(--brand-gold)]/50 focus:border-[var(--brand-gold)]/50 outline-none font-bold text-sm placeholder:text-[var(--text-secondary)]/30 transition-all"
                />
              </div>
              <div>
                <label className="block font-label opacity-60 mb-2">Date</label>
                <input 
                  type="date" 
                  value={info.date}
                  onChange={(e) => onUpdate({ date: e.target.value })}
                  className="w-full p-5 bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-2xl focus:ring-2 focus:ring-[var(--brand-gold)]/50 focus:border-[var(--brand-gold)]/50 outline-none font-bold text-sm transition-all"
                />
              </div>
            </div>
            <div>
              <label className="block font-label opacity-60 mb-2">Job Type</label>
              <select 
                value={info.jobType}
                onChange={(e) => onUpdate({ jobType: e.target.value })}
                className="w-full p-5 bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-2xl focus:ring-2 focus:ring-[var(--brand-gold)]/50 focus:border-[var(--brand-gold)]/50 outline-none appearance-none font-bold text-sm transition-all"
              >
                <option value="" className="bg-[var(--bg-primary)]">Select Type...</option>
                <option value="Deck" className="bg-[var(--bg-primary)]">Deck Only</option>
                <option value="Deck+Stairs" className="bg-[var(--bg-primary)]">Deck + Stairs</option>
                <option value="Deck+Railings" className="bg-[var(--bg-primary)]">Deck + Railings</option>
                <option value="FullBuild" className="bg-[var(--bg-primary)]">Full Build (Deck+Stairs+Railings)</option>
              </select>
            </div>
          </div>
        </section>

        {/* Daily Schedule Tracker has moved to the customer file detail view
            (JobDetailView) — gates the Resume / Start Workflow button so
            resumed mid-stage workflows still hit it. Page 0 now only confirms
            project identification. */}
      </div>

      <div className="fixed bottom-0 left-0 right-0 p-6 bg-[var(--bg-primary)]/80 backdrop-blur-xl border-t border-[var(--border-color)] z-40">
        <div className="max-w-4xl mx-auto space-y-2">
          {!isComplete && (
            <p className="text-center text-[10px] font-black uppercase tracking-widest text-amber-500 flex items-center justify-center gap-2">
              <AlertCircle className="h-3 w-3" />
              Fill in all project details to continue
            </p>
          )}
          <button
            onClick={onNext}
            disabled={!isComplete}
            className={`w-full py-5 rounded-[2rem] font-label text-xs transition-all active:scale-[0.98] shadow-2xl ${
              isComplete
                ? 'bg-[var(--brand-gold)] text-black hover:bg-[var(--brand-gold)]'
                : 'bg-[var(--bg-secondary)] text-[var(--text-secondary)] opacity-50 cursor-not-allowed border border-[var(--border-color)]'
            }`}
          >
            Start Field Workflow
          </button>
        </div>
      </div>
    </div>
  );
};

export default JobInfoView;