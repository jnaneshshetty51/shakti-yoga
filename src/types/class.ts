export interface ClassView {
    id: string;
    batchName: string;
    teacher: string;
    startsAt: string;
    endsAt: string;
    status: string;
    joinable: boolean;
}

export interface SessionBalanceInfo {
    cycleStart: string;
    cycleEnd: string;
    granted: number;
    used: number;
    remaining: number;
    perCycle: number;
}

export type ClassAccessInfo =
    | { ok: true; sessionBalance?: SessionBalanceInfo | null }
    | {
          ok: false;
          reason: string;
          paywall: boolean;
          outOfSessions?: boolean;
          sessionBalance?: SessionBalanceInfo | null;
      };

export interface ClassesResponse {
    today: ClassView[];
    upcoming: ClassView[];
    access: ClassAccessInfo;
}
