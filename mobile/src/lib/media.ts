import { API_URL } from "@/lib/api";

/** Resolve a stored media value (usually a relative `/api/media/<key>`) to a full URL. */
export function mediaUri(url: string | null | undefined): string | null {
  if (!url) return null;
  return url.startsWith("http") ? url : `${API_URL}${url}`;
}
