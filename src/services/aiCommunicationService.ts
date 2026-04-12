import { Job, ChatMessage } from "../types";
import { PIPELINE_STAGES } from "../constants";
import { getAI } from "../lib/ai";

export type ToneAction = 'professional' | 'shorter' | 'warmer' | 'clearer' | 'concise' | 'grammar';

export const aiCommunicationService = {
  /**
   * Draft a message based on job context and stage.
   */
  async draftMessage(job: Job, type: string, additionalContext?: string): Promise<string> {
    const stageLabel = PIPELINE_STAGES[job.pipelineStage]?.label || "Current Stage";
    
    const prompt = `
      You are an AI communication assistant for "Luxury Decking", a premium deck contractor.
      Draft a professional, clear, and calm ${type} message for the following job:
      
      Client: ${job.clientName}
      Job Number: ${job.jobNumber}
      Current Stage: ${stageLabel}
      Scheduled Date: ${job.scheduledDate || 'TBD'}
      Project Address: ${job.projectAddress}
      
      Context: ${additionalContext || 'No additional context provided.'}
      
      Guidelines:
      - Tone: Professional, organized, and calm.
      - Length: Concise but helpful.
      - Format: Plain text, suitable for SMS or Email.
      - Do not include placeholders like [Client Name] if the name is provided above.
      - If it's a delay update, be honest but reassuring.
      - If it's a completion message, be appreciative and professional.
    `;

    try {
      const ai = getAI();
      const response = await ai.models.generateContent({
        model: "gemini-2.0-flash",
        contents: prompt,
      });
      return response.text || "Failed to generate draft.";
    } catch (error) {
      console.error("AI Drafting Error:", error);
      return "Error generating AI draft. Please try again.";
    }
  },

  /**
   * Rewrite an existing message to a specific tone or style.
   */
  async rewriteMessage(content: string, action: ToneAction): Promise<string> {
    const actionPrompts: Record<ToneAction, string> = {
      professional: "Make this message more professional and polished for a premium contractor business.",
      shorter: "Make this message significantly shorter and more direct while keeping the core information.",
      warmer: "Make this message warmer and friendlier to build a better client relationship.",
      clearer: "Make this message clearer and easier to understand, removing any ambiguity.",
      concise: "Make this message more concise, removing unnecessary words.",
      grammar: "Fix any grammar or spelling issues in this message while keeping the original tone."
    };

    const prompt = `
      Original Message: "${content}"
      Task: ${actionPrompts[action]}
      
      Guidelines:
      - Maintain the core meaning and facts.
      - Keep it appropriate for a professional contractor-client relationship.
      - Return only the rewritten text.
    `;

    try {
      const ai = getAI();
      const response = await ai.models.generateContent({
        model: "gemini-2.0-flash",
        contents: prompt,
      });
      return response.text || content;
    } catch (error) {
      console.error("AI Rewrite Error:", error);
      return content;
    }
  },

  /**
   * Summarize a conversation history.
   */
  async summarizeConversation(messages: ChatMessage[]): Promise<string> {
    if (messages.length === 0) return "No messages to summarize.";

    const history = messages
      .map(m => `${m.isFromClient ? 'Client' : 'Office'} (${new Date(m.timestamp).toLocaleString()}): ${m.text}`)
      .join('\n');

    const prompt = `
      Summarize the following conversation history between a premium deck contractor and their client.
      Identify:
      1. Key points discussed.
      2. Any open issues or concerns.
      3. Recent client requests.
      4. What the office needs to know or do next.
      
      Conversation History:
      ${history}
      
      Guidelines:
      - Be concise and practical.
      - Use bullet points for clarity.
      - Focus on operational relevance.
    `;

    try {
      const ai = getAI();
      const response = await ai.models.generateContent({
        model: "gemini-2.0-flash",
        contents: prompt,
      });
      return response.text || "Failed to generate summary.";
    } catch (error) {
      console.error("AI Summary Error:", error);
      return "Error generating AI summary.";
    }
  },

  /**
   * Suggest a reply based on recent message context.
   */
  async suggestReply(messages: ChatMessage[], job: Job): Promise<string> {
    const lastClientMessage = [...messages].reverse().find(m => m.isFromClient);
    if (!lastClientMessage) return "";

    const prompt = `
      You are an AI assistant for "Luxury Decking".
      Suggest a professional reply to the client's last message: "${lastClientMessage.text}"
      
      Job Context:
      Client: ${job.clientName}
      Job Number: ${job.jobNumber}
      Stage: ${PIPELINE_STAGES[job.pipelineStage]?.label}
      
      Guidelines:
      - Tone: Professional, helpful, and calm.
      - Keep it concise.
      - Return only the suggested reply text.
    `;

    try {
      const ai = getAI();
      const response = await ai.models.generateContent({
        model: "gemini-2.0-flash",
        contents: prompt,
      });
      return response.text || "";
    } catch (error) {
      console.error("AI Suggestion Error:", error);
      return "";
    }
  }
};
