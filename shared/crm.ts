import { Lead, LeadStatus } from "./types";

export function getConversionProbability(status: LeadStatus): number {
  switch (status) {
    case "NEW":
      return 10;
    case "SENT":
      return 100;
    default:
      return 0;
  }
}

export function calculatePipelineMetrics(leads: Lead[]) {
  let totalValue = 0;
  let weightedValue = 0;
  let activeCount = 0;
  let wonCount = 0;
  let lostCount = 0;

  leads.forEach((lead) => {
    totalValue += lead.value;
    weightedValue += lead.value * (getConversionProbability(lead.status) / 100);

    if (lead.status === "SENT") {
      wonCount++;
    } else {
      activeCount++;
    }
  });

  const winRate = leads.length > 0 ? (wonCount / leads.length) * 100 : 0;

  return {
    totalValue,
    weightedValue,
    activeCount,
    wonCount,
    lostCount,
    winRate: Math.round(winRate * 10) / 10,
  };
}

export function recommendNextStep(lead: Lead): string {
  if (lead.status === "NEW") {
    return "Schedule introductory outreach call or send WhatsApp introduction.";
  }
  if (lead.status === "SENT") {
    return "Follow up on the sent message and prepare onboarding checklist.";
  }
  return "Archive lead profile and schedule retrospective review.";
}
