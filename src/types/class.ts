export interface ClassView {
    id: string;
    batchName: string;
    teacher: string;
    startsAt: string;
    endsAt: string;
    status: string;
    joinable: boolean;
}

export type ClassAccessInfo =
    | { ok: true }
    | { ok: false; reason: string; paywall: boolean };

export interface ClassesResponse {
    today: ClassView[];
    upcoming: ClassView[];
    access: ClassAccessInfo;
}
