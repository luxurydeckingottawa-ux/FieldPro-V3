/**
 * Pre-fill Build Details from Accepted Quote Data
 * 
 * When a quote is accepted, auto-populate the job's build details
 * with information from the estimate selections.
 */

import { BuildDetails } from '../types';

interface QuoteSelections {
  foundation?: string;
  framing?: string;
  decking?: string;
  railing?: string;
  skirting?: string;
  privacy?: string;
  accessories?: string;
  extras?: string;
  [key: string]: string | undefined;
}

export function prefillBuildDetailsFromQuote(
  existing: BuildDetails,
  selections: QuoteSelections,
  scopeSummary?: string
): BuildDetails {
  const updated = { ...existing };

  // Ensure all nested objects exist
  if (!updated.footings) updated.footings = { type: '', attachedToHouse: false, floating: false, bracketType: '', notes: '' };
  if (!updated.framing) updated.framing = { type: '', joistSize: '', joistSpacing: '', joistProtection: false, joistProtectionType: '', notes: '' };
  if (!updated.decking) updated.decking = { type: '', brand: '', color: '', accentNote: '', notes: '' };
  if (!updated.railing) updated.railing = { included: false, type: '', notes: '' };
  if (!updated.skirting) updated.skirting = { included: false, type: '', trapDoor: false, notes: '' };
  if (!updated.features) updated.features = { privacyWall: false, privacyWallType: '', customNotes: '' };
  if (!updated.sitePrep) updated.sitePrep = { demolitionRequired: false, permitsRequired: false, locatesRequired: false, binRequired: false, siteProtection: false, inspectionRequired: false, notes: '' };
  if (!updated.electrical) updated.electrical = { lightingIncluded: false, lightingType: '', roughInNotes: '', notes: '' };
  if (!updated.landscaping) updated.landscaping = { prepType: '', notes: '' };
  if (!updated.stairs) updated.stairs = { included: false, type: '', style: '', notes: '' };

  // Foundation
  if (selections.foundation) {
    const foundationId = selections.foundation;
    if (foundationId.includes('helical')) {
      updated.footings = { ...updated.footings, type: 'Helical Piles (7\')', notes: 'Selected from estimate' };
    } else if (foundationId.includes('sonotube') || foundationId.includes('concrete')) {
      updated.footings = { ...updated.footings, type: '48" Concrete Sonotubes', notes: 'Selected from estimate' };
    }
  }

  // Framing
  if (selections.framing) {
    const framingId = selections.framing;
    if (framingId.includes('fiberglass')) {
      updated.framing = { ...updated.framing, type: 'Fiberglass Composite', joistSize: '2x8', joistSpacing: '16" OC', notes: 'Fiberglass upgrade from estimate' };
    } else {
      updated.framing = { ...updated.framing, type: 'Pressure Treated', joistSize: '2x8', joistSpacing: '16" OC' };
    }
  } else {
    // Default framing
    updated.framing = { ...updated.framing, type: 'Pressure Treated', joistSize: '2x8', joistSpacing: '16" OC' };
  }

  // Decking
  if (selections.decking) {
    const deckingId = selections.decking;
    if (deckingId.includes('cedar')) {
      updated.decking = { ...updated.decking, type: 'Natural Wood', brand: 'Cedar', notes: 'Selected from estimate' };
    } else if (deckingId.includes('goodlife') || deckingId.includes('fiberon_goodlife')) {
      updated.decking = { ...updated.decking, type: 'Composite', brand: 'Fiberon GoodLife', notes: 'Selected from estimate' };
    } else if (deckingId.includes('sanctuary')) {
      updated.decking = { ...updated.decking, type: 'Composite', brand: 'Fiberon Sanctuary', notes: 'Selected from estimate' };
    } else if (deckingId.includes('concordia')) {
      updated.decking = { ...updated.decking, type: 'Composite', brand: 'Fiberon Concordia', notes: 'Selected from estimate' };
    } else if (deckingId.includes('paramount')) {
      updated.decking = { ...updated.decking, type: 'PVC', brand: 'Fiberon Paramount', notes: 'Selected from estimate' };
    } else if (deckingId.includes('promenade')) {
      updated.decking = { ...updated.decking, type: 'PVC', brand: 'Fiberon Promenade', notes: 'Selected from estimate' };
    } else if (deckingId.includes('azek')) {
      const azekLine = deckingId.includes('harvest') ? 'Harvest' : deckingId.includes('landmark') ? 'Landmark' : deckingId.includes('vintage') ? 'Vintage' : '';
      updated.decking = { ...updated.decking, type: 'PVC', brand: `AZEK ${azekLine}`, notes: 'Selected from estimate' };
    } else if (deckingId.includes('woodbridge') || deckingId.includes('clubhouse')) {
      updated.decking = { ...updated.decking, type: 'PVC', brand: 'ClubHouse Woodbridge', notes: 'Selected from estimate' };
    } else if (deckingId.includes('eva')) {
      const evaLine = deckingId.includes('apex') ? 'Apex' : deckingId.includes('pioneer') ? 'Pioneer Ultra' : deckingId.includes('infinity') ? 'Infinity' : '';
      updated.decking = { ...updated.decking, type: deckingId.includes('infinity') ? 'Composite' : 'PVC', brand: `Eva-Last ${evaLine}`, notes: 'Selected from estimate' };
    } else {
      updated.decking = { ...updated.decking, type: 'Pressure Treated', brand: 'PT Lumber', notes: 'Default from estimate' };
    }
  }

  // Railing
  if (selections.railing) {
    const railingId = selections.railing;
    if (railingId.includes('fortress') || railingId.includes('aluminum') || railingId.includes('al13')) {
      updated.railing = { ...updated.railing, included: true, type: 'Fortress AL13 Aluminum', notes: 'Selected from estimate' };
    } else if (railingId.includes('cedar')) {
      updated.railing = { ...updated.railing, included: true, type: 'Cedar Wood Railing', notes: 'Selected from estimate' };
    } else if (railingId.includes('metal_spindle') || railingId.includes('wood_metal')) {
      updated.railing = { ...updated.railing, included: true, type: 'Wood with Metal Spindles', notes: 'Selected from estimate' };
    } else if (railingId.includes('glass') || railingId.includes('frameless')) {
      updated.railing = { ...updated.railing, included: true, type: 'Frameless Glass', notes: 'Selected from estimate' };
    } else {
      updated.railing = { ...updated.railing, included: true, type: 'PT Wood Railing', notes: 'Selected from estimate' };
    }
  }

  // Skirting
  if (selections.skirting) {
    updated.skirting = { ...updated.skirting, included: true, type: selections.skirting, notes: 'Selected from estimate' };
  }

  // Privacy wall
  if (selections.privacy) {
    updated.features = { ...updated.features, privacyWall: true, privacyWallType: selections.privacy, customNotes: 'Selected from estimate' };
  }

  return updated;
}
