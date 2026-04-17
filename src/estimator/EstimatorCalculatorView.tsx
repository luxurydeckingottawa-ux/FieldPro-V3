import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { loadPriceBook } from '../utils/priceBook';
import EstimatorShowroomView from './EstimatorShowroomView';
import MaterialMatrixShowroom from './MaterialMatrixShowroom';

// Maps estimator tier IDs → price book item IDs so uploaded photos show on cards
export const TIER_TO_ITEM_ID: Record<string, string> = {
  // Design
  '3d_design': 'item_001', 'arch_drawings': 'item_002', 'eng_stamp': 'item_003',
  'ottawa_permit_fee': 'item_004', 'helical_report': 'item_005',
  // Footings
  'sonotube': 'item_011', 'helical': 'item_012',
  // Framing
  'upgrade_2x8_12': 'item_021', 'upgrade_2x10_16': 'item_022',
  'upgrade_2x10_12': 'item_023', 'fiberglass_framing': 'item_024',
  // Decking
  'pt_wood_decking': 'item_040', 'cedar_decking': 'item_041',
  'fiberon_goodlife_weekender': 'item_042', 'fiberon_goodlife_escapes': 'item_043',
  'fiberon_sanctuary': 'item_044', 'fiberon_concordia': 'item_045',
  'fiberon_paramount': 'item_046', 'fiberon_promenade': 'item_047',
  // Picture frame
  'single_border': 'item_050', 'double_border': 'item_051',
  // Lighting (accessories)
  'light_pkg_8': 'item_080', 'light_pkg_16': 'item_081',
  'inlite_smart_hub': 'item_082', 'inlite_smart_hub_prot': 'item_083',
  'inlite_smart_move': 'item_084', 'inlite_move': 'item_085',
  'inlite_hub_50': 'item_086', 'inlite_hub_100': 'item_087',
  'inlite_hub_prot': 'item_088', 'inlite_hyve_22': 'item_089',
  'inlite_cubid': 'item_090', 'inlite_ace': 'item_091',
  'inlite_wedge_slim': 'item_092', 'inlite_puck_22': 'item_093',
  'inlite_mini_wedge': 'item_094', 'inlite_liv_low': 'item_095',
  'inlite_sway': 'item_096', 'inlite_6_pkg': 'item_097',
  // Railings
  'pt_wood_railing': 'item_100', 'wood_metal_railing': 'item_101',
  'fortress_al13_pkg': 'item_102', 'alum_glass': 'item_104',
  'frameless_glass': 'item_106',
  // Skirting
  'skirt_wood': 'item_110', 'skirt_pvc': 'item_111',
  'skirt_fiberon_gl': 'item_112', 'skirt_fiberon_sanctuary': 'item_114',
  'skirt_fiberon_concordia': 'item_115',
  // Privacy
  'privacy_wood': 'item_120', 'privacy_pvc': 'item_121',
  'privacy_sunbelly_combined': 'item_123',
  // Extras / add-ons
  'removal_disposal': 'item_130', 'joist_guard': 'item_131',
  'fabric_stone': 'item_030', 'river_wash': 'item_031',
  'mulch_extra': 'item_032', 'stepping_stones_extra': 'item_033',
  // Pergolas
  'pt_pergola_10': 'item_140', 'pt_pergola_12': 'item_141',
  'cedar_pergola_10': 'item_142', 'bio_10x10_manual': 'item_145',
};

// --- Shared Types & Interfaces ---

export interface PricingTier {
  id: string;
  name: string;
  brand?: string;
  description: string;
  priceDelta: number;
  unit?: string;
  imageColor: string;
  imageUrl?: string;
  recommended?: boolean;
  fasciaPrice?: number;
  stepPrice?: number;
  calculationType?: 'standard' | 'aluminum_component' | 'aluminum_glass_component' | 'frameless_glass_component' | 'lump_sum' | 'sqft_add' | 'percentage' | 'quantity' | 'lf_border_add' | 'river_wash_sqft' | 'mulch_sqft' | 'stepping_stones_qty';
}

export interface Category {
  id: 'design' | 'foundation' | 'framing' | 'decking' | 'railing' | 'skirting' | 'privacy' | 'accessories' | 'pergolas' | 'extras' | 'protection';
  title: string;
  baseName: string;
  basePrice?: number;
  options: PricingTier[];
}

export interface Dimensions {
  sqft: number;
  footingsCount: number;
  steps: number;
  fasciaLF: number;
  ledgerLF: number;
  namiFixCount: number;
  skirtingSqFt: number;
  borderLF: number;
  privacyLF: number;
  privacyPosts: number;
  privacyScreens: number;
  lightsCount: number;
  landscapeSqFt: number;
  railingLF: number;
  drinkRailLF: number;
  alumPosts: number;
  alumSection6: number;
  alumSection8: number;
  alumStair6: number;
  alumStair8: number;
  glassSection6: number;
  glassPanelsLF: number;
  framelessSections: number;
  framelessLF: number;
  demoSqFt: number;
  riverWashSqFt: number;
  mulchSqFt: number;
  steppingStonesCount: number;
}

export interface ClientInfo {
  name: string;
  address: string;
}

export enum TierType {
  SELECT = 'Select',
  PREMIUM = 'Premium',
  ELITE = 'Elite',
  SIGNATURE = 'Signature'
}

export type DeckSize = '12x12' | '12x16' | '12x20' | '16x16' | '16x20' | '20x20';

export interface MaterialPricing {
  '12x12': number;
  '12x16': number;
  '12x20': number;
  '16x16': number;
  '16x20': number;
  '20x20': number;
}

export interface Material {
  id: string;
  name: string;
  brand: string;
  tier: TierType;
  basePricing: MaterialPricing;
  description: string;
  warranty: string;
  materialType: string;
}

export type PackageSize = '12X12' | '12X16' | '12X20' | '16X16' | '16X20' | '20X20';
export type PackageLevel = 'SILVER' | 'GOLD' | 'PLATINUM' | 'DIAMOND';

export interface PackagePriceRow {
  noRailing: Record<PackageLevel, number>;
  withRailing: Record<PackageLevel, number>;
  upgrades: {
    helical: number;
    cement: number;
    stone: number;
  };
}

/** Shape of the calculator's category selections state */
export interface CalculatorSelections {
  design: PricingTier[];
  foundation: PricingTier | null;
  framing: PricingTier | null;
  decking: PricingTier | null;
  railing: PricingTier | null;
  skirting: PricingTier | null;
  accessories: PricingTier[];
  privacy: PricingTier[];
  pergolas: PricingTier | null;
  extras: PricingTier[];
  protection: PricingTier[];
}

/** A single pricing impact line item */
export interface PricingImpact {
  label: string;
  value: number;
}

/** The output of the pricing calculator */
export interface PricingSummary {
  fixedSubTotal: number;
  subTotal: number;
  hst: number;
  finalTotal: number;
  monthly: number;
  impacts: PricingImpact[];
}

export interface ShowroomEstimatorProps {
  dimensions: Dimensions;
  setDimensions: React.Dispatch<React.SetStateAction<Dimensions>>;
  selections: CalculatorSelections;
  setSelections: React.Dispatch<React.SetStateAction<CalculatorSelections>>;
  lightingQuantities: Record<string, number>;
  setLightingQuantities: React.Dispatch<React.SetStateAction<Record<string, number>>>;
  clientInfo: ClientInfo;
  setClientInfo: React.Dispatch<React.SetStateAction<ClientInfo>>;
  activeCategory: string;
  setActiveCategory: React.Dispatch<React.SetStateAction<string>>;
  resetCalculator: () => void;
  onSave: () => void;
  onAccept: () => void;
  pricingSummary: PricingSummary;
  estimateNumber: number;
  activePackage: PackageSelection | null;
  setActivePackage: (pkg: PackageSelection | null) => void;
  // Multi-option estimate
  options?: EstimateOptionSnapshot[];
  activeOptionId?: string;
  onSelectOption?: (id: string) => void;
  onAddOption?: (mode: 'fresh' | 'duplicate') => void;
  onRenameOption?: (id: string, newName: string) => void;
  onDeleteOption?: (id: string) => void;
  /** finalTotal per option id, computed by parent so OptionTabs can show live totals for all tabs. */
  optionTotals?: Record<string, number>;
}

export interface PackageSelection {
  size: PackageSize;
  level: PackageLevel;
  withRailings: boolean;
}

/**
 * A single option snapshot within an estimate.
 * Each estimate can have multiple options (A, B, C...) for the same customer,
 * representing different material/design configurations. Client info is shared
 * across all options (it's the same customer).
 */
export interface EstimateOptionSnapshot {
  id: string;                                  // "A", "B", "C", ...
  name: string;                                // "Option A" (user-renameable)
  dimensions: Dimensions;
  selections: CalculatorSelections;
  lightingQuantities: Record<string, number>;
  activePackage: PackageSelection | null;
}

// --- Configuration & Data ---

const BUSINESS_INFO = {
  name: "Luxury Decking",
  address: "",
  phone: "613-707-3060",
  email: "admin@luxurydecking.ca",
  website: "www.luxurydecking.ca"
};

export const BASE_SQFT_PRICE = 28.95;
export const BASE_STEP_PRICE = 44.95;
export const BASE_RAILING_PRICE = 49.95;
export const BASE_CEDAR_RAILING_PRICE = 74.95;
export const FINANCING_FACTOR = 0.0196;
const HST_RATE = 0.13;

export const COSTS = {
  fasciaPerLF: 24.95,
  disposalPerSqFt: 9.95,
  alumPost: 292.00,
  alum6: 340.00, 
  alum8: 391.00,
  alumStair6: 616.00,
  alumStair8: 699.00,
  glassSection6: 451.00,
  glassPanelsLF: 72.00,
  framelessSection: 295.00,
  framelessLF: 96.00,
  ledgerPerLF: 49.99,
  joistGuardPerSF: 2.49,
  namiFixPerUnit: 189.00,
  privacyPost: 195.00,
  privacyScreen: 349.00,
  drinkRailPerLF: 21.75
};

export const BASELINES = {
  deckingPriceDelta: 44.95 - BASE_SQFT_PRICE,
  stepPrice: 59.95,
  fasciaPrice: 24.95
};

export const PRICING_DATA: Category[] = [
  {
    id: 'design',
    title: 'Design & Permits',
    baseName: 'Basic Consultation',
    options: [
      { id: '3d_design', name: 'Standard 3D Design', description: 'Up to 3 revisions. High-fidelity project visualization.', priceDelta: 99.95, calculationType: 'lump_sum', imageColor: '#34495e' },
      { id: 'permit_package', name: 'Full Permit Package', description: 'Documentation, drawings & submission prep.', priceDelta: 995.00, calculationType: 'lump_sum', imageColor: '#2980b9' },
      { id: 'ottawa_permit_fee', name: 'City of Ottawa Permit Fee', description: 'Mandatory municipal fee. 1.5% of construction value.', priceDelta: 0.015, calculationType: 'percentage', imageColor: '#16a085' },
      { id: 'arch_drawings', name: 'Architectural Drawings', description: 'Drawings needed for permit. 1 revision.', priceDelta: 399.95, calculationType: 'lump_sum', imageColor: '#2c3e50' },
      { id: 'eng_stamp', name: 'Engineer Stamp', description: 'Required for certain jurisdictions.', priceDelta: 399.95, calculationType: 'lump_sum', imageColor: '#c0392b' },
      { id: 'helical_report', name: 'Helical Pile Report', description: 'Engineered stamp report for helical piles.', priceDelta: 399.00, calculationType: 'lump_sum', imageColor: '#f39c12' }
    ]
  },
  {
    id: 'foundation',
    title: 'Foundation',
    baseName: 'Concrete Deck Blocks',
    basePrice: 0,
    options: [
      { id: 'sonotube', name: '48" Concrete Sonotubes', description: 'Dug cement poured footing.', priceDelta: 279, unit: 'per footing', imageColor: '#7f8c8d' },
      { id: 'helical', name: 'Helical Piles (7\')', description: 'Galvanized steel screw piles.', priceDelta: 469, unit: 'per footing', imageColor: '#f1c40f', recommended: true },
      { id: 'pylex_screws', name: 'Pylex Ground Screws', description: '50" steel ground screws.', priceDelta: 129.95, unit: 'per footing', imageColor: '#95a5a6' },
      { id: 'nami_fix', name: 'Namifix-NP2 Brackets', description: 'Galvanized steel brackets. REPLACES traditional ledger prep. Includes beam near house.', priceDelta: 189.00, calculationType: 'quantity', imageColor: '#2c3e50' }
    ]
  },
  {
    id: 'framing',
    title: 'Framing',
    baseName: 'Standard 2X8 PT @ 16" OC',
    basePrice: 0,
    options: [
      { id: 'upgrade_2x8_12', name: '2X8 PT (12" OC)', description: 'Closer joist spacing for heavy loads.', priceDelta: 1.95, unit: 'sqft', imageColor: '#5d4037' },
      { id: 'upgrade_2x10_16', name: '2X10 PT (16" OC)', description: 'Larger joists for longer spans.', priceDelta: 4.49, unit: 'sqft', imageColor: '#4e342e' },
      { id: 'upgrade_2x10_12', name: '2X10 PT (12" OC)', description: 'Maximum PT framing strength.', priceDelta: 6.49, unit: 'sqft', imageColor: '#3e2723' },
      { id: 'fiberglass_framing', name: 'Fiberglass Framing', description: 'Ultra-durable 2X8 Fiberglass composite framing.', priceDelta: 29.95, unit: 'sqft', imageColor: '#16a085' }
    ]
  },
  {
    id: 'decking',
    title: 'Decking',
    baseName: 'Pressure Treated Wood',
    basePrice: BASE_SQFT_PRICE,
    options: [
      { id: 'pt_wood_decking', brand: 'Natural Wood', name: 'Pressure Treated Wood', description: 'Standard high-quality lumber.', priceDelta: 0, unit: 'sqft', imageColor: '#4d5d30', fasciaPrice: 15.95, stepPrice: 44.95 },
      { id: 'cedar_decking', brand: 'Natural Wood', name: 'Cedar Wood', description: 'Premium 5/4 Cedar boards.', priceDelta: 34.95 - BASE_SQFT_PRICE, unit: 'sqft', imageColor: '#e67e22', fasciaPrice: 15.95, stepPrice: 54.95 },
      { id: 'fiberon_goodlife_weekender', brand: 'Fiberon', name: 'GoodLife Weekender', description: '3-sided capping. 2 colors.', priceDelta: 44.95 - BASE_SQFT_PRICE, unit: 'sqft', imageColor: '#8e44ad', fasciaPrice: 24.95, stepPrice: 59.95 },
      { id: 'fiberon_goodlife_escapes', brand: 'Fiberon', name: 'GoodLife Escapes', description: 'Multi-tonal. 4 colors.', priceDelta: 49.95 - BASE_SQFT_PRICE, unit: 'sqft', imageColor: '#9b59b6', fasciaPrice: 27.95, stepPrice: 63.95 },
      { id: 'fiberon_sanctuary', brand: 'Fiberon', name: 'Sanctuary', description: 'Rich streaking. 5 colors.', priceDelta: 55.95 - BASE_SQFT_PRICE, unit: 'sqft', imageColor: '#7d3c98', fasciaPrice: 29.95, stepPrice: 69.95 },
      { id: 'fiberon_concordia', brand: 'Fiberon', name: 'Concordia', description: 'Premium Symmetry. 8 colors.', priceDelta: 61.95 - BASE_SQFT_PRICE, unit: 'sqft', imageColor: '#6c3483', fasciaPrice: 34.95, stepPrice: 73.95 },
      { id: 'fiberon_paramount', brand: 'Fiberon', name: 'PVC Paramount', description: 'PVC. Slip resistant. 4 colors.', priceDelta: 63.95 - BASE_SQFT_PRICE, unit: 'sqft', imageColor: '#d35400', fasciaPrice: 34.95, stepPrice: 78.95 },
      { id: 'fiberon_promenade', brand: 'Fiberon', name: 'PVC Promenade', description: 'Cellular PVC. 6 colors.', priceDelta: 65.95 - BASE_SQFT_PRICE, unit: 'sqft', imageColor: '#e67e22', fasciaPrice: 39.95, stepPrice: 87.95 },
      { id: 'tt_prime', brand: 'TimberTech', name: 'Prime Collection', description: 'Clean, solid colors.', priceDelta: 46.95 - BASE_SQFT_PRICE, unit: 'sqft', imageColor: '#c0392b', fasciaPrice: 26.95, stepPrice: 62.24 },
      { id: 'tt_prime_plus', brand: 'TimberTech', name: 'Prime+ Collection', description: 'Clean, multi-tonal colors and high performance.', priceDelta: 48.95 - BASE_SQFT_PRICE, unit: 'sqft', imageColor: '#a93226', fasciaPrice: 26.95, stepPrice: 63.13 },
      { id: 'tt_terrain', brand: 'TimberTech', name: 'Terrain Collection', description: 'Rugged wood look.', priceDelta: 56.95 - BASE_SQFT_PRICE, unit: 'sqft', imageColor: '#922b21', fasciaPrice: 26.95, stepPrice: 66.49 },
      { id: 'tt_reserve', brand: 'TimberTech', name: 'Reserve Collection', description: 'Reclaimed wood look.', priceDelta: 66.95 - BASE_SQFT_PRICE, unit: 'sqft', imageColor: '#7b241c', fasciaPrice: 31.50, stepPrice: 74.72 },
      { id: 'tt_legacy', brand: 'TimberTech', name: 'Legacy Collection', description: 'Hand-scraped look.', priceDelta: 72.95 - BASE_SQFT_PRICE, unit: 'sqft', imageColor: '#641e16', fasciaPrice: 34.95, stepPrice: 80.32 },
      { id: 'azek_harvest', brand: 'Azek', name: 'PVC Harvest', description: 'Natural shades.', priceDelta: 59.95 - BASE_SQFT_PRICE, unit: 'sqft', imageColor: '#229954', fasciaPrice: 24.95, stepPrice: 66.21 },
      { id: 'azek_landmark', brand: 'Azek', name: 'PVC Landmark', description: 'Cross-cut hardwood.', priceDelta: 66.95 - BASE_SQFT_PRICE, unit: 'sqft', imageColor: '#1d8348', fasciaPrice: 28.49, stepPrice: 72.30 },
      { id: 'azek_vintage', brand: 'Azek', name: 'PVC Vintage', description: 'Sophisticated aesthetics.', priceDelta: 71.95 - BASE_SQFT_PRICE, unit: 'sqft', imageColor: '#196f3d', fasciaPrice: 36.49, stepPrice: 81.03 },
      { id: 'woodbridge_pvc', brand: 'ClubHouse', name: 'Woodbridge (PVC)', description: 'Premium Woodbridge aesthetics.', priceDelta: 57.95 - BASE_SQFT_PRICE, unit: 'sqft', imageColor: '#5dade2', fasciaPrice: 29.95, stepPrice: 68.50 },
      { id: 'eva_infinity', brand: 'Eva-Last', name: 'Infinity Composite', description: 'Capped bamboo. 4 colors.', priceDelta: 46.95 - BASE_SQFT_PRICE, unit: 'sqft', imageColor: '#2e86c1', fasciaPrice: 29.62, stepPrice: 64.77 },
      { id: 'eva_apex', brand: 'Eva-Last', name: 'Apex PVC', description: 'Foamed PVC. 6 colors.', priceDelta: 68.95 - BASE_SQFT_PRICE, unit: 'sqft', imageColor: '#21618c', fasciaPrice: 33.53, stepPrice: 76.88 },
      { id: 'eva_pioneer', brand: 'Eva-Last', name: 'Pioneer Ultra PVC', description: 'Glass fiber reinforced.', priceDelta: 87.95 - BASE_SQFT_PRICE, unit: 'sqft', imageColor: '#1a5276', fasciaPrice: 33.95, stepPrice: 86.22 }
    ]
  },
  {
    id: 'railing',
    title: 'Railings',
    baseName: 'Standard Wood Railing',
    basePrice: BASE_RAILING_PRICE,
    options: [
      { id: 'pt_wood_railing', name: 'PT Wood (2x2 Spindles)', description: 'Classic wood pickets.', priceDelta: 0, unit: 'lf', imageColor: '#4d5d30' },
      { id: 'cedar_railing', name: 'Standard Cedar Railing', description: 'Cedar rails with 2x2 spindles.', priceDelta: BASE_CEDAR_RAILING_PRICE - BASE_RAILING_PRICE, unit: 'lf', imageColor: '#e67e22' },
      { id: 'wood_metal_railing', name: 'Wood (Metal Spindles)', description: 'Wood rails with black metal.', priceDelta: 59.95 - BASE_RAILING_PRICE, unit: 'lf', imageColor: '#2c3e50' },
      { id: 'fortress_al13_pkg', name: 'AL13 Aluminum Railing', description: 'Full Fortress component system (Posts + Panels). Price includes the flat-top accent rail.', priceDelta: 0, calculationType: 'aluminum_component', imageColor: '#212f3d' },
      { id: 'alum_glass', name: 'Aluminum + glass (AL13)', description: 'Glass panels with aluminum posts and 6\' sections. Price includes the flat-top accent rail.', priceDelta: 0, calculationType: 'aluminum_glass_component', imageColor: '#3498db' },
      { id: 'frameless_glass', name: 'Frameless Glass', description: 'Tempered glass panels with specialized spigot hardware.', priceDelta: 0, calculationType: 'frameless_glass_component', imageColor: '#85c1e9' },
      { id: 'alum_drink_rail', name: 'AL13 Drink Rail', description: 'Supply, install AL13 drink rail to match decking.', priceDelta: 21.75, calculationType: 'quantity', imageColor: '#444' }
    ]
  },
  {
    id: 'skirting',
    title: 'Skirting',
    baseName: 'No Skirting',
    basePrice: 0,
    options: [
      { id: 'skirt_lattice', brand: 'Natural Wood', name: 'White PVC Lattice', description: 'Classic diamond pattern. Affordable protection.', priceDelta: 12.95, unit: 'sqft', imageColor: '#ecf0f1' },
      { id: 'skirt_wood', brand: 'Natural Wood', name: 'PT Wood Skirting', description: 'Standard pressure treated wood boards.', priceDelta: 14.95, unit: 'sqft', imageColor: '#4d5d30' },
      { id: 'skirt_cedar', brand: 'Natural Wood', name: 'Cedar Wood Skirting', description: 'Premium 5/4 cedar skirting boards.', priceDelta: 21.95, unit: 'sqft', imageColor: '#e67e22' },
      { id: 'skirt_pvc', brand: 'Standard', name: 'Solid PVC Skirting', description: 'Durable solid PVC. White, Gray or Brown.', priceDelta: 19.95, unit: 'sqft', imageColor: '#95a5a6' },
      { id: 'skirt_fiberon_gl', brand: 'Fiberon', name: 'GoodLife Skirting', description: 'Matches Weekender & Escapes collections.', priceDelta: 29.95, unit: 'sqft', imageColor: '#8e44ad' },
      { id: 'skirt_fiberon_sanctuary', brand: 'Fiberon', name: 'Sanctuary Skirting', description: 'Matches high-fidelity Sanctuary streaking.', priceDelta: 37.95, unit: 'sqft', imageColor: '#7d3c98' },
      { id: 'skirt_fiberon_concordia', brand: 'Fiberon', name: 'Premium PVC/Concordia', description: 'Matches Concordia, Paramount & Promenade.', priceDelta: 44.95, unit: 'sqft', imageColor: '#6c3483' },
      { id: 'skirt_tt_prime', brand: 'TimberTech', name: 'Prime/Terrain Skirt', description: 'Matches Prime, Prime+ and Terrain lines.', priceDelta: 34.95, unit: 'sqft', imageColor: '#c0392b' },
      { id: 'skirt_tt_legacy', brand: 'TimberTech', name: 'Reserve/Legacy Skirt', description: 'Matches premium TimberTech collections.', priceDelta: 48.95, unit: 'sqft', imageColor: '#641e16' },
      { id: 'skirt_azek_harvest', brand: 'AZEK', name: 'Harvest PVC Skirt', description: 'Matches AZEK Harvest collection.', priceDelta: 42.95, unit: 'sqft', imageColor: '#229954' },
      { id: 'skirt_azek_vintage', brand: 'AZEK', name: 'Landmark/Vintage Skirt', description: 'Matches elite AZEK PVC collections.', priceDelta: 51.95, unit: 'sqft', imageColor: '#196f3d' },
      { id: 'skirt_eva_infinity', brand: 'Eva-Last', name: 'Infinity Skirting', description: 'Matches bamboo composite Infinity boards.', priceDelta: 32.95, unit: 'sqft', imageColor: '#2e86c1' },
      { id: 'skirt_eva_apex', brand: 'Eva-Last', name: 'Apex/Pioneer Skirt', description: 'Matches luxury Apex and Pioneer PVC.', priceDelta: 47.95, unit: 'sqft', imageColor: '#21618c' }
    ]
  },
  {
    id: 'privacy',
    title: 'Privacy Walls',
    baseName: 'No Privacy',
    basePrice: 0,
    options: [
      { id: 'privacy_wood', name: 'Wood Privacy Wall', description: '6\' tall. PT wood. Price per LF.', priceDelta: 79.00, unit: 'lf', imageColor: '#4d5d30' },
      { id: 'privacy_pvc', name: 'PVC Privacy Wall', description: 'Horizontal 6\' height. Price per LF.', priceDelta: 99.00, unit: 'lf', imageColor: '#95a5a6' },
      { id: 'privacy_sunbelly_combined', name: 'Sunbelly / Hideaway privacy wall', description: 'Designer screens with aluminum posts. pulling quantity from sidebar.', priceDelta: 0, calculationType: 'standard', imageColor: '#d35400' }
    ]
  },
  {
    id: 'accessories',
    title: 'Lighting',
    baseName: 'No Lighting',
    basePrice: 0,
    options: [
      { id: 'light_pkg_8', name: 'Standard 8-Pack LED', description: 'Plug-in 8-pack deck light package.', priceDelta: 595.00, calculationType: 'quantity', imageColor: '#f1c40f' },
      { id: 'light_pkg_16', name: 'Standard 16-Pack LED', description: 'Plug-in 16-pack deck light package.', priceDelta: 849.00, calculationType: 'quantity', imageColor: '#f39c12' },
      { id: 'inlite_hub_50', name: 'IN-LITE Hub-50', description: '50 VA transformer/controller.', priceDelta: 399.00, calculationType: 'quantity', imageColor: '#34495e' },
      { id: 'inlite_hub_100', name: 'IN-LITE Hub-100', description: '100 VA transformer/controller.', priceDelta: 449.00, calculationType: 'quantity', imageColor: '#2c3e50' },
      { id: 'inlite_hub_prot', name: 'IN-LITE Hub Protector', description: 'Weather protector for Hub-50/100.', priceDelta: 69.95, calculationType: 'quantity', imageColor: '#7f8c8d' },
      { id: 'inlite_smart_hub', name: 'IN-LITE Smart Hub - 150', description: '150 VA App-controlled smart transformer.', priceDelta: 695.00, calculationType: 'quantity', imageColor: '#1a5276' },
      { id: 'inlite_smart_hub_prot', name: 'IN-LITE Smart Hub Protector', description: 'Weather protector for Smart Hub-150.', priceDelta: 69.95, calculationType: 'quantity', imageColor: '#7f8c8d' },
      { id: 'inlite_smart_move', name: 'IN-LITE Smart Move', description: 'Wireless motion detector (Smart Hub only).', priceDelta: 189.95, calculationType: 'quantity', imageColor: '#f1c40f' },
      { id: 'inlite_move', name: 'IN-LITE Move', description: 'Wired motion detector (Hub-50/100).', priceDelta: 99.95, calculationType: 'quantity', imageColor: '#95a5a6' },
      { id: 'inlite_hyve_22', name: 'IN-LITE Hyve 22', description: 'Subtle ground fixture. Warm silver ring.', priceDelta: 149.00, calculationType: 'quantity', imageColor: '#f1c40f' },
      { id: 'inlite_hyve', name: 'IN-LITE Hyve', description: 'Large ground fixture.', priceDelta: 249.00, calculationType: 'quantity', imageColor: '#f1c40f' },
      { id: 'inlite_cubid', name: 'IN-LITE Cubid Dark', description: 'Cube wall fixture. Dark gray aluminum.', priceDelta: 169.00, calculationType: 'quantity', imageColor: '#333' },
      { id: 'inlite_big_cubid', name: 'IN-LITE Big Cubid', description: 'Large cube wall fixture.', priceDelta: 249.00, calculationType: 'quantity', imageColor: '#222' },
      { id: 'inlite_ace', name: 'IN-LITE Ace Up-Down', description: 'Architectural wall beam. Focused light.', priceDelta: 349.00, calculationType: 'quantity', imageColor: '#e67e22' },
      { id: 'inlite_ace_down', name: 'IN-LITE Ace Down', description: 'Focused downward wall beam.', priceDelta: 299.00, calculationType: 'quantity', imageColor: '#e67e22' },
      { id: 'inlite_puck_22', name: 'IN-LITE Puck 22', description: 'Small ground light. Warm silver.', priceDelta: 149.00, calculationType: 'quantity', imageColor: '#bdc3c7' },
      { id: 'inlite_puck', name: 'IN-LITE Puck', description: 'Large side-emitting fixture.', priceDelta: 279.00, calculationType: 'quantity', imageColor: '#bdc3c7' },
      { id: 'inlite_blink', name: 'IN-LITE Blink', description: 'Architectural wall light.', priceDelta: 189.00, calculationType: 'quantity', imageColor: '#2980b9' },
      { id: 'inlite_mini_wedge', name: 'IN-LITE Mini Wedge', description: 'Subtle wall light for low borders/steps.', priceDelta: 179.00, calculationType: 'quantity', imageColor: '#95a5a6' },
      { id: 'inlite_wedge_slim', name: 'IN-LITE Wedge Slim', description: 'Directional slim wall light. Wide beam.', priceDelta: 249.00, calculationType: 'quantity', imageColor: '#555' },
      { id: 'inlite_liv_low', name: 'IN-LITE Liv Low', description: 'Bollard light. Uniform warm ambient light.', priceDelta: 269.00, calculationType: 'quantity', imageColor: '#17202a' },
      { id: 'inlite_sway', name: 'IN-LITE Sway Pearl', description: 'Flexible versatile bollard. 360° light.', priceDelta: 279.00, calculationType: 'quantity', imageColor: '#7d3c98' },
      { id: 'inlite_6_pkg', name: 'IN-LITE 6 Light Package', description: 'Hub-50 + Protector + 6x Hyve 22.', priceDelta: 1249.00, calculationType: 'quantity', imageColor: '#d4af37' },
      { id: 'fortress_glow', name: 'Fortress Glow Ring', description: 'LED Glow ring for 3" post caps.', priceDelta: 149.00, calculationType: 'quantity', imageColor: '#3498db' },
      { id: 'fortress_vertical', name: 'Fortress Vertical Post Light', description: 'Vertical post light (2-Pack).', priceDelta: 149.00, calculationType: 'quantity', imageColor: '#2980b9' },
      { id: 'fortress_surface', name: 'Fortress Surface Mount', description: 'Surface mount lights (6-Pack).', priceDelta: 495.00, calculationType: 'quantity', imageColor: '#1a5276' },
      { id: 'fortress_60w', name: 'Fortress 60W Transformer', description: '60 Watt Fortress LED transformer.', priceDelta: 249.00, calculationType: 'quantity', imageColor: '#2c3e50' }
    ]
  },
  {
    id: 'pergolas',
    title: 'Pergolas',
    baseName: 'No Pergola',
    options: [
      { id: 'pt_pergola_10', name: 'PT Pergola 10x10', description: '6x6 posts, 2x8 beams.', priceDelta: 3995.00, calculationType: 'lump_sum', imageColor: '#4d5d30' },
      { id: 'pt_pergola_12', name: 'PT Pergola 12x12', description: '6x6 posts, 2x8 beams.', priceDelta: 4495.00, calculationType: 'lump_sum', imageColor: '#4d5d30' },
      { id: 'cedar_pergola_10', name: 'Cedar Pergola 10x10', description: 'Premium Cedar construction.', priceDelta: 5495.00, calculationType: 'lump_sum', imageColor: '#e67e22' },
      { id: 'hideaway_alum_10', name: 'Hideaway Alum 10x10', description: 'Powder coated industrial alum.', priceDelta: 10995.00, calculationType: 'lump_sum', imageColor: '#17202a' },
      { id: 'bio_10x10_manual', name: 'BioPergola 10x10', description: 'Manual louvered roof.', priceDelta: 9995.00, calculationType: 'lump_sum', imageColor: '#2c3e50' }
    ]
  },
  {
    id: 'extras',
    title: 'Site & Landscaping',
    baseName: 'Standard Finishes',
    options: [
      { id: 'joist_guard', name: 'JoistGuard Protection', description: 'Waterproof joist membrane.', priceDelta: 2.49, calculationType: 'sqft_add', imageColor: '#17202a' },
      { id: 'fabric_stone', name: 'Fabric & 3/4 Stone', description: 'Commercial grade stone prep. Based on deck sqft.', priceDelta: 5.49, calculationType: 'sqft_add', imageColor: '#7f8c8d' },
      { id: 'river_wash', name: 'River Wash Stone', description: 'Premium river wash stone area.', priceDelta: 6.95, calculationType: 'river_wash_sqft', imageColor: '#bdc3c7' },
      { id: 'mulch_extra', name: 'Landscape Mulch', description: 'Premium garden mulch + fabric.', priceDelta: 6.00, calculationType: 'mulch_sqft', imageColor: '#5d4037' },
      { id: 'stepping_stones_extra', name: 'Stepping Stones', description: 'Installed decorative stepping stones.', priceDelta: 79.00, calculationType: 'stepping_stones_qty', imageColor: '#7f8c8d' },
      { id: 'removal_disposal', name: 'Removal & Disposal', description: 'Demolition of existing structure.', priceDelta: 9.95, calculationType: 'sqft_add', imageColor: '#c0392b' },
      { id: 'single_border', name: 'Single Picture Frame Border', description: 'Single board perimeter accent.', priceDelta: 19.95, calculationType: 'lf_border_add', imageColor: '#34495e' },
      { id: 'double_border', name: 'Double Picture Frame Border', description: 'Premium double board perimeter accent.', priceDelta: 29.95, calculationType: 'lf_border_add', imageColor: '#2c3e50' }
    ]
  },
  {
    id: 'protection',
    title: 'Warranty & Protection',
    baseName: '5-Year Standard Workmanship',
    options: [
      { id: 'ext_warranty_10', name: '10-Year Ext. Workmanship', description: 'Comprehensive coverage upgrade. Peace of mind.', priceDelta: 0.05, calculationType: 'percentage', imageColor: '#27ae60' }
    ]
  }
];

export const RAILING_PRICING_MATRIX: Record<DeckSize, number> = {
  '12x12': 5896, '12x16': 6159, '12x20': 6314, '16x16': 6476, '16x20': 6678, '20x20': 7915,
};

export const DECK_MATERIALS_MATRIX: Material[] = [
  { id: 'pt-wood', name: 'Pressure treated wood', brand: 'Standard', tier: TierType.SELECT, description: 'Affordable and durable natural wood option.', warranty: '1-Year Limited', materialType: 'Natural Wood', basePricing: { '12x12': 6640, '12x16': 8763, '12x20': 10416, '16x16': 12150, '16x20': 14267, '20x20': 16710 } },
  { id: 'cedar', name: 'Cedar', brand: 'Standard', tier: TierType.SELECT, description: 'Naturally rot-resistant with a beautiful grain.', warranty: '5-Year Limited', materialType: 'Natural Wood', basePricing: { '12x12': 7584, '12x16': 9995, '12x20': 11936, '16x16': 13766, '16x20': 16267, '20x20': 19190 } },
  { id: 'fiberon-weekender', name: 'GoodLife - Weekender', brand: 'FiberOn', tier: TierType.SELECT, description: 'Value-oriented composite decking.', warranty: '25-Year Residential', materialType: 'Composite', basePricing: { '12x12': 9388, '12x16': 12315, '12x20': 14772, '16x16': 16798, '16x20': 19975, '20x20': 23770 } },
  { id: 'fiberon-escape', name: 'GoodLife - Escape', brand: 'FiberOn', tier: TierType.SELECT, description: 'Enhanced realism with multi-tonal colors.', warranty: '30-Year Residential', materialType: 'Composite', basePricing: { '12x12': 10248, '12x16': 13427, '12x20': 16136, '16x16': 18254, '16x20': 21763, '20x20': 25982 } },
  { id: 'fiberon-sanctuary', name: 'Sanctuary', brand: 'FiberOn', tier: TierType.PREMIUM, description: 'Rustic colors and high-performance protection.', warranty: '40-Year Residential', materialType: 'Composite', basePricing: { '12x12': 11232, '12x16': 14707, '12x20': 17712, '16x16': 19934, '16x20': 23835, '20x20': 28550 } },
  { id: 'fiberon-concordia', name: 'Concordia', brand: 'FiberOn', tier: TierType.ELITE, description: 'Four-sided cap for ultimate durability.', warranty: '50-Year Residential', materialType: 'Composite', basePricing: { '12x12': 12308, '12x16': 16091, '12x20': 19404, '16x16': 21742, '16x20': 26047, '20x20': 31282 } },
  { id: 'fiberon-paramount', name: 'Paramount', brand: 'FiberOn', tier: TierType.ELITE, description: 'High-end PVC for low maintenance.', warranty: 'Lifetime Limited', materialType: 'PVC', basePricing: { '12x12': 12636, '12x16': 16515, '12x20': 19924, '16x16': 22294, '16x20': 26727, '20x20': 32122 } },
  { id: 'fiberon-promenade', name: 'Promenade', brand: 'FiberOn', tier: TierType.ELITE, description: 'Cellular PVC. Premium high-definition colors.', warranty: 'Lifetime Limited', materialType: 'PVC', basePricing: { '12x12': 13176, '12x16': 17171, '12x20': 20696, '16x16': 23118, '16x20': 27699, '20x20': 33294 } },
  { id: 'tt-prime', name: 'Prime Collection', brand: 'TimberTech', tier: TierType.SELECT, description: 'Clean, solid colors with a scalloped profile.', warranty: '25-Year Residential', materialType: 'Composite', basePricing: { '12x12': 9767, '12x16': 12797, '12x20': 15359, '16x16': 17425, '16x20': 20737, '20x20': 24709 } },
  { id: 'tt-prime-plus', name: 'Prime+ Collection', brand: 'TimberTech', tier: TierType.SELECT, description: 'Clean, multi-tonal colors and high performance.', warranty: '30-Year Residential', materialType: 'Composite', basePricing: { '12x12': 10062, '12x16': 13188, '12x20': 15846, '16x16': 17944, '16x20': 21384, '20x20': 25516 } },
  { id: 'tt-terrain', name: 'Terrain', brand: 'TimberTech', tier: TierType.PREMIUM, description: 'Rugged terrain aesthetic with deep embossing.', warranty: '30-Year Fade & Stain', materialType: 'Composite', basePricing: { '12x12': 11241, '12x16': 14751, '12x20': 17793, '16x16': 20019, '16x20': 23971, '20x20': 28743 } },
  { id: 'tt-reserve', name: 'Reserve Collection', brand: 'TimberTech', tier: TierType.ELITE, description: 'Reclaimed wood look with high-definition grain.', warranty: '50-Year Residential', materialType: 'Composite', basePricing: { '12x12': 12910, '12x16': 16919, '12x20': 20459, '16x16': 22863, '16x20': 27474, '20x20': 33082 } },
  { id: 'tt-legacy', name: 'Legacy', brand: 'TimberTech', tier: TierType.SIGNATURE, description: 'Artisan collection with hand-scraped texture.', warranty: '50-Year Residential', materialType: 'Composite', basePricing: { '12x12': 13943, '12x16': 18254, '12x20': 22095, '16x16': 24609, '16x20': 29618, '20x20': 35733 } },
  { id: 'azek-harvest', name: 'Harvest (PVC)', brand: 'AZEK', tier: TierType.ELITE, description: 'Natural shades with cellular PVC core.', warranty: 'Lifetime Residential', materialType: 'PVC', basePricing: { '12x12': 11599, '12x16': 15245, '12x20': 18422, '16x16': 20688, '16x20': 24825, '20x20': 29820 } },
  { id: 'azek-landmark', name: 'Landmark (PVC)', brand: 'AZEK', tier: TierType.ELITE, description: 'Sophisticated cross-cut hardwood visuals.', warranty: 'Lifetime Residential', materialType: 'PVC', basePricing: { '12x12': 12783, '12x16': 16779, '12x20': 20307, '16x16': 22699, '16x20': 27298, '20x20': 32882 } },
  { id: 'azek-vintage', name: 'Vintage (PVC)', brand: 'AZEK', tier: TierType.SIGNATURE, description: 'The pinnacle of luxury PVC decking.', warranty: 'Lifetime Residential', materialType: 'PVC', basePricing: { '12x12': 13861, '12x16': 18129, '12x20': 21929, '16x16': 24433, '16x20': 29384, '20x20': 35431 } },
  { id: 'clubhouse-woodbridge', name: 'Woodbridge (PVC)', brand: 'Clubhouse', tier: TierType.PREMIUM, description: 'Ultra-durable foamed PVC decking.', warranty: 'Limited Lifetime', materialType: 'PVC', basePricing: { '12x12': 11509, '12x16': 15079, '12x20': 18181, '16x16': 20435, '16x20': 24463, '20x20': 29339 } },
  { id: 'eva-last-infinity', name: 'Infinity', brand: 'Eva-Last', tier: TierType.SELECT, description: 'Capped bamboo composite with rich textures.', warranty: '25-Year Residential', materialType: 'Bamboo Composite', basePricing: { '12x12': 9883, '12x16': 12924, '12x20': 15496, '16x16': 17573, '16x20': 20896, '20x20': 24889 } },
  { id: 'eva-last-apex', name: 'Apex', brand: 'Eva-Last', tier: TierType.SIGNATURE, description: 'Luxury ultra-low maintenance capped PVC.', warranty: '30-Year Residential', materialType: 'Capped PVC', basePricing: { '12x12': 13289, '12x16': 17401, '12x20': 21045, '16x16': 23490, '16x20': 28236, '20x20': 34021 } },
  { id: 'eva-last-pioneer', name: 'Pioneer', brand: 'Eva-Last', tier: TierType.SIGNATURE, description: 'Premium textures with exception durability.', warranty: '35-Year Residential', materialType: 'Bamboo Composite', basePricing: { '12x12': 16115, '12x16': 21141, '12x20': 25698, '16x16': 28448, '16x20': 34413, '20x20': 41721 } }
];

export const TIER_CONFIG_MATRIX: Record<TierType, { label: string; sealColor: string; textColor: string }> = {
  [TierType.SELECT]: { label: 'Select', sealColor: '#FFFFFF', textColor: '#000000' },
  [TierType.PREMIUM]: { label: 'Premium', sealColor: '#000000', textColor: '#FFFFFF' },
  [TierType.ELITE]: { label: 'Elite', sealColor: '#C0C0C0', textColor: '#000000' },
  [TierType.SIGNATURE]: { label: 'Signature', sealColor: '#D4AF37', textColor: '#000000' }
};

export const DECK_SIZES_MATRIX: { label: string; value: DeckSize }[] = [
  { label: '12x12', value: '12x12' },
  { label: '12x16', value: '12x16' },
  { label: '12x20', value: '12x20' },
  { label: '16x16', value: '16x16' },
  { label: '16x20', value: '16x20' },
  { label: '20x20', value: '20x20' }
];

export const PACKAGE_PRICING: Record<PackageSize, PackagePriceRow> = {
  '12X12': { 
    noRailing: { SILVER: 3995, GOLD: 7495, PLATINUM: 12495, DIAMOND: 15495 }, 
    withRailing: { SILVER: 5995, GOLD: 12795, PLATINUM: 17795, DIAMOND: 20795 }, 
    upgrades: { helical: 1440, cement: 1049, stone: 749 } 
  },
  '12X16': { 
    noRailing: { SILVER: 5895, GOLD: 9995, PLATINUM: 15995, DIAMOND: 19995 }, 
    withRailing: { SILVER: 7995, GOLD: 15495, PLATINUM: 21495, DIAMOND: 25495 }, 
    upgrades: { helical: 1995, cement: 1475, stone: 895 } 
  },
  '12X20': { 
    noRailing: { SILVER: 6995, GOLD: 11995, PLATINUM: 19495, DIAMOND: 24495 }, 
    withRailing: { SILVER: 9295, GOLD: 17595, PLATINUM: 24995, DIAMOND: 29995 }, 
    upgrades: { helical: 2249, cement: 1675, stone: 1095 } 
  },
  '16X16': { 
    noRailing: { SILVER: 7495, GOLD: 12995, PLATINUM: 21495, DIAMOND: 26995 }, 
    withRailing: { SILVER: 9995, GOLD: 18895, PLATINUM: 26995, DIAMOND: 33749 }, 
    upgrades: { helical: 3295, cement: 2149, stone: 1195 } 
  },
  '16X20': { 
    noRailing: { SILVER: 9495, GOLD: 15995, PLATINUM: 25995, DIAMOND: 31995 }, 
    withRailing: { SILVER: 11995, GOLD: 21995, PLATINUM: 31995, DIAMOND: 37995 }, 
    upgrades: { helical: 3295, cement: 2149, stone: 1495 } 
  },
  '20X20': { 
    noRailing: { SILVER: 11795, GOLD: 19895, PLATINUM: 31995, DIAMOND: 39495 }, 
    withRailing: { SILVER: 14895, GOLD: 26995, PLATINUM: 38995, DIAMOND: 46695 }, 
    upgrades: { helical: 3495, cement: 2349, stone: 1895 } 
  }
};

const PACKAGE_DETAILS: Record<PackageLevel, { color: string; foundation: string; framing: string; decking: string; railing: string; warranty: string; extras: string[]; }> = {
  SILVER: { color: '#95a5a6', foundation: 'Floating deck block foundation', framing: '2X8 Pressure treated frame, 16" OC', decking: 'Pressure treated deck boards', railing: 'Pressure treated railings', warranty: 'Standard Workmanship', extras: [] },
  GOLD: { color: '#27ae60', foundation: 'Floating deck block foundation', framing: '2X8 Pressure treated frame, 16" OC', decking: 'Fiberon GoodLife / TimberTech Prime / Eva-Last Infinity', railing: 'Aluminum railings', warranty: '25-30 Year material warranty', extras: ['8 colors available'] },
  PLATINUM: { color: '#2980b9', foundation: 'Dug cement footing foundation', framing: '2X10 Pressure treated frame, 16" OC', decking: 'Fiberon Sanctuary / TimberTech Terrain / Woodbridge PVC', railing: 'Aluminum railings', warranty: '25 - 40 Year material warranty', extras: ['DeckGuard joist protection', 'Landscape fabric + stone', '18 colors available'] },
  DIAMOND: { color: '#444', foundation: 'Helical pile foundation', framing: '2X10 Pressure treated frame, 12" OC', decking: 'Fiberon Concord/Paramount/Promenade / TimberTech Reserve / Azek Landmark', railing: 'Frameless Glass Railings', warranty: '30 - 50 Year material warranty', extras: ['DeckGuard joist protection', 'Landscape fabric + stone', 'LED lighting package', '23 colors available', '10-Year Extended Labor Warranty'] }
};

const STYLES = `
  @import url('https://fonts.googleapis.com/css2?family=Montserrat:wght@300;400;600;700;800&family=Playfair+Display:ital,wght@0,400..900;1,400..900&display=swap');

  :root {
    --bg-color: #121212;
    --panel-bg: #1e1e1e;
    --text-main: #ffffff;
    --text-muted: #a0a0a0;
    --gold: #D4AF37;
    --savings: #27ae60;
    --border: #333;
    --danger: #e74c3c;
    --primary: #D4AF37;
    --preferred-yellow: #ffff00;
  }

  body, html { }
  .estimator-calculator-root { margin: 0; padding: 0; font-family: 'Montserrat', sans-serif; background-color: var(--bg-color); color: var(--text-main); height: 100vh; overflow: hidden; display: flex; flex-direction: column; width: 100%; }

  .main-nav { display: flex; justify-content: center; background: #000; padding: 10px; border-bottom: 1px solid var(--gold); gap: 20px; flex-shrink: 0; height: 58px; box-sizing: border-box; z-index: 50; position: relative; }
  .nav-btn { background: transparent; color: var(--text-muted); border: 1px solid var(--border); padding: 6px 20px; border-radius: 4px; cursor: pointer; font-weight: 600; text-transform: uppercase; transition: all 0.3s; }
  .nav-btn.active { background: var(--gold); color: black; border-color: var(--gold); }
  .nav-btn:hover:not(.active) { border-color: var(--gold); color: #fff; transform: translateY(-1px); }

  .fullscreen-toggle {
    position: absolute;
    right: 20px;
    top: 50%;
    transform: translateY(-50%);
    background: transparent;
    border: 1px solid var(--border);
    color: var(--text-muted);
    width: 38px;
    height: 38px;
    border-radius: 4px;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.3s;
  }
  .fullscreen-toggle:hover { border-color: var(--gold); color: #fff; }

  .app-container { display: flex; flex: 1; overflow: hidden; width: 100vw; height: 100%; }

  .control-panel {
    width: 22%; min-width: 300px; background-color: var(--panel-bg); border-right: 1px solid var(--border); padding: 15px; overflow-y: auto; display: flex; flex-direction: column; gap: 12px; box-shadow: 4px 0 15px rgba(0,0,0,0.5); z-index: 10; height: 100%; box-sizing: border-box; flex-shrink: 0;
  }

  .control-section { background: rgba(0,0,0,0.2); padding: 12px; border-radius: 6px; border: 1px solid #333; flex-shrink: 0; }
  .control-section:last-child { margin-bottom: 20px; }
  .control-section h3 { color: var(--gold); font-size: 0.65rem; text-transform: uppercase; margin-bottom: 8px; border-bottom: 1px solid var(--border); padding-bottom: 4px; }

  .input-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
  .input-group { margin-bottom: 4px; }
  .input-group label { display: block; font-size: 0.6rem; color: var(--text-muted); margin-bottom: 2px; text-transform: uppercase; letter-spacing: 0.5px; }
  .input-group input, .input-group select { width: 100%; background: #000; border: 1px solid #444; color: white; padding: 6px 8px; border-radius: 4px; font-family: inherit; font-size: 0.75rem; box-sizing: border-box; }

  .display-stage { flex: 1; display: flex; flex-direction: column; background: radial-gradient(circle at center, #1a1a1a 0%, #000000 100%); overflow: hidden; height: 100%; }
  .stage-header { padding: 15px 30px; display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid rgba(255,255,255,0.05); flex-shrink: 0; }
  .stage-content { flex: 1; padding: 20px 30px; overflow-y: auto; display: flex; flex-direction: column; }

  .category-nav { display: flex; gap: 8px; margin-bottom: 15px; justify-content: center; flex-wrap: wrap; flex-shrink: 0; }
  .nav-item { cursor: pointer; padding: 4px 12px; border-radius: 15px; border: 1px solid var(--border); color: var(--text-muted); font-size: 0.7rem; text-transform: uppercase; transition: all 0.3s; }
  .nav-item.active { background: var(--gold); color: #000; border-color: var(--gold); font-weight: 700; }
  .nav-item:hover:not(.active) { border-color: var(--gold); color: #fff; }

  .options-grid { display: flex; gap: 15px; overflow-x: auto; padding-bottom: 15px; width: 100%; scroll-snap-type: x mandatory; flex-shrink: 0; }
  .option-card { background: rgba(255,255,255,0.05); border: 1px solid var(--border); border-radius: 8px; cursor: pointer; min-width: 220px; height: 210px; display: flex; flex-direction: column; transition: 0.3s; position: relative; overflow: hidden; scroll-snap-align: start; }
  .option-card:hover { transform: translateY(-4px); border-color: #555; box-shadow: 0 4px 15px rgba(0,0,0,0.5); }
  .option-card.selected { border-color: var(--gold); box-shadow: 0 0 10px rgba(212, 175, 55, 0.2); }
  .option-card.selected::after { content: '✓'; position: absolute; top: 6px; right: 6px; background: var(--gold); color: black; font-size: 0.6rem; font-weight: bold; padding: 2px 5px; border-radius: 3px; z-index: 2; }

  .card-visual { height: 60px; width: 100%; transition: opacity 0.3s; flex-shrink: 0; }
  .card-body { padding: 8px 10px; flex: 1; display: flex; flex-direction: column; gap: 2px; overflow: hidden; }
  .card-brand { font-size: 0.6rem; text-transform: uppercase; color: var(--gold); font-weight: 700; }
  .card-title { font-size: 0.85rem; font-weight: 700; margin-bottom: 2px; color: #fff; line-height: 1.2; }
  .card-desc { font-size: 0.7rem; color: var(--text-muted); line-height: 1.3; overflow: hidden; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; flex: 1; }
  .card-price { font-size: 0.9rem; color: var(--gold); font-weight: 800; border-top: 1px solid #333; padding-top: 6px; margin-top: 4px; flex-shrink: 0; }
  .card-price.savings { color: var(--savings); }

  .stage-footer { background: #0d0d0d; border-top: 1px solid var(--border); padding: 20px 40px; display: flex; justify-content: space-between; align-items: stretch; position: relative; flex-shrink: 0; min-height: 240px; box-sizing: border-box; }
  .total-value { font-size: 4.2rem; color: var(--gold); font-weight: 800; line-height: 1; margin-bottom: 10px; text-shadow: 0 4px 20px rgba(212, 175, 55, 0.3); }

  .impact-breakdown { 
    margin-top: 15px; 
    display: grid; 
    grid-template-columns: repeat(2, 1fr); 
    gap: 10px 40px; 
    width: 100%; 
    border-top: 1px solid rgba(255,255,255,0.1); 
    padding-top: 15px;
    max-height: none;
    overflow: visible;
  }
  .impact-row { display: flex; justify-content: space-between; font-size: 0.85rem; color: #ccc; padding: 4px 0; border-bottom: 1px solid rgba(255,255,255,0.03); }
  .impact-value { font-weight: 800; color: var(--gold); }
  .impact-value.savings { color: var(--savings); }

  .quantity-control { display: flex; align-items: center; gap: 10px; margin-top: 5px; }
  .qty-btn { background: var(--gold); color: black; border: none; width: 22px; height: 22px; border-radius: 4px; font-weight: 800; cursor: pointer; display: flex; align-items: center; justify-content: center; }
  .qty-val { font-size: 0.85rem; font-weight: 800; color: white; min-width: 20px; text-align: center; }

  .package-layout { display: flex; flex-direction: column; flex: 1; width: 100%; overflow-y: auto; background: #0a0a0a; height: 100%; }
  .package-scroll-content { padding: 30px 50px; width: 100%; box-sizing: border-box; max-width: 1400px; margin: 0 auto; }
  .pkg-title-bar { display: flex; justify-content: space-between; align-items: flex-end; border-bottom: 1px solid #333; padding-bottom: 20px; margin-bottom: 30px; }
  .pkg-title-main { font-size: 1.8rem; font-weight: 800; color: var(--gold); margin: 0; text-transform: uppercase; letter-spacing: 1px; }
  .pkg-subtitle { color: #888; font-size: 0.75rem; text-transform: uppercase; letter-spacing: 2px; margin-top: 4px; font-weight: 600; }
  .pkg-controls { display: flex; gap: 20px; align-items: center; }
  
  .pkg-select-small { background: #111; color: white; border: 1px solid #444; padding: 8px 12px; border-radius: 4px; font-family: inherit; font-size: 0.8rem; cursor: pointer; }
  .pkg-toggle-btn { background: #111; color: #888; border: 1px solid #444; padding: 8px 20px; border-radius: 4px; font-size: 0.7rem; font-weight: 800; cursor: pointer; transition: 0.3s; }
  .pkg-toggle-btn.active { background: var(--gold); color: black; border-color: var(--gold); }

  .package-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 25px; margin-bottom: 40px; }
  .pkg-card { background: #151515; border: 1px solid #333; border-radius: 8px; display: flex; flex-direction: column; position: relative; transition: 0.3s; overflow: hidden; }
  .pkg-card:hover { transform: translateY(-5px); border-color: #555; box-shadow: 0 10px 30px rgba(0,0,0,0.5); }
  
  .pkg-card.preferred { border: 3px solid var(--preferred-yellow); box-shadow: 0 0 40px rgba(255, 255, 0, 0.2); transform: scale(1.02); }
  .preferred-badge { background: var(--preferred-yellow); color: #000; text-align: center; font-weight: 900; padding: 10px; font-size: 0.85rem; text-transform: uppercase; letter-spacing: 1px; line-height: 1.2; }
  .pkg-header { padding: 25px 20px; text-align: center; background: rgba(255,255,255,0.02); border-bottom: 1px solid rgba(255,255,255,0.05); }
  .pkg-name { font-size: 0.85rem; font-weight: 800; color: var(--gold); letter-spacing: 1px; }
  .pkg-price { font-size: 2rem; font-weight: 800; color: #fff; margin: 8px 0; }
  .pkg-monthly { color: #3498db; font-weight: 800; font-size: 0.65rem; }
  .pkg-body { padding: 20px; flex: 1; display: flex; flex-direction: column; gap: 12px; }
  .pkg-row { display: flex; flex-direction: column; border-bottom: 1px solid rgba(255,255,255,0.05); padding-bottom: 6px; }
  .pkg-label { color: var(--text-muted); font-size: 0.55rem; text-transform: uppercase; font-weight: 700; margin-bottom: 2px; }
  .pkg-value { font-size: 0.75rem; color: #eee; line-height: 1.4; }
  .pkg-extra-item { color: var(--gold); font-weight: 700; font-size: 0.7rem; display: flex; align-items: flex-start; gap: 6px; margin-top: 4px; }
  
  .pkg-upgrades { margin-top: 15px; padding-top: 15px; border-top: 1px dashed #333; }
  .pkg-upgrades-title { color: #777; font-size: 0.6rem; text-transform: uppercase; font-weight: 800; margin-bottom: 10px; letter-spacing: 1px; }
  .pkg-upgrade-item { display: flex; align-items: center; gap: 10px; font-size: 0.75rem; color: #ccc; margin-bottom: 8px; cursor: pointer; user-select: none; }
  .pkg-upgrade-item:hover { color: #fff; }
  .pkg-upgrade-checkbox { width: 16px; height: 16px; border: 1px solid #444; border-radius: 3px; display: flex; align-items: center; justify-content: center; }
  .pkg-upgrade-item.active .pkg-upgrade-checkbox { border-color: var(--gold); background: var(--gold); }
  .pkg-upgrade-item.active .pkg-upgrade-checkbox::after { content: '✓'; color: black; font-size: 10px; font-weight: 900; }
  .pkg-upgrade-price { margin-left: auto; color: var(--gold); font-weight: 700; font-size: 0.7rem; }

  .action-btn { background: var(--primary); color: white; border: none; padding: 12px 20px; border-radius: 4px; cursor: pointer; font-weight: 700; text-transform: uppercase; margin-top: 10px; transition: all 0.3s; width: 100%; display: flex; align-items: center; justify-content: center; gap: 8px; font-size: 0.85rem; }
  .accept-btn { background: var(--savings); color: white; border: none; padding: 12px 20px; border-radius: 4px; cursor: pointer; font-weight: 800; text-transform: uppercase; margin-top: 8px; transition: all 0.3s; width: 100%; display: flex; align-items: center; justify-content: center; gap: 8px; font-size: 0.85rem; }
  .reset-btn { background: transparent; color: var(--danger); border: 1px solid var(--danger); padding: 10px; border-radius: 4px; cursor: pointer; font-weight: 700; text-transform: uppercase; margin-top: 15px; font-size: 0.75rem; transition: all 0.3s; width: 100%; letter-spacing: 1px; }

  #printable-quote, #printable-matrix-quote, #printable-packages-quote { display: none; background: white; color: black; padding: 40px; min-height: 100vh; font-family: 'Helvetica', 'Arial', sans-serif; box-sizing: border-box; }

  @media print {
    html, body { background: white !important; color: black !important; height: auto !important; overflow: visible !important; }
    .main-nav, .control-panel, .category-nav, .package-active-banner, .fullscreen-toggle, .display-stage { display: none !important; }
    /* Never print the on-screen comparison modal. Use the dedicated printable comparison layout instead. */
    .comparison-overlay { display: none !important; }
    #printable-quote, #printable-matrix-quote, #printable-packages-quote { display: none !important; position: static !important; width: 100% !important; margin: 0 !important; padding: 0 !important; min-height: auto !important; }
    html[data-print="estimate"] #printable-quote { display: block !important; }
    html[data-print="agreement"] #printable-quote { display: block !important; }
    html[data-print="matrix"] #printable-matrix-quote { display: block !important; }
    html[data-print="packages"] #printable-packages-quote { display: block !important; }
    .print-biz-header { display: flex; justify-content: space-between; align-items: center; border-bottom: 3px solid var(--gold); padding-bottom: 20px; margin-bottom: 30px; }
    .print-biz-info { text-align: right; font-size: 0.8rem; line-height: 1.4; color: #333; }
    .print-quote-id { display: flex; justify-content: space-between; margin-bottom: 30px; border: 1px solid #eee; padding: 20px; border-radius: 8px; background: #fafafa; }
    .print-label { font-size: 0.65rem; text-transform: uppercase; color: #888; font-weight: 800; letter-spacing: 1px; margin-bottom: 4px; }
    .print-section-title { font-size: 0.9rem; font-weight: 900; text-transform: uppercase; border-bottom: 2px solid #f0f0f0; padding-bottom: 5px; margin: 35px 0 15px 0; color: var(--gold); }
    .print-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 15px; margin-bottom: 20px; }
    .print-data-item { border-left: 3px solid #f0f0f0; padding-left: 12px; }
    .print-value { font-size: 1rem; font-weight: 700; color: #000; }
    .print-table { width: 100%; border-collapse: collapse; margin-top: 10px; }
    .print-table { page-break-inside: auto; }
    .print-table tr { page-break-inside: avoid; page-break-after: auto; }
    .print-table th { text-align: left; font-size: 0.7rem; text-transform: uppercase; color: #666; border-bottom: 1px solid #ddd; padding: 12px 10px; background: #f9f9f9; }
    .print-table td { padding: 12px 10px; font-size: 0.85rem; border-bottom: 1px solid #eee; }
    .print-summary-box { display: flex; gap: 40px; margin-top: 40px; background: #fff; padding: 0; border-top: 2px solid var(--gold); }
    .print-payment-schedule { flex: 1; padding-top: 20px; }
    .print-totals-list { width: 300px; padding-top: 20px; }
    .print-total-row { display: flex; justify-content: space-between; padding: 8px 0; font-size: 0.9rem; color: #444; }
    .print-total-row.grand { margin-top: 15px; padding: 15px 0; border-top: 3px solid #000; font-weight: 900; font-size: 1.3rem; color: #000; }
    .print-footer { margin-top: 50px; font-size: 0.7rem; color: #666; line-height: 1.6; border-top: 1px solid #eee; padding-top: 20px; font-style: italic; }
    .print-sig-block { display: flex; gap: 60px; margin-top: 80px; }
    .print-sig-line { flex: 1; border-top: 2px solid #333; padding-top: 12px; font-size: 0.75rem; color: #000; text-transform: uppercase; font-weight: 800; text-align: center; }
    @page { margin: 1.5cm; }

    /* Contract-Specific Styles */
    .contract-body { font-family: 'Times New Roman', serif; color: #000; text-align: justify; }
    .contract-header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #000; padding-bottom: 10px; }
    .contract-title { font-size: 1.6rem; font-weight: 900; text-transform: uppercase; margin-bottom: 5px; }
    .contract-section { margin-bottom: 20px; }
    .contract-section h2 { font-size: 1rem; font-weight: 900; border-bottom: 1px solid #ccc; padding-bottom: 3px; margin-bottom: 10px; text-transform: uppercase; }
    .contract-clause { margin-bottom: 12px; line-height: 1.5; font-size: 0.95rem; }
    .contract-bold { font-weight: 900; }
    .acceptance-box { background: #f4f4f4; border: 2px solid #000; padding: 15px; margin: 30px 0; }
    .acceptance-box h3 { text-align: center; margin-bottom: 15px; text-transform: uppercase; text-decoration: underline; font-size: 1rem; }
    .page-break { break-before: page; page-break-before: always; }
    .contract-section, .acceptance-box { break-inside: avoid; page-break-inside: avoid; }
  }

  /* Utility Classes */
  .package-active-banner {
    background: var(--gold);
    color: black;
    padding: 10px;
    border-radius: 4px;
    margin-bottom: 15px;
    display: flex;
    justify-content: space-between;
    align-items: center;
    font-weight: 800;
    text-transform: uppercase;
    font-size: 0.65rem;
  }
  .package-active-banner button {
    background: rgba(0,0,0,0.1);
    border: 1px solid rgba(0,0,0,0.2);
    padding: 2px 8px;
    border-radius: 3px;
    cursor: pointer;
    font-size: 0.6rem;
  }
`;

// --- Constants ---

const INITIAL_DIMENSIONS: Dimensions = {
  sqft: 0,
  footingsCount: 0,
  steps: 0,
  fasciaLF: 0,
  ledgerLF: 0,
  namiFixCount: 0,
  skirtingSqFt: 0,
  borderLF: 0,
  privacyLF: 0,
  privacyPosts: 0,
  privacyScreens: 0,
  lightsCount: 0,
  landscapeSqFt: 0,
  railingLF: 0,
  drinkRailLF: 0,
  alumPosts: 0,
  alumSection6: 0,
  alumSection8: 0,
  alumStair6: 0,
  alumStair8: 0,
  glassSection6: 0,
  glassPanelsLF: 0,
  framelessSections: 0,
  framelessLF: 0,
  demoSqFt: 0,
  riverWashSqFt: 0,
  mulchSqFt: 0,
  steppingStonesCount: 0
};

const getInitialSelections = () => ({
  design: [],
  foundation: null,
  framing: null,
  decking: PRICING_DATA.find(c => c.id === 'decking')?.options.find(o => o.id === 'fiberon_goodlife_weekender') || null,
  railing: null,
  skirting: null,
  accessories: [],
  privacy: [],
  pergolas: null,
  extras: [],
  protection: []
});

// --- Components ---

const Logo = ({ darkBg = false }: { darkBg?: boolean }) => (
  <div style={{ lineHeight: 1, display: 'flex', flexDirection: 'column' }}>
    <div style={{ color: '#D4AF37', fontSize: '10px', fontWeight: 800, letterSpacing: '0.3em', marginBottom: '1px', textTransform: 'uppercase' }}>Luxury</div>
    <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px' }}>
      <div style={{ color: darkBg ? '#fff' : '#000', fontSize: '24px', fontWeight: 800, letterSpacing: '-1px', textTransform: 'uppercase' }}>DecKing</div>
      <div style={{ color: 'var(--gold)', fontSize: '9px', fontWeight: 700, letterSpacing: '1px', textTransform: 'uppercase', opacity: 0.8 }}>Estimator</div>
    </div>
  </div>
);

const SealBadge = ({ tier, size = 'md' }: { tier: TierType, size?: 'sm' | 'md' }) => {
  const info = TIER_CONFIG_MATRIX[tier];
  const containerSize = size === 'sm' ? 'w-5 h-5' : 'w-11 h-11';
  const fontSize = size === 'sm' ? 'text-[4.5px]' : 'text-[7px]';
  return (
    <div className={`relative ${containerSize} flex items-center justify-center shrink-0`}>
      <svg viewBox="0 0 100 100" className="absolute inset-0 w-full h-full drop-shadow-md">
        <path
          fill={info.sealColor}
          stroke={tier === TierType.PREMIUM ? 'rgba(255,255,255,0.4)' : 'transparent'}
          strokeWidth={tier === TierType.PREMIUM ? "2" : "0"}
          d="M50 2.5L54.1 12L64.2 9L65.7 19.3L75.6 17.8L74.8 28.1L84.2 28.1L81.2 38.8L89.5 41.9L84.4 50.3L91.1 56.1L84.4 64L91.1 69.8L84.1 76.2L88.8 84.3L80.8 88.3L83.1 98L74.4 99.5L73.9 109.8L65 108.6L61.7 118.3L53.2 114.5L47.5 122.6L40.2 116.6L32.4 123L27.5 115.1L18.8 119L16.4 109.4L7.3 110.9L7.8 100.6L-1.2 99.1L1.8 89.2L-6.5 86.1L-1.4 77.7L-8.1 71.9L-1.1 65.5L-5.8 57.4L2.2 53.4L-0.1 43.7L8.6 42.2L9.1 31.9L18 33.1L21.3 23.4L29.8 27.2L35.5 19.1L42.8 25.1Z"
          transform="translate(5, -4) scale(0.9)"
        />
      </svg>
      <span className={`relative z-10 ${fontSize} font-black uppercase text-center leading-[0.8] px-1 select-none`} style={{ color: info.textColor }}>
        {info.label}
      </span>
    </div>
  );
};

const MaterialCard = ({ material, size, showRailings, railingCost, isSelected, onToggle, onPrint }: { material: Material; size: DeckSize; showRailings: boolean; railingCost: number; isSelected: boolean; onToggle: () => void; onPrint: () => void }) => {
  const basePrice = material.basePricing[size];
  const totalPrice = showRailings ? basePrice + railingCost : basePrice;
  const monthlyPrice = Math.round(totalPrice * FINANCING_FACTOR);

  return (
    <div className={`relative h-full flex flex-col rounded-lg transition-all duration-200 overflow-hidden cursor-pointer bg-[#161616] border shadow-xl ${isSelected ? 'border-[#ebc453] ring-1 ring-[#ebc453]/30 scale-[1.01]' : 'border-white/5'}`} onClick={onToggle}>
      <div className="absolute top-0.5 right-0.5 z-10"><SealBadge tier={material.tier} /></div>
      <div className="p-3 flex flex-col h-full">
        <div className="mb-2 pr-10">
          <p className="text-[8px] font-bold tracking-[0.25em] text-[#ebc453] uppercase mb-0.5">{material.brand}</p>
          <h3 className="text-sm font-black text-white leading-tight line-clamp-1">{material.name}</h3>
        </div>
        <div className="mb-2">
          <div className="flex items-baseline gap-1">
            <p className="text-xl font-black text-white leading-none tracking-tighter">${totalPrice.toLocaleString()}</p>
            <span className="text-[9px] font-bold text-[var(--text-tertiary)] uppercase tracking-tighter">+ HST</span>
          </div>
          <div className="flex items-center gap-1.5 mt-1">
             <p className="text-[10px] text-blue-400 font-black uppercase tracking-widest">Est. ${monthlyPrice}/mo</p>
             <span className="text-[6px] text-[var(--text-tertiary)] font-bold uppercase tracking-tighter">{showRailings ? '(Incl Railings)' : '(Surface Only)'}</span>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-1 mb-2 py-1.5 border-y border-white/5">
          <div><p className="text-[7px] font-black text-[var(--text-tertiary)] uppercase tracking-widest">Type</p><p className="text-[8px] text-[var(--text-secondary)] font-bold truncate">{material.materialType}</p></div>
          <div><p className="text-[7px] font-black text-[var(--text-tertiary)] uppercase tracking-widest">Warranty</p><p className="text-[8px] text-[var(--text-secondary)] font-bold truncate">{material.warranty}</p></div>
        </div>
        <div className="mb-2"><p className="text-[9px] text-[var(--text-tertiary)] line-clamp-2 italic leading-tight">"{material.description}"</p></div>
        
        <div className="mt-auto pt-2 flex items-center justify-between border-t border-white/5">
          <div className="flex items-center gap-1.5">
            <div className={`w-2 h-2 rounded-full border border-white/10 ${isSelected ? 'bg-[#ebc453] shadow-[0_0_6px_rgba(235,196,83,0.4)]' : 'bg-transparent'}`}></div>
            <span className={`text-[8px] font-black uppercase tracking-[0.2em] ${isSelected ? 'text-[#ebc453]' : 'text-[var(--text-tertiary)]'}`}>{isSelected ? 'SELECTED' : 'SELECT'}</span>
          </div>
          <button 
            onClick={(e) => { e.stopPropagation(); onPrint(); }}
            className="px-2 py-1 bg-white/5 rounded text-[7px] font-black text-[#ebc453] border border-[#ebc453]/20 hover:bg-[#ebc453]/10 transition-colors uppercase tracking-widest"
          >
            Print Quote
          </button>
        </div>
      </div>
    </div>
  );
};


const PackageShowcase: React.FC<PackageShowcaseProps> = ({ size, setSize, railing, setRailing, selectedUpgrades, setSelectedUpgrades, onPrint }) => {
  const toggleUpgrade = (level: PackageLevel, uid: string) => {
    setSelectedUpgrades(prev => {
      const next = new Set(prev[level]);
      if (next.has(uid)) next.delete(uid);
      else { 
        if (uid === 'cement') next.delete('helical'); 
        if (uid === 'helical') next.delete('cement'); 
        next.add(uid); 
      }
      return { ...prev, [level]: next };
    });
  };

  return (
    <div className="package-layout">
       <div className="package-scroll-content">
         <div className="pkg-title-bar">
            <div>
              <h2 className="pkg-title-main">{size} Series Packages</h2>
              <div className="pkg-subtitle">Curated outdoor living solutions</div>
            </div>
            <div className="pkg-controls">
               <button 
                 onClick={onPrint}
                 className="px-6 py-2.5 rounded bg-[#ebc453] text-black text-[11px] font-black uppercase tracking-widest hover:scale-105 transition-transform shadow-xl mr-4"
               >
                 Print Packages
               </button>
               <div style={{ display: 'flex', flexDirection: 'column' }}>
                 <label className="pkg-label">Package Size</label>
                 <select value={size} onChange={(e) => setSize(e.target.value as PackageSize)} className="pkg-select-small">
                   {Object.keys(PACKAGE_PRICING).map(s => <option key={s} value={s as PackageSize}>{s} Series</option>)}
                 </select>
               </div>
               <div style={{ display: 'flex', flexDirection: 'column' }}>
                 <label className="pkg-label">Safety Railings</label>
                 <button className={`pkg-toggle-btn ${railing ? 'active' : ''}`} onClick={() => setRailing(!railing)}>
                   {railing ? 'WITH RAILINGS' : 'NO RAILINGS'}
                 </button>
               </div>
            </div>
         </div>

         <div className="package-grid">
            {(['SILVER', 'GOLD', 'PLATINUM', 'DIAMOND'] as PackageLevel[]).map(level => {
               const data = PACKAGE_PRICING[size];
               const details = PACKAGE_DETAILS[level];
               const basePrice = railing ? data.withRailing[level] : data.noRailing[level];
               
               const availableUpgrades = [];
               const foundationLower = details.foundation.toLowerCase();
               if (foundationLower.includes('block')) { 
                 availableUpgrades.push({id:'cement', name:'Cement Footings', price:data.upgrades.cement}, {id:'helical', name:'Helical Piles', price:data.upgrades.helical}); 
               } else if (foundationLower.includes('cement')) { 
                 availableUpgrades.push({id:'helical', name:'Helical Piles', price: data.upgrades.helical - data.upgrades.cement}); 
               }
               if (!details.extras.some(e => e.toLowerCase().includes('stone'))) { 
                 availableUpgrades.push({id:'stone', name:'Fabric & Stone', price:data.upgrades.stone}); 
               }

               let upgradeCost = 0;
               selectedUpgrades[level].forEach(uid => { 
                 const found = availableUpgrades.find(u => u.id === uid); 
                 if (found) upgradeCost += found.price; 
               });

               const totalPrice = basePrice + upgradeCost;
               const isPreferred = level === 'PLATINUM';

               return (
                 <div key={level} className={`pkg-card ${isPreferred ? 'preferred' : ''}`}>
                    {isPreferred && <div className="preferred-badge">Our Clients<br/>Preferred Choice</div>}
                    <div className="pkg-header">
                        <div className="pkg-name">{level} Package</div>
                        <div className="pkg-price">${totalPrice.toLocaleString()}<span style={{fontSize: '0.8rem', color: '#777', fontWeight: 600, marginLeft: '5px'}}>+HST</span></div>
                        <div className="pkg-monthly">From ${Math.round(totalPrice * FINANCING_FACTOR)}/mo</div>
                    </div>
                    <div className="pkg-body">
                       <div className="pkg-row"><span className="pkg-label">Foundation</span><span className="pkg-value">{details.foundation}</span></div>
                       <div className="pkg-row"><span className="pkg-label">Material System</span><span className="pkg-value">{details.decking}</span></div>
                       <div className="pkg-row"><span className="pkg-label">Framing Specs</span><span className="pkg-value">{details.framing}</span></div>
                       <div className="pkg-row"><span className="pkg-label">Material Warranty</span><span className="pkg-value">{details.warranty}</span></div>
                       {railing && <div className="pkg-row"><span className="pkg-label">Standard Railing</span><span className="pkg-value">{details.railing}</span></div>}
                       {details.extras.map((ex, i) => (<div key={i} className="pkg-extra-item"><span>•</span> <span>{ex}</span></div>))}
                       
                       {availableUpgrades.length > 0 && (
                         <div className="pkg-upgrades">
                           <div className="pkg-upgrades-title">Optional Enhancements</div>
                           {availableUpgrades.map(u => (
                             <div key={u.id} className={`pkg-upgrade-item ${selectedUpgrades[level].has(u.id) ? 'active' : ''}`} onClick={() => toggleUpgrade(level, u.id)}>
                               <div className="pkg-upgrade-checkbox"></div>
                               <span>{u.name}</span><span className="pkg-upgrade-price">+${u.price.toLocaleString()}</span>
                             </div>
                           ))}
                         </div>
                       )}
                    </div>
                 </div>
               );
            })}
         </div>
       </div>
    </div>
  );
};

const ComparisonOverlay = ({ materials, size, showRailings, railingCost, onClose, onPrint }: { materials: Material[]; size: DeckSize; showRailings: boolean; railingCost: number; onClose: () => void; onPrint: () => void }) => {
  return (
    <div className="comparison-overlay fixed inset-0 z-[100] bg-black/90 backdrop-blur-md flex items-center justify-center p-4 md:p-10">
      <div className="bg-[#111] border border-white/10 w-full max-w-6xl max-h-full overflow-hidden flex flex-col rounded-2xl shadow-2xl">
        <div className="p-6 border-b border-white/5 flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-black italic uppercase tracking-tighter">Material <span className="text-[#ebc453]">Comparison</span></h2>
            <p className="text-[var(--text-tertiary)] text-[10px] font-bold uppercase tracking-widest mt-1">Comparing {materials.length} Premium Solutions • {size} Footprint</p>
          </div>
          <div className="flex items-center gap-3">
            <button 
              onClick={onPrint}
              className="px-6 py-2.5 rounded-full bg-[#ebc453] text-black text-[11px] font-black uppercase tracking-widest hover:scale-105 transition-transform shadow-xl"
            >
              Print Comparison
            </button>
            <button onClick={onClose} className="w-10 h-10 flex items-center justify-center rounded-full bg-white/5 hover:bg-white/10 text-white transition-colors">✕</button>
          </div>
        </div>
        <div className="flex-1 overflow-x-auto p-6">
          <table className="w-full text-left border-collapse min-w-[800px]">
            <thead>
              <tr className="border-b border-white/10">
                <th className="py-4 px-4 text-[10px] font-black text-[var(--text-tertiary)] uppercase tracking-widest">Specifications</th>
                {materials.map((m: Material) => (
                  <th key={m.id} className="py-4 px-4 min-w-[200px]">
                    <div className="flex items-center gap-2 mb-2">
                      <SealBadge tier={m.tier} size="sm" />
                      <span className="text-[9px] font-black text-[#ebc453] uppercase tracking-widest">{m.brand}</span>
                    </div>
                    <div className="text-sm font-black text-white">{m.name}</div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="text-sm font-bold">
              <tr className="border-b border-white/5">
                <td className="py-5 px-4 text-[var(--text-tertiary)] text-[10px] uppercase">Base Investment</td>
                {materials.map((m: Material) => {
                  const base = m.basePricing[size];
                  const total = showRailings ? base + railingCost : base;
                  return (
                    <td key={m.id} className="py-5 px-4">
                      <div className="text-xl text-white font-black">${total.toLocaleString()}</div>
                      <div className="text-[10px] text-blue-400 font-black uppercase mt-0.5">Est. ${Math.round(total * FINANCING_FACTOR)}/mo</div>
                    </td>
                  );
                })}
              </tr>
              <tr className="border-b border-white/5">
                <td className="py-5 px-4 text-[var(--text-tertiary)] text-[10px] uppercase">Material Type</td>
                {materials.map((m: Material) => (
                  <td key={m.id} className="py-5 px-4 text-[var(--text-secondary)]">{m.materialType}</td>
                ))}
              </tr>
              <tr className="border-b border-white/5">
                <td className="py-5 px-4 text-[var(--text-tertiary)] text-[10px] uppercase">Warranty Coverage</td>
                {materials.map((m: Material) => (
                  <td key={m.id} className="py-5 px-4 text-[var(--text-secondary)]">{m.warranty}</td>
                ))}
              </tr>
              <tr className="border-b border-white/5">
                <td className="py-5 px-4 text-[var(--text-tertiary)] text-[10px] uppercase">Performance Grade</td>
                {materials.map((m: Material) => (
                  <td key={m.id} className="py-5 px-4">
                    <span className="px-2 py-1 bg-white/5 rounded text-[10px] text-white border border-white/5">{m.tier}</span>
                  </td>
                ))}
              </tr>
              <tr>
                <td className="py-5 px-4 text-[var(--text-tertiary)] text-[10px] uppercase align-top">Value Proposition</td>
                {materials.map((m: Material) => (
                  <td key={m.id} className="py-5 px-4 text-[var(--text-secondary)] text-xs italic leading-relaxed font-normal">"{m.description}"</td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
        <div className="p-6 bg-white/5 border-t border-white/5 text-center">
          <p className="text-[10px] font-bold text-[var(--text-tertiary)] uppercase tracking-[0.3em]">All estimates include professional installation, helical piles, and HST not included.</p>
        </div>
      </div>
    </div>
  );
};

const StandaloneMaterialMatrix: React.FC<{ 
  onPrintRequest: (items: Material[], size: DeckSize, railings: boolean, mode: 'single' | 'compare') => void 
}> = ({ onPrintRequest }) => {
  const [selectedSize, setSelectedSize] = useState<DeckSize>('12x12');
  const [showRailings, setShowRailings] = useState(false);
  const [activeTierFilter, setActiveTierFilter] = useState<TierType | 'All'>('All');
  const [selectedForComparison, setSelectedForComparison] = useState<string[]>([]);
  const [isComparisonOpen, setIsComparisonOpen] = useState(false);

  const railingCost = RAILING_PRICING_MATRIX[selectedSize];
  const filteredMaterials = useMemo(() => DECK_MATERIALS_MATRIX.filter(m => activeTierFilter === 'All' || m.tier === activeTierFilter), [activeTierFilter]);
  const selectedMaterials = useMemo(() => DECK_MATERIALS_MATRIX.filter(m => selectedForComparison.includes(m.id)), [selectedForComparison]);

  const toggleMaterialSelection = (id: string) => {
    setSelectedForComparison(prev => prev.includes(id) ? prev.filter(i => i !== id) : (prev.length < 4 ? [...prev, id] : prev));
  };

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <header className="bg-black border-b border-white/5 px-8 py-5 sticky top-0 z-40 shadow-2xl shrink-0">
        <div className="max-w-[1900px] mx-auto flex flex-col gap-5">
          <div className="flex justify-between items-center">
            <div><p className="text-[#ebc453] font-bold tracking-[0.4em] uppercase text-[10px] mb-1">Luxury Decking</p><h1 className="text-3xl font-black tracking-tighter uppercase italic">THE MATERIAL <span className="text-[#ebc453] font-light">MATRIX</span></h1></div>
            <div className="flex items-center gap-5">
              <div className="flex items-center bg-white/5 rounded-lg px-4 py-2 border border-white/10"><span className="text-xs font-bold text-[var(--text-tertiary)] mr-3 uppercase tracking-widest">Railings</span><button onClick={() => setShowRailings(!showRailings)} className={`relative w-11 h-6 rounded-full transition-all duration-300 ${showRailings ? 'bg-[#ebc453]' : 'bg-white/10'}`}><div className={`absolute top-1 left-1 bg-white w-4 h-4 rounded-full transition-transform duration-300 transform ${showRailings ? 'translate-x-5' : 'translate-x-0'}`}></div></button></div>
              <button disabled={selectedForComparison.length === 0} onClick={() => setIsComparisonOpen(true)} className={`px-6 py-2.5 rounded text-[11px] font-black uppercase tracking-widest transition-all ${selectedForComparison.length > 0 ? 'bg-[#ebc453] text-black shadow-xl hover:scale-105' : 'bg-white/5 text-[var(--text-tertiary)] border border-white/10 cursor-not-allowed'}`}>Compare ({selectedForComparison.length})</button>
              {selectedForComparison.length > 0 && <button onClick={() => setSelectedForComparison([])} className="text-[var(--text-tertiary)] hover:text-white font-bold uppercase text-[9px] tracking-widest">Reset</button>}
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-10 py-1">
            <div className="flex items-center gap-4"><span className="text-[9px] font-black text-[var(--text-tertiary)] uppercase tracking-[0.3em]">Size</span><div className="flex gap-1.5">{DECK_SIZES_MATRIX.map(s => <button key={s.value} onClick={() => setSelectedSize(s.value)} className={`px-4 py-1.5 rounded text-[11px] font-black transition-all border ${selectedSize === s.value ? 'bg-[#ebc453] text-black border-[#ebc453]' : 'bg-transparent text-[var(--text-tertiary)] border-white/5 hover:border-white/20'}`}>{s.label}</button>)}</div></div>
            <div className="flex items-center gap-4"><span className="text-[9px] font-black text-[var(--text-tertiary)] uppercase tracking-[0.3em]">Tier</span><div className="flex gap-1.5"><button onClick={() => setActiveTierFilter('All')} className={`px-4 py-1.5 rounded text-[11px] font-black transition-all border ${activeTierFilter === 'All' ? 'bg-white text-black' : 'bg-transparent text-[var(--text-tertiary)] border-white/5'}`}>ALL</button>{(Object.keys(TIER_CONFIG_MATRIX) as TierType[]).map(t => <button key={t} onClick={() => setActiveTierFilter(t)} className={`px-5 py-1.5 rounded text-[11px] font-black transition-all border flex items-center gap-2 ${activeTierFilter === t ? 'bg-white/10 border-[#ebc453] text-white' : 'bg-transparent text-[var(--text-tertiary)] border-white/5'}`}><SealBadge tier={t} size="sm" /> {TIER_CONFIG_MATRIX[t].label.toUpperCase()}</button>)}</div></div>
          </div>
        </div>
      </header>
      <main className="max-w-[1900px] mx-auto px-8 py-6 flex-1 overflow-y-auto w-full">
        <div className="mb-6 flex items-center justify-between border-l-2 border-[#ebc453] pl-5 bg-white/5 py-2.5 rounded-r">
          <div className="flex items-center gap-6"><span className="text-xs font-black text-white uppercase tracking-widest">{selectedSize} Footprint</span><span className="text-[10px] text-[var(--text-tertiary)] font-bold uppercase tracking-widest">Base Estimate • Helical Piles & 2 Steps Included</span></div>
          <p className="text-sm font-black text-[#ebc453] pr-5 uppercase tracking-[0.2em]">Add Railings: +${railingCost.toLocaleString()}</p>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-8 gap-4 pb-10">
          {filteredMaterials.map(m => (
            <MaterialCard 
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
      </main>
      {isComparisonOpen && (
        <ComparisonOverlay 
          materials={selectedMaterials} 
          size={selectedSize} 
          showRailings={showRailings} 
          railingCost={railingCost} 
          onClose={() => setIsComparisonOpen(false)} 
          onPrint={() => onPrintRequest(selectedMaterials, selectedSize, showRailings, 'compare')}
        />
      )}
    </div>
  );
};

// --- Pricing Computation (Pure Function) ---
//
// Extracted from the in-component useMemo so we can compute totals for any
// option snapshot (not just the active one). This lets the OptionTabs UI
// show live totals for every option without switching tabs. No behavior
// change — logic is identical to the original useMemo body.
export function computePricingSummary(
  dimensions: Dimensions,
  selections: CalculatorSelections,
  lightingQuantities: Record<string, number>,
  activePackage: PackageSelection | null
): PricingSummary {
  const impacts: PricingImpact[] = [];
  let subTotal = 0;

  const BASE_DECKING_ID = 'fiberon_goodlife_weekender';
  const BASE_RAILING_ID = 'pt_wood_railing';

  if (activePackage) {
    const pkgPrice = activePackage.withRailings
      ? PACKAGE_PRICING[activePackage.size].withRailing[activePackage.level]
      : PACKAGE_PRICING[activePackage.size].noRailing[activePackage.level];

    subTotal += pkgPrice;
    impacts.push({ label: `Showroom Package: ${activePackage.size} ${activePackage.level}`, value: pkgPrice });
  } else {
      const baseDeckingItem = PRICING_DATA.find(c => c.id === 'decking')?.options.find(o => o.id === BASE_DECKING_ID);
      const selectedDeckingItem = selections.decking;

      const baseDeckingTotal = dimensions.sqft * (BASE_SQFT_PRICE + (baseDeckingItem?.priceDelta || 0));
      const baseStepsTotal = dimensions.steps * (baseDeckingItem?.stepPrice || BASE_STEP_PRICE);
      const baseFasciaTotal = dimensions.fasciaLF * (baseDeckingItem?.fasciaPrice || COSTS.fasciaPerLF);
      const standardTotal = baseDeckingTotal + baseStepsTotal + baseFasciaTotal;

      subTotal += standardTotal;

      if (selectedDeckingItem && selectedDeckingItem.id !== BASE_DECKING_ID) {
         const selectedDeckingTotal = dimensions.sqft * (BASE_SQFT_PRICE + selectedDeckingItem.priceDelta);
         const selectedStepsTotal = dimensions.steps * (selectedDeckingItem.stepPrice || BASE_STEP_PRICE);
         const selectedFasciaTotal = dimensions.fasciaLF * (selectedDeckingItem.fasciaPrice || COSTS.fasciaPerLF);
         const upgradedTotal = selectedDeckingTotal + selectedStepsTotal + selectedFasciaTotal;

         const delta = upgradedTotal - standardTotal;
         subTotal += delta;
         impacts.push({ label: `Upgrade: ${selectedDeckingItem.name}`, value: delta });
      }

      let railingTotal = 0;
      const isPTDeck = selectedDeckingItem?.id === 'pt_wood_decking';
      const isCedarDeck = selectedDeckingItem?.id === 'cedar_decking';
      const baseRailPrice = isPTDeck ? BASE_RAILING_PRICE : (isCedarDeck ? BASE_CEDAR_RAILING_PRICE : 0);

      if (selections.railing) {
        if (selections.railing.calculationType === 'aluminum_component') {
            railingTotal = (dimensions.alumPosts * COSTS.alumPost) +
                           (dimensions.alumSection6 * COSTS.alum6) +
                           (dimensions.alumSection8 * COSTS.alum8) +
                           (dimensions.alumStair6 * COSTS.alumStair6) +
                           (dimensions.alumStair8 * COSTS.alumStair8);
        } else if (selections.railing.calculationType === 'aluminum_glass_component') {
            railingTotal = (dimensions.alumPosts * COSTS.alumPost) + (dimensions.glassSection6 * COSTS.glassSection6) + (dimensions.glassPanelsLF * COSTS.glassPanelsLF);
        } else if (selections.railing.calculationType === 'frameless_glass_component') {
            railingTotal = (dimensions.framelessSections * COSTS.framelessSection) + (dimensions.framelessLF * COSTS.framelessLF);
        } else if (selections.railing.calculationType === 'lump_sum') {
            railingTotal = selections.railing.priceDelta;
        } else {
            const currentPrice = BASE_RAILING_PRICE + selections.railing.priceDelta;
            railingTotal = dimensions.railingLF * currentPrice;
        }

        if (selections.railing.id !== BASE_RAILING_ID && railingTotal > 0) {
            const railQty = dimensions.railingLF > 0 ? ` (${dimensions.railingLF} LF)` : '';
            impacts.push({ label: `Railings: ${selections.railing.name}${railQty}`, value: railingTotal });
        }
      } else if (baseRailPrice > 0) {
        railingTotal = dimensions.railingLF * baseRailPrice;
      }
      subTotal += railingTotal;
  }

  const drinkRailItem = PRICING_DATA.find(c => c.id === 'railing')?.options.find(o => o.id === 'alum_drink_rail');
  const drinkRailTotal = (dimensions.drinkRailLF || 0) * (drinkRailItem?.priceDelta || 0);
  if (drinkRailTotal > 0) {
    subTotal += drinkRailTotal;
    impacts.push({ label: `AL13 Drink Rail (${dimensions.drinkRailLF} LF)`, value: drinkRailTotal });
  }

  const foundationOpt = selections.foundation;
  if (foundationOpt) {
    let foundationImpact = foundationOpt.priceDelta * dimensions.footingsCount;
    const pileCount = dimensions.footingsCount > 0 ? `${dimensions.footingsCount}x` : '';
    let label = pileCount ? `${foundationOpt.name} (${pileCount})` : foundationOpt.name;

    // Traditional footings require ledger prep unless Namifix is used
    if (dimensions.namiFixCount === 0 && ['sonotube', 'helical', 'pylex_screws'].includes(foundationOpt.id)) {
      const ledgerCost = dimensions.ledgerLF * COSTS.ledgerPerLF;
      foundationImpact += ledgerCost;
      label = pileCount
        ? `${foundationOpt.name} (${pileCount}, incl. Ledger Prep)`
        : `${foundationOpt.name} (incl. Ledger Prep)`;
    }

    if (foundationImpact > 0) {
      subTotal += foundationImpact;
      impacts.push({ label: label, value: foundationImpact });
    }
  }

  const namiFixItem = PRICING_DATA.find(c => c.id === 'foundation')?.options.find(o => o.id === 'nami_fix');
  const namiFixTotal = dimensions.namiFixCount * (namiFixItem?.priceDelta || 0);
  if (namiFixTotal > 0) {
    subTotal += namiFixTotal;
    impacts.push({ label: `Namifix-NP2 Brackets (x${dimensions.namiFixCount})`, value: namiFixTotal });
  }

  const framingPrice = selections.framing?.priceDelta || 0;
  const framingTotal = dimensions.sqft * framingPrice;
  if (framingTotal > 0) {
      subTotal += framingTotal;
      impacts.push({ label: `Framing Upgrade (${dimensions.sqft} sqft)`, value: framingTotal });
  }

  const skirtingTotal = dimensions.skirtingSqFt * (selections.skirting?.priceDelta || 0);
  if (skirtingTotal > 0) { subTotal += skirtingTotal; impacts.push({ label: `Skirting (${dimensions.skirtingSqFt} sqft)`, value: skirtingTotal }); }

  selections.privacy.forEach((p: PricingTier) => {
    let pTotal = 0;
    if (p.id === 'privacy_sunbelly_combined') {
       pTotal = (dimensions.privacyPosts * COSTS.privacyPost) + (dimensions.privacyScreens * COSTS.privacyScreen);
    } else {
       pTotal = dimensions.privacyLF * p.priceDelta;
    }
    if (pTotal > 0) { subTotal += pTotal; impacts.push({ label: p.name, value: pTotal }); }
  });

  const lightingCategory = PRICING_DATA.find(c => c.id === 'accessories');
  if (lightingCategory) {
    lightingCategory.options.forEach(opt => {
      const qty = lightingQuantities[opt.id] || 0;
      if (qty > 0) {
        const cost = qty * opt.priceDelta;
        subTotal += cost;
        impacts.push({ label: `${qty}x ${opt.name}`, value: cost });
      }
    });
  }

  if (selections.pergolas) { subTotal += selections.pergolas.priceDelta; impacts.push({ label: selections.pergolas.name, value: selections.pergolas.priceDelta }); }

  selections.extras.forEach((e: PricingTier) => {
    let cost = 0;
    if (e.calculationType === 'sqft_add') cost = e.priceDelta * dimensions.sqft;
    else if (e.calculationType === 'lf_border_add') cost = e.priceDelta * dimensions.borderLF;
    else if (e.calculationType === 'river_wash_sqft') cost = e.priceDelta * dimensions.riverWashSqFt;
    else if (e.calculationType === 'mulch_sqft') cost = e.priceDelta * dimensions.mulchSqFt;
    else if (e.calculationType === 'stepping_stones_qty') cost = e.priceDelta * dimensions.steppingStonesCount;
    else cost = e.priceDelta;

    if (cost > 0) { subTotal += cost; impacts.push({ label: e.name, value: cost }); }
  });

  const fixedSubTotal = subTotal;

  selections.design.forEach((d: PricingTier) => {
    if (d.calculationType === 'percentage') {
      const cost = fixedSubTotal * d.priceDelta;
      subTotal += cost;
      impacts.push({ label: d.name, value: cost });
    } else {
        subTotal += d.priceDelta; impacts.push({ label: d.name, value: d.priceDelta });
    }
  });

  selections.protection.forEach((p: PricingTier) => {
    if (p.calculationType === 'percentage') {
      const cost = fixedSubTotal * p.priceDelta;
      subTotal += cost;
      impacts.push({ label: p.name, value: cost });
    }
  });

  return { fixedSubTotal, subTotal, hst: subTotal * HST_RATE, finalTotal: subTotal * (1 + HST_RATE), monthly: Math.round(subTotal * FINANCING_FACTOR), impacts };
}

// --- App Root ---

export interface EstimatorCalculatorProps {
  /** Pre-fill dimensions from the field estimator's measure sheet */
  initialDimensions?: Partial<Dimensions>;
  /** Pre-fill client info from the job record */
  initialClientInfo?: { name: string; address: string };
  /** Restore previously saved selections (material/option choices) when reopening an estimate */
  initialSelections?: ReturnType<typeof getInitialSelections>;
  /** Called when a quote is accepted - passes all estimate data back to Field Pro */
  onEstimateAccepted?: (data: {
    clientName: string;
    clientAddress: string;
    estimateNumber: number;
    selections: CalculatorSelections;
    dimensions: Dimensions;
    pricingSummary: PricingSummary;
    activePackage: PackageSelection | null;
    /** All options for multi-option estimates. Each has its own pricing/dimensions. */
    allOptions?: Array<{
      id: string;
      name: string;
      selections: CalculatorSelections;
      dimensions: Dimensions;
      pricingSummary: PricingSummary;
      activePackage: PackageSelection | null;
    }>;
  }) => void;
  /** Called when user saves estimate and wants to send quote to client */
  onEstimateSaved?: (data: {
    clientName: string;
    clientAddress: string;
    estimateNumber: number;
    selections: CalculatorSelections;
    dimensions: Dimensions;
    pricingSummary: PricingSummary;
    activePackage: PackageSelection | null;
    allOptions?: Array<{
      id: string;
      name: string;
      selections: CalculatorSelections;
      dimensions: Dimensions;
      pricingSummary: PricingSummary;
      activePackage: PackageSelection | null;
    }>;
  }) => void;
  /** Called when user wants to exit back to Field Pro */
  onExit?: () => void;
}

const EstimatorCalculatorView: React.FC<EstimatorCalculatorProps> = ({ initialDimensions, initialClientInfo, initialSelections, onEstimateAccepted, onEstimateSaved, onExit }) => {
  const [view, setView] = useState<'calculator' | 'packages' | 'materialMatrix'>('calculator');

  // ── Multi-Option Estimate State ────────────────────────────────────────
  // Each estimate can have multiple option snapshots (A, B, C...) for the
  // same customer. Dimensions, selections, lighting, and activePackage are
  // per-option. Client info is shared across all options.
  const [options, setOptions] = useState<EstimateOptionSnapshot[]>(() => [{
    id: 'A',
    name: 'Option A',
    dimensions: { ...INITIAL_DIMENSIONS, ...(initialDimensions || {}) },
    selections: initialSelections ? { ...getInitialSelections(), ...initialSelections } : getInitialSelections(),
    lightingQuantities: {},
    activePackage: null,
  }]);
  const [activeOptionId, setActiveOptionId] = useState<string>('A');

  // Derived: the currently-active option snapshot
  const activeOption = options.find(o => o.id === activeOptionId) ?? options[0];

  // Facades matching the old single-state signatures — reads come from the
  // active option, writes update the active option in the options array.
  const calcDimensions = activeOption.dimensions;
  const calcSelections = activeOption.selections;
  const lightingQuantities = activeOption.lightingQuantities;
  const activePackage = activeOption.activePackage;

  const setCalcDimensions: React.Dispatch<React.SetStateAction<Dimensions>> = useCallback((updater) => {
    setOptions(opts => opts.map(o =>
      o.id === activeOptionId
        ? { ...o, dimensions: typeof updater === 'function' ? (updater as (p: Dimensions) => Dimensions)(o.dimensions) : updater }
        : o
    ));
  }, [activeOptionId]);

  const setCalcSelections: React.Dispatch<React.SetStateAction<CalculatorSelections>> = useCallback((updater) => {
    setOptions(opts => opts.map(o =>
      o.id === activeOptionId
        ? { ...o, selections: typeof updater === 'function' ? (updater as (p: CalculatorSelections) => CalculatorSelections)(o.selections) : updater }
        : o
    ));
  }, [activeOptionId]);

  const setLightingQuantities: React.Dispatch<React.SetStateAction<Record<string, number>>> = useCallback((updater) => {
    setOptions(opts => opts.map(o =>
      o.id === activeOptionId
        ? { ...o, lightingQuantities: typeof updater === 'function' ? (updater as (p: Record<string, number>) => Record<string, number>)(o.lightingQuantities) : updater }
        : o
    ));
  }, [activeOptionId]);

  const setActivePackage = useCallback((pkg: PackageSelection | null) => {
    setOptions(opts => opts.map(o =>
      o.id === activeOptionId ? { ...o, activePackage: pkg } : o
    ));
  }, [activeOptionId]);
  // ──────────────────────────────────────────────────────────────────────

  const [clientInfo, setClientInfo] = useState(initialClientInfo || {name:'', address:''});
  const [calcActiveCategory, setCalcActiveCategory] = useState<string>('decking');
  const [pkgSize, setPkgSize] = useState<PackageSize>('12X12');
  const [pkgRailing, setPkgRailing] = useState<boolean>(false);
  const [pkgUpgrades, setPkgUpgrades] = useState<Record<PackageLevel, Set<string>>>({ SILVER: new Set(), GOLD: new Set(), PLATINUM: new Set(), DIAMOND: new Set() });
  const [isFullScreen, setIsFullScreen] = useState<boolean>(false);
  const [docMode, setDocMode] = useState<'estimate' | 'agreement'>('estimate');
  const [estimateNumber, setEstimateNumber] = useState<number>(() => {
    const saved = localStorage.getItem('luxury_decking_estimate_count');
    return saved ? parseInt(saved) : 2601;
  });

  // Printing state
  const [matrixPrintData, setMatrixPrintData] = useState<{ materials: Material[], size: DeckSize, railings: boolean, mode: 'single' | 'compare' } | null>(null);
  const [packagesPrintData, setPackagesPrintData] = useState<{ size: PackageSize, railings: boolean } | null>(null);
useEffect(() => {
  const handleAfterPrint = () => {
    document.documentElement.removeAttribute('data-print');
  };
  window.addEventListener('afterprint', handleAfterPrint);
  return () => window.removeEventListener('afterprint', handleAfterPrint);
}, []);


  useEffect(() => {
    localStorage.setItem('luxury_decking_estimate_count', estimateNumber.toString());
  }, [estimateNumber]);

  useEffect(() => {
    const handleFsChange = () => setIsFullScreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', handleFsChange);
    return () => document.removeEventListener('fullscreenchange', handleFsChange);
  }, []);

  const toggleFullScreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(err => {
        console.error(`Error attempting to enable full-screen mode: ${err.message}`);
      });
    } else {
      document.exitFullscreen();
    }
  };

  useEffect(() => {
    const isPT = calcSelections.decking?.id === 'pt_wood_decking';
    const isCedar = calcSelections.decking?.id === 'cedar_decking';
    const isWoodRailing = calcSelections.railing?.id === 'pt_wood_railing' || calcSelections.railing?.id === 'cedar_railing';
    
    if (isPT) {
      if (!calcSelections.railing || calcSelections.railing.id === 'cedar_railing') {
        const ptRail = PRICING_DATA.find(c => c.id === 'railing')?.options.find(o => o.id === 'pt_wood_railing');
        if (ptRail) setCalcSelections(prev => ({ ...prev, railing: ptRail }));
      }
    } else if (isCedar) {
      if (!calcSelections.railing || calcSelections.railing.id === 'pt_wood_railing') {
        const cedarRail = PRICING_DATA.find(c => c.id === 'railing')?.options.find(o => o.id === 'cedar_railing');
        if (cedarRail) setCalcSelections(prev => ({ ...prev, railing: cedarRail }));
      }
    } else {
      if (isWoodRailing) setCalcSelections(prev => ({ ...prev, railing: null }));
    }
  }, [calcSelections.decking]);

  const pricingSummary = useMemo(
    () => computePricingSummary(calcDimensions, calcSelections, lightingQuantities, activePackage),
    [calcDimensions, calcSelections, lightingQuantities, activePackage]
  );

  // Compute finalTotal for every option so OptionTabs can show live totals
  // for all tabs (not just the active one). Pure derivation from `options`.
  const optionTotals = useMemo<Record<string, number>>(() => {
    const result: Record<string, number> = {};
    options.forEach(opt => {
      result[opt.id] = computePricingSummary(
        opt.dimensions,
        opt.selections,
        opt.lightingQuantities,
        opt.activePackage
      ).finalTotal;
    });
    return result;
  }, [options]);

  const resetCalculator = () => {
    if (confirm('Reset this estimate?')) {
      const nextNum = estimateNumber + 1;
      localStorage.setItem('luxury_decking_estimate_count', nextNum.toString());
      setEstimateNumber(nextNum);
      // Reset to a single fresh Option A
      setOptions([{
        id: 'A',
        name: 'Option A',
        dimensions: INITIAL_DIMENSIONS,
        selections: getInitialSelections(),
        lightingQuantities: {},
        activePackage: null,
      }]);
      setActiveOptionId('A');
      setClientInfo({name:'', address:''});
      setCalcActiveCategory('decking');
    }
  };

  // ── Multi-Option Handlers ──────────────────────────────────────────────
  /** Generate the next available option id: A, B, C, ..., Z, AA, AB, ... */
  const nextOptionId = (existing: EstimateOptionSnapshot[]): string => {
    const ids = new Set(existing.map(o => o.id));
    for (let i = 0; i < 26; i++) {
      const c = String.fromCharCode(65 + i);
      if (!ids.has(c)) return c;
    }
    // Fallback: AA, AB, ...
    for (let i = 0; i < 26; i++) {
      for (let j = 0; j < 26; j++) {
        const c = String.fromCharCode(65 + i) + String.fromCharCode(65 + j);
        if (!ids.has(c)) return c;
      }
    }
    return `X${Date.now()}`;
  };

  const handleAddOption = useCallback((mode: 'fresh' | 'duplicate') => {
    setOptions(opts => {
      const newId = nextOptionId(opts);
      const source = opts.find(o => o.id === activeOptionId) ?? opts[0];
      const newOption: EstimateOptionSnapshot = mode === 'duplicate'
        ? {
            id: newId,
            name: `Option ${newId}`,
            dimensions: { ...source.dimensions },
            selections: { ...source.selections },
            lightingQuantities: { ...source.lightingQuantities },
            activePackage: source.activePackage,
          }
        : {
            id: newId,
            name: `Option ${newId}`,
            dimensions: INITIAL_DIMENSIONS,
            selections: getInitialSelections(),
            lightingQuantities: {},
            activePackage: null,
          };
      setActiveOptionId(newId);
      return [...opts, newOption];
    });
  }, [activeOptionId]);

  const handleSelectOption = useCallback((id: string) => {
    setActiveOptionId(id);
  }, []);

  const handleRenameOption = useCallback((id: string, newName: string) => {
    setOptions(opts => opts.map(o =>
      o.id === id ? { ...o, name: newName } : o
    ));
  }, []);

  const handleDeleteOption = useCallback((id: string) => {
    setOptions(opts => {
      if (opts.length <= 1) return opts; // never delete the last option
      const filtered = opts.filter(o => o.id !== id);
      // If deleting the active option, switch to the first remaining
      if (activeOptionId === id) {
        setActiveOptionId(filtered[0].id);
      }
      return filtered;
    });
  }, [activeOptionId]);
  // ──────────────────────────────────────────────────────────────────────

const setPrintContext = (mode: 'estimate' | 'agreement' | 'matrix' | 'packages') => {
  document.documentElement.setAttribute('data-print', mode);
};

  const handleSaveEstimate = () => {
    let name = clientInfo.name;
    let address = clientInfo.address;

    if (!name.trim()) {
      const inputName = prompt("Enter Client Name for this estimate:");
      if (inputName === null) return;
      name = inputName;
    }

    if (!address.trim()) {
      const inputAddr = prompt("Enter Project Address for this estimate:");
      if (inputAddr === null) return;
      address = inputAddr;
    }

    setClientInfo({ name, address });

    // Build allOptions array — every option with its own computed pricing.
    // When there's only one option this is effectively the same as the single
    // top-level payload; when there are multiple, the consumer (useJobs) uses
    // this array to persist ALL options to the job's estimateData.
    const allOptions = options.map((opt) => ({
      id: opt.id,
      name: opt.name,
      selections: opt.selections,
      dimensions: opt.dimensions,
      pricingSummary: computePricingSummary(
        opt.dimensions,
        opt.selections,
        opt.lightingQuantities,
        opt.activePackage,
      ),
      activePackage: opt.activePackage,
    }));

    // Fire callback to save estimate data and send quote to client
    if (onEstimateSaved) {
      // Increment and persist BEFORE firing callback (callback may navigate away, unmounting component)
      const nextNumber = estimateNumber + 1;
      localStorage.setItem('luxury_decking_estimate_count', nextNumber.toString());
      setEstimateNumber(nextNumber);
      onEstimateSaved({
        clientName: name,
        clientAddress: address,
        estimateNumber,
        selections: calcSelections,
        dimensions: calcDimensions,
        pricingSummary,
        activePackage,
        allOptions,
      });
    } else {
      // Fallback: print PDF if no callback
      setDocMode('estimate');
      setPrintContext('estimate');
      document.title = `Luxury Decking Estimate - ${name}`;
      setTimeout(() => { window.print(); }, 150);
    }
  };

  const handleAcceptQuote = () => {
    let name = clientInfo.name;
    let address = clientInfo.address;

    if (!name.trim()) {
      const inputName = prompt("Enter Client Name for Agreement:");
      if (inputName === null) return;
      name = inputName;
    }
    if (!address.trim()) {
      const inputAddr = prompt("Enter Project Address for Agreement:");
      if (inputAddr === null) return;
      address = inputAddr;
    }
    setClientInfo({ name, address });

    // Same allOptions structure as handleSaveEstimate — lets the acceptance
    // flow preserve every option on the job, even if the customer will pick
    // just one to accept.
    const allOptions = options.map((opt) => ({
      id: opt.id,
      name: opt.name,
      selections: opt.selections,
      dimensions: opt.dimensions,
      pricingSummary: computePricingSummary(
        opt.dimensions,
        opt.selections,
        opt.lightingQuantities,
        opt.activePackage,
      ),
      activePackage: opt.activePackage,
    }));

    // Fire callback to open AcceptanceModal in Field Pro
    if (onEstimateAccepted) {
      onEstimateAccepted({
        clientName: name,
        clientAddress: address,
        estimateNumber,
        selections: calcSelections,
        dimensions: calcDimensions,
        pricingSummary,
        activePackage,
        allOptions,
      });
    }
  };

  const handleMatrixPrint = (materials: Material[], size: DeckSize, railings: boolean, mode: 'single' | 'compare') => {
    setMatrixPrintData({ materials, size, railings, mode });
    setPrintContext('matrix');
    document.title = mode === 'single' ? `Luxury Decking Material Quote - ${materials[0].name}` : `Luxury Decking Material Comparison - ${size}`;
    setTimeout(() => {
      window.print();
    }, 100);
  };

  const handlePackagePrint = (size: PackageSize, railings: boolean) => {
    setPackagesPrintData({ size, railings });
    setPrintContext('packages');
    document.title = `Luxury Decking Package Comparison - ${size}`;
    setTimeout(() => {
      window.print();
    }, 100);
  };

  const inferQtyFromLabel = (label: string): string => {
    if (!label) return '';

    // 1) Explicit qty patterns embedded in the label
    const parenXMatch = label.match(/\(x\s*(\d+)\)/i);
    if (parenXMatch) return `${parenXMatch[1]}`;

    const leadingXMatch = label.match(/^\s*(\d+)\s*x\b/i);
    if (leadingXMatch) return `${leadingXMatch[1]}`;

    const lfMatch = label.match(/(\d+(?:\.\d+)?)\s*LF/i);
    if (lfMatch) return `${lfMatch[1]} LF`;

    const sqftMatch = label.match(/(\d+(?:\.\d+)?)\s*(?:SQ\s*FT|SQFT|SQUARE\s*FEET)/i);
    if (sqftMatch) return `${sqftMatch[1]} sq ft`;

    const qtyMatch = label.match(/(\d+)\s*Qty/i);
    if (qtyMatch) return `${qtyMatch[1]}`;

    // 2) Smart fallbacks based on the current estimate inputs
    const norm = label.toLowerCase();

    // Decking system / framing upgrades are driven by square footage
    if (norm.startsWith('upgrade:')) return calcDimensions.sqft ? `${calcDimensions.sqft} sq ft` : '';
    if (norm.includes('framing upgrade')) return calcDimensions.sqft ? `${calcDimensions.sqft} sq ft` : '';

    // Railings are driven by railing linear feet (even when priced by components)
    if (norm.startsWith('railings:')) return calcDimensions.railingLF ? `${calcDimensions.railingLF} LF` : '1';

    // Foundations are driven by the number of footings
    if (norm.includes('helical') || norm.includes('sonotube') || norm.includes('ground screw') || norm.includes('pylex') || norm.includes('concrete footing')) {
      return calcDimensions.footingsCount ? `${calcDimensions.footingsCount}` : '1';
    }

    // Skirting is driven by skirting square footage
    if (norm === 'skirting' || norm.includes('skirting')) return calcDimensions.skirtingSqFt ? `${Math.round(calcDimensions.skirtingSqFt)} sq ft` : '1';

    // Joist/Protection items are typically applied across the build; use project sqft as a helpful qty
    if (norm.includes('joist') && norm.includes('protection')) return calcDimensions.sqft ? `${calcDimensions.sqft} sq ft` : '1';

    // Common lump-sum lines
    if (norm.includes('removal') || norm.includes('disposal') || norm.includes('permit package') || norm.includes('workmanship')) return '1';

    // Extras that are area/linear based (best-effort)
    if (norm.includes('border')) return calcDimensions.borderLF ? `${calcDimensions.borderLF} LF` : '1';
    if (norm.includes('mulch')) return calcDimensions.mulchSqFt ? `${Math.round(calcDimensions.mulchSqFt)} sq ft` : '1';
    if (norm.includes('river wash')) return calcDimensions.riverWashSqFt ? `${Math.round(calcDimensions.riverWashSqFt)} sq ft` : '1';
    if (norm.includes('stepping stone')) return calcDimensions.steppingStonesCount ? `${calcDimensions.steppingStonesCount}` : '1';

    return '1';
  };

  return (
    <div className="estimator-calculator-root">
      <style dangerouslySetInnerHTML={{ __html: STYLES }} />
      {/* Showroom views (calculator + materialMatrix) render their own shared
          top nav. Packages still uses the legacy main-nav. */}
      {view !== 'calculator' && view !== 'materialMatrix' && (
        <div className="main-nav">
          {onExit && (
            <button className="nav-btn" onClick={onExit} style={{ marginRight: 'auto', borderColor: '#c0392b', color: '#e74c3c' }}>
              ← Back to Field Pro
            </button>
          )}
          <button className={`nav-btn ${view === 'calculator' ? 'active' : ''}`} onClick={() => setView('calculator')}>Estimator</button>
          <button className={`nav-btn ${view === 'packages' ? 'active' : ''}`} onClick={() => setView('packages')}>Showroom Packages</button>
          <button className={`nav-btn ${view === 'materialMatrix' ? 'active' : ''}`} onClick={() => setView('materialMatrix')}>Material Matrix</button>

          <button className="fullscreen-toggle" onClick={toggleFullScreen} title={isFullScreen ? "Exit Fullscreen" : "Enter Fullscreen"}>
            {isFullScreen ? (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M8 3v3a2 2 0 0 1-2 2H3m18 0h-3a2 2 0 0 1-2-2V3m0 18v-3a2 2 0 0 1 2-2h3M3 16h3a2 2 0 0 1 2 2v3"/></svg>
            ) : (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7"/></svg>
            )}
          </button>
        </div>
      )}

      <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        {view === 'materialMatrix' && (
          <MaterialMatrixShowroom
            onPrintRequest={handleMatrixPrint}
            onExit={onExit}
            view={view}
            setView={setView}
            isFullScreen={isFullScreen}
            toggleFullScreen={toggleFullScreen}
          />
        )}
        {/* Legacy rollback: keep StandaloneMaterialMatrix reachable as dead code
            in case the new Material Matrix Showroom needs to be reverted fast. */}
        {false && <StandaloneMaterialMatrix onPrintRequest={handleMatrixPrint} />}
        {view === 'calculator' && (
          <EstimatorShowroomView
            dimensions={calcDimensions}
            setDimensions={setCalcDimensions}
            selections={calcSelections}
            setSelections={setCalcSelections}
            lightingQuantities={lightingQuantities}
            setLightingQuantities={setLightingQuantities}
            clientInfo={clientInfo}
            setClientInfo={setClientInfo}
            activeCategory={calcActiveCategory}
            setActiveCategory={setCalcActiveCategory}
            resetCalculator={resetCalculator}
            onSave={handleSaveEstimate}
            onAccept={handleAcceptQuote}
            pricingSummary={pricingSummary}
            estimateNumber={estimateNumber}
            activePackage={activePackage}
            setActivePackage={setActivePackage}
            onExit={onExit}
            view={view}
            setView={setView}
            isFullScreen={isFullScreen}
            toggleFullScreen={toggleFullScreen}
            options={options}
            activeOptionId={activeOptionId}
            onSelectOption={handleSelectOption}
            onAddOption={handleAddOption}
            onRenameOption={handleRenameOption}
            onDeleteOption={handleDeleteOption}
            optionTotals={optionTotals}
          />
        )}
        {view === 'packages' && (
          <PackageShowcase 
            size={pkgSize} 
            setSize={setPkgSize} 
            railing={pkgRailing} 
            setRailing={setPkgRailing} 
            selectedUpgrades={pkgUpgrades} 
            setSelectedUpgrades={setPkgUpgrades} 
            onPrint={() => handlePackagePrint(pkgSize, pkgRailing)}
          />
        )}
      </div>
      
      {/* Printable Area - Main Estimator / Agreement */}
      <div id="printable-quote">
        {docMode === 'agreement' ? (
          <div className="contract-body">
            <div className="contract-header">
              <Logo />
              <div className="contract-title">Deck Installation Agreement</div>
            </div>
            
            <div className="contract-clause">
              This Deck Installation Agreement (“Agreement”) is entered into between Luxury Decking (“Contractor”) and <span className="contract-bold">{clientInfo.name || '{{Client Full Name}}'}</span> (“Homeowner”) for the property located at <span className="contract-bold">{clientInfo.address || '{{Property Address}}'}</span>.
            </div>

            <div className="contract-section">
              <h2>Project Details</h2>
              <div className="contract-clause">
                <span className="contract-bold">Scope of Work</span><br/>
                The parties agree that the project entails the construction of a new deck at the property listed above. The full scope of work is defined exclusively by the accepted Luxury Decking estimate <span className="contract-bold">#{estimateNumber}</span>, including but not limited to project dimensions, materials, foundations, framing, decking, railings, stairs, and any selected upgrades.
              </div>
              <div className="contract-clause">
                <span className="contract-bold">Estimate Reference</span><br/>
                The accepted estimate forms an integral part of this Agreement and governs all pricing, inclusions, specifications, and assumptions.
              </div>
            </div>

            <div className="contract-section">
              <h2>Extras and Change Orders</h2>
              <div className="contract-clause">
                Any work, materials, or services not explicitly included in the accepted estimate shall be considered extras. All extras must be approved in writing by the Homeowner prior to commencement. Pricing for extras will be agreed upon before the additional work proceeds.
              </div>
              <div className="contract-clause">
                Payment for approved extras is due upon completion of the extra work unless otherwise agreed in writing.
              </div>
            </div>

            <div className="contract-section">
              <h2>Payment Schedule</h2>
              <div className="contract-clause">
                The Homeowner agrees to the following payment structure:
                <ul>
                  <li><span className="contract-bold">30% deposit</span> due upon acceptance of this Agreement</li>
                  <li><span className="contract-bold">30% payment</span> due upon material delivery to the site</li>
                  <li><span className="contract-bold">40% final payment</span> due upon substantial completion of the project</li>
                </ul>
              </div>
            </div>

            <div className="contract-section">
              <h2>Project Schedule, Site Access, and Working Hours</h2>
              <div className="contract-clause">
                The Contractor will provide an anticipated start window once materials are confirmed and the deposit has been received. Start dates are subject to weather, supplier lead times, site readiness, and crew availability.
              </div>
              <div className="contract-clause">
                The Homeowner agrees to provide clear access to the work area, including access through gates, side yards, and driveways as required. Vehicles, furniture, and personal items within the work zone must be removed prior to the start date.
              </div>
              <div className="contract-clause">
                Normal working hours are Monday to Saturday, 8:00 a.m. to 6:00 p.m., unless otherwise required due to weather or scheduling constraints.
              </div>
            </div>

            <div className="contract-section">
              <h2>Permits, Locates, and Inspections</h2>
              <div className="contract-clause">
                If permits or engineered drawings are required, responsibilities and costs will be as outlined in the accepted estimate. The Homeowner authorizes the Contractor to coordinate with the municipality and inspectors as needed.
              </div>
              <div className="contract-clause">
                Where applicable, utility locates must be completed prior to ground disturbance. If utility locates are not complete, the start date may be delayed without penalty to the Contractor.
              </div>
              <div className="contract-clause">
                Inspection timing is dependent on municipal availability. Delays caused by inspector scheduling do not constitute a breach of this Agreement.
              </div>
            </div>

            <div className="contract-section">
              <h2>Site Conditions and Unforeseen Work</h2>
              <div className="contract-clause">
                Pricing is based on typical site conditions. If hidden conditions are discovered (including but not limited to buried debris, unexpected soil conditions, rot, structural deficiencies, or concealed utilities), the Contractor will notify the Homeowner and provide a change order for approval.
              </div>
              <div className="contract-clause">
                The Homeowner acknowledges that construction may reveal conditions not visible during the initial consultation.
              </div>
            </div>

            <div className="contract-section">
              <h2>Weather, Delays, and Force Majeure</h2>
              <div className="contract-clause">
                Outdoor construction is weather-dependent. Rain, extreme temperatures, high winds, and other unsafe conditions may require schedule changes. The Contractor will make reasonable efforts to communicate schedule adjustments promptly.
              </div>
              <div className="contract-clause">
                The Contractor is not liable for delays caused by events beyond its reasonable control, including supplier backorders, labour disruptions, acts of God, or municipal delays.
              </div>
            </div>

            {/* Removed forced page break here to avoid Payment Policy being isolated on its own page when printing */}
            <div className="contract-section">
              <h2>Payment Policy</h2>
              <div className="contract-clause">
                Invoices are due within five (5) calendar days of receipt.
              </div>
              <div className="contract-clause">
                Any overdue balance is subject to:
                <ul>
                  <li>A 10% late payment fee after the due date</li>
                  <li>Interest at 4% per month, calculated daily, on unpaid balances exceeding $1,000 until paid in full</li>
                </ul>
              </div>
              <div className="contract-clause">
                Failure to remit payment in accordance with this policy constitutes a material breach of this Agreement.
              </div>
            </div>

            {/* Allow natural pagination between sections to reduce large white gaps */}
            <div className="contract-section">
              <h2>Warranty</h2>
              <div className="contract-clause">
                Luxury Decking provides a five (5) year workmanship warranty on labour. Manufacturer warranties on materials apply separately and are subject to the terms provided by the manufacturer.
              </div>
            </div>

            <div className="contract-section">
              <h2>Material Ownership</h2>
              <div className="contract-clause">
                All materials supplied for the project remain the property of the Contractor until payment is made in full. In the event of non-payment, the Contractor reserves the right to recover materials unless otherwise agreed in writing.
              </div>
            </div>

            <div className="contract-section">
              <h2>Jobsite Conditions and Property Damage</h2>
              <div className="contract-clause">
                The Homeowner acknowledges that minor disturbance to landscaping, lawn areas, or surrounding property may occur during construction. The Contractor will make reasonable efforts to minimize disruption but shall not be responsible for minor, unavoidable damage inherent to construction activities.
              </div>
            </div>

            <div className="contract-section">
              <h2>Jobsite Maintenance</h2>
              <div className="contract-clause">
                The Contractor will maintain the jobsite in a clean, neat, and orderly condition during construction and will remove construction debris upon project completion.
              </div>
            </div>

            <div className="contract-section">
              <h2>Governing Law</h2>
              <div className="contract-clause">
                This Agreement shall be governed by and interpreted in accordance with the laws of the Province of Ontario. Any disputes arising from this Agreement shall be resolved within Ontario jurisdiction.
              </div>
            </div>

            <div className="contract-section">
              <h2>Insurance and Safety</h2>
              <div className="contract-clause">
                The Contractor carries standard business liability coverage and will maintain reasonable safety measures on the jobsite. The Homeowner agrees to keep children and pets away from the work area during construction.
              </div>
              <div className="contract-clause">
                The Homeowner acknowledges that temporary hazards may exist during construction (including open excavations, tools, and materials).
              </div>
            </div>

            <div className="contract-section">
              <h2>Photos and Marketing</h2>
              <div className="contract-clause">
                The Contractor may take progress and completion photos for quality control and warranty documentation. With the Homeowner’s permission, non-identifying photos may be used for portfolio and marketing purposes.
              </div>
            </div>

            <div className="contract-section">
              <h2>Entire Agreement</h2>
              <div className="contract-clause">
                This Agreement, together with the accepted estimate, constitutes the entire agreement between the parties and supersedes all prior discussions, representations, or agreements, whether written or oral. Any amendments must be made in writing and agreed upon by both parties.
              </div>
            </div>

            <div className="page-break" />
            <div className="acceptance-box">
              <h3>Acceptance Summary</h3>
              <div className="contract-clause">This agreement reflects the estimate reviewed and accepted with Luxury Decking</div>
              <div className="contract-clause"><span className="contract-bold">Total Project Price:</span> ${Math.round(pricingSummary.finalTotal).toLocaleString()} (HST included)</div>
              <div className="contract-clause"><span className="contract-bold">Deposit Required:</span> 30% upon acceptance</div>
              <div className="contract-clause">Extras require written approval</div>
              <div className="contract-clause">This agreement is governed by Ontario law</div>
              <div className="contract-clause" style={{marginTop:'15px', fontStyle:'italic'}}>By accepting this quote, the Homeowner authorizes Luxury Decking to proceed with the project as outlined above.</div>
            </div>

            <div className="contract-section" style={{marginTop: '40px'}}>
              <div style={{display: 'flex', gap: '50px'}}>
                <div style={{flex: 1}}>
                  <div className="print-label">Homeowner Name</div>
                  <div style={{fontSize: '1.1rem', fontWeight: 900, borderBottom: '1px solid #000', padding: '5px 0'}}>{clientInfo.name || '__________________________'}</div>
                </div>
                <div style={{flex: 1}}>
                  <div className="print-label">Signature</div>
                  <div style={{fontSize: '1.1rem', fontWeight: 900, borderBottom: '1px solid #000', padding: '5px 0', color: 'transparent'}}>Signature Space</div>
                </div>
                <div style={{flex: 1}}>
                  <div className="print-label">Date</div>
                  <div style={{fontSize: '1.1rem', fontWeight: 900, borderBottom: '1px solid #000', padding: '5px 0'}}>{new Date().toLocaleDateString()}</div>
                </div>
              </div>
              <div style={{marginTop: '20px', fontSize: '0.8rem', color: '#666'}}>
                Estimate Reference: <span className="contract-bold">#{estimateNumber}</span>
              </div>
            </div>
          </div>
        ) : (
          <>
            <div className="print-biz-header">
              <Logo />
              <div className="print-biz-info">
                <div style={{fontWeight:800, color:'#000', fontSize:'1rem'}}>{BUSINESS_INFO.name}</div>
                {BUSINESS_INFO.address ? <div>{BUSINESS_INFO.address}</div> : null}
                <div>{BUSINESS_INFO.phone} | {BUSINESS_INFO.email}</div>
                <div>{BUSINESS_INFO.website}</div>
              </div>
            </div>
            <div className="print-quote-id"><div><div className="print-label">Prepared For</div><div style={{fontSize:'1.2rem', fontWeight:900}}>{clientInfo.name || 'Valued Client'}</div><div>{clientInfo.address || 'Project Location'}</div></div><div style={{textAlign:'right'}}><div className="print-label">Estimate Details</div><div>Date: <strong>{new Date().toLocaleDateString()}</strong></div><div>Estimate #: <strong>#{estimateNumber}</strong></div></div></div>
            <div className="print-section-title">Itemized Scope of Work</div>
            <table className="print-table">
              <thead>
                <tr>
                  <th style={{width:'140px'}}>Quantity</th>
                  <th>Description</th>
                  <th style={{textAlign:'right'}}>Amount</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>{calcDimensions.sqft ? `${calcDimensions.sqft} sq ft` : ''}</td>
                  <td>{activePackage ? `${activePackage.size} ${activePackage.level} Package` : `${calcSelections.decking?.name || 'Standard Wood'} Custom Build`}</td>
                  <td style={{textAlign:'right'}}>${Math.round(pricingSummary.fixedSubTotal).toLocaleString()}</td>
                </tr>
                {pricingSummary.impacts
                  .filter((imp: PricingImpact) => Math.round(imp.value) !== 0)
                  .map((imp: PricingImpact, idx: number) => (
                    <tr key={idx}>
                      <td>{inferQtyFromLabel(imp.label)}</td>
                      <td>{imp.label}</td>
                      <td style={{textAlign:'right'}}>
                        {imp.value < 0 ? '-' : ''}${Math.round(Math.abs(imp.value)).toLocaleString()}
                      </td>
                    </tr>
                ))}
              </tbody>
            </table>
            <div className="print-section-title">Investment Summary & Payment Terms</div>
            <div className="print-summary-box"><div className="print-payment-schedule"><div style={{fontWeight:800, fontSize:'0.75rem', marginBottom:'10px', textTransform:'uppercase'}}>Structured Payment Schedule</div><div style={{display:'flex', justifySelf:'stretch', justifyContent:'space-between', padding:'5px 0', borderBottom:'1px dashed #eee', width:'100%'}}><span>Deposit / Retainer (30%)</span><span style={{fontWeight:700}}>${Math.round(pricingSummary.finalTotal * 0.3).toLocaleString()}</span></div><div style={{display:'flex', justifySelf:'stretch', justifyContent:'space-between', padding:'5px 0', borderBottom:'1px dashed #eee', width:'100%'}}><span>Upon material delivery (30%)</span><span style={{fontWeight:700}}>${Math.round(pricingSummary.finalTotal * 0.3).toLocaleString()}</span></div><div style={{display:'flex', justifySelf:'stretch', justifyContent:'space-between', padding:'5px 0', width:'100%'}}><span>Final handover / completion (40%)</span><span style={{fontWeight:700}}>${Math.round(pricingSummary.finalTotal * 0.4).toLocaleString()}</span></div></div><div className="print-totals-list"><div className="print-total-row"><span>Project Subtotal:</span><span>${Math.round(pricingSummary.subTotal).toLocaleString()}</span></div><div className="print-total-row"><span>HST (13%):</span><span>${Math.round(pricingSummary.hst).toLocaleString()}</span></div><div className="print-total-row grand"><span>Total Investment:</span><span>${Math.round(pricingSummary.finalTotal).toLocaleString()}</span></div><div style={{textAlign:'right', marginTop:'10px'}}><div style={{fontSize:'0.8rem', color:'#3498db', fontWeight:800}}>Estimated Financing: ${pricingSummary.monthly}/mo O.A.C</div></div></div></div>
            
            <div className="print-footer">
              <p>This estimate is based on preliminary measurements and current market material pricing. Final price subject to site survey, engineering requirements, and municipal permit fees. Quote valid for 30 days. Workmanship guaranteed for 5 years. This document is for estimation purposes only and does not constitute a legal contract until converted to a work order.</p>
            </div>
            <div className="print-sig-block"><div className="print-sig-line">Client Authorization Signature</div><div className="print-sig-line">Luxury Decking Representative</div></div>
          </>
        )}
      </div>

      {/* Printable Area - Matrix / Comparison */}
      {matrixPrintData && (
        <div id="printable-matrix-quote">
           <div className="print-biz-header">
             <Logo />
             <div className="print-biz-info">
               <div style={{fontWeight:800, color:'#000', fontSize:'1rem'}}>{BUSINESS_INFO.name}</div>
               {BUSINESS_INFO.address ? <div>{BUSINESS_INFO.address}</div> : null}
               <div>{BUSINESS_INFO.phone} | {BUSINESS_INFO.email}</div>
               <div>{BUSINESS_INFO.website}</div>
             </div>
           </div>
           <div className="print-quote-id">
              <div>
                <div className="print-label">{matrixPrintData.mode === 'single' ? 'MATERIAL SPECIFIC ESTIMATE' : 'MATERIAL COMPARISON SHEET'}</div>
                <div style={{fontSize:'1.2rem', fontWeight:900}}>{matrixPrintData.size} Project Footprint</div>
                <div>{matrixPrintData.railings ? 'Includes Standard Safety Railings' : 'Surface Only (No Railings)'}</div>
              </div>
              <div style={{textAlign:'right'}}>
                <div className="print-label">{matrixPrintData.mode === 'single' ? 'Consultation Quote' : 'Comparison Document'}</div>
                <div>Date: <strong>{new Date().toLocaleDateString()}</strong></div>
                <div>ID: <strong>#M-{estimateNumber}</strong></div>
              </div>
           </div>

           <div className="print-section-title">Standard Features Included</div>
           <div className="print-grid" style={{gridTemplateColumns: 'repeat(3, 1fr)'}}>
              <div className="print-data-item"><span className="print-label">Foundation</span><span className="print-value">Helical Piles (Included)</span></div>
              <div className="print-data-item"><span className="print-label">Steps</span><span className="print-value">2 Standard Steps (Included)</span></div>
              <div className="print-data-item"><span className="print-label">Service</span><span className="print-value">Professional Installation</span></div>
           </div>

           {matrixPrintData.mode === 'single' ? (
             <div style={{marginTop: '20px'}}>
               <div className="print-section-title">Selected Material System</div>
               {matrixPrintData.materials.map(m => {
                 const base = m.basePricing[matrixPrintData.size];
                 const subTotal = matrixPrintData.railings ? base + RAILING_PRICING_MATRIX[matrixPrintData.size] : base;
                 const hst = subTotal * 0.13;
                 const grandTotal = subTotal + hst;
                 const monthly = Math.round(subTotal * FINANCING_FACTOR);

                 return (
                   <div key={m.id}>
                     <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', border:'1px solid #eee', padding:'20px', borderRadius:'8px', background:'#fcfcfc', marginBottom:'30px'}}>
                        <div>
                          <div style={{fontSize:'0.75rem', fontWeight:800, color:'var(--gold)', textTransform:'uppercase'}}>{m.brand}</div>
                          <div style={{fontSize:'1.4rem', fontWeight:900}}>{m.name}</div>
                          <div style={{fontSize:'0.8rem', color:'#666', marginTop:'4px'}}>{m.materialType} | {m.warranty} Warranty</div>
                        </div>
                        <div style={{textAlign:'right'}}>
                          <div style={{fontSize:'2rem', fontWeight:900}}>${subTotal.toLocaleString()}</div>
                          <div style={{fontSize:'0.7rem', color:'#888', textTransform:'uppercase', fontWeight:700}}>Base Project Investment</div>
                        </div>
                     </div>

                     <div className="print-summary-box">
                       <div className="print-payment-schedule">
                         <div style={{fontWeight:800, fontSize:'0.75rem', marginBottom:'10px', textTransform:'uppercase'}}>Why choose {m.name}?</div>
                         <p style={{fontSize:'0.75rem', color:'#555', lineHeight:'1.5', fontStyle:'italic'}}>"{m.description}"</p>
                         <div style={{marginTop:'20px', padding:'15px', border:'1px dashed #ddd', borderRadius:'8px'}}>
                           <div style={{fontSize:'0.65rem', fontWeight:900, textTransform:'uppercase', marginBottom:'8px'}}>Performance Grade</div>
                           <div style={{display:'flex', alignItems:'center', gap:'10px'}}>
                              <SealBadge tier={m.tier} size="md" />
                              <div style={{fontSize:'0.75rem', fontWeight:700}}>This material is rated as part of our elite <span style={{color:'var(--gold)'}}>{m.tier} Collection</span>.</div>
                           </div>
                         </div>
                       </div>
                       <div className="print-totals-list">
                         <div className="print-total-row"><span>Project Subtotal:</span><span>${Math.round(subTotal).toLocaleString()}</span></div>
                         <div className="print-total-row"><span>HST (13%):</span><span>${Math.round(hst).toLocaleString()}</span></div>
                         <div className="print-total-row grand"><span>Total Investment:</span><span>${Math.round(grandTotal).toLocaleString()}</span></div>
                         <div style={{textAlign:'right', marginTop:'15px'}}>
                           <div style={{fontSize:'1rem', color:'#3498db', fontWeight:900}}>${monthly}/mo</div>
                           <div style={{fontSize:'0.6rem', color:'#888', fontWeight:700, textTransform:'uppercase'}}>Estimated Financing O.A.C</div>
                         </div>
                       </div>
                     </div>
                   </div>
                 );
               })}
             </div>
           ) : (
             <div style={{marginTop: '20px'}}>
               <div className="print-section-title">Project Investment Comparison</div>
               <div style={{display:'grid', gridTemplateColumns:`repeat(${matrixPrintData.materials.length}, 1fr)`, gap:'20px'}}>
                  {matrixPrintData.materials.map(m => {
                    const base = m.basePricing[matrixPrintData.size];
                    const subTotal = matrixPrintData.railings ? base + RAILING_PRICING_MATRIX[matrixPrintData.size] : base;
                    const hst = subTotal * 0.13;
                    const grandTotal = subTotal + hst;
                    const monthly = Math.round(subTotal * FINANCING_FACTOR);

                    return (
                      <div key={m.id} style={{border:'1px solid #eee', borderRadius:'8px', overflow:'hidden', display:'flex', flexDirection:'column'}}>
                        <div style={{background:'#f8f8f8', padding:'12px', textAlign:'center', borderBottom:'1px solid #eee'}}>
                           <div style={{fontSize:'0.6rem', fontWeight:800, color:'var(--gold)', textTransform:'uppercase'}}>{m.brand}</div>
                           <div style={{fontSize:'0.9rem', fontWeight:900, minHeight:'2.4em', display:'flex', alignItems:'center', justifyContent:'center'}}>{m.name}</div>
                        </div>
                        <div style={{padding:'15px', flex:1, fontSize:'0.7rem'}}>
                           <div style={{marginBottom:'10px'}}><strong>Deck Size:</strong> {matrixPrintData.size} Footprint</div>
                           <div style={{marginBottom:'10px', minHeight:'60px'}}><strong>Specifications:</strong><br/>{m.materialType}<br/>{m.warranty} Warranty</div>
                           <div style={{marginBottom:'15px', padding:'10px', background:'#fafafa', borderRadius:'4px'}}>
                              <strong>Included:</strong><br/>
                              • Helical Piles<br/>
                              • 2 Steps & Fascia<br/>
                              • {matrixPrintData.railings ? 'Safety Railings' : 'Surface Only'}<br/>
                              • Pro Installation
                           </div>
                           <div style={{marginTop:'auto', borderTop:'1px solid #eee', paddingTop:'10px'}}>
                              <div style={{display:'flex', justifyContent:'space-between', marginBottom:'4px'}}><span>Subtotal:</span><span>${Math.round(subTotal).toLocaleString()}</span></div>
                              <div style={{display:'flex', justifyContent:'space-between', marginBottom:'8px'}}><span>HST:</span><span>${Math.round(hst).toLocaleString()}</span></div>
                              <div style={{fontSize:'1.1rem', fontWeight:900, textAlign:'center', borderTop:'2px solid #000', paddingTop:'8px', marginBottom:'4px'}}>${Math.round(grandTotal).toLocaleString()}</div>
                              <div style={{fontSize:'0.8rem', color:'#3498db', fontWeight:800, textAlign:'center'}}>${monthly}/mo O.A.C</div>
                           </div>
                        </div>
                      </div>
                    );
                  })}
               </div>
               <div style={{marginTop: '30px', padding: '15px', background: '#f9f9f9', border: '1px solid #eee', borderRadius: '5px'}}>
                  <div className="print-label" style={{marginBottom: '5px'}}>Comparison Note</div>
                  <p style={{fontSize: '0.7rem', color: '#666', lineHeight: '1.4'}}>This comparison helps evaluate the aesthetic and performance trade-offs for your {matrixPrintData.size} deck. Tier ratings indicate variations in material density, fade resistance, and texture realism.</p>
               </div>
             </div>
           )}

           <div className="print-footer" style={{marginTop: '50px'}}>
              <p>This document is for consultation and decision-making purposes only. Prices are based on standard configurations and subject to site survey and engineering. Valid for 30 days. Financing is available O.A.C.</p>
           </div>
           <div className="print-sig-block">
              <div className="print-sig-line">Client Review Signature</div>
              <div className="print-sig-line">Sales Consultant Signature</div>
           </div>
        </div>
      )}

      {/* Printable Area - Showroom Packages */}
      {packagesPrintData && (
        <div id="printable-packages-quote">
           <div className="print-biz-header">
             <Logo />
             <div className="print-biz-info">
               <div style={{fontWeight:800, color:'#000', fontSize:'1rem'}}>{BUSINESS_INFO.name}</div>
               {BUSINESS_INFO.address ? <div>{BUSINESS_INFO.address}</div> : null}
               <div>{BUSINESS_INFO.phone} | {BUSINESS_INFO.email}</div>
               <div>{BUSINESS_INFO.website}</div>
             </div>
           </div>
           <div className="print-quote-id">
              <div>
                <div className="print-label">PACKAGE COMPARISON SHEET</div>
                <div style={{fontSize:'1.2rem', fontWeight:900}}>{packagesPrintData.size} Series Comparison</div>
                <div>{packagesPrintData.railings ? 'Includes Standard Safety Railings' : 'Surface Only (No Railings)'}</div>
              </div>
              <div style={{textAlign:'right'}}>
                <div className="print-label">Project Consultation</div>
                <div>Date: <strong>{new Date().toLocaleDateString()}</strong></div>
                <div>ID: <strong>#PC-{estimateNumber}</strong></div>
              </div>
           </div>

           <div className="print-section-title">Package Comparison Grid</div>
           <div style={{display:'grid', gridTemplateColumns:'repeat(4, 1fr)', gap:'15px', marginTop:'15px'}}>
             {(['SILVER', 'GOLD', 'PLATINUM', 'DIAMOND'] as PackageLevel[]).map(level => {
                const data = PACKAGE_PRICING[packagesPrintData.size];
                const details = PACKAGE_DETAILS[level];
                const total = packagesPrintData.railings ? data.withRailing[level] : data.noRailing[level];
                return (
                  <div key={level} style={{border:'1px solid #eee', borderRadius:'8px', overflow:'hidden'}}>
                    <div style={{background: details.color, padding:'12px', textAlign:'center', color:['GOLD','SILVER'].includes(level) ? '#000' : '#fff', fontWeight:900, fontSize:'0.8rem'}}>{level} TIER</div>
                    <div style={{padding:'15px'}}>
                      <div style={{fontSize:'1.1rem', fontWeight:900, textAlign:'center', marginBottom:'4px'}}>${total.toLocaleString()}</div>
                      <div style={{fontSize:'0.65rem', color:'#888', textAlign:'center', marginBottom:'15px'}}>+ HST | From ${Math.round(total * FINANCING_FACTOR)}/mo</div>
                      
                      <div style={{fontSize:'0.7rem', borderTop:'1px solid #f0f0f0', paddingTop:'10px'}}>
                        <div style={{marginBottom:'8px'}}><strong>Foundation:</strong><br/>{details.foundation}</div>
                        <div style={{marginBottom:'8px'}}><strong>Framing:</strong><br/>{details.framing}</div>
                        <div style={{marginBottom:'8px'}}><strong>Decking:</strong><br/>{details.decking}</div>
                        <div style={{marginBottom:'8px'}}><strong>Railing:</strong><br/>{packagesPrintData.railings ? details.railing : 'None'}</div>
                        <div style={{marginBottom:'8px'}}><strong>Warranty:</strong><br/>{details.warranty}</div>
                        {details.extras.length > 0 && (
                          <div style={{marginTop:'10px', color:details.color, fontWeight:800}}>
                            {details.extras.map((ex, i) => <div key={i} style={{marginBottom:'2px'}}>+ {ex}</div>)}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
             })}
           </div>

           <div className="print-section-title">Optional Package Enhancements</div>
           <div className="print-grid" style={{gridTemplateColumns:'repeat(3, 1fr)'}}>
             <div className="print-data-item">
               <span className="print-label">Foundation Upgrade</span>
               <span className="print-value">Helical Piles (+${PACKAGE_PRICING[packagesPrintData.size].upgrades.helical.toLocaleString()})</span>
             </div>
             <div className="print-data-item">
               <span className="print-label">Foundation Upgrade</span>
               <span className="print-value">Cement Footings (+${PACKAGE_PRICING[packagesPrintData.size].upgrades.cement.toLocaleString()})</span>
             </div>
             <div className="print-data-item">
               <span className="print-label">Site Preparation</span>
               <span className="print-value">Fabric & Stone (+${PACKAGE_PRICING[packagesPrintData.size].upgrades.stone.toLocaleString()})</span>
             </div>
           </div>

           <div style={{marginTop: '30px', padding: '15px', background: '#f9f9f9', border: '1px solid #eee', borderRadius: '5px'}}>
             <div className="print-label" style={{marginBottom: '5px'}}>Why choose a curated package?</div>
             <p style={{fontSize: '0.7rem', color: '#666', lineHeight: '1.4'}}>Showroom packages are designed to offer the highest value and durability at a standardized rate. These prices include professional installation and high-performance materials tailored to the footprint size shown. Site-specific variables such as excessive slope or demo are additional.</p>
           </div>

           <div className="print-footer" style={{marginTop: '40px'}}>
              <p>This comparison sheet is for consultation purposes only. Prices are valid for 30 days. Financing subject to credit approval (O.A.C). Final investment confirmed via site survey.</p>
           </div>
           <div className="print-sig-block">
              <div className="print-sig-line">Client Review Signature</div>
              <div className="print-sig-line">Sales Consultant Signature</div>
           </div>
        </div>
      )}
    </div>
  );
};

interface PackageShowcaseProps {
  size: PackageSize;
  setSize: React.Dispatch<React.SetStateAction<PackageSize>>;
  railing: boolean;
  setRailing: React.Dispatch<React.SetStateAction<boolean>>;
  selectedUpgrades: Record<PackageLevel, Set<string>>;
  setSelectedUpgrades: React.Dispatch<React.SetStateAction<Record<PackageLevel, Set<string>>>>;
  onPrint: () => void;
}

export default EstimatorCalculatorView;

// Re-export the Dimensions type for the data bridge
export type { Dimensions as CalculatorDimensions, ClientInfo as CalculatorClientInfo };

