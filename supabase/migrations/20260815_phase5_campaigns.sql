-- Phase 5 Migration: Campaigns, Variants, and Recovery Analytics

CREATE TABLE IF NOT EXISTS public.campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  target_segment TEXT NOT NULL,
  channel TEXT NOT NULL DEFAULT 'email',
  status TEXT NOT NULL DEFAULT 'DRAFT',
  audience_count INTEGER NOT NULL DEFAULT 0,
  estimated_opportunity NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
  strategy_rationale TEXT,
  scheduled_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.campaign_variants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES public.campaigns(id) ON DELETE CASCADE,
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  variant_label TEXT NOT NULL,
  subject TEXT,
  message_body TEXT NOT NULL,
  call_to_action TEXT NOT NULL,
  tone TEXT NOT NULL DEFAULT 'friendly',
  is_approved BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.campaign_analytics (
  campaign_id UUID PRIMARY KEY REFERENCES public.campaigns(id) ON DELETE CASCADE,
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  targeted INTEGER NOT NULL DEFAULT 0,
  prepared INTEGER NOT NULL DEFAULT 0,
  sent INTEGER NOT NULL DEFAULT 0,
  delivered INTEGER NOT NULL DEFAULT 0,
  opened INTEGER NOT NULL DEFAULT 0,
  replied INTEGER NOT NULL DEFAULT 0,
  converted INTEGER NOT NULL DEFAULT 0,
  revenue_attributed NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Performance Indexes for Multi-Tenant Querying
CREATE INDEX IF NOT EXISTS idx_campaigns_business_status ON public.campaigns (business_id, status);
CREATE INDEX IF NOT EXISTS idx_campaigns_business_segment ON public.campaigns (business_id, target_segment);
CREATE INDEX IF NOT EXISTS idx_campaign_variants_campaign ON public.campaign_variants (campaign_id);
CREATE INDEX IF NOT EXISTS idx_campaign_analytics_business ON public.campaign_analytics (business_id);

-- Enable RLS
ALTER TABLE public.campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.campaign_variants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.campaign_analytics ENABLE ROW LEVEL SECURITY;

-- RLS Policies for Campaigns
CREATE POLICY "Users can manage campaigns in their businesses"
  ON public.campaigns
  FOR ALL
  USING (
    business_id IN (
      SELECT business_id FROM public.members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can manage campaign variants in their businesses"
  ON public.campaign_variants
  FOR ALL
  USING (
    business_id IN (
      SELECT business_id FROM public.members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can manage campaign analytics in their businesses"
  ON public.campaign_analytics
  FOR ALL
  USING (
    business_id IN (
      SELECT business_id FROM public.members WHERE user_id = auth.uid()
    )
  );
