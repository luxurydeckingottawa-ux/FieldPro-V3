/**
 * PortalSection — shared chrome wrapper for every non-hero section in the
 * customer estimate portal. Locks the ARIA Phase 2 spec (April 2026):
 *
 *   [48px wide 2px gold hairline, centred, 12px above the eyebrow]
 *   EYEBROW         · JetBrains Mono 12px, gold (or gold-dim on slate)
 *   Display title   · Syne italic 44px
 *   Subtitle        · Outfit 18px, 60ch max, ink-70 on cream / cream-70 on slate
 *
 *   Spacing:
 *     vertical padding  py-24 desktop / py-16 mobile
 *     header → content  mt-12
 *     inter-element     space-y-8
 *     gutter            px-6 mobile, px-8 tablet, max-w-6xl mx-auto desktop
 *
 * Tones map to the four locked band backgrounds. Full-bleed tones still get
 * the max-w-6xl inner container so copy never runs edge-to-edge.
 *
 * Optional logo slot sits directly above the hairline:
 *   - 'black' → /assets/logo-luxury-black.png   (used on cream bands)
 *   - 'gold'  → /assets/logo-luxury-gold.png    (used on navy / slate bands)
 */

import React from 'react';

type PortalTone = 'cream' | 'cream-deep' | 'slate' | 'navy';
type PortalLogo = 'black' | 'gold';

export interface PortalSectionProps {
  id?: string;
  eyebrow: string;
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  tone: PortalTone;
  logo?: PortalLogo;
  /** Render with no inner card — children sit directly on the band. */
  flush?: boolean;
  /** Remove the default bottom padding — useful when chaining full-bleed strips. */
  compact?: boolean;
  /** Pull the section full-width; children still hit the max-w-6xl container. */
  fullBleed?: boolean;
  /** Forwarded to root <section> for IntersectionObserver hooks. */
  sectionRef?: React.Ref<HTMLElement>;
  /** Extra classes on the root section (band). */
  className?: string;
  children: React.ReactNode;
}

const toneBandClass: Record<PortalTone, string> = {
  'cream': 'portal-band-cream',
  'cream-deep': 'portal-band-cream-deep',
  'slate': 'portal-band-slate',
  'navy': 'portal-band-navy',
};

const isDarkTone = (tone: PortalTone) => tone === 'slate' || tone === 'navy';

export const PortalSection: React.FC<PortalSectionProps> = ({
  id,
  eyebrow,
  title,
  subtitle,
  tone,
  logo,
  flush = false,
  compact = false,
  fullBleed = false,
  sectionRef,
  className = '',
  children,
}) => {
  const dark = isDarkTone(tone);
  const eyebrowColor = dark ? 'var(--portal-gold-dim)' : 'var(--portal-gold)';
  const titleColor = dark ? 'var(--portal-cream-92)' : 'var(--portal-ink)';
  const subtitleColor = dark ? 'var(--portal-cream-70)' : 'var(--portal-ink-70)';

  const verticalPadding = compact ? 'py-8' : 'py-16 md:py-24';
  const gutter = fullBleed ? 'px-0' : 'px-6 sm:px-8';

  const logoSrc = logo === 'gold' ? '/assets/logo-luxury-gold.png' : '/assets/logo-luxury-black.png';
  const logoHeight = 28; // 28px for header logos (Commitment closer bumps its own to 40)

  return (
    <section
      id={id}
      ref={sectionRef}
      className={`${toneBandClass[tone]} ${verticalPadding} ${gutter} ${className}`}
    >
      <div className="max-w-6xl mx-auto">
        <div className="text-center">
          {logo && (
            <div className="flex justify-center mb-3">
              <img
                src={logoSrc}
                alt="Luxury Decking"
                style={{ height: logoHeight }}
                className="object-contain"
              />
            </div>
          )}
          <span className="portal-hairline" />
          <div
            className="portal-eyebrow"
            style={{ color: eyebrowColor }}
          >
            {eyebrow}
          </div>
          <h2
            className="portal-display mt-3"
            style={{ color: titleColor }}
          >
            {title}
          </h2>
          {subtitle && (
            <p
              className="portal-subtitle mx-auto mt-4"
              style={{ color: subtitleColor }}
            >
              {subtitle}
            </p>
          )}
        </div>

        <div className={flush ? 'mt-12' : 'mt-12 space-y-8'}>
          {children}
        </div>
      </div>
    </section>
  );
};

export default PortalSection;
