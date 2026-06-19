import { Lead, LeadStatus } from "./types";

export function getConversionProbability(status: LeadStatus): number {
  switch (status) {
    case "NEW": return 10;
    case "CONTACTED": return 30;
    case "QUALIFIED": return 60;
    case "WON": return 100;
    case "LOST": return 0;
    default: return 0;
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

    if (lead.status === "WON") {
      wonCount++;
    } else if (lead.status === "LOST") {
      lostCount++;
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
  if (lead.status === "CONTACTED") {
    return "Qualify budget and requirements; prepare custom product overview.";
  }
  if (lead.status === "QUALIFIED") {
    return "Draft final proposal and request agreement signature.";
  }
  if (lead.status === "WON") {
    return "Create onboarding task checklist and request Drive uploads.";
  }
  return "Archive lead profile and schedule retrospective review.";
}
