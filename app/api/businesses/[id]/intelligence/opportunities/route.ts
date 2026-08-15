import { NextResponse } from "next/server";
import { withErrorHandling } from "@/lib/api/route-handler";
import { requireAuth } from "@/lib/auth/session";
import { opportunitiesQuerySchema } from "@/schemas/intelligence";
import { intelligenceService } from "@/services/intelligence-service";

export const GET = withErrorHandling(
  async (request: Request, context?: unknown) => {
    const { params } = (context as { params: Promise<{ id: string }> }) || {};
    const { id } = await params;
    const { userId } = await requireAuth(request);

    const url = new URL(request.url);
    const searchParams = Object.fromEntries(url.searchParams.entries());
    const query = opportunitiesQuerySchema.parse(searchParams);

    const result = await intelligenceService.getOpportunities(userId, id, query);

    return NextResponse.json({ data: result });
  },
);
