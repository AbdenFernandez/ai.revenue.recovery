import { NextResponse } from "next/server";
import {
  AppError,
  createErrorResponse,
  isAppError,
  toAppError,
} from "@/lib/errors";
import { logger } from "@/lib/logger";

type RouteHandler = (
  request: Request,
  context?: unknown,
) => Promise<Response> | Response;

export function withErrorHandling(handler: RouteHandler): RouteHandler {
  return async (request, context) => {
    try {
      return await handler(request, context);
    } catch (error) {
      const appError = toAppError(error);

      logger.error("API route error", {
        path: new URL(request.url).pathname,
        code: appError.code,
        message: appError.message,
      });

      const { body, status } = createErrorResponse(appError);
      return NextResponse.json(body, { status });
    }
  };
}

export function validationError(
  message: string,
  details?: Record<string, unknown>,
): AppError {
  return new AppError({
    code: "VALIDATION_ERROR",
    message,
    details,
  });
}

export function assertFound<T>(value: T | null | undefined, message: string): T {
  if (value == null) {
    throw new AppError({ code: "NOT_FOUND", message });
  }

  return value;
}

export function rethrowIfAppError(error: unknown): never {
  if (isAppError(error)) {
    throw error;
  }

  throw toAppError(error);
}
