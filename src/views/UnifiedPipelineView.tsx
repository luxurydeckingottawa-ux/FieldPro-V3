import React, { useState, useMemo, useRef } from 'react';
import { Job, PipelineStage } from '../types';
import { PIPELINE_STAGES } from '../constants';
import { getJobIssues } from '../utils/issueLogic';
import { calculateEngagementTier } from '../utils/engagementScoring';
import {
  Search, Plus, ChevronRight, AlertTriangle,
  MapPin, User, DollarSign, Calendar, FileText,
  CircleDot, Phone, Mail, LayoutGrid, List,
  GripVertical, Users, Briefcase, TrendingUp, Zap, Calculator
} from 'lucide-react';

interface UnifiedPipelineViewProps {
  jobs: Job[];
  onSelectJob: (job: Job) => void;
  onNewJob: (initialStage: PipelineStage) => void;
  onOpenEstimator: () => void;
  onUpdatePipelineStage?: (jobId: string, newStage: PipelineStage) => void;
  onAutomationSettings?: () => void;
}

// Pipeline board definitions — lead stages aligned with drip campaign schedule.
// InstaQuote leads (from the website calculator) get their OWN top-level
// sub-board (see INSTAQUOTE_COLUMNS below) — they're treated differently
// from generic "request a quote" leads (warmer drip, different intake
// nurture). Don't put INSTAQUOTE_LEAD in this array.
const LEAD_COLUMNS = [
  { id: PipelineStage.LEAD_IN,         label: 'New Lead · D0'    },
  { id: PipelineStage.FIRST_CONTACT,   label: '1st Contact · D1' },
  { id: PipelineStage.SECOND_CONTACT,  label: '2nd Contact · D3' },
  { id: PipelineStage.THIRD_CONTACT,   label: '3rd Contact · D7' },
  { id: PipelineStage.LEAD_ON_HOLD,    label: 'Re-Engage · D30'  },
  { id: PipelineStage.LEAD_WON,        label: 'Won'              },
  { id: PipelineStage.LEAD_LOST,       label: 'Lead Lost'        },
];

// InstaQuote Nurture board — 11 stages mirror the 7-touch educational drip
// described in the InstaQuote Nurture Campaign Master doc. Leads enter
// at INSTAQUOTE_LEAD via /api/instaquote-lead and auto-progress as each
// scheduled touch fires. Won/Closed are terminal exit stages.
const INSTAQUOTE_COLUMNS = [
  { id: PipelineStage.INSTAQUOTE_LEAD,     label: 'New · PDF Sent'        },
  { id: PipelineStage.INSTAQUOTE_TOUCH_1,  label: 'Touch 1 · Day 2'       },
  { id: PipelineStage.INSTAQUOTE_TOUCH_2,  label: 'Touch 2 · Day 5'       },
  { id: PipelineStage.INSTAQUOTE_TOUCH_3,  label: 'Touch 3 · Day 10'      },
  { id: PipelineStage.INSTAQUOTE_TOUCH_4,  label: 'Touch 4 · Day 17'      },
  { id: PipelineStage.INSTAQUOTE_TOUCH_5,  label: 'Touch 5 · Day 26'      },
  { id: PipelineStage.INSTAQUOTE_TOUCH_6,  label: 'Touch 6 · Day 38'      },
  { id: PipelineStage.INSTAQUOTE_TOUCH_7,  label: 'Touch 7 · Day 52'      },
  { id: PipelineStage.INSTAQUOTE_LONG_TERM,label: 'Long-Term Nurture'     },
  { id: PipelineStage.INSTAQUOTE_WON,      label: 'Won · Booked'          },
  { id: PipelineStage.INSTAQUOTE_CLOSED,   label: 'Closed · Cold'         },
];

const ESTIMATE_COLUMNS = [
  { id: PipelineStage.EST_UNSCHEDULED, label: 'Unscheduled' },
  { id: PipelineStage.EST_SCHEDULED, label: 'Scheduled' },
  { id: PipelineStage.EST_IN_PROGRESS, label: 'In Progress' },
  { id: PipelineStage.EST_COMPLETED, label: 'Completed' },
  { id: PipelineStage.EST_SENT, label: 'Sent' },
  { id: PipelineStage.EST_ON_HOLD, label: 'On Hold' },
  { id: PipelineStage.EST_APPROVED, label: 'Approved' },
  { id: PipelineStage.EST_REJECTED, label: 'Rejected' },
];

const JOB_COLUMNS = PIPELINE_STAGES;

type BoardType = 'instaquote' | 'leads' | 'estimates' | 'jobs';
type ViewMode = 'board' | 'table';

const UnifiedPipelineView: React.FC<UnifiedPipelineViewProps> = ({
  jobs, onSelectJob, onNewJob, onOpenEstimator, onUpdatePipelineStage, onAutomationSettings
}) => {
  const [activeBoard, setActiveBoard] = useState<BoardType>('instaquote');
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState<ViewMode>('board');
  const [draggedJobId, setDraggedJobId] = useState<string | null>(null);
  const [dragOverColumn, setDragOverColumn] = useState<string | null>(null);

  // Determine which columns to show based on active board
  const columns = useMemo(() => {
    switch (activeBoard) {
      case 'instaquote': return INSTAQUOTE_COLUMNS;
      case 'leads': return LEAD_COLUMNS;
      case 'estimates': return ESTIMATE_COLUMNS;
      case 'jobs': return JOB_COLUMNS;
      default: return LEAD_COLUMNS;
    }
  }, [activeBoard]);

  // Filter jobs for the active board
  const boardJobs = useMemo(() => {
    const instaquoteStageIds = INSTAQUOTE_COLUMNS.map(c => c.id);
    const leadStageIds = LEAD_COLUMNS.map(c => c.id);
    const estimateStageIds = ESTIMATE_COLUMNS.map(c => c.id);
    const jobStageIds = PIPELINE_STAGES.map(s => s.id);

    let filtered = jobs;
    if (activeBoard === 'instaquote') {
      filtered = jobs.filter(j => instaquoteStageIds.includes(j.pipelineStage));
    } else if (activeBoard === 'leads') {
      filtered = jobs.filter(j => leadStageIds.includes(j.pipelineStage));
    } else if (activeBoard === 'estimates') {
      filtered = jobs.filter(j => estimateStageIds.includes(j.pipelineStage));
    } else {
      filtered = jobs.filter(j => jobStageIds.includes(j.pipelineStage));
    }

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(j =>
        (j.clientName || '').toLowerCase().includes(term) ||
        (j.jobNumber || '').toLowerCase().includes(term) ||
        (j.projectAddress || '').toLowerCase().includes(term)
      );
    }

    return filtered;
  }, [jobs, activeBoard, searchTerm]);

  const getColumnJobs = (columnId: string) => {
    return boardJobs.filter(j => j.pipelineStage === columnId);
  };

  const getColumnTotal = (columnId: string) => {
    return getColumnJobs(columnId).reduce((sum, j) => sum + (j.totalAmount || j.estimateAmount || 0), 0);
  };

  const fmt = (n: number) => {
    if (n === 0) return '$0.00';
    return n >= 1000 ? `$${(n / 1000).toFixed(n >= 10000 ? 0 : 1)}k` : `$${n.toLocaleString()}`;
  };

  const totalValue = boardJobs.reduce((sum, j) => sum + (j.totalAmount || j.estimateAmount || 0), 0);

  // Drag and drop handlers
  const handleDragStart = (e: React.DragEvent, jobId: string) => {
    setDraggedJobId(jobId);
    e.dataTransfer.effectAllowed = 'move';
    // Add a drag image class
    const el = e.currentTarget as HTMLElement;
    el.style.opacity = '0.5';
  };

  const handleDragEnd = (e: React.DragEvent) => {
    const el = e.currentTarget as HTMLElement;
    el.style.opacity = '1';
    setDraggedJobId(null);
    setDragOverColumn(null);
  };

  const handleDragOver = (e: React.DragEvent, columnId: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverColumn(columnId);
  };

  const handleDragLeave = () => {
    setDragOverColumn(null);
  };

  const handleDrop = (e: React.DragEvent, columnId: string) => {
    e.preventDefault();
    setDragOverColumn(null);
    if (draggedJobId && onUpdatePipelineStage) {
      onUpdatePipelineStage(draggedJobId, columnId as PipelineStage);
    }
    setDraggedJobId(null);
  };

  const sidebarItems: { id: BoardType; label: string; icon: React.ReactNode; count: number }[] = [
    {
      id: 'instaquote',
      label: 'Leads · InstaQuote',
      icon: <Calculator className="w-4 h-4" />,
      count: jobs.filter(j => INSTAQUOTE_COLUMNS.some(c => c.id === j.pipelineStage)).length
    },
    {
      id: 'leads',
      label: 'Leads',
      icon: <TrendingUp className="w-4 h-4" />,
      count: jobs.filter(j => LEAD_COLUMNS.some(c => c.id === j.pipelineStage)).length
    },
    {
      id: 'estimates',
      label: 'Estimates',
      icon: <FileText className="w-4 h-4" />,
      count: jobs.filter(j => ESTIMATE_COLUMNS.some(c => c.id === j.pipelineStage)).length
    },
    {
      id: 'jobs',
      label: 'Jobs',
      icon: <Briefcase className="w-4 h-4" />,
      count: jobs.filter(j => PIPELINE_STAGES.some(s => s.id === j.pipelineStage)).length
    },
  ];

  return (
    <div className="flex h-[calc(100vh-80px)] bg-[var(--bg-secondary)] overflow-hidden">
      {/* Sidebar */}
      <div className="w-52 bg-[var(--bg-primary)] border-r border-[var(--border-color)] flex flex-col shrink-0">
        <div className="p-4 border-b border-[var(--border-color)]">
          <h2 className="text-xs font-black text-[var(--text-primary)] uppercase tracking-widest">Pipeline</h2>
        </div>

        <div className="flex-1 py-2">
          {sidebarItems.map(item => {
            const isActive = activeBoard === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveBoard(item.id)}
                className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-all ${
                  isActive 
                    ? 'bg-[var(--brand-gold)]/10 text-[var(--brand-gold)] dark:text-[var(--brand-gold-light)] border-l-2 border-[var(--brand-gold)]' 
                    : 'text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)] hover:text-[var(--text-primary)] border-l-2 border-transparent'
                }`}
              >
                <span className={isActive ? 'text-[var(--brand-gold)]' : 'opacity-50'}>{item.icon}</span>
                <span className="text-sm font-semibold flex-1">{item.label}</span>
                {item.count > 0 && (
                  <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded min-w-[20px] text-center ${
                    isActive ? 'bg-[var(--brand-gold)]/20 text-[var(--brand-gold)] dark:text-[var(--brand-gold-light)]' : 'bg-[var(--bg-secondary)] text-[var(--text-secondary)]'
                  }`}>{item.count}</span>
                )}
              </button>
            );
          })}
        </div>

      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top Bar */}
        <div className="px-6 py-4 border-b border-[var(--border-color)] bg-[var(--bg-primary)] flex items-center justify-between shrink-0">
          <div className="flex items-center gap-4">
            <div>
              <div className="text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-widest">
                Pipeline &gt; {
                  activeBoard === 'instaquote' ? 'Leads · InstaQuote'
                  : activeBoard.charAt(0).toUpperCase() + activeBoard.slice(1)
                }
              </div>
              <h1 className="text-lg font-black text-[var(--text-primary)]">
                {activeBoard === 'instaquote' ? 'Leads · InstaQuote'
                  : activeBoard === 'leads' ? 'Leads'
                  : activeBoard === 'estimates' ? 'Estimates'
                  : 'Jobs'}
              </h1>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {onAutomationSettings && (
              <button
                onClick={onAutomationSettings}
                className="flex items-center gap-1.5 px-3 py-2 border border-[var(--border-color)] text-[var(--text-secondary)] rounded-lg text-xs font-bold hover:text-[var(--brand-gold)] hover:border-[var(--brand-gold)]/30 transition-all"
                title="Automation Settings"
              >
                <Zap className="w-3.5 h-3.5" /> Automations
              </button>
            )}
            <button
              onClick={() => {
                const stageMap: Record<BoardType, PipelineStage> = {
                  instaquote: PipelineStage.INSTAQUOTE_LEAD,
                  leads: PipelineStage.LEAD_IN,
                  estimates: PipelineStage.EST_UNSCHEDULED,
                  jobs: PipelineStage.JOB_SOLD
                };
                onNewJob(stageMap[activeBoard]);
              }}
              className="flex items-center gap-2 px-4 py-2 bg-[var(--brand-gold)] text-black rounded-lg text-xs font-black uppercase tracking-wider hover:opacity-90 transition-all active:scale-[0.97] shrink-0"
            >
              <Plus className="w-3.5 h-3.5" />
              {activeBoard === 'instaquote' ? 'New InstaQuote'
                : activeBoard === 'leads' ? 'New Lead'
                : activeBoard === 'estimates' ? 'New Estimate'
                : 'New Job'}
            </button>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-secondary)]" />
              <input
                type="text"
                placeholder={`Search by ${
                  activeBoard === 'jobs' ? 'Job'
                  : activeBoard === 'leads' ? 'Lead'
                  : activeBoard === 'instaquote' ? 'InstaQuote'
                  : 'Estimate'
                } #`}
                className="bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-lg py-2 pl-9 pr-4 text-sm focus:outline-none focus:border-[var(--brand-gold)]/50 w-64 transition-all text-[var(--text-primary)]"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="flex bg-[var(--bg-secondary)] p-0.5 rounded-lg border border-[var(--border-color)]">
              <button
                onClick={() => setViewMode('board')}
                className={`px-3 py-1.5 rounded text-xs font-bold transition-all ${
                  viewMode === 'board' ? 'bg-[var(--bg-primary)] shadow-sm text-[var(--text-primary)]' : 'text-[var(--text-secondary)]'
                }`}
              >
                Board
              </button>
              <button
                onClick={() => setViewMode('table')}
                className={`px-3 py-1.5 rounded text-xs font-bold transition-all ${
                  viewMode === 'table' ? 'bg-[var(--bg-primary)] shadow-sm text-[var(--text-primary)]' : 'text-[var(--text-secondary)]'
                }`}
              >
                Table
              </button>
            </div>
          </div>
        </div>

        {/* Board View */}
        {viewMode === 'board' ? (
          <div className="flex-1 overflow-x-auto overflow-y-hidden bg-[var(--bg-secondary)]">
            <div className="flex h-full p-4 gap-0" style={{ minWidth: `${columns.length * 240}px` }}>
              {columns.map((col, colIndex) => {
                const colJobs = getColumnJobs(col.id);
                const colTotal = getColumnTotal(col.id);
                const isDragOver = dragOverColumn === col.id;

                return (
                  <div
                    key={col.id}
                    className={`flex flex-col w-[235px] shrink-0 border-r border-[var(--border-color)] transition-all ${
                      isDragOver ? 'bg-[var(--brand-gold)]/10' : colIndex % 2 === 0 ? 'bg-[var(--bg-primary)]/30' : 'bg-transparent'
                    }`}
                    onDragOver={(e) => handleDragOver(e, col.id)}
                    onDragLeave={handleDragLeave}
                    onDrop={(e) => handleDrop(e, col.id)}
                  >
                    {/* Column Header */}
                    <div className="px-3 py-3 border-b border-[var(--border-color)] bg-[var(--bg-primary)]/60">
                      <div className="flex items-center justify-between">
                        <h3 className="text-sm font-bold text-[var(--text-primary)]">{col.label}</h3>
                        <span className="text-xs font-bold text-[var(--text-secondary)] bg-[var(--bg-secondary)] px-1.5 py-0.5 rounded">
                          {colJobs.length}
                        </span>
                      </div>
                      <span className="text-[11px] text-[var(--text-secondary)]">{fmt(colTotal)} total</span>
                    </div>

                    {/* Column Cards */}
                    <div className="flex-1 overflow-y-auto px-2 pb-4 space-y-2">
                      {colJobs.map(job => (
                        <KanbanCard
                          key={job.id}
                          job={job}
                          onClick={() => onSelectJob(job)}
                          onDragStart={(e) => handleDragStart(e, job.id)}
                          onDragEnd={handleDragEnd}
                        />
                      ))}
                      {colJobs.length === 0 && (
                        <div className="py-8 text-center">
                          <div className="text-[var(--text-secondary)] opacity-30 text-xs">No items</div>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          /* Table View */
          <div className="flex-1 overflow-auto p-6">
            <div className="bg-[var(--bg-primary)] rounded-xl border border-[var(--border-color)] overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-[var(--border-color)]">
                    <th className="text-left px-4 py-3 text-[10px] font-black text-[var(--text-secondary)] uppercase tracking-widest">#</th>
                    <th className="text-left px-4 py-3 text-[10px] font-black text-[var(--text-secondary)] uppercase tracking-widest">Client</th>
                    <th className="text-left px-4 py-3 text-[10px] font-black text-[var(--text-secondary)] uppercase tracking-widest">Amount</th>
                    <th className="text-left px-4 py-3 text-[10px] font-black text-[var(--text-secondary)] uppercase tracking-widest">Stage</th>
                    <th className="text-left px-4 py-3 text-[10px] font-black text-[var(--text-secondary)] uppercase tracking-widest">Assigned</th>
                    <th className="text-left px-4 py-3 text-[10px] font-black text-[var(--text-secondary)] uppercase tracking-widest">Updated</th>
                  </tr>
                </thead>
                <tbody>
                  {boardJobs.map(job => {
                    const amount = job.totalAmount || job.estimateAmount || 0;
                    const stageLabel = columns.find(c => c.id === job.pipelineStage)?.label || job.pipelineStage;
                    return (
                      <tr
                        key={job.id}
                        onClick={() => onSelectJob(job)}
                        className="border-b border-[var(--border-color)] hover:bg-[var(--brand-gold)]/5 cursor-pointer transition-all"
                      >
                        <td className="px-4 py-3 text-xs font-bold text-[var(--brand-gold)]">{job.jobNumber}</td>
                        <td className="px-4 py-3">
                          <div className="text-sm font-bold text-[var(--text-primary)]">{job.clientName || 'Unnamed'}</div>
                          {job.projectAddress && <div className="text-xs text-[var(--text-secondary)] truncate max-w-[200px]">{job.projectAddress}</div>}
                        </td>
                        <td className="px-4 py-3 text-sm font-bold text-[var(--text-primary)]">{amount > 0 ? `$${amount.toLocaleString()}` : '$0.00'}</td>
                        <td className="px-4 py-3">
                          <span className="text-[10px] font-bold px-2 py-1 rounded bg-[var(--brand-gold)]/10 text-[var(--brand-gold)] uppercase tracking-wider">{stageLabel}</span>
                        </td>
                        <td className="px-4 py-3 text-xs text-[var(--text-secondary)]">{job.assignedCrewOrSubcontractor || 'Unassigned'}</td>
                        <td className="px-4 py-3 text-xs text-[var(--text-secondary)]">
                          {job.updatedAt ? new Date(job.updatedAt).toLocaleDateString('en-CA', { month: 'short', day: 'numeric' }) : '-'}
                        </td>
                      </tr>
                    );
                  })}
                  {boardJobs.length === 0 && (
                    <tr>
                      <td colSpan={6} className="px-4 py-12 text-center text-sm text-[var(--text-secondary)]">
                        No {activeBoard} found. Click "New" to get started.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// Kanban Card Component
const KanbanCard: React.FC<{
  job: Job;
  onClick: () => void;
  onDragStart: (e: React.DragEvent) => void;
  onDragEnd: (e: React.DragEvent) => void;
}> = ({ job, onClick, onDragStart, onDragEnd }) => {
  const issues = getJobIssues(job);
  const hasWarnings = issues.some(i => i.type === 'error' || i.type === 'warning');
  const amount = job.totalAmount || job.estimateAmount || 0;

  return (
    <div
      draggable
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onClick={onClick}
      className={`bg-[var(--bg-primary)] rounded-xl border border-[var(--border-color)] p-3.5 cursor-pointer hover:border-[var(--brand-gold)]/40 hover:shadow-md transition-all group ${
        hasWarnings ? 'border-l-2 border-l-amber-500' : ''
      }`}
    >
      <div className="flex items-start justify-between mb-2">
        <div className="min-w-0 flex-1">
          <div className="text-[10px] font-bold text-[var(--text-secondary)] mb-0.5">
            {job.jobNumber}
          </div>
          <h4 className="text-sm font-bold text-[var(--text-primary)] truncate group-hover:text-[var(--brand-gold)] transition-colors">
            {job.clientName || 'Unnamed'}
          </h4>
          {job.projectAddress && (
            <p className="text-[10px] text-[var(--text-secondary)] truncate mt-0.5">{job.projectAddress}</p>
          )}
        </div>
        <div className="flex items-center gap-1 shrink-0">
          {(() => {
            const { tier } = calculateEngagementTier(job.portalEngagement);
            const styles: Record<string, string> = {
              HOT: 'text-amber-500 bg-amber-500/10 border-amber-500/20',
              WARM: 'text-blue-500 bg-blue-500/10 border-blue-500/20',
              COOL: 'text-purple-500 bg-purple-500/10 border-purple-500/20',
              COLD: 'text-gray-400 bg-gray-500/10 border-gray-500/20',
            };
            return job.portalEngagement ? (
              <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded border ${styles[tier]}`}>{tier}</span>
            ) : null;
          })()}
          <GripVertical className="w-4 h-4 text-[var(--text-secondary)] opacity-0 group-hover:opacity-40 transition-opacity cursor-grab" />
        </div>
      </div>

      <div className="text-sm font-bold text-[var(--text-primary)] mb-2">
        {amount > 0 ? `$${amount.toLocaleString()}` : '$0.00'}
      </div>

      {job.assignedCrewOrSubcontractor && (
        <div className="flex items-center gap-1.5 mb-2">
          <div className="w-5 h-5 rounded-full bg-[var(--brand-gold)]/20 flex items-center justify-center">
            <User className="w-3 h-3 text-[var(--brand-gold)]" />
          </div>
          <span className="text-xs text-[var(--text-secondary)]">{job.assignedCrewOrSubcontractor}</span>
        </div>
      )}

      {!job.assignedCrewOrSubcontractor && (
        <div className="flex items-center gap-1.5 mb-2">
          <div className="w-5 h-5 rounded-full bg-[var(--bg-secondary)] flex items-center justify-center">
            <User className="w-3 h-3 text-[var(--text-secondary)] opacity-30" />
          </div>
          <span className="text-xs text-[var(--text-secondary)] opacity-50">Unassigned</span>
        </div>
      )}

      {job.updatedAt && (
        <div className="text-[10px] text-[var(--text-secondary)] mt-2 pt-2 border-t border-[var(--border-color)] flex items-center justify-between">
          <span>Status updated {getTimeAgo(job.updatedAt)}</span>
          {job.dripCampaign?.status === 'active' && (
            <span className="flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-[var(--brand-gold)] animate-pulse" />
              <span className="text-[8px] font-bold text-[var(--brand-gold)]">Drip Active</span>
            </span>
          )}
        </div>
      )}

      {issues.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-2">
          {issues.slice(0, 2).map((issue, i) => (
            <span
              key={i}
              className={`text-[8px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider ${
                issue.type === 'error' ? 'bg-rose-500/10 text-rose-500' :
                issue.type === 'warning' ? 'bg-amber-500/10 text-amber-500' :
                'bg-blue-500/10 text-blue-500'
              }`}
            >
              {issue.label}
            </span>
          ))}
        </div>
      )}
    </div>
  );
};

// Helper to show "2 days ago" style timestamps
function getTimeAgo(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'just now';
  if (diffMins < 60) return `${diffMins} min${diffMins > 1 ? 's' : ''} ago`;
  if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
  if (diffDays < 30) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
  return `${Math.floor(diffDays / 30)} month${Math.floor(diffDays / 30) > 1 ? 's' : ''} ago`;
}

export default UnifiedPipelineView;
