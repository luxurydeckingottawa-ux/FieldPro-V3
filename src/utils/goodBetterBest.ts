/**
 * Good / Better / Best Estimate Generator
 * 
 * Takes a set of deck dimensions and generates 3 material tier options:
 * - Good: Pressure Treated wood with deck blocks
 * - Better: Fiberon GoodLife composite with cement footings  
 * - Best: Clubhouse Woodbridge PVC with helical piles
 */

export interface EstimateOption {
  id: string;
  tier: 'good' | 'better' | 'best';
  tierLabel: string;
  title: string;
  description: string;
  price: number;
  priceWithTax: number;
  monthlyFinancing: number;
  features: string[];
  considerations: string[];
  materialType: string;
  deckingBrand: string;
  deckingProduct: string;
  framingType: string;
  foundationType: string;
  railingType: string;
  warranty: string;
  recommended?: boolean;
}

export interface GBBDimensions {
  sqft: number;
  footingsCount: number;
  steps: number;
  fasciaLF: number;
  railingLF: number;
  alumPosts?: number;
  alumSection6?: number;
}

const HST_RATE = 0.13;
const FINANCING_FACTOR = 1.96; // monthly factor for financing estimate

// Base pricing per unit
const PRICING = {
  // Good - Pressure Treated
  good: {
    decking: 28.95,    // per sqft (base PT price)
    fascia: 8.95,      // per LF
    steps: 42.95,      // per step LF
    railing: 34.95,    // per LF (PT wood railing)
    footing: 0,        // deck blocks included in base
    framingUpgrade: 0, // standard PT framing
  },
  // Better - Fiberon GoodLife Composite
  better: {
    decking: 49.95,    // per sqft
    fascia: 27.95,     // per LF
    steps: 63.95,      // per step LF
    railing: 0,        // aluminum component pricing below
    footing: 279,      // per sonotube
    framingUpgrade: 0, // standard framing
    alumPostPrice: 79.95,
    alumSection6Price: 129.95,
  },
  // Best - PVC with helical piles
  best: {
    decking: 57.95,    // per sqft (Clubhouse Woodbridge)
    fascia: 29.95,     // per LF
    steps: 68.50,      // per step LF
    railing: 0,        // aluminum component pricing below
    footing: 469,      // per helical pile
    framingUpgrade: 0, // standard framing
    alumPostPrice: 79.95,
    alumSection6Price: 129.95,
  }
};

export function generateGoodBetterBest(dims: GBBDimensions): EstimateOption[] {
  const { sqft, footingsCount, steps, fasciaLF, railingLF, alumPosts = 0, alumSection6 = 0 } = dims;

  // Estimate aluminum railing posts/sections if not provided
  const estimatedAlumPosts = alumPosts || Math.ceil(railingLF / 6) + 1;
  const estimatedAlumSections = alumSection6 || Math.ceil(railingLF / 6);

  // --- GOOD ---
  const goodSubtotal = 
    (sqft * PRICING.good.decking) +
    (fasciaLF * PRICING.good.fascia) +
    (steps * PRICING.good.steps) +
    (railingLF * PRICING.good.railing);
  const goodTotal = Math.round(goodSubtotal);
  const goodWithTax = Math.round(goodTotal * (1 + HST_RATE));

  // --- BETTER ---
  const betterSubtotal = 
    (sqft * PRICING.better.decking) +
    (fasciaLF * PRICING.better.fascia) +
    (steps * PRICING.better.steps) +
    (footingsCount * PRICING.better.footing) +
    (estimatedAlumPosts * PRICING.better.alumPostPrice) +
    (estimatedAlumSections * PRICING.better.alumSection6Price);
  const betterTotal = Math.round(betterSubtotal);
  const betterWithTax = Math.round(betterTotal * (1 + HST_RATE));

  // --- BEST ---
  const bestSubtotal = 
    (sqft * PRICING.best.decking) +
    (fasciaLF * PRICING.best.fascia) +
    (steps * PRICING.best.steps) +
    (footingsCount * PRICING.best.footing) +
    (estimatedAlumPosts * PRICING.best.alumPostPrice) +
    (estimatedAlumSections * PRICING.best.alumSection6Price);
  const bestTotal = Math.round(bestSubtotal);
  const bestWithTax = Math.round(bestTotal * (1 + HST_RATE));

  return [
    {
      id: 'good',
      tier: 'good',
      tierLabel: 'Classic Wood',
      title: 'Pressure Treated Deck',
      description: 'A solid, budget-friendly deck built with quality pressure treated lumber. A timeless look with proven durability.',
      price: goodTotal,
      priceWithTax: goodWithTax,
      monthlyFinancing: Math.round(goodWithTax / FINANCING_FACTOR),
      materialType: 'Pressure Treated Wood',
      deckingBrand: 'Natural Wood',
      deckingProduct: 'Pressure Treated Lumber',
      framingType: 'Pressure Treated Framing',
      foundationType: 'Deck Blocks',
      railingType: 'PT Wood Railing (2x2 Spindles)',
      warranty: '2-Year Workmanship Warranty',
      features: [
        'Pressure Treated Lumber',
        'Standard Wood Railing',
        'Deck Block Footings',
        '2-Year Workmanship Warranty'
      ],
      considerations: [
        'Requires annual staining/sealing',
        'Natural wood will weather over time',
        'Deck blocks may shift in freeze/thaw'
      ]
    },
    {
      id: 'better',
      tier: 'better',
      tierLabel: 'Composite',
      title: 'Fiberon GoodLife Composite Deck',
      description: 'The best of both worlds. Low-maintenance composite decking with a natural wood look and superior longevity.',
      price: betterTotal,
      priceWithTax: betterWithTax,
      monthlyFinancing: Math.round(betterWithTax / FINANCING_FACTOR),
      materialType: 'Composite',
      deckingBrand: 'Fiberon',
      deckingProduct: 'GoodLife Escapes',
      framingType: 'Pressure Treated Framing',
      foundationType: 'Concrete Sonotubes',
      railingType: 'Fortress AL13 Aluminum Railing',
      warranty: '30-Year Material Warranty',
      recommended: true,
      features: [
        'Fiberon GoodLife Composite',
        'Fortress Aluminum Railing',
        'Concrete Sonotube Footings',
        '30-Year Material Warranty'
      ],
      considerations: [
        'Higher upfront cost than wood',
        'Cannot be stained or painted',
        'Worth the investment for low maintenance'
      ]
    },
    {
      id: 'best',
      tier: 'best',
      tierLabel: 'Premium PVC',
      title: 'Clubhouse Woodbridge PVC Deck',
      description: 'Our premium option. Ultra-durable PVC decking with helical pile foundation for maximum stability and a lifetime of beauty.',
      price: bestTotal,
      priceWithTax: bestWithTax,
      monthlyFinancing: Math.round(bestWithTax / FINANCING_FACTOR),
      materialType: 'PVC',
      deckingBrand: 'ClubHouse',
      deckingProduct: 'Woodbridge PVC',
      framingType: 'Pressure Treated Framing',
      foundationType: 'Helical Piles (7\')',
      railingType: 'Fortress AL13 Aluminum Railing',
      warranty: 'Limited Lifetime Warranty',
      features: [
        'ClubHouse Woodbridge PVC',
        'Fortress Aluminum Railing',
        'Helical Pile Foundation',
        'Limited Lifetime Warranty'
      ],
      considerations: [
        'Premium investment',
        'Most durable foundation option',
        'Virtually zero maintenance for life'
      ]
    }
  ];
}
