import React, { useState, useEffect } from 'react';
import { Job, EstimatorIntake, SiteIntakeChecklist, MeasureSheet, SketchData, EstimatorPhoto } from '../types';
import { 
  ChevronLeft, 
  MapPin, 
  Phone, 
  Mail, 
  Navigation, 
  CheckCircle2, 
  Camera, 
  ClipboardList, 
  PenTool, 
  FileText,
  Save,
  AlertCircle,
  Play,
  Check,
  Trash2,
  Sparkles,
  Loader2,
  ArrowRight,
  RefreshCw
} from 'lucide-react';

import EstimatorSiteIntake from '../components/EstimatorSiteIntake';
import EstimatorMeasureSheet from '../components/EstimatorMeasureSheet';
import EstimatorSketchPad from '../components/EstimatorSketchPad';
import EstimatorAiAssist from '../components/EstimatorAiAssist';
import { safeSetItem, safeRemoveItem } from '../utils/storage';
import { validateIntakeCompleteness, generateHandoffSummary as generateRuleHandoffSummary } from '../utils/intakeValidation';

interface EstimatorWorkflowViewProps {
  job: Job;
  onBack: () => void;
  onSave: (intake: EstimatorIntake) => void;
  onPushToEstimating?: (intake: EstimatorIntake) => void;
}

const EstimatorWorkflowView: React.FC<EstimatorWorkflowViewProps> = ({ job, onBack, onSave, onPushToEstimating }) => {
  const [activeTab, setActiveTab] = useState<'info' | 'intake' | 'measures' | 'sketch' | 'photos' | 'notes' | 'ai' | 'summary'>('info');
  const [status, setStatus] = useState<'scheduled' | 'on_way' | 'in_progress' | 'completed'>('scheduled');
  const [isGeneratingHandoff, setIsGeneratingHandoff] = useState(false);
  
  const [intake, setIntake] = useState<EstimatorIntake>(() => {
    const defaultIntake: EstimatorIntake = {
      jobId: job?.id || '',
      checklist: {
        elevationConfirmed: false,
        elevationMeasurement: '',
        accessConfirmed: false,
        removalRequired: false,
        helicalPileAccess: false,
        gateOpeningMeasurement: '',
        obstaclesIdentified: false,
        marketingSource: '',
        marketingDetail: ''
      },
      measureSheet: {
        footingType: 'helical',
        footingCount: 0,
        namiFixCount: 0,
        ledgerLength: 0,
        deckSqft: 0,
        fasciaLf: 0,
        pictureFrameLf: 0,
        joistProtection: false,
        stairLf: 0,
        woodRailingLf: 0,
        aluminumPostCount: 0,
        aluminum6ftSections: 0,
        aluminum8ftSections: 0,
        aluminumStairSections: 0,
        aluminumStair8Sections: 0,
        glassSection6Count: 0,
        glassPanelsLf: 0,
        framelessSectionCount: 0,
        framelessLf: 0,
        drinkRailLf: 0,
        privacyWallLf: 0,
        privacyPostCount: 0,
        privacyScreenCount: 0,
        skirtingSqft: 0,
        removeDispose: false,
        demoSqft: 0,
        fabricStoneSqft: 0,
        riverWashSqft: 0,
        mulchSqft: 0,
        steppingStonesCount: 0,
        pergolaRequired: false,
        pergolaSize: '',
        lightingFixtures: 0,
        permitRequired: false,
        elevationNote: ''
      },
      sketch: {
        strokes: []
      },
      photos: [],
      notes: '',
      status: 'in_progress',
      updatedAt: new Date().toISOString()
    };

    if (!job?.id) {
      console.warn('No job ID provided to EstimatorWorkflowView');
      return defaultIntake;
    }

    try {
      const saved = localStorage.getItem(`estimator_intake_${job.id}`);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && typeof parsed === 'object') {
          // Ensure all required properties exist by merging with defaultIntake
          return {
            ...defaultIntake,
            ...parsed,
            checklist: { ...defaultIntake.checklist, ...(parsed.checklist || {}) },
            measureSheet: { ...defaultIntake.measureSheet, ...(parsed.measureSheet || {}) },
            sketch: { 
              ...defaultIntake.sketch, 
              ...(parsed.sketch || {}),
              strokes: Array.isArray(parsed.sketch?.strokes) ? parsed.sketch.strokes : defaultIntake.sketch.strokes
            },
            photos: Array.isArray(parsed.photos) ? parsed.photos : defaultIntake.photos,
          };
        }
      }
    } catch (e) {
      console.error("Failed to parse estimator intake for job:", job.id, e);
    }

    return defaultIntake;
  });

  const [saveError, setSaveError] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      const success = safeSetItem(`estimator_intake_${job.id}`, JSON.stringify(intake));
      setSaveError(!success);
    }, 1000);
    return () => clearTimeout(timer);
  }, [intake, job.id]);

  const handleClearCache = () => {
    if (window.confirm("This will clear all unsaved field data for this job. Are you sure?")) {
      safeRemoveItem(`estimator_intake_${job.id}`);
      window.location.reload();
    }
  };

  const handleUpdateAiInsights = (updates: Partial<EstimatorIntake['aiInsights']>) => {
    setIntake(prev => ({
      ...prev,
      aiInsights: {
        ...prev.aiInsights,
        ...updates
      }
    }));
  };

  const handleGenerateHandoff = () => {
    setIsGeneratingHandoff(true);
    try {
      const flags = validateIntakeCompleteness(intake);
      const summary = generateRuleHandoffSummary(intake);
      handleUpdateAiInsights({ 
        handoff: { 
          summary, 
          flags: flags.map(f => f.message),
          readyForOffice: flags.filter(f => f.severity === 'high').length === 0,
          generatedAt: new Date().toISOString()
        }
      });
      // Also update flags
      setIntake(prev => ({
        ...prev,
        aiInsights: {
          ...prev.aiInsights,
          flags,
          lastCheckedAt: new Date().toISOString()
        }
      }));
    } catch (error) {
      console.error("Validation failed:", error);
    } finally {
      setIsGeneratingHandoff(false);
    }
  };

  const handleUpdateChecklist = (id: string, value?: any) => {
    const key = id as keyof SiteIntakeChecklist;
    setIntake(prev => {
      if (!prev || !prev.checklist) return prev;
      const newValue = value !== undefined ? value : !prev.checklist[key];
      return {
        ...prev,
        checklist: {
          ...prev.checklist,
          [key]: newValue
        },
        updatedAt: new Date().toISOString()
      };
    });
  };

  const handleUpdateMeasures = (updates: Partial<MeasureSheet>) => {
    setIntake(prev => {
      if (!prev || !prev.measureSheet) return prev;
      return {
        ...prev,
        measureSheet: {
          ...prev.measureSheet,
          ...updates
        },
        updatedAt: new Date().toISOString()
      };
    });
  };

  const handleUpdateSketch = (updates: Partial<SketchData>) => {
    setIntake(prev => {
      if (!prev || !prev.sketch) return prev;
      return {
        ...prev,
        sketch: {
          ...prev.sketch,
          ...updates
        },
        updatedAt: new Date().toISOString()
      };
    });
  };

  const handleAddPhoto = () => {
    // Mock photo addition
    const newPhoto: EstimatorPhoto = {
      id: `photo-${Date.now()}`,
      url: `https://picsum.photos/seed/${Date.now()}/800/600`,
      category: 'site',
      timestamp: new Date().toISOString()
    };
    setIntake(prev => ({
      ...prev,
      photos: [...(prev.photos || []), newPhoto],
      updatedAt: new Date().toISOString()
    }));
  };

  const handleStatusChange = (newStatus: typeof status) => {
    setStatus(newStatus);
    if (newStatus === 'in_progress') {
      setActiveTab('intake');
    }
  };

  const handleReset = () => {
    // Use a custom confirm if possible, but for now standard confirm is okay if not in iframe
    // Since we are in an iframe, we should be careful. 
    // But the user is reporting a crash, so we need a way to reset.
    if (window.confirm('Are you sure you want to reset all intake data for this job? This cannot be undone.')) {
      safeRemoveItem(`estimator_intake_${job.id}`);
      window.location.reload();
    }
  };

  const isChecklistComplete = intake.checklist ? Object.values(intake.checklist).every(v => v) : false;


  return (
    <div className="flex flex-col h-full bg-[var(--bg-secondary)]">
      {/* Header */}
      <div className="bg-[var(--bg-primary)] p-4 border-b border-[var(--border-color)] sticky top-0 z-20">
        <div className="flex items-center justify-between mb-4">
          <button onClick={onBack} className="p-2 -ml-2 text-[var(--text-secondary)] hover:text-[var(--text-primary)]">
            <ChevronLeft className="w-6 h-6" />
          </button>
          <div className="text-center">
            <h2 className="font-bold text-[var(--text-primary)]">{job.clientName}</h2>
            <p className="text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-widest">{job.jobNumber}</p>
          </div>
          <div className="flex gap-1 -mr-2">
            <button 
              onClick={handleReset}
              className="p-2 text-rose-500 hover:text-rose-400"
              title="Reset Job Data"
            >
              <Trash2 className="w-6 h-6" />
            </button>
            <button 
              onClick={() => onSave(intake)}
              className="p-2 text-[var(--brand-gold)] hover:text-[var(--brand-gold)]"
              title="Save to Server"
            >
              <Save className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Appointment Status Bar */}
        <div className="flex gap-2">
          {status === 'scheduled' && (
            <button 
              onClick={() => handleStatusChange('on_way')}
              className="flex-1 bg-blue-600 text-white py-3 rounded-xl font-bold flex items-center justify-center gap-2 shadow-lg shadow-blue-600/20 active:scale-[0.98]"
            >
              <Navigation className="w-5 h-5" />
              On My Way
            </button>
          )}
          {status === 'on_way' && (
            <button 
              onClick={() => handleStatusChange('in_progress')}
              className="flex-1 bg-[var(--brand-gold)] text-white py-3 rounded-xl font-bold flex items-center justify-center gap-2 shadow-lg shadow-[var(--brand-gold)]/20 active:scale-[0.98]"
            >
              <Play className="w-5 h-5" />
              Start Estimate
            </button>
          )}
          {status === 'in_progress' && (
            <button 
              onClick={() => handleStatusChange('completed')}
              className="flex-1 bg-slate-900 text-white py-3 rounded-xl font-bold flex items-center justify-center gap-2 shadow-lg active:scale-[0.98]"
            >
              <CheckCircle2 className="w-5 h-5" />
              Finish Estimate
            </button>
          )}
          {status === 'completed' && (
            <div className="flex-1 bg-[var(--brand-gold)]/10 text-[var(--brand-gold)] py-3 rounded-xl font-bold flex items-center justify-center gap-2 border border-[var(--brand-gold)]/20">
              <Check className="w-5 h-5" />
              Estimate Completed
            </div>
          )}
        </div>
      </div>

      {/* Save Error Warning */}
      {saveError && (
        <div className="mx-4 mt-4 p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-center gap-3 text-rose-700">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <div className="flex-1">
            <p className="text-sm font-bold">Storage Full</p>
            <p className="text-xs opacity-80">Some data (sketches/photos) may not be saved. Try clearing old jobs.</p>
          </div>
          <button 
            onClick={handleClearCache}
            className="px-3 py-1 bg-rose-600 text-white text-[10px] font-bold uppercase rounded-lg shadow-sm"
          >
            Clear Cache
          </button>
        </div>
      )}

      {/* Tabs */}
      <div className="bg-[var(--bg-primary)] border-b border-[var(--border-color)] overflow-x-auto no-scrollbar">
        <div className="flex px-4">
          {[
            { id: 'info', label: 'Info', icon: AlertCircle },
            { id: 'intake', label: 'Intake', icon: ClipboardList },
            { id: 'measures', label: 'Measures', icon: ClipboardList },
            { id: 'sketch', label: 'Sketch', icon: PenTool },
            { id: 'photos', label: 'Photos', icon: Camera },
            { id: 'notes', label: 'Notes', icon: FileText },
            { id: 'ai', label: 'AI Assist', icon: Sparkles },
            { id: 'summary', label: 'Summary', icon: CheckCircle2 },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 px-4 py-4 text-xs font-bold uppercase tracking-widest border-b-2 transition-all whitespace-nowrap ${
                activeTab === tab.id 
                  ? 'border-[var(--brand-gold)] text-[var(--brand-gold)]' 
                  : 'border-transparent text-[var(--text-secondary)]'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4">
        
          {activeTab === 'info' && (
            <div
              key="info"
              
              
              
              className="space-y-6"
            >
              <div className="bg-[var(--bg-primary)] p-6 rounded-2xl border border-[var(--border-color)] shadow-sm">
                <h3 className="text-lg font-bold mb-4">Contact Information</h3>
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-[var(--bg-secondary)] rounded-xl flex items-center justify-center">
                      <Phone className="w-5 h-5 text-[var(--brand-gold)]" />
                    </div>
                    <div>
                      <p className="text-xs text-[var(--text-secondary)] font-bold uppercase tracking-widest">Phone</p>
                      <p className="text-[var(--text-primary)] font-medium">{job.clientPhone}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-[var(--bg-secondary)] rounded-xl flex items-center justify-center">
                      <Mail className="w-5 h-5 text-[var(--brand-gold)]" />
                    </div>
                    <div>
                      <p className="text-xs text-[var(--text-secondary)] font-bold uppercase tracking-widest">Email</p>
                      <p className="text-[var(--text-primary)] font-medium">{job.clientEmail}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-[var(--bg-secondary)] rounded-xl flex items-center justify-center">
                      <MapPin className="w-5 h-5 text-[var(--brand-gold)]" />
                    </div>
                    <div>
                      <p className="text-xs text-[var(--text-secondary)] font-bold uppercase tracking-widest">Address</p>
                      <p className="text-[var(--text-primary)] font-medium">{job.projectAddress}</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-[var(--bg-primary)] p-6 rounded-2xl border border-[var(--border-color)] shadow-sm">
                <h3 className="text-lg font-bold mb-4">Project Overview</h3>
                <p className="text-[var(--text-secondary)] text-sm leading-relaxed">
                  {job.scopeSummary}
                </p>
              </div>
            </div>
          )}

          {activeTab === 'intake' && (
            <div
              key="intake"
              
              
              
            >
              <EstimatorSiteIntake 
                data={intake.checklist}
                onUpdate={handleUpdateChecklist}
                onAddPhoto={handleAddPhoto}
              />
            </div>
          )}

          {activeTab === 'measures' && (
            <div
              key="measures"
              
              
              
            >
              <EstimatorMeasureSheet 
                data={intake.measureSheet}
                onChange={handleUpdateMeasures}
              />
            </div>
          )}

          {activeTab === 'sketch' && (
            <div
              key="sketch"
              
              
              
            >
              <EstimatorSketchPad 
                data={intake.sketch}
                onChange={handleUpdateSketch}
              />
            </div>
          )}

          {activeTab === 'photos' && (
            <div
              key="photos"
              
              
              
              className="space-y-4"
            >
              <div className="grid grid-cols-2 gap-4">
                {intake.photos.map((photo) => (
                  <div key={photo.id} className="relative aspect-square rounded-xl overflow-hidden border border-[var(--border-color)]">
                    <img src={photo.url} alt="Site" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                    <div className="absolute bottom-0 left-0 right-0 p-2 bg-black/50 text-white text-[10px] font-bold uppercase">
                      {photo.category}
                    </div>
                  </div>
                ))}
                <button 
                  onClick={handleAddPhoto}
                  className="aspect-square rounded-xl border-2 border-dashed border-[var(--border-color)] flex flex-col items-center justify-center gap-2 text-[var(--text-secondary)] hover:border-[var(--brand-gold)] hover:text-[var(--brand-gold)] transition-all"
                >
                  <Camera className="w-8 h-8" />
                  <span className="text-xs font-bold uppercase tracking-widest">Add Photo</span>
                </button>
              </div>
            </div>
          )}

          {activeTab === 'notes' && (
            <div
              key="notes"
              
              
              
            >
              <textarea
                value={intake.notes}
                onChange={(e) => setIntake(prev => ({ ...prev, notes: e.target.value }))}
                placeholder="Enter additional site notes, client preferences, or special instructions..."
                className="w-full h-64 p-4 bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-2xl focus:outline-none focus:ring-2 focus:ring-[var(--brand-gold)] transition-all text-[var(--text-primary)]"
              />
            </div>
          )}

          {activeTab === 'ai' && (
            <div
              key="ai"
              
              
              
            >
              <EstimatorAiAssist 
                intake={intake}
                onUpdateAiInsights={handleUpdateAiInsights}
              />
            </div>
          )}

          {activeTab === 'summary' && (
            <div
              key="summary"
              
              
              
              className="space-y-6"
            >
              <div className="bg-[var(--brand-gold)]/10 p-6 rounded-2xl border border-[var(--brand-gold)]/20 text-center">
                <div className="w-16 h-16 bg-[var(--brand-gold)] rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg">
                  <CheckCircle2 className="w-8 h-8 text-white" />
                </div>
                <h3 className="text-xl font-bold text-[var(--text-primary)] mb-2">Intake Complete</h3>
                <p className="text-[var(--text-secondary)] text-sm max-w-md mx-auto">
                  All field data has been captured and structured. This job is now ready for estimate preparation in the office.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-[var(--bg-primary)] p-5 rounded-2xl border border-[var(--border-color)] shadow-sm">
                  <h4 className="font-bold text-sm text-[var(--text-secondary)] uppercase tracking-widest mb-4">Readiness Checklist</h4>
                  <div className="space-y-3">
                    {[
                      { label: 'Site Intake Requirements', status: 'Complete' },
                      { label: 'Structured Quantities', status: 'Complete' },
                      { label: 'Project Sketch', status: 'Saved' },
                      { label: 'Site Photos', status: `${intake.photos.length} Attached` },
                      { label: 'Field Notes', status: intake.notes ? 'Captured' : 'None' }
                    ].map((item, i) => (
                      <div key={i} className="flex items-center justify-between py-2 border-b border-[var(--border-color)] last:border-0">
                        <span className="text-sm font-medium text-[var(--text-primary)]">{item.label}</span>
                        <span className="text-xs font-bold text-[var(--brand-gold)] bg-[var(--brand-gold)]/10 px-2 py-1 rounded-lg">{item.status}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="bg-[var(--bg-primary)] p-5 rounded-2xl border border-[var(--border-color)] shadow-sm">
                  <h4 className="font-bold text-sm text-[var(--text-secondary)] uppercase tracking-widest mb-4">Quantity Summary</h4>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-[var(--text-secondary)]">Deck Area:</span>
                      <span className="font-bold">{intake.measureSheet.deckSqft} sqft</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-[var(--text-secondary)]">Footing Count:</span>
                      <span className="font-bold">{intake.measureSheet.footingCount} ({intake.measureSheet.footingType})</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-[var(--text-secondary)]">Railing:</span>
                      <span className="font-bold">{intake.measureSheet.aluminumPostCount} posts / {intake.measureSheet.aluminum6ftSections + intake.measureSheet.aluminum8ftSections} sections</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-[var(--text-secondary)]">Stairs:</span>
                      <span className="font-bold">{intake.measureSheet.stairLf} lf</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* AI Handoff Summary */}
              <div className="bg-white p-6 rounded-3xl border border-[var(--border-color)] shadow-lg shadow-[var(--brand-gold)]/5 space-y-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-[var(--brand-gold)]">
                    <Sparkles className="w-6 h-6" />
                    <h3 className="text-lg font-bold">AI Estimate Handoff</h3>
                  </div>
                  <button
                    onClick={handleGenerateHandoff}
                    disabled={isGeneratingHandoff}
                    className="flex items-center gap-2 px-4 py-2 bg-[var(--brand-gold)] text-white rounded-xl text-sm font-bold hover:bg-[var(--brand-gold-dark)] transition-all disabled:opacity-50"
                  >
                    {isGeneratingHandoff ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <RefreshCw className="w-4 h-4" />
                    )}
                    {intake.aiInsights?.handoff ? 'Regenerate' : 'Generate Summary'}
                  </button>
                </div>

                {intake.aiInsights?.handoff ? (
                  <div className="space-y-6">
                    <div className="grid grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--text-secondary)]">Key Measurements</p>
                        <ul className="space-y-1">
                          {(intake.aiInsights.handoff.keyMeasurements || []).map((m, i) => (
                            <li key={`measure-${i}`} className="text-sm flex items-center gap-2">
                              <div className="w-1 h-1 bg-[var(--brand-gold)] rounded-full" />
                              {m}
                            </li>
                          ))}
                        </ul>
                      </div>
                      <div className="space-y-2">
                        <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--text-secondary)]">Site Conditions</p>
                        <ul className="space-y-1">
                          {(intake.aiInsights.handoff.siteConditions || []).map((c, i) => (
                            <li key={`condition-${i}`} className="text-sm flex items-center gap-2">
                              <div className="w-1 h-1 bg-[var(--brand-gold)] rounded-full" />
                              {c}
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--text-secondary)]">Constraints & Upgrades</p>
                      <div className="flex flex-wrap gap-2">
                        {(intake.aiInsights.handoff.constraints || []).map((c, i) => (
                          <span key={`constraint-${i}`} className="px-2 py-1 bg-rose-50 text-rose-700 text-[10px] font-bold uppercase rounded border border-rose-100">
                            {c}
                          </span>
                        ))}
                        {(intake.aiInsights.handoff.upgrades || []).map((u, i) => (
                          <span key={`upgrade-${i}`} className="px-2 py-1 bg-[var(--brand-gold)]/5 text-[#8B7520] text-[10px] font-bold uppercase rounded border border-[var(--brand-gold)]/10">
                            {u}
                          </span>
                        ))}
                      </div>
                    </div>

                    {(intake.aiInsights.handoff.missingItems?.length > 0) && (
                      <div className="p-4 bg-amber-50 border border-amber-100 rounded-2xl space-y-2">
                        <p className="text-[10px] font-bold uppercase tracking-widest text-amber-700 flex items-center gap-1">
                          <AlertCircle className="w-3 h-3" />
                          Missing Items to Verify
                        </p>
                        <ul className="space-y-1">
                          {(intake.aiInsights.handoff.missingItems || []).map((item, i) => (
                            <li key={`missing-${i}`} className="text-sm text-amber-900 flex items-center gap-2">
                              <div className="w-1 h-1 bg-amber-600 rounded-full" />
                              {item}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    <div className="pt-4 border-t border-[var(--border-color)] flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-12 h-2 bg-gray-100 rounded-full overflow-hidden text-[0px]">
                          <div 
                            className="h-full bg-[var(--brand-gold)] transition-all duration-1000" 
                            style={{ width: `${intake.aiInsights.handoff.overallCompletion}%` }}
                          />
                        </div>
                        <span className="text-[10px] font-bold text-[var(--brand-gold)] uppercase">
                          {intake.aiInsights.handoff.overallCompletion}% Complete
                        </span>
                      </div>
                      <button
                        onClick={() => {
                          onSave(intake);
                          handleStatusChange('completed');
                        }}
                        className="flex items-center gap-2 px-6 py-3 bg-slate-900 text-white rounded-xl font-bold hover:bg-slate-800 transition-all shadow-lg active:scale-[0.98]"
                      >
                        Submit to Office
                        <ArrowRight className="w-5 h-5" />
                      </button>
                      {onPushToEstimating && (
                        <button
                          onClick={() => {
                            onSave(intake);
                            onPushToEstimating(intake);
                          }}
                          className="flex items-center gap-2 px-6 py-3 bg-[var(--brand-gold)] text-white rounded-xl font-bold hover:bg-[var(--brand-gold)] transition-all shadow-lg active:scale-[0.98]"
                        >
                          Open in Estimator
                          <ArrowRight className="w-5 h-5" />
                        </button>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="p-12 border-2 border-dashed border-[var(--border-color)] rounded-3xl flex flex-col items-center text-center gap-4">
                    <Sparkles className="w-10 h-10 text-[var(--text-secondary)] opacity-20" />
                    <div>
                      <p className="font-bold text-[var(--text-primary)]">Ready for Handoff?</p>
                      <p className="text-sm text-[var(--text-secondary)]">Generate an AI summary to clean up your site data for the estimating team.</p>
                    </div>
                    <button
                      onClick={handleGenerateHandoff}
                      disabled={isGeneratingHandoff}
                      className="px-6 py-2 bg-[var(--brand-gold)] text-white rounded-xl text-sm font-bold hover:bg-[var(--brand-gold-dark)] transition-all disabled:opacity-50"
                    >
                      {isGeneratingHandoff ? 'Analyzing Site Data...' : 'Generate Handoff Summary'}
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}
        
      </div>

      {/* Footer Status */}
      <div className="bg-[var(--bg-primary)] p-4 border-t border-[var(--border-color)] flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className={`w-3 h-3 rounded-full ${isChecklistComplete ? 'bg-[var(--brand-gold)]' : 'bg-amber-500'}`} />
          <span className="text-xs font-bold text-[var(--text-secondary)] uppercase tracking-widest">
            {isChecklistComplete ? 'Checklist Complete' : 'Checklist Incomplete'}
          </span>
        </div>
        <div className="text-[10px] text-[var(--text-secondary)] font-medium">
          Last updated: {intake.updatedAt ? new Date(intake.updatedAt).toLocaleTimeString() : 'Never'}
        </div>
      </div>
    </div>
  );
};

export default EstimatorWorkflowView;
