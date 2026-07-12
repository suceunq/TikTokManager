import { contextBridge, ipcRenderer } from 'electron';
import { IPC } from '../shared/ipc-contract';
import type {
  Compte,
  NouveauCompte,
  NouvellePublication,
  Publication,
  HistoriqueFiltre,
  Settings,
  ImportVideoResult,
  ApiResult,
  UpdateState,
} from '../shared/types';

function invoke<T>(channel: string, ...args: unknown[]): Promise<ApiResult<T>> {
  return ipcRenderer.invoke(channel, ...args);
}

const api = {
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
  },
  settings: {
    get: () => invoke<Settings>(IPC.SETTINGS.GET),
    update: (partial: Partial<Settings>) => invoke<Settings>(IPC.SETTINGS.UPDATE, partial),
  },
  files: {
    importVideo: () => invoke<ImportVideoResult | null>(IPC.FILES.IMPORT_VIDEO),
  },
  shell: {
    openTiktokUpload: () => invoke<void>(IPC.SHELL.OPEN_TIKTOK_UPLOAD),
  },
  update: {
    getState: () => invoke<UpdateState>(IPC.UPDATE.STATE),
    check: () => invoke<UpdateState>(IPC.UPDATE.CHECK),
    download: () => invoke<void>(IPC.UPDATE.DOWNLOAD),
    install: () => invoke<void>(IPC.UPDATE.INSTALL),
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
