-- Session invalidation counter. Bumped on password reset / "log out everywhere".
ALTER TABLE "User" ADD COLUMN "tokenVersion" INTEGER NOT NULL DEFAULT 0;
