import { Job, PortalEngagement } from "../types";
import { getAI, handleAiError } from "../lib/ai";
import { COMPANY } from "../config/company";

export const geminiService = {
  /**
   * Helps a customer choose between estimate options based on their goals.
   */
  async generateHelpMeChoose(job: Job, goals: string[]): Promise<string> {
    const options = job.estimateData?.options || [];
    const prompt = `
      You are a helpful sales assistant for ${COMPANY.name}, a premium deck builder.
      The customer is looking at an estimate with the following options:
      ${options.map(o => `- ${o.name}: ${o.title}. Price: $${o.price}. Features: ${o.features.join(', ')}`).join('\n')}

      The customer's primary goals are: ${goals.join(', ')}.

      Based on these goals, explain which option might fit them best and why. 
      Use clear, homeowner-friendly terms. Be helpful and guiding, not pushy.
      Keep the response concise (2-3 short paragraphs).
    `;

    try {
      const ai = getAI();
      const response = await ai.models.generateContent({
        model: "gemini-2.0-flash",
        contents: prompt,
      });
      return response.text || "I'm sorry, I couldn't generate a recommendation right now. Please contact our office for personalized advice.";
    } catch (error) {
      const msg = await handleAiError(error);
      console.error("Gemini Error:", msg);
      return "Unable to reach the assistant. Please try again later.";
    }
  },

  /**
   * Answers a customer's objection or question about the estimate.
   */
  async answerObjection(job: Job, question: string): Promise<string> {
    const prompt = `
      You are a helpful sales assistant for ${COMPANY.name}.
      A customer has a question or concern about their deck estimate: "${question}"
      
      Context about the project:
      - Project Type: ${job.projectType}
      - Total Amount: $${job.totalAmount}
      - Options provided: ${job.estimateData?.options.map(o => o.name).join(', ')}

      Provide a professional, reassuring, and clear answer. 
      If they ask about cost, explain the value and quality.
      If they ask about materials (Composite vs PVC vs Wood), explain the maintenance and longevity differences.
      Keep it friendly and informative.
    `;

    try {
      const ai = getAI();
      const response = await ai.models.generateContent({
        model: "gemini-2.0-flash",
        contents: prompt,
      });
      return response.text || "That's a great question. I'll have one of our project managers reach out to discuss this with you in detail.";
    } catch (error) {
      const msg = await handleAiError(error);
      console.error("Gemini Error:", msg);
      return "I'm having trouble answering that right now. Feel free to call us!";
    }
  },

  /**
   * Drafts a follow-up message for the office/admin.
   */
  async generateFollowUpDraft(job: Job, engagement?: PortalEngagement): Promise<string> {
    const prompt = `
      You are an AI sales copilot for ${COMPANY.name}. 
      Draft a professional follow-up message (SMS or Email style) for the following lead:
      - Customer: ${job.clientName}
      - Lifecycle Stage: ${job.lifecycleStage}
      - Last Contact: ${job.lastContactDate || 'Unknown'}
      - Engagement Level: ${engagement?.heatLevel || 'Unknown'}
      - Recent Activity: ${engagement?.lastViewedAt ? `Last viewed estimate on ${engagement.lastViewedAt}` : 'No recent views'}
      
      The tone should be premium, helpful, and low-pressure. 
      If the lead is "Hot" (high engagement), be more proactive.
      If the lead is "Stale", be gentle and offer to answer questions.
    `;

    try {
      const ai = getAI();
      const response = await ai.models.generateContent({
        model: "gemini-2.0-flash",
        contents: prompt,
      });
      return response.text || "Hi " + job.clientName + ", just checking in to see if you had any questions about the proposal we sent over. We'd love to help you get started on your new deck!";
    } catch (error) {
      const msg = await handleAiError(error);
      console.error("Gemini Error:", msg);
      return "Error generating draft.";
    }
  },

  /**
   * Recommends the next action for the office/admin.
   */
  async generateNextActionRecommendation(job: Job): Promise<{ action: string; reasoning: string }> {
    const prompt = `
      Analyze this lead and suggest the single best next action for the office/admin.
      - Customer: ${job.clientName}
      - Stage: ${job.lifecycleStage}
      - Total Amount: $${job.totalAmount}
      - Last Contact: ${job.lastContactDate}
      
      Return the response in JSON format:
      {
        "action": "Short action title",
        "reasoning": "Brief explanation of why this action is recommended"
      }
    `;

    try {
      const ai = getAI();
      const response = await ai.models.generateContent({
        model: "gemini-2.0-flash",
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: 'object',
            properties: {
              action: { type: 'string' },
              reasoning: { type: 'string' }
            },
            required: ['action', 'reasoning']
          }
        }
      });
      return JSON.parse(response.text || '{}');
    } catch (error) {
      const msg = await handleAiError(error);
      console.error("Gemini Error:", msg);
      return { action: "Manual Review", reasoning: "Unable to generate recommendation." };
    }
  },

  /**
   * Summarizes a stale or stalled lead.
   */
  async generateStaleLeadSummary(job: Job): Promise<string> {
    const prompt = `
      Summarize why this lead might be stalling and what the history looks like.
      - Customer: ${job.clientName}
      - Last Updated: ${job.updatedAt}
      - Last Contact: ${job.lastContactDate}
      - Stage: ${job.lifecycleStage}
      
      Keep it very concise (1-2 sentences). Focus on the bottleneck.
    `;

    try {
      const ai = getAI();
      const response = await ai.models.generateContent({
        model: "gemini-2.0-flash",
        contents: prompt,
      });
      return response.text || "Lead has been inactive for over 30 days. No response to last two follow-ups.";
    } catch (error) {
      const msg = await handleAiError(error);
      console.error("Gemini Error:", msg);
      return "Summary unavailable.";
    }
  },

  /**
   * Summarizes proposal activity and engagement.
   */
  async generateActivitySummary(job: Job, engagement?: PortalEngagement): Promise<string> {
    const prompt = `
      Summarize the customer's interaction with the estimate portal.
      - Views: ${engagement?.viewCount || 0}
      - Last View: ${engagement?.lastViewedAt || 'Never'}
      - Time Spent: ${engagement?.totalTimeSpentSeconds || 0} seconds
      - Lifecycle: ${job.lifecycleStage}
      
      Explain if they seem highly interested or just browsing.
    `;

    try {
      const ai = getAI();
      const response = await ai.models.generateContent({
        model: "gemini-2.0-flash",
        contents: prompt,
      });
      return response.text || "Customer has viewed the proposal multiple times, indicating high interest.";
    } catch (error) {
      const msg = await handleAiError(error);
      console.error("Gemini Error:", msg);
      return "Activity summary unavailable.";
    }
  },

  /**
   * Tracks a portal view and updates engagement metrics
   */
  trackPortalView(job: Job): Partial<Job> {
    const now = new Date().toISOString();
    const engagement = job.portalEngagement || {
      totalOpens: 0,
      optionClicks: {},
      addOnInteractions: {},
      totalTimeSpentSeconds: 0
    };

    const updatedEngagement: PortalEngagement = {
      ...engagement,
      totalOpens: (engagement.totalOpens || 0) + 1,
      lastOpenedAt: now,
      lastViewedAt: now,
      viewCount: (engagement.viewCount || 0) + 1,
      firstOpenedAt: engagement.firstOpenedAt || now
    };

    // Simple heat logic
    let heat: 'Cold' | 'Warm' | 'Hot' = 'Cold';
    if (updatedEngagement.totalOpens > 5) heat = 'Hot';
    else if (updatedEngagement.totalOpens > 2) heat = 'Warm';

    updatedEngagement.heatLevel = heat;

    return {
      portalEngagement: updatedEngagement,
      engagementHeat: heat.toLowerCase() as any
    };
  },

  /**
   * Generates a summary of the project history from beginning to end.
   */
  async generateProjectHistorySummary(job: Job): Promise<string> {
    const notes = [...(job.officeNotes || []), ...(job.siteNotes || [])]
      .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
    
    const activities = (job.activities || [])
      .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

    const prompt = `
      You are an AI project manager for ${COMPANY.name}. 
      Summarize the key events and milestones for this project from start to finish.
      
      Project: ${job.jobNumber} - ${job.clientName}
      Project Type: ${job.projectType}
      Current Pipeline Stage: ${job.pipelineStage}
      
      History of Notes:
      ${notes.map(n => `[${n.timestamp}] ${n.author}: ${n.text}`).join('\n')}
      
      History of Activities:
      ${activities.map(a => `[${a.timestamp}] ${a.type}: ${a.description}`).join('\n')}
      
      Focus on:
      - Key decisions made by the client.
      - Material preferences mentioned.
      - Scheduling constraints or changes.
      - Specific objections addressed.
      - Overall project sentiment.
      
      Keep the summary professional, concise, and bulleted. 
      If there isn't much history yet, just state the current status and next steps.
    `;

    try {
      const ai = getAI();
      const response = await ai.models.generateContent({
        model: "gemini-2.0-flash",
        contents: prompt,
      });
      return response.text || "Project is currently in the initial stages. No significant history recorded yet.";
    } catch (error) {
      const msg = await handleAiError(error);
      console.error("Gemini Error:", msg);
      return "History summary unavailable.";
    }
  }
};
