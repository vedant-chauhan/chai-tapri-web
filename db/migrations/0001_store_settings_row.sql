-- The store_settings singleton (DATABASE.md §6). Column defaults are the confirmed slice-1 design values;
-- the operational ones (prep time, cut-off, accept timeout) are [Assumption]s pending CLIENT_QUESTIONS F4, F5, F7
-- and are changed through the admin, not here.
INSERT INTO "store_settings" ("id") VALUES (1) ON CONFLICT ("id") DO NOTHING;
