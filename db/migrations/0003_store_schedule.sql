CREATE TABLE "audit_log" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "audit_log_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"actor_id" uuid NOT NULL,
	"action" text NOT NULL,
	"entity" text NOT NULL,
	"entity_id" text NOT NULL,
	"before" jsonb,
	"after" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "date_exceptions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"trading_date" date NOT NULL,
	"kind" text NOT NULL,
	"opens_at" time,
	"closes_at" time,
	"closes_next_day" boolean DEFAULT false NOT NULL,
	"reason" text NOT NULL,
	"public_note" text,
	"created_by" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "date_exceptions_kind_valid" CHECK ("date_exceptions"."kind" in ('closed', 'special_hours')),
	CONSTRAINT "date_exceptions_times_match_kind" CHECK (("date_exceptions"."kind" = 'closed' and "date_exceptions"."opens_at" is null and "date_exceptions"."closes_at" is null)
        or ("date_exceptions"."kind" = 'special_hours' and "date_exceptions"."opens_at" is not null and "date_exceptions"."closes_at" is not null))
);
--> statement-breakpoint
CREATE TABLE "ordering_overrides" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"mode" text NOT NULL,
	"scope" text DEFAULT 'all' NOT NULL,
	"starts_at" timestamp with time zone DEFAULT now() NOT NULL,
	"ends_at" timestamp with time zone,
	"reason" text,
	"created_by" uuid NOT NULL,
	"cleared_at" timestamp with time zone,
	"cleared_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "ordering_overrides_mode_valid" CHECK ("ordering_overrides"."mode" in ('open', 'closed')),
	CONSTRAINT "ordering_overrides_scope_valid" CHECK ("ordering_overrides"."scope" in ('all', 'delivery')),
	CONSTRAINT "ordering_overrides_open_needs_end" CHECK ("ordering_overrides"."mode" = 'closed' or "ordering_overrides"."ends_at" is not null),
	CONSTRAINT "ordering_overrides_end_after_start" CHECK ("ordering_overrides"."ends_at" is null or "ordering_overrides"."ends_at" > "ordering_overrides"."starts_at")
);
--> statement-breakpoint
CREATE TABLE "weekly_hours" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"weekday" smallint NOT NULL,
	"opens_at" time NOT NULL,
	"closes_at" time NOT NULL,
	"closes_next_day" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "weekly_hours_weekday_range" CHECK ("weekly_hours"."weekday" between 1 and 7),
	CONSTRAINT "weekly_hours_order" CHECK ("weekly_hours"."closes_next_day" or "weekly_hours"."opens_at" < "weekly_hours"."closes_at")
);
--> statement-breakpoint
CREATE INDEX "audit_log_entity" ON "audit_log" USING btree ("entity","entity_id");--> statement-breakpoint
CREATE INDEX "date_exceptions_date" ON "date_exceptions" USING btree ("trading_date");--> statement-breakpoint
CREATE INDEX "ordering_overrides_active" ON "ordering_overrides" USING btree ("starts_at" DESC NULLS LAST) WHERE "ordering_overrides"."cleared_at" is null;--> statement-breakpoint
CREATE INDEX "weekly_hours_weekday" ON "weekly_hours" USING btree ("weekday");