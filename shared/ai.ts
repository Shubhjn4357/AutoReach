import { Lead } from "./types";

export interface AIAnalysisResult {
  score: number;
  grade: "A" | "B" | "C" | "D" | "F";
  summary: string;
  suggestedAction: string;
  proposedQuickReply: string;
}

export async function analyzeLeadProfile(
  lead: Lead,
): Promise<AIAnalysisResult> {
  const openAiApiKey = process.env.OPENAI_API_KEY;

  if (openAiApiKey) {
    try {
      const response = await fetch(
        "https://api.openai.com/v1/chat/completions",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${openAiApiKey}`,
          },
          body: JSON.stringify({
            model: "gpt-4o-mini",
            response_format: { type: "json_object" },
            messages: [
              {
                role: "system",
                content:
                  "You are an expert CRM sales analyzer. Output a JSON object containing: score (number 1-100), grade (A,B,C,D,F), summary (string), suggestedAction (string), proposedQuickReply (string).",
              },
              {
                role: "user",
                content: `Analyze this lead: ${JSON.stringify(lead)}`,
              },
            ],
          }),
        },
      );

      if (response.ok) {
        const result = await response.json();
        const content = result.choices[0]?.message?.content;
        if (content) return JSON.parse(content) as AIAnalysisResult;
      }
    } catch (e) {
      console.error("OpenAI call failed:", e);
    }
  }

  // Fallback engine
  let score = 30;
  if (lead.value > 15000) score += 25;
  else if (lead.value > 5000) score += 15;

  if (lead.status === "SENT") score = 100;
  else if (lead.status === "NEW") score = 50;

  if (lead.email && lead.phone) score += 10;
  score = Math.min(Math.max(score, 0), 100);

  let grade: "A" | "B" | "C" | "D" | "F" = "C";
  if (score >= 85) grade = "A";
  else if (score >= 70) grade = "B";
  else if (score >= 50) grade = "C";
  else if (score >= 25) grade = "D";
  else grade = "F";

  return {
    score,
    grade,
    summary: `Lead "${lead.name}" is evaluated at status ${lead.status} with valuation of $${lead.value.toLocaleString()}.`,
    suggestedAction:
      score > 60
        ? "Schedule immediate closure call or send contract documents via WhatsApp."
        : "Trigger follow-up message to qualify target requirements and timeline.",
    proposedQuickReply: `Hi ${lead.name.split(" ")[0] || "there"}, I wanted to check if you had a moment to sync up on our proposal. Let me know what time works best!`,
  };
}
