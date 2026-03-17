# Fix Your .env File

## Problem
Your `.env` file is using `postgres` as the database user, but that user doesn't exist on your system.

## Solution
Update your `.env` file with the correct DATABASE_URL:

```bash
# Open your .env file and replace the DATABASE_URL line with:
DATABASE_URL="postgresql://jnaneshshetty@localhost:5432/shaktiyoga?schema=public"
```

## Quick Fix Command
Run this command to update your .env file:

```bash
# Backup your current .env
cp .env .env.backup

# Update DATABASE_URL (macOS/Linux)
sed -i '' 's|DATABASE_URL=.*|DATABASE_URL="postgresql://jnaneshshetty@localhost:5432/shaktiyoga?schema=public"|' .env

# Or manually edit .env and change the DATABASE_URL line
```

## Verify It Works
After updating .env, restart your dev server:

```bash
# Stop the current server (Ctrl+C)
# Then restart:
npm run dev
```

## What I Did Temporarily
I've been running commands with the correct DATABASE_URL as an environment variable override. This works for now, but you should update your .env file for permanent fix.
