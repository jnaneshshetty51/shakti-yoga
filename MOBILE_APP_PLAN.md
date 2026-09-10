# Mobile App — Plan

Companion to `WEBSITE_ARCHITECTURE_PLAN.md` and the PRD/Vision/Programs docx suite. This
covers the **Expo mobile app** at `mobile/` — the student's daily operating space
(discover a class → check in → join on Google Meet → track progress), as distinct from
the website's `Discover → Trust → Understand → Decide → Join` job.

**Backstory:** `CONTENT_PLATFORM_PLAN.md` describes mobile work ("Phases 1–5") in detail,
but that code was never found — not in this repo's git history, not on this machine, not
in any of the account's 60 GitHub repos (checked). It either lived only on another
machine and was never pushed, or was written up without ever being committed. Either way,
`mobile/` was built from scratch on 2026-09-10 against the backend APIs that already
exist (which were themselves clearly built with a mobile client in mind — bearer-token
auth, a `/api/push/register` endpoint, RevenueCat webhook handling — so the backend side
of that lost work is very much still here).

---

## STATUS — 2026-09-10

Built this session, entirely untested (no Node.js in this environment — see
`mobile/README.md` for the exact verification steps to run before trusting it):

| Area | Status | Notes |
|---|---|---|
| Auth (login/signup/session restore) | ✅ built | `/api/auth/mobile/*` + `/api/auth/me`, token in AsyncStorage. |
| Main nav (Home · Classes · Practice · Progress · More) | ✅ built | Matches the proposal's section 5. |
| Everyday Yoga home (next class, join) | ✅ built | `/api/classes`, `/api/classes/[id]/join`. |
| Yoga Therapy home (next session, join) | ✅ built | `/api/bookings`, `/api/bookings/[id]`. Lighter than Everyday — no charts yet. |
| Classes timetable (today/upcoming) | ✅ built | Same `/api/classes` payload as Home. |
| Practice list | ✅ built | `/api/practices` — list only, no like/save/comment (that's mobile-app-only per `CONTENT_PLATFORM_PLAN.md`, not rebuilt here — see Phase 1 below). |
| Progress (sessions, weekly bars, streak) | ✅ built | `/api/progress`. |
| Membership | ✅ built (view-only) | `/api/billing`. "Change Plan" opens the web pricing page in-browser — no native checkout. |
| Refer & Earn | ✅ built | `/api/referral` — code, link, share, stats. |
| Family (join by code + owner view) | ✅ built | `/api/family`, `/api/family/join`. |
| Profile + logout | ✅ built | Delete account is a support-contact message, not self-service (no backend endpoint). |
| Support | ✅ built (minimal) | Opens WhatsApp — matches what the website already uses. No in-app "Start a Conversation" (no backend for it — see Phase 3). |
| Yoga Therapy assessment/intake | ⬜ not in mobile | Already built on the **web** this session (`/yoga-therapy/intake`, see `WEBSITE_ARCHITECTURE_PLAN.md` Phase B) with its own API (`/api/therapy/intake`). Mobile should call the same API rather than duplicate the flow — Phase 1 below. |
| Push notifications | ⬜ not in mobile | Server-side `/api/push/register` + `notifyContentPublished` already exist (per `CONTENT_PLATFORM_PLAN.md`). Mobile never registers a token. Phase 2. |
| In-app purchases (RevenueCat) | ⬜ not in mobile | Server-side webhook (`/api/webhooks/revenuecat`, `src/lib/revenuecat.ts`) already exists and is live for some other client. `react-native-purchases` is a **native module** — needs a custom EAS dev client, breaks Expo Go. Real scoping decision, see Phase 4. |
| Offline content, digital membership card/QR, certificates | ⬜ not in mobile | No backend for any of these yet either (checked: no certificate/QR model in `prisma/schema.prisma`). New feature, not just a mobile gap. |
| Corporate/Retreats/Events, Founder messages | ⬜ not in mobile | Mirrors the same gaps already logged in `WEBSITE_ARCHITECTURE_PLAN.md` (#12–14, founder page) — content-dependent, not started on web either. |
| Same-day therapy rescheduling, substitute-therapist notice | ⬜ not in mobile | No backend support (`Booking` has no reschedule-request or substitute-teacher concept beyond the existing `PATCH /api/bookings/[id]`, which requires ≥24h notice — the opposite of "same-day"). |

---

## Next phases

### Phase 1 — Wire mobile to what the web already has
- Yoga Therapy assessment: either open `shaktiyoga.in/yoga-therapy/intake` in-browser
  (fast, but same cookie/bearer session mismatch as the Membership screen), or build a
  native form against the already-existing `/api/therapy/intake` API (better, and the
  API is already bearer-token-compatible — no backend work needed, just a mobile screen
  mirroring `src/app/yoga-therapy/intake/page.tsx`'s 5 steps).
- Content engagement (like/save/comment) on Practice items, per `CONTENT_PLATFORM_PLAN.md`
  Phase 2 — backend (`ContentInteraction`) already exists.

### Phase 2 — Push notifications
- `expo-notifications` token registration on login/foreground → `POST /api/push/register`
  (endpoint already exists). Needs an Expo project ID (`app.json` `extra.eas.projectId`,
  set once the app is registered with EAS) and Android notification channel setup.
- Wire the existing server-side triggers (class cancellation, schedule change, content
  publish) to actually reach a registered device — confirm `sendPush`/`PushToken` in
  `src/lib/` fire for these events already, or extend them.

### Phase 3 — Support messaging
- No backend exists for a member-facing "Start a Conversation" thread today (only
  `Lead`/`LeadActivity` for pre-signup leads, and `admin/messages` which is a different
  surface). Needs a new `SupportThread`/`SupportMessage` model + API before mobile can
  build the real "type a message, staff replies" flow the proposal describes.

### Phase 4 — Native checkout decision
- Real subscribe/renew from inside the app requires either:
  (a) RevenueCat + `react-native-purchases`, which means leaving Expo Go for a custom
      EAS dev client (bigger project-structure decision — affects every contributor's
      workflow, not just this feature), or
  (b) a bearer-token-aware web checkout view (open `checkout?plan=X` in an in-app
      browser pre-authenticated via a short-lived link/token the API mints for mobile).
  Recommend deciding this explicitly before building either — it's a one-way door for
  the project's tooling.

### Phase 5 — New product surfaces (mirrors the website plan's gaps)
Digital membership card + QR, certificates, offline content, corporate/retreats/events,
founder messages — none of these have a backend yet. Scope and build the API alongside
whichever surface (web or mobile) needs it first, per `WEBSITE_ARCHITECTURE_PLAN.md`.

---

## Explicitly deferred / open questions

1. **Therapy credit accounting mismatch** — the proposal describes therapy sessions
   being deducted on trainer-verified attendance (same as group classes); the actual
   backend currently debits at booking time (`POST /api/bookings`). Changing this is a
   backend decision with billing implications — flagging it, not fixing it silently.
2. **Stories/testimonials on mobile** — the website has `Story` with admin approval;
   mobile has no testimonials surface yet. Low priority, straightforward when needed.
3. **`react-native-reanimated`/`gesture-handler` versions** — pinned to match the one
   other SDK-57 Expo project on this account (`astrayoga-app`, private) as a known-good
   baseline, since nothing here could be installed or tested. Run `npx expo install`
   before trusting any version number in `mobile/package.json`.
