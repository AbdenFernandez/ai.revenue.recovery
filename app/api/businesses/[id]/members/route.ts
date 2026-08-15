import { NextResponse } from "next/server";
import { withErrorHandling } from "@/lib/api/route-handler";
import { requireAuth } from "@/lib/auth/session";
import { addMemberSchema } from "@/schemas/business";
import { businessService } from "@/services/business-service";

export const GET = withErrorHandling(
  async (request: Request, context?: unknown) => {
    const { params } = (context as { params: Promise<{ id: string }> }) || {};
    const { id } = await params;
    const { userId } = await requireAuth(request);

    const members = await businessService.listMembers(userId, id);

    return NextResponse.json({ data: members });
  },
);

export const POST = withErrorHandling(
  async (request: Request, context?: unknown) => {
    const { params } = (context as { params: Promise<{ id: string }> }) || {};
    const { id } = await params;
    const { userId } = await requireAuth(request);
    const body: unknown = await request.json();
    const parsed = addMemberSchema.parse(body);

    const newMember = await businessService.addMember(userId, id, parsed);

    return NextResponse.json({ data: newMember }, { status: 201 });
  },
);
