import React, { useState } from 'react';
import { Job, PipelineStage, JobStatus, FieldStatus, CompletionPackageStatus, PhotoCompletionStatus, CompletionReadinessStatus, OfficeReviewStatus, ScheduleStatus, BuildDetails } from '../types';
import { createDefaultBuildDetails, createDefaultOfficeChecklists } from '../constants';
import { ArrowLeft, Save, Info, AlertCircle } from 'lucide-react';

interface NewJobIntakeViewProps {
  onSave: (job: Job) => void;
  onCancel: () => void;
  initialStage?: PipelineStage;
}

const NewJobIntakeView: React.FC<NewJobIntakeViewProps> = ({ onSave, onCancel, initialStage = PipelineStage.LEAD_IN }) => {
  const [formData, setFormData] = useState({
    jobNumber: `LD-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`,
    clientName: '',
    clientPhone: '',
    projectAddress: '',
    projectType: '',
    scopeSummary: '',
    plannedStartDate: '',
    plannedDurationDays: 5,
    assignedCrewOrSubcontractor: '',
    materialCost: 0,
    labourCost: 0,
    totalAmount: 0,
    paidAmount: 0,
  });

  const [buildDetails, setBuildDetails] = useState<BuildDetails>(createDefaultBuildDetails());
  const [activeSection, setActiveSection] = useState('basic');
  const [error, setError] = useState<string | null>(null);

  const handleSave = () => {
    if (!formData.clientName || !formData.projectAddress) {
      setError('Client Name and Project Address are required.');
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    setError(null);

    const newJob: Job = {
      id: `j-${Date.now()}`,
      ...formData,
      currentStage: 0,
      status: JobStatus.SCHEDULED,
      pipelineStage: initialStage,
      officeChecklists: createDefaultOfficeChecklists(),
      officeNotes: [],
      siteNotes: [],
      files: [],
      flaggedIssues: [],
      signoffStatus: 'pending',
      invoiceSupportStatus: 'pending',
      finalSubmissionStatus: 'pending',
      fieldStatus: FieldStatus.PENDING,
      completionPackageStatus: CompletionPackageStatus.NOT_SUBMITTED,
      photoCompletionStatus: PhotoCompletionStatus.NOT_CONFIRMED,
      completionReadinessStatus: CompletionReadinessStatus.NOT_READY,
      officeReviewStatus: OfficeReviewStatus.NOT_READY,
      updatedAt: new Date().toISOString(),
      officialScheduleStatus: ScheduleStatus.ON_SCHEDULE,
      buildDetails: buildDetails,
      customerPortalToken: Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15),
    };

    onSave(newJob);
  };

  const updateBuildDetail = (section: keyof BuildDetails, field: string, value: any) => {
    setBuildDetails(prev => ({
      ...prev,
      [section]: {
        ...prev[section],
        [field]: value
      }
    }));
  };

  const sections = [
    { id: 'basic', label: 'Basic Info' },
    { id: 'site', label: 'Site & Footings' },
    { id: 'framing', label: 'Framing' },
    { id: 'decking', label: 'Decking & Railing' },
    { id: 'stairs', label: 'Stairs & Skirting' },
    { id: 'extras', label: 'Electrical & Features' },
  ];

  return (
    <div className="min-h-screen bg-[var(--bg-primary)] text-[var(--text-primary)] flex flex-col font-sans selection:bg-emerald-500/30 transition-colors duration-300">
      {/* Header */}
      <header className="bg-[var(--bg-primary)]/80 border-b border-[var(--border-color)] sticky top-0 z-50 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <button 
              onClick={onCancel}
              className="p-3 hover:bg-[var(--text-primary)]/5 rounded-2xl transition-all active:scale-95 group"
            >
              <ArrowLeft className="w-5 h-5 text-[var(--text-secondary)] group-hover:text-[var(--text-primary)] transition-colors" />
            </button>
            <div>
              <h1 className="text-xl font-black text-[var(--text-primary)] uppercase tracking-tight italic">New Job Intake</h1>
              <p className="text-[10px] text-emerald-500 font-black uppercase tracking-[0.2em]">{formData.jobNumber}</p>
            </div>
          </div>
          <div className="flex items-center gap-6">
            <button
              onClick={onCancel}
              className="text-[10px] font-black text-[var(--text-secondary)] hover:text-[var(--text-primary)] uppercase tracking-[0.2em] transition-colors"
            >
              Discard
            </button>
            <button
              onClick={handleSave}
              className="flex items-center gap-3 bg-emerald-500 text-black px-8 py-3 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] hover:bg-emerald-600 transition-all active:scale-95 shadow-[0_20px_40px_rgba(16,185,129,0.1)]"
            >
              <Save className="w-4 h-4" />
              Save Master Record
            </button>
          </div>
        </div>
      </header>

      <div className="flex-1 max-w-7xl mx-auto w-full px-6 py-12 flex flex-col md:flex-row gap-12">
        {/* Sidebar Nav */}
        <aside className="w-full md:w-72 flex-shrink-0">
          <nav className="space-y-2 sticky top-32">
            <p className="text-[10px] font-black text-[var(--text-secondary)] uppercase tracking-[0.3em] mb-6 px-4">Intake Sections</p>
            {sections.map(section => (
              <button
                key={section.id}
                onClick={() => setActiveSection(section.id)}
                className={`w-full text-left px-6 py-4 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] transition-all group relative overflow-hidden ${
                  activeSection === section.id 
                    ? 'bg-[var(--text-primary)] text-[var(--bg-primary)] shadow-[0_10px_30px_rgba(0,0,0,0.1)]' 
                    : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--text-primary)]/5'
                }`}
              >
                {activeSection === section.id && (
                  <div className="absolute left-0 top-0 w-1 h-full bg-emerald-500" />
                )}
                <span className="relative z-10">{section.label}</span>
              </button>
            ))}
          </nav>
        </aside>

        {/* Form Content */}
        <main className="flex-1 bg-[var(--bg-secondary)] rounded-[2.5rem] shadow-2xl border border-[var(--border-color)] p-10 backdrop-blur-md relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/5 blur-3xl -mr-32 -mt-32" />
          
          {error && (
            <div className="mb-8 p-4 bg-red-500/10 border border-red-500/20 rounded-2xl flex items-center gap-3 text-red-500 animate-in fade-in slide-in-from-top-4">
              <AlertCircle className="w-5 h-5" />
              <p className="text-[10px] font-black uppercase tracking-widest">{error}</p>
            </div>
          )}

          {activeSection === 'basic' && (
            <div className="space-y-10">
              <div>
                <h2 className="text-xl font-black text-[var(--text-primary)] uppercase tracking-tight italic mb-10 flex items-center gap-3">
                  <Info className="w-5 h-5 text-emerald-500" />
                  Client & Project Basics
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-[var(--text-secondary)] uppercase tracking-[0.2em] ml-1">Client Name *</label>
                    <input 
                      type="text" 
                      value={formData.clientName}
                      onChange={e => setFormData({...formData, clientName: e.target.value})}
                      className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-2xl p-4 text-sm font-bold text-[var(--text-primary)] focus:outline-none focus:border-emerald-500 transition-all placeholder:text-[var(--text-secondary)]/30"
                      placeholder="e.g. John Smith"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-[var(--text-secondary)] uppercase tracking-[0.2em] ml-1">Client Phone</label>
                    <input 
                      type="text" 
                      value={formData.clientPhone}
                      onChange={e => setFormData({...formData, clientPhone: e.target.value})}
                      className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-2xl p-4 text-sm font-bold text-[var(--text-primary)] focus:outline-none focus:border-emerald-500 transition-all placeholder:text-[var(--text-secondary)]/30"
                      placeholder="613-555-0123"
                    />
                  </div>
                  <div className="col-span-1 md:col-span-2 space-y-2">
                    <label className="text-[10px] font-black text-[var(--text-secondary)] uppercase tracking-[0.2em] ml-1">Project Address *</label>
                    <input 
                      type="text" 
                      value={formData.projectAddress}
                      onChange={e => setFormData({...formData, projectAddress: e.target.value})}
                      className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-2xl p-4 text-sm font-bold text-[var(--text-primary)] focus:outline-none focus:border-emerald-500 transition-all placeholder:text-[var(--text-secondary)]/30"
                      placeholder="Street, City, Postal Code"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-[var(--text-secondary)] uppercase tracking-[0.2em] ml-1">Project Type</label>
                    <input 
                      type="text" 
                      value={formData.projectType}
                      onChange={e => setFormData({...formData, projectType: e.target.value})}
                      className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-2xl p-4 text-sm font-bold text-[var(--text-primary)] focus:outline-none focus:border-emerald-500 transition-all placeholder:text-[var(--text-secondary)]/30"
                      placeholder="e.g. Composite Deck"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-[var(--text-secondary)] uppercase tracking-[0.2em] ml-1">Target Start Date</label>
                    <input 
                      type="date" 
                      value={formData.plannedStartDate}
                      onChange={e => setFormData({...formData, plannedStartDate: e.target.value})}
                      className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-2xl p-4 text-sm font-bold text-[var(--text-primary)] focus:outline-none focus:border-emerald-500 transition-all"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-[var(--text-secondary)] uppercase tracking-[0.2em] ml-1">Estimated Duration (Days)</label>
                    <input 
                      type="number" 
                      value={formData.plannedDurationDays}
                      onChange={e => setFormData({...formData, plannedDurationDays: parseInt(e.target.value) || 0})}
                      className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-2xl p-4 text-sm font-bold text-[var(--text-primary)] focus:outline-none focus:border-emerald-500 transition-all"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-[var(--text-secondary)] uppercase tracking-[0.2em] ml-1">Assigned Crew / Sub</label>
                    <input 
                      type="text" 
                      value={formData.assignedCrewOrSubcontractor}
                      onChange={e => setFormData({...formData, assignedCrewOrSubcontractor: e.target.value})}
                      className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-2xl p-4 text-sm font-bold text-[var(--text-primary)] focus:outline-none focus:border-emerald-500 transition-all placeholder:text-[var(--text-secondary)]/30"
                      placeholder="Crew Name or Subcontractor"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-[var(--text-secondary)] uppercase tracking-[0.2em] ml-1">Job Total Amount ($)</label>
                    <input 
                      type="number" 
                      value={formData.totalAmount}
                      onChange={e => setFormData({...formData, totalAmount: parseFloat(e.target.value) || 0})}
                      className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-2xl p-4 text-sm font-bold text-[var(--text-primary)] focus:outline-none focus:border-emerald-500 transition-all placeholder:text-[var(--text-secondary)]/30"
                      placeholder="0.00"
                    />
                  </div>
                  <div className="col-span-1 md:col-span-2 space-y-2">
                    <label className="text-[10px] font-black text-[var(--text-secondary)] uppercase tracking-[0.2em] ml-1">Scope Summary</label>
                    <textarea 
                      value={formData.scopeSummary}
                      onChange={e => setFormData({...formData, scopeSummary: e.target.value})}
                      rows={4}
                      className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-2xl p-4 text-sm font-medium text-[var(--text-primary)] focus:outline-none focus:border-emerald-500 transition-all placeholder:text-[var(--text-secondary)]/30 leading-relaxed"
                      placeholder="Brief overview of the project scope..."
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-[var(--text-secondary)] uppercase tracking-widest">Paid Amount ($)</label>
                  <input 
                    type="number" 
                    value={formData.paidAmount} 
                    onChange={(e) => setFormData({ ...formData, paidAmount: parseFloat(e.target.value) || 0 })}
                    className="w-full bg-[var(--text-primary)]/5 border border-[var(--border-color)] rounded-xl px-4 py-3 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition-all"
                    placeholder="0.00"
                  />
                </div>
              </div>
            </div>
          )}

          {activeSection === 'site' && (
            <div className="space-y-12">
              <section>
                <h2 className="text-xl font-black text-white uppercase tracking-tight italic mb-8">Site Preparation</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {[
                    { id: 'demolitionRequired', label: 'Demolition Required' },
                    { id: 'permitsRequired', label: 'Permits Required' },
                    { id: 'locatesRequired', label: 'Locates Required' },
                    { id: 'binRequired', label: 'Bin Required' },
                    { id: 'siteProtection', label: 'Site Protection Needed' },
                    { id: 'inspectionRequired', label: 'Inspection Required' },
                  ].map(item => (
                    <label key={item.id} className="flex items-center gap-4 p-5 bg-white/5 border border-white/10 rounded-2xl hover:bg-white/10 cursor-pointer transition-all group">
                      <div className="relative flex items-center justify-center">
                        <input 
                          type="checkbox" 
                          checked={(buildDetails.sitePrep as any)[item.id]}
                          onChange={e => updateBuildDetail('sitePrep', item.id, e.target.checked)}
                          className="peer w-6 h-6 rounded-lg border-white/20 bg-white/5 text-emerald-500 focus:ring-emerald-500/50 transition-all cursor-pointer appearance-none border"
                        />
                        <div className="absolute opacity-0 peer-checked:opacity-100 pointer-events-none transition-opacity">
                          <div className="w-3 h-3 bg-emerald-500 rounded-sm" />
                        </div>
                      </div>
                      <span className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] group-hover:text-white transition-colors">{item.label}</span>
                    </label>
                  ))}
                  <div className="col-span-1 md:col-span-2 space-y-2 mt-4">
                    <label className="text-[10px] font-black text-gray-600 uppercase tracking-[0.2em] ml-1">Site Prep Notes</label>
                    <textarea 
                      value={buildDetails.sitePrep.notes}
                      onChange={e => updateBuildDetail('sitePrep', 'notes', e.target.value)}
                      rows={3}
                      className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-sm font-medium text-white focus:outline-none focus:border-emerald-500 transition-all placeholder:text-gray-800 leading-relaxed"
                    />
                  </div>
                </div>
              </section>

              <section className="pt-12 border-t border-white/5">
                <h2 className="text-xl font-black text-white uppercase tracking-tight italic mb-8">Footings & Foundation</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-gray-600 uppercase tracking-[0.2em] ml-1">Footing Type</label>
                    <select 
                      value={buildDetails.footings.type}
                      onChange={e => updateBuildDetail('footings', 'type', e.target.value)}
                      className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-sm font-bold text-white focus:outline-none focus:border-emerald-500 appearance-none transition-all"
                    >
                      <option value="" className="bg-[#050505]">Select Type...</option>
                      <option value="Helical Piles" className="bg-[#050505]">Helical Piles</option>
                      <option value="Concrete Sonotubes" className="bg-[#050505]">Concrete Sonotubes</option>
                      <option value="Deck Blocks" className="bg-[#050505]">Deck Blocks</option>
                      <option value="Ground Screws" className="bg-[#050505]">Ground Screws</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-gray-600 uppercase tracking-[0.2em] ml-1">Bracket Type</label>
                    <input 
                      type="text" 
                      value={buildDetails.footings.bracketType}
                      onChange={e => updateBuildDetail('footings', 'bracketType', e.target.value)}
                      className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-sm font-bold text-white focus:outline-none focus:border-emerald-500 transition-all placeholder:text-gray-800"
                      placeholder="e.g. 6x6 Adjustable"
                    />
                  </div>
                  <div className="col-span-1 md:col-span-2 flex flex-wrap gap-8 pt-4">
                    <label className="flex items-center gap-4 cursor-pointer group">
                      <div className="relative flex items-center justify-center">
                        <input 
                          type="checkbox" 
                          checked={buildDetails.footings.attachedToHouse}
                          onChange={e => updateBuildDetail('footings', 'attachedToHouse', e.target.checked)}
                          className="peer w-6 h-6 rounded-lg border-white/20 bg-white/5 text-emerald-500 focus:ring-emerald-500/50 transition-all cursor-pointer appearance-none border"
                        />
                        <div className="absolute opacity-0 peer-checked:opacity-100 pointer-events-none transition-opacity">
                          <div className="w-3 h-3 bg-emerald-500 rounded-sm" />
                        </div>
                      </div>
                      <span className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] group-hover:text-white transition-colors">Attached to House</span>
                    </label>
                    <label className="flex items-center gap-4 cursor-pointer group">
                      <div className="relative flex items-center justify-center">
                        <input 
                          type="checkbox" 
                          checked={buildDetails.footings.floating}
                          onChange={e => updateBuildDetail('footings', 'floating', e.target.checked)}
                          className="peer w-6 h-6 rounded-lg border-white/20 bg-white/5 text-emerald-500 focus:ring-emerald-500/50 transition-all cursor-pointer appearance-none border"
                        />
                        <div className="absolute opacity-0 peer-checked:opacity-100 pointer-events-none transition-opacity">
                          <div className="w-3 h-3 bg-emerald-500 rounded-sm" />
                        </div>
                      </div>
                      <span className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] group-hover:text-white transition-colors">Floating Deck</span>
                    </label>
                  </div>
                </div>
              </section>
            </div>
          )}

          {activeSection === 'framing' && (
            <div className="space-y-12">
              <section>
                <h2 className="text-xl font-black text-white uppercase tracking-tight italic mb-8">Framing Specifications</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-gray-600 uppercase tracking-[0.2em] ml-1">Lumber Type</label>
                    <select 
                      value={buildDetails.framing.type}
                      onChange={e => updateBuildDetail('framing', 'type', e.target.value)}
                      className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-sm font-bold text-white focus:outline-none focus:border-emerald-500 appearance-none transition-all"
                    >
                      <option value="" className="bg-[#050505]">Select Type...</option>
                      <option value="Pressure Treated Brown" className="bg-[#050505]">Pressure Treated Brown</option>
                      <option value="Pressure Treated Green" className="bg-[#050505]">Pressure Treated Green</option>
                      <option value="Cedar" className="bg-[#050505]">Cedar</option>
                      <option value="Steel" className="bg-[#050505]">Steel</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-gray-600 uppercase tracking-[0.2em] ml-1">Joist Size</label>
                    <select 
                      value={buildDetails.framing.joistSize}
                      onChange={e => updateBuildDetail('framing', 'joistSize', e.target.value)}
                      className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-sm font-bold text-white focus:outline-none focus:border-emerald-500 appearance-none transition-all"
                    >
                      <option value="" className="bg-[#050505]">Select Size...</option>
                      <option value="2x6" className="bg-[#050505]">2x6</option>
                      <option value="2x8" className="bg-[#050505]">2x8</option>
                      <option value="2x10" className="bg-[#050505]">2x10</option>
                      <option value="2x12" className="bg-[#050505]">2x12</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-gray-600 uppercase tracking-[0.2em] ml-1">Joist Spacing</label>
                    <select 
                      value={buildDetails.framing.joistSpacing}
                      onChange={e => updateBuildDetail('framing', 'joistSpacing', e.target.value)}
                      className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-sm font-bold text-white focus:outline-none focus:border-emerald-500 appearance-none transition-all"
                    >
                      <option value="" className="bg-[#050505]">Select Spacing...</option>
                      <option value="12 in OC" className="bg-[#050505]">12 in OC</option>
                      <option value="16 in OC" className="bg-[#050505]">16 in OC</option>
                      <option value="24 in OC" className="bg-[#050505]">24 in OC</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-gray-600 uppercase tracking-[0.2em] ml-1">Joist Protection Type</label>
                    <input 
                      type="text" 
                      value={buildDetails.framing.joistProtectionType}
                      onChange={e => updateBuildDetail('framing', 'joistProtectionType', e.target.value)}
                      className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-sm font-bold text-white focus:outline-none focus:border-emerald-500 transition-all placeholder:text-gray-800"
                      placeholder="e.g. G-Tape, Liquid Flash"
                    />
                  </div>
                  <label className="flex items-center gap-4 p-5 bg-white/5 border border-white/10 rounded-2xl hover:bg-white/10 cursor-pointer transition-all group md:col-span-2">
                    <div className="relative flex items-center justify-center">
                      <input 
                        type="checkbox" 
                        checked={buildDetails.framing.joistProtection}
                        onChange={e => updateBuildDetail('framing', 'joistProtection', e.target.checked)}
                        className="peer w-6 h-6 rounded-lg border-white/20 bg-white/5 text-emerald-500 focus:ring-emerald-500/50 transition-all cursor-pointer appearance-none border"
                      />
                      <div className="absolute opacity-0 peer-checked:opacity-100 pointer-events-none transition-opacity">
                        <div className="w-3 h-3 bg-emerald-500 rounded-sm" />
                      </div>
                    </div>
                    <span className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] group-hover:text-white transition-colors">Joist Protection Included</span>
                  </label>
                </div>
              </section>

              <section className="pt-12 border-t border-white/5">
                <h2 className="text-xl font-black text-white uppercase tracking-tight italic mb-8">Landscaping / Ground Prep</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-gray-600 uppercase tracking-[0.2em] ml-1">Prep Type</label>
                    <select 
                      value={buildDetails.landscaping.prepType}
                      onChange={e => updateBuildDetail('landscaping', 'prepType', e.target.value)}
                      className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-sm font-bold text-white focus:outline-none focus:border-emerald-500 appearance-none transition-all"
                    >
                      <option value="" className="bg-[#050505]">Select Type...</option>
                      <option value="None" className="bg-[#050505]">None</option>
                      <option value="Fabric & Gravel" className="bg-[#050505]">Fabric & Gravel</option>
                      <option value="Fabric & River Rock" className="bg-[#050505]">Fabric & River Rock</option>
                      <option value="Excavation Only" className="bg-[#050505]">Excavation Only</option>
                    </select>
                  </div>
                  <div className="col-span-1 md:col-span-2 space-y-2">
                    <label className="text-[10px] font-black text-gray-600 uppercase tracking-[0.2em] ml-1">Landscaping Notes</label>
                    <textarea 
                      value={buildDetails.landscaping.notes}
                      onChange={e => updateBuildDetail('landscaping', 'notes', e.target.value)}
                      rows={3}
                      className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-sm font-medium text-white focus:outline-none focus:border-emerald-500 transition-all placeholder:text-gray-800 leading-relaxed"
                    />
                  </div>
                </div>
              </section>
            </div>
          )}

          {activeSection === 'decking' && (
            <div className="space-y-12">
              <section>
                <h2 className="text-xl font-black text-white uppercase tracking-tight italic mb-8">Decking Selection</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-gray-600 uppercase tracking-[0.2em] ml-1">Material Type</label>
                    <select 
                      value={buildDetails.decking.type}
                      onChange={e => updateBuildDetail('decking', 'type', e.target.value)}
                      className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-sm font-bold text-white focus:outline-none focus:border-emerald-500 appearance-none transition-all"
                    >
                      <option value="" className="bg-[#050505]">Select Type...</option>
                      <option value="Composite" className="bg-[#050505]">Composite</option>
                      <option value="PVC" className="bg-[#050505]">PVC</option>
                      <option value="Cedar" className="bg-[#050505]">Cedar</option>
                      <option value="Ipe" className="bg-[#050505]">Ipe</option>
                      <option value="Pressure Treated" className="bg-[#050505]">Pressure Treated</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-gray-600 uppercase tracking-[0.2em] ml-1">Brand</label>
                    <input 
                      type="text" 
                      value={buildDetails.decking.brand}
                      onChange={e => updateBuildDetail('decking', 'brand', e.target.value)}
                      className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-sm font-bold text-white focus:outline-none focus:border-emerald-500 transition-all placeholder:text-gray-800"
                      placeholder="e.g. Trex, TimberTech, Azek"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-gray-600 uppercase tracking-[0.2em] ml-1">Color</label>
                    <input 
                      type="text" 
                      value={buildDetails.decking.color}
                      onChange={e => updateBuildDetail('decking', 'color', e.target.value)}
                      className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-sm font-bold text-white focus:outline-none focus:border-emerald-500 transition-all placeholder:text-gray-800"
                      placeholder="Primary Board Color"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-gray-600 uppercase tracking-[0.2em] ml-1">Accent / Picture Frame</label>
                    <input 
                      type="text" 
                      value={buildDetails.decking.accentNote}
                      onChange={e => updateBuildDetail('decking', 'accentNote', e.target.value)}
                      className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-sm font-bold text-white focus:outline-none focus:border-emerald-500 transition-all placeholder:text-gray-800"
                      placeholder="Accent color or pattern"
                    />
                  </div>
                </div>
              </section>

              <section className="pt-12 border-t border-white/5">
                <h2 className="text-xl font-black text-white uppercase tracking-tight italic mb-8">Railing Details</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <label className="flex items-center gap-4 p-5 bg-white/5 border border-white/10 rounded-2xl hover:bg-white/10 cursor-pointer transition-all group">
                    <div className="relative flex items-center justify-center">
                      <input 
                        type="checkbox" 
                        checked={buildDetails.railing.included}
                        onChange={e => updateBuildDetail('railing', 'included', e.target.checked)}
                        className="peer w-6 h-6 rounded-lg border-white/20 bg-white/5 text-emerald-500 focus:ring-emerald-500/50 transition-all cursor-pointer appearance-none border"
                      />
                      <div className="absolute opacity-0 peer-checked:opacity-100 pointer-events-none transition-opacity">
                        <div className="w-3 h-3 bg-emerald-500 rounded-sm" />
                      </div>
                    </div>
                    <span className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] group-hover:text-white transition-colors">Railing Included</span>
                  </label>
                  {buildDetails.railing.included && (
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-gray-600 uppercase tracking-[0.2em] ml-1">Railing Type</label>
                      <input 
                        type="text" 
                        value={buildDetails.railing.type}
                        onChange={e => updateBuildDetail('railing', 'type', e.target.value)}
                        className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-sm font-bold text-white focus:outline-none focus:border-emerald-500 transition-all placeholder:text-gray-800"
                        placeholder="e.g. Aluminum w/ Glass, Wood"
                      />
                    </div>
                  )}
                </div>
              </section>
            </div>
          )}

          {activeSection === 'stairs' && (
            <div className="space-y-12">
              <section>
                <h2 className="text-xl font-black text-white uppercase tracking-tight italic mb-8">Stairs & Access</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <label className="flex items-center gap-4 p-5 bg-white/5 border border-white/10 rounded-2xl hover:bg-white/10 cursor-pointer transition-all group md:col-span-2">
                    <div className="relative flex items-center justify-center">
                      <input 
                        type="checkbox" 
                        checked={buildDetails.stairs.included}
                        onChange={e => updateBuildDetail('stairs', 'included', e.target.checked)}
                        className="peer w-6 h-6 rounded-lg border-white/20 bg-white/5 text-emerald-500 focus:ring-emerald-500/50 transition-all cursor-pointer appearance-none border"
                      />
                      <div className="absolute opacity-0 peer-checked:opacity-100 pointer-events-none transition-opacity">
                        <div className="w-3 h-3 bg-emerald-500 rounded-sm" />
                      </div>
                    </div>
                    <span className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] group-hover:text-white transition-colors">Stairs Included</span>
                  </label>
                  {buildDetails.stairs.included && (
                    <>
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-gray-600 uppercase tracking-[0.2em] ml-1">Stair Style</label>
                        <input 
                          type="text" 
                          value={buildDetails.stairs.style}
                          onChange={e => updateBuildDetail('stairs', 'style', e.target.value)}
                          className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-sm font-bold text-white focus:outline-none focus:border-emerald-500 transition-all placeholder:text-gray-800"
                          placeholder="e.g. Wrap-around, Box"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-gray-600 uppercase tracking-[0.2em] ml-1">Stair Material</label>
                        <input 
                          type="text" 
                          value={buildDetails.stairs.type}
                          onChange={e => updateBuildDetail('stairs', 'type', e.target.value)}
                          className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-sm font-bold text-white focus:outline-none focus:border-emerald-500 transition-all placeholder:text-gray-800"
                        />
                      </div>
                    </>
                  )}
                </div>
              </section>

              <section className="pt-12 border-t border-white/5">
                <h2 className="text-xl font-black text-white uppercase tracking-tight italic mb-8">Skirting & Under-Deck</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <label className="flex items-center gap-4 p-5 bg-white/5 border border-white/10 rounded-2xl hover:bg-white/10 cursor-pointer transition-all group">
                    <div className="relative flex items-center justify-center">
                      <input 
                        type="checkbox" 
                        checked={buildDetails.skirting.included}
                        onChange={e => updateBuildDetail('skirting', 'included', e.target.checked)}
                        className="peer w-6 h-6 rounded-lg border-white/20 bg-white/5 text-emerald-500 focus:ring-emerald-500/50 transition-all cursor-pointer appearance-none border"
                      />
                      <div className="absolute opacity-0 peer-checked:opacity-100 pointer-events-none transition-opacity">
                        <div className="w-3 h-3 bg-emerald-500 rounded-sm" />
                      </div>
                    </div>
                    <span className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] group-hover:text-white transition-colors">Skirting Included</span>
                  </label>
                  {buildDetails.skirting.included && (
                    <>
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-gray-600 uppercase tracking-[0.2em] ml-1">Skirting Type</label>
                        <input 
                          type="text" 
                          value={buildDetails.skirting.type}
                          onChange={e => updateBuildDetail('skirting', 'type', e.target.value)}
                          className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-sm font-bold text-white focus:outline-none focus:border-emerald-500 transition-all placeholder:text-gray-800"
                          placeholder="e.g. Horizontal PVC, Lattice"
                        />
                      </div>
                      <label className="flex items-center gap-4 p-5 bg-white/5 border border-white/10 rounded-2xl hover:bg-white/10 cursor-pointer transition-all group md:col-span-2">
                        <div className="relative flex items-center justify-center">
                          <input 
                            type="checkbox" 
                            checked={buildDetails.skirting.trapDoor}
                            onChange={e => updateBuildDetail('skirting', 'trapDoor', e.target.checked)}
                            className="peer w-6 h-6 rounded-lg border-white/20 bg-white/5 text-emerald-500 focus:ring-emerald-500/50 transition-all cursor-pointer appearance-none border"
                          />
                          <div className="absolute opacity-0 peer-checked:opacity-100 pointer-events-none transition-opacity">
                            <div className="w-3 h-3 bg-emerald-500 rounded-sm" />
                          </div>
                        </div>
                        <span className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] group-hover:text-white transition-colors">Trap Door / Access Hatch</span>
                      </label>
                    </>
                  )}
                </div>
              </section>
            </div>
          )}

          {activeSection === 'extras' && (
            <div className="space-y-12">
              <section>
                <h2 className="text-xl font-black text-white uppercase tracking-tight italic mb-8">Electrical & Lighting</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <label className="flex items-center gap-4 p-5 bg-white/5 border border-white/10 rounded-2xl hover:bg-white/10 cursor-pointer transition-all group">
                    <div className="relative flex items-center justify-center">
                      <input 
                        type="checkbox" 
                        checked={buildDetails.electrical.lightingIncluded}
                        onChange={e => updateBuildDetail('electrical', 'lightingIncluded', e.target.checked)}
                        className="peer w-6 h-6 rounded-lg border-white/20 bg-white/5 text-emerald-500 focus:ring-emerald-500/50 transition-all cursor-pointer appearance-none border"
                      />
                      <div className="absolute opacity-0 peer-checked:opacity-100 pointer-events-none transition-opacity">
                        <div className="w-3 h-3 bg-emerald-500 rounded-sm" />
                      </div>
                    </div>
                    <span className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] group-hover:text-white transition-colors">Lighting Included</span>
                  </label>
                  {buildDetails.electrical.lightingIncluded && (
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-gray-600 uppercase tracking-[0.2em] ml-1">Lighting Type</label>
                      <input 
                        type="text" 
                        value={buildDetails.electrical.lightingType}
                        onChange={e => updateBuildDetail('electrical', 'lightingType', e.target.value)}
                        className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-sm font-bold text-white focus:outline-none focus:border-emerald-500 transition-all placeholder:text-gray-800"
                        placeholder="e.g. In-deck, Post caps"
                      />
                    </div>
                  )}
                  <div className="col-span-1 md:col-span-2 space-y-2">
                    <label className="text-[10px] font-black text-gray-600 uppercase tracking-[0.2em] ml-1">Rough-In Notes</label>
                    <textarea 
                      value={buildDetails.electrical.roughInNotes}
                      onChange={e => updateBuildDetail('electrical', 'roughInNotes', e.target.value)}
                      rows={3}
                      className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-sm font-medium text-white focus:outline-none focus:border-emerald-500 transition-all placeholder:text-gray-800 leading-relaxed"
                    />
                  </div>
                </div>
              </section>

              <section className="pt-12 border-t border-white/5">
                <h2 className="text-xl font-black text-white uppercase tracking-tight italic mb-8">Custom Features & Notes</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <label className="flex items-center gap-4 p-5 bg-white/5 border border-white/10 rounded-2xl hover:bg-white/10 cursor-pointer transition-all group">
                    <div className="relative flex items-center justify-center">
                      <input 
                        type="checkbox" 
                        checked={buildDetails.features.privacyWall}
                        onChange={e => updateBuildDetail('features', 'privacyWall', e.target.checked)}
                        className="peer w-6 h-6 rounded-lg border-white/20 bg-white/5 text-emerald-500 focus:ring-emerald-500/50 transition-all cursor-pointer appearance-none border"
                      />
                      <div className="absolute opacity-0 peer-checked:opacity-100 pointer-events-none transition-opacity">
                        <div className="w-3 h-3 bg-emerald-500 rounded-sm" />
                      </div>
                    </div>
                    <span className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] group-hover:text-white transition-colors">Privacy Wall Included</span>
                  </label>
                  {buildDetails.features.privacyWall && (
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-gray-600 uppercase tracking-[0.2em] ml-1">Privacy Wall Type</label>
                      <input 
                        type="text" 
                        value={buildDetails.features.privacyWallType}
                        onChange={e => updateBuildDetail('features', 'privacyWallType', e.target.value)}
                        className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-sm font-bold text-white focus:outline-none focus:border-emerald-500 transition-all placeholder:text-gray-800"
                      />
                    </div>
                  )}
                  <div className="col-span-1 md:col-span-2 space-y-2">
                    <label className="text-[10px] font-black text-gray-600 uppercase tracking-[0.2em] ml-1">Custom Build Notes</label>
                    <textarea 
                      value={buildDetails.features.customNotes}
                      onChange={e => updateBuildDetail('features', 'customNotes', e.target.value)}
                      rows={4}
                      className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-sm font-medium text-white focus:outline-none focus:border-emerald-500 transition-all placeholder:text-gray-800 leading-relaxed"
                      placeholder="Any other specific build details or customer requests..."
                    />
                  </div>
                </div>
              </section>
            </div>
          )}

          {/* Navigation Buttons */}
          <div className="mt-12 pt-12 border-t border-white/5 flex justify-between items-center">
            <button
              onClick={() => {
                const currentIndex = sections.findIndex(s => s.id === activeSection);
                if (currentIndex > 0) setActiveSection(sections[currentIndex - 1].id);
              }}
              disabled={activeSection === 'basic'}
              className="px-8 py-4 rounded-2xl text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] hover:bg-white/5 hover:text-white disabled:opacity-20 disabled:hover:bg-transparent transition-all active:scale-95 flex items-center gap-3"
            >
              <ArrowLeft className="w-4 h-4" />
              Previous Section
            </button>
            <button
              onClick={() => {
                const currentIndex = sections.findIndex(s => s.id === activeSection);
                if (currentIndex < sections.length - 1) {
                  setActiveSection(sections[currentIndex + 1].id);
                } else {
                  handleSave();
                }
              }}
              className="bg-white text-black px-10 py-4 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] hover:bg-emerald-500 hover:text-white transition-all active:scale-95 shadow-2xl shadow-emerald-500/10 flex items-center gap-3"
            >
              {activeSection === 'extras' ? (
                <>
                  <Save className="w-4 h-4" />
                  Save Master Record
                </>
              ) : (
                'Next Section'
              )}
            </button>
          </div>
        </main>
      </div>
    </div>
  );
};

export default NewJobIntakeView;
