export function formatPrice(amount: number, currency: string): string {
  if (amount <= 0) return "Free";
  const symbol = currency === "INR" ? "₹" : currency === "USD" ? "$" : `${currency} `;
  return `${symbol}${amount.toLocaleString()}`;
}

/** "Starts in 32 min" / "Starts in 2h 18m" / "Ended". */
export function timeUntil(iso: string): string {
  const diffMs = new Date(iso).getTime() - Date.now();
  if (diffMs <= 0) return "In progress";
  const mins = Math.round(diffMs / 60_000);
  if (mins < 60) return `Starts in ${mins} min`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return `Starts in ${h}h ${m}m`;
}

export function formatClassTime(iso: string): string {
  return new Date(iso).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
}

export function formatDay(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, { weekday: "long", month: "short", day: "numeric" });
}
