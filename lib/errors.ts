import { ZodError } from "zod";

export type ErrorCode =

  | "VALIDATION_ERROR"
  | "UNAUTHORIZED"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "CONFLICT"
  | "INTERNAL_ERROR"
  | "EXTERNAL_SERVICE_ERROR"
  | "CONFIGURATION_ERROR";

export interface AppErrorOptions {
  code: ErrorCode;
  message: string;
  statusCode?: number;
  details?: Record<string, unknown>;
  cause?: unknown;
}

export class AppError extends Error {
  readonly code: ErrorCode;
  readonly statusCode: number;
  readonly details?: Record<string, unknown>;

  constructor(options: AppErrorOptions) {
    super(options.message);
    this.name = "AppError";
    this.code = options.code;
    this.statusCode = options.statusCode ?? mapCodeToStatus(options.code);
    this.details = options.details;

    if (options.cause instanceof Error) {
      this.cause = options.cause;
    }
  }

  toJSON(): ApiErrorResponse {
    return {
      error: {
        code: this.code,
        message: this.message,
        ...(this.details ? { details: this.details } : {}),
      },
    };
  }
}

function mapCodeToStatus(code: ErrorCode): number {
  switch (code) {
    case "VALIDATION_ERROR":
      return 400;
    case "UNAUTHORIZED":
      return 401;
    case "FORBIDDEN":
      return 403;
    case "NOT_FOUND":
      return 404;
    case "CONFLICT":
      return 409;
    case "CONFIGURATION_ERROR":
      return 500;
    case "EXTERNAL_SERVICE_ERROR":
      return 502;
    case "INTERNAL_ERROR":
    default:
      return 500;
  }
}

export function isAppError(error: unknown): error is AppError {
  return error instanceof AppError;
}

export function toAppError(error: unknown): AppError {
  if (isAppError(error)) {
    return error;
  }

  if (error instanceof ZodError) {
    const issues = error.errors.map((e) => ({
      path: e.path.join("."),
      message: e.message,
    }));

    return new AppError({
      code: "VALIDATION_ERROR",
      message: error.errors[0]?.message || "Validation failed.",
      details: { issues },
      cause: error,
    });
  }

  if (error instanceof Error) {
    const exposeInternalMessage = process.env.NODE_ENV !== "production";

    return new AppError({
      code: "INTERNAL_ERROR",
      message: exposeInternalMessage
        ? error.message
        : "An unexpected error occurred.",
      cause: error,
    });
  }

  return new AppError({
    code: "INTERNAL_ERROR",
    message: "An unexpected error occurred.",
  });
}


export interface ApiErrorResponse {
  error: {
    code: ErrorCode;
    message: string;
    details?: Record<string, unknown>;
  };
}

export function createErrorResponse(error: unknown): {
  body: ApiErrorResponse;
  status: number;
} {
  const appError = toAppError(error);
  return {
    body: appError.toJSON(),
    status: appError.statusCode,
  };
}
