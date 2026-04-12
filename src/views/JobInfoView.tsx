import { JobInfo, UserRole, ScheduleStatus, FieldScheduleForecast } from '../types';
import Logo from '../components/Logo';
import { Calendar, AlertCircle, CheckCircle2, Clock } from 'lucide-react';

interface JobInfoViewProps {
  info: JobInfo;
  role: UserRole | null;
  forecast?: FieldScheduleForecast;
  setRole: (role: UserRole) => void;
  onUpdate: (info: Partial<JobInfo>) => void;
  onForecastUpdate: (forecast: FieldScheduleForecast) => void;
  onNext: () => void;
}

const JobInfoView: React.FC<JobInfoViewProps> = ({ info, role, forecast, setRole, onUpdate, onForecastUpdate, onNext }) => {
  const isComplete = info.jobName && info.jobAddress && info.customerName && info.jobType && role && forecast;

  const handleForecastChange = (updates: Partial<FieldScheduleForecast>) => {
    onForecastUpdate({
      status: forecast?.status || ScheduleStatus.ON_SCHEDULE,
      estimatedDaysRemaining: forecast?.estimatedDaysRemaining || 0,
      updatedAt: new Date().toISOString(),
      updatedBy: info.crewLeadName || 'Field User',
      ...updates
    });
  };

  return (
    <div className="p-6 pt-10 pb-40 bg-[var(--bg-primary)] text-[var(--text-primary)]">
      <div className="mb-12 flex flex-col items-center">
        <Logo size="lg" className="mb-6 shadow-2xl" />
        <p className="font-label opacity-60">Field Operations & Compliance</p>
      </div>

      <div className="space-y-12">
        <section>
          <label className="block font-label mb-4">Login Identity</label>
          <div className="grid grid-cols-2 gap-4">
            <button 
              onClick={() => setRole(UserRole.FIELD_EMPLOYEE)}
              className={`p-6 rounded-2xl border-2 transition-all font-label ${
                role === UserRole.FIELD_EMPLOYEE
                  ? 'bg-[var(--text-primary)] text-[var(--bg-primary)] border-[var(--text-primary)] shadow-2xl scale-[1.02]' 
                  : 'bg-[var(--bg-secondary)] text-[var(--text-secondary)] border-[var(--border-color)] hover:bg-[var(--bg-primary)] hover:text-[var(--text-primary)]'
              }`}
            >
              Employee
            </button>
            <button 
              onClick={() => setRole(UserRole.SUBCONTRACTOR)}
              className={`p-6 rounded-2xl border-2 transition-all font-label ${
                role === UserRole.SUBCONTRACTOR 
                  ? 'bg-[var(--text-primary)] text-[var(--bg-primary)] border-[var(--text-primary)] shadow-2xl scale-[1.02]' 
                  : 'bg-[var(--bg-secondary)] text-[var(--text-secondary)] border-[var(--border-color)] hover:bg-[var(--bg-primary)] hover:text-[var(--text-primary)]'
              }`}
            >
              Subcontractor
            </button>
          </div>
        </section>

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

        {/* Schedule Tracker Section */}
        <section className="pt-6 border-t border-[var(--border-color)]">
          <div className="flex items-center justify-between mb-6">
            <label className="block font-label">Daily Schedule Tracker</label>
            <div className="px-3 py-1 bg-amber-500/10 border border-amber-500/20 rounded-full">
              <span className="text-[8px] font-black text-amber-500 uppercase tracking-widest">Required</span>
            </div>
          </div>

          <div className="card-base p-8 space-y-8">
            <div>
              <label className="block font-label opacity-60 mb-4">Are you on schedule?</label>
              <div className="grid grid-cols-3 gap-3">
                {[ScheduleStatus.AHEAD, ScheduleStatus.ON_SCHEDULE, ScheduleStatus.BEHIND].map(status => (
                  <button
                    key={status}
                    onClick={() => handleForecastChange({ status })}
                    className={`py-4 rounded-xl font-label border transition-all flex flex-col items-center gap-2 ${
                      forecast?.status === status 
                        ? 'bg-[var(--brand-gold)] text-black border-[var(--brand-gold)] shadow-2xl scale-[1.02]' 
                        : 'bg-[var(--bg-primary)]/50 text-[var(--text-secondary)] border-[var(--border-color)] hover:border-[var(--text-secondary)]/30'
                    }`}
                  >
                    {status === ScheduleStatus.AHEAD && <CheckCircle2 className="h-4 w-4" />}
                    {status === ScheduleStatus.ON_SCHEDULE && <Clock className="h-4 w-4" />}
                    {status === ScheduleStatus.BEHIND && <AlertCircle className="h-4 w-4" />}
                    {status.replace('_', ' ')}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-6">
              <div>
                <label className="block font-label opacity-60 mb-3">Est. Days Remaining</label>
                <div className="relative">
                  <input 
                    type="number" 
                    value={forecast?.estimatedDaysRemaining || ''}
                    onChange={(e) => handleForecastChange({ estimatedDaysRemaining: parseInt(e.target.value) || 0 })}
                    placeholder="0"
                    className="w-full p-5 bg-[var(--bg-primary)]/50 border border-[var(--border-color)] rounded-2xl focus:ring-2 focus:ring-[var(--brand-gold)]/50 focus:border-[var(--brand-gold)]/50 outline-none font-bold text-sm transition-all"
                  />
                  <Calendar className="absolute right-5 top-5 h-5 w-5 text-[var(--text-secondary)] opacity-40" />
                </div>
              </div>
              <div>
                <label className="block font-label opacity-60 mb-3">Delay Reason (If any)</label>
                <select 
                  value={forecast?.delayReason || ''}
                  onChange={(e) => handleForecastChange({ delayReason: e.target.value })}
                  className="w-full p-5 bg-[var(--bg-primary)]/50 border border-[var(--border-color)] rounded-2xl focus:ring-2 focus:ring-[var(--brand-gold)]/50 focus:border-[var(--brand-gold)]/50 outline-none appearance-none font-bold text-sm transition-all"
                >
                  <option value="" className="bg-[var(--bg-primary)]">No Delay</option>
                  <option value="Weather" className="bg-[var(--bg-primary)]">Weather / Rain</option>
                  <option value="Materials" className="bg-[var(--bg-primary)]">Material Delay</option>
                  <option value="Site Issue" className="bg-[var(--bg-primary)]">Site Issue</option>
                  <option value="Crew" className="bg-[var(--bg-primary)]">Crew / Staffing</option>
                  <option value="Inspection" className="bg-[var(--bg-primary)]">Inspection Delay</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block font-label opacity-60 mb-3">Status Note</label>
              <textarea 
                value={forecast?.note || ''}
                onChange={(e) => handleForecastChange({ note: e.target.value })}
                placeholder="Brief update on today's progress..."
                rows={2}
                className="w-full p-5 bg-[var(--bg-primary)]/50 border border-[var(--border-color)] rounded-2xl focus:ring-2 focus:ring-[var(--brand-gold)]/50 focus:border-[var(--brand-gold)]/50 outline-none font-medium text-sm placeholder:text-[var(--text-secondary)]/30 transition-all resize-none"
              />
            </div>
          </div>
        </section>
      </div>

      <div className="fixed bottom-0 left-0 right-0 p-6 bg-[var(--bg-primary)]/80 backdrop-blur-xl border-t border-[var(--border-color)] z-40">
        <div className="max-w-4xl mx-auto">
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