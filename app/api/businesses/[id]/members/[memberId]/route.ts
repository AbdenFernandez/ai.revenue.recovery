import { NextResponse } from "next/server";
import { withErrorHandling } from "@/lib/api/route-handler";
import { requireAuth } from "@/lib/auth/session";
import { updateMemberRoleSchema } from "@/schemas/business";
import { businessService } from "@/services/business-service";

export const PATCH = withErrorHandling(
  async (request: Request, context?: unknown) => {
    const { params } =
      (context as { params: Promise<{ id: string; memberId: string }> }) || {};
    const { id, memberId } = await params;
    const { userId } = await requireAuth(request);
    const body: unknown = await request.json();
    const parsed = updateMemberRoleSchema.parse(body);

    const updated = await businessService.updateMemberRole(
      userId,
      id,
      memberId,
      parsed.role,
    );

    return NextResponse.json({ data: updated });
  },
);

export const DELETE = withErrorHandling(
  async (request: Request, context?: unknown) => {
    const { params } =
      (context as { params: Promise<{ id: string; memberId: string }> }) || {};
    const { id, memberId } = await params;
    const { userId } = await requireAuth(request);

    await businessService.removeMember(userId, id, memberId);

    return NextResponse.json({ message: "Member removed from workspace." });
  },
);

