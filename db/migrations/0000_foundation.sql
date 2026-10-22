CREATE TABLE "cron_heartbeats" (
	"name" text PRIMARY KEY NOT NULL,
	"last_run_at" timestamp with time zone NOT NULL,
	"last_ok" boolean NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "store_settings" (
	"id" smallint PRIMARY KEY NOT NULL,
	"timezone" text DEFAULT 'Australia/Perth' NOT NULL,
	"trading_day_boundary" time DEFAULT '05:00' NOT NULL,
	"prep_minutes_default" integer DEFAULT 10 NOT NULL,
	"last_order_offset_minutes" integer DEFAULT 30 NOT NULL,
	"accept_timeout_seconds" integer DEFAULT 300 NOT NULL,
	"accept_escalate_seconds" integer DEFAULT 180 NOT NULL,
	"checkout_hold_minutes" integer DEFAULT 15 NOT NULL,
	"max_order_total_cents" integer DEFAULT 50000 NOT NULL,
	"online_ordering_enabled" boolean DEFAULT true NOT NULL,
	"updated_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "store_settings_singleton" CHECK ("store_settings"."id" = 1),
	CONSTRAINT "store_settings_prep_minutes_range" CHECK ("store_settings"."prep_minutes_default" between 1 and 120),
	CONSTRAINT "store_settings_last_order_offset_range" CHECK ("store_settings"."last_order_offset_minutes" between 0 and 180),
	CONSTRAINT "store_settings_accept_timeout_range" CHECK ("store_settings"."accept_timeout_seconds" between 60 and 1800)
);
