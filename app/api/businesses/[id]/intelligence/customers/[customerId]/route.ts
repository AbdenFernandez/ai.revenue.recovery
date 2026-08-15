import { NextResponse } from "next/server";
import { withErrorHandling } from "@/lib/api/route-handler";
import { requireAuth } from "@/lib/auth/session";
import { intelligenceService } from "@/services/intelligence-service";

export const GET = withErrorHandling(
  async (request: Request, context?: unknown) => {
    const { params } =
      (context as { params: Promise<{ id: string; customerId: string }> }) || {};
    const { id, customerId } = await params;
    const { userId } = await requireAuth(request);

    const score = await intelligenceService.getCustomerScore(
      userId,
      id,
      customerId,
    );

    return NextResponse.json({ data: score });
  },
);
