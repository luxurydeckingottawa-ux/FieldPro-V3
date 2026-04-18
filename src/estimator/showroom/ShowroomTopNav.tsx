import React from 'react';
import { Maximize2, Minimize2 } from 'lucide-react';

/**
 * ShowroomTopNav
 *
 * Shared 48px top bar used across every showroom page (Estimator, Packages,
 * Material Matrix). Extracted from EstimatorShowroomView's inline nav so the
 * Material Matrix showroom can reuse the exact same look.
 *
 * Layout:
 *   [← Exit Showroom]   [Estimator] [Showroom Packages] [Material Matrix]  [⛶]
 *
 * The exit button on the left is optional (only rendered when onExit is
 * provided). The fullscreen toggle on the right is optional (only rendered
 * when toggleFullScreen is provided). `setView` is optional so a page that
 * wants the nav purely decorative can omit it.
 */

export type ShowroomView = 'estimator' | 'showroom' | 'matrix';

interface ShowroomTopNavProps {
  /** Which of the three tabs should render in the active gold state. */
  activeTab: ShowroomView;
  /** Called when the user clicks a tab. If omitted, tabs are inert. */
  onTabChange?: (view: ShowroomView) => void;
  /** Optional exit handler. Renders the red-accent "Exit Showroom" button when provided. */
  onExit?: () => void;
  /** Whether the app is currently in fullscreen mode (controls the icon). */
  isFullScreen?: boolean;
  /** Optional fullscreen toggle. Renders the ⛶ icon when provided. */
  toggleFullScreen?: () => void;
  /** When provided, renders the "Good / Better / Best" generator button in the left zone. */
  onGenerateGoodBetterBest?: () => void;
}

const TABS: { id: ShowroomView; label: string }[] = [
  { id: 'estimator', label: 'Estimator' },
  { id: 'showroom', label: 'Showroom Packages' },
  { id: 'matrix', label: 'Material Matrix' },
];

const ShowroomTopNav: React.FC<ShowroomTopNavProps> = ({
  activeTab,
  onTabChange,
  onExit,
  isFullScreen,
  toggleFullScreen,
  onGenerateGoodBetterBest,
}) => {
  return (
    <div
      style={{
        position: 'relative',
        zIndex: 20,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 16px',
        height: 48,
        flexShrink: 0,
        background: '#111111',
        borderBottom: '1px solid rgba(255,255,255,0.06)',
      }}
    >
      {/* Left: exit + Good/Better/Best */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        {onExit && (
          <button
            onClick={onExit}
            style={{
              padding: '8px 18px',
              borderRadius: 4,
              border: '1px solid rgba(212,168,83,0.15)',
              background: 'transparent',
              color: 'rgba(212,168,83,0.55)',
              fontSize: 11,
              fontWeight: 600,
              letterSpacing: 1,
              cursor: 'pointer',
              textTransform: 'uppercase',
              fontFamily: 'inherit',
              transition: 'border-color 0.2s ease, color 0.2s ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = 'rgba(212,168,83,0.35)';
              e.currentTarget.style.color = 'rgba(212,168,83,0.85)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = 'rgba(212,168,83,0.15)';
              e.currentTarget.style.color = 'rgba(212,168,83,0.55)';
            }}
          >
            {'\u2039'} Exit Showroom
          </button>
        )}

        {onGenerateGoodBetterBest && (
          <button
            onClick={onGenerateGoodBetterBest}
            title="Auto-generate Option A (Silver / Wood), B (Gold / Composite), C (Platinum / PVC) from current dimensions. Update railings manually after."
            style={{
              padding: '8px 14px',
              borderRadius: 4,
              border: '1px solid #c4a432',
              background: 'rgba(196,164,50,0.10)',
              color: '#c4a432',
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: '0.06em',
              cursor: 'pointer',
              textTransform: 'uppercase',
              fontFamily: 'inherit',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              transition: 'background 0.15s, box-shadow 0.15s',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'rgba(196,164,50,0.22)';
              e.currentTarget.style.boxShadow = '0 0 0 1px #c4a432';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'rgba(196,164,50,0.10)';
              e.currentTarget.style.boxShadow = 'none';
            }}
          >
            {/* Trophy icon */}
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M6 9H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h2"/>
              <path d="M18 9h2a2 2 0 0 0 2-2V5a2 2 0 0 0-2-2h-2"/>
              <path d="M4 22h16"/>
              <path d="M10 14.66V17c0 .55-.47 1-1.05 1h-.05a2 2 0 0 0-1.9 2H17a2 2 0 0 0-1.9-2h-.05c-.58 0-1.05-.45-1.05-1v-2.34"/>
              <path d="M18 2H6v7a6 6 0 0 0 12 0V2z"/>
            </svg>
            Silver / Gold / Platinum
          </button>
        )}
      </div>

      {/* Centre/right: three tabs */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        {TABS.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => onTabChange?.(tab.id)}
              style={{
                padding: '10px 24px',
                borderRadius: 4,
                border: 'none',
                background: isActive ? '#D4A853' : 'rgba(255,255,255,0.06)',
                color: isActive ? '#0A0A0A' : 'rgba(255,255,255,0.5)',
                fontSize: 12,
                fontWeight: 700,
                letterSpacing: 1,
                cursor: 'pointer',
                textTransform: 'uppercase',
                fontFamily: 'inherit',
              }}
            >
              {tab.label}
            </button>
          );
        })}

        {toggleFullScreen && (
          <button
            onClick={toggleFullScreen}
            title={isFullScreen ? 'Exit Fullscreen' : 'Enter Fullscreen'}
            aria-label={isFullScreen ? 'Exit Fullscreen' : 'Enter Fullscreen'}
            style={{
              marginLeft: 4,
              padding: '8px 10px',
              borderRadius: 4,
              border: '1px solid rgba(212,168,83,0.10)',
              background: 'rgba(255,255,255,0.04)',
              color: 'rgba(212,168,83,0.55)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'color 0.2s ease, border-color 0.2s ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = 'rgba(212,168,83,0.35)';
              e.currentTarget.style.color = 'rgba(212,168,83,0.85)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = 'rgba(212,168,83,0.10)';
              e.currentTarget.style.color = 'rgba(212,168,83,0.55)';
            }}
          >
            {isFullScreen ? <Minimize2 size={16} strokeWidth={2} /> : <Maximize2 size={16} strokeWidth={2} />}
          </button>
        )}
      </div>
    </div>
  );
};

export default ShowroomTopNav;
