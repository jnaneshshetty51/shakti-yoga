# Content Platform — Implementation Plan

**Goal:** turn the member app from "classes + testimonials" into a daily yoga + wellness
content platform. Content (Reels, Posts, Blogs, Announcements) keeps members engaged
between classes and routes them back into practice and paid plans.

---

## STATUS — Phases 1–5 built (2026-09-08), not yet migrated/deployed

### Phase 5 — Practices, Challenges, Badges, Community, AI guide (built)

Migration `20260908500000_practice_challenges_community` + `@anthropic-ai/sdk` added.
**Community feed was in-scope per the user despite the earlier "keep social simple" note.**

- **Practices** — `Practice` + `PracticeCompletion` models. `GET /api/practices`,
  `/api/practices/[id]`, `POST …/complete` (one/day, awards badges + advances challenges).
  Admin `/admin/practices`. Content/blog CTAs gain `open_practice` +
  `relatedPracticeId`. Mobile: `/practices` list, `/practice/[id]` (steps, external
  video link, Mark complete).
- **Challenges** — `Challenge` + `ChallengeParticipant`. Progress derived from
  attendance / completions in the window (`src/lib/challenges.ts`), marked complete on
  class-join / practice-complete hooks. `GET /api/challenges`, `POST/DELETE
  …/[id]/join`. Admin `/admin/challenges`. Mobile `/challenges` (join + progress bar,
  no leaderboard).
- **Badges** — catalogue in `src/lib/achievements.ts` (code, not a table) +
  `UserAchievement` ledger. `checkAchievements(userId)` runs after class-join, save,
  comment, practice-complete, challenge-finish. `GET /api/me/achievements`. Mobile
  `/achievements` grid; earned badge surfaces as a toast on practice completion.
- **Community** — `CommunityPost` / `CommunityComment` / `CommunityInteraction` /
  `CommunityReport`, moderated like content comments (auto-hide at 4 post / 3 comment
  reports). Full route tree under `/api/community/*`. Admin: **Community** tab in
  `/admin/content` (hide/unhide/delete posts + reported comments). Mobile `/community`
  feed (text posts, compose, like) + `/community/[id]` (comments, long-press
  report/delete). Reachable from Explore shortcuts + Profile → Library.
- **AI yoga guide** — `src/lib/assistant.ts` (Anthropic SDK, `claude-opus-5`, adaptive
  thinking + low effort, safety system prompt: no medical/injury advice, on-topic
  only, refusal-checked). `GET /api/assistant` (availability) + `POST` (chat,
  30/hr/user). Hidden entirely when `ANTHROPIC_API_KEY` is unset. Mobile `/assistant`
  chat screen, entry card on Home when available.

That's the full "Later" list except **offline content** (skipped — reels are IG links).

---

## STATUS — Phases 1–4 built (2026-09-08), not yet migrated/deployed

### Phase 4 — retention: content push + streak + personalization (built)

- **Schema** — `Content.notifyOnPublish` + `Content.notifiedAt`; migration
  `20260908400000_content_push`.
- **Push on publish** — `notifyContentPublished(id)` (`src/lib/content-notify.ts`) sends
  one push to every member with a device token, the first time a `notifyOnPublish` item
  goes live. Idempotent (`notifiedAt` claim). Fired fire-and-forget from the admin save
  **and** from `publishScheduledContent()`. Reuses the existing `sendPush` /
  `PushToken` infra (the parallel push-notifications work). Deep-link payloads
  (`/reel/:id`, `/post/:id`) are routed by an extended mobile `toAppHref`.
- **Streak** — `GET /api/me/streak` (compact: `currentStreakWeeks`, `classesThisWeek`).
  Home shows a "🔥 N-week streak · M classes this week" card → `/progress`.
- **Personalization** — `/api/content/home` gains `recommended` = the member's
  top like/save category + up to 4 recent items in it (needs ≥2 interactions). Home
  renders it as a "More <category>" rail.
- **Admin** — content form gains a "Push a notification when this publishes" checkbox.

That completes the phased plan. Remaining ideas (challenges, badges, community, offline,
AI assistant, a real Practice video library) are out of scope for this build.

---

## STATUS — Phases 1–3 built (2026-09-08), not yet migrated/deployed

### Phase 3 — blogs first-class + scheduling + calendar (built)

- **Schema** — `BlogPost.ctaType` / `ctaLabel` / `relatedClassBatchId` (loose pointer);
  migration `20260908300000_blog_cta`.
- **Scheduling** — a future `scheduledAt` on Content parks it as a DRAFT;
  `publishScheduledContent()` (`src/lib/content-schedule.ts`) promotes due items.
  `GET /api/cron/publish-scheduled` (CRON_SECRET) + `scripts/publish-scheduled-content.ts`
  + `npm run content:publish-scheduled`. ⚠️ **Needs the VPS cron actually installed** —
  memory says the crontab binary was missing. Until it's wired, scheduled items sit as
  drafts. Cron line: `*/10 * * * * cd /root/shaktiyoga/app && node_modules/.bin/tsx scripts/publish-scheduled-content.ts >> /var/log/shakti-cron.log 2>&1`
- **API** — `serializeBlog` now carries `cta` + `relatedClass`; `/api/content/[id]`
  resolves the related class-batch name for blogs.
- **Admin** — blog form gains CTA type / label + "Pairs with class" select; content form
  gains a **Schedule for** datetime; Content tab gets a **list / calendar** toggle
  (month grid, green = published, amber = scheduled, click an item to edit).
  `EntityFormModal` gained a `datetime-local` field type.
- **Mobile** — blog reader rebuilt: "In this article" TOC (from `##` headings), end
  **Try this practice** CTA block, "Pairs with" related-class card, share button.

Deferred to Phase 4: content push, streaks, personalization, a dedicated **Practice**
content type. Polish: interactive scroll-to-heading in the blog TOC (currently a visual
overview only).

---

## STATUS — Phases 1 & 2 built (2026-09-08), not yet migrated/deployed

### Phase 2 — likes / saves / comments (built)

- **Schema** — `ContentComment` + `CommentReport` models, `Content.commentCount`;
  migration `20260908200000_add_content_comments`.
- **API** — `POST/DELETE /api/content/[id]/like` + `/save`, `POST /api/content/[id]/view`
  (counter, no auth), `GET /api/content/saved?type=`, `GET/POST /api/content/[id]/comments`,
  `DELETE /api/content/[id]/comments/[commentId]` (author or admin),
  `POST …/comments/[commentId]/report` (auto-hides at 3 distinct reporters).
  Admin: `GET/PATCH/DELETE /api/admin/content/comments` (reported-first list, hide/unhide/delete).
- **Admin** — `/admin/content` gains a **Comments** moderation tab.
- **Mobile** — `EngagementBar` (like / comment / save, optimistic) on `ContentCard` +
  reel & post detail; `useEngagement` / `useComments` / `pingContentView` in
  `src/lib/content.ts`. New screens: `comments/[id]` (list + compose + long-press
  report/delete), `saved` (All / Reels / Posts). Profile gains a **Library** section
  (Saved, Success stories). View ping fires on reel/post open. **Therapy stays a tab**
  (per your call) — Saved lives in Profile, not the tab bar.

Deferred to Phase 3+: scheduling cron, blog CTA fields + native reader polish, content
push, personalization, streaks, a dedicated **Practice** content type (for now a reel's
"try this" CTA points at the related class or article).

---

## STATUS — Phase 1 built (2026-09-08), not yet migrated/deployed

Backend + admin + mobile Explore shell are code-complete and typecheck/lint clean on
both projects. **Not yet run:** `prisma migrate deploy` (migration
`20260908000000_add_content_platform`) and a deploy. No content exists yet, so every new
surface renders its empty state until an admin publishes.

Built:

- **Schema** — `Content` + `ContentInteraction` models, `ContentType` / `ContentCategory`
  enums, `BlogPost.relatedContent` back-relation, `MEDIA_PREFIXES += "content"`.
- **API** — `GET /api/content/feed` (merged cursor feed), `/api/content/[id]` (Content or
  blog by id/slug, published only), `/api/content/home` (curated bundle).
  `src/lib/content.ts` = shared serializers + CTA/category helpers.
- **Admin** — `/admin/content` gains a **Content** tab (Reel / Post / Announcement
  sub-forms via 3 create buttons), counts strip, backed by `?type=content` on the existing
  `/api/admin/content` route; image upload `kind=content`. Reels take an Instagram URL +
  uploaded thumbnail (validated `instagram.com/(reel|p|tv)/…`).
- **Mobile** — `Stories` tab → **`Explore`** (segmented For you / Reels / Posts / Articles
  + category chips + infinite scroll); `stories.tsx` moved to a stack route `/stories`,
  linked from Explore. New: `ContentCard`, `CtaBlock`, `Markdownish` (dep-free MD),
  `src/lib/content.ts` (`useFeed`), screens `reel/[id]` (full-screen → opens Instagram),
  `post/[id]`, `blog/[id]` (reader). Home gains "Today's inspiration" + "For you" +
  pinned-announcement sections from `/api/content/home` in their own `useResource`.

Not in Phase 1 (as planned): likes/saves, scheduling, content push, carousels
(`mediaUrls` column exists, admin sets one image), personalization, streaks.

**To ship (P1–P5):** `cd shakti-yoga && npm install` (picks up `@anthropic-ai/sdk`), then
`npx prisma migrate deploy` on the VPS — applies the seven `20260908*` migrations in order
(`add_content_platform`, `add_push_tokens` [parallel work], `add_content_comments`,
`blog_cta`, `content_push`, `practice_challenges_community`) — then deploy web +
build/submit mobile. Optional env: `ANTHROPIC_API_KEY` (AI guide — feature hidden without
it). For scheduled publishing **and** publish-time push, add the
`publish-scheduled-content.ts` cron line (see Phase 3 note); admin-triggered publishes push
without cron.

---

**Decisions locked in for v1:**

| Question | Answer |
| --- | --- |
| Deliverable now | This written plan |
| Primary surface | **Mobile app** (`/mobile`, Expo Go). Web/marketing site untouched. |
| Reels video hosting | **None.** Reels = an Instagram permalink. We upload to Instagram, store the URL + a thumbnail + caption + CTA. Tapping a Reel opens Instagram. |

---

## 1. Where we are today

**Web backend** (`shakti-yoga`, Next.js App Router, Prisma, MinIO private bucket):

- `Story` and `BlogPost` models with `ContentStatus` enum (`DRAFT | PUBLISHED | ARCHIVED`).
- `BlogPost`: `slug`, `title`, `excerpt`, `content` (markdown), `category`, `author`,
  `publishedAt`, `imageUrl`, `metaTitle`, `metaDescription`.
- Admin CMS at [/admin/content](src/app/admin/content/page.tsx) — tabbed (Story / Blog / WhatsApp),
  driven by `EntityFormModal` field defs, backed by [/api/admin/content](src/app/api/admin/content/route.ts)
  (`GET` list, `POST`/`PATCH` upsert by `?type=`, `DELETE`).
- Image upload: [/api/admin/content/image](src/app/api/admin/content/image/route.ts) →
  `uploadFile()` to MinIO → returns `mediaSrc(key)` (`/api/media/<key>`). Served through the
  signed proxy at [/api/media/[...key]](src/app/api/media/[...key]/route.ts). `MEDIA_PREFIXES`
  in [src/lib/storage.ts](src/lib/storage.ts) currently `["avatars","staff","blog","stories"]`.
- Public read APIs: [/api/content/posts](src/app/api/content/posts/route.ts) (published blogs),
  [/api/stories](src/app/api/stories/route.ts).
- Mobile auth: bearer token, `/api/auth/mobile/*`, `requireAdmin()` for admin routes.

**Mobile app** (`mobile`, Expo SDK 57, expo-router, **zero native modules** — Expo Go works):

- Tabs: `Home · Classes · Therapy · Stories · Profile`
  ([app/(tabs)/_layout.tsx](../mobile/app/(tabs)/_layout.tsx)).
- Design system: `Screen`, `Card`, `Text`, `Button`, `Badge`, `Motion` (`Appear`,
  `PressableScale`), `Skeleton`, `States` (`ErrorView`, `EmptyState`), `Toast`, theme
  (light + dark), Fraunces + Inter fonts.
- Data: `useResource(fetcher, deps)` hook + `api.get/post/upload` in
  [src/lib/api.ts](../mobile/src/lib/api.ts). `mediaUrl()` resolves media keys.
- Notifications: **local only** — 15-min class reminders, no push token
  ([src/lib/notifications.ts](../mobile/src/lib/notifications.ts)).
- `expo-web-browser` already used to open Meet links; `Linking` used for WhatsApp.

**Constraints:**

- Keep Expo Go working → **no new native modules**. Instagram opens via `Linking` /
  `expo-web-browser`, not an embedded player.
- Public marketing site must not regress — `BlogPost` stays the source of truth for the
  website. We extend it, we don't replace it.

---

## 2. Data model

### Approach: one new `Content` model for Reel / Post / Announcement; `BlogPost` stays

`BlogPost` already has slug + SEO + markdown and the public site depends on it. Folding it
into a generic model is high-risk for low gain. Instead:

- **New `Content` model** covers the feed-native types: `REEL`, `POST`, `ANNOUNCEMENT`.
- **`BlogPost`** keeps its identity, gains the shared "connect to practice" fields.
- A single read API (`/api/content/feed`) merges both into one typed stream for the app.

### `prisma/schema.prisma`

```prisma
enum ContentType {
  REEL
  POST
  ANNOUNCEMENT
}

enum ContentCategory {
  YOGA
  BREATHING
  MINDFULNESS
  MOBILITY
  SLEEP
  STRENGTH
  WELLNESS
  BEGINNERS
  PHILOSOPHY
  STUDIO        // announcements, schedule changes
  COMMUNITY     // member wins, events
}

model Content {
  id          String        @id @default(cuid())
  type        ContentType
  status      ContentStatus @default(DRAFT)
  category    ContentCategory

  title       String
  body        String?       // POST / ANNOUNCEMENT copy (markdown-lite). null for REEL.
  caption     String?       // REEL one-liner shown under the thumbnail

  // REEL
  instagramUrl String?      // https://www.instagram.com/reel/XXXX/
  // POST carousel + REEL thumbnail + ANNOUNCEMENT hero
  mediaKeys    String[]     @default([])  // MinIO keys via /api/media proxy
  thumbnailKey String?

  // "Don't let content be a dead end" — CTA
  ctaType     String?       // 'join_next_class' | 'view_classes' | 'book_therapy' | 'open_blog' | 'none'
  ctaLabel    String?
  relatedBlogId String?
  relatedBlog   BlogPost?   @relation(fields: [relatedBlogId], references: [id], onDelete: SetNull)

  author      String        @default("Shakti Yoga")
  tags        String[]      @default([])

  publishedAt DateTime?
  scheduledAt DateTime?     // future -> a cron flips DRAFT/SCHEDULED to PUBLISHED
  pinned      Boolean       @default(false)

  likeCount   Int           @default(0)
  saveCount   Int           @default(0)

  createdAt   DateTime      @default(now())
  updatedAt   DateTime      @updatedAt

  interactions ContentInteraction[]

  @@index([status, type, publishedAt])
  @@index([status, category])
  @@index([scheduledAt])
}

model BlogPost {
  // ...existing fields unchanged...
  ctaType       String?
  ctaLabel      String?
  relatedClassBatchId String?
  readMinutes   Int?         // computed on save
  contentLinks  Content[]
  interactions  ContentInteraction[]
}

model ContentInteraction {
  id         String   @id @default(cuid())
  userId     String
  user       User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  contentId  String?
  content    Content? @relation(fields: [contentId], references: [id], onDelete: Cascade)
  blogId     String?
  blog       BlogPost? @relation(fields: [blogId], references: [id], onDelete: Cascade)
  kind       String   // 'like' | 'save' | 'view'
  createdAt  DateTime @default(now())

  @@unique([userId, contentId, kind])
  @@unique([userId, blogId, kind])
  @@index([userId, kind])
}
```

- `mediaKeys` as `String[]` needs Postgres (already in use).
- Add `"content"` (and optionally `"reels"`) to `MEDIA_PREFIXES` in `src/lib/storage.ts`.
- Two migrations: (1) `Content` + `ContentInteraction` + enums, (2) `BlogPost` additive columns.
  Both additive → safe to deploy without downtime.

---

## 3. Backend API (Next.js)

### Public / member (bearer or session)

| Route | Purpose |
| --- | --- |
| `GET /api/content/feed?cursor=&type=&category=` | Merged, paginated stream of published `Content` + `BlogPost`, newest first, `pinned` first. Returns a discriminated union (`{ kind: 'reel' \| 'post' \| 'announcement' \| 'blog', ... }`). Annotates `liked` / `saved` for the caller. |
| `GET /api/content/[id]` | Single item (blog body, post detail). |
| `GET /api/content/home` | Small curated bundle for the Home screen: 1 featured reel, 1 recommended blog, latest post, latest announcement. Pure server-side selection for v1 (pinned > newest), no ML. |
| `POST /api/content/[id]/like` / `DELETE` | Toggle. Updates `likeCount` + `ContentInteraction`. |
| `POST /api/content/[id]/save` / `DELETE` | Toggle. |
| `GET /api/content/saved` | The caller's saved items (for a "Saved" list in Profile). |
| `POST /api/content/[id]/view` | Fire-and-forget view ping (feeds future personalization + admin analytics). Debounced client-side. |

Notes:
- Reuse the `revalidate`/fallback pattern already in `/api/content/posts`.
- `ctaType: 'join_next_class'` resolves on the client using the existing `/api/classes`
  response — the API just carries the intent, not a live link.
- Keep payloads small; resolve `mediaKeys` to `/api/media/<key>` paths server-side so the
  app can pass them straight to `mediaUrl()`.

### Admin (`requireAdmin()`)

Extend the existing pattern rather than a new subsystem:

| Route | Purpose |
| --- | --- |
| `GET /api/admin/content?type=content` | List all `Content` (any status) + counts (`drafts`, `scheduled`, `published`). |
| `POST/PATCH /api/admin/content?type=content` | Upsert. Validation mirrors the current `cap()` helper. On `status=PUBLISHED` set `publishedAt`; on `scheduledAt` in the future keep `SCHEDULED`. |
| `DELETE /api/admin/content?type=content&id=` | Delete (also removes MinIO objects — see `deleteFile`). |
| `POST /api/admin/content/image` | Already exists — add `kind: 'content'` and `'reel-thumb'` to the `PREFIX` map. Accept multiple files for carousels (loop). |
| `GET /api/admin/content/calendar?month=` | Items grouped by day (`publishedAt` / `scheduledAt`) for the calendar view. |

### Cron

- Add a job (pattern: [/api/cron/ensure-instances](src/app/api/cron/ensure-instances/route.ts))
  `POST /api/cron/publish-scheduled` — flips `SCHEDULED` items whose `scheduledAt <= now` to
  `PUBLISHED`. Runs every 5–15 min. **Note:** memory says the VPS crontab binary is missing /
  cron not fully installed — confirm the scheduler works before relying on scheduled posts,
  or gate the feature behind "publish now only" until then.

---

## 4. Admin CMS

Add a **Content** tab to [/admin/content](src/app/admin/content/page.tsx) (4th tab alongside
Story / Blog / WhatsApp), plus a sub-switcher for Reel / Post / Announcement since their
fields differ.

**Reel form:** Instagram URL (required, validated `instagram.com/(reel|p)/`), Title,
Caption, Category (select), Thumbnail (image upload — required; we can't pull IG's), CTA
type + label, Related blog (searchable select), Tags, Publish (now / schedule).

**Post form:** Title, Body (textarea, markdown-lite), Category, Images (multi-upload,
ordered), CTA, Related blog, Tags, Publish.

**Announcement form:** Title, Body, optional hero image, Category defaults `STUDIO`,
`pinned` toggle, Publish.

**Blog form:** existing fields + CTA type/label + Related class batch.

**Dashboard strip:** `Drafts N · Scheduled N · Published N` counts at the top of the tab
(from the list endpoint).

**Content calendar** (Phase 3): a month grid under a "Calendar" sub-tab; click a day →
create pre-dated, or open the item. Backed by `/api/admin/content/calendar`.

`EntityFormModal` needs two small additions: a multi-image field type and a
searchable-select (async options) field type. Both are contained changes to the existing
component.

---

## 5. Mobile app (primary surface)

### Navigation

Replace the `Stories` tab with **`Explore`**. Final tabs:

```
Home · Classes · Explore · Therapy · Profile
```

- Stories content moves *into* Explore as one of its filters (or stays reachable from
  Profile). Success stories are `COMMUNITY` content conceptually — but to avoid a data
  migration in v1, keep the existing `/api/stories` and render it as a pinned section
  inside Explore. Fold into `Content` later if desired.
- Therapy stays a tab (it's a paid product surface, not content).

### Screens / files to add

| File | What |
| --- | --- |
| `app/(tabs)/explore.tsx` | Explore hub. Segmented control `Reels · Posts · Articles`, category chips (reuse the chip pattern from `stories.tsx`), infinite list via `useResource` + cursor. |
| `app/reel/[id].tsx` | Full-screen vertical reel card: thumbnail (`expo-image`-style via RN `Image`), title, caption, teacher, like / save / share row, **big CTA button**, "Open in Instagram" → `Linking.openURL(instagramUrl)` with `expo-web-browser` fallback. Swipe down / back to dismiss. (No in-app video — the thumbnail + "Watch on Instagram" is the interaction.) |
| `app/post/[id].tsx` | Post detail — carousel (`ScrollView` horizontal paging), body, CTA, related article link. |
| `app/blog/[id].tsx` | Article reader — hero, `readMinutes`, markdown render (lightweight — a small markdown-to-`<Text>` renderer or `react-native-markdown-display` if it stays JS-only; verify Expo Go compat), a table-of-contents from `##` headings, and the CTA block at the end ("Try this practice" / "Explore classes"). |
| `app/(tabs)/profile.tsx` | Add a "Saved" row → `app/saved.tsx` listing `GET /api/content/saved`. |
| `src/components/ContentCard.tsx` | One card component that renders a feed item by `kind` (reel thumb / post preview / announcement / blog row). Used by Home and Explore. |
| `src/components/CtaBlock.tsx` | Renders a `ctaType` into a `Button` — `join_next_class` pulls the next class from a shared classes fetch; `view_classes` → `/(tabs)/classes`; `book_therapy` → `/therapy/book`; `open_blog` → `/blog/[relatedBlogId]`. |
| `src/lib/types.ts` | Add `FeedItem` discriminated union, `ContentCategory`. |
| `src/lib/content.ts` | `useFeed()` cursor-pagination hook wrapping `useResource`; like/save mutations with optimistic UI + `haptic`. |

### Home screen additions ([app/(tabs)/index.tsx](../mobile/app/(tabs)/index.tsx))

Below the existing "Next class" / "This week" / WhatsApp cards, add (from
`/api/content/home`, in its own `useResource`, so a content failure never blocks the class
card):

1. **Today's inspiration** — featured Reel card → `/reel/[id]`.
2. **For you** — 2–3 mixed items (blog + post) via `ContentCard`.
3. **Announcement banner** — only if a `pinned` announcement exists.
4. Keep the greeting; optionally swap "Namaste {name}" for time-of-day ("Good morning").

Streak / consistency is **out of scope for v1** (needs an attendance-history model pass) —
leave a slot for it.

### Interactions

- Like / Save: optimistic, `haptic.impact()`, revert on error via `Toast`.
- Share: `Linking` / RN `Share.share({ url })` — for a Reel share the Instagram URL, for a
  blog share `https://shaktiyoga.in/blog/<slug>`.
- View ping: `POST /api/content/[id]/view` once per session per item.

### Notifications (extend [src/lib/notifications.ts](../mobile/src/lib/notifications.ts))

Still **local-only** for v1 (no push infra):

- When the feed loads and a *new* pinned announcement appears since last seen, fire a local
  notification. Cheap, no server.
- **Real content push** (new reel dropped, new article) needs Expo push tokens + a server
  table + send-on-publish. That's a Phase 4 item — meaningful backend work. Flag it, don't
  build it yet.

---

## 6. Personalization

v1: **rules only, server-side** in `/api/content/home` and feed ordering —
`pinned` → recency → light category match against the member's booking history
(`member_therapy` sees more `WELLNESS`/`BREATHING`, etc.). No model, no vectors.

The `ContentInteraction` table is the substrate for a later "because you liked breathing"
rail — defer the actual recommender.

---

## 7. Phasing

### Phase 1 — Foundation + Posts/Announcements (backend + admin + mobile Explore shell)
- Migration 1 (`Content`, `ContentInteraction`, enums), `MEDIA_PREFIXES` update.
- `/api/content/feed`, `/api/content/[id]`, `/api/content/home`.
- Admin: Content tab with **Post** and **Announcement** forms + multi-image upload.
- Mobile: `Explore` tab replaces `Stories`; `ContentCard`; Posts + Announcements render;
  stories folded in as a section. Post detail screen.
- **No Reels, no likes/saves yet.** Publish-now only (no scheduling).

### Phase 2 — Reels + interactions
- Reel admin form (IG URL + thumbnail + CTA).
- `/reel/[id]` full-screen screen; featured reel on Home.
- Like / Save endpoints + optimistic mobile UI + `/api/content/saved` + Profile "Saved".
- `CtaBlock` wired to classes / therapy / blog.

### Phase 3 — Blogs as first-class + Learn experience
- `BlogPost` additive migration (CTA, related class, `readMinutes`).
- `/blog/[id]` reader with TOC + end CTA; "Articles" filter in Explore.
- Blog CTA fields in admin.
- Scheduling: `scheduledAt` + `/api/cron/publish-scheduled` (**after** confirming VPS cron).
- Admin content calendar.

### Phase 4 — Retention polish (separate, larger)
- Expo push tokens + server-side send-on-publish.
- Streak / weekly consistency (attendance-history pass).
- Rules-based personalization rail using `ContentInteraction`.

---

## 8. Explicitly out of scope for v1

- Self-hosted video / HLS / transcoding — Reels are Instagram links, period.
- In-app comments (moderation cost). "Comment" opens the Instagram thread.
- Following teachers / creators.
- Web app content surfaces (marketing site and `/dashboard` stay as they are).
- Push notifications for content (Phase 4).
- ML personalization.

---

## 9. Open questions / risks

1. **VPS cron** — memory notes the crontab binary was missing and the ensure-instances cron
   wasn't installed. Scheduled publishing (Phase 3) depends on a working scheduler. Verify
   or keep "publish now" only.
2. **Markdown rendering in Expo Go** — need a pure-JS markdown renderer for blog bodies.
   `react-native-markdown-display` is JS-only; confirm it doesn't pull `react-native-svg`
   in a way that breaks Expo Go, else write a minimal renderer (headings / bold / lists /
   links only).
3. **Instagram link UX on device** — `Linking.openURL('https://instagram.com/reel/...')`
   opens the IG app if installed, else browser. Acceptable. No API access to IG needed.
4. **Stories migration** — keeping `/api/stories` separate in v1 avoids a migration but
   means two code paths. Fold into `Content` (category `COMMUNITY`) in a later cleanup.
5. **Image weight** — carousels of member photos through the `/api/media` proxy. The proxy
   already sets long cache headers; consider a max dimension / re-encode on upload
   (there's `validateImageField` — check whether it resizes).
