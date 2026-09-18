export interface ClassView {
  id: string;
  batchName: string;
  teacher: string;
  startsAt: string;
  endsAt: string;
  /** When the join button actually becomes enabled — show this, not a hardcoded guess. */
  joinOpensAt: string;
  status: string;
  joinable: boolean;
  /** Whether the caller has attended this instance — per-member, not the instance's own status. */
  attended: boolean;
  /** True when a substitute is covering this occurrence instead of the batch's usual teacher — `teacher` above is already the correct effective name either way. */
  isSubstitute?: boolean;
  /** Free/special class — no membership or session credit required to join. */
  openAccess?: boolean;
  capacity?: number | null;
  attendanceCount?: number;
}

/** Per-cycle session-credit balance for capped plans (monthly Everyday / Family). */
export interface SessionBalance {
  cycleStart: string;
  cycleEnd: string;
  granted: number;
  used: number;
  remaining: number;
  perCycle: number;
}

type StarterUsage = { used: number; limit: number };

export type ClassAccess =
  | { ok: true; starter?: StarterUsage; sessionBalance?: SessionBalance | null }
  | {
      ok: false;
      reason: string;
      paywall: boolean;
      starter?: StarterUsage;
      /** true = plan is valid but the per-cycle session pool is used up (offer support, not renewal). */
      outOfSessions?: boolean;
      sessionBalance?: SessionBalance | null;
    };

export interface ClassesResponse {
  today: ClassView[];
  upcoming: ClassView[];
  access: ClassAccess;
}

export interface BookingRow {
  id: string;
  type: "THERAPY_SESSION" | "CONSULTATION" | "SPECIAL_SESSION";
  status: "PENDING" | "CONFIRMED" | "COMPLETED" | "CANCELLED" | "NO_SHOW";
  date: string;
  teacher: string;
  notes: string | null;
  hasMeetingLink: boolean;
}

// ---- Content feed (/api/content/*) --------------------------------------

export type CtaType =
  | "none" | "join_next_class" | "view_classes" | "book_therapy" | "open_content" | "open_practice";

export interface Cta {
  type: CtaType;
  label: string | null;
  /** Another Content row's id — an article, video, practice, whatever ctaType points at. */
  contentId: string | null;
}

export type FeedKind = "video" | "audio" | "article" | "founder_message" | "announcement";

/** A single feed item, shared shape across every kind — fields are null/empty when not applicable to that kind. */
export interface FeedItem {
  kind: FeedKind;
  id: string;
  title: string;
  slug: string | null;
  excerpt: string | null;
  caption: string | null;
  body: string | null;
  category: string;
  instagramUrl: string | null;
  imageUrl: string | null;
  videoUrl: string | null;
  audioUrl: string | null;
  mediaUrls: string[];
  author: string;
  tags: string[];
  publishedAt: string | null;
  pinned: boolean;
  featured: boolean;
  /** ANNOUNCEMENT only — highlighted + always-on-top. */
  important: boolean;
  likeCount: number;
  saveCount: number;
  commentCount: number;
  liked: boolean;
  saved: boolean;
  cta: Cta;
  /** ARTICLE / FOUNDER_MESSAGE only. */
  readMinutes: number | null;
  relatedClass: { id: string; name: string } | null;
}

export interface FeedResponse {
  items: FeedItem[];
  nextCursor: number | null;
}

/** GET /api/content/:id response — locked when the caller doesn't meet the access requirement. */
export type ContentDetailResponse =
  | { locked: false; item: FeedItem }
  | { locked: true; preview: { id: string; title: string; excerpt: string | null; caption: string | null; imageUrl: string | null; access: string } };

export interface ContentComment {
  id: string;
  body: string;
  author: string;
  avatarUrl: string | null;
  createdAt: string;
  mine: boolean;
}

// ---- Practices (/api/practices) --------------------------------------

export type PracticeLevel = "BEGINNER" | "INTERMEDIATE" | "ALL_LEVELS" | "ADVANCED";

export interface PracticeView {
  id: string;
  title: string;
  slug: string | null;
  description: string | null;
  steps: string | null;
  category: string;
  level: PracticeLevel;
  durationMin: number;
  videoUrl: string | null;
  thumbnailUrl: string | null;
  completed?: boolean;
  completionCount?: number;
}

// ---- Challenges (/api/challenges) --------------------------------------

export interface ChallengeView {
  id: string;
  title: string;
  description: string | null;
  goalType: "CLASSES" | "PRACTICES" | "PRACTICE_MINUTES";
  goalLabel: string;
  goalTarget: number;
  startDate: string;
  endDate: string;
  imageUrl: string | null;
  daysLeft: number;
  participantCount: number;
  joined: boolean;
  progress: number;
  completed: boolean;
}

// ---- Progress (/api/progress, /api/me/achievements) ------------------

export interface Achievement {
  key: string;
  title: string;
  description: string;
  icon: string;
  earnedAt: string | null;
}

export interface AchievementsResponse {
  achievements: Achievement[];
  earnedCount: number;
  total: number;
}

export interface ProgressResponse {
  generatedAt: string;
  memberSince: string | null;
  credits: number;
  sessionCredits: SessionBalance | null;
  totals: {
    classesAllTime: number;
    classesThisMonth: number;
    classesLastMonth: number;
    sessionsCompleted: number;
    currentStreakWeeks: number;
    longestStreakWeeks: number;
  };
  weeks: { key: string; label: string; count: number }[];
  sessions: { id: string; at: string; status: string; teacher: string; notes: string | null }[];
}

// ---- Home aggregate (/api/me/home) ------------------------------------

export interface HomeTherapyNext {
  id: string;
  date: string;
  teacher: string;
  type: "THERAPY_SESSION" | "CONSULTATION" | "SPECIAL_SESSION";
  hasMeetingLink: boolean;
  joinable: boolean;
}

/** Self-practice consistency for the "Your Practice" Home card — plain counts, no points. */
export interface PracticeConsistency {
  streakDays: number;
  thisCycle: number;
  total: number;
}

export interface HomeResponse {
  role: string;
  announcement: FeedItem | null;
  content: {
    featured: FeedItem | null;
    founderMessage: FeedItem | null;
    forYou: FeedItem[];
    recommended: { category: string; items: FeedItem[] } | null;
  };
  activity: { unreadCount: number };
  classes?: {
    access: ClassAccess;
    next: ClassView | null;
    restToday: ClassView[];
    sessionBalance: SessionBalance | null;
  } | null;
  practice?: PracticeConsistency | null;
  therapy?: {
    next: HomeTherapyNext | null;
    completed: number;
    creditsRemaining: number;
  } | null;
}
