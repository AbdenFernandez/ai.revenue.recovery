import type {
  AIActionRecommendation,
  AICampaignIdea,
  AICustomerRecommendation,
  AIGeneratedMessage,
  AISegmentSummary,
} from "@/types/ai";
import type {
  ActionPromptInput,
  AIProvider,
  CampaignPromptInput,
  CustomerAnalysisPromptInput,
  MessagePromptInput,
  SegmentSummaryPromptInput,
} from "./provider-interface";

export class MockAIProvider implements AIProvider {
  readonly name = "mock";

  async analyzeCustomer(
    input: CustomerAnalysisPromptInput,
  ): Promise<AICustomerRecommendation> {
    const { customer, business } = input;
    const days = customer.daysSinceLastPurchase;
    const orders = customer.purchaseCount;
    const spend = customer.totalPurchaseAmount;
    const segment = customer.segment || "Active";

    let reason: string;
    let action: string;
    let messageAngle: string;
    let confidence = 0.85;

    if (days > 90) {
      reason = `Customer has been inactive for ${days} days despite completing ${orders} orders with lifetime spend of ${business.currency} ${spend}.`;
      action = `Initiate urgent reactivation sequence with a ${business.aiTonePreference} tone and exclusive check-in credit.`;
      messageAngle = "Reconnection & Value-Add Check-in";
      confidence = 0.9;
    } else if (spend > 1000) {
      reason = `High-value customer (${business.currency} ${spend} spend) placed ${orders} orders and is within warming activity cycle (${days} days).`;
      action = "Provide VIP loyalty perks and early access to upcoming features/catalog items.";
      messageAngle = "VIP Appreciation & Exclusive Previews";
      confidence = 0.95;
    } else {
      reason = `Customer has ${orders} order(s) and has been active within ${days} days.`;
      action = "Maintain regular product newsletter and proactive support engagement.";
      messageAngle = "Engagement & Product Discovery";
      confidence = 0.8;
    }

    return {
      segment,
      reason,
      recommended_action: action,
      message_angle: messageAngle,
      confidence,
    };
  }

  async generateCampaign(
    input: CampaignPromptInput,
  ): Promise<AICampaignIdea> {
    const { segment, business, maxDiscountPercent } = input;
    const discount = maxDiscountPercent ?? 15;
    const bName = business.businessName;

    let title: string;
    let angle: string;
    let themes: string[];
    let rationale: string;

    switch (segment) {
      case "VIP":
      case "High Value":
        title = `${bName} Executive VIP Loyalty & Early Access`;
        angle = "Exclusive appreciation with concierge assistance and personalized tier perks";
        themes = ["White-glove support", "Early access drops", "Loyalty appreciation"];
        rationale = `Maximizes retention for the highest LTV accounts with an authorized ${discount}% loyalty gift.`;
        break;
      case "Win Back":
      case "Lost":
        title = `${bName} We Miss You — Account Reactivation Drive`;
        angle = "Highlighting newly launched product improvements with an invitation credit";
        themes = ["What's new in our catalog", "Special win-back credit", "Feedback survey"];
        rationale = `Targeted at dormant high-value customers with a ${discount}% return incentive.`;
        break;
      case "At Risk":
        title = `${bName} Proactive Retention Check-in`;
        angle = "Addressing potential churn blockers and offering refresher assistance";
        themes = ["Product tips", "Feature highlights", "Exclusive reorder perk"];
        rationale = "Intervenes before warming accounts transition to full dormancy.";
        break;
      default:
        title = `${bName} Seasonal Value & Engagement Campaign`;
        angle = "Showcasing popular products and relevant service upgrades";
        themes = ["Trending solutions", "Customer success spotlight", "Limited-time offers"];
        rationale = "Stimulates regular reorder cadence across the active customer segment.";
        break;
    }


    return {
      campaignTitle: title,
      targetSegment: segment,
      strategicAngle: angle,
      keyThemes: themes,
      suggestedChannels: ["email", "sms"],
      rationale,
    };
  }

  async generateMessage(
    input: MessagePromptInput,
  ): Promise<AIGeneratedMessage> {
    const { customer, business, channel, customTone, incentiveOffer } = input;
    const tone = customTone || business.aiTonePreference || "friendly";
    const firstName = customer.customerName.split(" ")[0] || customer.customerName;

    let subject: string;
    let body: string;
    let cta: string;
    let rationale: string;

    const offerText = incentiveOffer
      ? ` As a token of our appreciation, enjoy ${incentiveOffer} on your next order.`
      : "";

    if (channel === "sms" || channel === "whatsapp") {
      subject = "Direct Message";
      body = `Hi ${firstName}, it's ${business.businessName}! We noticed it's been a while since your last visit.${offerText} Check out our latest arrivals:`;
      cta = "View New Arrivals";
      rationale = `Short, direct ${channel.toUpperCase()} message tailored for ${tone} engagement.`;
    } else {
      subject = `Special update from ${business.businessName} for ${firstName}`;
      body = `Hi ${firstName},\n\nWe wanted to personally check in and see how everything is going. We truly value having you as a customer with ${customer.purchaseCount} previous orders.\n\nWe've recently introduced exciting new upgrades designed to make your experience even better.${offerText}\n\nFeel free to explore what's new or reach out if we can assist you with anything.`;
      cta = "Explore What's New";
      rationale = `Personalized email outreach maintaining a ${tone} tone and respecting customer purchase history.`;
    }

    return {
      subject,
      messageBody: body,
      callToAction: cta,
      tone,
      rationale,
    };
  }

  async summarizeSegment(
    input: SegmentSummaryPromptInput,
  ): Promise<AISegmentSummary> {
    const { segment } = input;

    return {
      segment,
      healthStatus:
        segment === "VIP" || segment === "Active"
          ? "Healthy & Engaged"
          : segment === "At Risk"
          ? "Moderate Attrition Risk"
          : "Dormant / Opportunity Pipeline",
      keyOpportunity: `High-impact recovery potential for ${segment} accounts via personalized outreach.`,
      recoveryStrategy: `Deploy tailored multi-channel messaging highlighting relevant solutions and loyalty perks.`,
      estimatedImpact: `Expected 10-25% reactivation rate within a 30-day outreach window.`,
    };
  }

  async recommendAction(
    input: ActionPromptInput,
  ): Promise<AIActionRecommendation> {
    const { customer } = input;
    const days = customer.daysSinceLastPurchase;

    return {
      actionType: days > 90 ? "Win-Back Outreach" : "Retention Check-In",
      priority: days > 90 || customer.totalPurchaseAmount > 1000 ? "high" : "medium",
      rationale: `Customer has not ordered for ${days} days with lifetime spend of $${customer.totalPurchaseAmount}.`,
      expectedOutcome: "Re-engage customer and schedule a follow-up purchase within 14 days.",
    };
  }
}
