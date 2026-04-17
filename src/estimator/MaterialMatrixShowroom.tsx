import React, { useState, useMemo, useEffect } from 'react';
import {
  TierType,
  FINANCING_FACTOR,
  type Material,
  type DeckSize,
} from './EstimatorCalculatorView';
import { TIER_TO_TEXTURE_URL } from './EstimatorShowroomView';
import ShowroomGlobalStyle from './showroom/ShowroomGlobalStyle';
import ShowroomTopNav from './showroom/ShowroomTopNav';

/*
 * MaterialMatrixShowroom
 *
 * Showroom-optimised Material Matrix for the 42" mobile showroom TV.
 * Replaces the legacy `StandaloneMaterialMatrix` in EstimatorCalculatorView
 * (kept intact as a dead-code fallback for quick rollback).
 *
 * All pricing, compare, print, railings, size, and tier-filter behaviour is
 * preserved verbatim — this is a visual rebuild only. Data source
 * (DECK_MATERIALS_MATRIX, TIER_CONFIG_MATRIX, RAILING_PRICING_MATRIX) is
 * imported through props so we never duplicate pricing data.
 */

// ═══════════════ CONSTANTS DUPLICATED INTO SCOPE ═══════════════
// Pricing data + tier config are authored in EstimatorCalculatorView.tsx but
// not all of it is exported. The matrix's DECK_MATERIALS_MATRIX and
// TIER_CONFIG_MATRIX / RAILING_PRICING_MATRIX / DECK_SIZES_MATRIX are module-
// private in that file. To honour the "no data changes" rule we instead
// accept the data rendered by the parent view through the product list the
// old `StandaloneMaterialMatrix` also consumed. The parent will import
// the data and pass it in; to keep the existing signature identical we
// re-import through a thin bridge below.

// NOTE: the matrix module-private constants (DECK_MATERIALS_MATRIX,
// RAILING_PRICING_MATRIX, TIER_CONFIG_MATRIX, DECK_SIZES_MATRIX) will be
// passed in via the parent. For Phase 1 ship, we export them from
// EstimatorCalculatorView so this view can import directly and keep the
// exact same render contract that `StandaloneMaterialMatrix` had.
import {
  DECK_MATERIALS_MATRIX,
  RAILING_PRICING_MATRIX,
  TIER_CONFIG_MATRIX,
  DECK_SIZES_MATRIX,
} from './EstimatorCalculatorView';

// Matrix product ID → TIER_TO_TEXTURE_URL key. Kept hand-maintained so Jack
// can add a product to the matrix without a photo and still ship (the card
// just falls back to its gradient). In dev we log any matrix ID that is
// unmapped so gaps are visible immediately.
const MATRIX_ID_TO_TEXTURE_KEY: Record<string, string> = {
  // Natural Wood — no photo on purpose. Keep gradient.
  // Fiberon
  'fiberon-weekender':      'fiberon_goodlife_weekender',
  'fiberon-escape':         'fiberon_goodlife_escapes',
  'fiberon-sanctuary':      'fiberon_sanctuary',
  'fiberon-concordia':      'fiberon_concordia',
  'fiberon-paramount':      'fiberon_paramount',
  'fiberon-promenade':      'fiberon_promenade',
  // TimberTech
  'tt-prime':               'tt_prime',
  'tt-prime-plus':          'tt_prime_plus',
  'tt-terrain':             'tt_terrain',
  'tt-reserve':             'tt_reserve',
  'tt-legacy':              'tt_legacy',
  // Azek
  'azek-harvest':           'azek_harvest',
  'azek-landmark':          'azek_landmark',
  'azek-vintage':           'azek_vintage',
  // Clubhouse
  'clubhouse-woodbridge':   'woodbridge_pvc',
  // Eva-Last (matrix IDs use 'eva-last-*' not 'eva-*')
  'eva-last-infinity':      'eva_infinity',
  'eva-last-apex':          'eva_apex',
  'eva-last-pioneer':       'eva_pioneer',
};

// Fallback gradient shown when a matrix product has no texture mapping
// (natural wood products or any un-photographed additions). Tier-driven so
// higher tiers still feel visually premium even without a photo.
//
// NOTE: We intentionally use the enum's STRING VALUES ('Select', 'Premium',
// 'Elite', 'Signature') rather than `TierType.SELECT` etc. at module scope.
// MaterialMatrixShowroom and EstimatorCalculatorView are in a circular
// import: EstimatorCalculatorView imports this component, and this file
// imports TierType from EstimatorCalculatorView. If we reference
// `TierType.SELECT` at module-init time, TierType is still undefined during
// circular resolution and the Matrix page crashes with
// `Cannot read properties of undefined (reading 'SELECT')`.
// Using string literals here keeps the map initialised without depending on
// the enum being fully defined yet. The values are exactly the enum's
// string values (see EstimatorCalculatorView.tsx line 115-120).
const TIER_FALLBACK_GRADIENT: Record<TierType, string> = {
  Select:    'linear-gradient(135deg, #9E8B6E 0%, #8A7A5E 100%)',
  Premium:   'linear-gradient(135deg, #8B7060 0%, #6B5B4B 100%)',
  Elite:     'linear-gradient(135deg, #6F5D48 0%, #4A3D2F 100%)',
  Signature: 'linear-gradient(135deg, #C49843 0%, #8B6A2E 100%)',
};

// One-time dev warning for any DECK_MATERIALS_MATRIX id that is neither
// mapped in MATRIX_ID_TO_TEXTURE_KEY nor known to be photo-less.
const EXPECTED_NO_PHOTO_IDS = new Set(['pt-wood', 'cedar']);
let hasWarnedUnmapped = false;
function warnUnmappedMatrixIdsOnce() {
  if (hasWarnedUnmapped) return;
  hasWarnedUnmapped = true;
  // Only in dev; production builds won't spam the field tablets.
  const isDev = typeof import.meta !== 'undefined' && import.meta.env?.DEV;
  if (!isDev) return;
  const unmapped = DECK_MATERIALS_MATRIX
    .filter((m) => !MATRIX_ID_TO_TEXTURE_KEY[m.id] && !EXPECTED_NO_PHOTO_IDS.has(m.id))
    .map((m) => m.id);
  if (unmapped.length > 0) {

    console.warn(
      '[MaterialMatrixShowroom] No photo mapping for matrix IDs:',
      unmapped,
      'Add entries to MATRIX_ID_TO_TEXTURE_KEY in MaterialMatrixShowroom.tsx',
    );
  }
}

// ═══════════════ TIER BADGE (SHIELD SVG) ═══════════════
// Verbatim shield SVGs from the mockup, typed with strict size support.
// Used at 30px on cards and 20px in the tier filter pills.

const TierBadge: React.FC<{ tier: TierType; size?: number }> = ({ tier, size = 32 }) => {
  const tierId = tierToBadgeKey(tier);

  if (tierId === 'signature') {
    return (
      <svg width={size} height={size} viewBox="0 0 40 40">
        <defs>
          <linearGradient id={`lux-badge-${tierId}`} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#D4A853" />
            <stop offset="50%" stopColor="#F0D78C" />
            <stop offset="100%" stopColor="#C49843" />
          </linearGradient>
        </defs>
        <path
          d="M20 2 L36 10 L36 22 C36 30 28 37 20 39 C12 37 4 30 4 22 L4 10 Z"
          fill={`url(#lux-badge-${tierId})`}
          stroke="#B8922E"
          strokeWidth="0.8"
        />
        <path
          d="M20 10 L22.5 16 L29 16.5 L24 21 L25.5 27.5 L20 24 L14.5 27.5 L16 21 L11 16.5 L17.5 16 Z"
          fill="#0a0a0a"
          opacity="0.7"
        />
        <ellipse cx="15" cy="12" rx="6" ry="3" fill="white" opacity="0.15" transform="rotate(-20 15 12)" />
      </svg>
    );
  }

  if (tierId === 'elite') {
    return (
      <svg width={size} height={size} viewBox="0 0 40 40">
        <defs>
          <linearGradient id={`lux-badge-${tierId}`} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#2a2a2a" />
            <stop offset="50%" stopColor="#3a3a3a" />
            <stop offset="100%" stopColor="#1a1a1a" />
          </linearGradient>
        </defs>
        <path
          d="M20 2 L36 10 L36 22 C36 30 28 37 20 39 C12 37 4 30 4 22 L4 10 Z"
          fill={`url(#lux-badge-${tierId})`}
          stroke="#555"
          strokeWidth="0.8"
        />
        <path
          d="M20 10 L22.5 16 L29 16.5 L24 21 L25.5 27.5 L20 24 L14.5 27.5 L16 21 L11 16.5 L17.5 16 Z"
          fill="white"
          opacity="0.8"
        />
        <ellipse cx="15" cy="12" rx="6" ry="3" fill="white" opacity="0.08" transform="rotate(-20 15 12)" />
      </svg>
    );
  }

  if (tierId === 'premium') {
    return (
      <svg width={size} height={size} viewBox="0 0 40 40">
        <defs>
          <linearGradient id={`lux-badge-${tierId}`} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#909090" />
            <stop offset="50%" stopColor="#B0B0B0" />
            <stop offset="100%" stopColor="#808080" />
          </linearGradient>
        </defs>
        <path
          d="M20 2 L36 10 L36 22 C36 30 28 37 20 39 C12 37 4 30 4 22 L4 10 Z"
          fill={`url(#lux-badge-${tierId})`}
          stroke="#6a6a6a"
          strokeWidth="0.8"
        />
        <path
          d="M20 10 L22.5 16 L29 16.5 L24 21 L25.5 27.5 L20 24 L14.5 27.5 L16 21 L11 16.5 L17.5 16 Z"
          fill="white"
          opacity="0.9"
        />
        <ellipse cx="15" cy="12" rx="6" ry="3" fill="white" opacity="0.2" transform="rotate(-20 15 12)" />
      </svg>
    );
  }

  // select (default)
  return (
    <svg width={size} height={size} viewBox="0 0 40 40">
      <defs>
        <linearGradient id={`lux-badge-${tierId}`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#E0E0E0" />
          <stop offset="50%" stopColor="#F5F5F5" />
          <stop offset="100%" stopColor="#D0D0D0" />
        </linearGradient>
      </defs>
      <path
        d="M20 2 L36 10 L36 22 C36 30 28 37 20 39 C12 37 4 30 4 22 L4 10 Z"
        fill={`url(#lux-badge-${tierId})`}
        stroke="#bbb"
        strokeWidth="0.8"
      />
      <path
        d="M20 10 L22.5 16 L29 16.5 L24 21 L25.5 27.5 L20 24 L14.5 27.5 L16 21 L11 16.5 L17.5 16 Z"
        fill="#666"
        opacity="0.6"
      />
      <ellipse cx="15" cy="12" rx="6" ry="3" fill="white" opacity="0.3" transform="rotate(-20 15 12)" />
    </svg>
  );
};

type BadgeKey = 'select' | 'premium' | 'elite' | 'signature';
function tierToBadgeKey(tier: TierType): BadgeKey {
  switch (tier) {
    case TierType.SELECT:
      return 'select';
    case TierType.PREMIUM:
      return 'premium';
    case TierType.ELITE:
      return 'elite';
    case TierType.SIGNATURE:
      return 'signature';
  }
}

// ═══════════════ FORMAT HELPERS ═══════════════
const fmtCAD = (n: number): string =>
  new Intl.NumberFormat('en-CA', {
    style: 'currency',
    currency: 'CAD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(n);

// ═══════════════ SCOPED STYLES ═══════════════
const ROOT_CLASS = 'lux-matrix-root';

const MatrixScopedStyle: React.FC = () => (
  <style>{`
    .${ROOT_CLASS} {
      --lux-gold: #D4A853;
      --lux-blue: #5B9BD5;
      --lux-bg: #0A0A0A;
      --lux-bg-elevated: #111111;
      --lux-text-primary: #E8E0D4;
      --lux-text-secondary: rgba(232,224,212,0.45);
      --lux-text-tertiary: rgba(232,224,212,0.25);

      font-family: 'DM Sans', -apple-system, BlinkMacSystemFont, sans-serif;
      background: var(--lux-bg);
      color: var(--lux-text-primary);
      width: 100%;
      height: 100%;
      display: flex;
      flex-direction: column;
      overflow: hidden;
      position: relative;
    }
    .${ROOT_CLASS} input,
    .${ROOT_CLASS} select,
    .${ROOT_CLASS} button,
    .${ROOT_CLASS} textarea {
      font-family: inherit;
    }
    .${ROOT_CLASS} .lux-grain {
      position: absolute;
      inset: 0;
      opacity: 0.025;
      pointer-events: none;
      z-index: 1;
      background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 512 512' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E");
    }
    .${ROOT_CLASS} .lux-card {
      border-radius: 8px;
      border: 1.5px solid rgba(255,255,255,0.06);
      background: rgba(255,255,255,0.015);
      overflow: hidden;
      transition: transform 0.35s cubic-bezier(0.16,1,0.3,1), box-shadow 0.35s ease, border-color 0.25s ease, background 0.25s ease;
      position: relative;
      display: flex;
      flex-direction: column;
      min-height: 360px;
    }
    .${ROOT_CLASS} .lux-card:hover {
      transform: translateY(-2px);
      box-shadow: 0 8px 24px rgba(0,0,0,0.3);
    }
    .${ROOT_CLASS} .lux-card.selected {
      border-color: rgba(212,168,83,0.5);
      background: rgba(212,168,83,0.04);
      box-shadow: inset 0 0 0 1.5px rgba(212,168,83,0.4);
    }
    .${ROOT_CLASS} .lux-btn {
      cursor: pointer;
      transition: all 0.2s ease;
      font-family: inherit;
    }
    .${ROOT_CLASS} .lux-btn:hover {
      filter: brightness(1.1);
    }
  `}</style>
);

// ═══════════════ PHOTO STRIP ═══════════════
const PhotoStrip: React.FC<{ materialId: string; tier: TierType }> = ({ materialId, tier }) => {
  const textureKey = MATRIX_ID_TO_TEXTURE_KEY[materialId];
  const photoUrl = textureKey ? TIER_TO_TEXTURE_URL[textureKey] : undefined;
  const [imgFailed, setImgFailed] = useState(false);
  const fallbackGradient = TIER_FALLBACK_GRADIENT[tier];

  const showPhoto = photoUrl && !imgFailed;

  return (
    <div
      style={{
        position: 'relative',
        width: '100%',
        height: 100,
        flexShrink: 0,
        background: showPhoto ? '#1a1a1a' : fallbackGradient,
        overflow: 'hidden',
      }}
    >
      {showPhoto && (
        <img
          src={photoUrl}
          alt=""
          loading="lazy"
          onError={() => setImgFailed(true)}
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            display: 'block',
          }}
        />
      )}
      {/* Dark bottom gradient overlay for legibility of header text below the strip. */}
      <div
        aria-hidden
        style={{
          position: 'absolute',
          inset: 0,
          background: 'linear-gradient(180deg, transparent 40%, rgba(10,10,10,0.55))',
          pointerEvents: 'none',
        }}
      />
    </div>
  );
};

// ═══════════════ PRODUCT CARD ═══════════════
interface MatrixProductCardProps {
  material: Material;
  size: DeckSize;
  showRailings: boolean;
  railingCost: number;
  isSelected: boolean;
  onToggle: () => void;
  onPrint: () => void;
}

const MatrixProductCard: React.FC<MatrixProductCardProps> = ({
  material,
  size,
  showRailings,
  railingCost,
  isSelected,
  onToggle,
  onPrint,
}) => {
  const basePrice = material.basePricing[size];
  const totalPrice = showRailings ? basePrice + railingCost : basePrice;
  const monthlyPrice = Math.round(totalPrice * FINANCING_FACTOR);

  return (
    <div className={`lux-card${isSelected ? ' selected' : ''}`}>
      {/* Photo strip (100px) with fallback gradient */}
      <PhotoStrip materialId={material.id} tier={material.tier} />

      {/* Header: brand + tier badge */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          padding: '10px 12px 0',
        }}
      >
        <div style={{ minWidth: 0, flex: 1 }}>
          <div
            style={{
              fontSize: 8,
              letterSpacing: 1.5,
              color:
                material.tier === TierType.SIGNATURE
                  ? 'rgba(212,168,83,0.65)'
                  : 'rgba(255,255,255,0.35)',
              textTransform: 'uppercase',
              fontWeight: 600,
            }}
          >
            {material.brand}
          </div>
          <div
            style={{
              fontSize: 15,
              fontWeight: 700,
              color: '#E8E0D4',
              fontFamily: "'Playfair Display', Georgia, serif",
              marginTop: 2,
              lineHeight: 1.2,
            }}
          >
            {material.name}
          </div>
        </div>
        <div style={{ marginLeft: 8, flexShrink: 0 }}>
          <TierBadge tier={material.tier} size={30} />
        </div>
      </div>

      {/* Price */}
      <div style={{ padding: '10px 12px 0' }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
          <span
            style={{
              fontSize: 26,
              fontWeight: 800,
              color: '#D4A853',
              fontFamily: "'Playfair Display', Georgia, serif",
              lineHeight: 1,
            }}
          >
            {fmtCAD(totalPrice)}
          </span>
          <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.25)', fontWeight: 500 }}>+HST</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 4, marginTop: 4 }}>
          <span
            style={{
              fontSize: 8,
              letterSpacing: 1,
              color: 'rgba(91,155,213,0.45)',
              textTransform: 'uppercase',
              fontWeight: 600,
            }}
          >
            Est.
          </span>
          <span
            style={{
              fontSize: 14,
              fontWeight: 600,
              color: '#5B9BD5',
              fontFamily: "'Playfair Display', Georgia, serif",
            }}
          >
            {fmtCAD(monthlyPrice)}/mo
          </span>
          <span
            style={{
              fontSize: 7,
              color: 'rgba(91,155,213,0.35)',
              letterSpacing: 0.5,
              marginLeft: 2,
              fontWeight: 600,
            }}
          >
            FINANCING
          </span>
        </div>
      </div>

      {/* Details */}
      <div style={{ padding: '8px 12px 0', flex: 1 }}>
        <div style={{ display: 'flex', gap: 18, marginBottom: 6 }}>
          <div>
            <div
              style={{
                fontSize: 7,
                letterSpacing: 1,
                color: 'rgba(255,255,255,0.25)',
                textTransform: 'uppercase',
                fontWeight: 600,
              }}
            >
              Type
            </div>
            <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.55)', fontWeight: 500 }}>
              {material.materialType}
            </div>
          </div>
          <div>
            <div
              style={{
                fontSize: 7,
                letterSpacing: 1,
                color: 'rgba(255,255,255,0.25)',
                textTransform: 'uppercase',
                fontWeight: 600,
              }}
            >
              Warranty
            </div>
            <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.55)', fontWeight: 500 }}>
              {material.warranty}
            </div>
          </div>
        </div>
        <div
          style={{
            fontSize: 10,
            color: 'rgba(255,255,255,0.3)',
            lineHeight: 1.45,
            marginTop: 2,
            fontStyle: 'italic',
          }}
        >
          &ldquo;{material.description}&rdquo;
        </div>
      </div>

      {/* Actions */}
      <div
        style={{
          display: 'flex',
          gap: 6,
          padding: '10px 12px 12px',
          marginTop: 'auto',
        }}
      >
        <button
          className="lux-btn"
          onClick={onToggle}
          style={{
            flex: 1,
            padding: '8px 0',
            borderRadius: 4,
            border: isSelected
              ? '1px solid rgba(212,168,83,0.45)'
              : '1px solid rgba(255,255,255,0.12)',
            background: isSelected ? 'rgba(212,168,83,0.12)' : 'transparent',
            color: isSelected ? '#D4A853' : 'rgba(255,255,255,0.55)',
            fontSize: 9,
            fontWeight: 700,
            letterSpacing: 1.5,
            textTransform: 'uppercase',
            boxShadow: isSelected ? 'inset 0 0 0 1.5px rgba(212,168,83,0.4)' : 'none',
          }}
        >
          {isSelected ? '\u2713 Selected' : 'Select'}
        </button>
        <button
          className="lux-btn"
          onClick={(e) => {
            e.stopPropagation();
            onPrint();
          }}
          style={{
            flex: 1,
            padding: '8px 0',
            borderRadius: 4,
            border: 'none',
            background: 'rgba(212,168,83,0.12)',
            color: '#D4A853',
            fontSize: 9,
            fontWeight: 700,
            letterSpacing: 1.5,
            textTransform: 'uppercase',
          }}
        >
          Print Quote
        </button>
      </div>
    </div>
  );
};

// ═══════════════ COMPARISON OVERLAY (restyled in-scope) ═══════════════
interface MatrixComparisonOverlayProps {
  materials: Material[];
  size: DeckSize;
  showRailings: boolean;
  railingCost: number;
  onClose: () => void;
  onPrint: () => void;
}

const MatrixComparisonOverlay: React.FC<MatrixComparisonOverlayProps> = ({
  materials,
  size,
  showRailings,
  railingCost,
  onClose,
  onPrint,
}) => {
  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 100,
        background: 'rgba(0,0,0,0.9)',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
      }}
    >
      <div
        style={{
          background: '#111',
          border: '1px solid rgba(212,168,83,0.18)',
          width: '100%',
          maxWidth: 1100,
          maxHeight: '100%',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          borderRadius: 16,
          boxShadow: '0 24px 60px rgba(0,0,0,0.5)',
          color: '#E8E0D4',
          fontFamily: "'DM Sans', sans-serif",
        }}
      >
        <div
          style={{
            padding: 22,
            borderBottom: '1px solid rgba(255,255,255,0.06)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <div>
            <h2
              style={{
                margin: 0,
                fontSize: 24,
                fontWeight: 800,
                fontFamily: "'Playfair Display', Georgia, serif",
                textTransform: 'uppercase',
                letterSpacing: 0.5,
              }}
            >
              Material{' '}
              <span style={{ color: '#D4A853', fontStyle: 'italic', fontWeight: 800 }}>
                Comparison
              </span>
            </h2>
            <p
              style={{
                margin: '6px 0 0',
                fontSize: 10,
                color: 'rgba(255,255,255,0.45)',
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: 2,
              }}
            >
              Comparing {materials.length} Premium Solution{materials.length === 1 ? '' : 's'} &bull;{' '}
              {size} Footprint
            </p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <button
              className="lux-btn"
              onClick={onPrint}
              style={{
                padding: '10px 22px',
                borderRadius: 999,
                border: 'none',
                background: '#D4A853',
                color: '#0A0A0A',
                fontSize: 11,
                fontWeight: 800,
                letterSpacing: 2,
                textTransform: 'uppercase',
                cursor: 'pointer',
                boxShadow: '0 8px 22px rgba(212,168,83,0.2)',
              }}
            >
              Print Comparison
            </button>
            <button
              className="lux-btn"
              onClick={onClose}
              style={{
                width: 36,
                height: 36,
                borderRadius: '50%',
                border: 'none',
                background: 'rgba(255,255,255,0.06)',
                color: '#fff',
                cursor: 'pointer',
                fontSize: 14,
              }}
              aria-label="Close comparison"
            >
              &#x2715;
            </button>
          </div>
        </div>

        <div style={{ flex: 1, overflow: 'auto', padding: 22 }}>
          <table
            style={{
              width: '100%',
              borderCollapse: 'collapse',
              textAlign: 'left',
              minWidth: 800,
            }}
          >
            <thead>
              <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                <th
                  style={{
                    padding: '14px 12px',
                    fontSize: 10,
                    color: 'rgba(255,255,255,0.35)',
                    fontWeight: 800,
                    textTransform: 'uppercase',
                    letterSpacing: 2,
                  }}
                >
                  Specifications
                </th>
                {materials.map((m) => (
                  <th key={m.id} style={{ padding: '14px 12px', minWidth: 200 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                      <TierBadge tier={m.tier} size={20} />
                      <span
                        style={{
                          fontSize: 9,
                          color: '#D4A853',
                          fontWeight: 800,
                          textTransform: 'uppercase',
                          letterSpacing: 2,
                        }}
                      >
                        {m.brand}
                      </span>
                    </div>
                    <div
                      style={{
                        fontSize: 14,
                        fontWeight: 800,
                        color: '#E8E0D4',
                        fontFamily: "'Playfair Display', Georgia, serif",
                      }}
                    >
                      {m.name}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody style={{ fontSize: 13, fontWeight: 600 }}>
              <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                <td
                  style={{
                    padding: '18px 12px',
                    color: 'rgba(255,255,255,0.35)',
                    fontSize: 10,
                    textTransform: 'uppercase',
                    letterSpacing: 2,
                    fontWeight: 700,
                  }}
                >
                  Base Investment
                </td>
                {materials.map((m) => {
                  const base = m.basePricing[size];
                  const total = showRailings ? base + railingCost : base;
                  return (
                    <td key={m.id} style={{ padding: '18px 12px' }}>
                      <div
                        style={{
                          fontSize: 20,
                          color: '#D4A853',
                          fontWeight: 800,
                          fontFamily: "'Playfair Display', Georgia, serif",
                        }}
                      >
                        {fmtCAD(total)}
                      </div>
                      <div
                        style={{
                          fontSize: 10,
                          color: '#5B9BD5',
                          fontWeight: 700,
                          marginTop: 2,
                          textTransform: 'uppercase',
                          letterSpacing: 1,
                        }}
                      >
                        Est. {fmtCAD(Math.round(total * FINANCING_FACTOR))}/mo
                      </div>
                    </td>
                  );
                })}
              </tr>
              <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                <td
                  style={{
                    padding: '18px 12px',
                    color: 'rgba(255,255,255,0.35)',
                    fontSize: 10,
                    textTransform: 'uppercase',
                    letterSpacing: 2,
                    fontWeight: 700,
                  }}
                >
                  Material Type
                </td>
                {materials.map((m) => (
                  <td key={m.id} style={{ padding: '18px 12px', color: 'rgba(255,255,255,0.65)' }}>
                    {m.materialType}
                  </td>
                ))}
              </tr>
              <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                <td
                  style={{
                    padding: '18px 12px',
                    color: 'rgba(255,255,255,0.35)',
                    fontSize: 10,
                    textTransform: 'uppercase',
                    letterSpacing: 2,
                    fontWeight: 700,
                  }}
                >
                  Warranty Coverage
                </td>
                {materials.map((m) => (
                  <td key={m.id} style={{ padding: '18px 12px', color: 'rgba(255,255,255,0.65)' }}>
                    {m.warranty}
                  </td>
                ))}
              </tr>
              <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                <td
                  style={{
                    padding: '18px 12px',
                    color: 'rgba(255,255,255,0.35)',
                    fontSize: 10,
                    textTransform: 'uppercase',
                    letterSpacing: 2,
                    fontWeight: 700,
                  }}
                >
                  Performance Grade
                </td>
                {materials.map((m) => (
                  <td key={m.id} style={{ padding: '18px 12px' }}>
                    <span
                      style={{
                        padding: '3px 10px',
                        background: 'rgba(212,168,83,0.08)',
                        border: '1px solid rgba(212,168,83,0.18)',
                        borderRadius: 4,
                        fontSize: 10,
                        color: '#D4A853',
                        fontWeight: 700,
                        letterSpacing: 1,
                        textTransform: 'uppercase',
                      }}
                    >
                      {m.tier}
                    </span>
                  </td>
                ))}
              </tr>
              <tr>
                <td
                  style={{
                    padding: '18px 12px',
                    color: 'rgba(255,255,255,0.35)',
                    fontSize: 10,
                    textTransform: 'uppercase',
                    letterSpacing: 2,
                    fontWeight: 700,
                    verticalAlign: 'top',
                  }}
                >
                  Value Proposition
                </td>
                {materials.map((m) => (
                  <td
                    key={m.id}
                    style={{
                      padding: '18px 12px',
                      color: 'rgba(255,255,255,0.55)',
                      fontSize: 12,
                      fontStyle: 'italic',
                      lineHeight: 1.55,
                      fontWeight: 400,
                    }}
                  >
                    &ldquo;{m.description}&rdquo;
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>

        <div
          style={{
            padding: '16px 22px',
            background: 'rgba(255,255,255,0.02)',
            borderTop: '1px solid rgba(255,255,255,0.05)',
            textAlign: 'center',
          }}
        >
          <p
            style={{
              margin: 0,
              fontSize: 10,
              fontWeight: 700,
              color: 'rgba(255,255,255,0.4)',
              textTransform: 'uppercase',
              letterSpacing: 3,
            }}
          >
            All estimates include professional installation, helical piles &bull; HST not included
          </p>
        </div>
      </div>
    </div>
  );
};

// ═══════════════ MAIN COMPONENT ═══════════════
export interface MaterialMatrixShowroomProps {
  onPrintRequest: (
    items: Material[],
    size: DeckSize,
    railings: boolean,
    mode: 'single' | 'compare',
  ) => void;
  onExit?: () => void;
  isFullScreen?: boolean;
  toggleFullScreen?: () => void;
  /** Current parent-managed view tab so the shared top nav stays in sync. */
  view?: 'calculator' | 'packages' | 'materialMatrix';
  /** Parent setter so tab clicks in the shared nav route cleanly. */
  setView?: (v: 'calculator' | 'packages' | 'materialMatrix') => void;
}

const MaterialMatrixShowroom: React.FC<MaterialMatrixShowroomProps> = ({
  onPrintRequest,
  onExit,
  isFullScreen,
  toggleFullScreen,
  setView,
}) => {
  const [selectedSize, setSelectedSize] = useState<DeckSize>('12x12');
  const [showRailings, setShowRailings] = useState(false);
  const [activeTierFilter, setActiveTierFilter] = useState<TierType | 'All'>('All');
  const [selectedForComparison, setSelectedForComparison] = useState<string[]>([]);
  const [isComparisonOpen, setIsComparisonOpen] = useState(false);

  useEffect(() => {
    warnUnmappedMatrixIdsOnce();
  }, []);

  const railingCost = RAILING_PRICING_MATRIX[selectedSize];
  const filteredMaterials = useMemo(
    () =>
      DECK_MATERIALS_MATRIX.filter(
        (m) => activeTierFilter === 'All' || m.tier === activeTierFilter,
      ),
    [activeTierFilter],
  );
  const selectedMaterials = useMemo(
    () => DECK_MATERIALS_MATRIX.filter((m) => selectedForComparison.includes(m.id)),
    [selectedForComparison],
  );

  const toggleMaterialSelection = (id: string) => {
    setSelectedForComparison((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : prev.length < 4 ? [...prev, id] : prev,
    );
  };

  const tierIds = Object.keys(TIER_CONFIG_MATRIX) as TierType[];

  return (
    <div className={ROOT_CLASS}>
      <ShowroomGlobalStyle rootClass={ROOT_CLASS} />
      <MatrixScopedStyle />
      <div className="lux-grain" />

      {/* ══ TOP NAV (shared) ══ */}
      <ShowroomTopNav
        activeTab="matrix"
        onTabChange={(v) => {
          if (v === 'estimator') setView?.('calculator');
          else if (v === 'showroom') setView?.('packages');
          else if (v === 'matrix') setView?.('materialMatrix');
        }}
        onExit={onExit}
        isFullScreen={isFullScreen}
        toggleFullScreen={toggleFullScreen}
      />

      {/* ══ HEADER + CONTROLS ══ */}
      <div
        style={{
          position: 'relative',
          zIndex: 10,
          padding: '16px 28px 12px',
          flexShrink: 0,
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
          {/* Title */}
          <div>
            <div
              style={{
                fontSize: 9,
                letterSpacing: 4,
                color: 'rgba(212,168,83,0.55)',
                textTransform: 'uppercase',
                fontWeight: 700,
              }}
            >
              Luxury Decking
            </div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginTop: 4 }}>
              <span
                style={{
                  fontSize: 32,
                  fontWeight: 800,
                  color: '#E8E0D4',
                  fontFamily: "'Playfair Display', Georgia, serif",
                  letterSpacing: 1,
                }}
              >
                THE MATERIAL
              </span>
              <span
                style={{
                  fontSize: 32,
                  fontWeight: 800,
                  color: '#D4A853',
                  fontFamily: "'Playfair Display', Georgia, serif",
                  fontStyle: 'italic',
                  letterSpacing: 1,
                }}
              >
                MATRIX
              </span>
            </div>
          </div>

          {/* Right controls */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            {/* Railings toggle */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span
                style={{
                  fontSize: 10,
                  letterSpacing: 2,
                  color: 'rgba(255,255,255,0.4)',
                  textTransform: 'uppercase',
                  fontWeight: 700,
                }}
              >
                Railings
              </span>
              <button
                className="lux-btn"
                onClick={() => setShowRailings(!showRailings)}
                aria-label={showRailings ? 'Turn railings off' : 'Turn railings on'}
                style={{
                  width: 48,
                  height: 26,
                  borderRadius: 13,
                  border: 'none',
                  background: showRailings ? 'rgba(212,168,83,0.3)' : 'rgba(255,255,255,0.08)',
                  position: 'relative',
                  cursor: 'pointer',
                  transition: 'background 0.3s ease',
                  padding: 0,
                }}
              >
                <div
                  style={{
                    width: 20,
                    height: 20,
                    borderRadius: '50%',
                    background: showRailings ? '#D4A853' : 'rgba(255,255,255,0.35)',
                    position: 'absolute',
                    top: 3,
                    left: showRailings ? 25 : 3,
                    transition: 'all 0.3s cubic-bezier(0.16,1,0.3,1)',
                    boxShadow: showRailings ? '0 0 10px rgba(212,168,83,0.35)' : 'none',
                  }}
                />
              </button>
            </div>

            {/* Compare button */}
            <button
              className="lux-btn"
              disabled={selectedForComparison.length === 0}
              onClick={() => setIsComparisonOpen(true)}
              style={{
                padding: '8px 20px',
                borderRadius: 6,
                border:
                  selectedForComparison.length > 0
                    ? '1px solid rgba(212,168,83,0.3)'
                    : '1px solid rgba(255,255,255,0.08)',
                background:
                  selectedForComparison.length > 0 ? 'rgba(212,168,83,0.08)' : 'transparent',
                color:
                  selectedForComparison.length > 0 ? '#D4A853' : 'rgba(255,255,255,0.3)',
                fontSize: 11,
                fontWeight: 700,
                letterSpacing: 1.5,
                cursor: selectedForComparison.length > 0 ? 'pointer' : 'not-allowed',
                textTransform: 'uppercase',
              }}
            >
              Compare ({selectedForComparison.length})
            </button>

            {selectedForComparison.length > 0 && (
              <button
                className="lux-btn"
                onClick={() => setSelectedForComparison([])}
                style={{
                  padding: '4px 8px',
                  background: 'transparent',
                  border: 'none',
                  color: 'rgba(255,255,255,0.4)',
                  fontSize: 9,
                  fontWeight: 700,
                  letterSpacing: 1.5,
                  textTransform: 'uppercase',
                  cursor: 'pointer',
                }}
              >
                Reset
              </button>
            )}
          </div>
        </div>

        {/* Filter row: Size + Tier */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 24,
            marginTop: 14,
            paddingTop: 12,
            borderTop: '1px solid rgba(255,255,255,0.04)',
            flexWrap: 'wrap',
          }}
        >
          {/* Size pills */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span
              style={{
                fontSize: 9,
                letterSpacing: 2,
                color: 'rgba(255,255,255,0.3)',
                textTransform: 'uppercase',
                marginRight: 6,
                fontWeight: 700,
              }}
            >
              Size
            </span>
            {DECK_SIZES_MATRIX.map((s) => {
              const isActive = selectedSize === s.value;
              return (
                <button
                  key={s.value}
                  className="lux-btn"
                  onClick={() => setSelectedSize(s.value)}
                  style={{
                    padding: '6px 14px',
                    borderRadius: 4,
                    border: 'none',
                    background: isActive ? 'rgba(255,255,255,0.12)' : 'rgba(255,255,255,0.03)',
                    color: isActive ? '#E8E0D4' : 'rgba(255,255,255,0.35)',
                    fontSize: 11,
                    fontWeight: 700,
                    boxShadow: isActive ? 'inset 0 0 0 1px rgba(255,255,255,0.18)' : 'none',
                  }}
                >
                  {s.label}
                </button>
              );
            })}
          </div>

          {/* Divider */}
          <div style={{ width: 1, height: 20, background: 'rgba(255,255,255,0.08)' }} />

          {/* Tier filter with badges */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span
              style={{
                fontSize: 9,
                letterSpacing: 2,
                color: 'rgba(255,255,255,0.3)',
                textTransform: 'uppercase',
                marginRight: 6,
                fontWeight: 700,
              }}
            >
              Tier
            </span>
            <button
              className="lux-btn"
              onClick={() => setActiveTierFilter('All')}
              style={{
                padding: '6px 14px',
                borderRadius: 4,
                border: 'none',
                background:
                  activeTierFilter === 'All' ? 'rgba(255,255,255,0.12)' : 'rgba(255,255,255,0.03)',
                color: activeTierFilter === 'All' ? '#E8E0D4' : 'rgba(255,255,255,0.35)',
                fontSize: 11,
                fontWeight: 700,
                boxShadow:
                  activeTierFilter === 'All' ? 'inset 0 0 0 1px rgba(255,255,255,0.18)' : 'none',
              }}
            >
              All
            </button>
            {tierIds.map((t) => {
              const isActive = activeTierFilter === t;
              return (
                <button
                  key={t}
                  className="lux-btn"
                  onClick={() => setActiveTierFilter(t)}
                  style={{
                    padding: '4px 12px',
                    borderRadius: 4,
                    border: 'none',
                    background: isActive
                      ? t === TierType.SIGNATURE
                        ? 'rgba(212,168,83,0.15)'
                        : 'rgba(255,255,255,0.08)'
                      : 'rgba(255,255,255,0.03)',
                    color: isActive
                      ? t === TierType.SIGNATURE
                        ? '#D4A853'
                        : '#E8E0D4'
                      : 'rgba(255,255,255,0.35)',
                    fontSize: 11,
                    fontWeight: 700,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    boxShadow: isActive
                      ? t === TierType.SIGNATURE
                        ? 'inset 0 0 0 1px rgba(212,168,83,0.35)'
                        : 'inset 0 0 0 1px rgba(255,255,255,0.18)'
                      : 'none',
                  }}
                >
                  <TierBadge tier={t} size={20} />
                  {TIER_CONFIG_MATRIX[t].label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Context strip: selected size + railing adder */}
        <div
          style={{
            marginTop: 14,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '10px 18px 10px 16px',
            borderLeft: '2px solid #D4A853',
            background: 'rgba(255,255,255,0.025)',
            borderRadius: '0 6px 6px 0',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
            <span
              style={{
                fontSize: 11,
                fontWeight: 800,
                color: '#E8E0D4',
                textTransform: 'uppercase',
                letterSpacing: 2,
              }}
            >
              {selectedSize} Footprint
            </span>
            <span
              style={{
                fontSize: 10,
                color: 'rgba(255,255,255,0.4)',
                fontWeight: 600,
                textTransform: 'uppercase',
                letterSpacing: 2,
              }}
            >
              Base Estimate &bull; Helical Piles &amp; 2 Steps Included
            </span>
          </div>
          <p
            style={{
              margin: 0,
              fontSize: 12,
              fontWeight: 800,
              color: '#D4A853',
              textTransform: 'uppercase',
              letterSpacing: 2,
            }}
          >
            Add Railings: +{fmtCAD(railingCost)}
          </p>
        </div>
      </div>

      {/* ══ PRODUCT GRID ══ */}
      <div
        style={{
          position: 'relative',
          zIndex: 2,
          flex: 1,
          overflow: 'auto',
          padding: '12px 28px 40px',
        }}
      >
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))',
            gap: 12,
            paddingBottom: 40,
          }}
        >
          {filteredMaterials.map((m) => (
            <MatrixProductCard
              key={m.id}
              material={m}
              size={selectedSize}
              showRailings={showRailings}
              railingCost={railingCost}
              isSelected={selectedForComparison.includes(m.id)}
              onToggle={() => toggleMaterialSelection(m.id)}
              onPrint={() => onPrintRequest([m], selectedSize, showRailings, 'single')}
            />
          ))}
        </div>
      </div>

      {/* Bottom scroll fade — 40px gradient at the base of the scroll area. */}
      <div
        aria-hidden
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          bottom: 0,
          height: 40,
          background: 'linear-gradient(to top, #0A0A0A, transparent)',
          pointerEvents: 'none',
          zIndex: 2,
        }}
      />

      {isComparisonOpen && (
        <MatrixComparisonOverlay
          materials={selectedMaterials}
          size={selectedSize}
          showRailings={showRailings}
          railingCost={railingCost}
          onClose={() => setIsComparisonOpen(false)}
          onPrint={() =>
            onPrintRequest(selectedMaterials, selectedSize, showRailings, 'compare')
          }
        />
      )}
    </div>
  );
};

export default MaterialMatrixShowroom;
