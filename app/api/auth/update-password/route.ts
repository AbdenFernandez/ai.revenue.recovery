import { NextResponse } from "next/server";
import { withErrorHandling } from "@/lib/api/route-handler";
import { requireAuth } from "@/lib/auth/session";
import { updatePasswordSchema } from "@/schemas/auth";
import { authService } from "@/services/auth-service";

export const POST = withErrorHandling(async (request: Request) => {
  const { userId } = await requireAuth(request);
  const body: unknown = await request.json();
  const parsed = updatePasswordSchema.parse(body);

  const result = await authService.updatePassword(userId, parsed);

  return NextResponse.json(result);
});
