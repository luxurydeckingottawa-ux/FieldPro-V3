/**
 * Shared decking catalog used by the customer portal's "Try Different Decking"
 * feature. The canonical decking data currently lives inline in
 * src/estimator/EstimatorCalculatorView.tsx PRICING_DATA. This module is a
 * portal-facing mirror so the customer can preview swap pricing live without
 * pulling in the full estimator.
 *
 * KEEP IN SYNC: if a decking item is added/removed/repriced in the estimator's
 * PRICING_DATA (section `decking`), update it here too. Prices here must match
 * or swap previews will drift from the actual quote.
 *
 * The swap math mirrors computePricingSummary in EstimatorCalculatorView.tsx:
 *   deckingContribution(item) = sqft × (BASE_SQFT_PRICE + item.priceDelta)
 *                             + steps × item.stepPrice
 *                             + fasciaLF × item.fasciaPrice
 *   preTaxDelta = deckingContribution(to) − deckingContribution(from)
 *   newTotalPrice = originalPrice + preTaxDelta × (1 + HST_RATE)
 */

export const BASE_SQFT_PRICE = 28.95;
export const HST_RATE = 0.13;

export interface DeckingCatalogItem {
  id: string;
  brand: string;
  name: string;
  description: string;
  priceDelta: number;      // delta from BASE_SQFT_PRICE (per sqft)
  fasciaPrice: number;     // $ per linear foot of fascia
  stepPrice: number;       // $ per step
  imageColor: string;      // hex for UI chip
  materialWarranty: string;  // derived from brand
  tier: 'pt' | 'cedar' | 'composite' | 'pvc';
}

function warrantyFor(brand: string, name: string): string {
  const s = `${brand} ${name}`.toLowerCase();
  if (/azek|timbertech/.test(s)) return '50-Year Material';
  if (/fiberon|trex|clubhouse|eva-?last/.test(s)) return '25-Year Material';
  if (/pressure.?treated|\bpt\b|cedar/.test(s)) return 'No Material Warranty';
  return 'No Material Warranty';
}

function tierFor(brand: string, name: string): 'pt' | 'cedar' | 'composite' | 'pvc' {
  const s = `${brand} ${name}`.toLowerCase();
  if (/pressure.?treated|\bpt\b/.test(s)) return 'pt';
  if (/cedar/.test(s)) return 'cedar';
  if (/\bpvc\b|paramount|promenade|apex|pioneer|azek|harvest|landmark|vintage|woodbridge/.test(s)) return 'pvc';
  return 'composite';
}

function item(
  id: string,
  brand: string,
  name: string,
  description: string,
  materialPricePerSqft: number,
  fasciaPrice: number,
  stepPrice: number,
  imageColor: string,
): DeckingCatalogItem {
  return {
    id,
    brand,
    name,
    description,
    priceDelta: Math.round((materialPricePerSqft - BASE_SQFT_PRICE) * 100) / 100,
    fasciaPrice,
    stepPrice,
    imageColor,
    materialWarranty: warrantyFor(brand, name),
    tier: tierFor(brand, name),
  };
}

export const DECKING_CATALOG: DeckingCatalogItem[] = [
  // Natural wood
  item('pt_wood_decking',            'Natural Wood', 'Pressure Treated Wood',  'Standard high-quality lumber.',       28.95, 15.95, 44.95, '#4d5d30'),
  item('cedar_decking',              'Natural Wood', 'Cedar Wood',             'Premium 5/4 Cedar boards.',           34.95, 15.95, 54.95, '#e67e22'),

  // Fiberon
  item('fiberon_goodlife_weekender', 'Fiberon',      'GoodLife Weekender',     '3-sided capping. 2 colors.',          44.95, 24.95, 59.95, '#8e44ad'),
  item('fiberon_goodlife_escapes',   'Fiberon',      'GoodLife Escapes',       'Multi-tonal. 4 colors.',              49.95, 27.95, 63.95, '#9b59b6'),
  item('fiberon_sanctuary',          'Fiberon',      'Sanctuary',              'Rich streaking. 5 colors.',           55.95, 29.95, 69.95, '#7d3c98'),
  item('fiberon_concordia',          'Fiberon',      'Concordia',              'Premium Symmetry. 8 colors.',         61.95, 34.95, 73.95, '#6c3483'),
  item('fiberon_paramount',          'Fiberon',      'PVC Paramount',          'PVC. Slip resistant. 4 colors.',      63.95, 34.95, 78.95, '#d35400'),
  item('fiberon_promenade',          'Fiberon',      'PVC Promenade',          'Cellular PVC. 6 colors.',             65.95, 39.95, 87.95, '#e67e22'),

  // TimberTech
  item('tt_prime',                   'TimberTech',   'Prime Collection',       'Clean, solid colors.',                46.95, 26.95, 62.24, '#c0392b'),
  item('tt_prime_plus',              'TimberTech',   'Prime+ Collection',      'Multi-tonal and high performance.',   48.95, 26.95, 63.13, '#a93226'),
  item('tt_terrain',                 'TimberTech',   'Terrain Collection',     'Rugged wood look.',                   56.95, 26.95, 66.49, '#922b21'),
  item('tt_reserve',                 'TimberTech',   'Reserve Collection',     'Reclaimed wood look.',                66.95, 31.50, 74.72, '#7b241c'),
  item('tt_legacy',                  'TimberTech',   'Legacy Collection',      'Hand-scraped look.',                  72.95, 34.95, 80.32, '#641e16'),

  // Azek
  item('azek_harvest',               'Azek',         'PVC Harvest',            'Natural shades.',                     59.95, 24.95, 66.21, '#229954'),
  item('azek_landmark',              'Azek',         'PVC Landmark',           'Cross-cut hardwood.',                 66.95, 28.49, 72.30, '#1d8348'),
  item('azek_vintage',               'Azek',         'PVC Vintage',            'Sophisticated aesthetics.',           71.95, 36.49, 81.03, '#196f3d'),

  // Other
  item('woodbridge_pvc',             'ClubHouse',    'Woodbridge (PVC)',       'Premium Woodbridge aesthetics.',      57.95, 29.95, 68.50, '#5dade2'),
  item('eva_infinity',               'Eva-Last',     'Infinity Composite',     'Capped bamboo. 4 colors.',            46.95, 29.62, 64.77, '#2e86c1'),
  item('eva_apex',                   'Eva-Last',     'Apex PVC',               'Foamed PVC. 6 colors.',               68.95, 33.53, 76.88, '#21618c'),
  item('eva_pioneer',                'Eva-Last',     'Pioneer Ultra PVC',      'Glass fiber reinforced.',             87.95, 33.95, 86.22, '#1a5276'),
];

export interface DeckingDimensions {
  sqft: number;
  steps: number;
  fasciaLF: number;
}

/**
 * Decking material contribution (pre-HST) to an option total.
 * Used as a building block for swap deltas — not meaningful on its own
 * because it doesn't include labour, railing, foundation, etc.
 */
export function deckingContribution(
  dims: DeckingDimensions,
  item: DeckingCatalogItem,
): number {
  const sqft = dims.sqft || 0;
  const steps = dims.steps || 0;
  const fascia = dims.fasciaLF || 0;
  return sqft * (BASE_SQFT_PRICE + item.priceDelta) + steps * item.stepPrice + fascia * item.fasciaPrice;
}

/**
 * Live-preview swap price: applies the decking delta (plus HST) on top of
 * the original option price. Order of operations matches the estimator —
 * HST is applied to the delta last.
 */
export function calculateSwappedPrice(
  originalPrice: number,
  dims: DeckingDimensions,
  from: DeckingCatalogItem | null,
  to: DeckingCatalogItem,
): number {
  if (!from) return originalPrice; // no baseline to swap from
  const fromContribution = deckingContribution(dims, from);
  const toContribution = deckingContribution(dims, to);
  const preTaxDelta = toContribution - fromContribution;
  const postTaxDelta = preTaxDelta * (1 + HST_RATE);
  return Math.round(originalPrice + postTaxDelta);
}

/**
 * Group the catalog by brand — the swap modal displays materials grouped so
 * the customer can scan by manufacturer.
 */
export function groupCatalogByBrand(): Array<{ brand: string; items: DeckingCatalogItem[] }> {
  const byBrand = new Map<string, DeckingCatalogItem[]>();
  for (const it of DECKING_CATALOG) {
    if (!byBrand.has(it.brand)) byBrand.set(it.brand, []);
    byBrand.get(it.brand)!.push(it);
  }
  return Array.from(byBrand.entries()).map(([brand, items]) => ({ brand, items }));
}

/**
 * Resolve a selection's decking (from calculatorOptions.selections.decking) to
 * the catalog entry, matching first by id, then by name as a fallback.
 */
export function resolveDeckingFromSelection(selection: unknown): DeckingCatalogItem | null {
  if (!selection || typeof selection !== 'object') return null;
  const sel = selection as { id?: string; name?: string };
  if (sel.id) {
    const byId = DECKING_CATALOG.find(d => d.id === sel.id);
    if (byId) return byId;
  }
  if (sel.name) {
    const name = sel.name.toLowerCase();
    return DECKING_CATALOG.find(d => d.name.toLowerCase() === name) || null;
  }
  return null;
}
