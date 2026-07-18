export const IPC = {
  ACCOUNTS: {
    LIST: 'accounts:list',
    CREATE: 'accounts:create',
    UPDATE: 'accounts:update',
    REMOVE: 'accounts:remove',
  },
  PUBLICATIONS: {
    LIST: 'publications:list',
    LIST_BETWEEN: 'publications:listBetween',
    LIST_HISTORIQUE: 'publications:listHistorique',
    GET: 'publications:get',
    CREATE: 'publications:create',
    UPDATE: 'publications:update',
    REMOVE: 'publications:remove',
    MARK_PUBLISHED: 'publications:markPublished',
    CANCEL: 'publications:cancel',
  },
  SETTINGS: {
    GET: 'settings:get',
    UPDATE: 'settings:update',
  },
  FILES: {
    IMPORT_VIDEO: 'files:importVideo',
  },
  SHELL: {
    OPEN_TIKTOK_UPLOAD: 'shell:openTiktokUpload',
    OPEN_DONATION: 'shell:openDonation',
  },
  UPDATE: {
    STATE: 'update:state',
    CHECK: 'update:check',
    DOWNLOAD: 'update:download',
    INSTALL: 'update:install',
    STATE_CHANGED: 'update:stateChanged',
  },
  NOTIFICATIONS: {
    NAVIGATE: 'notification:navigate',
  },
  APP: {
    NAVIGATE: 'app:navigate',
  },
} as const;

export const APP_MEDIA_PROTOCOL = 'app-media';
