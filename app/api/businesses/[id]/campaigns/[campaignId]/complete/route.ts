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

    const body = await request.json().catch(() => ({}));
    const result = await campaignService.completeCampaign(
      userId,
      id,
      campaignId,
      body,
    );

    return NextResponse.json({ data: result });
  },
);
