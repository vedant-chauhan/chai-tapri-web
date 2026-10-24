-- Merge staff_roles into staff_users.role (project lead, 24 Oct 2026). Data-preserving:
-- add the column, copy every existing role across, then drop the old table.
ALTER TABLE "staff_users" ADD COLUMN "role" text;--> statement-breakpoint
UPDATE "staff_users" SET "role" = r."role" FROM "staff_roles" r WHERE r."user_id" = "staff_users"."id";--> statement-breakpoint
ALTER TABLE "staff_users" ADD CONSTRAINT "staff_users_role_valid" CHECK ("staff_users"."role" is null or "staff_users"."role" in ('staff', 'manager', 'owner'));--> statement-breakpoint
DROP TABLE "staff_roles";
