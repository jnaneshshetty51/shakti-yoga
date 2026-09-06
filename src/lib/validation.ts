/**
 * Small dependency-free request-body validators. Throw ValidationError on bad
 * input; routes catch it and return 400.
 */

import { NextResponse } from 'next/server';

export class ValidationError extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'ValidationError';
    }
}

/**
 * Wrap a route body in `try { ... } catch (e) { return handleValidationError(e); }`
 * — returns a 400 for ValidationError, rethrows anything else.
 */
export function handleValidationError(error: unknown): NextResponse {
    if (error instanceof ValidationError) {
        return NextResponse.json({ error: error.message }, { status: 400 });
    }
    throw error;
}

/** Parse a JSON request body, or throw ValidationError. Always returns an object. */
export async function readJson(request: Request): Promise<Record<string, unknown>> {
    let body: unknown;
    try {
        body = await request.json();
    } catch {
        throw new ValidationError('Request body must be valid JSON.');
    }
    if (body === null || typeof body !== 'object' || Array.isArray(body)) {
        throw new ValidationError('Request body must be a JSON object.');
    }
    return body as Record<string, unknown>;
}

interface StrOpts {
    label?: string;
    min?: number;
    max?: number;
    trim?: boolean;
    pattern?: RegExp;
}

export function str(value: unknown, opts: StrOpts = {}): string {
    const label = opts.label ?? 'value';
    if (typeof value !== 'string') throw new ValidationError(`${label} must be a string.`);
    const v = opts.trim === false ? value : value.trim();
    const min = opts.min ?? 0;
    const max = opts.max ?? 10_000;
    if (v.length < min) throw new ValidationError(`${label} must be at least ${min} characters.`);
    if (v.length > max) throw new ValidationError(`${label} must be at most ${max} characters.`);
    if (opts.pattern && !opts.pattern.test(v)) throw new ValidationError(`${label} is not in a valid format.`);
    return v;
}

/** Optional string: undefined/null/'' -> undefined, otherwise validated. */
export function optStr(value: unknown, opts: StrOpts = {}): string | undefined {
    if (value === undefined || value === null || value === '') return undefined;
    return str(value, opts);
}

export function int(value: unknown, opts: { label?: string; min?: number; max?: number } = {}): number {
    const label = opts.label ?? 'value';
    const n = typeof value === 'number' ? value : Number(value);
    if (!Number.isFinite(n) || !Number.isInteger(n)) throw new ValidationError(`${label} must be an integer.`);
    if (opts.min !== undefined && n < opts.min) throw new ValidationError(`${label} must be >= ${opts.min}.`);
    if (opts.max !== undefined && n > opts.max) throw new ValidationError(`${label} must be <= ${opts.max}.`);
    return n;
}

export function bool(value: unknown, label = 'value'): boolean {
    if (typeof value === 'boolean') return value;
    if (value === 'true') return true;
    if (value === 'false') return false;
    throw new ValidationError(`${label} must be a boolean.`);
}

export function oneOf<T extends string>(value: unknown, allowed: readonly T[], label = 'value'): T {
    if (typeof value !== 'string' || !allowed.includes(value as T)) {
        throw new ValidationError(`${label} must be one of: ${allowed.join(', ')}.`);
    }
    return value as T;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export function email(value: unknown, label = 'email'): string {
    const v = str(value, { label, max: 254 }).toLowerCase();
    if (!EMAIL_RE.test(v)) throw new ValidationError(`${label} must be a valid email address.`);
    return v;
}

/** "HH:MM" 24h time. */
const TIME_RE = /^([01]\d|2[0-3]):([0-5]\d)$/;
export function timeOfDay(value: unknown, label = 'time'): string {
    return str(value, { label, pattern: TIME_RE });
}

/** Parseable date; returns a Date. */
export function isoDate(value: unknown, label = 'date'): Date {
    const s = str(value, { label });
    const d = new Date(s);
    if (Number.isNaN(d.getTime())) throw new ValidationError(`${label} is not a valid date.`);
    return d;
}
