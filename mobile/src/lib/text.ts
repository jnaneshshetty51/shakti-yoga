/** Split a plain-text / light-markdown body into display paragraphs. */
export function toParagraphs(body: string | null | undefined): string[] {
  if (!body) return [];
  return body
    .split(/\n\s*\n/)
    .map((p) => p.trim().replace(/\s*\n\s*/g, " "))
    .filter(Boolean);
}

/** Split a "markdown list of cues" into clean step strings. */
export function toSteps(steps: string | null | undefined): string[] {
  if (!steps) return [];
  return steps
    .split(/\r?\n/)
    .map((s) => s.trim().replace(/^(?:[-*+]|\d+[.)])\s+/, ""))
    .filter(Boolean);
}
