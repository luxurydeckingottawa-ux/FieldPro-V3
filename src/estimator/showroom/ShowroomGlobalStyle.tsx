import React from 'react';

/**
 * ShowroomGlobalStyle
 *
 * Universal showroom globals shared across every 42" mobile showroom page
 * (Estimator, Packages, Material Matrix). All selectors are scoped to the
 * caller-provided `rootClass` so they never leak to the rest of FieldPro.
 *
 * What lives here (DRY across all showroom pages):
 *  - Playfair Display + DM Sans Google Fonts import
 *  - box-sizing reset inside the scoped root
 *  - Subtle gold webkit scrollbar inside the scoped root
 *
 * What does NOT live here:
 *  - Page-specific CSS variables (colors, token overrides)
 *  - Page-specific component classes (cards, tabs, panels)
 *
 * Each consuming view still emits its own scoped <style> block for page-
 * specific styling on top of this.
 */

interface ShowroomGlobalStyleProps {
  /** Root class the consuming view applies to its outer wrapper. */
  rootClass: string;
}

const ShowroomGlobalStyle: React.FC<ShowroomGlobalStyleProps> = ({ rootClass }) => (
  <style>{`
    @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,600;0,700;0,800;1,700;1,800&family=DM+Sans:wght@400;500;600;700&display=swap');

    .${rootClass} *,
    .${rootClass} *::before,
    .${rootClass} *::after {
      box-sizing: border-box;
    }

    .${rootClass} ::-webkit-scrollbar { width: 4px; height: 4px; }
    .${rootClass} ::-webkit-scrollbar-track { background: transparent; }
    .${rootClass} ::-webkit-scrollbar-thumb {
      background: rgba(212, 168, 83, 0.15);
      border-radius: 4px;
    }
    .${rootClass} ::-webkit-scrollbar-thumb:hover {
      background: rgba(212, 168, 83, 0.28);
    }
  `}</style>
);

export default ShowroomGlobalStyle;
