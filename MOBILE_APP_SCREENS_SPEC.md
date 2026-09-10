# Mobile App — Screen-by-Screen Specification

Companion to `MOBILE_APP_PLAN.md` (phase status/roadmap) and `WEBSITE_ARCHITECTURE_PLAN.md`.
Where that doc tracks *what phase we're in*, this doc defines *every screen, button, state,
transition, and backend call* the target product needs — grounded against the actual
Prisma schema and API routes as they exist today (verified 2026-09-10), not the aspirational
flow description it was drafted from.

**How to read this:** each screen has a status icon —
✅ **backend ready** (existing model/route covers it as described) ·
🔶 **partial** (something exists but behaves differently than specified — see the linked
gap) · 🆕 **new** (no backend support at all yet).
Screen IDs are stable references (`HOME-2`, `EY-4`, …) — use them in tickets/PRs so this
doc and the codebase can cross-reference each other.

---

## Table of Contents

1. [Known backend gaps & decisions needed](#1-known-backend-gaps--decisions-needed)
2. [User states & navigation shell](#2-user-states--navigation-shell)
3. [Auth & onboarding (`AUTH-*`)](#3-auth--onboarding)
4. [Home (`HOME-*`)](#4-home)
5. [Everyday Yoga (`EY-*`)](#5-everyday-yoga)
6. [Yoga Therapy (`THER-*`)](#6-yoga-therapy)
7. [Content & Take a Moment (`CONT-*`)](#7-content--take-a-moment)
8. [Notifications & announcements (`NOTIF-*`)](#8-notifications--announcements)
9. [Support (`SUPP-*`)](#9-support)
10. [FAQ (`FAQ-*`)](#10-faq)
11. [Testimonials (`TESTI-*`)](#11-testimonials)
12. [Family (`FAM-*`)](#12-family)
13. [Refer & Earn (`REFER-*`)](#13-refer--earn)
14. [Membership card (`CARD-*`)](#14-membership-card)
15. [Certificates (`CERT-*`)](#15-certificates)
16. [Workshops, Events & Retreats (`EVT-*`)](#16-workshops-events--retreats)
17. [Contact & Centre (`CONTACT-*`)](#17-contact--centre)
18. [Profile & settings (`PROF-*`)](#18-profile--settings)
19. [Calendar (`CAL-*`)](#19-calendar)
20. [Downloads / offline (`DL-*`)](#20-downloads--offline)
21. [Cross-cutting system behavior](#21-cross-cutting-system-behavior)

---

## 1. Known backend gaps & decisions needed

Read this section first — many screens below are written to the *intended* product
behavior and then flag which parts of that behavior have no backend support yet. Rather
than repeat the same caveat on every screen, each gap gets an ID (`G1`, `G2`, …) here and
is just referenced inline.

| ID | Gap | Why it matters |
|---|---|---|
| **G1** | **No group-class session-credit ledger.** `ClassAttendance` is created the instant a member successfully calls `POST /api/classes/[id]/join` — that single event *is* both "attended" and "counted," with no teacher-confirmation step, no distinct check-in state, and (for the full `MEMBER_EVERYDAY` plan) no cap or remaining-balance field at all. The "20 sessions/billing cycle," "14/20 remaining," and "check-in → teacher confirms Present → then deduct" flow described in the product vision does not exist server-side today. Only `MEMBER_STARTER` has any usage limit, and it's a rolling weekly count, not a cycle-based credit pool. **Decision needed:** either (a) build a real `SessionCredit`/ledger model with a distinct check-in vs. confirmed-present state, matching the "Join ≠ deduction" rule, or (b) simplify the product spec to match what join-time attendance actually supports. This affects `EY-4`, `EY-5`, `EY-6`, `EY-9`, `EY-10`. |
| **G2** | **No capacity/availability signal on `ClassInstance`.** There's no batch-capacity field or "Available / Few spots / Full" derivation in the schema — `attendanceCount` exists but nothing caps it or surfaces a threshold. Needed for `EY-3`'s batch picker. |
| **G3** | **`Booking` reschedule is a raw overwrite, not a workflow.** `PATCH /api/bookings/[id]` directly changes `date`, with a ≥24h-notice rule for non-staff — the *opposite* of the "same-day only, subject to therapist availability, silently updates, no push" rule in `THER-8`. There's no pending-request state, no distinct same-day path, and no field recording *why* a session was rescheduled. |
| **G4** | **No substitute-therapist mechanism.** `Booking.teacherId` is fixed at creation. There's no reassignment field, so "founder assigns a substitute, patient gets a push, sees the original name until they join, then sees the substitute" (`THER-9`) cannot be implemented as specified without a schema change. |
| **G5** | **No progress-measurement model.** The therapist-chosen metrics (pain, mobility, sleep, stress, weight/BMI, condition-specific) and their charted history (`THER-11`) have no backing table. `PracticeCompletion` and `ClassAttendance` are the only progress-adjacent data today. |
| **G6** | **No patient-submitted medical update model.** `THER-12`'s "new medication / injury / symptom change" submissions need a new table distinct from the one-time `TherapyIntake` fields (which lock once `UNDER_REVIEW`). |
| **G7** | **No notification history/inbox.** Push is fire-and-forget (`src/lib/push.ts`) with no `PushToken`-adjacent log table. `NOTIF-1`'s chronological inbox with read/unread state needs a new `Notification` model. |
| **G8** | **No announcement audience/expiry/importance fields.** `Content` (type `ANNOUNCEMENT`) has `pinned` but no `expiresAt`, no audience filter beyond whatever `tags` can be repurposed for, and no explicit "important" flag distinct from `pinned`. `NOTIF-2` needs schema additions if audience targeting is required. |
| **G9** | **No per-content download permission or offline-eligibility flag.** `Content`/`Practice` have `mediaUrls`/`videoUrl` but nothing marking "downloadable: on/off." `DL-1` needs this field before the toggle described in the vision can exist. |
| **G10** | **No "mark helpful" interaction kind.** `ContentInteraction.kind` only supports `"like"` / `"save"` today. Either reuse `like` as a proxy for "helpful" or add a third kind. |
| **G11** | **No digital-membership-card concept at all.** Nothing needs to be *stored* beyond what already exists (`User.name/avatarUrl/createdAt`, `Subscription.planType/status/renewalDate`) — `CARD-1` can likely be built as a pure read/render screen with no new backend, but confirm before assuming. |
| **G12** | **No policy-acceptance audit trail.** `AUTH-6`'s requirement to record policy version + timestamp + block access until re-accepted has no model — `AuditLog` exists generically and could be repurposed, or a dedicated `PolicyAcceptance` table is cleaner. |
| **G13** | **Certificate verification requires a session**, per the code comment ("public verification, requires a Shakti account") — this actually *matches* the product vision's "verification requires a Shakti account" line exactly. No gap — noted here only so it isn't mistaken for one while building `CERT-3`. |
| **G14** | **Public share-preview page for shared content doesn't exist.** `CONT-7`'s "recipient gets a public preview + Join Shakti CTA" is a **website** surface (`shaktiyoga.in/content/[id]` unauthenticated preview), not a mobile screen — flagging it here so it isn't lost, but it belongs in `WEBSITE_ARCHITECTURE_PLAN.md`'s backlog. |
| **G15** | **Content "downloaded stays inside the app, never exportable"** (`DL-1`) is an app-side DRM constraint (custom video player, no share-sheet on downloaded files) rather than a backend gap — noted so it isn't scoped as a server task. |

None of these block starting on the screens that don't depend on them (Home read-views,
Classes list, Content feed, FAQ, Testimonials, Refer & Earn, Family, Profile). Treat `G1`
as the highest-priority decision — it's the one piece of missing infrastructure that the
core "how many sessions do I have left" product promise depends on.

---

## 2. User states & navigation shell

Four primary states, matching `Role`/`Subscription.status`:

| State | Role / Subscription | Tab bar |
|---|---|---|
| **Non-member** | `VISITOR`, no `Subscription` | Home · Explore · Practice · More |
| **Trial** | `TRIAL` role, `Subscription.status = TRIAL` | Home · Classes(trial-limited) · Practice · More |
| **Everyday Yoga (active)** | `MEMBER_EVERYDAY` / `MEMBER_STARTER`, `Subscription.status = ACTIVE` | Home · Classes · Practice · Progress · More |
| **Everyday Yoga (inactive)** | same role, `status = CANCELLED/EXPIRED` | Home · Practice · More (Classes tab shows renew paywall) |
| **Yoga Therapy (active)** | `MEMBER_THERAPY`, `status = ACTIVE` | Home · My Therapy · Practice · Progress · More |
| **Yoga Therapy (inactive)** | same role, `status = CANCELLED/EXPIRED` | Home · Practice · More (My Therapy tab shows historical journey, read-only) |

A user can hold **both** an Everyday Yoga and Therapy relationship only in the sense that
`Subscription` is 1:1 with `User` (`Subscription.userId` unique) — today's schema does not
support a member having an active Everyday subscription *and* an active Therapy booking
relationship simultaneously as two independent things, since therapy access is gated by
`role`/`credits`, not a second `Subscription` row. In practice a `MEMBER_THERAPY` user can
still join group classes if `Booking`/`ClassAccess` logic allows it — confirm intended
overlap before building `HOME-*` tab logic that assumes strict either/or.

Tab bar is rendered by `mobile/app/(tabs)/_layout.tsx` (already built for the 4-tab
non-therapy case); adding the "My Therapy" tab for `MEMBER_THERAPY` and collapsing tabs for
inactive states is new work on top of the existing file.

---

## 3. Auth & onboarding

### AUTH-1 — Welcome
- **Who:** unauthenticated. **Entry:** app cold-start with no stored token (`mobile/app/index.tsx` → `(auth)/welcome.tsx`, ✅ built).
- **Shows:** brand mark, one-line value prop, three auth buttons, "Log in" link.
- **Actions:**
  - **Continue with Google** → native Google sign-in → 🆕 no `/api/auth/mobile/google` route exists yet; only email/password is built (`AUTH-2`). Needs a new OAuth-token-exchange endpoint before this button can do anything.
  - **Continue with Apple** → same gap, 🆕 needed for iOS App Store review requirements (Sign in with Apple is mandatory if Google/email sign-in is offered on iOS).
  - **Email + password** → `AUTH-3` (Sign up).
  - **Log in** → `AUTH-2`.

### AUTH-2 — Log in
- ✅ built (`(auth)/login.tsx`), backed by `POST /api/auth/mobile/login`.
- **Shows:** email, password, "Forgot password?", submit, link back to sign-up.
- **States:** idle → submitting (disable button, spinner) → error (inline message from `ApiError`, e.g. "Invalid credentials") → success.
- **Actions:** Submit → `POST /api/auth/mobile/login` → on 200, store `token` (`setToken`), navigate to `HOME-1`/`HOME-2`/etc. per returned `user.role`. On 401/429 (rate-limited), show inline error, no navigation.
- **Forgot password?** → 🆕 not in mobile today; web has `/api/auth/forgot-password` + `/api/auth/reset-password` — needs either an in-app flow calling the same routes, or an in-app-browser handoff to the web reset page.

### AUTH-3 — Sign up
- ✅ built (`(auth)/signup.tsx`), backed by `POST /api/auth/mobile/register`.
- **Shows:** first name, last name, email, password, optional referral code field, T&C/Privacy checkbox, submit.
- **Important (per product vision):** no program picker here — `register` doesn't take a `planType`, so this is already correctly decision-free.
- **Actions:** Submit → `POST /api/auth/mobile/register` (validates referral code inline server-side if present) → 201 → store token → land on `HOME-1` (non-member home), **not** a program-selection screen.
- **T&C/Privacy checkbox** ties to `G12` — today there's no server-side record of *which* policy version was accepted at signup; the checkbox is presentational only until that's built.

### AUTH-4 — Basic profile (optional, deferred)
- 🆕 new screen, not required at signup.
- **Entry:** from `PROF-1` "Complete your profile" prompt, or a dismissible Home card for new non-members.
- **Shows:** photo picker, phone/WhatsApp, DOB, address/city — all optional fields.
- **Backend:** `PATCH /api/profile` (route not confirmed to exist under this exact path — verify against `src/app/api/profile/route.ts` before building; `src/app/api/profile/avatar/route.ts` exists separately for the photo upload). Treat as 🔶 partial until confirmed which fields `UserProfile`/`User` actually accept via PATCH.

### AUTH-5 — Session restore (no screen, but a real transition)
- App boot with a stored token → silently calls `GET /api/auth/me` (existing route) to validate + refresh the token → routes to the correct Home variant. Token invalid/expired (401) → clear stored token → `AUTH-1`.

### AUTH-6 — Re-consent gate
- 🆕 new, depends on `G12`. **Trigger:** legal doc version bump. **Shows:** modal-style full-screen blocking view — updated policy summary, "I Accept" (only action; no dismiss). **Backend:** needs a version-check on session restore and a new accept-endpoint; until `G12` is resolved this can only be built as a client-side "last seen version" flag with no real audit trail, which does not satisfy the stated requirement.

---

## 4. Home

Three structurally different Home screens sharing one route slot (`(tabs)/index.tsx`,
partially ✅ built for the Everyday-member case per `MOBILE_APP_PLAN.md`) — render branches
on `role`/`Subscription.status`, not three separate files necessarily, but treat them as
distinct specs.

### HOME-1 — Non-member Home
- 🆕 new (today's `index.tsx` assumes a member). **Who:** `VISITOR`.
- **Shows:** discovery-oriented cards — "What Shakti Offers" (Everyday Yoga / Yoga Therapy
  summary cards), a `CONT-2`-style "Take a Moment" strip (public, no login needed —
  confirm `content/home` truly returns data for unauthenticated calls, since the route
  supports "session optional"), a Testimonials teaser, an FAQ teaser, "Explore Workshops &
  Retreats," Founder message teaser, "Contact Shakti."
- **Locked-state pattern:** any member-only element renders as a card with a lock icon and
  a CTA instead of content, e.g. "Join Everyday Yoga to access your classes" → `EY-1`,
  "Begin Yoga Therapy Assessment" → `THER-1`.
- **Backend:** `GET /api/content/home` (session optional, ✅), plus static/marketing copy
  that can be hardcoded or pulled from `GET /api/content/why-us`, `GET /api/content/faqs`,
  `GET /api/content/testimonials` (all ✅, already used by the website).

### HOME-2 — Everyday Yoga Home (active)
- 🔶 partial — `(tabs)/index.tsx` already renders a version of this per `MOBILE_APP_PLAN.md`; extend rather than rebuild.
- **Shows:**
  - Greeting ("Good morning, {name}").
  - **Next Class** card: batch name, time, teacher, live countdown ("Starts in 42 minutes"), Join button (disabled/hidden outside the join window).
  - **Sessions remaining** — per `G1`, this cannot currently show a true "14/20" cycle balance; the honest interim version is "Classes attended this cycle: N" (derivable from `ClassAttendance` count since `Subscription.startDate`/`renewalDate`), not a remaining-balance countdown, until `G1` is resolved.
  - **Today's Classes** — mini list, tap → `EY-2`.
  - **Take a Moment** strip → `CONT-2`.
  - **Announcements** banner (pinned `Content` of type `ANNOUNCEMENT`) → dismiss stores locally (no per-user dismiss-state field server-side — confirm if that matters for "important announcements remain visible until dismissed" across devices, or if local dismissal is acceptable).
- **Backend:** `GET /api/classes` (✅, returns `today`/`upcoming`/`access`), `GET /api/content/home` (✅).

### HOME-3 — Everyday Yoga Home (trial)
- 🔶 partial. **Who:** `TRIAL` role, pre-trial-use.
- **Shows:** same shell as `HOME-2` but with a "Your free trial class" card instead of a
  session-balance card, and a persistent "This is your one free trial class" banner.
- Post-trial (trial consumed, no subscription yet): swaps the trial card for a **Subscribe**
  CTA → `EY-6`. Per the product vision, trial users get "basic account functionality" only
  — Classes tab should show the paywall (`EY-2` empty/locked state), not a live timetable,
  once the single trial class has been attended.

### HOME-4 — Everyday Yoga Home (inactive)
- 🆕 new. **Who:** `MEMBER_EVERYDAY`/`MEMBER_STARTER`, `status ∈ {CANCELLED, EXPIRED}`.
- **Shows:** prominent **Renew Membership** card (name, last plan, "Your membership ended
  on {renewalDate}"), plus everything still available to a non-member (Profile, Support,
  FAQ, free content, account history). Classes/Progress tabs collapse or show a locked state.
- **Actions:** Renew Now → `EY-8` (pricing) pre-filled with the prior plan.

### HOME-5 — Yoga Therapy Home (active)
- 🔶 partial — `MOBILE_APP_PLAN.md` notes a lighter version exists ("no charts yet").
- **Shows:** next scheduled session (date/time/therapist/Join), link into `THER-7` (My
  Therapy Schedule) and `THER-10` (My Therapy Journey), a medical-update entry point
  (`THER-12`), Take a Moment strip, announcements.
- **Backend:** `GET /api/bookings` (✅).

### HOME-6 — Yoga Therapy Home (inactive)
- 🆕 new. **Shows:** "Your therapy plan has ended" + link to **historical** `THER-10`
  (read-only), Renew/Restart Assessment CTA → re-enters `THER-1` fresh (a new
  `TherapyIntake` cycle, since the model is one-per-user and would need either a reset or
  a new-intake-per-cycle design decision before this is fully specifiable).

---

## 5. Everyday Yoga

### EY-1 — Everyday Yoga info (non-member)
- 🆕 new marketing/info screen (mirrors `src/app/everyday-yoga/page.tsx` content).
- **Shows:** program explanation, region-priced pricing (reuse `GET /api/plans` or the
  same pricing-resolution logic as the website's `resolveRegion()`/`priceFor()`), "20
  sessions/billing cycle" messaging (see `G1` caveat — the messaging is a pricing-plan
  promise even though attendance tracking doesn't yet enforce/display it that way),
  difference-from-Therapy comparison, testimonials, FAQs.
- **Actions:** Start Free Trial → `EY-3`. (No direct "Subscribe" here for a non-member —
  trial-first is the only entry path per the product vision.)

### EY-2 — Classes / Schedule (timetable)
- ✅ built (`(tabs)/classes.tsx`), backed by `GET /api/classes`.
- **Shows:** today's batches + upcoming, each with time/teacher/theme/duration, an
  availability indicator, and Join when eligible.
- **Availability indicator:** per `G2`, there's no capacity field to derive
  Available/Few-spots/Full from today — `attendanceCount` exists but nothing it's compared
  against. Until `G2` lands, either hide the indicator or treat it as always "Available."
- **States:** loading, empty ("Nothing scheduled today"), locked (non-member/inactive/trial-exhausted → paywall card using `access.reason`/`access.paywall` from the API response), normal list.
- **Actions:** tap a batch → `EY-4` (class detail / join).

### EY-3 — Start Free Trial (batch picker)
- 🔶 partial — batch listing reuses `EY-2`'s data; the "this is a trial, one-time" framing and post-trial lock are the new pieces.
- **Shows:** same batch list as `EY-2`, framed as "Choose any batch for your free trial," no payment fields anywhere on this screen.
- **Actions:** Choose batch → `EY-4` in trial mode. First successful `ClassAttendance` for a `TRIAL`-role user is, per the product vision, meant to consume the lifetime trial — confirm server-side that `POST /api/classes/[id]/join` actually flips `TRIAL` → some "trial used" marker (not confirmed by this research pass; likely needs a check against `User.trialStartedAt` plus an explicit "trial consumed" signal, since `trialStartedAt` alone records *when*, not *whether it was used*).

### EY-4 — Class detail / Join
- 🔶 partial. **Shows:** batch time/teacher/theme, countdown to join-window opening, Join button, and once inside the window, **LIVE NOW** state (`EY-5`).
- **Join-window timing:** join becomes active 30 min before start (per vision) — confirm this matches the actual window enforced by `POST /api/classes/[id]/join` server-side (this research pass didn't extract the exact minute thresholds for classes, only for `Booking`, which uses 15 min before / 60 min after — **the two windows may differ or may need to be reconciled**; flag before building the client-side countdown so it matches server enforcement exactly rather than guessing).
- **10-minutes-before push:** 🆕 depends on `G7`-adjacent scheduling infra (a cron/job that fires push at T-10; `src/app/api/cron/*` already has `ensure-instances`/`publish-scheduled`/`subscriptions` jobs — a new one is needed for class reminders, or extend an existing one).
- **Actions:**
  - **Join Class** → `POST /api/classes/[id]/join` (✅) → success returns `{meetingLink}` → open in external Meet app/browser, create `ClassAttendance` row server-side immediately (see `G1` — this *is* the deduction event today, there is no separate check-in step).
  - Button disappears once `ClassInstance.status` moves past active (no explicit "ended" timestamp field beyond status — confirm status transition is automated via a cron job, not manual).

### EY-5 — Live Now banner/state
- Same screen as `EY-4`, visually distinct state: 🔴 "LIVE NOW" badge + Join button, shown app-wide (e.g. a persistent Home banner) whenever a joinable instance is in-window. No separate route.

### EY-6 to EY-10 — the described Check-In flow
🆕 **all of this is new**, blocked on `G1`. The product vision's check-in flow (student
taps "Check In" separate from Join → candidate attendance row → teacher verifies →
teacher can override/manually-add → *only* teacher-confirmed "Present" deducts a session;
"Join ≠ deduction"; late/forgot-to-check-in handling; multiple classes per day each
counting separately) requires:
- A new state on `ClassAttendance` (or a new `ClassCheckIn` table) distinguishing
  *candidate* (self-reported) from *confirmed* (teacher-verified) attendance.
- A teacher-facing verification UI (this doc is scoped to the **member** app; the
  teacher-facing screens for confirming/editing attendance belong in a separate teacher-app
  or admin-web spec — `src/app/api/teacher/*` routes already exist for teacher dashboards
  and could host this, but it's out of scope here).
- A real session-credit ledger per `G1` so "one Present attendance = one deduction" has
  something to deduct from.

**Until this is built**, the honest member-facing spec is: `EY-4`'s Join button *is* the
attendance event (no separate check-in step exists), and `HOME-2`'s "sessions remaining"
card should show attendance count, not a credit balance, as noted above.

### EY-11 — Session history
- 🔶 partial. **Shows:** current-cycle attendance list + a "Previous cycles" expandable
  section. **Backend:** `ClassAttendance` rows filtered by date range relative to
  `Subscription.startDate`/`renewalDate` — no dedicated endpoint confirmed to exist for
  this exact grouped view; likely needs a small new route (`GET /api/progress` exists and
  may already cover part of this — check before building a duplicate).

### EY-12 — Buy additional session
- 🆕 new. **Entry:** from `EY-11` or `HOME-2` once a cycle's attendance is "used up" (see
  `G1` — "used up" isn't a real gate today). **Shows:** single line-item purchase, price
  marked **TBD** per the product vision itself. **Backend:** would extend `checkout/order`
  with a new one-off `planKey`, or a new lightweight endpoint — not started.

### EY-13 — Subscription / Pricing
- ✅ mostly built. **Shows:** region-priced Everyday Yoga plan (₹2,000 / $59 per the
  vision — reconcile against `Plan`/`PLANS` pricing config, which may have since diverged;
  confirm current numbers before shipping copy), "20 sessions per billing cycle, unused
  sessions expire" messaging (aspirational per `G1`).
- **Actions:** Subscribe → `POST /api/checkout/order` or `/subscribe` (✅) → `EY-14` (Razorpay payment sheet).

### EY-14 — Payment (Razorpay)
- ✅ built pattern on web; mobile needs the Razorpay React Native SDK (native module —
  same category of decision as RevenueCat in `MOBILE_APP_PLAN.md` Phase 4: does this force
  a custom EAS dev client, or does mobile hand off to an in-app browser checkout view?).
  Flag as a build-order decision, not just a screen.
- **Flow:** order created (`EY-13`'s action) → Razorpay checkout UI collects payment →
  `POST /api/checkout/verify` (✅) with the returned signature → success → `Subscription`
  activated, `User.credits`/role updated → navigate to `HOME-2`.
- **Failure:** `checkout/verify` returns `{error}` → show retry, no partial activation (verified server-side by signature check before any state mutation).

### EY-15 — Renew Membership
- 🆕 new screen, same shape as `EY-13` but entry is from `HOME-4`'s inactive state, pre-selecting the prior plan. Same payment flow as `EY-14`.

### EY-16 — Cancel Membership
- ✅ backend ready (`POST /api/billing/cancel`).
- **Shows:** current plan summary, cancel confirmation copy ("Access continues until {renewalDate}"), reason field (optional, matches the API's `reason` body param).
- **Actions:** Confirm Cancel → `POST /api/billing/cancel {intent:'cancel'}` → on success, show "Cancelled — active until {renewalDate}," return to `PROF-2`/`HOME-2` (still active-looking until the cycle actually ends, matching `status:CANCELLED, recurring:false` while the member keeps attending).
- **Store-billed subscriptions** (`storeManaged:true` response) → show "Manage in the App Store/Play Store" with a deep link (`manageUrl`) instead of an in-app cancel action.

---

## 6. Yoga Therapy

### THER-1 — Yoga Therapy info (non-member)
- 🆕 new marketing/info screen. **Shows:** explanation, pricing (₹5,000 / $120 per vision — reconcile against current `Plan` data), "no free trial for Therapy" messaging, testimonials.
- **Actions:** Begin Yoga Therapy Assessment → `THER-2`.

### THER-2 — Intake wizard (5 steps)
- ✅ backend ready (`POST /api/therapy/intake` for incremental saves), web equivalent
  already built (`src/app/yoga-therapy/intake/page.tsx`) — mobile should call the same API
  rather than re-derive the step structure, per `MOBILE_APP_PLAN.md` Phase 1.
- **Steps:** Personal details → Your concern → Medical history → Consent → Review (matches `TherapyIntake` fields: fullName/age/gender/height/weight → primaryConcern/concernDuration/concernDescription → injuriesSurgeries/medicalConditions/medications/familyHistory/priorYogaTherapy → consentGiven → review-everything).
- **Progress indicator:** "Step N of 5" + a filled-bar visual.
- **States:** each step autosaves via `POST /api/therapy/intake` (partial body) so the user can resume a `DRAFT` later — confirm the route accepts partial payloads (research pass noted "partial/full draft save," ✅).
- **Actions:** Back/Next per step (client-side only, no backend call until autosave); on the final Review step, **Submit** → `POST /api/therapy/intake/submit` (✅, no body) → locks the intake (`DRAFT/SUBMITTED → SUBMITTED`) → `THER-3`.
- **Edit before submit:** allowed while `DRAFT`/`SUBMITTED` and not yet `UNDER_REVIEW` — once a therapist opens it (`UNDER_REVIEW`), the intake is locked; the app should hide the edit affordance once status is `UNDER_REVIEW` or later.

### THER-3 — Assessment submitted confirmation
- ✅ ready. **Shows:** in-app confirmation ("Assessment Submitted") immediately on `THER-2`'s submit response, plus a push notification fired server-side (confirm the submit route actually triggers one — not explicitly confirmed by this research pass; if it doesn't yet, that's a small gap to add alongside `G7`).

### THER-4 — Assessment status
- 🔶 partial — statuses exist but don't map 1:1 to the vision's wording. **Shows:** one of
  Submitted / Under Review / Recommended / Recommended with Conditions (`NOT_RECOMMENDED`
  is never rendered here, per the schema's own comment — this one detail from the vision
  is already correctly enforced server-side via `applicantFacingStatus()`).
  **There is no `CONSULTATION_REQUIRED` status** — if that distinct state is actually
  needed product-wise, it requires adding a new enum value; otherwise treat `UNDER_REVIEW`
  as covering it and adjust the copy shown for that status to read "Under Review /
  Consultation" rather than inventing a status the backend can't produce.
- **Backend:** `GET /api/therapy/intake` (✅) → poll or push-triggered refresh on status change.

### THER-5 — Recommended-with-Conditions detail
- Same screen as `THER-4`, one more state: shows the status label only, explicitly
  **not** the `reviewNotes` field content (per vision: conditions are communicated by the
  team directly, not surfaced in-app) — even though `TherapyIntake.reviewNotes` technically
  holds that text server-side, the app must not render it here. Worth a code-review flag
  once built, since it would be an easy accidental leak (`reviewNotes` sitting right next
  to `status` in the same API response).

### THER-6 — Therapy payment
- ✅ backend ready, same Razorpay pattern as `EY-14`. **Trigger:** status becomes
  `RECOMMENDED` → payment CTA unlocks automatically (no manual "request payment" step
  needed — confirm the client just needs to check `status === 'RECOMMENDED'` to reveal
  this). **No trial** — this screen has no free/skip path, matching `Booking`'s rule that
  `MEMBER_EVERYDAY`/non-therapy roles can't book therapy sessions, and trial-role gets
  "one free consultation" only via `Booking`, not a full 20-session unlock.
- **24h payment reminder:** 🆕 needs a cron check (`RECOMMENDED` + unpaid + 24h elapsed →
  one push, no repeats) — no existing job covers this; would extend `src/app/api/cron/*`.

### THER-7 — My Therapy Schedule
- ✅ backend ready (`GET /api/bookings`). **Shows:** all scheduled sessions
  (date/time/therapist/join), explicitly **no self-booking action** anywhere on this
  screen — matches the vision ("patient does not self-book; all 20 sessions are centrally
  scheduled") and matches the actual `Booking` model, where a member calling `POST
  /api/bookings` themselves *is* technically possible per the route's permission check —
  confirm whether member-initiated booking creation should be hidden/blocked client-side
  for `MEMBER_THERAPY` users who already have an active plan, since the API doesn't seem
  to distinguish "your first consultation" from "self-booking session #6."

### THER-8 — Session detail / Join
- 🔶 partial, same Join-window pattern as `EY-4` but on `Booking` (15 min before / 60 min
  after per the researched route, vs. the vision's "30 min before" — reconcile before
  building the countdown UI).
- **Reschedule action:** per `G3`, today's `PATCH /api/bookings/[id]` is a same-day-or-not
  agnostic raw overwrite with a ≥24h rule for non-staff — this is **backwards** from the
  vision's "same-day only" rule. Do not build the reschedule button assuming same-day
  support exists; either the API needs a same-day exception added, or the product
  requirement needs revisiting. Flag before writing client code that would silently fail
  or behave opposite to spec.
- **No push / no 10-min reminder for rescheduled sessions:** achievable purely client-side
  (skip scheduling a local/push reminder for a session whose `updatedAt` moved same-day) —
  no backend gap here, just an implementation note.

### THER-9 — Substitute therapist notice
- 🆕 blocked on `G4`. Until a reassignment field exists, the app has no way to show "your
  therapist was substituted" or reveal the new name only on join — `Booking.teacherId` is
  fixed, so today whatever teacher was originally booked is what the app will always show.

### THER-10 — My Therapy Journey
- 🆕 mostly new, blocked on `G5`/`G6` for the interesting parts. **Shows (buildable
  today):** sessions completed/remaining (derivable from `Booking` rows + `User.credits`),
  attendance history (`Booking.status = COMPLETED` list). **Shows (blocked):** progress
  charts (`G5`), patient-submitted updates history (`G6`), therapist recommendations
  (could reuse `TherapyIntake.reviewNotes`, but that's a single field, not a running log —
  confirm whether a running log or a single "current recommendation" is actually needed).

### THER-11 — Progress charts
- 🆕 fully blocked on `G5` — no measurement model exists. Do not start UI work here until
  a `TherapyMeasurement`-style table (metric name, value, unit, recordedAt, recordedBy) is
  designed; the product vision explicitly wants therapist-chosen metrics per patient, which
  implies a flexible key-value shape rather than fixed columns.

### THER-12 — Submit medical update
- 🆕 blocked on `G6`. **Shows (once built):** free-text + category picker (medication /
  injury / surgery / symptom change / other), submit → goes to therapist/team, explicitly
  **does not** overwrite the original `TherapyIntake` record (per vision: "doesn't silently
  overwrite professional records" — reinforces that this needs its own table, not a PATCH
  onto `TherapyIntake`).

---

## 7. Content & Take a Moment

### CONT-1 — Content Library (browse)
- ✅ backend ready (`GET /api/content/feed`, cursor-paginated, filterable by
  `type`/`category`). **Shows:** grid/list of `Content` + `BlogPost` items, filter chips by
  `ContentCategory`. **Available to everyone** (session optional).

### CONT-2 — Take a Moment strip
- ✅ backend ready as a filtered view of the same feed — no separate model needed;
  "Take a Moment" is a **presentation concept**, not a schema concept: filter
  `ContentCategory ∈ {BREATHING, MINDFULNESS}` (or similar) and short `durationMin` on
  related `Practice` items. Confirm with content/product whether a dedicated tag is worth
  adding for precise curation vs. relying on category + duration heuristics.
- **Shows:** horizontally-scrolling cards — "2-minute breathing," "5-minute desk reset,"
  etc. — each opening `CONT-3` or a `Practice`-specific player.
- Rendered on `HOME-1`/`HOME-2`/`HOME-5` alike, and standalone reachable from the tab bar's
  existing "Practice" tab (✅ built, `(tabs)/practice.tsx`).

### CONT-3 — Content detail
- ✅ backend ready (`GET /api/content/[id]`). **Shows:** video/audio player, article body,
  or meditation player depending on `Content.type`, plus like/save/share/comment/ask
  buttons (`CONT-4`).
- **View tracking:** `POST /api/content/[id]/view` (✅, no auth) fires on open.

### CONT-4 — Content interactions
- 🔶 mostly ready. Like (`POST/DELETE .../like`, ✅) and Save (`POST/DELETE .../save`, ✅)
  both work. **Share** → native share sheet with a deep link — the recipient-side "public
  preview" page is `G14` (website work, not mobile). **Comment/Ask a question** → `POST`
  to `ContentComment` (route not explicitly confirmed in this research pass under
  `content/[id]` — verify a comment-creation endpoint exists before building the compose
  UI; `ContentComment`/`CommentReport` models exist, so a route is likely present but
  wasn't in the list checked). **Mark helpful** → blocked on `G10` (no `"helpful"` kind
  today; reuse `like` as an interim proxy if a distinct action is not worth the schema
  change).

### CONT-5 — Ask a question (modal)
- Same backend as `CONT-4`'s comment action — routed internally to the admin content team
  (matches vision: "students don't follow individual teachers," there's no per-teacher
  inbox, just a shared content-team queue — confirm whether comments feed into
  `SupportConversation` or stay purely as `ContentComment` moderation; the vision implies
  the former ("internal admin/content team handles it") but the schema suggests the latter
  (comments are their own model, unrelated to Support). Pick one before building — routing
  a "question" comment into two different systems would be confusing to triage.

### CONT-6 — Content attribution
- No screen — a display rule: regardless of actual author, `Content.author` field is
  always rendered (defaults to `"Shakti Yoga"` in the schema; confirm the actual displayed
  value is literally `"Acharya Swastik"` per the vision, or whether `author` needs to be
  set per-item to that name specifically — currently it's a free-text field so this is a
  content-authoring convention, not a code change).

### CONT-7 — Shared content public preview
- 🆕 **website** surface, not mobile (`G14`). Listed here only for completeness since the
  mobile Share action is what triggers it.

### CONT-8 — Downloads toggle
- See [§20 Downloads / offline](#20-downloads--offline).

---

## 8. Notifications & announcements

### NOTIF-1 — Notification inbox
- 🆕 blocked on `G7`. **Shows (once built):** flat chronological list (explicitly no
  categories per vision), auto-marks-read on open (no manual read/unread toggle), app-icon
  unread badge. **Cannot be built today** — push is fire-and-forget with no persisted log;
  needs a `Notification` table (`userId`, `type`, `title`, `body`, `deepLink`, `readAt`,
  `createdAt`) written alongside every `sendPush()` call, plus a `GET
  /api/notifications`/`PATCH .../read` pair.

### NOTIF-2 — Announcement banner
- 🔶 partial — `Content.type = ANNOUNCEMENT` + `pinned` exists and is enough for a basic
  "there's an announcement" banner (`HOME-2` already references this). Audience targeting,
  explicit expiry, and an "important" flag distinct from `pinned` are blocked on `G8`.
- **Dismiss:** per-device local dismissal is buildable today (`AsyncStorage` set of
  dismissed content IDs); a cross-device "I've seen this" state would need a new
  `ContentInteraction` kind or dedicated table — confirm which is actually required before
  choosing local-only vs. server-tracked dismissal.

### NOTIF-3 — Notification types (reference table, no screen)
Matches the vision's list exactly in intent; each needs `G7` plus, per type, whatever
trigger already exists or needs adding: class reminder/cancellation/teacher-or-time-change
(new cron/hook), assessment status (exists as an event, needs `G7` to persist), payment/
renewal (exists via checkout/billing routes, needs `G7`), content (exists via
`notifyOnPublish`, needs `G7`), announcements (`G8`), support responses (exists in
`support/[id]/messages`, needs `G7`), family membership changes (exists in family logic,
needs `G7`), event information (new).

---

## 9. Support

### SUPP-1 — Support conversation
- ✅ backend ready (`GET/POST /api/support`, `POST /api/support/[id]/messages`).
- **Shows:** chat-style thread, single free-text compose box, **no category picker**
  (matches vision exactly — the route has no `category` field, so this was never a
  possibility to accidentally build in). If `GET /api/support` returns an existing `OPEN`
  conversation, resume it; if the most recent one is `CLOSED`, show it read-only with a
  "Start New Conversation" CTA (`POST /api/support`, which itself 409s if one is already
  open — client should never let a user hit that 409 by hiding "start new" while one is open).
- **Closed state:** per vision and per the schema (no member-facing close route found),
  **only staff can close** — do not build a "close conversation" button for the member.
  Once closed, the compose box is hidden/disabled and only "Start New Conversation" shows.
- **Attachments/priority/rating:** intentionally absent, matches vision ("No: Priority
  system, Support rating, Attachments, Ticket status shown to student").

---

## 10. FAQ

### FAQ-1 — FAQ list
- ✅ backend ready (`GET /api/content/faqs`, same data the website uses). **Shows:** flat
  Q&A list, English only, text only, no categories, no search (matches vision exactly —
  `FAQ.category` exists in the schema but the vision explicitly says "no categories" for
  the member-facing view, so render as a flat list regardless of the underlying field).

---

## 11. Testimonials

### TESTI-1 — Testimonials list
- ✅ backend ready (`GET /api/content/testimonials`, wraps `Story`). **Shows:** rating,
  quote, name, optional location/country, photo.

### TESTI-2 — Submit testimonial
- 🔶 partial — `Story` model supports the fields needed (rating, quote, authorName,
  imageUrl), but a member-facing **create** endpoint for `Story` wasn't confirmed in this
  research pass (the website's testimonials page may only read, not write) — verify a
  `POST` route exists or needs building before this screen can submit anything.
- **Approval gate:** ✅ matches vision — `Story.status` (a `ContentStatus`) implies
  draft/published gating already exists; admin must move it to `PUBLISHED`.
- **Edit/delete request:** 🆕 — vision wants "student can later request edit/delete,
  admin must approve" — no such request-queue exists for `Story` today; would need either
  reusing `CorporateLeadActivity`-style activity log pattern or a simple new field/table.

---

## 12. Family

### FAM-1 — Family Membership management (owner view)
- ✅ backend ready (`GET /api/family` via `familyView()`). **Shows:** invite code, seats
  used/total, member list (name + owner flag). **Primary member's visibility limits**
  (matches vision exactly): only `status`/`program`/`payment status`/`renewal-or-cancel
  status` are in the `familyView()` response shape — no attendance, progress, or therapist
  notes are exposed, so the schema-level privacy boundary described in the vision is
  already correctly enforced by what the API returns, not by client-side filtering (good —
  means there's no way to accidentally leak it even with a buggy screen).

### FAM-2 — Add/invite family member
- ✅ backend ready. **Shows:** shareable invite code/link (from `FAM-1`'s `code`), no
  in-app "send invite to email" mechanism confirmed — likely just share-sheet on the code/link.

### FAM-3 — Join family (invitee side)
- ✅ backend ready (`POST /api/family/join {code}`, rate-limited 8/hr). **Entry:** either
  during `AUTH-3` (referral-code-style field) or from `PROF-*` after the fact. **Shows:**
  code entry, confirmation of whose family they're joining (owner name from response),
  then proceeds to their own independent plan choice (`EY-1`/`THER-1`) — matches vision
  ("gets their own account and chooses independently").

### FAM-4 — Family payment stop
- 🔶 mostly a `EY-16`/billing-cancel variant from the owner's side against a dependent's
  `Subscription` row — confirm `billing/cancel` accepts acting-on-behalf-of a
  `familyOwnerId`-linked subscription, or whether this needs a distinct admin-mediated
  flow. Push notification to the affected family member on stop → depends on `G7` for a
  persisted inbox entry, but the fire-and-forget push itself is likely already buildable.

---

## 13. Refer & Earn

### REFER-1 — Refer & Earn
- ✅ backend ready (`GET /api/referral`, ✅ built on mobile as `refer.tsx`). **Shows:** own
  code, shareable link (prebuilt message string from the API), referral stats
  (signed-up/converted counts — confirm exact shape matches whatever `refer.tsx` already
  renders).
- **Reward amounts:** per vision, exact class-credit/discount amounts are **TBD** —
  `Referral.rewardMonths` (default 1) and `User.referralCreditDays` are the mechanisms
  already in place; confirm current default values match whatever business decision is
  eventually made, rather than assuming the schema defaults are final.

---

## 14. Membership card

### CARD-1 — Digital Membership Card
- 🔶 likely buildable with no new backend (`G11`) — a pure composed view from data already
  available: `User.name`/`avatarUrl`/`createdAt` ("member since"), `Subscription.planType`/
  `status`/`renewalDate` ("current cycle"). **QR code:** encode a verification
  payload client-side (e.g. a signed short-lived token or simply the user's id +
  a staff-side lookup) — no existing "membership QR" concept in the schema, so the exact
  payload format is a build-time decision, not a data-model gap. **Staff-only QR use:**
  enforced by whatever the *staff-facing* scanner app/screen checks — out of scope here,
  but note that the member app itself needs no special permission gate, just a
  render-only screen.

---

## 15. Certificates

### CERT-1 — My Certificates
- ✅ backend ready (`GET /api/certificates`, only the caller's `APPROVED` rows).

### CERT-2 — Certificate detail / download
- ✅ backend ready (`GET /api/certificates/[id]/download` returns a PDF directly).
- **QR:** generate client-side from `verificationCode` (see `G13` — no gap, this is by
  design) encoding something like `https://shaktiyoga.in/certificates/verify/{code}`.
- **Share externally:** native share sheet on the downloaded PDF — fine since certificates
  (unlike downloaded content, `G15`) are meant to be shareable/verifiable outside the app.

### CERT-3 — Certificate verification
- This is what the **shared/scanned QR** opens — per the schema comment, `GET
  /api/certificates/verify/[code]` requires a session, matching the vision's "verification
  requires a Shakti account" exactly. If the scanner is someone without the app/account,
  they hit a login wall first — confirm that's the intended UX (vs., say, a public
  verify page that only shows pass/fail without needing login) before building the
  landing screen for a scanned QR.

---

## 16. Workshops, Events & Retreats

### EVT-1 — Workshops & Events / Retreats list
- ✅ backend ready (`GET /api/retreats?kind=`, covers all three `RetreatKind` values in one
  model). **Shows:** two visually distinct sections (Workshops & Events vs. Retreats) or a
  filter toggle, both reading from the same endpoint with a `kind` filter.

### EVT-2 — Detail / Enquire
- ✅ backend ready (`GET /api/retreats/[id]`, `POST /api/retreats/[id]/enquire`).
- **No self-service booking/payment** — matches vision exactly; the enquire form is the
  only action, `RetreatEnquiry.status` progresses via admin (`NEW → CONTACTED → CONFIRMED →
  PAID`), all off-app.

---

## 17. Contact & Centre

### CONTACT-1 — Contact & Centre
- 🆕 simple static/semi-static screen — centre address, phone, WhatsApp deep link, social
  links, website link. No dedicated API needed beyond maybe reusing `GET
  /api/content/why-us` or hardcoding, consistent with how the website's Footer already
  presents this information (`src/components/Footer.tsx`).

---

## 18. Profile & settings

### PROF-1 — Profile
- ✅ built (`profile.tsx`). **Shows:** name, photo, email (read-only — vision: "email
  changes are admin-controlled"), phone, DOB, address, logout.
- **Actions:** Edit → `PROF-1a` (inline or separate screen) → `PATCH` to the profile route
  (confirm exact path/fields per `AUTH-4`'s caveat). Logout → clear token (`setToken(null)`) → `AUTH-1`.

### PROF-2 — Membership
- ✅ built (`membership.tsx`), backed by `GET /api/billing`. Links out to `EY-16`
  (cancel), `EY-13`/`EY-15` (change/renew plan — vision notes "Change Plan opens the web
  pricing page in-browser, no native checkout," per `MOBILE_APP_PLAN.md` — that's still
  the pragmatic interim choice pending the `EY-14` native-checkout decision).

### PROF-3 — Account security
- 🔶 partial. **Shows:** change password, reset password (web-route handoff or new mobile
  route), biometric toggle (client-side, `expo-local-authentication`, no backend), logout,
  **log out all other devices** — 🆕 needs a session-invalidation mechanism; `User.tokenVersion`
  exists in the schema and is exactly the field this would bump (invalidating all
  previously-issued JWTs at once) — confirm a route exists to trigger that bump, or it's a
  small new one (`POST /api/auth/logout-all` incrementing `tokenVersion`).
- **No 2FA, no inactivity timeout, no device list** — matches vision, i.e. nothing to build here beyond what's listed.

### PROF-4 — Consent & Permissions
- 🆕 new screen — OS-level permission toggles (notifications, camera, microphone, calendar,
  biometric), each just deep-linking to system settings or triggering the native permission
  prompt; no backend involvement except `push/register`/`unregister` (✅) for the
  notifications toggle specifically.

### PROF-5 — Delete Account
- 🔶 partial. **Shows:** strong warning copy, confirm. **Backend:** no delete-account route
  was confirmed in this research pass — likely doesn't exist yet (`MOBILE_APP_PLAN.md`
  already flagged this: "Delete account is a support-contact message, not self-service, no
  backend endpoint"). Until a real endpoint exists, this screen should route to `SUPP-1`
  with a pre-filled "please delete my account" message rather than presenting a fake
  self-service action.
- **No repeat trial after delete-and-recreate:** needs the eventual delete flow to either
  keep a tombstone keyed by email/device, or check `trialStartedAt`-equivalent history
  against something more durable than the (about to be deleted) `User` row — a real design
  question for whoever builds the delete endpoint, not just a UI concern.

---

## 19. Calendar

### CAL-1 — In-app Calendar
- 🔶 partial — no dedicated calendar endpoint, but every data source already exists
  individually: `GET /api/classes` (Everyday sessions), `GET /api/bookings` (Therapy
  sessions), `GET /api/retreats` (events). Aggregating them client-side into one calendar
  view is buildable today without new backend; "Holidays/Cancellations" specifically would
  need `ClassInstance.status = 'Cancelled'` instances to actually be returned by `GET
  /api/classes` (confirm cancelled instances aren't filtered out server-side, or the
  calendar will just show gaps with no explanation).
- **Add to device calendar:** `expo-calendar`, fully client-side, no backend.

---

## 20. Downloads / offline

### DL-1 — Downloads
- 🆕 blocked on `G9` (no per-item downloadable flag) and constrained by `G15` (downloaded
  files must stay inside the app's own storage/player, never exposed to the OS
  share-sheet/Files app — an app-architecture decision: use `expo-file-system` with app
  sandbox storage and a custom in-app player, not the OS media library). **Shows (once
  buildable):** downloaded items list, storage used, remove-download action.
- **Permanence:** vision says downloads "remain available permanently" — confirm this
  doesn't conflict with `Subscription` inactivity (e.g., does a cancelled Everyday member
  keep previously-downloaded content forever, per `HOME-4`'s "previously downloaded
  content" bullet? If so, downloads should not be revoked on membership lapse, which is a
  deliberate product decision worth stating explicitly in whatever ships this, since it's
  easy to accidentally wire download-eligibility to an active-subscription check.

---

## 21. Cross-cutting system behavior

- **Dark mode** — follows OS theme only (`Appearance` API), no in-app toggle. No backend involvement.
- **Multi-device sync** — all state lives server-side and is fetched fresh per screen;
  the only device-local state is the auth token itself and (once built) downloaded files
  (`DL-1`) and notification-dismissal state (`NOTIF-2`, until/unless server-tracked).
- **Offline requirement matrix** — Live classes, attendance/check-in, Support, messaging,
  and "real-time data" all require connectivity (matches vision); only downloaded content
  (`DL-1`) and previously-fetched read-only screens (via whatever caching layer the app's
  data layer uses, e.g. React Query) can work fully offline.
- **Push registration lifecycle** — register on login/foreground (`POST
  /api/push/register`, ✅), unregister on logout (`POST /api/push/unregister`, ✅) — confirm
  `AUTH-1`'s logout action actually calls unregister today; not confirmed in this research
  pass and easy to silently miss.
