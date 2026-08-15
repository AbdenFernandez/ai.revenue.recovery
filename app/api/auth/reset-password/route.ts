import { NextResponse } from "next/server";
import { withErrorHandling } from "@/lib/api/route-handler";
import { resetPasswordRequestSchema } from "@/schemas/auth";
import { authService } from "@/services/auth-service";

export const POST = withErrorHandling(async (request: Request) => {
  const body: unknown = await request.json();
  const parsed = resetPasswordRequestSchema.parse(body);

  const result = await authService.requestPasswordReset(parsed);

  return NextResponse.json(result);
});
