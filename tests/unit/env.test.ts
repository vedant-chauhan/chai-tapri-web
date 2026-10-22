import { describe, expect, it } from "vitest";
import { EnvError, parseEnv } from "@/lib/env";

const SECRET = "x".repeat(32);

describe("parseEnv", () => {
  it("accepts an empty local environment (features degrade, nothing crashes at boot)", () => {
    expect(parseEnv({})).toMatchObject({ APP_ENV: "local", LOG_LEVEL: "info" });
  });

  it("treats empty strings as unset", () => {
    expect(parseEnv({ DATABASE_URL: "", CRON_SECRET: "" }).DATABASE_URL).toBeUndefined();
  });

  it("requires every secret in deployed environments", () => {
    try {
      parseEnv({ APP_ENV: "staging" });
      expect.fail("should have thrown");
    } catch (err) {
      expect(err).toBeInstanceOf(EnvError);
      expect((err as EnvError).problems).toEqual(
        expect.arrayContaining([
          "DATABASE_URL is required when APP_ENV=staging",
          "AUTH_SECRET is required when APP_ENV=staging",
          "AUTH_URL is required when APP_ENV=staging",
          "CRON_SECRET is required when APP_ENV=staging",
        ]),
      );
    }
  });

  it("accepts a complete production environment", () => {
    const env = parseEnv({
      APP_ENV: "production",
      DATABASE_URL: "postgres://u:p@ep-x.ap-southeast-2.aws.neon.tech/db?sslmode=require",
      AUTH_SECRET: SECRET,
      AUTH_URL: "https://chai-tapri-production.example.workers.dev",
      CRON_SECRET: SECRET,
    });
    expect(env.APP_ENV).toBe("production");
  });

  it("rejects short secrets and bad URLs without echoing the values", () => {
    try {
      parseEnv({ CRON_SECRET: "hunter2", DATABASE_URL: "mysql://user:pw@host/db" });
      expect.fail("should have thrown");
    } catch (err) {
      const message = (err as Error).message;
      expect(message).toContain("CRON_SECRET");
      expect(message).toContain("DATABASE_URL");
      expect(message).not.toContain("hunter2");
      expect(message).not.toContain("pw@host");
    }
  });
});
