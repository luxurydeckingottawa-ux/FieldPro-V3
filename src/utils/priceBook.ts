/**
 * Price Book utilities — shared between PriceBookView and EstimatorCalculatorView.
 * No React imports — pure data and localStorage helpers.
 */

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

// ── Default Data ──────────────────────────────────────────────────────────────

export const DEFAULT_CATEGORIES: PriceBookCategory[] = [
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

export const DEFAULT_ITEMS: PriceBookItem[] = [
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
