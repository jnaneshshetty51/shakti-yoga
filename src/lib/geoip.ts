import { open, type Reader, type CountryResponse } from 'maxmind';

/**
 * IP → ISO country code, from a local MaxMind-format DB (DB-IP Country Lite,
 * refreshed monthly by scripts/refresh-geoip.ts). Falls back to null when the
 * DB is absent (local dev) — callers then default to India pricing.
 */
const DB_PATH = process.env.GEOIP_DB_PATH || '/usr/share/GeoIP/dbip-country-lite.mmdb';

let readerPromise: Promise<Reader<CountryResponse> | null> | null = null;

function getReader(): Promise<Reader<CountryResponse> | null> {
    if (!readerPromise) {
        readerPromise = open<CountryResponse>(DB_PATH).catch((err) => {
            console.warn(`[geoip] DB unavailable at ${DB_PATH}: ${(err as Error).message}`);
            return null;
        });
    }
    return readerPromise;
}

export async function countryForIp(ip: string | null | undefined): Promise<string | null> {
    if (!ip) return null;
    const addr = ip.split(',')[0].trim(); // x-forwarded-for may be a list
    if (!addr || addr === '127.0.0.1' || addr === '::1' || addr.startsWith('10.') || addr.startsWith('192.168.')) {
        return null;
    }
    const reader = await getReader();
    if (!reader) return null;
    try {
        return reader.get(addr)?.country?.iso_code ?? null;
    } catch {
        return null;
    }
}
