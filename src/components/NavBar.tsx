import React, { useState, useRef, useEffect } from 'react';
import { User, Role } from '../types';
import { 
  LogOut, User as UserIcon, LayoutDashboard, BookOpen, 
  Calendar, Kanban, Sun, Moon, MessageSquare, Settings, Calculator,
  Plus, ChevronDown, UserPlus, ClipboardList, Briefcase, CalendarPlus, BarChart3
} from 'lucide-react';

interface NavBarProps {
  currentUser: User;
  view: string;
  theme: 'dark' | 'light';
  onNavigate: (view: string) => void;
  onLogout: () => void;
  onToggleTheme: () => void;
  onOpenEstimator: () => void;
  onNewLead?: () => void;
  onNewEstimateAppointment?: () => void;
  onNewJob?: () => void;
}

const NavBar: React.FC<NavBarProps> = ({ 
  currentUser, view, theme, onNavigate, onLogout, onToggleTheme, onOpenEstimator,
  onNewLead, onNewEstimateAppointment, onNewJob
}) => {
  const [showNewMenu, setShowNewMenu] = useState(false);
  const newMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (newMenuRef.current && !newMenuRef.current.contains(e.target as Node)) {
        setShowNewMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);
  const navButtonClass = (targetView: string | string[]) => {
    const isActive = Array.isArray(targetView) 
      ? targetView.includes(view) 
      : view === targetView;
    return `flex items-center gap-2 px-4 py-2 rounded-xl font-label transition-all h-10 ${
      isActive 
        ? 'bg-[var(--bg-primary)]/80 dark:bg-white/10 text-amber-600 dark:text-amber-400 shadow-lg border border-[var(--border-color)]' 
        : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--text-primary)]/5'
    }`;
  };

  return (
    <nav className="bg-[var(--bg-primary)] shadow-xl shadow-black/5 border-b border-[var(--border-color)] sticky top-0 z-50 transition-colors duration-300">
      <div className="max-w-7xl mx-auto flex items-center justify-between py-3 px-6">
        <div className="flex items-center gap-6">
          {/* Logo */}
          <button 
            onClick={() => onNavigate(currentUser.role === Role.ADMIN ? 'office-dashboard' : currentUser.role === Role.ESTIMATOR ? 'estimator-dashboard' : 'jobs')}
            className="flex items-center gap-3 group"
          >
            <div className="w-10 h-10 rounded-[0.75rem] flex items-center justify-center overflow-hidden bg-[var(--brand-black)] shadow-lg shadow-[var(--brand-gold)]/10 group-hover:shadow-[var(--brand-gold)]/25 transition-all group-hover:scale-105">
              <img src="/assets/logo-white.png" alt="Luxury Decking" className="w-8 h-8 object-contain" />
            </div>
            <div className="hidden sm:block">
              <h1 className="text-sm font-display leading-none">Field Pro</h1>
              <p className="font-label mt-0.5 leading-none text-[var(--brand-gold)]">Luxury Decking</p>
            </div>
          </button>

          {/* Theme Toggle */}
          <button 
            onClick={onToggleTheme}
            className="p-2.5 rounded-xl border border-[var(--border-color)] bg-[var(--bg-secondary)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-all hover:border-[var(--text-primary)]/20 active:scale-90 h-10 w-10 flex items-center justify-center"
            title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
          >
            {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </button>

          {/* New Dropdown - Admin/Estimator only */}
          {(currentUser.role === Role.ADMIN || currentUser.role === Role.ESTIMATOR) && (
            <div className="relative" ref={newMenuRef}>
              <button
                onClick={() => setShowNewMenu(!showNewMenu)}
                className="flex items-center gap-1.5 px-4 py-2.5 bg-[var(--brand-gold)] text-white rounded-xl text-xs font-bold hover:bg-[var(--brand-gold-light)] transition-all shadow-lg shadow-[var(--brand-gold)]/20 active:scale-95 h-10"
              >
                <Plus className="w-4 h-4" />
                <span className="hidden sm:inline">New</span>
                <ChevronDown className="w-3 h-3" />
              </button>
              {showNewMenu && (
                <div className="absolute top-full left-0 mt-2 w-52 bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-xl shadow-xl z-50 overflow-hidden">
                  {onNewLead && (
                    <button onClick={() => { onNewLead(); setShowNewMenu(false); }}
                      className="w-full flex items-center gap-3 px-4 py-3 text-sm font-medium text-[var(--text-primary)] hover:bg-[var(--brand-gold)]/5 transition-colors text-left">
                      <UserPlus className="w-4 h-4 text-[var(--brand-gold)]" /> New Lead
                    </button>
                  )}
                  {onNewEstimateAppointment && (
                    <button onClick={() => { onNewEstimateAppointment(); setShowNewMenu(false); }}
                      className="w-full flex items-center gap-3 px-4 py-3 text-sm font-medium text-[var(--text-primary)] hover:bg-[var(--brand-gold)]/5 transition-colors text-left border-t border-[var(--border-color)]">
                      <CalendarPlus className="w-4 h-4 text-[var(--brand-gold)]" /> Estimate Appointment
                    </button>
                  )}
                  <button onClick={() => { onOpenEstimator(); setShowNewMenu(false); }}
                    className="w-full flex items-center gap-3 px-4 py-3 text-sm font-medium text-[var(--text-primary)] hover:bg-[var(--brand-gold)]/5 transition-colors text-left border-t border-[var(--border-color)]">
                    <ClipboardList className="w-4 h-4 text-[var(--brand-gold)]" /> New Estimate
                  </button>
                  {onNewJob && (
                    <button onClick={() => { onNewJob(); setShowNewMenu(false); }}
                      className="w-full flex items-center gap-3 px-4 py-3 text-sm font-medium text-[var(--text-primary)] hover:bg-[var(--brand-gold)]/5 transition-colors text-left border-t border-[var(--border-color)]">
                      <Briefcase className="w-4 h-4 text-[var(--brand-gold)]" /> New Job
                    </button>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        <div className="flex items-center gap-3">
          {/* Field User Nav */}
          {(currentUser.role === Role.FIELD_EMPLOYEE || currentUser.role === Role.SUBCONTRACTOR) && (
            <div className="flex bg-[var(--text-primary)]/5 p-1 rounded-[1.25rem] border border-[var(--border-color)] shadow-inner h-12 items-center">
              <button onClick={() => onNavigate('jobs')} className={navButtonClass('jobs')}>
                <Kanban className="w-3.5 h-3.5" />
                <span className="hidden md:inline">My Jobs</span>
              </button>
              <button onClick={() => onNavigate('resources')} className={navButtonClass('resources')}>
                <BookOpen className="w-3.5 h-3.5" />
                <span className="hidden md:inline">Resources</span>
              </button>
            </div>
          )}

          {/* Estimator Nav */}
          {currentUser.role === Role.ESTIMATOR && (
            <button 
              onClick={() => onNavigate('estimator-dashboard')}
              className={navButtonClass(['estimator-dashboard', 'estimator-workflow'])}
            >
              <LayoutDashboard className="w-3.5 h-3.5" />
              <span className="hidden lg:inline">Dashboard</span>
            </button>
          )}

          {/* Admin Settings */}
          {currentUser.role === Role.ADMIN && (
            <button 
              onClick={() => onNavigate('user-management')}
              className={navButtonClass('user-management')}
            >
              <Settings className="w-3.5 h-3.5" />
              <span className="hidden lg:inline">Users</span>
            </button>
          )}

          {/* Admin Main Nav */}
          {currentUser.role === Role.ADMIN && (
            <div className="flex bg-[var(--text-primary)]/5 p-1 rounded-[1.25rem] border border-[var(--border-color)] shadow-inner h-12 items-center">
              <button onClick={() => onNavigate('office-pipeline')} className={navButtonClass(['office-pipeline', 'office-job-detail', 'estimate-detail'])}>
                <Kanban className="w-3.5 h-3.5" />
                <span className="hidden md:inline">Pipeline</span>
              </button>
              <button onClick={() => onNavigate('office-dashboard')} className={navButtonClass('office-dashboard')}>
                <LayoutDashboard className="w-3.5 h-3.5" />
                <span className="hidden md:inline">Dashboard</span>
              </button>
              <button onClick={() => onNavigate('scheduling')} className={navButtonClass('scheduling')}>
                <Calendar className="w-3.5 h-3.5" />
                <span className="hidden md:inline">Schedule</span>
              </button>
              <button onClick={() => onNavigate('stats')} className={navButtonClass('stats')}>
                <BarChart3 className="w-3.5 h-3.5" />
                <span className="hidden md:inline">Stats</span>
              </button>
              <button onClick={() => onNavigate('chat')} className={navButtonClass('chat')}>
                <MessageSquare className="w-3.5 h-3.5" />
                <span className="hidden md:inline">Chat</span>
              </button>
              <button onClick={onOpenEstimator} className={navButtonClass('estimator-calculator')}>
                <Calculator className="w-3.5 h-3.5" />
                <span className="hidden md:inline">Estimator</span>
              </button>
            </div>
          )}

          {/* User Info */}
          <div className="flex items-center bg-[var(--text-primary)]/5 px-4 h-12 rounded-xl border border-[var(--border-color)] shadow-inner group hover:border-[var(--text-primary)]/20 transition-all">
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center mr-3 border border-amber-500/20 group-hover:scale-105 transition-transform">
              <UserIcon className="h-4 w-4 text-amber-500" />
            </div>
            <div className="text-left hidden xs:block">
              <p className="font-label opacity-60 leading-none mb-1">{currentUser.role}</p>
              <p className="text-xs font-bold text-[var(--text-primary)] tracking-tight">{currentUser.name}</p>
            </div>
          </div>

          {/* Logout */}
          <button 
            onClick={onLogout}
            className="p-2.5 text-[var(--text-secondary)] hover:text-rose-500 hover:bg-rose-500/10 rounded-xl transition-all active:scale-90 border border-transparent hover:border-rose-500/20 h-10 w-10 flex items-center justify-center"
            title="Logout"
          >
            <LogOut className="h-5 w-5" />
          </button>
        </div>
      </div>
    </nav>
  );
};

export default NavBar;
