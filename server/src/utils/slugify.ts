export function slugifyValue(input: string) {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
    .slice(0, 60);
}

export function withSlugSuffix(base: string, suffix: string) {
  const trimmedSuffix = suffix.toLowerCase().replace(/[^a-z0-9]+/g, '').slice(0, 8);
  return `${base}-${trimmedSuffix}`;
}

