function slugify(input: string): string {
  return input
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-+/g, "-");
}

export function deriveMemberSlugBase(
  displayName: string | null,
  email: string,
): string {
  const fromName = displayName ? slugify(displayName) : "";
  if (fromName) {
    return fromName;
  }
  const local = email.split("@")[0] ?? email;
  return slugify(local) || "member";
}

export function ensureUniqueSlug(base: string, taken: Iterable<string>): string {
  const set = taken instanceof Set ? taken : new Set(taken);
  if (!set.has(base)) {
    return base;
  }
  let n = 2;
  while (set.has(`${base}-${n}`)) {
    n += 1;
  }
  return `${base}-${n}`;
}
