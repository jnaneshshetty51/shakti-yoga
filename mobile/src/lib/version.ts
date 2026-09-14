/** Simple "1.2.3" major.minor.patch compare — no pre-release/build metadata to worry about here. */
export function isVersionBelow(current: string, minimum: string): boolean {
  const a = current.split(".").map((n) => parseInt(n, 10) || 0);
  const b = minimum.split(".").map((n) => parseInt(n, 10) || 0);
  for (let i = 0; i < Math.max(a.length, b.length); i++) {
    const x = a[i] ?? 0;
    const y = b[i] ?? 0;
    if (x !== y) return x < y;
  }
  return false;
}
