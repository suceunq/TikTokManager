/// <reference types="vite/client" />

import type {
  ApiResult,
  Compte,
  Connexion,
  ConnexionResult,
  HistoriqueFiltre,
  ImportMediaResult,
  ImportVideoResult,
  NouveauCompte,
  NouvellePublication,
  Publication,
  Settings,
  UpdateState,
} from '@shared/types';

export interface CredentialsApiInput {
  googleClientId: string;
  googleClientSecret: string;
  tiktokClientKey: string;
  tiktokClientSecret: string;
}

export interface CredentialsStatus {
  configured: boolean;
  redirectUris: string[];
}

export interface PublishResult {
  ok: boolean;
  detail?: string;
}

export interface TikTokManagerApi {
  getFilePath: (file: File) => string;
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
    publishNow: (id: string) => Promise<ApiResult<PublishResult>>;
    retry: (id: string) => Promise<ApiResult<PublishResult>>;
    duplicate: (id: string) => Promise<ApiResult<Publication | null>>;
  };
  settings: {
    get: () => Promise<ApiResult<Settings>>;
    update: (partial: Partial<Settings>) => Promise<ApiResult<Settings>>;
  };
  files: {
    importVideo: () => Promise<ApiResult<ImportVideoResult | null>>;
    importMedia: () => Promise<ApiResult<ImportMediaResult[]>>;
    importFromPaths: (paths: string[]) => Promise<ApiResult<ImportMediaResult[]>>;
  };
  connexions: {
    list: () => Promise<ApiResult<Record<string, Connexion>>>;
    connect: (compteId: string) => Promise<ApiResult<ConnexionResult>>;
    disconnect: (compteId: string) => Promise<ApiResult<boolean>>;
  };
  credentials: {
    status: () => Promise<ApiResult<CredentialsStatus>>;
    save: (input: CredentialsApiInput) => Promise<ApiResult<boolean>>;
  };
  shell: {
    openTiktokUpload: () => Promise<ApiResult<void>>;
    openYoutubeUpload: () => Promise<ApiResult<void>>;
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
