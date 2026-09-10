# Website Architecture & Flow — Plan

Companion to `Shakti_Yoga_Kendra_PRD.docx`, `..._Vision_Strategy.docx` and
`..._Programs_Pricing.docx`. Where those describe *what* Shakti is, this describes how the
**public website + logged-in member portal** should be structured, and tracks what's already
built vs. what's still missing. See also `CONTENT_PLATFORM_PLAN.md` for the content
(Reels/Posts/Blogs/Practices) subsystem, which this plan treats as already delivered.

**Principle:** the website's job is `Discover → Trust → Understand → Decide → Join`. The app
(`../mobile`) is `Return → Practice → Attend → Connect → Progress → Stay`. Admin is
`Control → Operate → Monitor → Improve`.

---

## STATUS — 2026-09-10

Gap analysis against the current codebase (`src/app`, `src/app/api`, `prisma/schema.prisma`).
Legend: ✅ built · 🟡 partial · ⬜ missing.

| # | Area | Status | Notes |
|---|---|---|---|
| 1 | Homepage hero + CTAs | 🟡 | `Hero.tsx` has "Start Free Trial" / "Book 1:1 Yoga Therapy", not "Explore Everyday Yoga" / "Meet Acharya Swastik". Headline is generic, no founder mention. |
| 2 | Shakti Story / Why Shakti | ✅ | `about/page.tsx` "Our Story" + `WhyUs.tsx` (home + about). Good enough as-is. |
| 3 | Founder (Acharya Swastik) page | ⬜ | No founder page/section anywhere. **Needs real bio/photo content from the studio — not something to fabricate.** |
| 4 | Programs pages | ✅ | `everyday-yoga/`, `yoga-therapy/`, `programs/` exist with copy + CTAs. |
| 5 | Everyday Yoga trial flow | 🟡 | `trial/page.tsx` grants trial access; **no batch/timetable picker** — `ClassBatch`/`ClassInstance`/`Booking` schema exists and supports it, UI doesn't use it yet. |
| 6 | Yoga Therapy intake/assessment | ✅ **built 2026-09-10** | New `TherapyIntake` model + 5-step assessment at `yoga-therapy/intake`, admin review at `admin/therapy`. See Phase B below — migration not yet applied to a real DB. |
| 7 | Testimonials with admin approval | ✅ | `Story` model + `stories/` + admin Story tab. Matches proposal. |
| 8 | Public "Meet Our Teachers" | ✅ **built this session** | `StaffProfile` model already had `publicVisible`; added `GET /api/teachers` + `src/app/teachers/page.tsx` + Navbar link. |
| 9 | "Take a Moment" / practices | ✅ | `Practice` model, mobile-first per `CONTENT_PLATFORM_PLAN.md` Phase 5. Not yet on the web dashboard. |
| 10 | India/Intl pricing + region detection | ✅ | `api/region`, `lib/pricing.ts`, server-rendered per-region pricing. |
| 11 | FAQ (DB-backed, shared) | ✅ **fixed this session** | `FAQ.tsx` was hardcoded, ignoring the `FAQ` model + `/api/content/faqs`; now reads Prisma directly (same fallback pattern as `Stories.tsx`). |
| 12 | Corporate Yoga page + enquiry | ⬜ | No corporate references. `Lead`/`LeadActivity` models + `admin/leads` are the ready-made backend to reuse. |
| 13 | Retreats page | ⬜ | Nothing exists. Needs real destination/photo content. |
| 14 | Workshops & Events page | ⬜ | Nothing exists. |
| 15 | Refer & Earn member UI | ✅ **built this session** | Backend (`Referral` model, `/api/referral`, `/r/[code]`) existed with no UI. Added `dashboard/refer/page.tsx` + Sidebar link. |
| 16 | Family Membership member UI | ✅ **built this session** | Backend (`Subscription.familyOwnerId`/`familyInviteCode`, `lib/family.ts`, `/api/family`, `/api/family/join`) existed with no UI. Added `dashboard/family/page.tsx` + Sidebar link. |
| 17 | Member portal nav completeness | 🟡 | Sidebar now: Dashboard, My Classes, Progress, Activity, Plan & Billing, Family, Refer & Earn, Profile. Still missing dedicated Certificates / Notifications / Support-ticket surfaces (Support is a `mailto:` link today). `dashboard/therapy` + `dashboard/consultations` exist but aren't in the nav (reached contextually). |
| 18 | Lead-capture pattern | ✅ | `Lead`/`LeadActivity` + `LeadSource`/`LeadStatus` enums + `api/contact` + `admin/leads` — reuse this for Corporate/Retreats/Workshops rather than building new models. |

**Built this session:** `GET /api/teachers` + `/teachers` public page + Navbar link;
`FAQ.tsx` wired to the `FAQ` Prisma model instead of a hardcoded array;
`/dashboard/refer` (Refer & Earn UI) + Sidebar link;
`/dashboard/family` (Family Membership UI, join-by-code + owner seat view) + Sidebar link.

No schema migration was needed for any of the above — every one of them wired an existing
model/API to a missing UI. **Not yet run against a live DB** (no `node_modules` in this
checkout to `prisma generate`/typecheck against — verify with `npm run lint` and a manual
click-through before deploying).

**Also built 2026-09-10 (Phase B, see below):** the Yoga Therapy intake/assessment —
this one *does* need a migration (`20260910000000_therapy_intake`) applied before deploying.

---

## Next phases

### Phase A — Everyday Yoga batch selection (schema exists, UI doesn't)
- Trial signup shows the real weekly timetable (`ClassBatch` list: time, teacher, theme,
  spots left) and the visitor picks one batch for their trial session, reusing the booking
  logic already in `api/bookings`/`api/classes`.
- Post-trial, members can join **any** available Mon–Fri batch (not locked to their trial
  pick) — confirm this is how `api/bookings` already treats membership vs. trial.

### Phase B — Yoga Therapy intake + recommendation — ✅ built 2026-09-10
- `TherapyIntake` model + `TherapyIntakeStatus` enum — additive migration
  `prisma/migrations/20260910000000_therapy_intake` (hand-written SQL; this checkout has no
  Node.js, so `prisma migrate dev` couldn't generate/verify it — **run `npx prisma generate`
  and `npx prisma migrate deploy` before relying on this in any environment**, and sanity
  check the SQL once a real Postgres is available).
- `src/lib/therapy-intake.ts` — draft save / submit / begin-review / decide, plus
  `applicantFacingStatus()` which collapses `NOT_RECOMMENDED` into the same "still with our
  team" message as `UNDER_REVIEW` so a non-recommendation is never surfaced verbatim.
- Member API: `GET/POST /api/therapy/intake`, `POST /api/therapy/intake/submit`.
- Admin API: `GET /api/admin/therapy/intakes`, `GET .../[id]` (opening a `SUBMITTED` intake
  auto-flips it to `UNDER_REVIEW`, locking the applicant out of further edits),
  `POST .../[id]/decision`.
- `src/app/yoga-therapy/intake/page.tsx` — 5-step form (personal → concern → medical
  history → consent/emergency contact → review), autosaves per step, editable until
  `UNDER_REVIEW`; post-submit shows a neutral "with our team" screen, or — once
  recommended — the reviewer's notes plus a "Proceed to payment" button into the existing
  `checkout?plan=therapy` flow. **No bypass**: `yoga-therapy/start`'s "Start Therapy Plan"
  CTA now points here instead of straight to checkout.
- `src/app/admin/therapy/page.tsx` — assessment list + review drawer with the three
  decision buttons and a notes field; added to the admin nav ("Operations" → "Therapy
  Assessments").
- Deliberately unchanged: `dashboard/therapy/book`'s "Subscribe" CTA (an existing member
  renewing after running out of credits, not a first-time buyer — the "no Buy Now" rule is
  about the initial decision point, not renewals).

### Phase C — Corporate / Retreats / Workshops
- Three marketing pages, each ending in an enquiry form that POSTs to `api/contact` (or a
  thin wrapper) tagged with a new `LeadSource` value per page — no new backend model needed.
- Content-heavy: needs real copy/photos from the studio before publishing, not placeholder
  text.

### Phase D — Founder page
- Dedicated `/founder` (or `/about/swastik`) page: story, education, philosophy, video.
- **Blocked on real content** — do not fabricate biographical claims about a real person.
  Build the page shell + CMS-editable fields (reuse the `Story`/`BlogPost` admin pattern, or
  a new singleton `FounderProfile` row) once bio/photo/video are supplied.

### Phase E — Member portal polish
- Certificates, dedicated Notifications view, a real Support surface (ticket or FAQ-first
  deflection) beyond the current `mailto:` link.
- Fold `dashboard/therapy` / `dashboard/consultations` into the sidebar for therapy members.

---

## Explicitly deferred / out of scope for now

- Folding `Story` (testimonials) into the generic `Content` model — two code paths today,
  acceptable per `CONTENT_PLATFORM_PLAN.md`'s own note.
- ML-based batch/therapist matching — rules-based recommendation only.
- Self-service retreat booking — enquiry → manual confirmation → manual payment, per the
  original proposal.
