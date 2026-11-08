-- Category names are unique per user ignoring case ("Gym" = "GYM"), as the app checks. The
-- old index was case-sensitive, so two such names created at the same moment both got in.
-- citext compares case-insensitively; the column is converted in place (names are kept), and
-- the unique index on ("userId", "name") is rebuilt by the type change.
CREATE EXTENSION IF NOT EXISTS citext;

ALTER TABLE "Category" ALTER COLUMN "name" TYPE CITEXT USING "name"::citext;
