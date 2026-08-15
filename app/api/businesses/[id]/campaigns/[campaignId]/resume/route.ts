import { NextResponse } from "next/server";
import { withErrorHandling } from "@/lib/api/route-handler";
import { requireAuth } from "@/lib/auth/session";
import { campaignService } from "@/services/campaign-service";

export const POST = withErrorHandling(
  async (request: Request, context?: unknown) => {
    const { params } =
      (context as { params: Promise<{ id: string; campaignId: string }> }) ||
      {};
    const { id, campaignId } = await params;
    const { userId } = await requireAuth(request);

    const result = await campaignService.resumeCampaign(userId, id, campaignId);

    return NextResponse.json({ data: result });
  },
);
