import type { ApiResult } from '@shared/types';

export async function unwrap<T>(promise: Promise<ApiResult<T>>): Promise<T> {
  const result = await promise;
  if (!result.ok) {
    throw new Error(result.error ?? '');
  }
  return result.data as T;
}

export const api = window.api;
