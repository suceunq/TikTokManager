import fs from 'node:fs';
import path from 'node:path';
import type { Publication } from '../../shared/types';
import { buildCaption, chunkRanges, contentRangeHeader } from '../../shared/publish';

const CHUNK_SIZE = 8 * 1024 * 1024;
const API_BASE = 'https://open.tiktokapis.com';

function privacyLevel(visibilite: string | null): string {
  switch (visibilite) {
    case 'public': return 'PUBLIC_TO_EVERYONE';
    case 'friends': return 'MUTUAL_FOLLOW_FRIENDS';
    default: return 'SELF_ONLY';
  }
}

export interface CreatorInfo {
  creator_username: string;
  creator_nickname: string;
  creator_avatar_url: string;
  privacy_level_options: string[];
  max_video_post_duration_sec: number;
}

export async function queryCreatorInfo(accessToken: string): Promise<CreatorInfo> {
  const response = await fetch(`${API_BASE}/v2/post/publish/creator_info/query/`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json; charset=UTF-8' },
    body: JSON.stringify({}),
  });
  const json = (await response.json()) as { data?: CreatorInfo; error?: { code?: string; message?: string } };
  if (!response.ok || !json.data || (json.error?.code && json.error.code !== 'ok')) {
    throw new Error(`tiktok_creator_info_${response.status}: ${json.error?.message?.slice(0, 300) ?? ''}`);
  }
  return json.data;
}

async function uploadChunks(uploadUrl: string, filePath: string, fileSize: number, remoteOffset: number, grandTotal: number, onProgress?: (bytes: number, total: number) => void): Promise<void> {
  const handle = await fs.promises.open(filePath, 'r');
  try {
    let localPos = 0;
    let uploadedHere = 0;
    while (localPos < fileSize) {
      const length = Math.min(CHUNK_SIZE, fileSize - localPos);
      const buffer = Buffer.alloc(length);
      await handle.read(buffer, 0, length, localPos);
      const range = { start: remoteOffset + localPos, end: remoteOffset + localPos + length - 1 };
      const response = await fetch(uploadUrl, {
        method: 'PUT',
        headers: { 'Content-Range': contentRangeHeader(range, grandTotal), 'Content-Type': 'video/mp4' },
        body: buffer,
      });
      if (!response.ok) {
        const text = await response.text().catch(() => '');
        throw new Error(`tiktok_upload_${response.status}: ${text.slice(0, 300)}`);
      }
      localPos += length;
      uploadedHere += length;
      onProgress?.(uploadedHere, fileSize);
    }
  } finally {
    await handle.close();
  }
}

export async function publishTiktokVideo(
  accessToken: string,
  publication: Publication,
  onProgress?: (bytesUploaded: number, totalBytes: number) => void
): Promise<{ remoteId: string | null; remoteUrl: string | null }> {
  const stat = await fs.promises.stat(publication.videoPath);
  const size = stat.size;
  const chunkCount = chunkRanges(size, CHUNK_SIZE).length;
  const initResponse = await fetch(`${API_BASE}/v2/post/publish/video/init/`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json; charset=UTF-8' },
    body: JSON.stringify({
      post_info: {
        title: buildCaption(publication.titre, publication.description, publication.hashtags),
        privacy_level: privacyLevel(publication.visibilite),
        disable_duet: false,
        disable_comment: false,
        disable_stitch: false,
      },
      source_info: { source: 'FILE_UPLOAD', video_size: size, chunk_size: Math.min(CHUNK_SIZE, size), total_chunk_count: chunkCount },
    }),
  });
  const initData = (await initResponse.json()) as {
    data?: { publish_id?: string; upload_url?: string };
    error?: { code?: string; message?: string };
  };
  if (!initResponse.ok || !initData.data?.publish_id || !initData.data?.upload_url) {
    throw new Error(`tiktok_init_${initResponse.status}: ${initData.error?.message?.slice(0, 300) ?? ''}`);
  }
  await uploadChunks(initData.data.upload_url, publication.videoPath, size, 0, size, onProgress);
  return { remoteId: initData.data.publish_id, remoteUrl: null };
}

export async function publishTiktokPhotos(
  accessToken: string,
  publication: Publication,
  onProgress?: (bytesUploaded: number, totalBytes: number) => void
): Promise<{ remoteId: string | null; remoteUrl: string | null }> {
  if (!publication.photoPaths.length) throw new Error('tiktok_no_photos');
  const sizes = await Promise.all(publication.photoPaths.map(async (p) => (await fs.promises.stat(p)).size));
  const totalSize = sizes.reduce((a, b) => a + b, 0);
  const initResponse = await fetch(`${API_BASE}/v2/post/publish/content/init/`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json; charset=UTF-8' },
    body: JSON.stringify({
      post_info: {
        title: buildCaption(publication.titre, '', []).slice(0, 90),
        description: buildCaption('', publication.description, publication.hashtags),
        privacy_level: privacyLevel(publication.visibilite),
        disable_comment: false,
        auto_add_music: true,
      },
      source_info: { source: 'FILE_UPLOAD', photo_size: totalSize, photo_cover_index: 0, total_photo_count: publication.photoPaths.length },
      post_mode: 'DIRECT_POST',
      media_type: 'PHOTO',
    }),
  });
  const initData = (await initResponse.json()) as {
    data?: { publish_id?: string; upload_url?: string };
    error?: { code?: string; message?: string };
  };
  if (!initResponse.ok || !initData.data?.publish_id || !initData.data?.upload_url) {
    throw new Error(`tiktok_photo_init_${initResponse.status}: ${initData.error?.message?.slice(0, 300) ?? ''}`);
  }
  let offset = 0;
  for (let i = 0; i < publication.photoPaths.length; i += 1) {
    const filePath = path.resolve(publication.photoPaths[i]);
    const size = sizes[i];
    await uploadChunks(initData.data.upload_url!, filePath, size, offset, totalSize, (bytes, total) => onProgress?.(offset + bytes, total));
    offset += size;
  }
  return { remoteId: initData.data.publish_id, remoteUrl: null };
}

export async function fetchPublishStatus(accessToken: string, publishId: string): Promise<{ status: string; failReason?: string }> {
  const response = await fetch(`${API_BASE}/v2/post/publish/status/fetch/`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json; charset=UTF-8' },
    body: JSON.stringify({ publish_id: publishId }),
  });
  const json = (await response.json()) as {
    data?: { status?: string; fail_reason?: string };
    error?: { code?: string; message?: string };
  };
  if (!response.ok || !json.data?.status) {
    throw new Error(`tiktok_status_${response.status}: ${json.error?.message?.slice(0, 300) ?? ''}`);
  }
  return { status: json.data.status, failReason: json.data.fail_reason };
}
