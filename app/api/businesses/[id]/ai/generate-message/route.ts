import { NextResponse } from "next/server";
import { withErrorHandling } from "@/lib/api/route-handler";
import { requireAuth } from "@/lib/auth/session";
import { generateMessageRequestSchema } from "@/schemas/ai";
import { aiService } from "@/services/ai-service";

export const POST = withErrorHandling(
  async (request: Request, context?: unknown) => {
    const { params } = (context as { params: Promise<{ id: string }> }) || {};
    const { id } = await params;
    const { userId } = await requireAuth(request);

    const body = await request.json();
    const { customerId, channel, customTone, incentiveOffer } =
      generateMessageRequestSchema.parse(body);

    const result = await aiService.generateMessage(
      userId,
      id,
      customerId,
      channel,
      customTone,
      incentiveOffer,
    );

    return NextResponse.json({ data: result });
  },
);
