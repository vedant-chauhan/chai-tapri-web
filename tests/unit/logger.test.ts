import { describe, expect, it } from "vitest";
import { createLogger, REDACTED, redact, scrubString, type LogLevel } from "@/lib/logger";

function capture(level: LogLevel = "debug") {
  const lines: Array<{ level: LogLevel; entry: Record<string, unknown> }> = [];
  const log = createLogger({
    level,
    sink: (lvl, line) => lines.push({ level: lvl, entry: JSON.parse(line) }),
    now: () => new Date("2026-10-16T15:50:00Z"),
  });
  return { log, lines };
}

describe("redact", () => {
  it("removes sensitive keys at any depth, whatever their casing", () => {
    const out = redact({
      orderId: "0199f0a2-7b1c-7d3e-8f00-1234567890ab",
      customer: { Name: "Asha", email: "asha@example.com", phone_e164: "+61412345678" },
      headers: { Authorization: "Bearer abc", cookie: "session=xyz" },
      stripe: { client_secret: "pi_1_secret_2", webhookSecret: "whsec_1" },
      totpCode: "123456",
    });
    expect(out).toEqual({
      orderId: "0199f0a2-7b1c-7d3e-8f00-1234567890ab",
      customer: { Name: REDACTED, email: REDACTED, phone_e164: REDACTED },
      headers: { Authorization: REDACTED, cookie: REDACTED },
      stripe: { client_secret: REDACTED, webhookSecret: REDACTED },
      totpCode: REDACTED,
    });
  });

  it("keeps error codes, statuses and ids", () => {
    expect(redact({ code: "cart_changed", status: 409, requestId: "req_ab12" })).toEqual({
      code: "cart_changed",
      status: 409,
      requestId: "req_ab12",
    });
  });

  it("serialises errors without leaking PII in the message", () => {
    const out = redact({ err: new Error("lookup failed for asha@example.com") }) as {
      err: { type: string; message: string };
    };
    expect(out.err.type).toBe("Error");
    expect(out.err.message).toBe("lookup failed for [email]");
  });

  it("survives circular references", () => {
    const a: Record<string, unknown> = { id: 1 };
    a.self = a;
    expect(redact(a)).toEqual({ id: 1, self: "[circular]" });
  });
});

describe("scrubString", () => {
  it.each([
    ["call 0412 345 678 now", "call [phone] now"],
    ["call 0412345678", "call [phone]"],
    ["intl +61 412 345 678", "intl [phone]"],
    ["landline (08) 9123 4567", "landline [phone]"],
    ["mail a.b+c@example.com.au", "mail [email]"],
    ["Bearer eyJhbGciOi.payload.sig", "Bearer [redacted]"],
    ["key sk_test_51Habc", "key [stripe-key]"],
    ["db postgres://u:p@host/db", "db [database-url]"],
  ])("scrubs %j", (input, expected) => {
    expect(scrubString(input)).toBe(expected);
  });

  it.each(["2026-10-16T15:50:00Z", "order 0199f0a2-7b1c-7d3e-8f00-1234567890ab", "order #047 total 1098 cents"])(
    "leaves %j alone",
    (input) => {
      expect(scrubString(input)).toBe(input);
    },
  );
});

describe("createLogger", () => {
  it("writes one redacted JSON object per entry", () => {
    const { log, lines } = capture();
    log.info("order placed", { orderId: "o1", email: "asha@example.com" });
    expect(lines).toEqual([
      {
        level: "info",
        entry: { level: "info", time: "2026-10-16T15:50:00.000Z", msg: "order placed", orderId: "o1", email: REDACTED },
      },
    ]);
  });

  it("drops entries below the threshold", () => {
    const { log, lines } = capture("warn");
    log.debug("noise");
    log.info("noise");
    log.warn("kept");
    expect(lines.map((l) => l.entry.msg)).toEqual(["kept"]);
  });

  it("child loggers carry their base fields", () => {
    const { log, lines } = capture();
    log.child({ requestId: "req_1" }).error("boom", { code: "internal" });
    expect(lines[0].entry).toMatchObject({ requestId: "req_1", code: "internal", level: "error" });
  });
});
