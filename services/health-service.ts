import { healthResponseSchema, type HealthResponse } from "@/schemas/health";
import { appMetadata } from "@/lib/config/metadata";

export class HealthService {
  getStatus(): HealthResponse {
    return healthResponseSchema.parse({
      status: "ok",
      service: appMetadata.name,
      version: appMetadata.version,
      timestamp: new Date().toISOString(),
    });
  }
}

export const healthService = new HealthService();
