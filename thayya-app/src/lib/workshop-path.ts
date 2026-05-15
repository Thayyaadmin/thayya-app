const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export function isWorkshopSlug(value: string): boolean {
  const s = value.trim().toLowerCase();
  return s.length > 0 && s.length <= 128 && SLUG_RE.test(s);
}

/** Canonical public URL for a workshop (prefers slug, falls back to uuid). */
export function workshopPublicPath(workshop: {
  slug?: string | null;
  id: string;
}): string {
  const slug = workshop.slug?.trim();
  if (slug && isWorkshopSlug(slug)) {
    return `/workshops/${slug}`;
  }
  return `/workshops/${workshop.id}`;
}
