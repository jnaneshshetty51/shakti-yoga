# Seed User Credentials

This document contains the credentials for all seeded users in the database.

## Default Password
**All users use the same password:** `Password123!`

## User Credentials by Role

### 1. SUPER_ADMIN
- **Email:** `superadmin@shaktiyoga.com`
- **Password:** `Password123!`
- **Role:** SUPER_ADMIN
- **Description:** Highest level admin access with full system control

### 2. STAFF_ADMIN
- **Email:** `staffadmin@shaktiyoga.com`
- **Password:** `Password123!`
- **Role:** STAFF_ADMIN
- **Description:** Staff-level admin access for managing operations

### 3. TEACHER
- **Email:** `teacher@shaktiyoga.com`
- **Password:** `Password123!`
- **Role:** TEACHER
- **Description:** Yoga teacher who can teach classes and manage sessions

### 4. MEMBER_EVERYDAY
- **Email:** `member.everyday@shaktiyoga.com`
- **Password:** `Password123!`
- **Role:** MEMBER_EVERYDAY
- **Description:** Member with Everyday Yoga subscription (Active)
- **Subscription:** $29.99/month, Active status

### 5. MEMBER_THERAPY
- **Email:** `member.therapy@shaktiyoga.com`
- **Password:** `Password123!`
- **Role:** MEMBER_THERAPY
- **Description:** Member with Yoga Therapy subscription (Active)
- **Subscription:** $99.99/month, Active status

### 6. TRIAL
- **Email:** `trial@shaktiyoga.com`
- **Password:** `Password123!`
- **Role:** TRIAL
- **Description:** Trial user with 7-day trial subscription
- **Subscription:** Free trial, Trial status

### 7. VISITOR
- **Email:** `visitor@shaktiyoga.com`
- **Password:** `Password123!`
- **Role:** VISITOR
- **Description:** Default visitor role (unauthenticated users)

## Running the Seed

To populate the database with these users, run:

```bash
npx prisma db seed
```

Or directly:

```bash
npx tsx prisma/seed.ts
```

## Notes

- The seed script will delete and recreate users with these specific emails if they already exist
- All passwords are hashed using bcryptjs
- Subscriptions are automatically created for MEMBER_EVERYDAY, MEMBER_THERAPY, and TRIAL users
- User profiles are created for member roles with sample data

