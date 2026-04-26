import React, { useState, useRef, useEffect } from 'react';
import { User, Role } from '../types';
import {
  LogOut, User as UserIcon, LayoutDashboard, BookOpen,
  Calendar, Kanban, Sun, Moon, MessageSquare, Settings, Calculator,
  Plus, ChevronDown, UserPlus, ClipboardList, Briefcase, CalendarPlus,
  BarChart3, Users, FileText
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

// Views that belong to each nav section — used for active state detection
const PIPELINE_VIEWS = ['office-pipeline', 'office-job-detail', 'estimate-detail'];
const CALENDAR_VIEWS = ['scheduling'];
const ESTIMATOR_VIEWS = ['estimator-calculator'];
const HUB_VIEWS = ['office-dashboard', 'stats', 'customers', 'invoices', 'chat', 'instaquote-reporting'];
const SETTINGS_VIEWS = ['booking-settings', 'automation-settings', 'business-info', 'price-book', 'user-management'];

// Hub submenu items
const HUB_ITEMS = [
  { view: 'office-dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { view: 'stats', label: 'Stats', icon: BarChart3 },
  { view: 'customers', label: 'Customers', icon: Users },
  { view: 'invoices', label: 'Invoices', icon: FileText },
  { view: 'chat', label: 'Chat', icon: MessageSquare },
  { view: 'instaquote-reporting', label: 'InstaQuote Reports', icon: Calculator },
] as const;

// Settings submenu items
const SETTINGS_ITEMS = [
  { view: 'booking-settings', label: 'Booking', icon: CalendarPlus },
  { view: 'automation-settings', label: 'Automations', icon: ClipboardList },
  { view: 'business-info', label: 'Business Info', icon: Briefcase },
  { view: 'price-book', label: 'Price Book', icon: BookOpen },
  { view: 'user-management', label: 'Team', icon: Users },
] as const;

const NavBar: React.FC<NavBarProps> = ({
  currentUser, view, theme, onNavigate, onLogout, onToggleTheme, onOpenEstimator,
  onNewLead, onNewEstimateAppointment, onNewJob
}) => {
  const [showNewMenu, setShowNewMenu] = useState(false);
  const [showHub, setShowHub] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const newMenuRef = useRef<HTMLDivElement>(null);
  const hubRef = useRef<HTMLDivElement>(null);
  const settingsRef = useRef<HTMLDivElement>(null);

  // Close all dropdowns on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (newMenuRef.current && !newMenuRef.current.contains(e.target as Node)) {
        setShowNewMenu(false);
      }
      if (hubRef.current && !hubRef.current.contains(e.target as Node)) {
        setShowHub(false);
      }
      if (settingsRef.current && !settingsRef.current.contains(e.target as Node)) {
        setShowSettings(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Primary nav button styling — clean, minimal
  const navBtnClass = (activeViews: string[]) => {
    const isActive = activeViews.includes(view);
    return [
      'relative flex items-center gap-2 px-3 py-2 text-sm font-medium transition-all duration-200 rounded-lg',
      'min-h-[44px]', // Touch target minimum
      isActive
        ? 'text-[var(--brand-gold)]'
        : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]',
    ].join(' ');
  };

  // Gold underline for active state
  const activeBar = (activeViews: string[]) => {
    if (!activeViews.includes(view)) return null;
    return (
      <span className="absolute bottom-0 left-2 right-2 h-0.5 bg-[var(--brand-gold)] rounded-full" />
    );
  };

  // Dropdown menu container
  const dropdownClass = 'absolute top-full right-0 mt-2 w-48 bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-xl shadow-2xl shadow-black/20 z-50 overflow-hidden backdrop-blur-xl';

  // Dropdown item
  const dropdownItemClass = (targetView: string) => [
    'w-full flex items-center gap-3 px-4 py-3 text-sm transition-colors text-left min-h-[44px]',
    view === targetView
      ? 'text-[var(--brand-gold)] bg-[var(--brand-gold)]/5 font-medium'
      : 'text-[var(--text-primary)] hover:bg-[var(--text-primary)]/5',
  ].join(' ');

  const isAdmin = currentUser.role === Role.ADMIN;
  const isEstimator = currentUser.role === Role.ESTIMATOR;
  const isField = currentUser.role === Role.FIELD_EMPLOYEE || currentUser.role === Role.SUBCONTRACTOR;

  return (
    <nav className="bg-[var(--bg-primary)] border-b border-[var(--border-color)] sticky top-0 z-50 transition-colors duration-300">
      <div className="max-w-7xl mx-auto flex items-center justify-between h-14 px-4 sm:px-6">

        {/* === Left: Logo + New === */}
        <div className="flex items-center gap-3">
          {/* Logo — click to home */}
          <button
            onClick={() => onNavigate(isAdmin ? 'office-dashboard' : isEstimator ? 'estimator-dashboard' : 'jobs')}
            className="flex items-center gap-2.5 group min-h-[44px]"
          >
            <div className="w-8 h-8 rounded-lg flex items-center justify-center overflow-hidden bg-[var(--brand-black)] shadow-md shadow-[var(--brand-gold)]/10 group-hover:shadow-[var(--brand-gold)]/25 transition-all">
              <img src="/assets/logo-white.png" alt="FieldPro" className="w-6 h-6 object-contain" />
            </div>
            <span className="hidden sm:block text-sm font-display tracking-tight">FieldPro</span>
          </button>

          {/* New button — Admin/Estimator only */}
          {(isAdmin || isEstimator) && (
            <div className="relative" ref={newMenuRef}>
              <button
                onClick={() => setShowNewMenu(!showNewMenu)}
                className="flex items-center gap-1 px-3 py-1.5 bg-[var(--brand-gold)] text-[var(--brand-black)] rounded-lg text-xs font-bold hover:bg-[var(--brand-gold-light)] transition-all min-h-[36px]"
              >
                <Plus className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">New</span>
              </button>
              {showNewMenu && (
                <div className={dropdownClass + ' left-0 right-auto'}>
                  {onNewLead && (
                    <button onClick={() => { onNewLead(); setShowNewMenu(false); }} className={dropdownItemClass('')}>
                      <UserPlus className="w-4 h-4 text-[var(--brand-gold)]" /> New Lead
                    </button>
                  )}
                  {onNewEstimateAppointment && (
                    <button onClick={() => { onNewEstimateAppointment(); setShowNewMenu(false); }} className={dropdownItemClass('')}>
                      <CalendarPlus className="w-4 h-4 text-[var(--brand-gold)]" /> Estimate Appt
                    </button>
                  )}
                  <button onClick={() => { onOpenEstimator(); setShowNewMenu(false); }} className={dropdownItemClass('')}>
                    <ClipboardList className="w-4 h-4 text-[var(--brand-gold)]" /> New Estimate
                  </button>
                  {onNewJob && (
                    <button onClick={() => { onNewJob(); setShowNewMenu(false); }} className={dropdownItemClass('')}>
                      <Briefcase className="w-4 h-4 text-[var(--brand-gold)]" /> New Job
                    </button>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* === Center: Primary Navigation === */}
        <div className="flex items-center gap-1">

          {/* ---- Field/Sub Nav ---- */}
          {isField && (
            <>
              <button onClick={() => onNavigate('jobs')} className={navBtnClass(['jobs'])}>
                <Kanban className="w-4 h-4" />
                <span className="hidden sm:inline">My Jobs</span>
                {activeBar(['jobs'])}
              </button>
              <button onClick={() => onNavigate('resources')} className={navBtnClass(['resources'])}>
                <BookOpen className="w-4 h-4" />
                <span className="hidden sm:inline">Resources</span>
                {activeBar(['resources'])}
              </button>
            </>
          )}

          {/* ---- Estimator Nav ---- */}
          {isEstimator && (
            <button
              onClick={() => onNavigate('estimator-dashboard')}
              className={navBtnClass(['estimator-dashboard', 'estimator-workflow'])}
            >
              <LayoutDashboard className="w-4 h-4" />
              <span className="hidden sm:inline">Dashboard</span>
              {activeBar(['estimator-dashboard', 'estimator-workflow'])}
            </button>
          )}

          {/* ---- Admin 4+1 Nav ---- */}
          {isAdmin && (
            <>
              {/* 1. Pipeline */}
              <button onClick={() => onNavigate('office-pipeline')} className={navBtnClass(PIPELINE_VIEWS)}>
                <Kanban className="w-4 h-4" />
                <span className="hidden sm:inline">Pipeline</span>
                {activeBar(PIPELINE_VIEWS)}
              </button>

              {/* 2. Calendar */}
              <button onClick={() => onNavigate('scheduling')} className={navBtnClass(CALENDAR_VIEWS)}>
                <Calendar className="w-4 h-4" />
                <span className="hidden sm:inline">Calendar</span>
                {activeBar(CALENDAR_VIEWS)}
              </button>

              {/* 3. Estimator */}
              <button onClick={onOpenEstimator} className={navBtnClass(ESTIMATOR_VIEWS)}>
                <Calculator className="w-4 h-4" />
                <span className="hidden sm:inline">Estimator</span>
                {activeBar(ESTIMATOR_VIEWS)}
              </button>

              {/* 4. Hub — dropdown */}
              <div className="relative" ref={hubRef}>
                <button
                  onClick={() => { setShowHub(!showHub); setShowSettings(false); }}
                  className={navBtnClass(HUB_VIEWS)}
                >
                  <LayoutDashboard className="w-4 h-4" />
                  <span className="hidden sm:inline">Hub</span>
                  <ChevronDown className={`w-3 h-3 transition-transform duration-200 ${showHub ? 'rotate-180' : ''}`} />
                  {activeBar(HUB_VIEWS)}
                </button>
                {showHub && (
                  <div className={dropdownClass}>
                    {HUB_ITEMS.map((item) => (
                      <button
                        key={item.view}
                        onClick={() => { onNavigate(item.view); setShowHub(false); }}
                        className={dropdownItemClass(item.view)}
                      >
                        <item.icon className="w-4 h-4 text-[var(--text-tertiary)]" />
                        {item.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        {/* === Right: Settings gear + User + Logout === */}
        <div className="flex items-center gap-2">

          {/* Settings gear — Admin only */}
          {isAdmin && (
            <div className="relative" ref={settingsRef}>
              <button
                onClick={() => { setShowSettings(!showSettings); setShowHub(false); }}
                className={`flex items-center justify-center w-9 h-9 rounded-lg transition-all duration-200 min-h-[44px] min-w-[44px] ${
                  SETTINGS_VIEWS.includes(view)
                    ? 'text-[var(--brand-gold)]'
                    : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                }`}
                title="Settings"
              >
                <Settings className={`w-4 h-4 transition-transform duration-300 ${showSettings ? 'rotate-90' : ''}`} />
              </button>
              {showSettings && (
                <div className={dropdownClass}>
                  {SETTINGS_ITEMS.map((item) => (
                    <button
                      key={item.view}
                      onClick={() => { onNavigate(item.view); setShowSettings(false); }}
                      className={dropdownItemClass(item.view)}
                    >
                      <item.icon className="w-4 h-4 text-[var(--text-tertiary)]" />
                      {item.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Theme toggle */}
          <button
            onClick={onToggleTheme}
            className="flex items-center justify-center w-9 h-9 rounded-lg text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-all min-h-[44px] min-w-[44px]"
            title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
          >
            {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </button>

          {/* User pill */}
          <div className="hidden sm:flex items-center gap-2 px-3 h-9 rounded-lg bg-[var(--text-primary)]/5 border border-[var(--border-color)]">
            <div className="w-6 h-6 rounded-md bg-[var(--brand-gold)]/10 flex items-center justify-center">
              <UserIcon className="h-3.5 w-3.5 text-[var(--brand-gold)]" />
            </div>
            <span className="text-xs font-medium text-[var(--text-primary)] truncate max-w-[100px]">{currentUser.name}</span>
          </div>

          {/* Logout */}
          <button
            onClick={onLogout}
            className="flex items-center justify-center w-9 h-9 rounded-lg text-[var(--text-secondary)] hover:text-rose-500 hover:bg-rose-500/10 transition-all min-h-[44px] min-w-[44px]"
            title="Logout"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
    </nav>
  );
};

export default NavBar;
