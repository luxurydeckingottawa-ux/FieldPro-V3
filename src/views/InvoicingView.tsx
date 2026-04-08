import React from 'react';
import { InvoicingData } from '../types';
import { RATES } from '../constants';
import { Calculator, Receipt, Plus, Minus, ClipboardPen, Hammer, Ruler, Footprints, Construction, Lightbulb, Trash2, Shovel, ShieldCheck } from 'lucide-react';

interface InvoicingViewProps {
  data: InvoicingData;
  onUpdate: (data: Partial<InvoicingData>) => void;
  onNext: () => void;
  onBack: () => void;
}

const InvoicingView: React.FC<InvoicingViewProps> = ({ data, onUpdate, onNext, onBack }) => {
  const calculateItemized = () => {
    const items: { label: string; amount: number; qty: number; unit: string; total: number }[] = [];
    const r = RATES as any;
    const d = data as any;

    const addItem = (field: string, label: string, unit: string) => {
      if (d[field] > 0) {
        items.push({
          label,
          amount: r[field],
          qty: d[field],
          unit,
          total: d[field] * r[field]
        });
      }
    };

    // Add Core
    addItem('deckSqft', 'Core Framing & Decking', 'SQFT');
    addItem('joistTapeSqft', 'Joist Tape Installation', 'SQFT');
    addItem('joistPaintSqft', 'Joist Paint Application', 'SQFT');

    // Add Footings
    addItem('deckBlocks', 'Deck Blocks', 'EA');
    addItem('dugFootings', 'Dug Footings (48")', 'EA');
    addItem('helicalPiles', 'Helical Piles (w/ saddle)', 'EA');
    addItem('groundScrews', 'Ground Screws', 'EA');
    addItem('foundationBrackets', 'Steel Foundation Brackets', 'EA');

    // Add Stairs
    if (d.standardStairLf > 0) {
      items.push({ label: 'Standard Stair (PT/Cedar)', amount: r.standardStairLf, qty: d.standardStairLf, unit: 'LF', total: d.standardStairLf * r.standardStairLf });
      if (d.hasClosedRisers) {
        items.push({ label: 'Add-on: Closed Risers (Std)', amount: r.closedRiserAddon, qty: d.standardStairLf, unit: 'LF', total: d.standardStairLf * r.closedRiserAddon });
      }
    }
    if (d.premiumStairLf > 0) {
      items.push({ label: 'Premium Stair (PVC)', amount: r.premiumStairLf, qty: d.premiumStairLf, unit: 'LF', total: d.premiumStairLf * r.premiumStairLf });
      if (d.hasMitreSteps) {
        items.push({ label: 'Add-on: Mitre Steps (Prem)', amount: r.mitreStepAddon, qty: d.premiumStairLf, unit: 'LF', total: d.premiumStairLf * r.mitreStepAddon });
      }
    }

    // Add Finish
    addItem('singleBorderLf', 'Single Picture Border', 'LF');
    addItem('doubleBorderLf', 'Double Picture Border', 'LF');
    addItem('fasciaLf', 'Fascia Installation', 'LF');

    // Add Railing
    if (d.woodRailingLf > 0) {
      items.push({ label: 'Wood Railing', amount: r.woodRailingLf, qty: d.woodRailingLf, unit: 'LF', total: d.woodRailingLf * r.woodRailingLf });
      if (d.hasAluminumSpindles) {
        items.push({ label: 'Add-on: Aluminum Spindles', amount: r.aluminumSpindleAddon, qty: d.woodRailingLf, unit: 'LF', total: d.woodRailingLf * r.aluminumSpindleAddon });
      }
    }
    addItem('railingPosts', 'Aluminum Railing Posts', 'EA');
    addItem('standardRailingSections', 'Std Railing Sections (AL13)', 'EA');
    addItem('adjustableStairSections', 'Adjustable Stair Sections', 'EA');
    addItem('glassRailingSections', 'Glass Insert Sections', 'EA');
    addItem('framelessGlassSections', 'Frameless Glass Sections', 'EA');
    addItem('railingGates', 'Standard Railing Gates', 'EA');

    // Skirting/Privacy
    addItem('skirtingSqft', 'Skirting Installation', 'SQFT');
    addItem('skirtingGates', 'Skirting Access Gates', 'EA');
    addItem('privacyPostCount', 'Privacy Posts (Hideaway)', 'EA');
    addItem('privacyPanels', 'Privacy Panels (Hideaway)', 'EA');
    addItem('pvcPrivacyPostCount', 'PVC Privacy Posts', 'EA');
    addItem('pvcPrivacyBoardsLf', 'PVC Privacy Boards', 'LF');
    addItem('woodPrivacyLf', 'Wood Privacy Wall', 'LF');

    // Site Prep
    addItem('landscapeFabricSqft', 'Landscape Fabric + Stone', 'SQFT');
    addItem('deckRemovalSqft', 'Old Deck Removal', 'SQFT');
    addItem('ledgerPrepLf', 'Ledger Prep & Flashing', 'LF');
    addItem('drainageSqft', 'Under-deck Drainage', 'SQFT');

    // Misc
    addItem('lightingKits', '8 LED Light Kit (Basic)', 'EA');
    addItem('lightingControlBoxes', 'Lighting Control Box', 'EA');
    addItem('lightingFixtures', 'Individual Light Fixtures', 'EA');
    addItem('trackLightingLf', 'Track Lighting Installation', 'LF');
    addItem('pergolaCount', 'Pergola / Structure Install', 'EA');

    // Custom
    if (d.customWorkAmount > 0) {
      items.push({ label: `Custom: ${d.customWorkDescription || 'Unspecified'}`, amount: d.customWorkAmount, qty: 1, unit: 'JOB', total: d.customWorkAmount });
    }

    return items;
  };

  const itemizedList = calculateItemized();
  const subtotal = itemizedList.reduce((acc, item) => acc + item.total, 0);
  const hst = subtotal * 0.13;
  const grandTotal = subtotal + hst;

  const ManualStepper = ({ label, value, field, unit, step = 1, icon: Icon }: { label: string, value: number, field: keyof InvoicingData, unit: string, step?: number, icon?: React.ElementType }) => (
    <div className="card-base p-6 space-y-4 group">
      <div className="flex justify-between items-start">
        <label className="font-label flex items-center gap-2">
          {Icon && <Icon size={14} className="text-[var(--brand-gold)]" />} {label}
        </label>
        <span className="font-label opacity-60 px-2.5 py-1 rounded-full border border-[var(--border-color)]">
          ${(RATES as any)[field] || '?'}/{unit}
        </span>
      </div>
      
      <div className="flex items-center gap-3">
        <button 
          onClick={() => onUpdate({ [field]: Math.max(0, (value || 0) - step) })}
          className="w-12 h-12 rounded-2xl bg-[var(--bg-primary)]/5 border border-[var(--border-color)] flex items-center justify-center text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)]/80 hover:text-[var(--text-primary)] active:scale-[0.98] transition-all shrink-0"
        >
          <Minus size={18} strokeWidth={3} />
        </button>
        
        <div className="flex-1 relative">
          <input 
            type="number" 
            value={value === 0 ? '' : value}
            onChange={(e) => {
              const val = e.target.value === '' ? 0 : parseFloat(e.target.value);
              onUpdate({ [field]: isNaN(val) ? 0 : val });
            }}
            className="w-full h-12 text-center font-black text-2xl bg-transparent rounded-2xl focus:ring-2 focus:ring-[var(--brand-gold)] outline-none border-none p-0 text-[var(--text-primary)] placeholder-[var(--text-secondary)]/30"
            placeholder="0"
          />
          <span className="absolute -bottom-1 left-0 right-0 font-label text-center pointer-events-none opacity-40">
            {unit}
          </span>
        </div>

        <button 
          onClick={() => onUpdate({ [field]: (value || 0) + step })}
          className="w-12 h-12 rounded-2xl bg-[var(--brand-gold)] text-black hover:bg-[var(--brand-gold)] active:scale-95 transition-all shrink-0 shadow-lg shadow-[var(--brand-gold)]/20"
        >
          <Plus size={18} strokeWidth={3} />
        </button>
      </div>
    </div>
  );

  return (
    <div className="p-6 pb-40 space-y-12 bg-[var(--bg-primary)] text-[var(--text-primary)] transition-colors duration-300">
      <div className="card-base p-8 flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-display leading-none">Final Subcontractor Invoice</h2>
          <p className="font-label mt-3">Luxury DecKing Rate Card</p>
        </div>
        <Receipt className="text-[var(--brand-gold)]/20" size={48} />
      </div>

      {/* 1. CORE BUILD */}
      <section className="space-y-6">
        <h3 className="font-label px-2 flex items-center gap-2">
          <Hammer size={14} className="text-[var(--brand-gold)]" /> Framing & Decking
        </h3>
        <div className="grid grid-cols-1 gap-4">
          <ManualStepper label="Core Decking Area" value={data.deckSqft} field="deckSqft" unit="SQFT" icon={Calculator} />
          <div className="grid grid-cols-2 gap-4">
            <ManualStepper label="Joist Tape" value={data.joistTapeSqft} field="joistTapeSqft" unit="SQFT" />
            <ManualStepper label="Joist Paint" value={data.joistPaintSqft} field="joistPaintSqft" unit="SQFT" />
          </div>
        </div>
      </section>

      {/* 2. FOOTING SYSTEMS */}
      <section className="space-y-6">
        <h3 className="font-label px-2 flex items-center gap-2">
          <Footprints size={14} className="text-[var(--brand-gold)]" /> Footing Systems
        </h3>
        <div className="grid grid-cols-1 gap-4">
          <ManualStepper label="Helical Piles" value={data.helicalPiles} field="helicalPiles" unit="EACH" />
          <div className="grid grid-cols-2 gap-4">
            <ManualStepper label="Dug Footings" value={data.dugFootings} field="dugFootings" unit="EACH" />
            <ManualStepper label="Deck Blocks" value={data.deckBlocks} field="deckBlocks" unit="EACH" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <ManualStepper label="Ground Screws" value={data.groundScrews} field="groundScrews" unit="EACH" />
            <ManualStepper label="Steel Brackets" value={data.foundationBrackets} field="foundationBrackets" unit="EACH" />
          </div>
        </div>
      </section>

      {/* 3. STAIRS */}
      <section className="space-y-6">
        <h3 className="font-label px-2 flex items-center gap-2">
          <Construction size={14} className="text-[var(--brand-gold)]" /> Stairs & Steps
        </h3>
        <div className="space-y-4">
          <ManualStepper label="Standard Stairs" value={data.standardStairLf} field="standardStairLf" unit="LF" />
          <label className={`flex items-center justify-between p-6 border rounded-[2rem] transition-all cursor-pointer group ${
            data.hasClosedRisers 
              ? 'bg-[var(--brand-gold)]/10 border-[var(--brand-gold)]/30 text-[var(--brand-gold)]' 
              : 'bg-[var(--bg-secondary)] border border-[var(--border-color)] text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)]/80'
          }`}>
            <div className="flex items-center gap-4">
              <input type="checkbox" checked={data.hasClosedRisers} onChange={(e) => onUpdate({ hasClosedRisers: e.target.checked })} className="w-7 h-7 rounded-xl accent-[var(--brand-gold)] bg-[var(--bg-primary)]/5 border border-[var(--border-color)]" />
              <div>
                <p className="font-label text-xs">Closed Risers (Std)</p>
                <p className="font-label opacity-60 mt-1">Surcharge: +$2.00/LF</p>
              </div>
            </div>
          </label>
          <ManualStepper label="Premium PVC Stairs" value={data.premiumStairLf} field="premiumStairLf" unit="LF" />
          <label className={`flex items-center justify-between p-6 border rounded-[2rem] transition-all cursor-pointer group ${
            data.hasMitreSteps 
              ? 'bg-[var(--brand-gold)]/10 border-[var(--brand-gold)]/30 text-[var(--brand-gold)]' 
              : 'bg-[var(--bg-secondary)] border border-[var(--border-color)] text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)]/80'
          }`}>
            <div className="flex items-center gap-4">
              <input type="checkbox" checked={data.hasMitreSteps} onChange={(e) => onUpdate({ hasMitreSteps: e.target.checked })} className="w-7 h-7 rounded-xl accent-[var(--brand-gold)] bg-[var(--bg-primary)]/5 border border-[var(--border-color)]" />
              <div>
                <p className="font-label text-xs">Mitre Steps (Prem)</p>
                <p className="font-label opacity-60 mt-1">Surcharge: +$10.00/LF</p>
              </div>
            </div>
          </label>
        </div>
      </section>

      {/* 4. DETAIL & FINISH */}
      <section className="space-y-6">
        <h3 className="font-label px-2 flex items-center gap-2">
          <Ruler size={14} className="text-[var(--brand-gold)]" /> Detail & Finish
        </h3>
        <div className="grid grid-cols-1 gap-4">
          <ManualStepper label="Single Picture Border" value={data.singleBorderLf} field="singleBorderLf" unit="LF" />
          <ManualStepper label="Double Picture Border" value={data.doubleBorderLf} field="doubleBorderLf" unit="LF" />
          <ManualStepper label="Fascia Installation" value={data.fasciaLf} field="fasciaLf" unit="LF" />
        </div>
      </section>

      {/* 5. RAILING SYSTEMS */}
      <section className="space-y-6">
        <h3 className="font-label px-2 flex items-center gap-2">
          <ShieldCheck size={14} className="text-[var(--brand-gold)]" /> Railing Systems
        </h3>
        <div className="space-y-4">
          <ManualStepper label="Wood Railing" value={data.woodRailingLf} field="woodRailingLf" unit="LF" />
          <label className={`flex items-center justify-between p-6 border rounded-[2rem] transition-all cursor-pointer group ${
            data.hasAluminumSpindles 
              ? 'bg-[var(--brand-gold)]/10 border-[var(--brand-gold)]/30 text-[var(--brand-gold)]' 
              : 'bg-[var(--bg-secondary)] border border-[var(--border-color)] text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)]/80'
          }`}>
            <div className="flex items-center gap-4">
              <input type="checkbox" checked={data.hasAluminumSpindles} onChange={(e) => onUpdate({ hasAluminumSpindles: e.target.checked })} className="w-7 h-7 rounded-xl accent-[var(--brand-gold)] bg-[var(--bg-primary)]/5 border border-[var(--border-color)]" />
              <div>
                <p className="font-label text-xs">Aluminum Spindles</p>
                <p className="font-label opacity-60 mt-1">Surcharge: +$5.00/LF</p>
              </div>
            </div>
          </label>
          <div className="pt-4">
             <p className="font-label mb-4 px-2">Aluminum AL13 / Glass</p>
             <div className="grid grid-cols-1 gap-4">
               <div className="grid grid-cols-2 gap-4">
                 <ManualStepper label="Alum Posts" value={data.railingPosts} field="railingPosts" unit="EA" />
                 <ManualStepper label="Std Section" value={data.standardRailingSections} field="standardRailingSections" unit="EA" />
               </div>
               <ManualStepper label="Stair Sections" value={data.adjustableStairSections} field="adjustableStairSections" unit="EA" />
               <div className="grid grid-cols-2 gap-4">
                 <ManualStepper label="Glass Sec" value={data.glassRailingSections} field="glassRailingSections" unit="EA" />
                 <ManualStepper label="Frameless" value={data.framelessGlassSections} field="framelessGlassSections" unit="EA" />
               </div>
               <ManualStepper label="Standard Gates" value={data.railingGates} field="railingGates" unit="EA" />
             </div>
          </div>
        </div>
      </section>

      {/* 6. SKIRTING & PRIVACY */}
      <section className="space-y-6">
        <h3 className="font-label px-2 flex items-center gap-2">
          <Construction size={14} className="text-[var(--brand-gold)]" /> Skirting & Privacy
        </h3>
        <div className="grid grid-cols-1 gap-4">
          <ManualStepper label="Skirting Board/Tape" value={data.skirtingSqft} field="skirtingSqft" unit="SQFT" />
          <ManualStepper label="Skirting Access Gate" value={data.skirtingGates} field="skirtingGates" unit="EA" />
          <div className="grid grid-cols-2 gap-4">
            <ManualStepper label="Priv. Post (H)" value={data.privacyPostCount} field="privacyPostCount" unit="EA" />
            <ManualStepper label="Priv. Panel (H)" value={data.privacyPanels} field="privacyPanels" unit="EA" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <ManualStepper label="PVC Priv. Post" value={data.pvcPrivacyPostCount} field="pvcPrivacyPostCount" unit="EA" />
            <ManualStepper label="PVC Boards" value={data.pvcPrivacyBoardsLf} field="pvcPrivacyBoardsLf" unit="LF" />
          </div>
          <ManualStepper label="Wood Privacy Wall" value={data.woodPrivacyLf} field="woodPrivacyLf" unit="LF" />
        </div>
      </section>

      {/* 7. SITE PREP & DEMO */}
      <section className="space-y-6">
        <h3 className="font-label px-2 flex items-center gap-2">
          <Shovel size={14} className="text-[var(--brand-gold)]" /> Site Prep & Demo
        </h3>
        <div className="grid grid-cols-1 gap-4">
          <ManualStepper label="Landscape Fabric + Stone" value={data.landscapeFabricSqft} field="landscapeFabricSqft" unit="SQFT" />
          <ManualStepper label="Existing Deck Demo" value={data.deckRemovalSqft} field="deckRemovalSqft" unit="SQFT" icon={Trash2} />
          <ManualStepper label="Ledger Prep / Flashing" value={data.ledgerPrepLf} field="ledgerPrepLf" unit="LF" />
          <ManualStepper label="Under-deck Drainage" value={data.drainageSqft} field="drainageSqft" unit="SQFT" />
        </div>
      </section>

      {/* 8. LIGHTING & STRUCTURES */}
      <section className="space-y-6">
        <h3 className="font-label px-2 flex items-center gap-2">
          <Lightbulb size={14} className="text-[var(--brand-gold)]" /> Lighting & Misc
        </h3>
        <div className="grid grid-cols-1 gap-4">
          <ManualStepper label="8 LED Light Kit" value={data.lightingKits} field="lightingKits" unit="EA" />
          <div className="grid grid-cols-2 gap-4">
            <ManualStepper label="Control Box" value={data.lightingControlBoxes} field="lightingControlBoxes" unit="EA" />
            <ManualStepper label="Light Fixture" value={data.lightingFixtures} field="lightingFixtures" unit="EA" />
          </div>
          <ManualStepper label="Track Lighting Install" value={data.trackLightingLf} field="trackLightingLf" unit="LF" />
          <ManualStepper label="Pergola Installation" value={data.pergolaCount} field="pergolaCount" unit="EA" />
        </div>
      </section>

      {/* CUSTOM WORK SECTION */}
      <section className="space-y-6 pt-4">
        <h3 className="font-label px-2 flex items-center gap-2">
          <ClipboardPen size={14} className="text-[var(--brand-gold)]" /> Custom & Extra Items
        </h3>
        <div className="card-base p-8 space-y-6">
          <textarea 
            value={data.customWorkDescription}
            onChange={(e) => onUpdate({ customWorkDescription: e.target.value })}
            placeholder="Detailed description of unlisted work..."
            className="w-full p-6 bg-[var(--bg-primary)]/5 border border-[var(--border-color)] rounded-2xl text-sm focus:ring-2 focus:ring-[var(--brand-gold)] outline-none min-h-[120px] text-[var(--text-primary)] placeholder-[var(--text-secondary)]/50"
          />
          <div className="flex items-center gap-4">
            <div className="flex-1 relative">
              <input 
                type="number"
                value={data.customWorkAmount || ''}
                onChange={(e) => onUpdate({ customWorkAmount: parseFloat(e.target.value) || 0 })}
                className="w-full h-14 text-center font-black text-2xl bg-[var(--bg-primary)]/5 border border-[var(--border-color)] rounded-2xl focus:ring-2 focus:ring-[var(--brand-gold)] outline-none text-[var(--text-primary)]"
                placeholder="Amount ($0.00)"
              />
              <span className="absolute -bottom-1 left-0 right-0 font-label text-center pointer-events-none opacity-40">
                Total CAD
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* INVOICE SUMMARY PANEL */}
      <div className="card-base p-10 space-y-8 mt-16 mb-12 relative overflow-hidden group">
        <div className="absolute top-0 right-0 w-64 h-64 bg-[var(--brand-gold)]/5 blur-[100px] -mr-32 -mt-32 rounded-full group-hover:bg-[var(--brand-gold)]/10 transition-all duration-1000"></div>
        
        <div className="flex justify-between items-center pb-8 border-b border-[var(--border-color)] relative z-10">
          <div>
            <h4 className="font-label mb-3">Final Submission</h4>
            <div className="flex items-baseline gap-2">
              <span className="text-5xl font-black tabular-nums tracking-tighter text-[var(--text-primary)]">${grandTotal.toLocaleString('en-CA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
              <span className="font-label opacity-60">CAD</span>
            </div>
          </div>
          <div className="w-16 h-16 rounded-2xl bg-[var(--brand-gold)]/10 flex items-center justify-center border border-[var(--brand-gold)]/20">
            <Receipt className="text-[var(--brand-gold)]" size={32} />
          </div>
        </div>

        {/* Itemized breakdown */}
        <div className="space-y-4 py-2 relative z-10">
          <p className="font-label">Itemized Breakdown</p>
          <div className="max-h-80 overflow-y-auto pr-2 space-y-3 no-scrollbar">
            {itemizedList.length === 0 ? (
              <p className="text-xs text-[var(--text-secondary)] italic py-4 text-center">No items entered yet.</p>
            ) : (
              itemizedList.map((item, i) => (
                <div key={i} className="flex justify-between items-end border-b border-[var(--border-color)] pb-3 group/item hover:border-[var(--text-secondary)]/30 transition-all">
                  <div className="flex flex-col min-w-0 pr-4">
                    <span className="text-[11px] font-black uppercase tracking-tight text-[var(--text-primary)]/80 group-hover/item:text-[var(--text-primary)] transition-colors">{item.label}</span>
                    <span className="font-label opacity-60 mt-1">
                      {item.qty} {item.unit} @ ${item.amount.toFixed(2)}
                    </span>
                  </div>
                  <span className="text-xs font-black tabular-nums text-[var(--text-secondary)] group-hover/item:text-[var(--brand-gold)] transition-colors">${item.total.toFixed(2)}</span>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="pt-8 border-t border-[var(--border-color)] space-y-4 relative z-10">
          <div className="flex justify-between items-center text-xs font-bold text-[var(--text-secondary)]">
            <span className="font-label">Subtotal</span>
            <span className="tabular-nums text-[var(--text-primary)]/80">${subtotal.toLocaleString('en-CA', { minimumFractionDigits: 2 })}</span>
          </div>
          <div className="flex justify-between items-center text-xs font-bold text-amber-500/80">
            <span className="font-label">HST (13%)</span>
            <span className="tabular-nums">${hst.toLocaleString('en-CA', { minimumFractionDigits: 2 })}</span>
          </div>
          <div className="flex justify-between items-center pt-6 border-t border-[var(--border-color)]">
            <span className="font-label text-sm">Grand Total</span>
            <span className="text-3xl font-black tabular-nums text-[var(--brand-gold)]">${grandTotal.toLocaleString('en-CA', { minimumFractionDigits: 2 })}</span>
          </div>
        </div>

        <div className="pt-6 font-label opacity-60 text-center italic leading-relaxed relative z-10">
          Payments are issued following office review of site photos and compliance documentation.
        </div>
      </div>

      <div className="fixed bottom-0 left-0 right-0 p-6 bg-[var(--bg-primary)]/80 backdrop-blur-xl border-t border-[var(--border-color)] z-40">
        <div className="max-w-4xl mx-auto flex gap-4">
          <button 
            onClick={onBack}
            className="flex-1 py-5 bg-[var(--bg-secondary)] text-[var(--text-secondary)] border border-[var(--border-color)] rounded-[2rem] font-label text-[10px] hover:bg-[var(--bg-secondary)]/80 hover:text-[var(--text-primary)] transition-all active:scale-[0.98]"
          >
            Back
          </button>
          <button 
            onClick={onNext}
            className="flex-[2] py-5 bg-[var(--brand-gold)] text-black rounded-[2rem] font-label text-[10px] shadow-2xl hover:bg-[var(--brand-gold)] transition-all active:scale-[0.98]"
          >
            Review & Submit
          </button>
        </div>
      </div>
    </div>
  );
};

export default InvoicingView;