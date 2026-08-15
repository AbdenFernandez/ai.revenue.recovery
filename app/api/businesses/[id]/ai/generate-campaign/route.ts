import { NextResponse } from "next/server";
import { withErrorHandling } from "@/lib/api/route-handler";
import { requireAuth } from "@/lib/auth/session";
import { generateCampaignRequestSchema } from "@/schemas/ai";
import { aiService } from "@/services/ai-service";

export const POST = withErrorHandling(
  async (request: Request, context?: unknown) => {
    const { params } = (context as { params: Promise<{ id: string }> }) || {};
    const { id } = await params;
    const { userId } = await requireAuth(request);

    const body = await request.json();
    const { segment, goal, maxDiscountPercent } =
      generateCampaignRequestSchema.parse(body);

    const result = await aiService.generateCampaign(
      userId,
      id,
      segment,
      goal,
      maxDiscountPercent,
    );

    return NextResponse.json({ data: result });
  },
);
