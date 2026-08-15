-- Phase 6 Migration: Email Dispatch Logs, Idempotency, and Suppression List

CREATE TABLE IF NOT EXISTS public.email_dispatch_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  campaign_id UUID NOT NULL REFERENCES public.campaigns(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  variant_id UUID NOT NULL,
  recipient_email TEXT NOT NULL,
  idempotency_key TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'PENDING',
  error_message TEXT,
  retry_count INTEGER NOT NULL DEFAULT 0,
  sent_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  opened_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.suppression_list (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  reason TEXT NOT NULL DEFAULT 'UNSUBSCRIBED',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_suppression_business_email UNIQUE (business_id, email)
);

-- Performance & Idempotency Indexes
CREATE INDEX IF NOT EXISTS idx_email_logs_business_campaign ON public.email_dispatch_logs (business_id, campaign_id);
CREATE INDEX IF NOT EXISTS idx_email_logs_business_status ON public.email_dispatch_logs (business_id, status);
CREATE INDEX IF NOT EXISTS idx_email_logs_idempotency ON public.email_dispatch_logs (idempotency_key);
CREATE INDEX IF NOT EXISTS idx_suppression_lookup ON public.suppression_list (business_id, email);

-- Enable RLS
ALTER TABLE public.email_dispatch_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.suppression_list ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can manage email dispatch logs in their businesses"
  ON public.email_dispatch_logs
  FOR ALL
  USING (
    business_id IN (
      SELECT business_id FROM public.members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can manage suppression list in their businesses"
  ON public.suppression_list
  FOR ALL
  USING (
    business_id IN (
      SELECT business_id FROM public.members WHERE user_id = auth.uid()
    )
  );
