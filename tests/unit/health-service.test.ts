import { describe, expect, it } from "vitest";
import { healthService } from "@/services/health-service";
import { healthResponseSchema } from "@/schemas/health";

describe("HealthService", () => {
  it("returns a valid health payload", () => {
    const result = healthService.getStatus();
    const parsed = healthResponseSchema.safeParse(result);

    expect(parsed.success).toBe(true);
    expect(result.status).toBe("ok");
    expect(result.service).toBeTruthy();
  });
});
