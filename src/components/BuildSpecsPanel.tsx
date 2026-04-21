/**
 * BuildSpecsPanel — full Digital Work Order view (read-only)
 *
 * Mirrors the Build Specifications section in OfficeJobDetailView so that
 * installers and subcontractors see the EXACT same spec sheet the office
 * sees — without any pricing. Jack's rule: field sees the how, not the how
 * much.
 *
 * Data is dual-sourced from `job.buildDetails` (legacy intake) and
 * `job.digitalWorkOrder` (Job Setup Wizard) so jobs created by either flow
 * populate correctly. Sections only render when at least one of their
 * source fields has data.
 *
 * Sections rendered (in order):
 *   1. Site & Foundation
 *   2. Framing & Structure
 *   3. Decking
 *   4. Railing
 *   5. Stairs
 *   6. Skirting & Privacy
 *   7. Electrical & Extras
 *   8. Scope Notes & Add-Ons
 *   9. Schedule & Crew (shown only when `showScheduleAndCrew` prop is true)
 *  10. Site Access & Delivery
 *  11. Additional Notes
 *
 * For office use we still render the Edit button inline in OfficeJobDetailView
 * — this component is deliberately read-only so it's safe to drop into any
 * role's view without gating.
 */

import React from 'react';
import { ClipboardCheck } from 'lucide-react';
import { Job } from '../types';

interface BuildSpecsPanelProps {
  job: Job;
  /** Omit crew assignment section for subcontractors who only see their own assignments. */
  showScheduleAndCrew?: boolean;
}

const BuildSpecsPanel: React.FC<BuildSpecsPanelProps> = ({ job, showScheduleAndCrew = true }) => {
  const bd = job.buildDetails;
  const dwo = job.digitalWorkOrder;
  const ms = job.estimatorIntake?.measureSheet;

  // Nothing to show
  if (!bd && !dwo) return null;

  const sectionSite = (bd?.footings || dwo?.footingType || dwo?.footingSystem || dwo?.deckType || dwo?.deckHeight || dwo?.footingsCount || dwo?.permitRequired);
  const sectionFraming = (bd?.framing || dwo?.framingMaterial || dwo?.joistSize || dwo?.joistSpacing || dwo?.joistProtection);
  const sectionDecking = (bd?.decking || dwo?.deckingMaterial || dwo?.deckingBrand || dwo?.deckingColor || dwo?.deckSqFt || dwo?.pictureFrame);
  const sectionRailing = (bd?.railing?.included || dwo?.railingIncluded || dwo?.railingType || dwo?.railingSystem || dwo?.railingBrand || dwo?.railingLF);
  const sectionStairs = (bd?.stairs?.included || dwo?.stairsIncluded || dwo?.stairs || dwo?.stairCount);
  const sectionSkirting = (bd?.skirting?.included || dwo?.skirtingIncluded || dwo?.skirtingType || dwo?.skirtingGate || (ms?.skirtingSqft ?? 0) > 0 || (ms?.privacyWallLf ?? 0) > 0 || bd?.features?.privacyWall);
  const sectionElectrical = (bd?.electrical?.lightingIncluded || dwo?.lightingIncluded || dwo?.lightingType || bd?.features?.pergolaRequired || (ms?.lightingFixtures ?? 0) > 0 || ms?.pergolaRequired);
  const sectionScopeNotes = (dwo?.scopeNotes || (dwo?.addOns && dwo.addOns.length > 0));
  const sectionScheduleCrew = showScheduleAndCrew && (dwo?.estimatedStartDate || dwo?.estimatedDuration || dwo?.assignedTo);
  const sectionSiteAccess = (dwo?.siteAccessNotes || dwo?.parkingNotes || dwo?.materialDeliveryDate || dwo?.deliveryNotes);
  const sectionAddtlNotes = (bd?.features?.customNotes || bd?.sitePrep?.notes);

  // Shared presentation bits
  const cell = (label: string, value: React.ReactNode, highlight = false) => (
    <div>
      <p className="text-[9px] font-black text-[var(--text-tertiary)] uppercase tracking-widest mb-0.5">{label}</p>
      <p className={`text-sm font-bold ${highlight ? 'text-[var(--brand-gold)]' : 'text-[var(--text-primary)]'}`}>{value}</p>
    </div>
  );

  return (
    <section className="bg-[var(--card-bg)] border border-[var(--border-color)] rounded-[2rem] overflow-hidden">
      {/* Header */}
      <div className="px-6 py-5 border-b border-[var(--border-color)] flex items-center justify-between">
        <div>
          <p className="text-[9px] font-black text-[var(--brand-gold)] uppercase tracking-[0.25em] mb-0.5 flex items-center gap-1.5">
            <ClipboardCheck size={11} /> Build Specifications
          </p>
          <h3 className="text-base font-black text-[var(--text-primary)] uppercase tracking-tight italic">Digital Work Order</h3>
        </div>
        <span className="text-[8px] font-black bg-[var(--brand-gold)]/10 text-[var(--brand-gold)] border border-[var(--brand-gold)]/20 px-2.5 py-1 rounded uppercase tracking-widest">
          Field Reference
        </span>
      </div>

      {/* Grid */}
      <div className="divide-y divide-[var(--border-color)]">

        {/* Site & Foundation */}
        {sectionSite && (
          <div className="px-6 py-4">
            <p className="text-[8px] font-black text-[var(--brand-gold)] uppercase tracking-[0.2em] mb-3">Site & Foundation</p>
            <div className="grid grid-cols-2 gap-x-8 gap-y-3">
              {dwo?.deckType && cell('Deck Type', dwo.deckType)}
              {dwo?.deckHeight && cell('Deck Height', dwo.deckHeight)}
              {(bd?.footings?.type || dwo?.footingType) && cell('Footing Type', bd?.footings?.type || dwo?.footingType)}
              {(bd?.footings?.bracketType || dwo?.footingSystem) && cell('Bracket / System', bd?.footings?.bracketType || dwo?.footingSystem)}
              {((ms?.footingCount ?? 0) > 0 || dwo?.footingsCount) && cell('Quantity', `${ms?.footingCount || dwo?.footingsCount} pcs`)}
              {dwo?.permitNumber && cell('Permit #', dwo.permitNumber)}
              {(bd?.footings?.attachedToHouse || bd?.footings?.floating || bd?.sitePrep?.permitsRequired || bd?.sitePrep?.locatesRequired || dwo?.permitRequired) && (
                <div className="col-span-2 flex flex-wrap gap-1.5 mt-1">
                  {bd?.footings?.attachedToHouse && <span className="text-[8px] font-black px-2 py-0.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 uppercase tracking-widest">Attached to House</span>}
                  {bd?.footings?.floating && <span className="text-[8px] font-black px-2 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 uppercase tracking-widest">Floating</span>}
                  {(bd?.sitePrep?.permitsRequired || dwo?.permitRequired) && <span className="text-[8px] font-black px-2 py-0.5 rounded-full bg-purple-500/10 border border-purple-500/20 text-purple-400 uppercase tracking-widest">Permit Required</span>}
                  {bd?.sitePrep?.locatesRequired && <span className="text-[8px] font-black px-2 py-0.5 rounded-full bg-orange-500/10 border border-orange-500/20 text-orange-400 uppercase tracking-widest">Locates Required</span>}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Framing & Structure */}
        {sectionFraming && (
          <div className="px-6 py-4">
            <p className="text-[8px] font-black text-[var(--brand-gold)] uppercase tracking-[0.2em] mb-3">Framing & Structure</p>
            <div className="grid grid-cols-2 gap-x-8 gap-y-3">
              {(bd?.framing?.type || dwo?.framingMaterial) && cell('Frame Type', bd?.framing?.type || dwo?.framingMaterial)}
              {(bd?.framing?.joistSize || bd?.framing?.joistSpacing || dwo?.joistSize || dwo?.joistSpacing) && cell(
                'Joists',
                <>
                  {bd?.framing?.joistSize || dwo?.joistSize}
                  {(bd?.framing?.joistSpacing || dwo?.joistSpacing) ? ` @ ${bd?.framing?.joistSpacing || dwo?.joistSpacing}` : ''}
                </>
              )}
              {(bd?.framing?.joistProtection || dwo?.joistProtection) && cell('Joist Protection', bd?.framing?.joistProtectionType || 'Yes')}
              {(ms?.deckSqft ?? 0) > 0 && cell('Deck Area', `${ms!.deckSqft} sqft`)}
            </div>
            {bd?.framing?.notes && (
              <p className="mt-3 text-xs text-[var(--text-secondary)] italic leading-relaxed border-t border-[var(--border-color)] pt-3">{bd.framing.notes}</p>
            )}
          </div>
        )}

        {/* Decking */}
        {sectionDecking && (
          <div className="px-6 py-4">
            <p className="text-[8px] font-black text-[var(--brand-gold)] uppercase tracking-[0.2em] mb-3">Decking</p>
            <div className="grid grid-cols-2 gap-x-8 gap-y-3">
              {(bd?.decking?.brand || bd?.decking?.type || dwo?.deckingMaterial || dwo?.deckingBrand) && cell(
                'Material',
                bd?.decking
                  ? `${bd.decking.brand ?? ''} ${bd.decking.type ?? ''}`.trim()
                  : `${dwo?.deckingBrand ?? ''} ${dwo?.deckingMaterial ?? ''}`.trim()
              )}
              {(bd?.decking?.color || dwo?.deckingColor) && cell('Colour', bd?.decking?.color || dwo?.deckingColor, true)}
              {((ms?.deckSqft ?? 0) > 0 || dwo?.deckSqFt) && cell('Area', `${ms?.deckSqft || dwo?.deckSqFt} sqft`)}
              {(ms?.fasciaLf ?? 0) > 0 && cell('Fascia', `${ms!.fasciaLf} lf`)}
              {dwo?.fastenerType && cell('Fasteners', dwo.fastenerType)}
              {dwo?.pictureFrame && cell('Picture Frame Border', dwo.pictureFrameColor || 'Yes', true)}
            </div>
            {bd?.decking?.accentNote && (
              <p className="mt-3 text-xs text-[var(--text-secondary)] italic leading-relaxed border-t border-[var(--border-color)] pt-3">{bd.decking.accentNote}</p>
            )}
          </div>
        )}

        {/* Railing */}
        {sectionRailing && (
          <div className="px-6 py-4">
            <p className="text-[8px] font-black text-[var(--brand-gold)] uppercase tracking-[0.2em] mb-3">Railing</p>
            <div className="grid grid-cols-2 gap-x-8 gap-y-3">
              {cell('Type', bd?.railing?.type || dwo?.railingType || dwo?.railingSystem || 'Included')}
              {dwo?.railingBrand && cell('Brand', dwo.railingBrand)}
              {((ms?.woodRailingLf ?? 0) > 0 || dwo?.railingLF) && cell('Linear Feet', `${ms?.woodRailingLf || dwo?.railingLF} lf`)}
              {(ms?.aluminumPostCount ?? 0) > 0 && cell('Posts', `${ms!.aluminumPostCount} pcs`)}
            </div>
          </div>
        )}

        {/* Stairs */}
        {sectionStairs && (
          <div className="px-6 py-4">
            <p className="text-[8px] font-black text-[var(--brand-gold)] uppercase tracking-[0.2em] mb-3">Stairs</p>
            <div className="grid grid-cols-2 gap-x-8 gap-y-3">
              {(bd?.stairs?.style || dwo?.stairs) && cell('Style', bd?.stairs?.style || dwo?.stairs)}
              {bd?.stairs?.type && cell('Type', bd.stairs.type)}
              {((ms?.stairLf ?? 0) > 0 || dwo?.stairCount) && cell('Steps', ms?.stairLf || dwo?.stairCount)}
            </div>
          </div>
        )}

        {/* Skirting & Privacy */}
        {sectionSkirting && (
          <div className="px-6 py-4">
            <p className="text-[8px] font-black text-[var(--brand-gold)] uppercase tracking-[0.2em] mb-3">Skirting & Privacy</p>
            <div className="grid grid-cols-2 gap-x-8 gap-y-3">
              {(bd?.skirting?.included || dwo?.skirtingIncluded || dwo?.skirtingType) && cell('Skirting Type', bd?.skirting?.type || dwo?.skirtingType || 'Included')}
              {(ms?.skirtingSqft ?? 0) > 0 && cell('Skirting Area', `${ms!.skirtingSqft} sqft`)}
              {(bd?.features?.privacyWall || (ms?.privacyWallLf ?? 0) > 0) && cell(
                'Privacy Wall',
                bd?.features?.privacyWallType || ((ms?.privacyWallLf ?? 0) > 0 ? `${ms!.privacyWallLf} lf` : 'Yes')
              )}
              {(bd?.skirting?.trapDoor || dwo?.skirtingGate) && (
                <div className="col-span-2 flex items-center gap-1.5">
                  {dwo?.skirtingGate && <span className="text-[8px] font-black px-2 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 uppercase tracking-widest">Skirting Gate</span>}
                  {bd?.skirting?.trapDoor && <span className="text-[8px] font-black px-2 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 uppercase tracking-widest">Trap Door</span>}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Electrical & Extras */}
        {sectionElectrical && (
          <div className="px-6 py-4">
            <p className="text-[8px] font-black text-[var(--brand-gold)] uppercase tracking-[0.2em] mb-3">Electrical & Extras</p>
            <div className="grid grid-cols-2 gap-x-8 gap-y-3">
              {(bd?.electrical?.lightingIncluded || dwo?.lightingIncluded || (ms?.lightingFixtures ?? 0) > 0) && cell(
                'Lighting',
                bd?.electrical?.lightingType || dwo?.lightingType || ((ms?.lightingFixtures ?? 0) > 0 ? `${ms!.lightingFixtures} fixtures` : 'Yes')
              )}
              {bd?.electrical?.roughInNotes && (
                <div className="col-span-2">
                  <p className="text-[9px] font-black text-[var(--text-tertiary)] uppercase tracking-widest mb-0.5">Electrical Notes</p>
                  <p className="text-xs text-[var(--text-secondary)]">{bd.electrical.roughInNotes}</p>
                </div>
              )}
              {(bd?.features?.pergolaRequired || ms?.pergolaRequired) && cell('Pergola', ms?.pergolaSize || 'Yes')}
              {bd?.landscaping?.prepType && cell('Landscaping', bd.landscaping.prepType)}
            </div>
          </div>
        )}

        {/* Scope Notes & Add-Ons */}
        {sectionScopeNotes && (
          <div className="px-6 py-4">
            <p className="text-[8px] font-black text-[var(--brand-gold)] uppercase tracking-[0.2em] mb-3">Scope Notes & Add-Ons</p>
            {dwo?.addOns && dwo.addOns.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mb-3">
                {dwo.addOns.map((addon, i) => (
                  <span key={i} className="text-[9px] font-black px-2.5 py-1 rounded-full bg-[var(--brand-gold)]/10 border border-[var(--brand-gold)]/20 text-[var(--brand-gold)] uppercase tracking-widest">
                    {addon}
                  </span>
                ))}
              </div>
            )}
            {dwo?.scopeNotes && (
              <p className="text-xs text-[var(--text-secondary)] leading-relaxed whitespace-pre-wrap">{dwo.scopeNotes}</p>
            )}
          </div>
        )}

        {/* Schedule & Crew */}
        {sectionScheduleCrew && (
          <div className="px-6 py-4">
            <p className="text-[8px] font-black text-[var(--brand-gold)] uppercase tracking-[0.2em] mb-3">Schedule & Crew</p>
            <div className="grid grid-cols-2 gap-x-8 gap-y-3">
              {dwo!.estimatedStartDate && cell('Estimated Start', dwo!.estimatedStartDate)}
              {dwo!.estimatedDuration && cell('Estimated Duration', `${dwo!.estimatedDuration} ${dwo!.estimatedDuration === 1 ? 'day' : 'days'}`)}
              {dwo!.assignedTo && cell('Crew Lead', dwo!.assignedTo)}
            </div>
          </div>
        )}

        {/* Site Access & Delivery */}
        {sectionSiteAccess && (
          <div className="px-6 py-4">
            <p className="text-[8px] font-black text-[var(--brand-gold)] uppercase tracking-[0.2em] mb-3">Site Access & Delivery</p>
            <div className="grid grid-cols-2 gap-x-8 gap-y-3">
              {dwo!.siteAccessNotes && (
                <div className="col-span-2">
                  <p className="text-[9px] font-black text-[var(--text-tertiary)] uppercase tracking-widest mb-0.5">Site Access</p>
                  <p className="text-xs text-[var(--text-secondary)]">{dwo!.siteAccessNotes}</p>
                </div>
              )}
              {dwo!.parkingNotes && (
                <div className="col-span-2">
                  <p className="text-[9px] font-black text-[var(--text-tertiary)] uppercase tracking-widest mb-0.5">Parking / Staging</p>
                  <p className="text-xs text-[var(--text-secondary)]">{dwo!.parkingNotes}</p>
                </div>
              )}
              {dwo!.materialDeliveryDate && cell('Delivery Date', dwo!.materialDeliveryDate)}
              {dwo!.deliveryNotes && (
                <div className="col-span-2">
                  <p className="text-[9px] font-black text-[var(--text-tertiary)] uppercase tracking-widest mb-0.5">Delivery Notes</p>
                  <p className="text-xs text-[var(--text-secondary)]">{dwo!.deliveryNotes}</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Additional Notes */}
        {sectionAddtlNotes && (
          <div className="px-6 py-4 bg-[var(--bg-secondary)]">
            <p className="text-[8px] font-black text-[var(--text-tertiary)] uppercase tracking-[0.2em] mb-2">Additional Notes</p>
            <p className="text-xs text-[var(--text-secondary)] leading-relaxed italic">
              {bd?.features?.customNotes || bd?.sitePrep?.notes}
            </p>
          </div>
        )}

      </div>
    </section>
  );
};

export default BuildSpecsPanel;
