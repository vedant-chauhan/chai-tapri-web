import { describe, expect, it } from "vitest";
import { ApiError, ERROR_STATUS, newRequestId, toErrorResponse } from "@/lib/errors";
import { createLogger } from "@/lib/logger";

const silent = createLogger({ sink: () => {} });

describe("ApiError", () => {
  it("maps every catalogue code to its status", () => {
    for (const [code, status] of Object.entries(ERROR_STATUS)) {
      expect(new ApiError(code as keyof typeof ERROR_STATUS).status).toBe(status);
    }
  });
});

describe("toErrorResponse", () => {
  it("returns the API.md error shape for an ApiError", async () => {
    const res = toErrorResponse(
      new ApiError("cart_changed", {
        details: [{ field: "items[1]", code: "sold_out", message: "Cheese Vada Pav is sold out today." }],
      }),
      "req_1",
      silent,
    );
    expect(res.status).toBe(409);
    expect(res.headers.get("cache-control")).toBe("no-store");
    expect(await res.json()).toEqual({
      error: {
        code: "cart_changed",
        message: "Some items in your order changed.",
        details: [{ field: "items[1]", code: "sold_out", message: "Cheese Vada Pav is sold out today." }],
        requestId: "req_1",
      },
    });
  });

  it("passes extra headers through (e.g. Retry-After on 429)", () => {
    const res = toErrorResponse(new ApiError("rate_limited", { headers: { "Retry-After": "30" } }), "req_2", silent);
    expect(res.status).toBe(429);
    expect(res.headers.get("retry-after")).toBe("30");
  });

  it("hides unknown errors behind 500 internal", async () => {
    const lines: string[] = [];
    const log = createLogger({ sink: (_l, line) => lines.push(line) });
    const res = toErrorResponse(new Error('relation "orders" does not exist'), "req_3", log);
    expect(res.status).toBe(500);
    const body = (await res.json()) as { error: { code: string } };
    expect(body.error.code).toBe("internal");
    expect(JSON.stringify(body)).not.toContain("relation");
    expect(lines).toHaveLength(1); // logged server-side instead
  });
});

describe("newRequestId", () => {
  it("is req_ + 16 hex chars and unique", () => {
    const a = newRequestId();
    expect(a).toMatch(/^req_[0-9a-f]{16}$/);
    expect(newRequestId()).not.toBe(a);
  });
});
