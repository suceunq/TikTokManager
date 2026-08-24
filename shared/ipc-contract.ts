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
    PUBLISH_NOW: 'publications:publishNow',
    RETRY: 'publications:retry',
    DUPLICATE: 'publications:duplicate',
  },
  SETTINGS: {
    GET: 'settings:get',
    UPDATE: 'settings:update',
  },
  FILES: {
    IMPORT_VIDEO: 'files:importVideo',
    IMPORT_MEDIA: 'files:importMedia',
    IMPORT_FROM_PATHS: 'files:importFromPaths',
  },
  CONNEXIONS: {
    LIST: 'connexions:list',
    CONNECT: 'connexions:connect',
    DISCONNECT: 'connexions:disconnect',
  },
  CREDENTIALS: {
    STATUS: 'credentials:status',
    SAVE: 'credentials:save',
  },
  SHELL: {
    OPEN_TIKTOK_UPLOAD: 'shell:openTiktokUpload',
    OPEN_YOUTUBE_UPLOAD: 'shell:openYoutubeUpload',
    OPEN_DONATION: 'shell:openDonation',
  },
  UPDATE: {
    STATE: 'update:state',
    CHECK: 'update:check',
    ACK_INSTALLED: 'update:ackInstalled',
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
