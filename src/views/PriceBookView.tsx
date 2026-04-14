import React, { useState, useRef, useCallback } from 'react';
import {
  ArrowLeft, Plus, Search, Pencil, Trash2, X, Check, BookOpen,
  Ruler, Anchor, LayoutGrid, Leaf, Layers, Frame, TrendingUp,
  AlignJustify, Lightbulb, GitBranch, Box, Shield, PlusCircle,
  Umbrella, Hexagon, Gift, ChevronRight, Upload,
  ToggleLeft, ToggleRight, Calendar, Users, Zap, Building2
} from 'lucide-react';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface PriceBookCategory {
  id: string;
  name: string;
  imageUrl?: string;
  order: number;
}

export interface PriceBookItem {
  id: string;
  categoryId: string;
  name: string;
  description: string;
  price: number;
  cost: number;
  unit: string;
  taxable: boolean;
  imageUrl?: string;
  isActive: boolean;
}

// ── Persistence ───────────────────────────────────────────────────────────────

const STORAGE_KEY = 'fieldpro_price_book';

export function loadPriceBook(): { categories: PriceBookCategory[]; items: PriceBookItem[] } {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {
    // fall through to defaults
  }
  return { categories: DEFAULT_CATEGORIES, items: DEFAULT_ITEMS };
}

export function savePriceBook(cats: PriceBookCategory[], items: PriceBookItem[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ categories: cats, items }));
}

// ── Icon Mapping (not serialised — functions can't go in JSON) ────────────────

type LucideIcon = React.FC<{ className?: string }>;

const CATEGORY_ICON_MAP: Record<string, LucideIcon> = {
  cat_design:   Ruler,
  cat_footings: Anchor,
  cat_framing:  LayoutGrid,
  cat_landscape: Leaf,
  cat_decking:  Layers,
  cat_picframe: Frame,
  cat_steps:    TrendingUp,
  cat_fascia:   AlignJustify,
  cat_lighting: Lightbulb,
  cat_railings: GitBranch,
  cat_skirting: Box,
  cat_privacy:  Shield,
  cat_addons:   PlusCircle,
  cat_pergolas: Umbrella,
  cat_poolfence: Hexagon,
  cat_promo:    Gift,
};

// Slug → icon for the "new category" icon picker
const ICON_SLUG_OPTIONS: { slug: string; label: string; Icon: LucideIcon }[] = [
  { slug: 'Ruler',       label: 'Ruler',       Icon: Ruler },
  { slug: 'Anchor',      label: 'Anchor',      Icon: Anchor },
  { slug: 'LayoutGrid',  label: 'Grid',        Icon: LayoutGrid },
  { slug: 'Leaf',        label: 'Leaf',        Icon: Leaf },
  { slug: 'Layers',      label: 'Layers',      Icon: Layers },
  { slug: 'Frame',       label: 'Frame',       Icon: Frame },
  { slug: 'TrendingUp',  label: 'Trending',    Icon: TrendingUp },
  { slug: 'AlignJustify', label: 'Justify',    Icon: AlignJustify },
  { slug: 'Lightbulb',   label: 'Lightbulb',  Icon: Lightbulb },
  { slug: 'GitBranch',   label: 'Branch',      Icon: GitBranch },
  { slug: 'Box',         label: 'Box',         Icon: Box },
  { slug: 'Shield',      label: 'Shield',      Icon: Shield },
  { slug: 'PlusCircle',  label: 'Plus',        Icon: PlusCircle },
  { slug: 'Umbrella',    label: 'Umbrella',    Icon: Umbrella },
  { slug: 'Hexagon',     label: 'Hexagon',     Icon: Hexagon },
  { slug: 'Gift',        label: 'Gift',        Icon: Gift },
  { slug: 'BookOpen',    label: 'Book',        Icon: BookOpen },
];

const SLUG_TO_ICON: Record<string, LucideIcon> = Object.fromEntries(
  ICON_SLUG_OPTIONS.map(o => [o.slug, o.Icon])
);

// ── Unit Options ──────────────────────────────────────────────────────────────

const UNIT_OPTIONS = ['Sq. Ft.', 'L.F.', 'Each', 'Per Ft.', 'Per Hour', 'Flat Rate', 'Custom...'];

// ── Default Data ──────────────────────────────────────────────────────────────

const DEFAULT_CATEGORIES: PriceBookCategory[] = [
  { id: 'cat_design',   name: 'Design / Engineer', order: 1 },
  { id: 'cat_footings', name: 'Footings',           order: 2 },
  { id: 'cat_framing',  name: 'Framing',            order: 3 },
  { id: 'cat_landscape',name: 'Landscape',          order: 4 },
  { id: 'cat_decking',  name: 'Decking',            order: 5 },
  { id: 'cat_picframe', name: 'Picture Frame',      order: 6 },
  { id: 'cat_steps',    name: 'Steps',              order: 7 },
  { id: 'cat_fascia',   name: 'Fascia',             order: 8 },
  { id: 'cat_lighting', name: 'Lighting',           order: 9 },
  { id: 'cat_railings', name: 'Railings',           order: 10 },
  { id: 'cat_skirting', name: 'Skirting',           order: 11 },
  { id: 'cat_privacy',  name: 'Privacy Wall',       order: 12 },
  { id: 'cat_addons',   name: "Add-On's",           order: 13 },
  { id: 'cat_pergolas', name: 'Pergolas',           order: 14 },
  { id: 'cat_poolfence',name: 'Glass Pool Fence',   order: 15 },
  { id: 'cat_promo',    name: 'Promo Packages',     order: 16 },
];

function item(
  id: string, categoryId: string, name: string, description: string,
  price: number, cost: number, unit: string, taxable: boolean
): PriceBookItem {
  return { id, categoryId, name, description, price, cost, unit, taxable, isActive: true };
}

const DEFAULT_ITEMS: PriceBookItem[] = [
  // Design / Engineer
  item('item_001','cat_design','Standard 3D design','Work with Luxury Decking design expert to render standard 3D drawings of proposed deck. Up to 3 revisions included. (not for permit)',99.95,25.00,'Each',true),
  item('item_002','cat_design','Architectural Drawing','Supply architectural drawings needed to apply for permit. Includes 1 revision',399.95,0,'Each',true),
  item('item_003','cat_design','Engineer Stamp','Supply Engineer stamp for deck drawings',399.95,0,'Each',true),
  item('item_004','cat_design','Permit fee (city of Ottawa)','Fee for Permit $80 min + 1% of total job',80.00,0,'Each',true),
  item('item_005','cat_design','Helical pile Engineer Stamped report','To supply engineered stamp report for permit approval',399.00,0,'Each',true),

  // Footings
  item('item_010','cat_footings','Standard Deck Block footing','To supply and install standard deck block footings',0.00,0,'Each',false),
  item('item_011','cat_footings','48" Dug cement footing','To supply and install 48" dug cement poured footing',279.00,0,'Each',true),
  item('item_012','cat_footings','Helical pile footings','To supply and install 7\'8" Helical pile footing complete with post saddle',469.00,0,'Each',true),

  // Framing
  item('item_020','cat_framing','STANDARD - 2X8 PT Framed 16" OC','To supply and install all materials needed to build frame using 2X8 pressure treated wood, Framed 16" on center.',0.00,0,'Sq. Ft.',true),
  item('item_021','cat_framing','UPGRADE - 2X8 PT Framed 12" OC','To supply and install all materials needed to build frame using 2X8 pressure treated wood, Framed 12" on center.',1.95,0,'Sq. Ft.',true),
  item('item_022','cat_framing','UPGRADE - 2X10 PT Framed 16" OC','To supply and install all materials needed to build frame using 2X10 pressure treated wood, Framed 16" on center.',4.49,0,'Sq. Ft.',true),
  item('item_023','cat_framing','UPGRADE - 2X10 PT Framed 12" OC','To supply and install all materials needed to build frame using 2X10 pressure treated wood, Framed 12" on center.',6.49,0,'Sq. Ft.',true),
  item('item_024','cat_framing','UPGRADE - Fiberglass Framing','To supply and install 2X8 Fiberglass framing. + Delivery charge (TBD)',29.95,0,'Sq. Ft.',true),

  // Landscape
  item('item_030','cat_landscape','Landscape fabric + Stone','To supply and install commercial grade landscape fabric. To supply and install 2 to 3 inch layer of 3/4" clear stone.',5.49,0,'Sq. Ft.',true),
  item('item_031','cat_landscape','River wash stone','To supply and install commercial grade landscape fabric. To supply and install 2 to 3 inch layer of River wash stone. Minimum charge = $750',6.95,0,'Sq. Ft.',true),
  item('item_032','cat_landscape','Mulch','To supply and install commercial grade landscape fabric. To supply and install 2 to 3 inch layer of Mulch. Minimum charge = $650',5.95,0,'Sq. Ft.',true),
  item('item_033','cat_landscape','Stepping stone','To supply and install stepping stone',79.00,0,'Each',true),

  // Decking
  item('item_040','cat_decking','Pressure treated wood decking','To supply and install 5/4 pressure treated wood deck boards, Screwed to frame.',28.95,0,'Sq. Ft.',true),
  item('item_041','cat_decking','Cedar wood decking','To supply and install 5/4 Cedar wood deck boards, Screwed to frame.',34.95,0,'Sq. Ft.',true),
  item('item_042','cat_decking','FiberOn Composite - Goodlife "Weekender" 25yr','To supply and install FiberOn Composite deck boards, Goodlife - "Weekender" collection, 25 year warranty. To supply and install Hidden fasteners. Available in 2 colors.',44.95,0,'Sq. Ft.',true),
  item('item_043','cat_decking','FiberOn Composite - Goodlife "Escapes" 30yr','To supply and install FiberOn Composite deck boards, Goodlife - "Escapes" collection, 30 year warranty. To supply and install Hidden fasteners. Available in 4 colors.',49.95,0,'Sq. Ft.',true),
  item('item_044','cat_decking','FiberOn Composite - Sanctuary 40yr','To supply and install FiberOn Composite deck boards, "Sanctuary" collection, 40 year warranty. To supply and install Hidden fasteners. Available in 5 colors.',55.95,0,'Sq. Ft.',true),
  item('item_045','cat_decking','FiberOn Composite - Concordia 50yr','To supply and install FiberOn Composite deck boards, "Concordia" collection, 50 year warranty. To supply and install Hidden fasteners. Available in 8 colors.',61.95,0,'Sq. Ft.',true),
  item('item_046','cat_decking','FiberOn PVC - Paramount 50yr','To supply and install FiberOn PVC deck boards, "Paramount" collection, 50 year warranty. To supply and install Hidden fasteners. Available in 4 colors.',63.95,0,'Sq. Ft.',true),
  item('item_047','cat_decking','FiberOn PVC - Promenade 50yr','To supply and install FiberOn PVC deck boards, "Promenade" collection, 50 year warranty. To supply and install Hidden fasteners. Available in 6 colors.',65.95,0,'Sq. Ft.',true),

  // Picture Frame
  item('item_050','cat_picframe','Single board "Picture frame" border','To supply and install all materials needed to modify and build frame in order to receive picture frame border. To supply and install single board picture frame border. To supply and install hidden fastening system for borders.',19.95,0,'Sq. Ft.',true),
  item('item_051','cat_picframe','Double board "Picture Frame" border','To supply and install all materials needed to modify and build frame in order to receive picture frame border. To supply and install double board picture frame border. To supply and install hidden fastening system for borders.',29.95,0,'Sq. Ft.',true),

  // Steps
  item('item_060','cat_steps','Pressure treated wood steps','To supply and install all materials needed to build Pressure treated wood steps. Priced per foot.',44.95,0,'Each',true),
  item('item_061','cat_steps','STEPS - FiberOn Goodlife "Weekender" 25yr','To supply and install all materials needed to build composite steps. Priced per foot.',59.95,0,'Each',true),
  item('item_062','cat_steps','STEPS - FiberOn Goodlife "Escapes" 30yr','To supply and install all materials needed to build composite steps. Priced per foot.',63.95,0,'Each',true),
  item('item_063','cat_steps','STEPS - FiberOn Sanctuary 40yr','To supply and install all materials needed to build composite steps. Priced per foot.',69.95,0,'Each',true),
  item('item_064','cat_steps','STEPS - FiberOn Concordia 50yr','To supply and install all materials needed to build composite steps. Priced per foot.',73.95,0,'Each',true),
  item('item_065','cat_steps','STEPS - FiberOn PVC Paramount 50yr','To supply and install all materials needed to build composite steps. Priced per foot.',78.95,0,'Each',true),
  item('item_066','cat_steps','STEPS - FiberOn PVC Promenade 50yr','To supply and install all materials needed to build composite steps. Priced per foot.',87.95,0,'Each',true),

  // Fascia
  item('item_070','cat_fascia','FASCIA - FiberOn Goodlife "Weekender" 25yr','To supply and install FiberOn composite fascia to perimeter of deck. Priced by the foot.',24.95,0,'Each',true),
  item('item_071','cat_fascia','FASCIA - FiberOn Goodlife "Escapes" 30yr','To supply and install FiberOn composite fascia to perimeter of deck. Priced by the foot.',27.95,0,'Each',true),
  item('item_072','cat_fascia','FASCIA - FiberOn Sanctuary 40yr','To supply and install FiberOn composite fascia to perimeter of deck. Priced by the foot.',29.95,0,'Each',true),
  item('item_073','cat_fascia','FASCIA - FiberOn Concordia 50yr','To supply and install FiberOn composite fascia to perimeter of deck. Priced by the foot.',34.95,0,'Each',true),
  item('item_074','cat_fascia','FASCIA - FiberOn PVC Paramount 50yr','To supply and install FiberOn PVC fascia to perimeter of deck. Priced by the foot.',34.95,0,'Each',true),
  item('item_075','cat_fascia','FASCIA - FiberOn PVC Promenade 50yr','To supply and install FiberOn PVC fascia to perimeter of deck. Priced by the foot.',39.95,0,'Each',true),

  // Lighting
  item('item_080','cat_lighting','Standard 8 pack LED lighting','To supply and install up to 8 LED deck lights, with plug in for power',595.00,0,'Each',true),
  item('item_081','cat_lighting','Standard 16 pack LED lighting','To supply and install up to 16 LED deck lights, with plug in for power',849.00,0,'Each',true),
  item('item_082','cat_lighting','IN-LITE Smart Hub-150','To supply and install the SMART HUB-150 transformer, controlled exclusively by the in-lite smartphone app. 5 year warranty.',695.00,0,'Each',true),
  item('item_083','cat_lighting','IN-LITE Smart Hub Protector','The SMART HUB PROTECTOR protects the in-lite SMART HUB-150 transformer installed outdoors from extreme weather patterns.',69.95,0,'Each',true),
  item('item_084','cat_lighting','IN-LITE Smart Move','Wireless SMART MOVE motion detector for the SMART HUB-150 transformer. Bluetooth connectivity and solar cells, no cable needed. 5 year warranty.',189.95,0,'Each',true),
  item('item_085','cat_lighting','IN-LITE Move','High-quality wired motion detector for HUB-50 & HUB-100. Detects up to 10 meters. Adjustable for 1, 3 or 9 minutes. 5 year warranty.',99.95,0,'Each',true),
  item('item_086','cat_lighting','IN-LITE Hub-50','High-quality transformer, touch screen, max 50 VA, two cable outlets, light sensor, expandable with motion detector. 5 year warranty.',399.00,0,'Each',true),
  item('item_087','cat_lighting','IN-LITE Hub-100','High-quality transformer, touch screen, max 100 VA, two cable outlets, light sensor, expandable with motion detector. 5 year warranty.',449.00,0,'Each',true),
  item('item_088','cat_lighting','IN-LITE Hub Protector','Protects the in-lite HUB-50 and HUB-100 transformers from extreme weather patterns.',69.95,0,'Each',true),
  item('item_089','cat_lighting','IN-LITE Hyve 22 RVS Warm','Subtle 22mm diameter fixture with stainless steel ring. EASY-LOCK supplied as standard. Produces eye-catching lighting effect. Designed for deck edges. 5 year warranty.',149.00,0,'Each',true),
  item('item_090','cat_lighting','IN-LITE Cubid Dark','Subtle cube-shaped wall fixture, dark gray coated aluminum, warm white light. Available in white, dark, silver. 5 year warranty.',169.00,0,'Each',true),
  item('item_091','cat_lighting','IN-LITE Ace Up-Down','Wall fixture providing focused beam of light both upwards and downwards. Designed for illuminating a fence or wall. 5 year warranty.',349.00,0,'Each',true),
  item('item_092','cat_lighting','IN-LITE Wedge Slim','Slim wall fixture with wide light beam, perfect for directional lighting on low walls or along driveways. Available in three sizes. 5 year warranty.',249.00,0,'Each',true),
  item('item_093','cat_lighting','IN-LITE Puck 22','Small ground light, perfect for subtle indication lighting along driveways, walkways, or deck edges. 5 year warranty.',169.00,0,'Each',true),
  item('item_094','cat_lighting','IN-LITE Mini Wedge','Small wall light with subtle diffuse lighting. Creates beautiful effects on low walls, borders, or along steps. 5 year warranty.',179.00,0,'Each',true),
  item('item_095','cat_lighting','IN-LITE Liv Low','Low above ground fixture producing uniform warm white ambient light. Suitable for decks or borders. 5 year warranty.',269.00,0,'Each',true),
  item('item_096','cat_lighting','IN-LITE Sway Pearl','Flexible and versatile bollard producing unique 360° lighting effect. Perfect for lighting plants or grasses.',279.00,0,'Each',true),
  item('item_097','cat_lighting','IN-LITE 6 Light Package','1x Hub-50, 1x Hub Protector, 6x Hyve 22 RVS Warm. Complete low-voltage lighting package. 5 year material warranty.',1249.00,0,'Each',true),

  // Railings
  item('item_100','cat_railings','Standard wood railings','To supply and install pressure treated wood railings with 2X2 P/T wood spindles',49.95,0,'Each',true),
  item('item_101','cat_railings','Wood railings with metal spindles','To supply and install pressure treated wood railings with black metal spindles.',59.95,0,'Each',true),
  item('item_102','cat_railings','Aluminum railings (per/ft)','To supply and install aluminum railings. 2 colors available.',61.95,0,'Each',true),
  item('item_103','cat_railings','Aluminum railings post','To supply and install all materials needed to modify and reinforce deck frame to receive post. To supply and install 3X3 Aluminum post bolted to deck.',119.00,0,'Each',true),
  item('item_104','cat_railings','Aluminum with Glass railings (per/ft)','To supply and install aluminum railings with tempered glass inserts.',149.00,0,'Each',true),
  item('item_105','cat_railings','Aluminum with Glass railings (post)','To supply and install all materials needed to modify and reinforce deck frame to receive post. To supply and install 3X3 Aluminum post bolted to deck.',149.00,0,'Each',true),
  item('item_106','cat_railings','Frameless Glass railings (per/ft)','To supply and install Frameless tempered glass railings',96.00,0,'Each',true),
  item('item_107','cat_railings','Frameless Glass railings (sections) max 60"','To supply and install all materials needed to install tempered glass railing sections, including stainless steel spigots.',295.00,0,'Each',true),

  // Skirting
  item('item_110','cat_skirting','Wood Skirting','To supply and install all materials needed to build Pressure treated wood skirting.',14.95,0,'Sq. Ft.',true),
  item('item_111','cat_skirting','PVC Skirting','To supply and install tongue and groove PVC skirting. Comes in 3 colors (white, gray, brown).',19.95,0,'Sq. Ft.',true),
  item('item_112','cat_skirting','SKIRT - FiberOn Goodlife "Weekender" 25yr','To supply and install all materials needed to build composite skirt. Colors to match decking.',29.95,0,'Sq. Ft.',true),
  item('item_113','cat_skirting','SKIRT - FiberOn Goodlife "Escapes" 30yr','To supply and install all materials needed to build composite skirt. Colors to match decking.',32.95,0,'Sq. Ft.',true),
  item('item_114','cat_skirting','SKIRT - FiberOn Sanctuary 40yr','To supply and install all materials needed to build composite skirt. Colors to match decking.',37.95,0,'Sq. Ft.',true),
  item('item_115','cat_skirting','SKIRT - FiberOn Concordia 50yr','To supply and install all materials needed to build composite skirt. Colors to match decking.',39.95,0,'Sq. Ft.',true),
  item('item_116','cat_skirting','SKIRT - FiberOn PVC Paramount 50yr','To supply and install all materials needed to build PVC skirt. Colors to match decking.',41.95,0,'Sq. Ft.',true),
  item('item_117','cat_skirting','SKIRT - FiberOn PVC Promenade 50yr','To supply and install all materials needed to build PVC skirt. Colors to match decking.',44.95,0,'Sq. Ft.',true),

  // Privacy Wall
  item('item_120','cat_privacy','Wood privacy wall','To supply and install all materials needed to build Pressure treated wood Privacy wall 6\' tall. Horizontal or vertical.',79.00,0,'Each',true),
  item('item_121','cat_privacy','PVC Privacy wall','To supply and install 3X3 Aluminum post where needed. To supply and install PVC tongue and groove boards, Horizontal 6ft height. Comes in: Gray, Brown, White, Tan.',99.00,0,'Each',true),
  item('item_122','cat_privacy','Aluminum Privacy wall','To supply and install Aluminum post where needed bolted to frame. To supply and install 6\' aluminum privacy wall. Full or Semi privacy. Panels 84"x72".',195.00,0,'Each',true),
  item('item_123','cat_privacy','Hideaway Privacy screens','To supply and install 3"x3" Aluminum post (every 36") bolted to frame. To supply and install Hideaway privacy screens 36"x68". Comes in 9 patterns.',349.00,0,'Each',true),
  item('item_124','cat_privacy','Hideaway Privacy screen Planter','To supply and install 36"x72" Aluminum privacy wall with built-in planter. Comes in 8 different patterns.',1795.00,0,'Each',true),

  // Add-On's
  item('item_130','cat_addons','Removal and disposal','To remove and dispose of existing structure and debris. (per/sqft)',9.95,0,'Sq. Ft.',true),
  item('item_131','cat_addons','JoistGuard - Deck frame protection','To supply and install JoistGuard waterproof membrane to deck frame',2.49,0,'Sq. Ft.',true),
  item('item_132','cat_addons','Flashing/Siding along house (per/ft)','To supply and install all materials needed to remove and modify existing siding, add aluminum flashing and new "J-trim" where needed. In order to receive new Ledger board for deck framing.',49.95,0,'Each',true),

  // Pergolas
  item('item_140','cat_pergolas','10X10 Pressure treated Pergola','To supply and install all materials needed to build 10X10 Pressure treated wood pergola. Using 6X6 post, 2X8 main beams, 2X6 joist and 1-1/2" slats.',3995.00,0,'Each',true),
  item('item_141','cat_pergolas','12X12 Pressure treated pergola','To supply and install all materials needed to build 12X12 Pressure treated wood pergola. Using 6X6 post, 2X8 main beams, 2X6 joist and 1-1/2" slats.',4495.00,0,'Each',true),
  item('item_142','cat_pergolas','10X10 Cedar pergola','To supply and install all materials needed to build 10X10 Cedar wood pergola. Using 6X6 post, 2X8 main beams, 2X6 joist and 1-1/2" slats.',5495.00,0,'Each',true),
  item('item_143','cat_pergolas','12X12 Cedar pergola','To supply and install all materials needed to build 12X12 Cedar wood pergola. Using 6X6 post, 2X8 main beams, 2X6 joist and 1-1/2" slats.',6495.00,0,'Each',true),
  item('item_144','cat_pergolas','10X10 Hideaway Aluminum Screen Pergola','10X10 "Hideaway" Screen pergola, 8 different screen inserts. 100% Powder Coated Industrial Grade Aluminum. Limited Lifetime Warranty. Fully customizable.',10995.00,0,'Each',true),
  item('item_145','cat_pergolas','Luxury BioPergola 10X10 (manual)','To supply and install 10X10 aluminum bioclimatic Luxury pergola with MANUAL louvred roof.',9995.00,0,'Each',true),
  item('item_146','cat_pergolas','Luxury BioPergola 10X10 (motorized)','To supply and install 10X10 aluminum bioclimatic luxury pergola with MOTORIZED louvred roof. Integrated LED lighting.',11495.00,0,'Each',true),
  item('item_147','cat_pergolas','Luxury BioPergola 10X13 (manual)','To supply and install 10X13 aluminum bioclimatic luxury pergola with MANUAL operated louvered roof.',11995.00,0,'Each',true),
  item('item_148','cat_pergolas','Luxury BioPergola 10X13 (motorized)','To supply and install 10X13 aluminum bioclimatic luxury pergola with MOTORIZED operated louvered roof. Integrated LED lighting.',13495.00,0,'Each',true),
  item('item_149','cat_pergolas','Luxury BioPergola 13X13 (manual)','To supply and install 13X13 aluminum bioclimatic luxury pergola with MANUAL operated louvered roof.',13995.00,0,'Each',true),
  item('item_150','cat_pergolas','Luxury BioPergola 13X13 (motorized)','To supply and install 13X13 aluminum bioclimatic luxury pergola with MOTORIZED operated louvered roof. Integrated LED lighting.',15995.00,0,'Each',true),
  item('item_151','cat_pergolas','Luxury BioPergola 19X13 (manual)','To supply and install 19X13 aluminum bioclimatic luxury pergola with MANUAL operated louvered roof.',18995.00,0,'Each',true),
  item('item_152','cat_pergolas','Luxury BioPergola 19X13 (motorized)','To supply and install 19X13 aluminum bioclimatic luxury pergola with MOTORIZED operated louvered roof. Integrated LED lighting.',19995.00,0,'Each',true),
  item('item_153','cat_pergolas','Retractable screen (Manual) 10ft - 1 side','To supply and install manually operated retractable screen.',1495.00,0,'Each',true),
  item('item_154','cat_pergolas','Retractable screen (Manual) 13ft - 1 side','To supply and install manually operated retractable screen.',1695.00,0,'Each',true),
  item('item_155','cat_pergolas','Retractable screen (Motorized) 10ft - 1 side','To supply and install motor operated retractable screen.',2249.00,0,'Each',true),
  item('item_156','cat_pergolas','Retractable screen (Motorized) 13ft - 1 side','To supply and install motor operated retractable screen.',2449.00,0,'Each',true),
  item('item_157','cat_pergolas','BioPergola Privacy wall (10ft) 1 side','To supply and install Aluminum privacy wall.',1995.00,0,'Each',true),
  item('item_158','cat_pergolas','BioPergola Privacy wall (13ft) 1 side','To supply and install Aluminum privacy wall.',2395.00,0,'Each',true),

  // Glass Pool Fence
  item('item_160','cat_poolfence','Glass Pool Fence (48") per ft','To supply and install 48" tempered glass pool fence.',109.00,0,'Each',true),
  item('item_161','cat_poolfence','Glass Pool Fence (60") per ft','To supply and install 60" tempered glass pool fence.',119.00,0,'Each',true),
  item('item_162','cat_poolfence','Glass Pool Fence Panel install','To supply and install glass panel sections complete with necessary Stainless steel hardware. (per section)',295.00,0,'Each',true),
  item('item_163','cat_poolfence','Glass Pool Fence (48") GATE','To supply and install tempered glass gate with stainless steel hardware.',995.00,0,'Each',true),
  item('item_164','cat_poolfence','Glass Pool Fence (60") GATE','To supply and install tempered glass gate with stainless steel hardware. 36" wide.',1195.00,0,'Each',true),

  // Promo Packages
  item('item_170','cat_promo','12X12 Wood Promo package','To supply and install 12X12 floating deck frame using 2X8 PT wood framed 16" OC. Supply and install 5/4 PT deck boards. Up to 2 steps 48" wide included.',3995.00,0,'Each',true),
  item('item_171','cat_promo','12X12 Wood with railings Promo package','12X12 floating deck, 2X8 PT wood framed 16" OC. 5/4 PT deck boards. Up to 4 steps 48" wide. Standard PT wood railings with 2X2 PT spindles.',5995.00,0,'Each',true),
  item('item_172','cat_promo','12X12 FiberOn 25yr Promo package','Supply and install 12X12 floating deck, 2X8 PT framed 16" OC. FiberOn Goodlife "Weekender" composite boards with hidden fasteners. Up to 2 steps. Comes in 2 colors: Gray or Brown. 25 year material warranty.',7495.00,0,'Each',true),
  item('item_173','cat_promo','12X12 FiberOn 25yr with Railings Promo','Supply and install 12X12 floating deck, 2X8 PT framed 16" OC. FiberOn Goodlife "Weekender" composite boards. Up to 4 steps. Aluminum railings. Comes in 2 colors. 25 year material warranty.',9495.00,0,'Each',true),
];

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatCurrency(n: number): string {
  return n === 0 ? '$0.00' : `$${n.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}`;
}

function newId(): string {
  return `item_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;
}

function newCatId(): string {
  return `cat_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;
}

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

// ── Style constants ───────────────────────────────────────────────────────────

const inputCls = 'w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-[var(--text-primary)] focus:outline-none focus:border-[var(--brand-gold)]/50 transition-all placeholder:text-[var(--muted-text)]';
const labelCls = 'block text-[10px] font-black text-[var(--text-secondary)] uppercase tracking-[0.18em] mb-1';

// ── Sub-component: CategoryModal ──────────────────────────────────────────────

interface CategoryModalProps {
  initial?: PriceBookCategory;
  itemCount: number;
  onSave: (cat: PriceBookCategory) => void;
  onDelete?: () => void;
  onClose: () => void;
}

function CategoryModal({ initial, itemCount, onSave, onDelete, onClose }: CategoryModalProps) {
  const [name, setName] = useState(initial?.name ?? '');
  const [iconSlug, setIconSlug] = useState<string>(() => {
    if (initial?.id) {
      const Icon = CATEGORY_ICON_MAP[initial.id];
      const found = ICON_SLUG_OPTIONS.find(o => o.Icon === Icon);
      return found?.slug ?? 'BookOpen';
    }
    return 'BookOpen';
  });
  const [imageUrl, setImageUrl] = useState<string | undefined>(initial?.imageUrl);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const dataUrl = await readFileAsDataUrl(file);
    setImageUrl(dataUrl);
  };

  const handleSave = () => {
    if (!name.trim()) return;
    onSave({
      id: initial?.id ?? newCatId(),
      name: name.trim(),
      imageUrl,
      order: initial?.order ?? 99,
    });
  };

  const PreviewIcon = SLUG_TO_ICON[iconSlug] ?? BookOpen;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-[#111] border border-white/10 rounded-2xl w-full max-w-md shadow-2xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
          <h2 className="text-sm font-black text-[var(--text-primary)] uppercase tracking-widest">
            {initial ? 'Edit Category' : 'New Category'}
          </h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-white/5 transition-all">
            <X className="w-4 h-4 text-[var(--text-secondary)]" />
          </button>
        </div>

        <div className="px-6 py-5 space-y-4">
          {/* Name */}
          <div>
            <label className={labelCls}>Category Name</label>
            <input
              className={inputCls}
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="e.g. Decking"
              autoFocus
            />
          </div>

          {/* Icon picker (only when no image set) */}
          {!imageUrl && (
            <div>
              <label className={labelCls}>Icon</label>
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-[var(--brand-gold)]/10 border border-[var(--brand-gold)]/20 flex items-center justify-center flex-shrink-0">
                  <PreviewIcon className="w-6 h-6 text-[var(--brand-gold)]" />
                </div>
                <select
                  className={`${inputCls} flex-1`}
                  value={iconSlug}
                  onChange={e => setIconSlug(e.target.value)}
                >
                  {ICON_SLUG_OPTIONS.map(o => (
                    <option key={o.slug} value={o.slug}>{o.label}</option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {/* Image upload */}
          <div>
            <label className={labelCls}>Category Image (optional)</label>
            {imageUrl ? (
              <div className="flex items-center gap-3">
                <img src={imageUrl} alt="" className="w-16 h-16 rounded-xl object-cover border border-white/10" />
                <button
                  onClick={() => setImageUrl(undefined)}
                  className="text-xs text-rose-400 hover:text-rose-300 font-bold transition-colors"
                >
                  Remove
                </button>
              </div>
            ) : (
              <button
                onClick={() => fileRef.current?.click()}
                className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-xs text-[var(--text-secondary)] hover:border-white/20 hover:text-[var(--text-primary)] transition-all"
              >
                <Upload className="w-3.5 h-3.5" /> Upload image
              </button>
            )}
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
          </div>
        </div>

        <div className="px-6 pb-5 flex items-center justify-between gap-3">
          {/* Delete */}
          {initial && onDelete && (
            confirmDelete ? (
              <div className="flex items-center gap-2">
                <span className="text-xs text-rose-400 font-medium">
                  {itemCount > 0 ? `This will also delete ${itemCount} item${itemCount > 1 ? 's' : ''}. Sure?` : 'Delete this category?'}
                </span>
                <button onClick={onDelete} className="px-3 py-1.5 rounded-lg bg-rose-500/20 border border-rose-500/30 text-xs text-rose-400 font-bold hover:bg-rose-500/30 transition-all">
                  Yes, delete
                </button>
                <button onClick={() => setConfirmDelete(false)} className="px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-xs text-[var(--text-secondary)] font-bold transition-all">
                  Cancel
                </button>
              </div>
            ) : (
              <button onClick={() => setConfirmDelete(true)} className="flex items-center gap-1.5 text-xs text-rose-400 hover:text-rose-300 font-bold transition-colors">
                <Trash2 className="w-3.5 h-3.5" /> Delete
              </button>
            )
          )}
          {!initial && <div />}

          <div className="flex items-center gap-2 ml-auto">
            <button onClick={onClose} className="px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-xs font-bold text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-all">
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={!name.trim()}
              className="px-4 py-2 rounded-xl bg-[var(--brand-gold)] text-black text-xs font-black uppercase tracking-wider disabled:opacity-40 hover:bg-[var(--brand-gold-light)] transition-all"
            >
              Save
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Sub-component: ItemEditView ───────────────────────────────────────────────

interface ItemEditViewProps {
  item: PriceBookItem | null;
  categoryId: string;
  onSave: (item: PriceBookItem) => void;
  onDelete: (id: string) => void;
  onBack: () => void;
}

const BLANK_ITEM = (categoryId: string): PriceBookItem => ({
  id: newId(),
  categoryId,
  name: '',
  description: '',
  price: 0,
  cost: 0,
  unit: 'Each',
  taxable: true,
  isActive: true,
});

function ItemEditView({ item, categoryId, onSave, onDelete, onBack }: ItemEditViewProps) {
  const [form, setForm] = useState<PriceBookItem>(item ?? BLANK_ITEM(categoryId));
  const [customUnit, setCustomUnit] = useState('');
  const [useCustomUnit, setUseCustomUnit] = useState(item ? !UNIT_OPTIONS.slice(0, -1).includes(item.unit) : false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const isNew = !item;

  const set = useCallback(<K extends keyof PriceBookItem>(key: K, val: PriceBookItem[K]) => {
    setForm(prev => ({ ...prev, [key]: val }));
  }, []);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const dataUrl = await readFileAsDataUrl(file);
    set('imageUrl', dataUrl);
  };

  const handleSave = () => {
    if (!form.name.trim()) return;
    const finalUnit = useCustomUnit ? customUnit.trim() || 'Each' : form.unit;
    onSave({ ...form, unit: finalUnit });
  };

  return (
    <div className="min-h-screen bg-[var(--bg-primary)] text-[var(--text-primary)]">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-[var(--bg-primary)] border-b border-[var(--border-color)] backdrop-blur-xl">
        <div className="max-w-3xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={onBack} className="p-2 rounded-xl hover:bg-white/5 transition-all">
              <ArrowLeft className="w-4 h-4 text-[var(--text-secondary)]" />
            </button>
            <h1 className="text-base font-black text-[var(--text-primary)] uppercase tracking-tight">
              {isNew ? 'New Item' : 'Edit Item'}
            </h1>
          </div>
          <div className="flex items-center gap-2">
            {!isNew && (
              confirmDelete ? (
                <div className="flex items-center gap-2">
                  <span className="text-xs text-rose-400">Delete this item?</span>
                  <button onClick={() => onDelete(form.id)} className="px-3 py-1.5 rounded-lg bg-rose-500/20 border border-rose-500/30 text-xs text-rose-400 font-bold">Yes</button>
                  <button onClick={() => setConfirmDelete(false)} className="px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-xs text-[var(--text-secondary)] font-bold">No</button>
                </div>
              ) : (
                <button onClick={() => setConfirmDelete(true)} className="p-2 rounded-xl hover:bg-rose-500/10 transition-all group">
                  <Trash2 className="w-4 h-4 text-[var(--muted-text)] group-hover:text-rose-400 transition-colors" />
                </button>
              )
            )}
            <button onClick={onBack} className="px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-xs font-bold text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-all">
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={!form.name.trim()}
              className="px-4 py-2 rounded-xl bg-[var(--brand-gold)] text-black text-xs font-black uppercase tracking-wider disabled:opacity-40 hover:bg-[var(--brand-gold-light)] transition-all"
            >
              Save Item
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-3xl mx-auto px-6 py-8 space-y-6">

        {/* Active toggle */}
        <div className="flex items-center justify-between bg-[var(--card-bg)] border border-[var(--card-border)] rounded-2xl px-5 py-4">
          <div>
            <p className="text-sm font-bold text-[var(--text-primary)]">Item Active</p>
            <p className="text-xs text-[var(--muted-text)] mt-0.5">Inactive items are hidden from estimates by default</p>
          </div>
          <button
            onClick={() => set('isActive', !form.isActive)}
            className="transition-all"
          >
            {form.isActive
              ? <ToggleRight className="w-8 h-8 text-[var(--brand-gold)]" />
              : <ToggleLeft className="w-8 h-8 text-[var(--muted-text)]" />
            }
          </button>
        </div>

        {/* Core fields */}
        <div className="bg-[var(--card-bg)] border border-[var(--card-border)] rounded-2xl px-5 py-5 space-y-4">
          <div>
            <label className={labelCls}>Item Name</label>
            <input className={inputCls} value={form.name} onChange={e => set('name', e.target.value)} placeholder="e.g. Cedar wood decking" autoFocus={isNew} />
          </div>

          <div>
            <label className={labelCls}>Description</label>
            <textarea
              className={`${inputCls} resize-none`}
              rows={4}
              value={form.description}
              onChange={e => set('description', e.target.value)}
              placeholder="Describe what is supplied and installed..."
            />
          </div>

          {/* Price + Cost row */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>Price ($ / unit)</label>
              <input
                className={inputCls}
                type="number"
                min={0}
                step={0.01}
                value={form.price}
                onChange={e => set('price', parseFloat(e.target.value) || 0)}
              />
            </div>
            <div>
              <label className={labelCls}>Cost ($ / unit)</label>
              <input
                className={inputCls}
                type="number"
                min={0}
                step={0.01}
                value={form.cost}
                onChange={e => set('cost', parseFloat(e.target.value) || 0)}
              />
            </div>
          </div>

          {/* Unit + Taxable row */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>Unit of Measure</label>
              {useCustomUnit ? (
                <div className="flex gap-2">
                  <input
                    className={`${inputCls} flex-1`}
                    value={customUnit}
                    onChange={e => setCustomUnit(e.target.value)}
                    placeholder="e.g. Per Panel"
                    autoFocus
                  />
                  <button onClick={() => { setUseCustomUnit(false); set('unit', 'Each'); }} className="p-2 rounded-xl hover:bg-white/5 transition-all">
                    <X className="w-3.5 h-3.5 text-[var(--muted-text)]" />
                  </button>
                </div>
              ) : (
                <select
                  className={inputCls}
                  value={form.unit}
                  onChange={e => {
                    if (e.target.value === 'Custom...') {
                      setUseCustomUnit(true);
                      setCustomUnit('');
                    } else {
                      set('unit', e.target.value);
                    }
                  }}
                >
                  {UNIT_OPTIONS.map(u => <option key={u} value={u}>{u}</option>)}
                </select>
              )}
            </div>

            <div>
              <label className={labelCls}>Taxable</label>
              <button
                onClick={() => set('taxable', !form.taxable)}
                className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white/5 border border-white/10 w-full hover:border-white/20 transition-all"
              >
                {form.taxable
                  ? <ToggleRight className="w-5 h-5 text-[var(--brand-gold)] flex-shrink-0" />
                  : <ToggleLeft className="w-5 h-5 text-[var(--muted-text)] flex-shrink-0" />
                }
                <span className="text-xs font-bold text-[var(--text-secondary)]">
                  {form.taxable ? 'Taxable' : 'Non-taxable'}
                </span>
              </button>
            </div>
          </div>
        </div>

        {/* Margin indicator */}
        {form.price > 0 && form.cost > 0 && (
          <div className="bg-[var(--card-bg)] border border-[var(--card-border)] rounded-2xl px-5 py-4 flex items-center gap-4">
            <div className="flex-1">
              <p className="text-[10px] font-black text-[var(--muted-text)] uppercase tracking-widest">Margin</p>
              <p className="text-lg font-black text-[var(--text-primary)]">
                {(((form.price - form.cost) / form.price) * 100).toFixed(1)}%
              </p>
            </div>
            <div className="flex-1">
              <p className="text-[10px] font-black text-[var(--muted-text)] uppercase tracking-widest">Gross Profit</p>
              <p className="text-lg font-black text-[var(--brand-gold)]">{formatCurrency(form.price - form.cost)}</p>
            </div>
            <div className="flex-1">
              <p className="text-[10px] font-black text-[var(--muted-text)] uppercase tracking-widest">Per Unit Price</p>
              <p className="text-lg font-black text-[var(--text-primary)]">{formatCurrency(form.price)}</p>
            </div>
          </div>
        )}

        {/* Image upload */}
        <div className="bg-[var(--card-bg)] border border-[var(--card-border)] rounded-2xl px-5 py-5">
          <label className={labelCls}>Item Image (optional)</label>
          {form.imageUrl ? (
            <div className="flex items-center gap-4 mt-2">
              <img src={form.imageUrl} alt="" className="w-20 h-20 rounded-xl object-cover border border-white/10" />
              <button onClick={() => set('imageUrl', undefined)} className="text-xs text-rose-400 hover:text-rose-300 font-bold transition-colors">
                Remove image
              </button>
            </div>
          ) : (
            <button
              onClick={() => fileRef.current?.click()}
              className="mt-2 flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-xs text-[var(--text-secondary)] hover:border-white/20 hover:text-[var(--text-primary)] transition-all"
            >
              <Upload className="w-3.5 h-3.5" /> Upload image
            </button>
          )}
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
        </div>

      </div>
    </div>
  );
}

// ── Sub-component: ItemListView ───────────────────────────────────────────────

interface ItemListViewProps {
  category: PriceBookCategory;
  items: PriceBookItem[];
  onSelectItem: (item: PriceBookItem) => void;
  onNewItem: () => void;
  onBack: () => void;
}

function ItemListView({ category, items, onSelectItem, onNewItem, onBack }: ItemListViewProps) {
  const [search, setSearch] = useState('');

  const filtered = items.filter(i =>
    i.name.toLowerCase().includes(search.toLowerCase())
  );

  const CatIcon = CATEGORY_ICON_MAP[category.id] ?? BookOpen;

  return (
    <div className="min-h-screen bg-[var(--bg-primary)] text-[var(--text-primary)]">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-[var(--bg-primary)] border-b border-[var(--border-color)] backdrop-blur-xl">
        <div className="max-w-5xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={onBack} className="p-2 rounded-xl hover:bg-white/5 transition-all">
              <ArrowLeft className="w-4 h-4 text-[var(--text-secondary)]" />
            </button>
            {/* Breadcrumb */}
            <div className="flex items-center gap-2 text-sm">
              <span className="text-[var(--muted-text)] font-medium">Price Book</span>
              <ChevronRight className="w-3.5 h-3.5 text-[var(--muted-text)]" />
              <span className="font-black text-[var(--text-primary)]">{category.name}</span>
            </div>
          </div>
          <button
            onClick={onNewItem}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[var(--brand-gold)] text-black text-xs font-black uppercase tracking-wider hover:bg-[var(--brand-gold-light)] transition-all"
          >
            <Plus className="w-3.5 h-3.5" /> Add Item
          </button>
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-6 py-6 space-y-4">

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--muted-text)]" />
          <input
            className={`${inputCls} pl-9`}
            placeholder="Search items..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>

        {/* Stats row */}
        <div className="flex items-center gap-4 text-xs text-[var(--muted-text)]">
          <span>{filtered.length} item{filtered.length !== 1 ? 's' : ''}</span>
          {search && <span>filtered from {items.length}</span>}
          <span className="ml-auto flex items-center gap-1.5">
            <CatIcon className="w-3.5 h-3.5 text-[var(--brand-gold)]" />
            <span className="text-[var(--brand-gold)] font-bold">{category.name}</span>
          </span>
        </div>

        {/* Table */}
        {filtered.length === 0 ? (
          <div className="bg-[var(--card-bg)] border border-[var(--card-border)] rounded-2xl px-6 py-12 text-center">
            <BookOpen className="w-8 h-8 text-[var(--muted-text)] mx-auto mb-3 opacity-50" />
            <p className="text-sm font-bold text-[var(--text-secondary)]">
              {search ? 'No items match that search' : 'No items in this category yet'}
            </p>
            {!search && (
              <button onClick={onNewItem} className="mt-4 text-xs text-[var(--brand-gold)] font-bold hover:underline">
                Add the first item
              </button>
            )}
          </div>
        ) : (
          <div className="bg-[var(--card-bg)] border border-[var(--card-border)] rounded-2xl overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-[var(--card-border)]">
                  <th className="px-4 py-3 text-left text-[9px] font-black text-[var(--muted-text)] uppercase tracking-[0.2em]">Name</th>
                  <th className="px-4 py-3 text-left text-[9px] font-black text-[var(--muted-text)] uppercase tracking-[0.2em] hidden md:table-cell">Description</th>
                  <th className="px-4 py-3 text-left text-[9px] font-black text-[var(--muted-text)] uppercase tracking-[0.2em]">Unit</th>
                  <th className="px-4 py-3 text-right text-[9px] font-black text-[var(--muted-text)] uppercase tracking-[0.2em]">Price</th>
                  <th className="px-4 py-3 w-10" />
                </tr>
              </thead>
              <tbody>
                {filtered.map((itm, idx) => (
                  <tr
                    key={itm.id}
                    onClick={() => onSelectItem(itm)}
                    className={`border-b border-[var(--card-border)] last:border-0 cursor-pointer hover:bg-white/[0.02] transition-colors ${!itm.isActive ? 'opacity-50' : ''}`}
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        {itm.imageUrl ? (
                          <img src={itm.imageUrl} alt="" className="w-9 h-9 rounded-lg object-cover border border-white/10 flex-shrink-0" />
                        ) : (
                          <div className="w-9 h-9 rounded-lg bg-[var(--brand-gold)]/5 border border-[var(--brand-gold)]/10 flex items-center justify-center flex-shrink-0">
                            <span className="text-[10px] font-black text-[var(--brand-gold)]">{String(idx + 1).padStart(2, '0')}</span>
                          </div>
                        )}
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-[var(--text-primary)] truncate">{itm.name}</p>
                          {!itm.isActive && (
                            <span className="text-[9px] font-black text-[var(--muted-text)] uppercase tracking-widest">Inactive</span>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell">
                      <p className="text-xs text-[var(--text-secondary)] truncate max-w-xs">
                        {itm.description.length > 60 ? `${itm.description.slice(0, 60)}...` : itm.description}
                      </p>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-xs text-[var(--muted-text)]">{itm.unit}</span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span className="text-xs font-black text-[var(--text-primary)]">{formatCurrency(itm.price)}</span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <button
                        onClick={e => { e.stopPropagation(); onSelectItem(itm); }}
                        className="p-1.5 rounded-lg hover:bg-white/5 transition-all"
                      >
                        <Pencil className="w-3.5 h-3.5 text-[var(--muted-text)]" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Settings nav tabs (shared pattern from BookingSettingsView) ───────────────

const SETTINGS_TABS = [
  { view: 'booking-settings',    label: 'Booking',     icon: <Calendar className="w-3.5 h-3.5" /> },
  { view: 'automation-settings', label: 'Automations', icon: <Zap className="w-3.5 h-3.5" /> },
  { view: 'price-book',          label: 'Price Book',  icon: <BookOpen className="w-3.5 h-3.5" /> },
  { view: 'user-management',     label: 'Users',       icon: <Users className="w-3.5 h-3.5" /> },
  { view: 'business-info',       label: 'Business',    icon: <Building2 className="w-3.5 h-3.5" /> },
];

// ── Main component: PriceBookView ─────────────────────────────────────────────

interface PriceBookViewProps {
  onBack: () => void;
  onNavigate?: (view: string) => void;
}

type PaneView =
  | { kind: 'categories' }
  | { kind: 'items'; category: PriceBookCategory }
  | { kind: 'edit'; item: PriceBookItem | null; categoryId: string };

const PriceBookView: React.FC<PriceBookViewProps> = ({ onBack, onNavigate }) => {
  const [{ categories, items }, setData] = useState(() => loadPriceBook());
  const [pane, setPane] = useState<PaneView>({ kind: 'categories' });
  const [catModal, setCatModal] = useState<PriceBookCategory | null | 'new'>(null);

  // Persist on every change
  const persist = useCallback((cats: PriceBookCategory[], itms: PriceBookItem[]) => {
    setData({ categories: cats, items: itms });
    savePriceBook(cats, itms);
  }, []);

  // ── Category handlers ──────────────────────────────────────────────────────

  const handleSaveCategory = (cat: PriceBookCategory) => {
    const exists = categories.find(c => c.id === cat.id);
    const next = exists
      ? categories.map(c => c.id === cat.id ? cat : c)
      : [...categories, { ...cat, order: categories.length + 1 }];
    persist(next.sort((a, b) => a.order - b.order), items);
    setCatModal(null);
  };

  const handleDeleteCategory = (catId: string) => {
    persist(
      categories.filter(c => c.id !== catId),
      items.filter(i => i.categoryId !== catId)
    );
    setCatModal(null);
    setPane({ kind: 'categories' });
  };

  // ── Item handlers ──────────────────────────────────────────────────────────

  const handleSaveItem = (saved: PriceBookItem) => {
    const exists = items.find(i => i.id === saved.id);
    const next = exists
      ? items.map(i => i.id === saved.id ? saved : i)
      : [...items, saved];
    persist(categories, next);
    // Go back to item list
    const cat = categories.find(c => c.id === saved.categoryId);
    if (cat) setPane({ kind: 'items', category: cat });
  };

  const handleDeleteItem = (id: string) => {
    const catId = items.find(i => i.id === id)?.categoryId;
    persist(categories, items.filter(i => i.id !== id));
    const cat = catId ? categories.find(c => c.id === catId) : undefined;
    if (cat) setPane({ kind: 'items', category: cat });
    else setPane({ kind: 'categories' });
  };

  // ── Render pane: item edit ─────────────────────────────────────────────────

  if (pane.kind === 'edit') {
    const cat = categories.find(c => c.id === pane.categoryId);
    return (
      <ItemEditView
        item={pane.item}
        categoryId={pane.categoryId}
        onSave={handleSaveItem}
        onDelete={handleDeleteItem}
        onBack={() => {
          if (cat) setPane({ kind: 'items', category: cat });
          else setPane({ kind: 'categories' });
        }}
      />
    );
  }

  // ── Render pane: item list ─────────────────────────────────────────────────

  if (pane.kind === 'items') {
    const catItems = items.filter(i => i.categoryId === pane.category.id);
    return (
      <>
        <ItemListView
          category={pane.category}
          items={catItems}
          onSelectItem={itm => setPane({ kind: 'edit', item: itm, categoryId: pane.category.id })}
          onNewItem={() => setPane({ kind: 'edit', item: null, categoryId: pane.category.id })}
          onBack={() => setPane({ kind: 'categories' })}
        />
        {/* Category edit modal accessible from item list */}
        {catModal && catModal !== 'new' && (
          <CategoryModal
            initial={catModal}
            itemCount={items.filter(i => i.categoryId === catModal.id).length}
            onSave={handleSaveCategory}
            onDelete={() => handleDeleteCategory(catModal.id)}
            onClose={() => setCatModal(null)}
          />
        )}
      </>
    );
  }

  // ── Render pane: category grid ─────────────────────────────────────────────

  const sortedCats = [...categories].sort((a, b) => a.order - b.order);

  return (
    <>
      <div className="min-h-screen bg-[var(--bg-primary)] text-[var(--text-primary)]">

        {/* Header */}
        <header className="sticky top-0 z-40 bg-[var(--bg-primary)] border-b border-[var(--border-color)] backdrop-blur-xl">
          <div className="max-w-5xl mx-auto px-6 h-16 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button onClick={onBack} className="p-2 rounded-xl hover:bg-white/5 transition-all">
                <ArrowLeft className="w-4 h-4 text-[var(--text-secondary)]" />
              </button>
              <div>
                <h1 className="text-lg font-black text-[var(--text-primary)] uppercase tracking-tight italic">Price Book</h1>
                <p className="text-[9px] text-[var(--brand-gold)] font-black uppercase tracking-[0.2em]">
                  {items.length} items across {categories.length} categories
                </p>
              </div>
            </div>
            <button
              onClick={() => setCatModal('new')}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[var(--brand-gold)] text-black text-xs font-black uppercase tracking-wider hover:bg-[var(--brand-gold-light)] transition-all"
            >
              <Plus className="w-3.5 h-3.5" /> New Category
            </button>
          </div>
        </header>

        {/* Settings sub-nav */}
        {onNavigate && (
          <div className="bg-[var(--bg-primary)] border-b border-[var(--border-color)]">
            <div className="max-w-5xl mx-auto px-6 flex gap-1 py-2 overflow-x-auto">
              {SETTINGS_TABS.map(tab => (
                <button
                  key={tab.view}
                  onClick={() => onNavigate(tab.view)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${
                    tab.view === 'price-book'
                      ? 'bg-[var(--brand-gold)]/10 text-[var(--brand-gold)] border border-[var(--brand-gold)]/20'
                      : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-secondary)]'
                  }`}
                >
                  {tab.icon} {tab.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Category grid */}
        <main className="max-w-5xl mx-auto px-6 py-8">
          {sortedCats.length === 0 ? (
            <div className="text-center py-20">
              <BookOpen className="w-10 h-10 text-[var(--muted-text)] mx-auto mb-4 opacity-40" />
              <p className="text-sm font-bold text-[var(--text-secondary)]">No categories yet</p>
              <button onClick={() => setCatModal('new')} className="mt-3 text-xs text-[var(--brand-gold)] font-bold hover:underline">
                Create the first one
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
              {sortedCats.map(cat => {
                const CatIcon = CATEGORY_ICON_MAP[cat.id] ?? BookOpen;
                const catItemCount = items.filter(i => i.categoryId === cat.id).length;
                const activeCount = items.filter(i => i.categoryId === cat.id && i.isActive).length;

                return (
                  <div
                    key={cat.id}
                    className="group relative bg-[var(--card-bg)] border border-[var(--card-border)] rounded-2xl overflow-hidden cursor-pointer transition-all hover:border-[var(--brand-gold)]/40 hover:shadow-[0_0_0_1px_var(--brand-gold),0_4px_20px_-4px_rgba(196,164,50,0.2)]"
                    style={{ height: '140px' }}
                    onClick={() => setPane({ kind: 'items', category: cat })}
                  >
                    {/* Background */}
                    {cat.imageUrl ? (
                      <img src={cat.imageUrl} alt="" className="absolute inset-0 w-full h-full object-cover opacity-60" />
                    ) : (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <CatIcon className="w-10 h-10 text-[var(--brand-gold)] opacity-25 group-hover:opacity-40 transition-opacity" />
                      </div>
                    )}

                    {/* Dark gradient overlay for text readability */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />

                    {/* Edit button */}
                    <button
                      onClick={e => { e.stopPropagation(); setCatModal(cat); }}
                      className="absolute top-2 right-2 p-1.5 rounded-lg bg-black/40 hover:bg-black/60 opacity-0 group-hover:opacity-100 transition-all z-10"
                    >
                      <Pencil className="w-3 h-3 text-white" />
                    </button>

                    {/* Text footer */}
                    <div className="absolute bottom-0 left-0 right-0 px-3 pb-2.5 pt-4">
                      <p className="text-xs font-black text-white leading-tight">{cat.name}</p>
                      <p className="text-[9px] text-white/50 mt-0.5">
                        {catItemCount} item{catItemCount !== 1 ? 's' : ''}
                        {catItemCount !== activeCount && (
                          <span className="ml-1 text-amber-400/70">{catItemCount - activeCount} inactive</span>
                        )}
                      </p>
                    </div>
                  </div>
                );
              })}

              {/* Add category card */}
              <button
                onClick={() => setCatModal('new')}
                className="h-[140px] border-2 border-dashed border-[var(--card-border)] rounded-2xl flex flex-col items-center justify-center gap-2 text-[var(--muted-text)] hover:border-[var(--brand-gold)]/30 hover:text-[var(--brand-gold)] transition-all group"
              >
                <Plus className="w-6 h-6 opacity-50 group-hover:opacity-100 transition-opacity" />
                <span className="text-[9px] font-black uppercase tracking-widest opacity-50 group-hover:opacity-100 transition-opacity">New Category</span>
              </button>
            </div>
          )}

          {/* Inventory summary */}
          {sortedCats.length > 0 && (
            <div className="mt-8 grid grid-cols-3 gap-4">
              {[
                { label: 'Total Items',    value: items.length },
                { label: 'Active Items',   value: items.filter(i => i.isActive).length },
                { label: 'Categories',     value: categories.length },
              ].map(stat => (
                <div key={stat.label} className="bg-[var(--card-bg)] border border-[var(--card-border)] rounded-2xl px-5 py-4 text-center">
                  <p className="text-2xl font-black text-[var(--brand-gold)]">{stat.value}</p>
                  <p className="text-[9px] font-black text-[var(--muted-text)] uppercase tracking-[0.18em] mt-1">{stat.label}</p>
                </div>
              ))}
            </div>
          )}
        </main>
      </div>

      {/* Category modal (new or edit) */}
      {catModal !== null && (
        <CategoryModal
          initial={catModal === 'new' ? undefined : catModal}
          itemCount={catModal === 'new' ? 0 : items.filter(i => i.categoryId === (catModal as PriceBookCategory).id).length}
          onSave={handleSaveCategory}
          onDelete={catModal !== 'new' ? () => handleDeleteCategory((catModal as PriceBookCategory).id) : undefined}
          onClose={() => setCatModal(null)}
        />
      )}
    </>
  );
};

export default PriceBookView;
