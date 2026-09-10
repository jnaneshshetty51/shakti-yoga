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
