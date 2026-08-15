import { NextResponse } from "next/server";
import { withErrorHandling } from "@/lib/api/route-handler";
import { requireAuth } from "@/lib/auth/session";
import { updatePreferencesSchema } from "@/schemas/business";
import { businessService } from "@/services/business-service";

export const GET = withErrorHandling(
  async (request: Request, context?: unknown) => {
    const { params } = (context as { params: Promise<{ id: string }> }) || {};
    const { id } = await params;
    const { userId } = await requireAuth(request);

    const businessContext = await businessService.getBusinessContext(userId, id);

    return NextResponse.json({ data: businessContext.preferences });
  },
);

export const PATCH = withErrorHandling(
  async (request: Request, context?: unknown) => {
    const { params } = (context as { params: Promise<{ id: string }> }) || {};
    const { id } = await params;
    const { userId } = await requireAuth(request);
    const body: unknown = await request.json();
    const parsed = updatePreferencesSchema.parse(body);

    const updated = await businessService.updatePreferences(userId, id, parsed);

    return NextResponse.json({ data: updated });
  },
);
