# Seed User Credentials

The seed script (`prisma/seed.ts`) creates one user per role for local
development and demos.

## Password

All seeded users share a single password, resolved in this order:

1. `SEED_PASSWORD` environment variable (must be at least 8 characters).
2. Otherwise a random password is generated and **printed once** at the end
   of the seed run — copy it from the console output.

For a predictable local login, add `SEED_PASSWORD=...` to your `.env` /
`.env.local`. Set `NEXT_PUBLIC_SEED_PASSWORD` to the same value if you want the
dev-only "Quick Login" buttons on `/login` to work.

## Production safety

The seed refuses to run when `NODE_ENV=production` unless `ALLOW_PROD_SEED=true`
is also set. Do **not** run the seed against a production database with a weak
`SEED_PASSWORD` — these are shared demo accounts, including a `SUPER_ADMIN`.

## Accounts by role

| Role            | Email                            |
| --------------- | -------------------------------- |
| SUPER_ADMIN     | superadmin@shaktiyoga.com        |
| STAFF_ADMIN     | staffadmin@shaktiyoga.com        |
| TEACHER         | teacher@shaktiyoga.com           |
| MEMBER_EVERYDAY | member.everyday@shaktiyoga.com   |
| MEMBER_THERAPY  | member.therapy@shaktiyoga.com    |
| TRIAL           | trial@shaktiyoga.com             |
| VISITOR         | visitor@shaktiyoga.com           |

## Running the seed

```bash
npm run db:seed
# or
npx tsx prisma/seed.ts
```

## Notes

- The seed deletes and recreates the accounts above (and sample content) on
  every run.
- Passwords are hashed with bcryptjs.
- Subscriptions are created for MEMBER_EVERYDAY ($59), MEMBER_THERAPY ($120) and
  TRIAL ($0), matching `src/lib/pricing.ts`.
