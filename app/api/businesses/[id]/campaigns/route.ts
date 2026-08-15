import { NextResponse } from "next/server";
import { withErrorHandling } from "@/lib/api/route-handler";
import { requireAuth } from "@/lib/auth/session";
import {
  campaignListQuerySchema,
  createCampaignRequestSchema,
} from "@/schemas/campaign";
import { campaignService } from "@/services/campaign-service";

export const GET = withErrorHandling(
  async (request: Request, context?: unknown) => {
    const { params } = (context as { params: Promise<{ id: string }> }) || {};
    const { id } = await params;
    const { userId } = await requireAuth(request);

    const { searchParams } = new URL(request.url);
    const query = campaignListQuerySchema.parse({
      status: searchParams.get("status") || undefined,
      targetSegment: searchParams.get("targetSegment") || undefined,
      channel: searchParams.get("channel") || undefined,
      search: searchParams.get("search") || undefined,
      page: searchParams.get("page") || 1,
      limit: searchParams.get("limit") || 10,
    });

    const result = await campaignService.listCampaigns(userId, id, query);

    return NextResponse.json(result);
  },
);

export const POST = withErrorHandling(
  async (request: Request, context?: unknown) => {
    const { params } = (context as { params: Promise<{ id: string }> }) || {};
    const { id } = await params;
    const { userId } = await requireAuth(request);

    const body = await request.json();
    const input = createCampaignRequestSchema.parse(body);

    const result = await campaignService.createCampaignWithAI(
      userId,
      id,
      input,
    );

    return NextResponse.json({ data: result }, { status: 201 });
  },
);
