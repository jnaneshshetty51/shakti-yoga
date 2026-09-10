export interface ClassView {
  id: string;
  batchName: string;
  teacher: string;
  startsAt: string;
  endsAt: string;
  status: string;
  joinable: boolean;
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
  | "none" | "join_next_class" | "view_classes" | "book_therapy" | "open_blog" | "open_practice";

export interface Cta {
  type: CtaType;
  label: string | null;
  blogId: string | null;
  practiceId: string | null;
}

interface FeedCommon {
  id: string;
  title: string;
  author: string;
  publishedAt: string | null;
  pinned: boolean;
  cta: Cta;
}
interface FeedSocial {
  category: string;
  tags: string[];
  imageUrl: string | null;
  likeCount: number;
  saveCount: number;
  commentCount: number;
  liked: boolean;
  saved: boolean;
}

export type FeedItem =
  | (FeedCommon & FeedSocial & { kind: "reel"; caption: string | null; instagramUrl: string | null })
  | (FeedCommon & FeedSocial & { kind: "post" | "announcement"; body: string | null; mediaUrls: string[] })
  | (FeedCommon & {
      kind: "blog";
      slug: string;
      excerpt: string | null;
      category: string;
      imageUrl: string | null;
      readMinutes: number;
      relatedClass: { id: string; name: string } | null;
      body?: string;
    });

export interface FeedResponse {
  items: FeedItem[];
  nextCursor: number | null;
}

export interface ContentComment {
  id: string;
  body: string;
  author: string;
  avatarUrl: string | null;
  createdAt: string;
  mine: boolean;
}

// ---- Practices (/api/practices) --------------------------------------

export type PracticeLevel = "BEGINNER" | "INTERMEDIATE" | "ALL_LEVELS";

export interface PracticeView {
  id: string;
  title: string;
  slug: string;
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

// ---- Home aggregate (/api/me/home) ------------------------------------

export interface HomeStreak {
  currentStreakWeeks: number;
  classesThisWeek: number;
  attendedThisWeek: boolean;
  starterLimit: number | null;
}

export interface HomeTherapyNext {
  id: string;
  date: string;
  teacher: string;
  type: "THERAPY_SESSION" | "CONSULTATION" | "SPECIAL_SESSION";
  hasMeetingLink: boolean;
  joinable: boolean;
}

export interface HomeChallenge {
  id: string;
  title: string;
  goalLabel: string;
  goalTarget: number;
  progress: number;
  daysLeft: number;
  completed: boolean;
}

export interface HomeResponse {
  role: string;
  announcement: FeedItem | null;
  content: {
    featuredReel: FeedItem | null;
    forYou: FeedItem[];
    recommended: { category: string; items: FeedItem[] } | null;
  };
  activity: { unreadCount: number };
  community: { name: string; whatsappLink: string; pinnedMessage: string | null } | null;
  classes?: {
    access: ClassAccess;
    next: ClassView | null;
    restToday: ClassView[];
    sessionBalance: SessionBalance | null;
  } | null;
  streak?: HomeStreak | null;
  therapy?: {
    next: HomeTherapyNext | null;
    completed: number;
    creditsRemaining: number;
  } | null;
  activeChallenge?: HomeChallenge | null;
}
