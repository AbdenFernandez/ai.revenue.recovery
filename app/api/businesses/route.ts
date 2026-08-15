import { NextResponse } from "next/server";
import { withErrorHandling } from "@/lib/api/route-handler";
import { requireAuth } from "@/lib/auth/session";
import { createBusinessSchema } from "@/schemas/business";
import { businessService } from "@/services/business-service";
import { authService } from "@/services/auth-service";

export const GET = withErrorHandling(async (request: Request) => {
  const { userId } = await requireAuth(request);
  const session = await authService.getSession(userId);

  return NextResponse.json({ data: session.memberships });
});

export const POST = withErrorHandling(async (request: Request) => {
  const { userId } = await requireAuth(request);
  const body: unknown = await request.json();
  const parsed = createBusinessSchema.parse(body);

  const result = await businessService.createBusiness(userId, parsed);

  return NextResponse.json({ data: result }, { status: 201 });
});
