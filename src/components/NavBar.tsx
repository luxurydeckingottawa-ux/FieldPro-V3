import React from 'react';
import { User, Role } from '../types';
import { 
  LogOut, User as UserIcon, LayoutDashboard, BookOpen, 
  Calendar, Kanban, Sun, Moon, MessageSquare, Settings, Calculator 
} from 'lucide-react';

interface NavBarProps {
  currentUser: User;
  view: string;
  theme: 'dark' | 'light';
  onNavigate: (view: string) => void;
  onLogout: () => void;
  onToggleTheme: () => void;
  onOpenEstimator: () => void;
}

const NavBar: React.FC<NavBarProps> = ({ 
  currentUser, view, theme, onNavigate, onLogout, onToggleTheme, onOpenEstimator 
}) => {
  const navButtonClass = (targetView: string | string[]) => {
    const isActive = Array.isArray(targetView) 
      ? targetView.includes(view) 
      : view === targetView;
    return `flex items-center gap-2 px-4 py-2 rounded-xl font-label transition-all h-10 ${
      isActive 
        ? 'bg-[var(--bg-primary)]/80 dark:bg-white/10 text-emerald-600 dark:text-emerald-400 shadow-lg border border-[var(--border-color)]' 
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
            <div className="w-10 h-10 bg-emerald-600 rounded-[0.75rem] flex items-center justify-center shadow-lg shadow-emerald-600/20 group-hover:shadow-emerald-600/40 transition-all group-hover:scale-105">
              <span className="text-white font-black text-sm italic">LD</span>
            </div>
            <div className="hidden sm:block">
              <h1 className="text-sm font-display leading-none">Field Pro</h1>
              <p className="font-label mt-0.5 leading-none">Operations</p>
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
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center mr-3 border border-emerald-500/20 group-hover:scale-105 transition-transform">
              <UserIcon className="h-4 w-4 text-emerald-500" />
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
