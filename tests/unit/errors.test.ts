import { afterEach, describe, expect, it, vi } from "vitest";
import { AppError, createErrorResponse, isAppError, toAppError } from "@/lib/errors";

describe("AppError", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("maps validation errors to HTTP 400", () => {
    const error = new AppError({
      code: "VALIDATION_ERROR",
      message: "Invalid input",
    });

    expect(error.statusCode).toBe(400);
    expect(isAppError(error)).toBe(true);
  });

  it("serializes to a stable API error shape", () => {
    const { body, status } = createErrorResponse(
      new AppError({
        code: "NOT_FOUND",
        message: "Resource not found",
      }),
    );

    expect(status).toBe(404);
    expect(body).toEqual({
      error: {
        code: "NOT_FOUND",
        message: "Resource not found",
      },
    });
  });

  it("sanitizes unexpected errors in production", () => {
    vi.stubEnv("NODE_ENV", "production");

    const sanitized = toAppError(new Error("database connection string leaked"));

    expect(sanitized.message).toBe("An unexpected error occurred.");
  });

  it("preserves unexpected error details outside production", () => {
    vi.stubEnv("NODE_ENV", "development");

    const detailed = toAppError(new Error("database connection string leaked"));

    expect(detailed.message).toBe("database connection string leaked");
  });

  it("normalizes ZodError into VALIDATION_ERROR with HTTP 400 and formatted issues", async () => {
    const { z } = await import("zod");
    const testSchema = z.object({
      email: z.string().email("Must be a valid email"),
    });

    try {
      testSchema.parse({ email: "not-an-email" });
    } catch (err) {
      const appErr = toAppError(err);
      expect(appErr.code).toBe("VALIDATION_ERROR");
      expect(appErr.statusCode).toBe(400);
      expect(appErr.message).toBe("Must be a valid email");
      expect(appErr.details).toHaveProperty("issues");
    }
  });
});


