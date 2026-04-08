/**
 * Rule-Based Intake Validation
 * 
 * Replaces the AI handoff with simple rule-based checks.
 * No API keys needed, works offline, zero cost.
 */

import { EstimatorIntake, AiFlag } from '../types';

export function validateIntakeCompleteness(intake: EstimatorIntake): AiFlag[] {
  const flags: AiFlag[] = [];
  const ms = intake.measureSheet;
  const cl = intake.checklist;
  let flagId = 0;

  const addFlag = (type: AiFlag['type'], category: AiFlag['category'], message: string, severity: AiFlag['severity']) => {
    flags.push({
      id: `rule-${flagId++}`,
      type,
      category,
      message,
      severity,
      resolved: false,
    });
  };

  // --- CRITICAL CHECKS (high severity) ---

  if (ms.deckSqft <= 0) {
    addFlag('missing', 'measures', 'Deck square footage is missing. This is required for pricing.', 'high');
  }

  if (ms.footingCount <= 0) {
    addFlag('missing', 'measures', 'Footing count is zero. Every deck needs footings.', 'high');
  }

  if (!cl.elevationConfirmed) {
    addFlag('missing', 'intake', 'Door elevation has not been confirmed. Measure the patio door threshold height.', 'high');
  }

  // --- IMPORTANT CHECKS (medium severity) ---

  if (ms.stairLf > 0 && !cl.elevationMeasurement) {
    addFlag('missing', 'intake', 'Stairs are included but door elevation measurement is missing. Need to calculate step count.', 'medium');
  }

  if (!cl.accessConfirmed) {
    addFlag('missing', 'intake', 'Site access has not been confirmed. Check gate width and machinery access.', 'medium');
  }

  if (cl.helicalPileAccess === false && ms.footingType === 'helical') {
    addFlag('mismatch', 'intake', 'Helical piles selected but access was marked as not available. Verify equipment can reach the site.', 'medium');
  }

  if (cl.removalRequired && ms.demoSqft <= 0) {
    addFlag('missing', 'measures', 'Removal/demo is required but demo square footage is zero. Measure the existing structure.', 'medium');
  }

  if (ms.ledgerLength <= 0 && ms.footingType !== 'helical') {
    addFlag('reminder', 'measures', 'No ledger length entered. Is the deck freestanding or attached to the house?', 'medium');
  }

  if (!cl.marketingSource) {
    addFlag('missing', 'intake', 'Marketing source is missing. Ask the client how they found Luxury Decking.', 'medium');
  }

  // --- HELPFUL REMINDERS (low severity) ---

  if (ms.deckSqft > 0 && ms.fasciaLf <= 0) {
    addFlag('reminder', 'measures', 'No fascia linear footage entered. Most decks include fascia boards.', 'low');
  }

  if (ms.aluminumPostCount > 0 && ms.aluminum6ftSections <= 0 && ms.aluminum8ftSections <= 0) {
    addFlag('reminder', 'measures', 'Aluminum posts counted but no railing sections entered.', 'low');
  }

  if (ms.privacyWallLf > 0 && ms.privacyPostCount <= 0) {
    addFlag('reminder', 'measures', 'Privacy wall LF entered but post count is zero.', 'low');
  }

  if (ms.pergolaRequired && !ms.pergolaSize) {
    addFlag('missing', 'measures', 'Pergola is marked as required but no size/notes captured.', 'low');
  }

  if (ms.lightingFixtures > 0 && ms.joistProtection === false) {
    addFlag('suggestion', 'measures', 'Lighting fixtures selected. Consider joist protection to allow for wiring rough-in before decking.', 'low');
  }

  if (intake.photos.length === 0) {
    addFlag('reminder', 'photos', 'No site photos uploaded. Photos of the yard, house wall, existing structure, and access points are recommended.', 'medium');
  }

  if (!intake.notes || intake.notes.trim().length < 10) {
    addFlag('reminder', 'intake', 'Site notes are empty or very brief. Add key observations about the site, client preferences, and any special conditions.', 'low');
  }

  return flags;
}

export function generateHandoffSummary(intake: EstimatorIntake): string {
  const ms = intake.measureSheet;
  const cl = intake.checklist;
  const parts: string[] = [];

  // Deck overview
  if (ms.deckSqft > 0) {
    parts.push(`${ms.deckSqft} sqft deck with ${ms.footingCount} ${ms.footingType} footings.`);
  }

  // Attachment
  if (ms.ledgerLength > 0) {
    parts.push(`Attached to house with ${ms.ledgerLength} LF ledger.`);
  } else {
    parts.push('Freestanding deck (no ledger).');
  }

  // Stairs
  if (ms.stairLf > 0) {
    parts.push(`Stairs included: ${ms.stairLf} LF.`);
  }

  // Railing
  const totalRailing = ms.woodRailingLf + (ms.aluminum6ftSections * 6) + (ms.aluminum8ftSections * 8);
  if (totalRailing > 0) {
    const type = ms.aluminumPostCount > 0 ? 'aluminum' : 'wood';
    parts.push(`${type} railing: ~${totalRailing} LF.`);
  }

  // Extras
  if (ms.skirtingSqft > 0) parts.push(`Skirting: ${ms.skirtingSqft} sqft.`);
  if (ms.privacyWallLf > 0) parts.push(`Privacy wall: ${ms.privacyWallLf} LF.`);
  if (ms.pergolaRequired) parts.push(`Pergola required${ms.pergolaSize ? `: ${ms.pergolaSize}` : ''}.`);
  if (ms.lightingFixtures > 0) parts.push(`Lighting: ${ms.lightingFixtures} fixtures.`);

  // Site conditions
  if (cl.removalRequired) parts.push(`Demo/removal required: ${ms.demoSqft} sqft.`);
  if (cl.obstaclesIdentified) parts.push('Site obstacles identified - review photos.');
  if (cl.elevationMeasurement) parts.push(`Door elevation: ${cl.elevationMeasurement}.`);
  if (cl.gateOpeningMeasurement) parts.push(`Gate opening: ${cl.gateOpeningMeasurement}.`);

  // Notes
  if (intake.notes && intake.notes.trim().length > 10) {
    parts.push(`Notes: ${intake.notes.trim().substring(0, 200)}`);
  }

  return parts.join(' ');
}
