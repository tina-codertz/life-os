-- Runs once, when the Postgres volume is first created.
-- The main dev database (POSTGRES_DB) is created automatically; this adds a separate one for automated tests.
CREATE DATABASE lifeos_test;
