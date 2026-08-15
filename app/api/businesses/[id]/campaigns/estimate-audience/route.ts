import { NextResponse } from "next/server";
import { withErrorHandling } from "@/lib/api/route-handler";
import { requireAuth } from "@/lib/auth/session";
import { estimateAudienceRequestSchema } from "@/schemas/campaign";
import { campaignService } from "@/services/campaign-service";

export const POST = withErrorHandling(
  async (request: Request, context?: unknown) => {
    const { params } = (context as { params: Promise<{ id: string }> }) || {};
    const { id } = await params;
    const { userId } = await requireAuth(request);

    const body = await request.json();
    const { targetSegment } = estimateAudienceRequestSchema.parse(body);

    const result = await campaignService.estimateAudience(
      userId,
      id,
      targetSegment,
    );

    return NextResponse.json({ data: result });
  },
);
