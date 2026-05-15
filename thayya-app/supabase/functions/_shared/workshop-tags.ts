export const MAX_WORKSHOP_TAGS = 20;
export const MAX_WORKSHOP_TAG_LENGTH = 32;

/** Trim, collapse spaces, dedupe case-insensitively, cap count and length. */
export function normalizeWorkshopTags(input: unknown): string[] {
  if (!Array.isArray(input)) return [];

  const seen = new Set<string>();
  const out: string[] = [];

  for (const item of input) {
    if (typeof item !== "string") continue;
    const t = item.trim().replace(/\s+/g, " ");
    if (!t || t.length > MAX_WORKSHOP_TAG_LENGTH) continue;
    const key = t.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(t);
    if (out.length >= MAX_WORKSHOP_TAGS) break;
  }

  return out;
}
