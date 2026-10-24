-- Weekly hours seed (SLICE-01 §2). [Assumption — CLIENT_QUESTIONS Q15]: taken from the Google Business
-- Profile, not confirmed by the owner. Changed later through the owner's hours screen, not by editing this.
-- Mon/Wed/Thu/Sun 11:00–22:00 · Fri/Sat 11:00–01:00 (next day) · Tue closed. ISO weekday: 1 = Monday.
-- Only seeds an empty table, so it never overwrites hours the owner has set.
INSERT INTO "weekly_hours" ("weekday", "opens_at", "closes_at", "closes_next_day")
SELECT v.weekday, v.opens_at::time, v.closes_at::time, v.closes_next_day
FROM (VALUES
  (1, '11:00', '22:00', false),
  (3, '11:00', '22:00', false),
  (4, '11:00', '22:00', false),
  (5, '11:00', '01:00', true),
  (6, '11:00', '01:00', true),
  (7, '11:00', '22:00', false)
) AS v(weekday, opens_at, closes_at, closes_next_day)
WHERE NOT EXISTS (SELECT 1 FROM "weekly_hours");
