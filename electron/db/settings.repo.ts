import { getStore, persist } from './store';
import type { Settings } from '../../shared/types';

export function get(): Settings {
  return { ...getStore().settings };
}

export function update(partial: Partial<Settings>): Settings {
  const store = getStore();
  store.settings = { ...store.settings, ...partial };
  persist();
  return { ...store.settings };
}
