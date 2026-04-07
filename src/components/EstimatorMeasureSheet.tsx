import React from 'react';
import { MeasureSheet } from '../types';
import { Ruler, Layers, Footprints, Construction } from 'lucide-react';

interface EstimatorMeasureSheetProps {
  data: MeasureSheet;
  onChange: (updates: Partial<MeasureSheet>) => void;
}

const EstimatorMeasureSheet: React.FC<EstimatorMeasureSheetProps> = ({ data, onChange }) => {
  if (!data) return null;

  const renderSection = (title: string, icon: any, children: React.ReactNode) => (
    <div className="bg-[var(--bg-primary)] p-6 rounded-2xl border border-[var(--border-color)] shadow-sm space-y-6">
      <div className="flex items-center gap-3 border-b border-[var(--border-color)] pb-4">
        <div className="w-10 h-10 bg-emerald-600/10 rounded-xl flex items-center justify-center">
          {React.createElement(icon, { className: "w-5 h-5 text-emerald-600" })}
        </div>
        <h3 className="font-bold text-lg text-[var(--text-primary)]">{title}</h3>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        {children}
      </div>
    </div>
  );

  const renderInput = (key: keyof MeasureSheet, label: string, unit: string, type: 'number' | 'text' | 'select' | 'checkbox' = 'number', options?: string[]) => {
    if (type === 'checkbox') {
      return (
        <div key={key} className="flex items-center justify-between p-4 bg-[var(--bg-secondary)] rounded-xl border border-[var(--border-color)]">
          <label className="text-sm font-bold text-[var(--text-primary)] uppercase tracking-wider">{label}</label>
          <button
            onClick={() => onChange({ [key]: !data[key] })}
            className={`w-12 h-6 rounded-full transition-all relative ${data[key] ? 'bg-emerald-600' : 'bg-gray-300'}`}
          >
            <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${data[key] ? 'left-7' : 'left-1'}`} />
          </button>
        </div>
      );
    }

    if (type === 'select') {
      return (
        <div key={key} className="space-y-2">
          <label className="text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-widest">{label}</label>
          <select
            value={data[key] as string}
            onChange={(e) => onChange({ [key]: e.target.value })}
            className="w-full px-4 py-3 bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-600 transition-all text-sm font-bold"
          >
            {options?.map(opt => <option key={opt} value={opt}>{opt.charAt(0).toUpperCase() + opt.slice(1)}</option>)}
          </select>
        </div>
      );
    }

    return (
      <div key={key} className="space-y-2">
        <label className="text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-widest">{label}</label>
        <div className="relative">
          <input
            type={type}
            value={data[key] || ''}
            onChange={(e) => onChange({ [key]: type === 'number' ? parseFloat(e.target.value) || 0 : e.target.value })}
            className="w-full px-4 py-3 bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-600 transition-all text-[var(--text-primary)] font-bold text-lg"
            placeholder="0"
          />
          {unit && (
            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[10px] font-bold text-[var(--text-secondary)] uppercase">
              {unit}
            </span>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-8">
      {renderSection('Footings', Footprints, (
        <>
          {renderInput('footingType', 'Footing Type', '', 'select', ['helical', 'concrete', 'other'])}
          {renderInput('footingCount', 'Footing Count', 'pcs')}
          {renderInput('namiFixCount', 'NamiFix Brackets', 'pcs')}
        </>
      ))}

      {renderSection('Deck Structure', Construction, (
        <>
          {renderInput('ledgerLength', 'Ledger Length', 'lf')}
          {renderInput('deckSqft', 'Deck Area', 'sqft')}
          {renderInput('fasciaLf', 'Fascia Length', 'lf')}
          {renderInput('pictureFrameLf', 'Picture Frame Border', 'lf')}
          {renderInput('joistProtection', 'Joist Protection', '', 'checkbox')}
        </>
      ))}

      {renderSection('Stairs & Railings', Ruler, (
        <>
          {renderInput('stairLf', 'Stair Length', 'steps')}
          {renderInput('woodRailingLf', 'Wood/Cedar Railing', 'lf')}
          {renderInput('drinkRailLf', 'Drink Rail', 'lf')}
          {renderInput('aluminumPostCount', 'Aluminum Posts', 'pcs')}
          {renderInput('aluminum6ftSections', 'Alum 6ft Sections', 'pcs')}
          {renderInput('aluminum8ftSections', 'Alum 8ft Sections', 'pcs')}
          {renderInput('aluminumStairSections', 'Alum Stair 6ft', 'pcs')}
          {renderInput('aluminumStair8Sections', 'Alum Stair 8ft', 'pcs')}
          {renderInput('glassSection6Count', 'Glass Insert 6ft', 'pcs')}
          {renderInput('glassPanelsLf', 'Glass Panels', 'lf')}
          {renderInput('framelessSectionCount', 'Frameless Glass', 'pcs')}
          {renderInput('framelessLf', 'Frameless Glass', 'lf')}
        </>
      ))}

      {renderSection('Skirting, Privacy & Site', Layers, (
        <>
          {renderInput('skirtingSqft', 'Skirting Area', 'sqft')}
          {renderInput('privacyWallLf', 'Privacy Wall', 'lf')}
          {renderInput('privacyPostCount', 'Privacy Posts', 'pcs')}
          {renderInput('privacyScreenCount', 'Privacy Screens', 'pcs')}
          {renderInput('removeDispose', 'Remove/Dispose Existing', '', 'checkbox')}
          {data.removeDispose && renderInput('demoSqft', 'Demo Area', 'sqft')}
          {renderInput('fabricStoneSqft', 'Fabric & Stone', 'sqft')}
          {renderInput('riverWashSqft', 'River Wash Stone', 'sqft')}
          {renderInput('mulchSqft', 'Landscape Mulch', 'sqft')}
          {renderInput('steppingStonesCount', 'Stepping Stones', 'pcs')}
          {renderInput('lightingFixtures', 'Lighting Fixtures', 'pcs')}
          {renderInput('pergolaRequired', 'Pergola Required', '', 'checkbox')}
          {data.pergolaRequired && renderInput('pergolaSize', 'Pergola Size', 'e.g. 12x12', 'text')}
          {renderInput('permitRequired', 'Permit Required', '', 'checkbox')}
          <div className="sm:col-span-2">
            {renderInput('elevationNote', 'Elevation Note', '', 'text')}
          </div>
        </>
      ))}
    </div>
  );
};

export default EstimatorMeasureSheet;
