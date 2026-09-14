# Shakti Yoga Kendra — Mobile App

Expo (SDK 57) + expo-router app for the daily student experience: discover a class,
check in, join it on Google Meet, track sessions and progress. It is **not** a video
platform — live classes happen on Google Meet; the app handles everything around that.

It talks to the **same backend** as the website (`..` — the Next.js app at the repo
root) over REST, authenticating with `Authorization: Bearer <token>` instead of a
cookie (`src/app/api/auth/mobile/login` and `/register` already exist for this).

## Status (built 2026-09-10)

This app was scaffolded and coded in an environment with **no Node.js installed** —
nothing here has been run, installed, or type-checked. Treat it as a solid first draft,
not a verified build. Before relying on it:

```bash
cd mobile
npx expo install   # corrects any dependency versions I guessed wrong for SDK 57
npx tsc --noEmit    # or `npm run lint` — this repo has never been type-checked
npx expo start      # Expo Go should work — no native modules are used yet
```

**Since the in-app-purchases scaffold landed, `npx expo start` + Expo Go is no
longer enough** — `react-native-purchases` is a native module. Use a custom dev
client instead: `npx expo run:ios` / `npx expo run:android`, or an EAS
development build (`eas build --profile development`).

Set `EXPO_PUBLIC_API_URL` in a `.env` file (or `app.json` `extra`) if testing against
`next dev` locally instead of `https://shaktiyoga.in`.

**Replace the placeholder assets** in `assets/` (`icon.png`, `splash.png`,
`adaptive-icon.png`, `favicon.png`, `notification-icon.png`) — they're 1×1 pixel
placeholders right now, just enough for `app.json` to point at a real file.

### What's built
- Auth: welcome / login / signup against `/api/auth/mobile/*`, bearer token persisted
  in `AsyncStorage`, session restored via `/api/auth/me` on launch, reactive
  login/logout redirect (`app/_layout.tsx`'s `AuthGate`).
- Tabs: **Home · Classes · Practice · Progress · More**.
  - Home branches by role: Everyday/Trial members see the next joinable class;
    Therapy members see their next 1:1 booking; everyone else sees an explore CTA.
  - Classes: today's timetable + upcoming, join a class (`POST /api/classes/[id]/join`)
    which check-in-records attendance and opens the Meet link in the system browser.
  - Practice: `GET /api/practices` list.
  - Progress: `GET /api/progress` (sessions remaining, weekly attendance bars, streak).
  - More → Membership (`/api/billing`), Refer & Earn (`/api/referral`), Family
    (`/api/family`, `/api/family/join`), Profile, Support (opens WhatsApp).
- Design system: `src/components/ui.tsx` (Screen, Card, Button, Badge, Heading,
  BodyText, EmptyState, LoadingView) using the same brand palette as the website
  (`tailwind.config.ts` — forest green `#4A6741` / terracotta `#C68E5D` / sand
  `#FDFCF8`).
- **In-app purchases (scaffolded, not yet sellable):** `src/lib/purchases.ts`
  wraps `react-native-purchases`; `AuthContext` keeps RevenueCat's `app_user_id`
  in sync with login/logout; `app/subscribe.tsx` lists the dashboard's current
  Offering and drives a purchase, polling `/api/billing` for the webhook
  (`/api/webhooks/revenuecat`, already existed server-side) to land before
  continuing. **Three things still need to happen outside this codebase before
  this can actually sell a subscription:**
  1. Create the products in App Store Connect and Google Play Console with
     these exact identifiers (already defined server-side in
     `src/lib/pricing.ts`'s `rcProductId`): `sy_starter_monthly`,
     `sy_everyday_monthly`, `sy_everyday_annual`, `sy_therapy_monthly`,
     `sy_therapy_annual`, `sy_family_monthly`, `sy_family_annual`.
  2. Configure a RevenueCat Offering pointing at those products, and set
     `EXPO_PUBLIC_REVENUECAT_IOS_KEY` / `EXPO_PUBLIC_REVENUECAT_ANDROID_KEY`
     in `.env` from RevenueCat's dashboard.
  3. Run a sandbox purchase test on a real device (build with a dev client,
     see above — this can't be verified from this environment at all).
  Until all three are done, `subscribe.tsx` shows an honest "not set up yet"
  state with a link to the web checkout instead of pretending to work.

### What's deliberately NOT built yet — see `../MOBILE_APP_PLAN.md`
Yoga Therapy assessment/intake (the web already has this at `/yoga-therapy/intake` —
mobile should deep-link to it or reuse the same API once decided), push notifications
(the `/api/push/register` endpoint exists server-side; no client registration yet),
offline content, digital membership card / QR, certificates, corporate/retreats/events,
founder messages, and same-day therapy rescheduling. All of these need either new
backend endpoints or a native-module decision before mobile work continues — see the
plan doc for specifics.

### Known gaps in what IS built
- "Change Plan" / "Renew Membership" opens `shaktiyoga.in/programs` in the system
  browser rather than checking out natively — the website's session is
  cookie-based and separate from the app's bearer token, so a user would need to log
  in again there (a separate fix adds a one-time sign-in handoff for this). The real
  fix is finishing the in-app-purchases scaffold above so paid plans never need the
  web checkout on mobile at all.
- "Delete Account" just explains that it requires contacting support — no
  self-service delete endpoint exists in the backend yet.
- Therapy session credits are still debited at **booking time** (existing
  `POST /api/bookings` behavior), not at attendance-verification time the way group
  classes work (`POST /api/classes/[id]/join` records a check-in; the actual credit
  deduction happens elsewhere when a teacher finalizes attendance). The pasted flow
  spec describes therapy working the second way — that would need a backend change,
  not just a mobile one.
