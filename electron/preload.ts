import { contextBridge, ipcRenderer, webUtils } from 'electron';
// Keep channel names local: sandboxed Electron preloads may only require a very small set of
// built-in modules and cannot load our compiled ../shared module at runtime.
const IPC = {
  ACCOUNTS: { LIST: 'accounts:list', CREATE: 'accounts:create', UPDATE: 'accounts:update', REMOVE: 'accounts:remove' },
  PUBLICATIONS: { LIST: 'publications:list', LIST_BETWEEN: 'publications:listBetween', LIST_HISTORIQUE: 'publications:listHistorique', GET: 'publications:get', CREATE: 'publications:create', UPDATE: 'publications:update', REMOVE: 'publications:remove', MARK_PUBLISHED: 'publications:markPublished', CANCEL: 'publications:cancel', PUBLISH_NOW: 'publications:publishNow', RETRY: 'publications:retry', DUPLICATE: 'publications:duplicate' },
  SETTINGS: { GET: 'settings:get', UPDATE: 'settings:update' },
  FILES: { IMPORT_VIDEO: 'files:importVideo', IMPORT_MEDIA: 'files:importMedia', IMPORT_FROM_PATHS: 'files:importFromPaths' },
  CONNEXIONS: { LIST: 'connexions:list', CONNECT: 'connexions:connect', DISCONNECT: 'connexions:disconnect' },
  CREDENTIALS: { STATUS: 'credentials:status', SAVE: 'credentials:save' },
  SHELL: { OPEN_TIKTOK_UPLOAD: 'shell:openTiktokUpload', OPEN_YOUTUBE_UPLOAD: 'shell:openYoutubeUpload', OPEN_DONATION: 'shell:openDonation' },
  UPDATE: { STATE: 'update:state', CHECK: 'update:check', ACK_INSTALLED: 'update:ackInstalled', STATE_CHANGED: 'update:stateChanged' },
  NOTIFICATIONS: { NAVIGATE: 'notification:navigate' },
  APP: { NAVIGATE: 'app:navigate' },
} as const;
import type {
  Compte,
  Connexion,
  ConnexionResult,
  NouveauCompte,
  NouvellePublication,
  Publication,
  HistoriqueFiltre,
  Settings,
  ImportVideoResult,
  ImportMediaResult,
  ApiResult,
  UpdateState,
} from '../shared/types';

function invoke<T>(channel: string, ...args: unknown[]): Promise<ApiResult<T>> {
  return ipcRenderer.invoke(channel, ...args);
}

const api = {
  getFilePath: (file: File) => webUtils.getPathForFile(file),
  accounts: {
    list: () => invoke<Compte[]>(IPC.ACCOUNTS.LIST),
    create: (input: NouveauCompte) => invoke<Compte>(IPC.ACCOUNTS.CREATE, input),
    update: (id: string, input: NouveauCompte) => invoke<Compte>(IPC.ACCOUNTS.UPDATE, id, input),
    remove: (id: string) => invoke<{ removedPublications: number }>(IPC.ACCOUNTS.REMOVE, id),
  },
  publications: {
    list: () => invoke<Publication[]>(IPC.PUBLICATIONS.LIST),
    listBetween: (startIso: string, endIso: string) =>
      invoke<Publication[]>(IPC.PUBLICATIONS.LIST_BETWEEN, startIso, endIso),
    listHistorique: (filtre: HistoriqueFiltre) =>
      invoke<Publication[]>(IPC.PUBLICATIONS.LIST_HISTORIQUE, filtre),
    get: (id: string) => invoke<Publication | null>(IPC.PUBLICATIONS.GET, id),
    create: (input: NouvellePublication) => invoke<Publication>(IPC.PUBLICATIONS.CREATE, input),
    update: (id: string, input: NouvellePublication) =>
      invoke<Publication>(IPC.PUBLICATIONS.UPDATE, id, input),
    remove: (id: string) => invoke<void>(IPC.PUBLICATIONS.REMOVE, id),
    markPublished: (id: string) => invoke<Publication>(IPC.PUBLICATIONS.MARK_PUBLISHED, id),
    cancel: (id: string) => invoke<Publication>(IPC.PUBLICATIONS.CANCEL, id),
    publishNow: (id: string) => invoke<{ ok: boolean; detail?: string }>(IPC.PUBLICATIONS.PUBLISH_NOW, id),
    retry: (id: string) => invoke<{ ok: boolean; detail?: string }>(IPC.PUBLICATIONS.RETRY, id),
    duplicate: (id: string) => invoke<Publication | null>(IPC.PUBLICATIONS.DUPLICATE, id),
  },
  settings: {
    get: () => invoke<Settings>(IPC.SETTINGS.GET),
    update: (partial: Partial<Settings>) => invoke<Settings>(IPC.SETTINGS.UPDATE, partial),
  },
  files: {
    importVideo: () => invoke<ImportVideoResult | null>(IPC.FILES.IMPORT_VIDEO),
    importMedia: () => invoke<ImportMediaResult[]>(IPC.FILES.IMPORT_MEDIA),
    importFromPaths: (paths: string[]) => invoke<ImportMediaResult[]>(IPC.FILES.IMPORT_FROM_PATHS, paths),
  },
  connexions: {
    list: () => invoke<Record<string, Connexion>>(IPC.CONNEXIONS.LIST),
    connect: (compteId: string) => invoke<ConnexionResult>(IPC.CONNEXIONS.CONNECT, compteId),
    disconnect: (compteId: string) => invoke<boolean>(IPC.CONNEXIONS.DISCONNECT, compteId),
  },
  credentials: {
    status: () => invoke<{ configured: boolean; redirectUris: string[] }>(IPC.CREDENTIALS.STATUS),
    save: (input: { googleClientId: string; googleClientSecret: string; tiktokClientKey: string; tiktokClientSecret: string }) =>
      invoke<boolean>(IPC.CREDENTIALS.SAVE, input),
  },
  shell: {
    openTiktokUpload: () => invoke<void>(IPC.SHELL.OPEN_TIKTOK_UPLOAD),
    openYoutubeUpload: () => invoke<void>(IPC.SHELL.OPEN_YOUTUBE_UPLOAD),
    openDonation: () => invoke<void>(IPC.SHELL.OPEN_DONATION),
  },
  update: {
    getState: () => invoke<UpdateState>(IPC.UPDATE.STATE),
    check: () => invoke<UpdateState>(IPC.UPDATE.CHECK),
    acknowledgeInstalled: () => invoke<void>(IPC.UPDATE.ACK_INSTALLED),
  },
  onUpdateStateChanged: (callback: (state: UpdateState) => void) => {
    const listener = (_event: Electron.IpcRendererEvent, state: UpdateState) => callback(state);
    ipcRenderer.on(IPC.UPDATE.STATE_CHANGED, listener);
    return () => ipcRenderer.removeListener(IPC.UPDATE.STATE_CHANGED, listener);
  },
  onNotificationNavigate: (callback: (publicationId: string) => void) => {
    const listener = (_event: Electron.IpcRendererEvent, publicationId: string) =>
      callback(publicationId);
    ipcRenderer.on(IPC.NOTIFICATIONS.NAVIGATE, listener);
    return () => ipcRenderer.removeListener(IPC.NOTIFICATIONS.NAVIGATE, listener);
  },
  onAppNavigate: (callback: (route: string) => void) => {
    const listener = (_event: Electron.IpcRendererEvent, route: string) => callback(route);
    ipcRenderer.on(IPC.APP.NAVIGATE, listener);
    return () => ipcRenderer.removeListener(IPC.APP.NAVIGATE, listener);
  },
};

contextBridge.exposeInMainWorld('api', api);

export type Api = typeof api;
