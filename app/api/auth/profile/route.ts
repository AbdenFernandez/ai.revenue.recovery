import { NextResponse } from "next/server";
import { withErrorHandling } from "@/lib/api/route-handler";
import { requireAuth } from "@/lib/auth/session";
import { updateProfileSchema } from "@/schemas/auth";
import { authService } from "@/services/auth-service";

export const PATCH = withErrorHandling(async (request: Request) => {
  const { userId } = await requireAuth(request);
  const body: unknown = await request.json();
  const parsed = updateProfileSchema.parse(body);

  const updatedProfile = await authService.updateProfile(userId, parsed);

  return NextResponse.json({ data: updatedProfile });
});
