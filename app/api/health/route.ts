import { NextResponse } from "next/server";
import { withErrorHandling } from "@/lib/api/route-handler";
import { logger } from "@/lib/logger";
import { healthResponseSchema } from "@/schemas/health";
import { healthService } from "@/services/health-service";

export const GET = withErrorHandling(async () => {
  const payload = healthResponseSchema.parse(healthService.getStatus());
  logger.info("Health check succeeded");
  return NextResponse.json(payload);
});
