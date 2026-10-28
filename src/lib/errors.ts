/**
 * API error shape (API.md "Conventions" and "Error code catalogue").
 *
 *   { "error": { "code", "message", "details"?, "requestId" } }
 *
 * `message` is always safe to show to the user. No stack traces or internal
 * ids beyond `requestId` ever leave the server.
 */

import { logger as defaultLogger, type Logger } from "./logger";

export const ERROR_STATUS = {
  validation_failed: 400,
  unauthenticated: 401,
  forbidden: 403,
  not_found: 404,
  conflict: 409,
  cart_changed: 409,
  ordering_closed: 409,
  not_cancellable: 409,
  accept_deadline_passed: 409,
  payment_not_captured: 409,
  idempotency_mismatch: 422,
  order_limit_exceeded: 422,
  refund_exceeds_captured: 422,
  until_required: 422,
  invalid_hours: 422,
  rate_limited: 429,
  internal: 500,
  payment_unavailable: 503,
  reviews_unavailable: 503,
} as const;

export type ErrorCode = keyof typeof ERROR_STATUS;

const DEFAULT_MESSAGES: Record<ErrorCode, string> = {
  validation_failed: "Some details are missing or invalid.",
  unauthenticated: "Please sign in.",
  forbidden: "You don't have access to this.",
  not_found: "Not found.",
  conflict: "This was changed by someone else. Refresh and try again.",
  cart_changed: "Some items in your order changed.",
  ordering_closed: "Online ordering is closed right now.",
  not_cancellable: "This order can no longer be cancelled.",
  accept_deadline_passed: "The time to accept this order has passed.",
  payment_not_captured: "The payment hasn't been captured yet.",
  idempotency_mismatch: "This request doesn't match an earlier one with the same key.",
  order_limit_exceeded: "This order is over the limit for online orders.",
  refund_exceeds_captured: "The refund is more than the amount charged.",
  until_required: "Choose when ordering should close again.",
  invalid_hours: "These opening hours aren't valid.",
  rate_limited: "Too many requests. Please wait a moment and try again.",
  internal: "Something went wrong on our side. Please try again.",
  payment_unavailable: "Payments are unavailable right now. Please try again shortly.",
  reviews_unavailable: "Google reviews can't be loaded right now.",
};

export interface ErrorDetail {
  field?: string;
  code: string;
  message: string;
}

export interface ErrorBody {
  error: {
    code: ErrorCode;
    message: string;
    details?: ErrorDetail[];
    requestId: string;
  };
}

/** Throw from domain/server code; route handlers turn it into an `ErrorBody` response. */
export class ApiError extends Error {
  readonly code: ErrorCode;
  readonly status: number;
  readonly details?: ErrorDetail[];
  readonly headers?: Record<string, string>;

  constructor(
    code: ErrorCode,
    options: { message?: string; details?: ErrorDetail[]; headers?: Record<string, string>; cause?: unknown } = {},
  ) {
    super(options.message ?? DEFAULT_MESSAGES[code], { cause: options.cause });
    this.name = "ApiError";
    this.code = code;
    this.status = ERROR_STATUS[code];
    this.details = options.details;
    this.headers = options.headers;
  }
}

/** `req_` + 16 random hex chars. Used in logs and error bodies to correlate a request. */
export function newRequestId(): string {
  const bytes = new Uint8Array(8);
  crypto.getRandomValues(bytes);
  return `req_${Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("")}`;
}

export function errorBody(
  code: ErrorCode,
  requestId: string,
  message: string = DEFAULT_MESSAGES[code],
  details?: ErrorDetail[],
): ErrorBody {
  return { error: { code, message, ...(details?.length ? { details } : {}), requestId } };
}

export function errorResponse(error: ApiError, requestId: string): Response {
  return Response.json(errorBody(error.code, requestId, error.message, error.details), {
    status: error.status,
    headers: { "Cache-Control": "no-store", ...error.headers },
  });
}

/**
 * Converts anything thrown into a safe response. `ApiError`s keep their code
 * and message. Anything else is logged (redacted) and becomes `500 internal`
 * with the generic message, so internals never leak.
 */
export function toErrorResponse(err: unknown, requestId: string, log: Logger = defaultLogger): Response {
  if (err instanceof ApiError) {
    if (err.status >= 500) log.error("request failed", { requestId, code: err.code, err });
    return errorResponse(err, requestId);
  }
  log.error("unhandled error", { requestId, err });
  return errorResponse(new ApiError("internal"), requestId);
}
