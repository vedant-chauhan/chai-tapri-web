import type { z } from "zod";
import { ApiError } from "@/lib/errors";

/** Parses a JSON body against a strict schema. Bad JSON or unknown fields → 400 validation_failed (API.md). */
export async function readJson<S extends z.ZodType>(request: Request, schema: S): Promise<z.infer<S>> {
  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    throw new ApiError("validation_failed", { details: [{ code: "invalid_json", message: "The body must be JSON." }] });
  }
  const parsed = schema.safeParse(raw);
  if (!parsed.success) {
    throw new ApiError("validation_failed", {
      details: parsed.error.issues.map((i) => ({
        field: i.path.join(".") || undefined,
        code: i.code,
        message: i.message,
      })),
    });
  }
  return parsed.data;
}
