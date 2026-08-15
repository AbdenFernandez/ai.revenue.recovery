import { NextResponse } from "next/server";
import { withErrorHandling } from "@/lib/api/route-handler";
import { requireAuth } from "@/lib/auth/session";
import { updateCampaignRequestSchema } from "@/schemas/campaign";
import { campaignService } from "@/services/campaign-service";

export const GET = withErrorHandling(
  async (request: Request, context?: unknown) => {
    const { params } =
      (context as { params: Promise<{ id: string; campaignId: string }> }) ||
      {};
    const { id, campaignId } = await params;
    const { userId } = await requireAuth(request);

    const result = await campaignService.getCampaignDetails(
      userId,
      id,
      campaignId,
    );

    return NextResponse.json({ data: result });
  },
);

export const PATCH = withErrorHandling(
  async (request: Request, context?: unknown) => {
    const { params } =
      (context as { params: Promise<{ id: string; campaignId: string }> }) ||
      {};
    const { id, campaignId } = await params;
    const { userId } = await requireAuth(request);

    const body = await request.json();
    const input = updateCampaignRequestSchema.parse(body);

    const result = await campaignService.updateCampaign(
      userId,
      id,
      campaignId,
      input,
    );

    return NextResponse.json({ data: result });
  },
);

export const DELETE = withErrorHandling(
  async (request: Request, context?: unknown) => {
    const { params } =
      (context as { params: Promise<{ id: string; campaignId: string }> }) ||
      {};
    const { id, campaignId } = await params;
    const { userId } = await requireAuth(request);

    const result = await campaignService.deleteCampaign(userId, id, campaignId);

    return NextResponse.json({ data: result });
  },
);
