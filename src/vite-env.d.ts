/// <reference types="vite/client" />

import type {
  ApiResult,
  Compte,
  HistoriqueFiltre,
  ImportVideoResult,
  UpdateState,
  NouveauCompte,
  NouvellePublication,
  Publication,
  Settings,
} from '@shared/types';

export interface TikTokManagerApi {
  accounts: {
    list: () => Promise<ApiResult<Compte[]>>;
    create: (input: NouveauCompte) => Promise<ApiResult<Compte>>;
    update: (id: string, input: NouveauCompte) => Promise<ApiResult<Compte>>;
    remove: (id: string) => Promise<ApiResult<{ removedPublications: number }>>;
  };
  publications: {
    list: () => Promise<ApiResult<Publication[]>>;
    listBetween: (startIso: string, endIso: string) => Promise<ApiResult<Publication[]>>;
    listHistorique: (filtre: HistoriqueFiltre) => Promise<ApiResult<Publication[]>>;
    get: (id: string) => Promise<ApiResult<Publication | null>>;
    create: (input: NouvellePublication) => Promise<ApiResult<Publication>>;
    update: (id: string, input: NouvellePublication) => Promise<ApiResult<Publication>>;
    remove: (id: string) => Promise<ApiResult<void>>;
    markPublished: (id: string) => Promise<ApiResult<Publication>>;
    cancel: (id: string) => Promise<ApiResult<Publication>>;
  };
  settings: {
    get: () => Promise<ApiResult<Settings>>;
    update: (partial: Partial<Settings>) => Promise<ApiResult<Settings>>;
  };
  files: {
    importVideo: () => Promise<ApiResult<ImportVideoResult | null>>;
  };
  shell: {
    openTiktokUpload: () => Promise<ApiResult<void>>;
    openDonation: () => Promise<ApiResult<void>>;
  };
  update: {
    getState: () => Promise<ApiResult<UpdateState>>;
    check: () => Promise<ApiResult<UpdateState>>;
    acknowledgeInstalled: () => Promise<ApiResult<void>>;
  };
  onUpdateStateChanged: (callback: (state: UpdateState) => void) => () => void;
  onNotificationNavigate: (callback: (publicationId: string) => void) => () => void;
  onAppNavigate: (callback: (route: string) => void) => () => void;
}

declare global {
  interface Window {
    api: TikTokManagerApi;
  }
}
