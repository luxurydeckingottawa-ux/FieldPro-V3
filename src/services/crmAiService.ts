import { Job } from "../types";
import { getAI, handleAiError } from "../lib/ai";

export const crmAiService = {
  /**
   * Draft a follow-up message based on CRM context.
   */
  async generateFollowUpDraft(job: Job, type: string, context?: string): Promise<string> {
    const prompt = `
      You are an AI CRM assistant for "Luxury Decking", a premium deck contractor.
      Draft a professional, personalized ${type} follow-up message for the following client:
      
      Client Name: ${job.clientName}
      Lifecycle Stage: ${job.lifecycleStage}
      Estimate Status: ${job.estimateStatus || 'N/A'}
      Estimate Amount: ${job.estimateAmount ? `$${job.estimateAmount}` : 'N/A'}
      Last Contact: ${job.lastContactDate || 'Unknown'}
      
      Additional Context: ${context || 'General follow-up.'}
      
      Guidelines:
      - Tone: Premium, professional, helpful, and non-pushy.
      - Length: Concise (2-4 sentences).
      - Format: Plain text.
      - Do not use placeholders like [Client Name].
      - Focus on moving the relationship forward or providing value.
    `;

    try {
      const ai = getAI();
      const response = await ai.models.generateContent({
        model: "gemini-2.0-flash",
        contents: prompt,
      });
      return response.text || "Failed to generate draft.";
    } catch (error) {
      const msg = await handleAiError(error);
      console.error("AI CRM Draft Error:", msg);
      return "Error generating AI draft.";
    }
  },

  /**
   * Suggest the next logical step for a lead or estimate.
   */
  async getRecommendedNextStep(job: Job): Promise<{ action: string; reasoning: string }> {
    const activities = job.activities || [];
    const recentActivity = activities.slice(-3).map(a => `${a.type}: ${a.description} (${new Date(a.timestamp).toLocaleDateString()})`).join('\n');

    const prompt = `
      You are an expert CRM strategist for a premium deck contractor.
      Based on the following lead data, recommend the SINGLE most logical next action for the office to take.
      
      Client: ${job.clientName}
      Lifecycle Stage: ${job.lifecycleStage}
      Estimate Status: ${job.estimateStatus || 'N/A'}
      Last Contact: ${job.lastContactDate || 'Unknown'}
      Next Follow-up Date: ${job.nextFollowUpDate || 'None set'}
      
      Recent Activity:
      ${recentActivity}
      
      Return your response in JSON format with two fields:
      - action: A short, clear action (e.g., "Send Estimate Follow-up", "Call to confirm site visit", "Mark as Stale")
      - reasoning: A one-sentence explanation of why this is the best next move.
      
      Guidelines:
      - Be practical and decisive.
      - If the lead is very old with no response, suggest "Reactivation" or "Archive".
      - If an estimate was just sent, suggest "Wait for response" or "Soft follow-up in 3 days".
    `;

    try {
      const ai = getAI();
      const response = await ai.models.generateContent({
        model: "gemini-2.0-flash",
        contents: prompt,
        config: { responseMimeType: "application/json" }
      });
      return JSON.parse(response.text || '{"action": "No recommendation", "reasoning": "Insufficient data"}');
    } catch (error) {
      const msg = await handleAiError(error);
      console.error("AI Next Step Error:", msg);
      return { action: "Manual Review", reasoning: "AI recommendation failed." };
    }
  },

  /**
   * Provide insight into why a deal might be stuck.
   */
  async getStaleLeadInsight(job: Job): Promise<string> {
    const activities = job.activities || [];
    const history = activities.map(a => `${a.type}: ${a.description}`).join('\n');

    const prompt = `
      Analyze this "stuck" lead for a premium deck contractor and provide a concise insight.
      
      Client: ${job.clientName}
      Stage: ${job.lifecycleStage}
      Estimate: ${job.estimateStatus} ($${job.estimateAmount || 0})
      Last Activity: ${job.lastContactDate}
      
      Activity History:
      ${history}
      
      Task:
      1. Summarize why this deal likely stalled.
      2. Identify the last meaningful interaction.
      3. Suggest a low-pressure "unsticking" move.
      
      Keep it under 60 words. Be professional and insightful.
    `;

    try {
      const ai = getAI();
      const response = await ai.models.generateContent({
        model: "gemini-2.0-flash",
        contents: prompt,
      });
      return response.text || "No insight available.";
    } catch (error) {
      const msg = await handleAiError(error);
      console.error("AI Stale Insight Error:", msg);
      return "Error generating insight.";
    }
  },

  /**
   * Generate a reactivation idea for an old lead.
   */
  async getReactivationIdea(job: Job): Promise<{ angle: string; draft: string }> {
    const prompt = `
      Generate a "soft reactivation" idea for an old lead who hasn't responded in a while.
      
      Client: ${job.clientName}
      Project: ${job.projectType}
      Last Stage: ${job.lifecycleStage}
      
      Return your response in JSON format:
      - angle: The strategy (e.g., "Seasonal Check-in", "New Material Update", "Price Lock Reminder")
      - draft: A short, friendly message draft.
      
      Guidelines:
      - Zero pressure.
      - Focus on helpfulness or a new update.
      - Premium tone.
    `;

    try {
      const ai = getAI();
      const response = await ai.models.generateContent({
        model: "gemini-2.0-flash",
        contents: prompt,
        config: { responseMimeType: "application/json" }
      });
      return JSON.parse(response.text || '{"angle": "General Check-in", "draft": "Hi, just checking in on your project."}');
    } catch (error) {
      const msg = await handleAiError(error);
      console.error("AI Reactivation Error:", msg);
      return { angle: "Manual Follow-up", draft: "Hi, just checking in." };
    }
  },

  /**
   * Summarize a customer record for quick office review.
   */
  async getCustomerSummary(job: Job): Promise<string> {
    const activities = job.activities || [];
    const recent = activities.slice(-5).map(a => a.description).join(', ');

    const prompt = `
      Provide a 2-sentence "Office Briefing" for this customer record.
      
      Name: ${job.clientName}
      Stage: ${job.lifecycleStage}
      Estimate: ${job.estimateStatus} ($${job.estimateAmount || 0})
      Recent Activity: ${recent}
      
      Focus on: Current status and the immediate blocker or next priority.
    `;

    try {
      const ai = getAI();
      const response = await ai.models.generateContent({
        model: "gemini-2.0-flash",
        contents: prompt,
      });
      return response.text || "No summary available.";
    } catch (error) {
      const msg = await handleAiError(error);
      console.error("AI Customer Summary Error:", msg);
      return "Error generating summary.";
    }
  }
};
