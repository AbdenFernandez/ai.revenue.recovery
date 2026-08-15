import { NextResponse } from "next/server";
import { withErrorHandling } from "@/lib/api/route-handler";
import { requireAuth } from "@/lib/auth/session";
import { approveCampaignRequestSchema } from "@/schemas/campaign";
import { campaignService } from "@/services/campaign-service";

export const POST = withErrorHandling(
  async (request: Request, context?: unknown) => {
    const { params } =
      (context as { params: Promise<{ id: string; campaignId: string }> }) ||
      {};
    const { id, campaignId } = await params;
    const { userId } = await requireAuth(request);

    const body = await request.json();
    const { approvedVariantId } = approveCampaignRequestSchema.parse(body);

    const result = await campaignService.approveCampaign(
      userId,
      id,
      campaignId,
      approvedVariantId,
    );

    return NextResponse.json({ data: result });
  },
);
