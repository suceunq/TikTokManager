export function toAppMediaUrl(absolutePath: string | null): string | null {
  if (!absolutePath) return null;
  return `app-media://local/${encodeURIComponent(absolutePath)}`;
}
