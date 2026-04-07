import { Type } from "@google/genai";
import { getAI, handleAiError } from "../lib/ai";
import { EstimatorIntake, AiFlag, AiHandoffSummary } from "../types";

export const estimatorAiService = {
  /**
   * Analyzes the intake data and flags missing or incomplete information.
   */
  async detectMissingInfo(intake: EstimatorIntake): Promise<AiFlag[]> {
    const prompt = `
      You are an AI Estimator Assist for Luxury Decking. 
      Review the following site intake data and flag any missing or likely incomplete information.
      
      Intake Checklist: ${JSON.stringify(intake.checklist)}
      Measure Sheet: ${JSON.stringify(intake.measureSheet)}
      Notes: ${intake.notes}
      
      Common misses to look for:
      - Patio door elevation missing if stairs are likely.
      - Access width missing for machinery.
      - Disposal/removal not marked if an existing deck is mentioned.
      - Helical access not marked.
      - Stairs likely required but no stair quantity entered.
      - Privacy wall noted but no LF entered.
      - Pergola marked but no size/note captured.
      
      Return a list of flags in JSON format:
      [{
        "id": "unique-id",
        "type": "missing" | "mismatch" | "suggestion" | "reminder",
        "category": "intake" | "measures" | "sketch" | "photos",
        "message": "Clear, helpful message for the estimator",
        "severity": "low" | "medium" | "high",
        "resolved": false
      }]
    `;

    try {
      const ai = getAI();
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                id: { type: Type.STRING },
                type: { type: Type.STRING, enum: ["missing", "mismatch", "suggestion", "reminder"] },
                category: { type: Type.STRING, enum: ["intake", "measures", "sketch", "photos"] },
                message: { type: Type.STRING },
                severity: { type: Type.STRING, enum: ["low", "medium", "high"] },
                resolved: { type: Type.BOOLEAN }
              },
              required: ["id", "type", "category", "message", "severity", "resolved"]
            }
          }
        }
      });
      return JSON.parse(response.text || '[]');
    } catch (error) {
      const msg = await handleAiError(error);
      console.error("AI Error (detectMissingInfo):", msg);
      return [];
    }
  },

  /**
   * Cleans up rough estimator notes into a professional summary.
   */
  async summarizeSiteNotes(notes: string): Promise<string> {
    if (!notes.trim()) return "";
    
    const prompt = `
      Turn these rough estimator site notes into a clean, professional, office-ready summary.
      Focus on:
      - Key site constraints
      - Access concerns
      - Elevation/stair implications
      - Removal/disposal requirements
      - Design or build considerations
      
      Notes:
      ${notes}
      
      Keep the output concise and bulleted.
    `;

    try {
      const ai = getAI();
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: prompt,
      });
      return response.text || "Summary unavailable.";
    } catch (error) {
      const msg = await handleAiError(error);
      console.error("AI Error (summarizeSiteNotes):", msg);
      return "Error generating summary.";
    }
  },

  /**
   * Compares sketch data with measure sheet quantities.
   */
  async crossCheckSketchAndQuantities(intake: EstimatorIntake): Promise<AiFlag[]> {
    const prompt = `
      Compare the sketch labels/data with the measure sheet quantities.
      Sketch Labels: ${JSON.stringify(intake.sketch.labels || [])}
      Measure Sheet: ${JSON.stringify(intake.measureSheet)}
      
      Look for mismatches:
      - Stairs drawn or labeled but no stair LF entered.
      - Large deck sketch but square footage seems low or missing.
      - Railing edges suggested but no railing counts entered.
      - Privacy wall marked in sketch but not reflected in quantity fields.
      
      Return a list of flags in JSON format (same schema as detectMissingInfo).
    `;

    try {
      const ai = getAI();
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                id: { type: Type.STRING },
                type: { type: Type.STRING, enum: ["missing", "mismatch", "suggestion", "reminder"] },
                category: { type: Type.STRING, enum: ["intake", "measures", "sketch", "photos"] },
                message: { type: Type.STRING },
                severity: { type: Type.STRING, enum: ["low", "medium", "high"] },
                resolved: { type: Type.BOOLEAN }
              },
              required: ["id", "type", "category", "message", "severity", "resolved"]
            }
          }
        }
      });
      return JSON.parse(response.text || '[]');
    } catch (error) {
      const msg = await handleAiError(error);
      console.error("AI Error (crossCheckSketchAndQuantities):", msg);
      return [];
    }
  },

  /**
   * Generates a comprehensive handoff summary for the office.
   */
  async generateHandoffSummary(intake: EstimatorIntake): Promise<AiHandoffSummary> {
    const prompt = `
      Generate a clean estimate handoff summary for office/estimating use based on the site intake.
      
      Intake: ${JSON.stringify(intake.checklist)}
      Measures: ${JSON.stringify(intake.measureSheet)}
      Notes: ${intake.notes}
      
      Return JSON format:
      {
        "keyMeasurements": ["list of key measurements"],
        "siteConditions": ["list of site conditions"],
        "constraints": ["list of constraints"],
        "upgrades": ["list of upgrades/options"],
        "missingItems": ["list of items still needed"],
        "overallCompletion": 0-100
      }
    `;

    try {
      const ai = getAI();
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              keyMeasurements: { type: Type.ARRAY, items: { type: Type.STRING } },
              siteConditions: { type: Type.ARRAY, items: { type: Type.STRING } },
              constraints: { type: Type.ARRAY, items: { type: Type.STRING } },
              upgrades: { type: Type.ARRAY, items: { type: Type.STRING } },
              missingItems: { type: Type.ARRAY, items: { type: Type.STRING } },
              overallCompletion: { type: Type.NUMBER }
            },
            required: ["keyMeasurements", "siteConditions", "constraints", "upgrades", "missingItems", "overallCompletion"]
          }
        }
      });
      return JSON.parse(response.text || '{}');
    } catch (error) {
      const msg = await handleAiError(error);
      console.error("AI Error (generateHandoffSummary):", msg);
      return {
        keyMeasurements: [],
        siteConditions: [],
        constraints: [],
        upgrades: [],
        missingItems: [],
        overallCompletion: 0
      };
    }
  },

  /**
   * Suggests reminders based on site photos.
   */
  async getPhotoReminders(intake: EstimatorIntake): Promise<AiFlag[]> {
    if (intake.photos.length === 0) return [];

    const prompt = `
      Review the site photos metadata and suggest reminders.
      Photos: ${JSON.stringify(intake.photos.map(p => ({ category: p.category, note: p.note })))}
      
      Logic:
      - Category 'obstacle' -> remind to confirm access or removal plan.
      - Category 'access' -> remind to confirm gate measurements.
      - Note mentions "deck" -> remind to confirm removal/disposal.
      - Note mentions "high" or "elevation" -> remind to confirm stairs.
      
      Return a list of flags in JSON format (same schema as detectMissingInfo).
    `;

    try {
      const ai = getAI();
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                id: { type: Type.STRING },
                type: { type: Type.STRING, enum: ["missing", "mismatch", "suggestion", "reminder"] },
                category: { type: Type.STRING, enum: ["intake", "measures", "sketch", "photos"] },
                message: { type: Type.STRING },
                severity: { type: Type.STRING, enum: ["low", "medium", "high"] },
                resolved: { type: Type.BOOLEAN }
              },
              required: ["id", "type", "category", "message", "severity", "resolved"]
            }
          }
        }
      });
      return JSON.parse(response.text || '[]');
    } catch (error) {
      const msg = await handleAiError(error);
      console.error("AI Error (getPhotoReminders):", msg);
      return [];
    }
  }
};
