import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Maximize2, Minimize2 } from 'lucide-react';
import { loadPriceBook } from '../utils/priceBook';
import ShowroomGlobalStyle from './showroom/ShowroomGlobalStyle';
import ShowroomTopNav from './showroom/ShowroomTopNav';
import FramingVisualizer from './showroom/FramingVisualizer';
import DeckPreview3D from './showroom/DeckPreview3D';
import FoundationVisualizer from './showroom/FoundationVisualizer';
import ProductGallery, { type GalleryImage } from './showroom/ProductGallery';
import OptionTabs from './showroom/OptionTabs';
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
  type PricingImpact,
  type CalculatorSelections,
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
  cedar_decking:               { primary: '#A8805A', secondary: '#8E6B48' },
  // Fiberon
  fiberon_goodlife_weekender:  { primary: '#8B7A60', secondary: '#7A6950' },
  fiberon_goodlife_escapes:    { primary: '#8B7565', secondary: '#7B6555' },
  fiberon_sanctuary:           { primary: '#6B5B4B', secondary: '#5B4B3B' },
  fiberon_concordia:           { primary: '#7A6B58', secondary: '#6A5B48' },
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

// Manufacturer grain photos. Loaded as <img> on the card image strip.
// Fallback hierarchy: priceBook upload -> this map -> color gradient.
// These are hotlinked from the manufacturer CDNs; if any URL breaks, the
// fallback gradient shows until Jack uploads a replacement via Settings > Price Book.
export const TIER_TO_TEXTURE_URL: Record<string, string> = {
  // Fiberon
  fiberon_goodlife_weekender: 'https://www.fiberondecking.com/cdn/shop/files/zqxfitddckgp0ji4aabl.jpg',
  fiberon_goodlife_escapes:   'https://www.fiberondecking.com/cdn/shop/files/daxgnnraihi9xszgatio.jpg',
  fiberon_sanctuary:          'https://www.fiberondecking.com/cdn/shop/files/r29ebhu6xgurbiklszqx.jpg',
  fiberon_concordia:          'https://www.fiberondecking.com/cdn/shop/files/vnvui2u2xelnuowbywod.jpg',
  fiberon_paramount:          'https://www.fiberondecking.com/cdn/shop/files/bfayesgr1amxmtdrmyq3.jpg',
  fiberon_promenade:          'https://www.fiberondecking.com/cdn/shop/files/nty1mavvdafvs85bpndh.jpg',
  // TimberTech
  tt_prime:                   'https://shop.timbertech.com/wp-content/uploads/2023/01/TimberTech-Dark-Teak-Prime-Composite-Decking-Beauty1.jpg',
  tt_prime_plus:              'https://shop.timbertech.com/wp-content/uploads/2021/04/TimberTech-composite-prime-plus-coconut-husk-decking-beauty-1.jpg',
  tt_terrain:                 'https://shop.timbertech.com/wp-content/uploads/2022/01/TimberTech-Brown-Oak-Terrain-Collection-PRO-Decking-Beauty-Shot-012122-1.jpg',
  tt_reserve:                 'https://shop.timbertech.com/wp-content/uploads/2024/05/TimberTech-Composite-Reserve-Antique-Leather-pdp-beauty-1.jpg',
  tt_legacy:                  'https://shop.timbertech.com/wp-content/uploads/2024/05/TimberTech-Composite-Legacy-Ashwood-pdp-beauty-1.jpg',
  // Azek
  azek_harvest:               'https://shop.timbertech.com/wp-content/uploads/2020/02/harvest_brownstone_premier_white_composite_02.jpg',
  azek_landmark:              'https://shop.timbertech.com/wp-content/uploads/2024/05/TimberTech-Avanced-PVC-Landmark-American-Walnut-pdp-beauty-1.jpg',
  azek_vintage:               'https://shop.timbertech.com/wp-content/uploads/2024/05/TimberTech-Avanced-PVC-Vintage-Coastline-Decking-pdp-beauty-1.jpg',
  // Eva-Last
  eva_infinity:               'https://www.eva-last.com/us/wp-content/uploads/2022/09/TigerCove_Inf_grooved-deck-1.jpg',
  eva_apex:                   'https://www.eva-last.com/us/wp-content/uploads/2023/03/Apex-himalayan-cedar-1-2-600x600.jpg',
  eva_pioneer:                'https://www.eva-last.com/us/wp-content/uploads/2026/01/pioneer-IPE.jpg',
  // Woodbridge (Clubhouse - their domain is parked, using National Decking CDN which is the Canadian distributor)
  woodbridge_pvc:             'https://nationaldecking.com/wp-content/uploads/2025/05/Royal-Walnut-Texture.webp',
  // Railings
  fortress_al13_pkg:          'https://fortressrailing.com/Images/Railing/al13-home/al13-home-hero-sample-1.webp',
  alum_glass:                 'https://fortressrailing.com/Images/Railing/hub/Glass-railing-hero-left.jpg',
  frameless_glass:            'https://www.vistarailings.com/wp-content/uploads/2023/02/ApprovedHR_Hamilton-Deck-and-Fence_July2022_2-scaled.jpg',
  // Privacy
  privacy_sunbelly_combined:  'https://d3k81ch9hvuctc.cloudfront.net/company/RTKhre/images/a7543182-edda-45e2-a973-b771f529df22.jpeg',
  // Lighting (IN-LITE)
  inlite_smart_hub:       'https://in-lite.com/media/catalog/product/cache/6517c62f5899ad6aa0ba23ceb3eeff97/1/6/1615_10500602_4.png',
  inlite_smart_hub_prot:  'https://in-lite.com/media/catalog/product/cache/6517c62f5899ad6aa0ba23ceb3eeff97/6/3/6358_hubprotector-1.png',
  inlite_smart_move:      'https://in-lite.com/media/catalog/product/cache/6517c62f5899ad6aa0ba23ceb3eeff97/1/6/1625_10500706_1.png',
  inlite_move:            'https://in-lite.com/media/catalog/product/cache/6517c62f5899ad6aa0ba23ceb3eeff97/1/6/1622_10500705_2.png',
  inlite_hub_50:          'https://in-lite.com/media/catalog/product/cache/6517c62f5899ad6aa0ba23ceb3eeff97/6/3/6395_hub-75_1_2.png',
  inlite_hub_100:         'https://in-lite.com/media/catalog/product/cache/6517c62f5899ad6aa0ba23ceb3eeff97/6/3/6395_hub-75_1_2.png',
  inlite_hub_prot:        'https://in-lite.com/media/catalog/product/cache/6517c62f5899ad6aa0ba23ceb3eeff97/1/0/10500711_1_2.png',
  inlite_hyve_22:         'https://in-lite.com/media/catalog/product/cache/6517c62f5899ad6aa0ba23ceb3eeff97/5/4/5432_hyve22_black_1.png',
  inlite_cubid:           'https://in-lite.com/media/catalog/product/cache/9412186e8478422d9f0e19b036685553/5/3/5371_10301006_cubid_dark-grey.png',
  inlite_ace:             'https://in-lite.com/media/catalog/product/cache/6517c62f5899ad6aa0ba23ceb3eeff97/5/5/5525_10301955_ace-up-down_1.png',
  inlite_wedge_slim:      'https://in-lite.com/media/catalog/product/cache/6517c62f5899ad6aa0ba23ceb3eeff97/5/3/5357_10301770_wedge-slim.png',
  inlite_puck_22:         'https://in-lite.com/media/catalog/product/cache/9412186e8478422d9f0e19b036685553/5/7/5767_puck_22_pg.png',
  inlite_mini_wedge:      'https://in-lite.com/media/catalog/product/cache/6517c62f5899ad6aa0ba23ceb3eeff97/5/3/5361_10301780_mini-wedge.png',
  inlite_liv_low:         'https://in-lite.com/media/catalog/product/cache/6517c62f5899ad6aa0ba23ceb3eeff97/5/7/5792_10201776_liv-low_white_1.png',
  inlite_sway:            'https://in-lite.com/media/catalog/product/cache/6517c62f5899ad6aa0ba23ceb3eeff97/1/0/10202400_sway_black_hoofdfoto_1.png',
  inlite_6_pkg:           'https://in-lite.com/media/catalog/product/cache/9412186e8478422d9f0e19b036685553/7/0/703_10104050_6.png',
  inlite_hyve:            'https://in-lite.com/media/catalog/product/cache/bcdda5f02faa4fd09545710440a20961/h/y/hyve_black_1_1.png',
  inlite_big_cubid:       'https://in-lite.com/media/catalog/product/cache/bcdda5f02faa4fd09545710440a20961/5/3/5368_10301025_big-cubid_rose_silver_1.png',
  inlite_ace_down:        'https://in-lite.com/media/catalog/product/cache/bcdda5f02faa4fd09545710440a20961/1/0/10301850_ace-down_2.png',
  inlite_puck:            'https://in-lite.com/media/catalog/product/cache/bcdda5f02faa4fd09545710440a20961/p/u/puck_pg_2.png',
  inlite_blink:           'https://in-lite.com/media/catalog/product/cache/bcdda5f02faa4fd09545710440a20961/5/3/5365_10301200_blink_rose-silver_4.png',
  // Lighting (Fortress)
  fortress_glow:          'https://fortressbp.com/Images/Lighting/LED/led-glow-ring.jpg',
  fortress_vertical:      'https://fortressbp.com/Images/Lighting/LED/led-vertical-post-light.jpg',
  fortress_surface:       'https://fortressbp.com/Images/Lighting/LED/led-surface-mount-light.jpg',
  fortress_60w:           'https://fortressbp.com/Images/Lighting/LED/transformer.png',
};

// Skirting reuses the decking texture — same material, skirting board form.
// Plain wood skirts (skirt_wood, skirt_cedar), PVC skirt (skirt_pvc), and
// lattice (skirt_lattice) keep their gradient fallback (no photo override).
TIER_TO_TEXTURE_URL['skirt_fiberon_gl']          = TIER_TO_TEXTURE_URL['fiberon_goodlife_weekender'];
TIER_TO_TEXTURE_URL['skirt_fiberon_sanctuary']   = TIER_TO_TEXTURE_URL['fiberon_sanctuary'];
TIER_TO_TEXTURE_URL['skirt_fiberon_concordia']   = TIER_TO_TEXTURE_URL['fiberon_concordia'];
TIER_TO_TEXTURE_URL['skirt_tt_prime']            = TIER_TO_TEXTURE_URL['tt_prime'];
TIER_TO_TEXTURE_URL['skirt_tt_legacy']           = TIER_TO_TEXTURE_URL['tt_legacy'];
TIER_TO_TEXTURE_URL['skirt_azek_harvest']        = TIER_TO_TEXTURE_URL['azek_harvest'];
TIER_TO_TEXTURE_URL['skirt_azek_vintage']        = TIER_TO_TEXTURE_URL['azek_vintage'];
TIER_TO_TEXTURE_URL['skirt_eva_infinity']        = TIER_TO_TEXTURE_URL['eva_infinity'];
TIER_TO_TEXTURE_URL['skirt_eva_apex']            = TIER_TO_TEXTURE_URL['eva_apex'];

// Privacy wall product gallery images. Manufacturer CDN photos showing
// the range of laser-cut patterns and colours each brand offers. Used
// by the ProductGallery lightbox on privacy-category cards.
export const PRIVACY_GALLERY_IMAGES: Record<string, GalleryImage[]> = {
  // Sunbelly — 12 profiles in black/bronze/white. Images from CompositeDecDirect CDN.
  privacy_sunbelly_combined: [
    { url: 'https://compositedeckdirect.com/cdn/shop/products/High_tide_privacy_1.png?v=1659033554', label: 'Sunbelly High Tide - Black' },
    { url: 'https://compositedeckdirect.com/cdn/shop/products/Bronze_High_Tide.png?v=1656093821', label: 'Sunbelly High Tide - Bronze' },
    { url: 'https://compositedeckdirect.com/cdn/shop/products/Blurred_privacy_1.png?v=1659033554', label: 'Sunbelly Blurred Lines - Black' },
    { url: 'https://compositedeckdirect.com/cdn/shop/products/Bronze_Blurred_Lines.png?v=1656093821', label: 'Sunbelly Blurred Lines - Bronze' },
    { url: 'https://compositedeckdirect.com/cdn/shop/files/BLURRIER_LINES_black.jpg?v=1753375681', label: 'Sunbelly Blurrier Lines - Black' },
    { url: 'https://compositedeckdirect.com/cdn/shop/files/Bronze_Blurrier_Lines_Angle_with_Bronze_Posts.jpg?v=1753375726', label: 'Sunbelly Blurrier Lines - Bronze' },
    { url: 'https://compositedeckdirect.com/cdn/shop/files/BARCODE_PRIVACY_LEVEL_-_blk.jpg?v=1753375102', label: 'Sunbelly Barcode - Black' },
    { url: 'https://compositedeckdirect.com/cdn/shop/files/Bronze_Barcode_Angle_with_Bronze_Posts.jpg?v=1753375284', label: 'Sunbelly Barcode - Bronze' },
    { url: 'https://compositedeckdirect.com/cdn/shop/products/Planks_privacy_1.png?v=1659033554', label: 'Sunbelly Planks - Black' },
    { url: 'https://compositedeckdirect.com/cdn/shop/products/bronze_Planks.png?v=1656093818', label: 'Sunbelly Planks - Bronze' },
    { url: 'https://compositedeckdirect.com/cdn/shop/files/streamline_black.jpg?v=1753382522', label: 'Sunbelly Streamline - Black' },
    { url: 'https://compositedeckdirect.com/cdn/shop/files/streamline_bronze.jpg?v=1753382537', label: 'Sunbelly Streamline - Bronze' },
    { url: 'https://compositedeckdirect.com/cdn/shop/files/next_line_black.jpg?v=1753376133', label: 'Sunbelly Next Line - Black' },
    { url: 'https://compositedeckdirect.com/cdn/shop/files/next_line_bronze.jpg?v=1753376146', label: 'Sunbelly Next Line - Bronze' },
    { url: 'https://compositedeckdirect.com/cdn/shop/files/black_solid.jpg?v=1753382352', label: 'Sunbelly Solid - Black' },
    { url: 'https://compositedeckdirect.com/cdn/shop/files/bronze_solid.jpg?v=1753382369', label: 'Sunbelly Solid - Bronze' },
  ],
  // Hideaway — laser-cut aluminium panels. Images from hideawayscreen.com CDN.
  hideaway_alum_10: [
    { url: 'https://hideawayscreen.com/cdn/shop/files/hideaway-privacy-screen-black-privacy-screen-hexx-35161146392749.png?v=1752011775&width=2400', label: 'Hideaway Hexx' },
    { url: 'https://hideawayscreen.com/cdn/shop/files/hideaway-privacy-screen-black-privacy-screen-branch-35161128829101.png?v=1752011763&width=2400', label: 'Hideaway Branch' },
    { url: 'https://hideawayscreen.com/cdn/shop/files/Horizon_ef03771a-db20-4483-bbfb-d642690a84c8.png?v=1755708496&width=2400', label: 'Hideaway Horizon' },
    { url: 'https://hideawayscreen.com/cdn/shop/files/hideaway-privacy-screen-black-privacy-screen-dash-35161142427821.png?v=1722798848&width=2400', label: 'Hideaway Dash' },
    { url: 'https://hideawayscreen.com/cdn/shop/files/hideaway-privacy-screen-black-privacy-screen-maui-35161274974381.png?v=1722799116&width=2400', label: 'Hideaway Maui' },
    { url: 'https://hideawayscreen.com/cdn/shop/files/hideaway-privacy-screen-black-privacy-screen-moderna-35161282445485.png?v=1722798774&width=2400', label: 'Hideaway Moderna' },
    { url: 'https://hideawayscreen.com/cdn/shop/files/hideaway-privacy-screen-black-privacy-screen-river-rock-35161291292845.png?v=1722798950&width=2400', label: 'Hideaway River Rock' },
    { url: 'https://hideawayscreen.com/cdn/shop/files/hideaway-privacy-screen-black-privacy-screen-breeze-35161137381549.png?v=1722799241&width=2400', label: 'Hideaway Breeze' },
    { url: 'https://hideawayscreen.com/cdn/shop/files/Solid_bb31e867-dfb5-46d7-83a7-010f6e28e575.png?v=1721664866&width=2400', label: 'Hideaway Solid' },
    { url: 'https://hideawayscreen.com/cdn/shop/files/hideaway-privacy-screen-black-privacy-screen-rain-35161287458989.png?v=1722799885&width=2400', label: 'Hideaway Rain' },
    { url: 'https://hideawayscreen.com/cdn/shop/files/Morocco_a955ce53-ec2b-4a7a-b889-ce230a872850.png?v=1756859495&width=2400', label: 'Hideaway Morocco' },
  ],
  // Wood and PVC walls also get a small gallery so the button renders
  // consistently across all privacy cards.
  privacy_wood: [
    { url: 'https://compositedeckdirect.com/cdn/shop/files/black_solid.jpg?v=1753382352', label: 'Wood Privacy Wall - Standard' },
  ],
  privacy_pvc: [
    { url: 'https://compositedeckdirect.com/cdn/shop/files/streamline_white.jpg?v=1753382551', label: 'PVC Privacy Wall - Horizontal' },
  ],
};

// ROUND 6 FIX 1 — Tier badges now render as circular, physical-looking coin
// stickers that mirror the 4-colour palette Jack uses on Luxury Decking's
// showroom samples. getTierFromPrice returns a KEY; the renderer looks up the
// TIER_BADGE map for the gradient/ring/shadow/label. Kept to decking +
// skirting only (railing uses componentized pricing with mostly zeroed
// deltas, so labelling by delta would mislead).
type TierKey = 'select' | 'premium' | 'elite' | 'signature';

const TIER_BADGE: Record<TierKey, {
  bg: string;
  ring: string;
  innerShadow: string;
  label: string;
}> = {
  select: {
    bg: 'radial-gradient(circle at 35% 30%, #FFFFFF 0%, #E8E4DD 70%, #D4CEC3 100%)',
    ring: 'rgba(255,255,255,0.3)',
    innerShadow: 'inset 0 1px 2px rgba(0,0,0,0.1), inset 0 -1px 1px rgba(255,255,255,0.5)',
    label: 'SELECT',
  },
  premium: {
    bg: 'radial-gradient(circle at 35% 30%, #2A2A2A 0%, #0A0A0A 70%, #000000 100%)',
    // ROUND 10 FIX 2c — ring bumped from 0.15 -> 0.45 so the black coin
    // has a visible white trim when it sits on the dark card content area.
    ring: 'rgba(255,255,255,0.45)',
    innerShadow: 'inset 0 1px 2px rgba(255,255,255,0.15), inset 0 -1px 1px rgba(0,0,0,0.5)',
    label: 'PREMIUM',
  },
  elite: {
    // ROUND 10 FIX 2a — darker brushed-steel palette so Elite is visually
    // distinct from the white Select coin when they sit next to each other.
    bg: 'radial-gradient(circle at 35% 30%, #D8D8D8 0%, #9A9A9A 40%, #5A5A5A 100%)',
    ring: 'rgba(255,255,255,0.2)',
    innerShadow: 'inset 0 1px 2px rgba(255,255,255,0.25), inset 0 -1px 1px rgba(0,0,0,0.35)',
    label: 'ELITE',
  },
  signature: {
    bg: 'radial-gradient(circle at 35% 30%, #F5D487 0%, #D4A853 50%, #A88238 100%)',
    ring: 'rgba(212,168,83,0.4)',
    innerShadow: 'inset 0 1px 2px rgba(255,255,255,0.35), inset 0 -1px 1px rgba(0,0,0,0.25)',
    label: 'SIGNATURE',
  },
};

const TIER_ORDER: Record<TierKey, number> = {
  select: 0,
  premium: 1,
  elite: 2,
  signature: 3,
};

const tierOrder = (t: TierKey | null): number =>
  t === null ? 4 : TIER_ORDER[t];

const getTierFromPrice = (
  category: string,
  priceDelta: number
): TierKey | null => {
  if (category !== 'decking' && category !== 'skirting') return null;
  if (priceDelta < 5) return 'select';
  if (priceDelta < 15) return 'premium';
  if (priceDelta < 30) return 'elite';
  return 'signature';
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

const EstimatorScopedStyle: React.FC = () => (
  // Scoped styles for the Estimator showroom view ONLY. All selectors are
  // prefixed with .est-showroom-root so they do not leak to the rest of
  // FieldPro. Universal showroom globals (font import, box-sizing reset,
  // generic webkit scrollbar) live in ShowroomGlobalStyle so they can be
  // shared with Material Matrix Showroom etc.
  <style>{`
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

    /* Tighter 3px scrollbar specific to the dense Estimator panel; overrides
       the 4px default from ShowroomGlobalStyle. */
    .est-showroom-root ::-webkit-scrollbar { width: 3px; height: 3px; }
    .est-showroom-root ::-webkit-scrollbar-thumb { border-radius: 3px; }
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
  view?: 'calculator' | 'packages' | 'materialMatrix';
  setView?: (v: 'calculator' | 'packages' | 'materialMatrix') => void;
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
  options,
  activeOptionId,
  onSelectOption,
  onAddOption,
  onRenameOption,
  onDeleteOption,
  optionTotals,
}) => {
  const [panelOpen, setPanelOpen] = useState<boolean>(true);
  // ROUND 6 FIX 3 — Sort-by-tier toggle. Persists across category changes
  // (Jack treats it as a preference, not a per-tab setting).
  const [sortByTier, setSortByTier] = useState<boolean>(false);
  // Gallery lightbox state for privacy wall product cards.
  const [galleryOpen, setGalleryOpen] = useState(false);
  const [galleryProductName, setGalleryProductName] = useState('');
  const [galleryImages, setGalleryImages] = useState<GalleryImage[]>([]);
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

    setSelections((prev: CalculatorSelections) => ({
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
  // ROUND 6 FIX 3 — When sortByTier is on and the current category actually
  // supports tiers (decking / skirting), re-order the options Select -> Premium
  // -> Elite -> Signature. Otherwise render in the original PRICING_DATA order.
  // We sort a shallow copy so we don't mutate PRICING_DATA.
  const tierSortable =
    activeCategory === 'decking' || activeCategory === 'skirting';
  const orderedOptions =
    sortByTier && tierSortable
      ? [...activeOptions].sort(
          (a, b) =>
            tierOrder(getTierFromPrice(activeCategory, a.priceDelta)) -
            tierOrder(getTierFromPrice(activeCategory, b.priceDelta))
        )
      : activeOptions;
  const activeDecking = selections.decking;

  // Total and monthly from pricingSummary (preserve existing logic exactly)
  const total = Math.round(pricingSummary.subTotal || 0);
  const monthly = pricingSummary.monthly || Math.round(total * FINANCING_FACTOR);

  // Build summary line items from pricingSummary.impacts (already computed by parent).
  // Rendered in the BUILD SUMMARY panel directly under the price plaque (FIX 5).
  const chips = (pricingSummary.impacts || [])
    .filter((imp: PricingImpact) => typeof imp.value === 'number')
    .map((imp: PricingImpact) => ({ label: imp.label, value: Math.round(imp.value) }));

  // --- Helpers for per-card state ---
  const isOptionSelected = (catId: string, opt: PricingTier): boolean => {
    if (catId === 'accessories') return (lightingQuantities[opt.id] || 0) > 0;
    if (opt.id === 'nami_fix') return dimensions.namiFixCount > 0;
    if (opt.id === 'alum_drink_rail') return dimensions.drinkRailLF > 0;
    if (Array.isArray(selections[catId]))
      return (selections[catId] as PricingTier[]).some((e: PricingTier) => e.id === opt.id);
    return selections[catId]?.id === opt.id;
  };

  // ---------- RENDER ----------
  return (
    <div className="est-showroom-root">
      <ShowroomGlobalStyle rootClass="est-showroom-root" />
      <EstimatorScopedStyle />
      <div className="est-grain" />

      {/* ══ TOP NAV BAR (shared) ══ */}
      <ShowroomTopNav
        activeTab="estimator"
        onTabChange={(v) => {
          if (v === 'estimator') setView?.('calculator');
          else if (v === 'showroom') setView?.('packages');
          else if (v === 'matrix') setView?.('materialMatrix');
        }}
        onExit={onExit}
      />

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
            {/* Option Tabs — shown only if multi-option handlers are provided */}
            {options && activeOptionId && onSelectOption && onAddOption && onRenameOption && onDeleteOption && (
              <OptionTabs
                options={options.map((o) => ({
                  id: o.id,
                  name: o.name,
                  // Live totals come from the parent's optionTotals map (computed once
                  // per options change). Falls back to 0 if not provided.
                  totalPrice: optionTotals?.[o.id] ?? 0,
                }))}
                activeId={activeOptionId}
                estimateNumber={estimateNumber}
                onSelect={onSelectOption}
                onAdd={onAddOption}
                onRename={onRenameOption}
                onDelete={onDeleteOption}
              />
            )}

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
            {/* ROUND 7 — LEFT: Wordmark + Estimate/Client/Address block
                stacked vertically, left-aligned. Was previously split across
                left (wordmark) and right (estimate info) columns.
                ROUND 10 FIX 1 — flexShrink: 0 locks wordmark block to its
                natural width so Build Summary growth consumes the empty
                gap between wordmark and plaque, NOT the wordmark itself. */}
            <div style={{ flexShrink: 0 }}>
              {/* Wordmark */}
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

              {/* ROUND 7 — Estimate number + client + address block moved LEFT,
                  under the wordmark. Styling identical to prior right-side version,
                  just left-aligned now. */}
              <div style={{ marginTop: 14, textAlign: 'left' }}>
                <div
                  style={{
                    fontSize: 10,
                    color: 'var(--lux-gold)',
                    letterSpacing: 1,
                    fontWeight: 600,
                  }}
                >
                  ESTIMATE #{estimateNumber}{options && options.length > 1 && activeOptionId ? `-${activeOptionId}` : ''}
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
            </div>

            {/* ROUND 7 — RIGHT: Build Summary panel + Price Plaque SIDE-BY-SIDE.
                Build summary sits to the LEFT of the plaque, both panels share
                the same top anchor and same fixed height (120px). Build summary
                grows HORIZONTALLY via CSS multi-column layout as items are added. */}
            <div
              style={{
                display: 'flex',
                gap: 12,
                alignItems: 'flex-start',
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
                    zIndex: 2,
                  }}
                >
                  {isFullScreen ? (
                    <Minimize2 size={16} strokeWidth={2} />
                  ) : (
                    <Maximize2 size={16} strokeWidth={2} />
                  )}
                </button>
              )}

              {/* ROUND 7 — BUILD SUMMARY panel, now a sibling of the price plaque.
                  Fixed height 120px to match plaque.
                  ROUND 10 FIX 1 — panel now grows horizontally WITHOUT BOUND.
                  maxWidth and overflowX: auto removed so content is ALWAYS
                  visible; CSS multi-column (columnWidth: 160) auto-adds
                  columns as the panel widens. width: auto lets the panel
                  consume the empty space between the (flexShrink:0) wordmark
                  block and the rightmost price plaque. */}
              <div
                style={{
                  height: 120,
                  padding: '10px 14px',
                  background: 'rgba(212,168,83,0.02)',
                  border: '1px solid rgba(212,168,83,0.10)',
                  borderRadius: 8,
                  minWidth: 240,
                  width: 'auto',
                  overflowX: 'visible',
                  overflowY: 'hidden',
                  display: 'flex',
                  flexDirection: 'column',
                  textAlign: 'left',
                  boxSizing: 'border-box',
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
                    flexShrink: 0,
                  }}
                >
                  Build Summary
                </div>
                {chips.length === 0 ? (
                  <div
                    style={{
                      flex: 1,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 10,
                      color: 'rgba(232,224,212,0.25)',
                      fontStyle: 'italic',
                    }}
                  >
                    No upgrades selected
                  </div>
                ) : (
                  <div
                    style={{
                      flex: 1,
                      columnGap: 20,
                      columnRuleColor: 'rgba(212,168,83,0.08)',
                      columnRuleWidth: 1,
                      columnRuleStyle: 'solid',
                      columnWidth: 160,
                      columnFill: 'auto',
                    }}
                  >
                    {chips.map((item: { label: string; value: number }, i: number) => (
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
                        <span
                          style={{
                            color: 'rgba(255,255,255,0.6)',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                          }}
                        >
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

              {/* ROUND 7 — PRICE PLAQUE, now a sibling of Build Summary.
                  Fixed height 120px, anchored rightmost. */}
              <div
                style={{
                  height: 120,
                  background: 'rgba(212,168,83,0.04)',
                  border: '1px solid rgba(212,168,83,0.12)',
                  borderTop: '1px solid rgba(212,168,83,0.35)',
                  borderRadius: 8,
                  padding: '14px 28px',
                  minWidth: 240,
                  textAlign: 'right',
                  boxSizing: 'border-box',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'center',
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
                      fontSize: 44,
                      fontWeight: 800,
                      color: 'var(--lux-gold)',
                      fontFamily: FONT_DISPLAY,
                      lineHeight: 1,
                    }}
                  >
                    {fmtCAD(total)}
                  </span>
                  <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.2)' }}>+ HST</span>
                </div>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'baseline',
                    gap: 4,
                    justifyContent: 'flex-end',
                    marginTop: 2,
                  }}
                >
                  <span
                    style={{
                      fontSize: 20,
                      fontWeight: 600,
                      color: 'var(--lux-blue)',
                      fontFamily: FONT_DISPLAY,
                    }}
                  >
                    {fmtCAD(monthly)}
                  </span>
                  <span style={{ fontSize: 11, color: 'rgba(91,155,213,0.5)' }}>/mo</span>
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
            </div>
          </div>

          {/* Floating options summary — only when panel collapsed + multiple options */}
          {!panelOpen && options && options.length > 1 && activeOptionId && onSelectOption && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                padding: '6px 24px 0',
                flexShrink: 0,
                flexWrap: 'wrap',
              }}
            >
              <div
                style={{
                  fontSize: 8,
                  letterSpacing: 1.8,
                  color: 'rgba(212,168,83,0.5)',
                  textTransform: 'uppercase',
                  fontWeight: 700,
                  marginRight: 4,
                }}
              >
                Options
              </div>
              {options.map((o) => {
                const isActive = o.id === activeOptionId;
                return (
                  <button
                    key={o.id}
                    onClick={() => onSelectOption(o.id)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6,
                      padding: '4px 10px 4px 4px',
                      borderRadius: 14,
                      border: `1px solid ${isActive ? 'rgba(212,168,83,0.6)' : 'rgba(255,255,255,0.08)'}`,
                      background: isActive ? 'rgba(212,168,83,0.08)' : 'rgba(0,0,0,0.35)',
                      cursor: 'pointer',
                      fontFamily: 'inherit',
                      transition: 'all 180ms ease',
                      backdropFilter: 'blur(6px)',
                    }}
                  >
                    <span
                      style={{
                        width: 20,
                        height: 20,
                        borderRadius: '50%',
                        background: isActive ? 'var(--lux-gold)' : 'rgba(255,255,255,0.06)',
                        color: isActive ? '#0A0A0A' : 'rgba(232,224,212,0.5)',
                        fontSize: 9,
                        fontWeight: 800,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                      }}
                    >
                      {o.id}
                    </span>
                    <span
                      style={{
                        fontSize: 10,
                        color: isActive ? '#E8E0D4' : 'rgba(232,224,212,0.55)',
                        fontWeight: 600,
                      }}
                    >
                      {o.name}
                    </span>
                    <span
                      style={{
                        fontSize: 10,
                        color: isActive ? 'var(--lux-gold)' : 'rgba(212,168,83,0.4)',
                        fontWeight: 700,
                        marginLeft: 4,
                      }}
                    >
                      {optionTotals && optionTotals[o.id] > 0
                        ? `$${Math.round(optionTotals[o.id]).toLocaleString()}`
                        : '\u2014'}
                    </span>
                  </button>
                );
              })}
            </div>
          )}

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
              {/* 3D Deck Preview */}
              <div
                style={{
                  flex: '0 0 45%',
                  borderRadius: 10,
                  border: '1px solid rgba(212,168,83,0.08)',
                  background: '#080808',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  position: 'relative',
                  overflow: 'hidden',
                }}
              >
                <DeckPreview3D
                  deckColor={getPreviewColor(activeDecking?.id)}
                  showRailing={Array.isArray(selections.railing) ? selections.railing.length > 0 : !!selections.railing}
                />

                {/* Visual approximation label */}
                <div
                  style={{
                    position: 'absolute',
                    top: 10,
                    left: 0,
                    right: 0,
                    textAlign: 'center',
                    pointerEvents: 'none',
                  }}
                >
                  <span
                    style={{
                      fontSize: 8,
                      letterSpacing: 2,
                      color: 'rgba(212,168,83,0.25)',
                      textTransform: 'uppercase',
                      fontFamily: "'DM Sans', sans-serif",
                    }}
                  >
                    VISUAL APPROXIMATION
                  </span>
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
                {/* ROUND 6 FIX 2 — Tier legend strip. Only renders for
                    decking + skirting (the two categories where tier badges
                    actually appear on cards). Left cluster: TIERS label + 4
                    mini coin badges with tier names. Right: sort-by-tier
                    toggle (FIX 3). */}
                {tierSortable && (
                  <div
                    style={{
                      flexShrink: 0,
                      height: 32,
                      background: 'rgba(212,168,83,0.02)',
                      borderTop: '1px solid rgba(212,168,83,0.06)',
                      borderBottom: '1px solid rgba(212,168,83,0.06)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '0 10px',
                      marginBottom: 8,
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 16,
                      }}
                    >
                      <span
                        style={{
                          fontSize: 8,
                          letterSpacing: 2,
                          color: 'rgba(212,168,83,0.4)',
                          textTransform: 'uppercase',
                          fontWeight: 700,
                        }}
                      >
                        Tiers
                      </span>
                      {(['select', 'premium', 'elite', 'signature'] as TierKey[]).map(
                        (key) => (
                          <div
                            key={key}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: 6,
                            }}
                          >
                            <div
                              style={{
                                width: 16,
                                height: 16,
                                borderRadius: '50%',
                                background: TIER_BADGE[key].bg,
                                border: `1px solid ${TIER_BADGE[key].ring}`,
                                boxShadow: `${TIER_BADGE[key].innerShadow}, 0 1px 3px rgba(0,0,0,0.35)`,
                                flexShrink: 0,
                              }}
                            />
                            <span
                              style={{
                                fontSize: 9,
                                letterSpacing: 1.5,
                                color: 'rgba(255,255,255,0.55)',
                                textTransform: 'uppercase',
                                fontWeight: 600,
                              }}
                            >
                              {TIER_BADGE[key].label}
                            </span>
                          </div>
                        )
                      )}
                    </div>
                    {/* ROUND 6 FIX 3 — Sort-by-tier toggle. Persists across
                        category switches; treated as a preference, not a
                        per-tab setting. */}
                    <button
                      type="button"
                      onClick={() => setSortByTier((v) => !v)}
                      style={{
                        padding: '6px 14px',
                        borderRadius: 4,
                        border: sortByTier
                          ? 'none'
                          : '1px solid rgba(212,168,83,0.20)',
                        background: sortByTier ? '#D4A853' : 'transparent',
                        color: sortByTier ? '#0A0A0A' : 'rgba(212,168,83,0.5)',
                        fontSize: 9,
                        letterSpacing: 2,
                        fontWeight: 700,
                        textTransform: 'uppercase',
                        cursor: 'pointer',
                        fontFamily: 'inherit',
                        lineHeight: 1,
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {sortByTier ? '\u2713 Sorted by Tier' : 'Sort by Tier'}
                    </button>
                  </div>
                )}
                {activeCategory === 'framing' ? (
                  <FramingVisualizer
                    selectedOption={selections.framing}
                    dimensions={dimensions}
                    onSelectOption={(optionId) => {
                      if (optionId === '__deselect__') {
                        setSelections({ ...selections, framing: null });
                        return;
                      }
                      const opt = (PRICING_DATA.find((c) => c.id === 'framing')?.options ?? [])
                        .find((o) => o.id === optionId);
                      if (!opt) return;
                      handleOptionClick('framing', opt);
                    }}
                    getImpactValue={(optionId) => {
                      const opt = (PRICING_DATA.find((c) => c.id === 'framing')?.options ?? [])
                        .find((o) => o.id === optionId);
                      if (!opt) return 0;
                      return getOptionImpactValue('framing', opt);
                    }}
                  />
                ) : activeCategory === 'foundation' ? (
                  <FoundationVisualizer
                    selectedOption={selections.foundation}
                    dimensions={dimensions}
                    onSelectOption={(optionId) => {
                      if (optionId === '__deselect__') {
                        setSelections({ ...selections, foundation: null });
                        return;
                      }
                      const opt = (PRICING_DATA.find((c) => c.id === 'foundation')?.options ?? [])
                        .find((o) => o.id === optionId);
                      if (!opt) return;
                      handleOptionClick('foundation', opt);
                    }}
                    getImpactValue={(optionId) => {
                      const opt = (PRICING_DATA.find((c) => c.id === 'foundation')?.options ?? [])
                        .find((o) => o.id === optionId);
                      if (!opt) return 0;
                      return getOptionImpactValue('foundation', opt);
                    }}
                  />
                ) : (
                <div
                  style={{
                    display: 'grid',
                    // FIX 4 — minmax(0, 1fr) prevents grid items from growing
                    // past their cell when price-delta text appears.
                    gridTemplateColumns:
                      orderedOptions.length <= 4
                        ? `repeat(${Math.max(orderedOptions.length, 1)}, minmax(0, 1fr))`
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
                  {orderedOptions.map((opt) => {
                    const sel = isOptionSelected(activeCategory, opt);
                    const impact = getOptionImpactValue(activeCategory, opt);
                    // Image resolution order: price book upload -> manufacturer
                    // texture CDN -> color gradient fallback (rendered as the
                    // strip's background below). The gradient always stays as
                    // the strip background so a 404'd <img> with display:none
                    // onError still shows a realistic colour swatch.
                    const priceBookUrl = priceBookImages.get(opt.id);
                    const manufacturerUrl = TIER_TO_TEXTURE_URL[opt.id];
                    const imageUrl = priceBookUrl || manufacturerUrl;
                    const hasImg = Boolean(imageUrl);
                    // FIX 1 — lighting (accessories) cards ALWAYS show steppers.
                    const isLighting = activeCategory === 'accessories';
                    // ROUND 5 / ROUND 10 FIX 3 — categories that render the full
                    // 80px visual image strip at the top of the card. Lighting
                    // (accessories) is now included so Jack can upload fixture
                    // photos via Settings > Price Book. Non-visual categories
                    // (design/foundation/framing/extras/protection) skip the
                    // strip and use a taller text layout so the stepper /
                    // price line stays visible.
                    const hasImageStrip =
                      activeCategory === 'decking' ||
                      activeCategory === 'railing' ||
                      activeCategory === 'skirting' ||
                      activeCategory === 'privacy' ||
                      activeCategory === 'pergolas' ||
                      activeCategory === 'accessories';
                    // ROUND 5 FIX / ROUND 10 FIX 3 — explicit card minHeight so
                    // the grid cannot collapse rows. Lighting cards need 180px
                    // (80px strip + stepper row + description) so nothing
                    // clips. Other strip categories stay at 170px; non-strip
                    // categories at 140px.
                    const cardMinHeight = isLighting ? 210 : hasImageStrip ? 170 : 140;
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
                    // ROUND 10 FIX 4 — warranty badge only renders on the
                    // extended 10-year warranty card within the protection
                    // category. If the category grows to multiple tiers
                    // later, this flag should check for the elite/extended
                    // tier item only.
                    const isWarrantyCard =
                      activeCategory === 'protection' && opt.id === 'ext_warranty_10';

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
                        // ROUND 10 FIX 4 — position: relative so the warranty
                        // certification badge can anchor top-right of the
                        // card for protection-category items.
                        style={{
                          minWidth: 0,
                          minHeight: isWarrantyCard ? 200 : cardMinHeight,
                          overflow: 'hidden',
                          position: 'relative',
                        }}
                      >
                        {/* ROUND 10 FIX 4 — 10-Year Craftsmanship Warranty
                            certified stamp. Octagonal gold badge with
                            radial gradient matching the SIGNATURE coin
                            palette. Three-line type inside reads as a
                            certified seal. Rendered only on the extended
                            warranty card. */}
                        {isWarrantyCard && (
                          <div
                            style={{
                              position: 'absolute',
                              top: 10,
                              right: 10,
                              width: 80,
                              height: 80,
                              clipPath:
                                'polygon(30% 0, 70% 0, 100% 30%, 100% 70%, 70% 100%, 30% 100%, 0 70%, 0 30%)',
                              background:
                                'radial-gradient(circle at 30% 25%, #F5D487 0%, #D4A853 45%, #A88238 100%)',
                              boxShadow:
                                'inset 0 2px 4px rgba(255,255,255,0.4), inset 0 -2px 4px rgba(0,0,0,0.25), 0 4px 12px rgba(0,0,0,0.45)',
                              display: 'flex',
                              flexDirection: 'column',
                              alignItems: 'center',
                              justifyContent: 'center',
                              gap: 1,
                              padding: '2px',
                              pointerEvents: 'none',
                              zIndex: 5,
                              textAlign: 'center',
                            }}
                          >
                            <div
                              style={{
                                fontSize: 10,
                                fontWeight: 800,
                                color: '#0A0A0A',
                                fontFamily: FONT_DISPLAY,
                                letterSpacing: 0.5,
                                lineHeight: 1,
                              }}
                            >
                              10-YEAR
                            </div>
                            <div
                              style={{
                                fontSize: 6,
                                fontWeight: 700,
                                color: '#0A0A0A',
                                fontFamily: FONT_BODY,
                                letterSpacing: 0.8,
                                lineHeight: 1,
                                textTransform: 'uppercase',
                              }}
                            >
                              Craftsmanship
                            </div>
                            <div
                              style={{
                                fontSize: 7,
                                fontWeight: 800,
                                color: '#0A0A0A',
                                fontFamily: FONT_DISPLAY,
                                letterSpacing: 1.2,
                                lineHeight: 1,
                                textTransform: 'uppercase',
                              }}
                            >
                              Warranty
                            </div>
                            <div
                              style={{
                                fontSize: 9,
                                color: 'rgba(10,10,10,0.55)',
                                lineHeight: 0.8,
                                marginTop: 1,
                              }}
                            >
                              {'\u2605\u2605\u2605'}
                            </div>
                          </div>
                        )}
                        {/* Image / swatch — only for categories with visual material */}
                        {hasImageStrip && (
                          <div
                            style={{
                              // ROUND 5 FIX — 80px strip per spec (was 72).
                              // flexShrink 0 prevents the strip from being
                              // crushed when card height is tight.
                              // ROUND 8 — gradient is ALWAYS the background so
                              // it shows through if the manufacturer <img>
                              // 404s (onError hides the broken img; the
                              // gradient beneath remains visible).
                              // ROUND 10 FIX 3 — lighting cards with NO image
                              // use a near-black placeholder background
                              // instead of the loud colour gradient, so the
                              // empty slot reads as a clean upload target.
                              height: 80,
                              flexShrink: 0,
                              position: 'relative',
                              overflow: 'hidden',
                              // ROUND 12 — lighting (accessories) cards use a
                              // subtle light background ALWAYS (empty or with
                              // photo). IN-LITE product shots are transparent
                              // PNGs on white/neutral; the 0.02 white tint
                              // gives breathing room around the fixture
                              // silhouette instead of a dark dead space, while
                              // decking grain textures keep their colour
                              // gradient for the fallback-on-404 case.
                              background: isLighting
                                ? 'rgba(255,255,255,0.92)'
                                : `linear-gradient(135deg, ${opt.imageColor}, ${shade(
                                    opt.imageColor,
                                    -0.2
                                  )})`,
                            }}
                          >
                            {imageUrl && (
                              <img
                                src={imageUrl}
                                alt={opt.name}
                                loading="lazy"
                                onError={(e) => {
                                  (e.currentTarget as HTMLImageElement).style.display = 'none';
                                }}
                                style={{
                                  position: 'absolute',
                                  inset: 0,
                                  width: '100%',
                                  height: '100%',
                                  // ROUND 12 — lighting (accessories) uses
                                  // 'contain' so the full IN-LITE fixture
                                  // silhouette is visible with padding around
                                  // it; decking / railing / skirting grain
                                  // textures keep 'cover' for the tight crop.
                                  objectFit:
                                    activeCategory === 'accessories'
                                      ? 'contain'
                                      : 'cover',
                                  display: 'block',
                                  // z-index 1: sits above the gradient bg but
                                  // below the brand label (z-index 2) and the
                                  // tier coin (z-index 3).
                                  zIndex: 1,
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
                            {/* ROUND 10 FIX 3 — "NO IMAGE" placeholder for
                                lighting cards without an uploaded photo.
                                Signals to Jack where to drop fixture photos
                                via Settings > Price Book. */}
                            {isLighting && !hasImg && (
                              <div
                                style={{
                                  position: 'absolute',
                                  inset: 0,
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  fontSize: 7,
                                  letterSpacing: 2,
                                  textTransform: 'uppercase',
                                  color: 'rgba(212,168,83,0.2)',
                                  fontWeight: 700,
                                  fontFamily: FONT_BODY,
                                  pointerEvents: 'none',
                                }}
                              >
                                No Image
                              </div>
                            )}
                            {/* ROUND 10 FIX 2b — Tier coin MOVED from the
                                image strip to the dark content area below
                                (rendered at the bottom of the content
                                block). This change keeps the photo clean
                                for the material grain and puts the tier
                                indicator in the text area where it can't
                                fight the checkmark for attention. */}
                            {/* Selected checkmark stays at bottom-right of
                                image strip — it is the selected-state
                                indicator on the photo, distinct from the
                                tier coin in the content area. */}
                            {sel && (
                              <div
                                style={{
                                  position: 'absolute',
                                  bottom: 6,
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
                            // ROUND 10 FIX 2b — position relative so the tier
                            // coin (absolutely positioned, bottom-right) can
                            // anchor inside the content area instead of the
                            // image strip.
                            position: 'relative',
                          }}
                        >
                          {/* ROUND 10 FIX 2b — Tier coin, now in the dark
                              content area at bottom-right. Reads as a
                              brushed-metal sticker on dark wood. Tooltip
                              label for QA / desktop hover. */}
                          {tier && (
                            <div
                              title={TIER_BADGE[tier].label}
                              style={{
                                width: 24,
                                height: 24,
                                borderRadius: '50%',
                                background: TIER_BADGE[tier].bg,
                                border: `1.5px solid ${TIER_BADGE[tier].ring}`,
                                boxShadow: `${TIER_BADGE[tier].innerShadow}, 0 2px 6px rgba(0,0,0,0.4)`,
                                position: 'absolute',
                                bottom: 10,
                                right: 10,
                                zIndex: 4,
                                flexShrink: 0,
                              }}
                            />
                          )}
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
                              WebkitBoxOrient: 'vertical' as 'vertical',
                            }}
                          >
                            {opt.description}
                          </div>

                          {/* View Gallery button for privacy wall cards */}
                          {activeCategory === 'privacy' &&
                            PRIVACY_GALLERY_IMAGES[opt.id] &&
                            PRIVACY_GALLERY_IMAGES[opt.id].length > 1 && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setGalleryProductName(opt.name);
                                  setGalleryImages(
                                    PRIVACY_GALLERY_IMAGES[opt.id]
                                  );
                                  setGalleryOpen(true);
                                }}
                                style={{
                                  marginTop: 6,
                                  padding: '4px 12px',
                                  fontSize: 9,
                                  fontWeight: 600,
                                  fontFamily: FONT_BODY,
                                  letterSpacing: 1.2,
                                  textTransform: 'uppercase',
                                  color: 'var(--lux-gold)',
                                  background: 'transparent',
                                  border: '1px solid rgba(212,168,83,0.45)',
                                  borderRadius: 4,
                                  cursor: 'pointer',
                                  transition:
                                    'border-color 0.2s, background 0.2s',
                                  alignSelf: 'flex-start',
                                }}
                                onMouseEnter={(e) => {
                                  e.currentTarget.style.borderColor =
                                    '#D4A853';
                                  e.currentTarget.style.background =
                                    'rgba(212,168,83,0.08)';
                                }}
                                onMouseLeave={(e) => {
                                  e.currentTarget.style.borderColor =
                                    'rgba(212,168,83,0.45)';
                                  e.currentTarget.style.background =
                                    'transparent';
                                }}
                              >
                                View Gallery
                              </button>
                            )}

                          {isQty ? (
                            <div
                              onClick={(e) => e.stopPropagation()}
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: 8,
                                marginTop: 'auto',
                                paddingTop: 8,
                                minWidth: 0,
                              }}
                            >
                              {/* Unit price on the left for lighting cards */}
                              {isLighting && opt.priceDelta > 0 && (
                                <div style={{
                                  fontSize: 13,
                                  fontWeight: 700,
                                  color: 'var(--lux-gold)',
                                  fontFamily: FONT_DISPLAY,
                                  whiteSpace: 'nowrap',
                                  flexShrink: 0,
                                  marginRight: 'auto',
                                }}>
                                  ${Math.round(opt.priceDelta)}
                                  <span style={{ fontSize: 8, fontWeight: 500, color: 'var(--est-text-secondary)', marginLeft: 2 }}>ea</span>
                                </div>
                              )}
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
                )}

                {/* FIX 5 — bottom chip strip removed; itemized list now lives under the price plaque */}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Privacy wall product gallery lightbox */}
      <ProductGallery
        isOpen={galleryOpen}
        onClose={() => setGalleryOpen(false)}
        productName={galleryProductName}
        images={galleryImages}
      />
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
