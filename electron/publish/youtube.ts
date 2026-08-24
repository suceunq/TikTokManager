import fs from 'node:fs';
import type { Publication } from '../../shared/types';
import { chunkRanges, contentRangeHeader, youtubeDescriptionFrom, youtubeTitleFrom } from '../../shared/publish';

const CHUNK_SIZE = 16 * 1024 * 1024;

function privacyStatus(visibilite: string | null): 'public' | 'unlisted' | 'private' {
  if (visibilite === 'unlisted' || visibilite === 'private') return visibilite;
  return 'public';
}

async function initResumableSession(accessToken: string, publication: Publication, sizeBytes: number): Promise<string> {
  const metadata = {
    snippet: {
      title: youtubeTitleFrom(publication.titre),
      description: youtubeDescriptionFrom(publication.description, publication.hashtags),
      tags: publication.hashtags.map((h) => h.replace(/^#/, '')).slice(0, 30),
    },
    status: {
      privacyStatus: privacyStatus(publication.visibilite),
      selfDeclaredMadeForKids: false,
    },
  };
  const response = await fetch('https://www.googleapis.com/upload/youtube/v3/videos?uploadType=resumable&part=snippet,status', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json; charset=UTF-8',
      'X-Upload-Content-Length': String(sizeBytes),
      'X-Upload-Content-Type': 'video/mp4',
    },
    body: JSON.stringify(metadata),
  });
  const location = response.headers.get('location');
  if (!response.ok || !location) {
    const text = await response.text().catch(() => '');
    throw new Error(`youtube_init_${response.status}: ${text.slice(0, 300)}`);
  }
  return location;
}

export async function publishYoutubeVideo(
  accessToken: string,
  publication: Publication,
  onProgress?: (bytesUploaded: number, totalBytes: number) => void
): Promise<{ remoteId: string | null; remoteUrl: string | null }> {
  const stat = await fs.promises.stat(publication.videoPath);
  const totalSize = stat.size;
  const sessionUrl = await initResumableSession(accessToken, publication, totalSize);
  const handle = await fs.promises.open(publication.videoPath, 'r');
  try {
    const ranges = chunkRanges(totalSize, CHUNK_SIZE);
    for (const range of ranges) {
      const length = range.end - range.start + 1;
      const buffer = Buffer.alloc(length);
      await handle.read(buffer, 0, length, range.start);
      const isFinal = range.end === totalSize - 1;
      const response = await fetch(sessionUrl, {
        method: 'PUT',
        headers: {
          'Content-Length': String(length),
          'Content-Range': contentRangeHeader(range, totalSize),
        },
        body: buffer,
      });
      if (response.status === 308) {
        onProgress?.(range.end + 1, totalSize);
        continue;
      }
      if (response.ok && isFinal) {
        const json = (await response.json()) as { id?: string };
        onProgress?.(totalSize, totalSize);
        return {
          remoteId: json.id ?? null,
          remoteUrl: json.id ? `https://www.youtube.com/watch?v=${json.id}` : null,
        };
      }
      const text = await response.text().catch(() => '');
      throw new Error(`youtube_upload_${response.status}: ${text.slice(0, 300)}`);
    }
    throw new Error('youtube_upload_incomplete');
  } finally {
    await handle.close();
  }
}
