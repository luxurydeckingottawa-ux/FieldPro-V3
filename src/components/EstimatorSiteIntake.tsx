import React from 'react';
import { SiteIntakeChecklist } from '../types';
import { CheckCircle2, Circle, AlertCircle, Camera, Megaphone } from 'lucide-react';

interface EstimatorSiteIntakeProps {
  data: SiteIntakeChecklist;
  onUpdate: (id: string, value?: any) => void;
  onAddPhoto: () => void;
}

const EstimatorSiteIntake: React.FC<EstimatorSiteIntakeProps> = ({ data, onUpdate, onAddPhoto }) => {
  if (!data) return null;

  const renderCheckItem = (
    id: keyof SiteIntakeChecklist, 
    label: string, 
    description?: string,
    extraContent?: React.ReactNode
  ) => {
    const completed = !!data[id];
    return (
      <div className="bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-2xl overflow-hidden shadow-sm">
        <button
          onClick={() => onUpdate(id as string)}
          className={`w-full flex items-center gap-4 p-5 transition-all ${
            completed ? 'bg-emerald-600/5' : 'hover:bg-[var(--text-primary)]/5'
          }`}
        >
          {completed ? (
            <CheckCircle2 className="w-6 h-6 flex-shrink-0 text-emerald-600" />
          ) : (
            <Circle className="w-6 h-6 flex-shrink-0 opacity-20" />
          )}
          <div className="text-left">
            <span className={`block font-bold ${completed ? 'text-emerald-600' : 'text-[var(--text-primary)]'}`}>
              {label}
            </span>
            {description && (
              <span className="text-xs text-[var(--text-secondary)] font-medium uppercase tracking-wider">
                {description}
              </span>
            )}
          </div>
        </button>
        {extraContent && (
          <div className="px-5 pb-5 pt-0">
            {extraContent}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div className="bg-emerald-600/5 p-4 rounded-xl border border-emerald-600/20 mb-6">
        <div className="flex items-center gap-3 text-emerald-600 mb-2">
          <AlertCircle className="w-5 h-5" />
          <h3 className="font-bold">Site Intake Requirements</h3>
        </div>
        <p className="text-sm text-[var(--text-secondary)]">
          Please confirm all site conditions and capture required measurements.
        </p>
      </div>

      <div className="space-y-4">
        {/* Elevation */}
        {renderCheckItem(
          'elevationConfirmed', 
          'Elevation Confirmed', 
          'Specify measurement in inches',
          <div className="flex items-center gap-3 mt-2">
            <input
              type="text"
              placeholder="e.g. 24 inches"
              value={data.elevationMeasurement || ''}
              onChange={(e) => onUpdate('elevationMeasurement', e.target.value)}
              className="flex-1 px-4 py-2 bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-600 transition-all text-sm"
            />
          </div>
        )}

        {/* Site Access */}
        {renderCheckItem('accessConfirmed', 'Site Access Confirmed', 'Access for crew and materials')}

        {/* Removal / Demo */}
        {renderCheckItem('removalRequired', 'Removal / Demo Required', 'Existing structure removal needed')}

        {/* Helical Pile Access */}
        {renderCheckItem(
          'helicalPileAccess', 
          'Helical Pile Machine Access', 
          'Measure gate opening width',
          <div className="flex items-center gap-3 mt-2">
            <input
              type="text"
              placeholder='Gate width (e.g. 36")'
              value={data.gateOpeningMeasurement || ''}
              onChange={(e) => onUpdate('gateOpeningMeasurement', e.target.value)}
              className="flex-1 px-4 py-2 bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-600 transition-all text-sm"
            />
          </div>
        )}

        {/* Obstacles */}
        {renderCheckItem(
          'obstaclesIdentified', 
          'Obstacles Identified', 
          'AC units, Gas lines, Utilities, etc.',
          <button
            onClick={onAddPhoto}
            className="w-full flex items-center justify-center gap-2 py-3 bg-blue-600/10 text-blue-600 rounded-xl font-bold text-xs uppercase tracking-widest hover:bg-blue-600/20 transition-all mt-2"
          >
            <Camera className="w-4 h-4" />
            Upload Obstacle Photos
          </button>
        )}

        {/* Marketing Section */}
        <div className="bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-2xl p-5 shadow-sm space-y-4">
          <div className="flex items-center gap-3 text-emerald-600 mb-2">
            <Megaphone className="w-5 h-5" />
            <h3 className="font-bold">Marketing Tracking</h3>
          </div>
          
          <div className="space-y-4">
            <div>
              <label className="block text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-widest mb-1">
                How they heard about us
              </label>
              <select
                value={data.marketingSource || ''}
                onChange={(e) => onUpdate('marketingSource', e.target.value)}
                className="w-full px-4 py-3 bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-600 transition-all text-sm"
              >
                <option value="">Select Source...</option>
                <option value="google">Google Search</option>
                <option value="facebook">Facebook / Instagram</option>
                <option value="referral">Referral</option>
                <option value="signage">Site Signage</option>
                <option value="other">Other</option>
              </select>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-widest mb-1">
                Platform / Ad Details
              </label>
              <textarea
                placeholder="e.g. Facebook Ad - Summer Deck Promo"
                value={data.marketingDetail || ''}
                onChange={(e) => onUpdate('marketingDetail', e.target.value)}
                className="w-full h-24 px-4 py-3 bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-600 transition-all text-sm resize-none"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EstimatorSiteIntake;
