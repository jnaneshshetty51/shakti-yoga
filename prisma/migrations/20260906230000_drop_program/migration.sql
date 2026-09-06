-- Program was an orphaned admin-only CRUD with no public surface and an empty table.
-- Removing the model, its indexes and the two enums that only it used.
DROP TABLE IF EXISTS "Program";
DROP TYPE IF EXISTS "ProgramLevel";
DROP TYPE IF EXISTS "ProgramStatus";
