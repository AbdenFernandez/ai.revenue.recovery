import { NextResponse } from "next/server";
import { withErrorHandling } from "@/lib/api/route-handler";
import { requireAuth } from "@/lib/auth/session";

export const GET = withErrorHandling(async (request: Request) => {
  const { session } = await requireAuth(request);
  return NextResponse.json({ data: session });
});
