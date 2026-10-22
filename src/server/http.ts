/**
 * Shared wrapper for route handlers: request id, request-scoped logger, `no-store`, and the
 * API.md error shape for anything thrown (internals never leak).
 */
import "server-only";
import { newRequestId, toErrorResponse } from "@/lib/errors";
import { logger as rootLogger, type Logger } from "@/lib/logger";

export interface RequestContext {
  requestId: string;
  log: Logger;
}

export async function handleRequest(
  request: Request,
  handler: (ctx: RequestContext) => Promise<Response>,
  baseLogger: Logger = rootLogger,
): Promise<Response> {
  const requestId = newRequestId();
  const log = baseLogger.child({ requestId, method: request.method, path: new URL(request.url).pathname });
  let response: Response;
  try {
    response = await handler({ requestId, log });
  } catch (err) {
    response = toErrorResponse(err, requestId, log);
  }
  const headers = new Headers(response.headers);
  headers.set("x-request-id", requestId);
  if (!headers.has("cache-control")) headers.set("cache-control", "no-store");
  return new Response(response.body, { status: response.status, statusText: response.statusText, headers });
}
