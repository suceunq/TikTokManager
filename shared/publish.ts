export interface ByteRange {
  start: number;
  end: number;
}

export const DEFAULT_CHUNK_SIZE = 16 * 1024 * 1024;

export function chunkRanges(totalSize: number, chunkSize: number = DEFAULT_CHUNK_SIZE): ByteRange[] {
  if (!Number.isFinite(totalSize) || totalSize <= 0) throw new Error('invalid_size');
  if (!Number.isInteger(chunkSize) || chunkSize <= 0) throw new Error('invalid_chunk_size');
  const ranges: ByteRange[] = [];
  let start = 0;
  while (start < totalSize) {
    const end = Math.min(start + chunkSize, totalSize) - 1;
    ranges.push({ start, end });
    start = end + 1;
  }
  return ranges;
}

export function contentRangeHeader(range: ByteRange, totalSize: number): string {
  return `bytes ${range.start}-${range.end}/${totalSize}`;
}

export function isTransientHttpStatus(status: number): boolean {
  return status === 408 || status === 429 || (status >= 500 && status <= 599);
}

export function nextRetryDelayMs(attempt: number): number {
  if (attempt < 0) attempt = 0;
  return Math.min(30_000, 1_000 * 2 ** attempt);
}

export const MAX_AUTO_RETRIES = 3;

export function shouldAutoRetry(attemptCount: number, transient: boolean): boolean {
  return transient && attemptCount < MAX_AUTO_RETRIES;
}

export function sanitizeTags(hashtags: string[]): string[] {
  return hashtags
    .map((tag) => tag.replace(/^#/, '').trim())
    .filter((tag) => tag.length > 0 && tag.length <= 60)
    .slice(0, 50);
}

export function buildCaption(titre: string, description: string, hashtags: string[]): string {
  const tags = hashtags.map((h) => (h.startsWith('#') ? h : `#${h}`)).join(' ');
  const parts = [titre.trim(), description.trim(), tags].filter((p) => p.length > 0);
  return parts.join('\n\n').slice(0, 2200);
}

export function youtubeTitleFrom(titre: string): string {
  return titre.trim().slice(0, 100);
}

export function youtubeDescriptionFrom(description: string, hashtags: string[]): string {
  const tags = hashtags.map((h) => (h.startsWith('#') ? h : `#${h}`)).join(' ');
  const parts = [description.trim(), tags].filter((p) => p.length > 0);
  return parts.join('\n\n').slice(0, 4900);
}
