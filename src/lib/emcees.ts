export function getEmceePath(slug: string): string {
  return `/emcees/${encodeURIComponent(slug)}`;
}

function mapSpecialSlugCharacters(value: string): string {
  return value.replace(/\$/g, "s").replace(/@/g, "a");
}

export function normalizeEmceeSlug(value: string): string {
  return mapSpecialSlugCharacters(value.trim().toLowerCase())
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[._/\s+-]+/g, "-")
    .replace(/[^a-z0-9-]+/g, "")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "");
}
