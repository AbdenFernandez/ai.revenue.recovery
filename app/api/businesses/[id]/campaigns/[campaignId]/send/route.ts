import { NextResponse } from "next/server";
import { withErrorHandling } from "@/lib/api/route-handler";
import { requireAuth } from "@/lib/auth/session";
import { triggerCampaignDispatchSchema } from "@/schemas/email";
import { emailQueueService } from "@/services/email-queue";

export const POST = withErrorHandling(
  async (request: Request, context?: unknown) => {
    const { params } =
      (context as { params: Promise<{ id: string; campaignId: string }> }) ||
      {};
    const { id, campaignId } = await params;
    const { userId } = await requireAuth(request);

    const body = await request.json().catch(() => ({}));
    const input = triggerCampaignDispatchSchema.parse(body);

    const result = await emailQueueService.dispatchCampaign(
      userId,
      id,
      campaignId,
      input,
    );

    return NextResponse.json({ data: result });
  },
);
