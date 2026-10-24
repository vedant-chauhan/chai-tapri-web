/**
 * Operating schedule (DATABASE.md §6, Confirmed 19 Oct 2026): weekly hours, date exceptions
 * and the owner's manual overrides. Read by the availability engine (src/domain/availability.ts).
 */
import { sql } from "drizzle-orm";
import { boolean, check, date, index, pgTable, smallint, text, time, timestamp, uuid } from "drizzle-orm/pg-core";
import { timestamps } from "./app";

const tz = (name: string) => timestamp(name, { withTimezone: true });

export const weeklyHours = pgTable(
  "weekly_hours",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    /** ISO weekday of the trading day, 1 = Monday. */
    weekday: smallint("weekday").notNull(),
    opensAt: time("opens_at").notNull(),
    closesAt: time("closes_at").notNull(),
    closesNextDay: boolean("closes_next_day").notNull().default(false),
    ...timestamps,
  },
  (t) => [
    check("weekly_hours_weekday_range", sql`${t.weekday} between 1 and 7`),
    check("weekly_hours_order", sql`${t.closesNextDay} or ${t.opensAt} < ${t.closesAt}`),
    index("weekly_hours_weekday").on(t.weekday),
  ],
);

export const DATE_EXCEPTION_KINDS = ["closed", "special_hours"] as const;

export const dateExceptions = pgTable(
  "date_exceptions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tradingDate: date("trading_date").notNull(),
    kind: text("kind", { enum: DATE_EXCEPTION_KINDS }).notNull(),
    opensAt: time("opens_at"),
    closesAt: time("closes_at"),
    closesNextDay: boolean("closes_next_day").notNull().default(false),
    reason: text("reason").notNull(),
    publicNote: text("public_note"),
    createdBy: uuid("created_by").notNull(),
    ...timestamps,
  },
  (t) => [
    check("date_exceptions_kind_valid", sql`${t.kind} in ('closed', 'special_hours')`),
    check(
      "date_exceptions_times_match_kind",
      sql`(${t.kind} = 'closed' and ${t.opensAt} is null and ${t.closesAt} is null)
        or (${t.kind} = 'special_hours' and ${t.opensAt} is not null and ${t.closesAt} is not null)`,
    ),
    index("date_exceptions_date").on(t.tradingDate),
  ],
);

export const OVERRIDE_MODES = ["open", "closed"] as const;
export const OVERRIDE_SCOPES = ["all", "delivery"] as const;

export const orderingOverrides = pgTable(
  "ordering_overrides",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    mode: text("mode", { enum: OVERRIDE_MODES }).notNull(),
    scope: text("scope", { enum: OVERRIDE_SCOPES }).notNull().default("all"),
    startsAt: tz("starts_at").notNull().defaultNow(),
    /** Required for "open" (F10). Null "closed" = until reopened. */
    endsAt: tz("ends_at"),
    reason: text("reason"),
    createdBy: uuid("created_by").notNull(),
    clearedAt: tz("cleared_at"),
    clearedBy: uuid("cleared_by"),
    ...timestamps,
  },
  (t) => [
    check("ordering_overrides_mode_valid", sql`${t.mode} in ('open', 'closed')`),
    check("ordering_overrides_scope_valid", sql`${t.scope} in ('all', 'delivery')`),
    check("ordering_overrides_open_needs_end", sql`${t.mode} = 'closed' or ${t.endsAt} is not null`),
    check("ordering_overrides_end_after_start", sql`${t.endsAt} is null or ${t.endsAt} > ${t.startsAt}`),
    index("ordering_overrides_active")
      .on(t.startsAt.desc())
      .where(sql`${t.clearedAt} is null`),
  ],
);
