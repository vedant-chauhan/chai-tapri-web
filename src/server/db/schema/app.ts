/**
 * Application tables (DATABASE.md §6, Confirmed 19 Oct 2026). Phase 4 creates only the
 * foundation tables; slice 1 adds the catalogue, schedule, orders and money tables.
 *
 * Conventions (§6): plural snake_case tables, `created_at`/`updated_at` on every table,
 * enum-like columns as `text` + check constraint.
 */
import { sql } from "drizzle-orm";
import { boolean, check, integer, pgTable, smallint, text, time, timestamp, uuid } from "drizzle-orm/pg-core";

export const timestamps = {
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
};

/** Singleton row (id = 1) holding store-wide operating settings. */
export const storeSettings = pgTable(
  "store_settings",
  {
    id: smallint("id").primaryKey(),
    timezone: text("timezone").notNull().default("Australia/Perth"),
    tradingDayBoundary: time("trading_day_boundary").notNull().default("05:00"),
    prepMinutesDefault: integer("prep_minutes_default").notNull().default(10),
    lastOrderOffsetMinutes: integer("last_order_offset_minutes").notNull().default(30),
    acceptTimeoutSeconds: integer("accept_timeout_seconds").notNull().default(300),
    acceptEscalateSeconds: integer("accept_escalate_seconds").notNull().default(180),
    checkoutHoldMinutes: integer("checkout_hold_minutes").notNull().default(15),
    maxOrderTotalCents: integer("max_order_total_cents").notNull().default(50000),
    /** Owner kill switch. */
    onlineOrderingEnabled: boolean("online_ordering_enabled").notNull().default(true),
    updatedBy: uuid("updated_by"),
    ...timestamps,
  },
  (t) => [
    check("store_settings_singleton", sql`${t.id} = 1`),
    check("store_settings_prep_minutes_range", sql`${t.prepMinutesDefault} between 1 and 120`),
    check("store_settings_last_order_offset_range", sql`${t.lastOrderOffsetMinutes} between 0 and 180`),
    check("store_settings_accept_timeout_range", sql`${t.acceptTimeoutSeconds} between 60 and 1800`),
  ],
);

/** Last run of each scheduled job (the minute sweep). `/api/health` reports the lag. */
export const cronHeartbeats = pgTable("cron_heartbeats", {
  name: text("name").primaryKey(),
  lastRunAt: timestamp("last_run_at", { withTimezone: true }).notNull(),
  lastOk: boolean("last_ok").notNull(),
  ...timestamps,
});
