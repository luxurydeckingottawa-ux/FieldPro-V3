/**
 * Data Bridge: Converts Field Pro EstimatorIntake (MeasureSheet) data
 * into the Pricing Calculator's Dimensions format.
 * 
 * The field estimator captures measurements on-site.
 * The pricing calculator uses those measurements to compute pricing.
 * This bridge maps between the two data shapes.
 */

import { MeasureSheet, Job } from '../types';
import { CalculatorDimensions, CalculatorClientInfo } from './EstimatorCalculatorView';

/**
 * Converts a field estimator's MeasureSheet into Calculator Dimensions.
 * Any fields not captured in the field intake default to 0.
 */
export function measureSheetToCalculatorDimensions(sheet: MeasureSheet): Partial<CalculatorDimensions> {
  return {
    sqft: sheet.deckSqft || 0,
    footingsCount: sheet.footingCount || 0,
    steps: sheet.stairLf || 0,
    fasciaLF: sheet.fasciaLf || 0,
    ledgerLF: sheet.ledgerLength || 0,
    namiFixCount: sheet.namiFixCount || 0,
    skirtingSqFt: sheet.skirtingSqft || 0,
    borderLF: sheet.pictureFrameLf || 0,
    privacyLF: sheet.privacyWallLf || 0,
    privacyPosts: sheet.privacyPostCount || 0,
    privacyScreens: sheet.privacyScreenCount || 0,
    railingLF: sheet.woodRailingLf || 0,
    drinkRailLF: sheet.drinkRailLf || 0,
    alumPosts: sheet.aluminumPostCount || 0,
    alumSection6: sheet.aluminum6ftSections || 0,
    alumSection8: sheet.aluminum8ftSections || 0,
    alumStair6: sheet.aluminumStairSections || 0,
    alumStair8: sheet.aluminumStair8Sections || 0,
    glassSection6: sheet.glassSection6Count || 0,
    glassPanelsLF: sheet.glassPanelsLf || 0,
    framelessSections: sheet.framelessSectionCount || 0,
    framelessLF: sheet.framelessLf || 0,
    landscapeSqFt: sheet.fabricStoneSqft || 0,
    lightsCount: sheet.lightingFixtures || 0,
    demoSqFt: sheet.demoSqft || 0,
    riverWashSqFt: sheet.riverWashSqft || 0,
    mulchSqFt: sheet.mulchSqft || 0,
    steppingStonesCount: sheet.steppingStonesCount || 0,
  };
}

/**
 * Extracts client info from a Job record for pre-filling the calculator.
 */
export function jobToCalculatorClientInfo(job: Job): CalculatorClientInfo {
  return {
    name: job.clientName || '',
    address: job.projectAddress || '',
  };
}

/**
 * Loads a saved EstimatorIntake from storage for a given job.
 * Synchronous version (localStorage only) - used as a quick fallback.
 * For cross-device support, use loadEstimatorIntakeAsync.
 */
export function loadEstimatorIntake(jobId: string): MeasureSheet | null {
  try {
    const saved = localStorage.getItem(`estimator_intake_${jobId}`);
    if (saved) {
      const intake = JSON.parse(saved);
      return intake.measureSheet || null;
    }
  } catch (e) {
    console.error('Failed to load estimator intake for job:', jobId, e);
  }
  return null;
}

/**
 * Async version that checks Supabase first, then falls back to localStorage.
 * This is the one that enables cross-device handoff.
 */
export async function loadEstimatorIntakeAsync(jobId: string): Promise<MeasureSheet | null> {
  // Import dynamically to avoid circular deps
  const { dataService } = await import('../services/dataService');
  const intake = await dataService.loadEstimatorIntake(jobId);
  if (intake?.measureSheet) return intake.measureSheet;
  // Fall back to sync version
  return loadEstimatorIntake(jobId);
}
