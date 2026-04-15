import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Maximize2, Minimize2 } from 'lucide-react';
import { loadPriceBook } from '../utils/priceBook';
import {
  TIER_TO_ITEM_ID,
  PRICING_DATA,
  PACKAGE_PRICING,
  COSTS,
  BASELINES,
  BASE_SQFT_PRICE,
  BASE_STEP_PRICE,
  BASE_RAILING_PRICE,
  BASE_CEDAR_RAILING_PRICE,
  FINANCING_FACTOR,
  type ShowroomEstimatorProps,
  type Dimensions,
  type ClientInfo,
  type PricingTier,
  type PackageSelection,
  type PackageSize,
  type PackageLevel,
} from './EstimatorCalculatorView';

/*
 * EstimatorShowroomView
 *
 * Showroom-optimised replacement for the in-file CustomEstimator render.
 * Designed for a 42" 1920x1080 TV in the mobile sales trailer.
 * All pricing logic, price book integration, and handlers are preserved
 * verbatim from CustomEstimator. Only the visual layout changes.
 *
 * Category tab labels come from a showroom-only map so we can use
 * "Lighting" instead of "Accessories" etc. without touching pricing data.
 */

const CATEGORY_LABELS: Record<string, string> = {
  design: 'Design & Permits',
  foundation: 'Foundation',
  framing: 'Framing',
  decking: 'Decking',
  railing: 'Railings',
  skirting: 'Skirting',
  privacy: 'Privacy Walls',
  accessories: 'Lighting',
  pergolas: 'Pergolas',
  extras: 'Site & Landscaping',
  protection: 'Warranty & Protection',
};

// Hand-tuned wood/composite-realistic preview colours for the 3D preview SVG.
// Pricing DB imageColor is a decorative semantic swatch code (purples, bright
// greens, etc.). Do NOT use it for the 3D preview surface — it renders wildly
// unrealistic decks. Keys MUST match the tier IDs in PRICING_DATA 'decking'.
const TIER_TO_PREVIEW_COLOR: Record<string, { primary: string; secondary: string }> = {
  // Natural wood
  pt_wood_decking:             { primary: '#9E8B6E', secondary: '#8A7A5E' },
  cedar_decking:               { primary: '#C27A3A', secondary: '#A8652E' },
  // Fiberon
  fiberon_goodlife_weekender:  { primary: '#7B8B5E', secondary: '#6B7B4E' },
  fiberon_goodlife_escapes:    { primary: '#8B7565', secondary: '#7B6555' },
  fiberon_sanctuary:           { primary: '#6B5B4B', secondary: '#5B4B3B' },
  fiberon_concordia:           { primary: '#5A6B7B', secondary: '#4A5B6B' },
  fiberon_paramount:           { primary: '#B09878', secondary: '#9A8268' },
  fiberon_promenade:           { primary: '#8A7155', secondary: '#6F5A42' },
  // TimberTech
  tt_prime:                    { primary: '#A08B6F', secondary: '#87755E' },
  tt_prime_plus:               { primary: '#927B5E', secondary: '#7A6650' },
  tt_terrain:                  { primary: '#7A6147', secondary: '#5E4B34' },
  tt_reserve:                  { primary: '#6D5842', secondary: '#503E2D' },
  tt_legacy:                   { primary: '#8C6E4A', secondary: '#6E5538' },
  // Azek
  azek_harvest:                { primary: '#9C805C', secondary: '#7D6444' },
  azek_landmark:               { primary: '#7F6850', secondary: '#634F3A' },
  azek_vintage:                { primary: '#94795A', secondary: '#7A6044' },
  // ClubHouse
  woodbridge_pvc:              { primary: '#A08868', secondary: '#836C4F' },
  // Eva-Last
  eva_infinity:                { primary: '#8B7660', secondary: '#6F5D48' },
  eva_apex:                    { primary: '#B39B78', secondary: '#96805E' },
  eva_pioneer:                 { primary: '#6D5A42', secondary: '#53432E' },
};

const FALLBACK_PREVIEW_COLOR = { primary: '#8A7A5E', secondary: '#6F5D48' };

const getPreviewColor = (tierId: string | undefined) =>
  (tierId && TIER_TO_PREVIEW_COLOR[tierId]) || FALLBACK_PREVIEW_COLOR;

// FIX 3 — Derive a visible tier classification label from the priceDelta
// magnitude. Applied only to categories where PRICING_DATA uses per-unit
// priceDelta values (decking is stored as raw-minus-base, skirting as
// absolute per-sqft cost). Returns null for categories without a clear
// price range (railing uses componentized pricing with mostly zeroed
// deltas, so labeling by delta would mislead).
const getTierFromPrice = (
  category: string,
  priceDelta: number
): { label: string; color: string } | null => {
  if (category !== 'decking' && category !== 'skirting') return null;
  if (priceDelta < 5) return { label: 'SELECT', color: '#7B8B5E' }; // green
  if (priceDelta < 15) return { label: 'PREMIUM', color: '#C27A3A' }; // orange
  if (priceDelta < 30) return { label: 'ELITE', color: '#5B9BD5' }; // blue
  return { label: 'SIGNATURE', color: '#D4A853' }; // gold
};

const fmtCAD = (n: number) =>
  new Intl.NumberFormat('en-CA', {
    style: 'currency',
    currency: 'CAD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(n);

const FONT_BODY = "'DM Sans', -apple-system, BlinkMacSystemFont, sans-serif";
const FONT_DISPLAY = "'Playfair Display', Georgia, serif";

// Grain overlay SVG (inline data-uri). Matches mockup exactly.
const GRAIN_BG = `url("data:image/svg+xml,%3Csvg viewBox='0 0 512 512' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`;

const ShowroomGlobalStyle: React.FC = () => (
  // Scoped styles for the showroom view. All selectors are prefixed
  // with .est-showroom-root so they do not leak to the rest of FieldPro.
  <style>{`
    @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;600;700;800&family=DM+Sans:wght@400;500;600;700&display=swap');

    .est-showroom-root {
      --lux-gold: #D4A853;
      --lux-gold-hover: #C49843;
      --lux-blue: #5B9BD5;
      --lux-green-start: #34A853;
      --lux-green-end: #2E9648;
      --lux-red: #e74c3c;
      --est-bg: #0A0A0A;
      --est-bg-elevated: #111111;
      --est-card-default: rgba(255,255,255,0.015);
      --est-card-selected: rgba(212,168,83,0.06);
      --est-border-subtle: rgba(212,168,83,0.10);
      --est-border-active: rgba(212,168,83,0.55);
      --est-text-primary: #E8E0D4;
      --est-text-secondary: rgba(232,224,212,0.45);
      --est-text-tertiary: rgba(232,224,212,0.25);
      --est-grain-opacity: 0.025; /* TODO: may need 0.035 on 42" TV - verify on-site */
    }

    .est-showroom-root {
      font-family: ${FONT_BODY};
      background: var(--est-bg);
      color: var(--est-text-primary);
      width: 100%;
      height: 100%;
      display: flex;
      flex-direction: column;
      overflow: hidden;
      position: relative;
      box-sizing: border-box;
    }
    .est-showroom-root *, .est-showroom-root *::before, .est-showroom-root *::after {
      box-sizing: border-box;
    }

    .est-showroom-root .est-grain {
      position: absolute;
      inset: 0;
      opacity: var(--est-grain-opacity);
      pointer-events: none;
      z-index: 1;
      background-image: ${GRAIN_BG};
    }

    .est-showroom-root input,
    .est-showroom-root select,
    .est-showroom-root button,
    .est-showroom-root textarea {
      font-family: inherit;
    }

    .est-showroom-root ::-webkit-scrollbar { width: 3px; height: 3px; }
    .est-showroom-root ::-webkit-scrollbar-track { background: transparent; }
    .est-showroom-root ::-webkit-scrollbar-thumb {
      background: rgba(212,168,83,0.15);
      border-radius: 3px;
    }
    .est-showroom-root select option { background: #1a1a1a; color: var(--est-text-primary); }

    .est-showroom-root .est-cat-tab {
      padding: 10px 18px;
      background: transparent;
      border: none;
      border-bottom: 4px solid transparent;
      color: rgba(232,224,212,0.4);
      font-size: 10px;
      letter-spacing: 2px;
      text-transform: uppercase;
      cursor: pointer;
      font-family: ${FONT_BODY};
      font-weight: 600;
      white-space: nowrap;
      transition: color 0.2s ease, border-color 0.2s ease;
      position: relative;
    }
    .est-showroom-root .est-cat-tab:hover {
      color: rgba(232,224,212,0.75);
    }
    .est-showroom-root .est-cat-tab.active {
      color: var(--lux-gold);
      border-bottom-color: var(--lux-gold);
    }

    .est-showroom-root .est-panel-toggle:hover {
      color: rgba(212,168,83,0.9);
      filter: brightness(1.08);
    }

    .est-showroom-root .est-exit-showroom:hover {
      border-color: rgba(212,168,83,0.35);
      color: rgba(212,168,83,0.85);
    }

    .est-showroom-root .est-product-card {
      padding: 0;
      border-radius: 8px;
      overflow: hidden;
      border: 2px solid rgba(255,255,255,0.05);
      background: var(--est-card-default);
      cursor: pointer;
      text-align: left;
      outline: none;
      transition: border-color 0.25s ease, background 0.25s ease, transform 0.35s cubic-bezier(0.16,1,0.3,1), box-shadow 0.3s ease;
      color: inherit;
      font: inherit;
      display: flex;
      flex-direction: column;
    }
    .est-showroom-root .est-product-card.selected {
      border: 2px solid var(--est-border-active);
      background: var(--est-card-selected);
      box-shadow:
        inset 0 0 24px rgba(212,168,83,0.08),
        0 0 0 1px rgba(212,168,83,0.25);
      transform: scale(1.02);
    }
  `}</style>
);

// ---------- component ----------

interface ExtendedProps extends ShowroomEstimatorProps {
  onExit?: () => void;
  view?: 'calculator' | 'packages' | 'materialMatrix' | 'gbb';
  setView?: (v: 'calculator' | 'packages' | 'materialMatrix' | 'gbb') => void;
  isFullScreen?: boolean;
  toggleFullScreen?: () => void;
}

// Per-category dimension inputs rendered in the "Category Inputs" strip above
// the product card grid. Each entry maps a `Dimensions` field to a short label.
// Categories not present here render no strip.
const CATEGORY_INPUTS: Partial<Record<string, { key: keyof Dimensions; label: string }[]>> = {
  railing: [
    { key: 'railingLF', label: 'Railing LF' },
    { key: 'alumPosts', label: 'Alum Posts' },
    { key: 'alumSection6', label: "Alum 6' Sec" },
    { key: 'alumSection8', label: "Alum 8' Sec" },
    { key: 'alumStair6', label: "Alum Stair 6'" },
    { key: 'alumStair8', label: "Alum Stair 8'" },
    { key: 'glassSection6', label: "Glass 6' Sec" },
    { key: 'glassPanelsLF', label: 'Glass Pnl LF' },
    { key: 'framelessSections', label: 'Frmls Sec' },
    { key: 'framelessLF', label: 'Frmls LF' },
    { key: 'drinkRailLF', label: 'Drink Rail LF' },
  ],
  privacy: [
    { key: 'privacyLF', label: 'Privacy LF' },
    { key: 'privacyPosts', label: 'Privacy Posts' },
    { key: 'privacyScreens', label: 'Privacy Scrn' },
  ],
  skirting: [
    { key: 'skirtingSqFt', label: 'Skirting SqFt' },
  ],
  extras: [
    { key: 'borderLF', label: 'Border LF' },
    { key: 'riverWashSqFt', label: 'River Wash SqFt' },
    { key: 'mulchSqFt', label: 'Mulch SqFt' },
    { key: 'steppingStonesCount', label: 'Stepping Stones' },
    { key: 'landscapeSqFt', label: 'Landscape SqFt' },
    { key: 'demoSqFt', label: 'Demo SqFt' },
  ],
  foundation: [
    { key: 'namiFixCount', label: 'Namifix Count' },
  ],
};

const EstimatorShowroomView: React.FC<ExtendedProps> = ({
  dimensions,
  setDimensions,
  selections,
  setSelections,
  lightingQuantities,
  setLightingQuantities,
  clientInfo,
  setClientInfo,
  activeCategory,
  setActiveCategory,
  resetCalculator,
  onSave,
  onAccept,
  pricingSummary,
  estimateNumber,
  activePackage,
  setActivePackage,
  onExit,
  view,
  setView,
  isFullScreen,
  toggleFullScreen,
}) => {
  const [panelOpen, setPanelOpen] = useState<boolean>(true);
  const firstSpecInputRef = useRef<HTMLInputElement | null>(null);

  // Auto-focus the first input in the category-inputs strip when the category
  // changes to one that renders the strip. Helps salesperson flow.
  useEffect(() => {
    if (CATEGORY_INPUTS[activeCategory]) {
      // Defer to next tick so the input is mounted before focusing.
      const id = window.setTimeout(() => {
        firstSpecInputRef.current?.focus();
        firstSpecInputRef.current?.select();
      }, 40);
      return () => window.clearTimeout(id);
    }
  }, [activeCategory]);

  // --- Price book images (same pattern as CustomEstimator) ---
  const priceBookImages = useMemo(() => {
    const book = loadPriceBook();
    const map = new Map<string, string>();
    for (const [tierId, itemId] of Object.entries(TIER_TO_ITEM_ID)) {
      const pbItem = book.items.find((i) => i.id === itemId);
      if (pbItem?.imageUrl) map.set(tierId, pbItem.imageUrl);
    }
    return map;
  }, []);

  const updateDim = (key: keyof Dimensions, val: string) => {
    setDimensions((prev) => ({ ...prev, [key]: parseInt(val) || 0 }));
  };
  const updateClientInfo = (key: keyof ClientInfo, val: string) => {
    setClientInfo((prev) => ({ ...prev, [key]: val }));
  };

  // --- Impact calculation (verbatim from CustomEstimator) ---
  const getOptionImpactValue = (category: string, opt: PricingTier): number => {
    let impact = 0;
    const isPT = selections.decking?.id === 'pt_wood_decking';
    const isCedar = selections.decking?.id === 'cedar_decking';
    const baseRailPrice = isCedar
      ? BASE_CEDAR_RAILING_PRICE
      : isPT
      ? BASE_RAILING_PRICE
      : 0;

    switch (category) {
      case 'design':
        if (opt.calculationType === 'percentage')
          return pricingSummary.fixedSubTotal * opt.priceDelta;
        impact = opt.priceDelta;
        break;
      case 'pergolas':
        impact = opt.priceDelta;
        break;
      case 'foundation':
        if (opt.id === 'nami_fix') {
          impact = dimensions.namiFixCount * opt.priceDelta;
        } else {
          impact = opt.priceDelta * dimensions.footingsCount;
          if (
            dimensions.namiFixCount === 0 &&
            ['sonotube', 'helical', 'pylex_screws'].includes(opt.id)
          ) {
            impact += dimensions.ledgerLF * COSTS.ledgerPerLF;
          }
        }
        break;
      case 'framing':
        impact = opt.priceDelta * dimensions.sqft;
        break;
      case 'decking': {
        const deckingImpact =
          (opt.priceDelta - BASELINES.deckingPriceDelta) * dimensions.sqft;
        const stepsImpact =
          ((opt.stepPrice || BASE_STEP_PRICE) - BASELINES.stepPrice) *
          dimensions.steps;
        const fasciaImpact =
          ((opt.fasciaPrice || COSTS.fasciaPerLF) - BASELINES.fasciaPrice) *
          dimensions.fasciaLF;
        impact = deckingImpact + stepsImpact + fasciaImpact;
        break;
      }
      case 'railing':
        if (opt.calculationType === 'aluminum_component') {
          const alumTotal =
            dimensions.alumPosts * COSTS.alumPost +
            dimensions.alumSection6 * COSTS.alum6 +
            dimensions.alumSection8 * COSTS.alum8 +
            dimensions.alumStair6 * COSTS.alumStair6 +
            dimensions.alumStair8 * COSTS.alumStair8;
          impact = alumTotal - baseRailPrice * dimensions.railingLF;
        } else if (opt.calculationType === 'aluminum_glass_component') {
          const glassTotal =
            dimensions.alumPosts * COSTS.alumPost +
            dimensions.glassSection6 * COSTS.glassSection6 +
            dimensions.glassPanelsLF * COSTS.glassPanelsLF;
          impact = glassTotal - baseRailPrice * dimensions.railingLF;
        } else if (opt.calculationType === 'frameless_glass_component') {
          const framelessTotal =
            dimensions.framelessSections * COSTS.framelessSection +
            dimensions.framelessLF * COSTS.framelessLF;
          impact = framelessTotal - baseRailPrice * dimensions.railingLF;
        } else if (opt.calculationType === 'lump_sum') {
          impact = opt.priceDelta - baseRailPrice * dimensions.railingLF;
        } else if (opt.id === 'alum_drink_rail') {
          impact = opt.priceDelta * dimensions.drinkRailLF;
        } else {
          const currentPrice = BASE_RAILING_PRICE + opt.priceDelta;
          impact = (currentPrice - baseRailPrice) * dimensions.railingLF;
        }
        break;
      case 'skirting':
        impact = opt.priceDelta * dimensions.skirtingSqFt;
        break;
      case 'accessories':
        impact = opt.priceDelta * (lightingQuantities[opt.id] || 0);
        break;
      case 'privacy':
        if (opt.id === 'privacy_sunbelly_combined') {
          impact =
            dimensions.privacyPosts * COSTS.privacyPost +
            dimensions.privacyScreens * COSTS.privacyScreen;
        } else {
          impact = dimensions.privacyLF * opt.priceDelta;
        }
        break;
      case 'extras':
        if (opt.calculationType === 'sqft_add')
          impact = opt.priceDelta * dimensions.sqft;
        else if (opt.calculationType === 'lf_border_add')
          impact = opt.priceDelta * dimensions.borderLF;
        else if (opt.calculationType === 'river_wash_sqft')
          impact = opt.priceDelta * dimensions.riverWashSqFt;
        else if (opt.calculationType === 'mulch_sqft')
          impact = opt.priceDelta * dimensions.mulchSqFt;
        else if (opt.calculationType === 'stepping_stones_qty')
          impact = opt.priceDelta * dimensions.steppingStonesCount;
        else impact = opt.priceDelta;
        break;
      case 'protection':
        if (opt.calculationType === 'percentage') {
          return pricingSummary.fixedSubTotal * opt.priceDelta;
        }
        break;
    }
    return impact;
  };

  // --- Selection handler (verbatim from CustomEstimator) ---
  const handleOptionClick = (category: string, opt: PricingTier) => {
    if (
      category === 'extras' ||
      category === 'design' ||
      category === 'protection' ||
      category === 'privacy'
    ) {
      const isSelected = selections[category].some(
        (e: PricingTier) => e.id === opt.id
      );
      let updatedSelections = isSelected
        ? selections[category].filter((e: PricingTier) => e.id !== opt.id)
        : [...selections[category], opt];

      if (!isSelected && opt.calculationType === 'lf_border_add') {
        updatedSelections = updatedSelections.filter(
          (e: PricingTier) =>
            e.calculationType !== 'lf_border_add' || e.id === opt.id
        );
      }

      setSelections({ ...selections, [category]: updatedSelections });
      return;
    }
    if (category === 'railing' && opt.id === 'alum_drink_rail') {
      if (!(dimensions.drinkRailLF > 0)) {
        setDimensions((prev) => ({ ...prev, drinkRailLF: 1 }));
      }
      return;
    }
    if (category === 'accessories') {
      if (!(lightingQuantities[opt.id] > 0)) {
        setLightingQuantities((prev) => ({ ...prev, [opt.id]: 1 }));
      }
      return;
    }
    if (category === 'foundation' && opt.id === 'nami_fix') {
      setDimensions((prev) => ({
        ...prev,
        namiFixCount: prev.namiFixCount > 0 ? 0 : 1,
      }));
      return;
    }
    setSelections({
      ...selections,
      [category]: selections[category]?.id === opt.id ? null : opt,
    });
  };

  const handleQtyChange = (id: string, delta: number) => {
    setLightingQuantities((prev) => ({
      ...prev,
      [id]: Math.max(0, (prev[id] || 0) + delta),
    }));
  };

  // --- Package draft + apply (verbatim logic) ---
  const [packageDraft, setPackageDraft] = useState<PackageSelection>({
    size: '12X12',
    level: 'GOLD',
    withRailings: true,
  });

  const applyShowroomPackage = () => {
    setActivePackage({ ...packageDraft });

    const dims: Record<
      PackageSize,
      { sq: number; r: number; f: number; s: number; fl: number; ll: number }
    > = {
      '12X12': { sq: 144, r: 36, f: 4, s: 2, fl: 48, ll: 12 },
      '12X16': { sq: 192, r: 44, f: 6, s: 2, fl: 56, ll: 16 },
      '12X20': { sq: 240, r: 52, f: 6, s: 2, fl: 64, ll: 20 },
      '16X16': { sq: 256, r: 48, f: 6, s: 2, fl: 64, ll: 16 },
      '16X20': { sq: 320, r: 56, f: 8, s: 2, fl: 72, ll: 20 },
      '20X20': { sq: 400, r: 60, f: 9, s: 2, fl: 80, ll: 20 },
    };
    const d = dims[packageDraft.size];
    setDimensions((prev) => ({
      ...prev,
      sqft: d.sq,
      railingLF: packageDraft.withRailings ? d.r : 0,
      footingsCount: d.f,
      steps: d.s,
      fasciaLF: d.fl,
      ledgerLF: d.ll,
    }));

    const deckOpts = PRICING_DATA.find((c) => c.id === 'decking')?.options || [];
    const railOpts = PRICING_DATA.find((c) => c.id === 'railing')?.options || [];

    let targetDeckId = 'pt_wood_decking';
    let targetRailId: string | null = packageDraft.withRailings
      ? 'pt_wood_railing'
      : null;

    if (packageDraft.level === 'GOLD') targetDeckId = 'fiberon_goodlife_weekender';
    if (packageDraft.level === 'PLATINUM') targetDeckId = 'fiberon_sanctuary';
    if (packageDraft.level === 'DIAMOND') targetDeckId = 'fiberon_concordia';

    if (packageDraft.withRailings && packageDraft.level !== 'SILVER') {
      targetRailId =
        packageDraft.level === 'DIAMOND' ? 'frameless_glass' : 'fortress_al13_pkg';
    }

    setSelections((prev: any) => ({
      ...prev,
      decking: deckOpts.find((o) => o.id === targetDeckId) || null,
      railing: targetRailId
        ? railOpts.find((o) => o.id === targetRailId) || null
        : null,
      extras:
        packageDraft.level === 'PLATINUM' || packageDraft.level === 'DIAMOND'
          ? PRICING_DATA.find((c) => c.id === 'extras')?.options.filter((o) =>
              ['joist_guard', 'fabric_stone'].includes(o.id)
            ) || []
          : [],
    }));
  };

  // --- Derived values for display ---
  const activeCatObj = PRICING_DATA.find((c) => c.id === activeCategory);
  const activeOptions = activeCatObj?.options || [];
  const activeDecking = selections.decking;

  // Total and monthly from pricingSummary (preserve existing logic exactly)
  const total = Math.round(pricingSummary.subTotal || 0);
  const monthly = pricingSummary.monthly || Math.round(total * FINANCING_FACTOR);

  // Build summary line items from pricingSummary.impacts (already computed by parent).
  // Rendered in the BUILD SUMMARY panel directly under the price plaque (FIX 5).
  const chips = (pricingSummary.impacts || [])
    .filter((imp: any) => typeof imp.value === 'number')
    .map((imp: any) => ({ label: imp.label, value: Math.round(imp.value) }));

  // --- Helpers for per-card state ---
  const isOptionSelected = (catId: string, opt: PricingTier): boolean => {
    if (catId === 'accessories') return (lightingQuantities[opt.id] || 0) > 0;
    if (opt.id === 'nami_fix') return dimensions.namiFixCount > 0;
    if (opt.id === 'alum_drink_rail') return dimensions.drinkRailLF > 0;
    if (Array.isArray(selections[catId]))
      return selections[catId].some((e: any) => e.id === opt.id);
    return selections[catId]?.id === opt.id;
  };

  // ---------- RENDER ----------
  return (
    <div className="est-showroom-root">
      <ShowroomGlobalStyle />
      <div className="est-grain" />

      {/* ══ TOP NAV BAR ══ */}
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
          background: 'var(--est-bg-elevated)',
          borderBottom: '1px solid rgba(255,255,255,0.06)',
        }}
      >
        <button
          className="est-exit-showroom"
          onClick={() => onExit?.()}
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
            transition: 'border-color 0.2s ease, color 0.2s ease',
          }}
        >
          {'\u2039'} Exit Showroom
        </button>

        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          {[
            { id: 'calculator' as const, label: 'Estimator' },
            { id: 'packages' as const, label: 'Showroom Packages' },
            { id: 'materialMatrix' as const, label: 'Material Matrix' },
          ].map((tab) => {
            const isActive = view === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setView?.(tab.id)}
                style={{
                  padding: '10px 24px',
                  borderRadius: 4,
                  border: 'none',
                  background: isActive ? 'var(--lux-gold)' : 'rgba(255,255,255,0.06)',
                  color: isActive ? '#0A0A0A' : 'rgba(255,255,255,0.5)',
                  fontSize: 12,
                  fontWeight: 700,
                  letterSpacing: 1,
                  cursor: 'pointer',
                  textTransform: 'uppercase',
                }}
              >
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* ══ MAIN CONTENT ══ */}
      <div
        style={{
          flex: 1,
          display: 'flex',
          overflow: 'hidden',
          position: 'relative',
          zIndex: 10,
          paddingBottom: 12,
        }}
      >
        {/* ── LEFT: Collapsible Input Panel ── */}
        <div
          style={{
            width: panelOpen ? 260 : 0,
            overflow: 'hidden',
            transition: 'width 0.5s cubic-bezier(0.16,1,0.3,1)',
            borderRight: panelOpen ? '1px solid rgba(212,168,83,0.08)' : 'none',
            background: 'rgba(0,0,0,0.4)',
            flexShrink: 0,
          }}
        >
          <div
            style={{
              width: 260,
              padding: '14px 14px 12px',
              height: '100%',
              overflowY: 'auto',
            }}
          >
            {/* Package base */}
            <div style={{ marginBottom: 14 }}>
              <div
                style={{
                  fontSize: 9,
                  letterSpacing: 2,
                  color: 'var(--lux-gold)',
                  textTransform: 'uppercase',
                  marginBottom: 10,
                  fontWeight: 700,
                }}
              >
                Showroom Package Price
              </div>
              <label style={labelStyle}>Package Base</label>
              <select
                value={packageDraft.size}
                onChange={(e) =>
                  setPackageDraft({ ...packageDraft, size: e.target.value as PackageSize })
                }
                style={inputStyle}
              >
                {Object.keys(PACKAGE_PRICING).map((s) => (
                  <option key={s} value={s}>
                    {s} Series
                  </option>
                ))}
              </select>
              <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                <div style={{ flex: 1 }}>
                  <label style={labelStyle}>Level</label>
                  <select
                    value={packageDraft.level}
                    onChange={(e) =>
                      setPackageDraft({
                        ...packageDraft,
                        level: e.target.value as PackageLevel,
                      })
                    }
                    style={{ ...inputStyle, color: 'var(--lux-gold)' }}
                  >
                    <option value="SILVER">Silver</option>
                    <option value="GOLD">Gold</option>
                    <option value="PLATINUM">Platinum</option>
                    <option value="DIAMOND">Diamond</option>
                  </select>
                </div>
                <div style={{ flex: 1 }}>
                  <label style={labelStyle}>Railings</label>
                  <select
                    value={packageDraft.withRailings ? 'yes' : 'no'}
                    onChange={(e) =>
                      setPackageDraft({
                        ...packageDraft,
                        withRailings: e.target.value === 'yes',
                      })
                    }
                    style={inputStyle}
                  >
                    <option value="yes">With Railings</option>
                    <option value="no">No Railings</option>
                  </select>
                </div>
              </div>
              <button
                onClick={applyShowroomPackage}
                style={{
                  width: '100%',
                  padding: '10px',
                  borderRadius: 4,
                  border: 'none',
                  background: 'var(--lux-gold)',
                  color: '#0A0A0A',
                  fontSize: 11,
                  fontWeight: 700,
                  letterSpacing: 1,
                  cursor: 'pointer',
                  textTransform: 'uppercase',
                  marginTop: 10,
                }}
              >
                Apply Package Base
              </button>
              {activePackage && (
                <div
                  style={{
                    marginTop: 8,
                    padding: '6px 8px',
                    background: 'rgba(212,168,83,0.08)',
                    border: '1px solid rgba(212,168,83,0.2)',
                    borderRadius: 4,
                    fontSize: 9,
                    color: 'var(--lux-gold)',
                    letterSpacing: 1,
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  }}
                >
                  <span style={{ textTransform: 'uppercase', fontWeight: 700 }}>
                    Active: {activePackage.size} {activePackage.level}
                  </span>
                  <button
                    onClick={() => setActivePackage(null)}
                    style={{
                      background: 'transparent',
                      border: 'none',
                      color: 'rgba(212,168,83,0.8)',
                      cursor: 'pointer',
                      fontSize: 10,
                      fontWeight: 700,
                    }}
                  >
                    {'\u00D7'}
                  </button>
                </div>
              )}
            </div>

            {/* Client info */}
            <div
              style={{
                borderTop: '1px solid rgba(212,168,83,0.08)',
                paddingTop: 12,
                marginBottom: 12,
              }}
            >
              <div style={sectionTitleStyle}>Estimate Prepared For</div>
              <label style={labelStyle}>Client Name</label>
              <input
                value={clientInfo.name}
                onChange={(e) => updateClientInfo('name', e.target.value)}
                style={{ ...inputStyle, marginBottom: 8 }}
              />
              <label style={labelStyle}>Install Address</label>
              <input
                value={clientInfo.address}
                onChange={(e) => updateClientInfo('address', e.target.value)}
                style={inputStyle}
              />
            </div>

            {/* Deck specs */}
            <div
              style={{
                borderTop: '1px solid rgba(212,168,83,0.08)',
                paddingTop: 12,
              }}
            >
              <div style={sectionTitleStyle}>Deck Specs</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                {[
                  { label: 'Sq Ft', key: 'sqft' as const },
                  { label: 'Ledger LF', key: 'ledgerLF' as const },
                  { label: 'Fascia LF', key: 'fasciaLF' as const },
                  { label: 'Footings', key: 'footingsCount' as const },
                  { label: 'Steps (qty)', key: 'steps' as const },
                ].map((spec) => (
                  <div key={spec.key}>
                    <label style={labelStyle}>{spec.label}</label>
                    <input
                      type="number"
                      value={dimensions[spec.key] || ''}
                      onChange={(e) => updateDim(spec.key, e.target.value)}
                      style={inputStyle}
                    />
                  </div>
                ))}
              </div>
            </div>

            {/* Action buttons */}
            <div
              style={{
                borderTop: '1px solid rgba(212,168,83,0.08)',
                paddingTop: 14,
                marginTop: 14,
              }}
            >
              <button
                onClick={onSave}
                style={{
                  width: '100%',
                  padding: '12px',
                  borderRadius: 6,
                  border: 'none',
                  background: 'linear-gradient(135deg, var(--lux-gold), var(--lux-gold-hover))',
                  color: '#0A0A0A',
                  fontSize: 11,
                  fontWeight: 700,
                  letterSpacing: 1.5,
                  cursor: 'pointer',
                  textTransform: 'uppercase',
                  marginBottom: 8,
                  boxShadow: '0 2px 12px rgba(212,168,83,0.2)',
                }}
              >
                {'\u2191'} Save Estimate, Send Quote
              </button>

              <button
                onClick={onAccept}
                style={{
                  width: '100%',
                  padding: '14px',
                  borderRadius: 6,
                  border: 'none',
                  background: 'linear-gradient(135deg, var(--lux-green-start), var(--lux-green-end))',
                  color: '#FFFFFF',
                  fontSize: 13,
                  fontWeight: 700,
                  letterSpacing: 1.5,
                  cursor: 'pointer',
                  textTransform: 'uppercase',
                  marginBottom: 8,
                  boxShadow: '0 2px 16px rgba(52,168,83,0.25)',
                }}
              >
                {'\u2713'} Accept Quote
              </button>

              <button
                onClick={resetCalculator}
                style={{
                  width: '100%',
                  padding: '10px',
                  borderRadius: 6,
                  border: '1.5px solid rgba(231,76,60,0.5)',
                  background: 'transparent',
                  color: 'rgba(231,76,60,0.85)',
                  fontSize: 10,
                  fontWeight: 600,
                  letterSpacing: 1.5,
                  cursor: 'pointer',
                  textTransform: 'uppercase',
                }}
              >
                Reset Estimator
              </button>
            </div>
          </div>
        </div>

        {/* Panel toggle arrow */}
        <button
          className="est-panel-toggle"
          onClick={() => setPanelOpen(!panelOpen)}
          style={{
            position: 'absolute',
            left: panelOpen ? 248 : 0,
            top: '50%',
            transform: 'translateY(-50%)',
            width: 20,
            height: 50,
            borderRadius: '0 6px 6px 0',
            border: '1px solid rgba(212,168,83,0.15)',
            borderLeft: 'none',
            background: 'rgba(20,20,20,0.9)',
            color: 'rgba(212,168,83,0.6)',
            fontSize: 12,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 15,
            transition: 'left 0.5s cubic-bezier(0.16,1,0.3,1)',
          }}
          aria-label={panelOpen ? 'Collapse panel' : 'Expand panel'}
        >
          {panelOpen ? '\u2039' : '\u203A'}
        </button>

        {/* ── RIGHT: Main configurator ── */}
        <div
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
          }}
        >
          {/* Header row */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'flex-start',
              padding: '12px 24px 8px',
              flexShrink: 0,
            }}
          >
            {/* Wordmark */}
            <div>
              <div
                style={{
                  fontSize: 9,
                  letterSpacing: 4,
                  color: 'rgba(212,168,83,0.5)',
                  textTransform: 'uppercase',
                }}
              >
                Luxury
              </div>
              <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8 }}>
                <span
                  style={{
                    fontSize: 24,
                    fontWeight: 800,
                    color: 'var(--lux-gold)',
                    fontFamily: FONT_DISPLAY,
                    letterSpacing: 2,
                  }}
                >
                  DECKING
                </span>
                <span
                  style={{
                    fontSize: 10,
                    letterSpacing: 2,
                    color: 'rgba(212,168,83,0.35)',
                    textTransform: 'uppercase',
                    paddingBottom: 3,
                  }}
                >
                  Estimator
                </span>
              </div>
            </div>

            {/* Right: estimate info + price box */}
            <div
              style={{
                textAlign: 'right',
                display: 'flex',
                alignItems: 'flex-start',
                gap: 24,
                position: 'relative',
              }}
            >
              {toggleFullScreen && (
                <button
                  onClick={toggleFullScreen}
                  title={isFullScreen ? 'Exit Fullscreen' : 'Enter Fullscreen'}
                  aria-label={isFullScreen ? 'Exit Fullscreen' : 'Enter Fullscreen'}
                  style={{
                    position: 'absolute',
                    top: -6,
                    right: -6,
                    padding: '6px 8px',
                    borderRadius: 4,
                    border: '1px solid rgba(212,168,83,0.10)',
                    background: 'rgba(255,255,255,0.06)',
                    color: 'rgba(212,168,83,0.55)',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    transition: 'color 0.2s ease, border-color 0.2s ease',
                  }}
                >
                  {isFullScreen ? (
                    <Minimize2 size={16} strokeWidth={2} />
                  ) : (
                    <Maximize2 size={16} strokeWidth={2} />
                  )}
                </button>
              )}
              <div>
                <div
                  style={{
                    fontSize: 10,
                    color: 'var(--lux-gold)',
                    letterSpacing: 1,
                    fontWeight: 600,
                  }}
                >
                  ESTIMATE #{estimateNumber}
                </div>
                <div
                  style={{
                    fontSize: 16,
                    fontWeight: 700,
                    color: 'var(--est-text-primary)',
                    fontFamily: FONT_DISPLAY,
                    marginTop: 2,
                  }}
                >
                  {clientInfo.name || 'Valued Client'}
                </div>
                <div
                  style={{
                    fontSize: 10,
                    color: 'var(--est-text-secondary)',
                    marginTop: 1,
                  }}
                >
                  {clientInfo.address || 'Project Address'}
                </div>
              </div>

              {/* FIX 5 — Price plaque + BUILD SUMMARY vertical stack */}
              {/* ROUND 5 FIX — maxWidth 360 → 280 so the product grid below
                  gets enough width to render 3 columns at ~198px each at
                  1568×696 test resolution without squeezing. The build
                  summary column-wraps internally once items > 6 chips. */}
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'stretch',
                  minWidth: 240,
                  maxWidth: 280,
                }}
              >
                {/* PRICE BOX — "plaque" treatment (FIX 2: scaled up for hero moment) */}
                <div
                  style={{
                    background: 'rgba(212,168,83,0.04)',
                    border: '1px solid rgba(212,168,83,0.12)',
                    borderTop: '1px solid rgba(212,168,83,0.35)',
                    borderRadius: 8,
                    padding: '14px 28px',
                    minWidth: 240,
                  }}
                >
                  <div
                    style={{
                      fontSize: 10,
                      letterSpacing: 2,
                      color: 'rgba(212,168,83,0.4)',
                      textTransform: 'uppercase',
                      marginBottom: 2,
                    }}
                  >
                    Total Project Investment
                  </div>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
                    <span
                      style={{
                        fontSize: 52,
                        fontWeight: 800,
                        color: 'var(--lux-gold)',
                        fontFamily: FONT_DISPLAY,
                        lineHeight: 1,
                      }}
                    >
                      {fmtCAD(total)}
                    </span>
                    <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.2)' }}>+ HST</span>
                  </div>
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'baseline',
                      gap: 4,
                      justifyContent: 'flex-end',
                      marginTop: 4,
                    }}
                  >
                    <span
                      style={{
                        fontSize: 26,
                        fontWeight: 600,
                        color: 'var(--lux-blue)',
                        fontFamily: FONT_DISPLAY,
                      }}
                    >
                      {fmtCAD(monthly)}
                    </span>
                    <span style={{ fontSize: 12, color: 'rgba(91,155,213,0.5)' }}>/mo</span>
                  </div>
                  <div
                    style={{
                      fontSize: 7,
                      letterSpacing: 1.5,
                      color: 'rgba(91,155,213,0.45)',
                      textTransform: 'uppercase',
                      textAlign: 'right',
                      marginTop: 2,
                    }}
                  >
                    Financing Available O.A.C.
                  </div>
                </div>

                {/* FIX 5 — BUILD SUMMARY itemized list, stacked directly under plaque.
                    Auto-switches to 2-column when items > 6 so it never overlaps cards. */}
                <div
                  style={{
                    marginTop: 10,
                    padding: '10px 14px',
                    background: 'rgba(212,168,83,0.02)',
                    border: '1px solid rgba(212,168,83,0.08)',
                    borderRadius: 8,
                    maxHeight: 280,
                    overflowY: 'auto',
                    textAlign: 'left',
                  }}
                >
                  <div
                    style={{
                      fontSize: 9,
                      letterSpacing: 2,
                      color: 'rgba(212,168,83,0.35)',
                      textTransform: 'uppercase',
                      fontWeight: 700,
                      marginBottom: 6,
                    }}
                  >
                    Build Summary
                  </div>
                  {chips.length === 0 ? (
                    <div
                      style={{
                        fontSize: 10,
                        color: 'rgba(232,224,212,0.25)',
                        fontStyle: 'italic',
                        padding: '4px 0',
                      }}
                    >
                      No upgrades selected
                    </div>
                  ) : (
                    <div
                      style={{
                        columnCount: chips.length > 6 ? 2 : 1,
                        columnGap: 16,
                      }}
                    >
                      {chips.map((item: any, i: number) => (
                        <div
                          key={i}
                          style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            gap: 8,
                            padding: '3px 0',
                            borderBottom: '1px solid rgba(212,168,83,0.08)',
                            fontSize: 11,
                            fontFamily: FONT_BODY,
                            breakInside: 'avoid',
                          }}
                        >
                          <span style={{ color: 'rgba(255,255,255,0.6)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {item.label}
                          </span>
                          <span style={{ color: 'var(--lux-gold)', fontWeight: 600, flexShrink: 0 }}>
                            ${item.value.toLocaleString()}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* ── Middle: tabs + (preview + products) + chips ── */}
          <div
            style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
              padding: '0 24px 16px',
            }}
          >
            {/* Category tabs */}
            <div
              style={{
                display: 'flex',
                gap: 0,
                flexShrink: 0,
                overflowX: 'auto',
                scrollbarWidth: 'none',
                borderBottom: '1px solid rgba(255,255,255,0.05)',
                marginBottom: 8,
              }}
            >
              {PRICING_DATA.map((cat) => (
                <button
                  key={cat.id}
                  className={`est-cat-tab ${activeCategory === cat.id ? 'active' : ''}`}
                  onClick={() => setActiveCategory(cat.id)}
                >
                  {CATEGORY_LABELS[cat.id] || cat.title}
                </button>
              ))}
            </div>

            {/* Main split */}
            <div
              style={{
                flex: 1,
                display: 'flex',
                gap: 16,
                overflow: 'hidden',
                minHeight: 0,
              }}
            >
              {/* 3D Preview placeholder */}
              {/* TODO: Jack will swap in real build photos later. For MVP we render
                  the isometric SVG from the mockup and tint it with the currently
                  selected decking material. */}
              <div
                style={{
                  flex: '0 0 45%',
                  borderRadius: 10,
                  border: '1px solid rgba(212,168,83,0.08)',
                  background: 'rgba(255,255,255,0.02)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  position: 'relative',
                  overflow: 'hidden',
                }}
              >
                <div
                  style={{
                    width: '100%',
                    height: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background:
                      'linear-gradient(135deg, rgba(255,255,255,0.01), rgba(255,255,255,0.03))',
                  }}
                >
                  {(() => {
                    const previewColor = getPreviewColor(activeDecking?.id);
                    return (
                  <svg viewBox="0 0 400 300" style={{ width: '85%', opacity: 0.65 }}>
                    <defs>
                      <linearGradient id="dkSurface" x1="0" y1="0" x2="1" y2="1">
                        <stop offset="0%" stopColor={previewColor.primary} />
                        <stop offset="100%" stopColor={previewColor.secondary} />
                      </linearGradient>
                    </defs>
                    <rect x="80" y="30" width="240" height="90" fill="#2a2520" rx="2" />
                    <rect x="170" y="45" width="40" height="55" fill="#1a1a2e" rx="1" stroke="#3a3530" strokeWidth="1" />
                    <rect x="230" y="50" width="30" height="60" fill="#3a2a20" rx="1" stroke="#4a3a30" strokeWidth="1" />
                    <polygon points="60,120 340,120 370,240 30,240" fill="url(#dkSurface)" />
                    {[...Array(14)].map((_, i) => {
                      const y = 125 + i * 8.5;
                      const p = (y - 120) / 120;
                      return (
                        <line
                          key={i}
                          x1={60 - p * 30}
                          y1={y}
                          x2={340 + p * 30}
                          y2={y}
                          stroke="rgba(0,0,0,0.12)"
                          strokeWidth={0.5 + p * 0.5}
                        />
                      );
                    })}
                    <polygon
                      points="30,237 370,237 370,247 30,247"
                      fill={previewColor.secondary}
                    />
                    <polygon
                      points="160,240 240,240 248,260 152,260"
                      fill={previewColor.primary}
                      opacity="0.85"
                    />
                    <polygon
                      points="152,260 248,260 255,278 145,278"
                      fill={previewColor.secondary}
                      opacity="0.75"
                    />
                  </svg>
                    );
                  })()}
                  <div
                    style={{
                      fontSize: 9,
                      letterSpacing: 2,
                      color: 'rgba(212,168,83,0.3)',
                      textTransform: 'uppercase',
                      marginTop: 8,
                    }}
                  >
                    VISUAL APPROXIMATION {'\u00B7'} RENDER IN PROGRESS
                  </div>
                </div>

                {/* Decking material badge overlay */}
                {activeDecking && (
                  <div
                    style={{
                      position: 'absolute',
                      bottom: 10,
                      left: 10,
                      background: 'rgba(8,8,8,0.75)',
                      backdropFilter: 'blur(10px)',
                      padding: '5px 12px',
                      borderRadius: 4,
                      border: '1px solid rgba(212,168,83,0.08)',
                    }}
                  >
                    {activeDecking.brand && (
                      <span
                        style={{
                          fontSize: 8,
                          letterSpacing: 1.5,
                          color: 'rgba(212,168,83,0.4)',
                          textTransform: 'uppercase',
                        }}
                      >
                        {activeDecking.brand}
                      </span>
                    )}
                    <span
                      style={{
                        fontSize: 12,
                        color: 'var(--lux-gold)',
                        fontFamily: FONT_DISPLAY,
                        marginLeft: activeDecking.brand ? 8 : 0,
                        fontWeight: 600,
                      }}
                    >
                      {activeDecking.name}
                    </span>
                  </div>
                )}
              </div>

              {/* Product cards */}
              <div
                style={{
                  flex: 1,
                  display: 'flex',
                  flexDirection: 'column',
                  overflow: 'hidden',
                  minHeight: 0,
                }}
              >
                {/* Category Inputs strip — contextual dimension fields for
                    categories that need them. Renders above the product grid
                    so the salesperson can input live during walkthrough. */}
                {CATEGORY_INPUTS[activeCategory] && (
                  <div
                    style={{
                      flexShrink: 0,
                      height: 56,
                      background: 'rgba(212,168,83,0.03)',
                      borderTop: '1px solid rgba(212,168,83,0.10)',
                      borderBottom: '1px solid rgba(212,168,83,0.10)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 10,
                      padding: '0 10px',
                      marginBottom: 8,
                      overflowX: 'auto',
                    }}
                  >
                    <div
                      style={{
                        flexShrink: 0,
                        borderLeft: '2px solid rgba(212,168,83,0.4)',
                        paddingLeft: 8,
                        fontSize: 8,
                        letterSpacing: 1.5,
                        color: 'rgba(212,168,83,0.4)',
                        textTransform: 'uppercase',
                        fontWeight: 700,
                      }}
                    >
                      Specs
                    </div>
                    {CATEGORY_INPUTS[activeCategory]!.map((field, idx) => (
                      <div
                        key={field.key}
                        style={{
                          display: 'flex',
                          flexDirection: 'column',
                          gap: 2,
                          flexShrink: 0,
                        }}
                      >
                        <label
                          style={{
                            fontSize: 8,
                            letterSpacing: 1.5,
                            color: 'rgba(212,168,83,0.4)',
                            textTransform: 'uppercase',
                            fontWeight: 600,
                          }}
                        >
                          {field.label}
                        </label>
                        <input
                          ref={idx === 0 ? firstSpecInputRef : undefined}
                          type="number"
                          value={dimensions[field.key] || ''}
                          onChange={(e) => updateDim(field.key, e.target.value)}
                          style={{
                            width: 80,
                            padding: '6px 8px',
                            borderRadius: 4,
                            border: '1px solid rgba(212,168,83,0.12)',
                            background: 'rgba(255,255,255,0.03)',
                            color: '#E8E0D4',
                            fontSize: 11,
                            outline: 'none',
                            boxSizing: 'border-box',
                          }}
                        />
                      </div>
                    ))}
                  </div>
                )}
                <div
                  style={{
                    display: 'grid',
                    // FIX 4 — minmax(0, 1fr) prevents grid items from growing
                    // past their cell when price-delta text appears.
                    gridTemplateColumns:
                      activeOptions.length <= 4
                        ? `repeat(${Math.max(activeOptions.length, 1)}, minmax(0, 1fr))`
                        : 'repeat(3, minmax(0, 1fr))',
                    gap: 10,
                    overflowY: 'auto',
                    flex: 1,
                    // ROUND 5 FIX — minHeight 0 so the parent flex column
                    // cannot crush this grid; alignContent start lets each
                    // row use its cards' natural minHeight instead of
                    // stretching them to fill.
                    minHeight: 0,
                    alignContent: 'start',
                    paddingRight: 4,
                  }}
                >
                  {activeOptions.map((opt) => {
                    const sel = isOptionSelected(activeCategory, opt);
                    const impact = getOptionImpactValue(activeCategory, opt);
                    const hasImg = priceBookImages.has(opt.id);
                    // FIX 1 — lighting (accessories) cards ALWAYS show steppers.
                    const isLighting = activeCategory === 'accessories';
                    // ROUND 5 FIX — categories that render the full 80px visual
                    // image strip at the top of the card. Lighting and "other"
                    // categories (design/foundation/framing/extras/protection)
                    // skip the strip entirely and use a taller text layout so
                    // the stepper / price line stays visible.
                    const hasImageStrip =
                      activeCategory === 'decking' ||
                      activeCategory === 'railing' ||
                      activeCategory === 'skirting' ||
                      activeCategory === 'privacy' ||
                      activeCategory === 'pergolas';
                    // ROUND 5 FIX — explicit card minHeight so the grid cannot
                    // collapse rows to 22px. Cards with image strip need ~170px
                    // (80px strip + content); cards without need ~140px so the
                    // stepper / price row is never clipped.
                    const cardMinHeight = hasImageStrip ? 170 : 140;
                    const isQty =
                      isLighting ||
                      opt.calculationType === 'quantity' ||
                      opt.id === 'nami_fix';
                    const qty =
                      opt.id === 'nami_fix'
                        ? dimensions.namiFixCount
                        : opt.id === 'alum_drink_rail'
                        ? dimensions.drinkRailLF
                        : lightingQuantities[opt.id] || 0;
                    // FIX 3 — tier classification label (null for categories without a
                    // clear price range, e.g. railing uses componentized pricing).
                    const tier = getTierFromPrice(activeCategory, opt.priceDelta);

                    return (
                      <button
                        key={opt.id}
                        className={`est-product-card ${sel ? 'selected' : ''}`}
                        // FIX 1 — Lighting cards don't call handleOptionClick;
                        // qty steppers mutate state directly.
                        onClick={
                          isLighting
                            ? undefined
                            : () => handleOptionClick(activeCategory, opt)
                        }
                        // ROUND 5 FIX — explicit minHeight anchors the grid row
                        // so cards can't collapse. overflow hidden is safe here
                        // because each card has reserved vertical space.
                        style={{
                          minWidth: 0,
                          minHeight: cardMinHeight,
                          overflow: 'hidden',
                        }}
                      >
                        {/* Image / swatch — only for categories with visual material */}
                        {hasImageStrip && (
                          <div
                            style={{
                              // ROUND 5 FIX — 80px strip per spec (was 72).
                              // flexShrink 0 prevents the strip from being
                              // crushed when card height is tight.
                              height: 80,
                              flexShrink: 0,
                              position: 'relative',
                              overflow: 'hidden',
                              background: hasImg
                                ? 'rgba(0,0,0,0.2)'
                                : `linear-gradient(135deg, ${opt.imageColor}, ${shade(
                                    opt.imageColor,
                                    -0.2
                                  )})`,
                            }}
                          >
                            {hasImg && (
                              <img
                                src={priceBookImages.get(opt.id)}
                                alt={opt.name}
                                style={{
                                  position: 'absolute',
                                  inset: 0,
                                  width: '100%',
                                  height: '100%',
                                  objectFit: 'cover',
                                }}
                              />
                            )}
                            {activeCategory === 'decking' && !hasImg && (
                              <div
                                style={{
                                  position: 'absolute',
                                  inset: 0,
                                  background:
                                    'repeating-linear-gradient(90deg, transparent, transparent 22px, rgba(0,0,0,0.08) 22px, rgba(0,0,0,0.08) 24px)',
                                }}
                              />
                            )}
                            {/* FIX 3 — tier classification pill, top-left */}
                            {tier && (
                              <div
                                style={{
                                  position: 'absolute',
                                  top: 6,
                                  left: 6,
                                  zIndex: 2,
                                  padding: '3px 7px',
                                  borderRadius: 3,
                                  background: `${tier.color}26`, // 15% opacity
                                  border: `1px solid ${tier.color}66`, // 40% opacity
                                  color: tier.color,
                                  fontSize: 9,
                                  letterSpacing: 2,
                                  fontWeight: 700,
                                  textTransform: 'uppercase',
                                  lineHeight: 1,
                                }}
                              >
                                {tier.label}
                              </div>
                            )}
                            {sel && (
                              <div
                                style={{
                                  position: 'absolute',
                                  top: 6,
                                  right: 6,
                                  zIndex: 2,
                                  width: 20,
                                  height: 20,
                                  borderRadius: '50%',
                                  background: 'rgba(212,168,83,0.95)',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  fontSize: 11,
                                  color: '#0A0A0A',
                                  fontWeight: 800,
                                }}
                              >
                                {'\u2713'}
                              </div>
                            )}
                            {opt.brand && (
                              <div
                                style={{
                                  position: 'absolute',
                                  bottom: 6,
                                  left: 6,
                                  zIndex: 2,
                                  fontSize: 7,
                                  letterSpacing: 1.5,
                                  color: 'rgba(255,255,255,0.75)',
                                  textTransform: 'uppercase',
                                  background: 'rgba(0,0,0,0.45)',
                                  padding: '2px 6px',
                                  borderRadius: 3,
                                }}
                              >
                                {opt.brand}
                              </div>
                            )}
                          </div>
                        )}

                        <div
                          style={{
                            padding: '10px',
                            minWidth: 0,
                            // ROUND 5 FIX — flex column so stepper row gets
                            // pushed to bottom via margin-top:auto for lighting
                            // / other categories that have no image strip.
                            flex: 1,
                            display: 'flex',
                            flexDirection: 'column',
                          }}
                        >
                          {/* ROUND 5 FIX — on cards without the image strip,
                              the brand label lives above the product name */}
                          {!hasImageStrip && opt.brand && (
                            <div
                              style={{
                                fontSize: 8,
                                letterSpacing: 1.5,
                                color: 'rgba(212,168,83,0.55)',
                                textTransform: 'uppercase',
                                fontWeight: 700,
                                marginBottom: 2,
                              }}
                            >
                              {opt.brand}
                            </div>
                          )}
                          <div
                            style={{
                              fontSize: 14,
                              fontWeight: 500,
                              color: sel ? 'var(--lux-gold)' : 'var(--est-text-primary)',
                              fontFamily: FONT_DISPLAY,
                              transition: 'color 0.3s',
                              // FIX 4 — clip long names, never push card width
                              whiteSpace: 'nowrap',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                            }}
                          >
                            {opt.name}
                          </div>
                          <div
                            style={{
                              fontSize: 9,
                              color: 'var(--est-text-secondary)',
                              marginTop: 2,
                              lineHeight: 1.3,
                              overflow: 'hidden',
                              display: '-webkit-box',
                              WebkitLineClamp: 2,
                              WebkitBoxOrient: 'vertical' as any,
                            }}
                          >
                            {opt.description}
                          </div>

                          {isQty ? (
                            <div
                              onClick={(e) => e.stopPropagation()}
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: 8,
                                // ROUND 5 FIX — push stepper row to the bottom
                                // of the card so it is always visible (primary
                                // gripe on lighting cards in Round 4).
                                marginTop: 'auto',
                                paddingTop: 8,
                                minWidth: 0,
                              }}
                            >
                              <button
                                onClick={() => {
                                  if (opt.id === 'nami_fix')
                                    setDimensions((prev) => ({
                                      ...prev,
                                      namiFixCount: Math.max(0, prev.namiFixCount - 1),
                                    }));
                                  else if (opt.id === 'alum_drink_rail')
                                    setDimensions((prev) => ({
                                      ...prev,
                                      drinkRailLF: Math.max(0, prev.drinkRailLF - 1),
                                    }));
                                  else handleQtyChange(opt.id, -1);
                                }}
                                style={isLighting ? lightingQtyBtnStyle : qtyBtnStyle}
                              >
                                {'\u2212'}
                              </button>
                              <span
                                style={{
                                  fontSize: isLighting ? 16 : 12,
                                  fontWeight: isLighting ? 600 : 800,
                                  color: isLighting
                                    ? 'var(--lux-gold)'
                                    : 'var(--est-text-primary)',
                                  fontFamily: FONT_BODY,
                                  minWidth: 24,
                                  textAlign: 'center',
                                }}
                              >
                                {qty}
                              </span>
                              <button
                                onClick={() => {
                                  if (opt.id === 'nami_fix')
                                    setDimensions((prev) => ({
                                      ...prev,
                                      namiFixCount: prev.namiFixCount + 1,
                                    }));
                                  else if (opt.id === 'alum_drink_rail')
                                    setDimensions((prev) => ({
                                      ...prev,
                                      drinkRailLF: prev.drinkRailLF + 1,
                                    }));
                                  else handleQtyChange(opt.id, 1);
                                }}
                                style={isLighting ? lightingQtyBtnStyle : qtyBtnStyle}
                              >
                                +
                              </button>
                              {/* FIX 1 — lighting shows live +$ next to steppers when qty > 0 */}
                              {isLighting && qty > 0 && (
                                <span
                                  style={{
                                    fontSize: 11,
                                    fontWeight: 600,
                                    color: 'var(--lux-gold)',
                                    fontFamily: FONT_BODY,
                                    marginLeft: 'auto',
                                    whiteSpace: 'nowrap',
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                  }}
                                >
                                  +${Math.round(impact).toLocaleString()}
                                </span>
                              )}
                            </div>
                          ) : (
                            impact > 0 && (
                              <div
                                style={{
                                  fontSize: 10,
                                  // ROUND 5 FIX — pin price delta to bottom
                                  marginTop: 'auto',
                                  paddingTop: 6,
                                  fontWeight: 600,
                                  color: sel
                                    ? 'var(--lux-gold)'
                                    : 'rgba(212,168,83,0.45)',
                                  // FIX 4 — clip long price tags
                                  display: 'block',
                                  whiteSpace: 'nowrap',
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis',
                                }}
                              >
                                + ${Math.round(impact).toLocaleString()}
                              </div>
                            )
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>

                {/* FIX 5 — bottom chip strip removed; itemized list now lives under the price plaque */}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// ---------- small helpers and shared inline styles ----------

const labelStyle: React.CSSProperties = {
  fontSize: 8,
  letterSpacing: 1.5,
  color: 'rgba(232,224,212,0.45)',
  textTransform: 'uppercase',
  display: 'block',
  marginBottom: 4,
  fontWeight: 600,
};

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '8px 10px',
  borderRadius: 4,
  border: '1px solid rgba(212,168,83,0.15)',
  background: 'rgba(255,255,255,0.04)',
  color: '#E8E0D4',
  fontSize: 12,
  outline: 'none',
  boxSizing: 'border-box',
};

const sectionTitleStyle: React.CSSProperties = {
  fontSize: 9,
  letterSpacing: 2,
  color: '#D4A853',
  textTransform: 'uppercase',
  marginBottom: 10,
  fontWeight: 700,
};

const qtyBtnStyle: React.CSSProperties = {
  background: 'rgba(212,168,83,0.9)',
  color: '#0A0A0A',
  border: 'none',
  width: 22,
  height: 22,
  borderRadius: 4,
  fontWeight: 800,
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  fontSize: 14,
  lineHeight: 1,
};

// FIX 1 — Lighting cards use a slightly larger, gold-at-60% stepper per spec.
const lightingQtyBtnStyle: React.CSSProperties = {
  background: 'rgba(212,168,83,0.6)',
  color: '#0A0A0A',
  border: 'none',
  width: 24,
  height: 24,
  borderRadius: 4,
  fontWeight: 700,
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  fontSize: 16,
  lineHeight: 1,
};

/**
 * Shade a hex colour by a percentage amount (-1 to 1).
 * Used to derive the darker stop of the product-card gradient.
 */
function shade(hex: string, amount: number): string {
  if (!hex) return '#222222';
  const clean = hex.replace('#', '');
  if (clean.length !== 6) return hex;
  const num = parseInt(clean, 16);
  const r = Math.max(0, Math.min(255, Math.round(((num >> 16) & 0xff) * (1 + amount))));
  const g = Math.max(0, Math.min(255, Math.round(((num >> 8) & 0xff) * (1 + amount))));
  const b = Math.max(0, Math.min(255, Math.round((num & 0xff) * (1 + amount))));
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`;
}

export default EstimatorShowroomView;
