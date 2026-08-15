import { profileRepository } from "@/repositories/profile-repository";
import { BusinessRepository } from "@/repositories/business-repository";
import { memberRepository } from "@/repositories/member-repository";
import { subscriptionRepository } from "@/repositories/subscription-repository";
import { preferencesRepository } from "@/repositories/preferences-repository";
import { customerRepository } from "@/repositories/customer-repository";
import { campaignRepository } from "@/repositories/campaign-repository";
import { emailRepository } from "@/repositories/email-repository";

export const DEMO_USER_ID = "usr_demo_sarah";
export const DEMO_USER_EMAIL = "demo@recovery.ai";
export const DEMO_PASSWORD = "password123";
export const DEMO_BUSINESS_ID = "biz_demo_apex";

let isSeeded = false;

/**
 * Initializes realistic demo data for immediate manual testing.
 */
export async function seedDemoData(): Promise<void> {
  if (isSeeded) return;

  const now = Date.now();
  const dayMs = 24 * 60 * 60 * 1000;
  const nowIso = new Date(now).toISOString();

  // 1. Seed Demo User Profile & Credentials
  await profileRepository.create({
    id: DEMO_USER_ID,
    email: DEMO_USER_EMAIL,
    fullName: "Dr. Sarah Mitchell",
    defaultBusinessId: DEMO_BUSINESS_ID,
  });


  // 2. Seed Business Workspace
  BusinessRepository.setMock(DEMO_BUSINESS_ID, {
    id: DEMO_BUSINESS_ID,
    name: "Apex Revenue & Health Care",
    slug: "apex-revenue-health",
    createdAt: nowIso,
    updatedAt: nowIso,
  });

  // 3. Seed Workspace Membership
  await memberRepository.create({
    businessId: DEMO_BUSINESS_ID,
    userId: DEMO_USER_ID,
    role: "OWNER",
  });

  // 4. Seed Subscription & Preferences
  await subscriptionRepository.create({
    businessId: DEMO_BUSINESS_ID,
    plan: "growth",
    status: "active",
  });

  await preferencesRepository.create({
    businessId: DEMO_BUSINESS_ID,
    currency: "USD",
    timezone: "America/New_York",
    inactivityThresholdDays: 60,
    recoveryRateTarget: 0.2,
    aiTonePreference: "professional",
  });

  // 5. Seed Diverse Realistic Customers
  const customers = [
    // VIPs (Spend >= 5000, Freq >= 4, Recency <= 90d)
    {
      name: "Eleanor Vance",
      email: "eleanor.vance@innovatecorp.com",
      company: "Innovate Health Corp",
      phone: "+1 (555) 234-5678",
      totalPurchaseAmount: 8450,
      purchaseCount: 12,
      lastPurchaseDate: new Date(now - 6 * dayMs).toISOString(),
      serviceType: "Annual Enterprise Care",
      customerStatus: "active" as const,
      optOutStatus: false,
      consentStatus: true,
      notes: "Top enterprise account with executive quarterly reviews.",
    },
    {
      name: "Marcus Sterling",
      email: "marcus@sterlingholdings.com",
      company: "Sterling Holdings",
      phone: "+1 (555) 345-6789",
      totalPurchaseAmount: 6800,
      purchaseCount: 9,
      lastPurchaseDate: new Date(now - 14 * dayMs).toISOString(),
      serviceType: "Concierge Therapy",
      customerStatus: "active" as const,
      optOutStatus: false,
      consentStatus: true,
      notes: "High satisfaction; regularly refers new clinic clients.",
    },

    // High Value (Spend >= 2500, Recency <= 90d)
    {
      name: "Liam Chen",
      email: "liam.chen@chenbiotech.io",
      company: "Chen Biotech",
      phone: "+1 (555) 456-7890",
      totalPurchaseAmount: 4200,
      purchaseCount: 6,
      lastPurchaseDate: new Date(now - 20 * dayMs).toISOString(),
      serviceType: "Specialized Diagnostics",
      customerStatus: "active" as const,
      optOutStatus: false,
      consentStatus: true,
      notes: "Consistently purchases multi-session bundles.",
    },

    // Active
    {
      name: "Sophia Rodriguez",
      email: "sophia.r@nexusdesign.org",
      company: "Nexus Design",
      phone: "+1 (555) 567-8901",
      totalPurchaseAmount: 1850,
      purchaseCount: 4,
      lastPurchaseDate: new Date(now - 15 * dayMs).toISOString(),
      serviceType: "Standard Wellness",
      customerStatus: "active" as const,
      optOutStatus: false,
      consentStatus: true,
      notes: "Active participant in monthly retention surveys.",
    },
    {
      name: "Oliver Bennett",
      email: "oliver@bennettlegal.net",
      company: "Bennett Legal",
      phone: "+1 (555) 678-9012",
      totalPurchaseAmount: 980,
      purchaseCount: 3,
      lastPurchaseDate: new Date(now - 28 * dayMs).toISOString(),
      serviceType: "Preventative Consultations",
      customerStatus: "active" as const,
      optOutStatus: false,
      consentStatus: true,
    },

    // At Risk (Spend >= 2000, Inactive 90-180d)
    {
      name: "David Miller",
      email: "david.miller@mfgtech.com",
      company: "Miller Manufacturing",
      phone: "+1 (555) 789-0123",
      totalPurchaseAmount: 3900,
      purchaseCount: 7,
      lastPurchaseDate: new Date(now - 98 * dayMs).toISOString(),
      serviceType: "Executive Health",
      customerStatus: "inactive" as const,
      optOutStatus: false,
      consentStatus: true,
      notes: "Missed scheduled Q2 wellness review.",
    },
    {
      name: "Hannah Wright",
      email: "hannah@wrightarchitects.com",
      company: "Wright Architects",
      phone: "+1 (555) 890-1234",
      totalPurchaseAmount: 2600,
      purchaseCount: 5,
      lastPurchaseDate: new Date(now - 110 * dayMs).toISOString(),
      serviceType: "Therapeutic Packages",
      customerStatus: "inactive" as const,
      optOutStatus: false,
      consentStatus: true,
    },

    // Win Back (High prior spend >= 3000, Inactive 180-365d)
    {
      name: "James Peterson",
      email: "jpeterson@vanguardadvisors.com",
      company: "Vanguard Advisors",
      phone: "+1 (555) 901-2345",
      totalPurchaseAmount: 5200,
      purchaseCount: 8,
      lastPurchaseDate: new Date(now - 185 * dayMs).toISOString(),
      serviceType: "Corporate Retainer",
      customerStatus: "inactive" as const,
      optOutStatus: false,
      consentStatus: true,
      notes: "Major previous client; prime candidate for AI win-back offer.",
    },
    {
      name: "Charlotte Davis",
      email: "charlotte@daviscreative.co",
      company: "Davis Creative",
      phone: "+1 (555) 012-3456",
      totalPurchaseAmount: 3100,
      purchaseCount: 4,
      lastPurchaseDate: new Date(now - 210 * dayMs).toISOString(),
      serviceType: "Annual Enterprise Care",
      customerStatus: "inactive" as const,
      optOutStatus: false,
      consentStatus: true,
    },

    // Potential High Value (High spend in few purchases)
    {
      name: "Ava Thompson",
      email: "ava.thompson@quantumlabs.ai",
      company: "Quantum Labs",
      phone: "+1 (555) 123-4560",
      totalPurchaseAmount: 2100,
      purchaseCount: 2,
      lastPurchaseDate: new Date(now - 25 * dayMs).toISOString(),
      serviceType: "Executive Health",
      customerStatus: "active" as const,
      optOutStatus: false,
      consentStatus: true,
    },

    // New (1 purchase within 30 days)
    {
      name: "Lucas Martin",
      email: "lucas@martinsolutions.io",
      company: "Martin Solutions",
      phone: "+1 (555) 234-5670",
      totalPurchaseAmount: 450,
      purchaseCount: 1,
      lastPurchaseDate: new Date(now - 5 * dayMs).toISOString(),
      serviceType: "Introductory Assessment",
      customerStatus: "active" as const,
      optOutStatus: false,
      consentStatus: true,
    },
    {
      name: "Emma Walker",
      email: "emma.w@horizonmedia.com",
      company: "Horizon Media",
      phone: "+1 (555) 345-6780",
      totalPurchaseAmount: 320,
      purchaseCount: 1,
      lastPurchaseDate: new Date(now - 8 * dayMs).toISOString(),
      serviceType: "Standard Wellness",
      customerStatus: "active" as const,
      optOutStatus: false,
      consentStatus: true,
    },
  ];

  const createdCustomers = [];
  for (const c of customers) {
    const created = await customerRepository.create(DEMO_BUSINESS_ID, c);
    createdCustomers.push(created);
  }

  // 6. Seed Sample AI Campaigns
  const vipCampaign = await campaignRepository.create(DEMO_BUSINESS_ID, {
    name: "VIP Executive Appreciation & Priority Booking",
    description: "Exclusive retention and priority scheduling for top 5% revenue drivers.",
    targetSegment: "VIP",
    channel: "email",
    audienceCount: 2,
    estimatedOpportunity: 4200,
    strategyRationale: "Target highest value accounts with personalized concierge scheduling incentives to maximize lifetime loyalty.",
  });

  await campaignRepository.update(DEMO_BUSINESS_ID, vipCampaign.id, {
    status: "READY",
  });

  const variants = await campaignRepository.addVariants(DEMO_BUSINESS_ID, vipCampaign.id, [
    {
      variantLabel: "Variant A (Concierge)",
      subject: "Exclusive VIP Care: Priority Scheduling for {{customer_name}}",
      messageBody: "Hi {{customer_name}},\n\nAs one of {{business_name}}'s most valued partners at {{company}}, we are delighted to offer you dedicated priority access for your next {{service_type}} session.\n\nReserve your priority time below.",
      callToAction: "Claim Priority Access",
      tone: "professional",
      isApproved: true,
    },
    {
      variantLabel: "Variant B (Personalized)",
      subject: "A personal note from Dr. Sarah Mitchell at {{business_name}}",
      messageBody: "Hello {{customer_name}},\n\nThank you for trusting {{business_name}} with your {{service_type}} requirements. We've set aside exclusive executive appointments just for your team at {{company}}.\n\nLet's connect soon.",
      callToAction: "View VIP Schedule",
      tone: "friendly",
      isApproved: false,
    },
  ]);

  if (variants[0]) {
    await campaignRepository.approveVariant(DEMO_BUSINESS_ID, vipCampaign.id, variants[0].id);

    // Seed realistic dispatch logs for VIP campaign
    const vip1 = createdCustomers[0];
    const vip2 = createdCustomers[1];

    if (vip1) {
      await emailRepository.createLog({
        businessId: DEMO_BUSINESS_ID,
        campaignId: vipCampaign.id,
        customerId: vip1.id,
        variantId: variants[0].id,
        recipientEmail: vip1.email,
        idempotencyKey: `cmp_send_${vipCampaign.id}_${vip1.id}_${variants[0].id}`,
        status: "DELIVERED",
        errorMessage: null,
        retryCount: 0,
        sentAt: new Date(now - 2 * 60 * 60 * 1000).toISOString(),
        deliveredAt: new Date(now - 119 * 60 * 1000).toISOString(),
        openedAt: new Date(now - 45 * 60 * 1000).toISOString(),
      });
    }

    if (vip2) {
      await emailRepository.createLog({
        businessId: DEMO_BUSINESS_ID,
        campaignId: vipCampaign.id,
        customerId: vip2.id,
        variantId: variants[0].id,
        recipientEmail: vip2.email,
        idempotencyKey: `cmp_send_${vipCampaign.id}_${vip2.id}_${variants[0].id}`,
        status: "DELIVERED",
        errorMessage: null,
        retryCount: 0,
        sentAt: new Date(now - 2 * 60 * 60 * 1000).toISOString(),
        deliveredAt: new Date(now - 118 * 60 * 1000).toISOString(),
        openedAt: null,
      });
    }

    await campaignRepository.updateAnalytics(DEMO_BUSINESS_ID, vipCampaign.id, {
      targeted: 2,
      prepared: 2,
      sent: 2,
      delivered: 2,
      opened: 1,
      replied: 0,
      converted: 0,
      revenueAttributed: 0,
    });
  }


  // 7. Seed Win-Back Draft Campaign
  const winBackCampaign = await campaignRepository.create(DEMO_BUSINESS_ID, {
    name: "Q3 Win-Back & Dormant Recovery Offer",
    description: "Re-engage lapsed high-value customers with tailored reactivation incentives.",
    targetSegment: "Win Back",
    channel: "email",
    audienceCount: 2,
    estimatedOpportunity: 8300,
    strategyRationale: "Reactivate clients inactive for >180 days with a compelling renewal credit and dedicated account manager check-in.",
  });

  await campaignRepository.update(DEMO_BUSINESS_ID, winBackCampaign.id, {
    status: "READY",
  });

  isSeeded = true;
}

// Automatically trigger seeding
seedDemoData().catch((err) => {
  console.error("Failed to seed demo data:", err);
});
