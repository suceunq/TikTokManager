import { useEffect, useMemo, useRef, useState } from 'react';
import type { ImportMediaResult, TypeContenu, ValidationVideo, Visibilite } from '@shared/types';
import type { TranslationKey } from '@shared/i18n';
import { useAccounts } from '../context/AccountsContext';
import { usePublications } from '../context/PublicationsContext';
import { api, unwrap } from '../lib/ipc';
import { toAppMediaUrl } from '../lib/mediaUrl';
import { toDateInputValue, toTimeInputValue, combineDateAndTime } from '../lib/dateUtils';
import Button from '../components/Button';
import ConfirmDialog from '../components/ConfirmDialog';
import TagInput from '../components/TagInput';
import VideoThumbnail from '../components/VideoThumbnail';
import { useI18n } from '../context/I18nContext';
import { useRouter } from '../context/RouterContext';
import { allowedContentTypes, handleFor, visibilitesPour } from '@shared/compte';
import { PLATEFORME_LABELS, TYPE_KEYS } from '../lib/statusLabels';

const MAX_PHOTOS = 35;

function nowPlusMinutes(minutes: number): { date: string; time: string } {
  const d = new Date(Date.now() + minutes * 60_000);
  const iso = d.toISOString();
  return { date: toDateInputValue(iso), time: toTimeInputValue(iso) };
}

function formatBytes(bytes: number): string {
  if (!bytes) return '—';
  return `${(bytes / 1048576).toFixed(1)} MB`;
}

export default function PlanificationFormPage() {
  const { t } = useI18n();
  const { path: routePath, state: routeState, navigate } = useRouter();
  const id = /^\/planification\/([^/]+)\/editer$/.exec(routePath)?.[1];
  const { accounts } = useAccounts();
  const { getById, create, update, cancel, publishNow } = usePublications();

  const editingPublication = id ? getById(id) : undefined;
  const isEditing = Boolean(id);

  const prefillIso = (routeState as { date?: string } | null)?.date;
  const defaultTime = nowPlusMinutes(60).time;
  const defaultDateTime = prefillIso
    ? { date: toDateInputValue(prefillIso), time: defaultTime }
    : nowPlusMinutes(60);

  const [compteId, setCompteId] = useState('');
  const [type, setType] = useState<TypeContenu>('video');
  const [titre, setTitre] = useState('');
  const [description, setDescription] = useState('');
  const [hashtags, setHashtags] = useState<string[]>([]);
  const [videoPath, setVideoPath] = useState<string | null>(null);
  const [thumbnailPath, setThumbnailPath] = useState<string | null>(null);
  const [validation, setValidation] = useState<ValidationVideo | null>(null);
  const [photos, setPhotos] = useState<ImportMediaResult[]>([]);
  const [visibilite, setVisibilite] = useState<Visibilite | null>(null);
  const [publishNowChecked, setPublishNowChecked] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [date, setDate] = useState(defaultDateTime.date);
  const [time, setTime] = useState(defaultDateTime.time);
  const [reminderLeadMinutes, setReminderLeadMinutes] = useState<string>('');
  const [importing, setImporting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const dropRef = useRef<HTMLDivElement | null>(null);

  const selectedAccount = useMemo(() => accounts.find((a) => a.id === compteId), [accounts, compteId]);
  const plateforme = selectedAccount?.plateforme ?? 'tiktok';
  const availableTypes: TypeContenu[] = selectedAccount ? allowedContentTypes(selectedAccount.plateforme) : ['video'];
  const isPhotoType = type === 'photo';
  const needsVideo = type === 'video' || type === 'short' || type === 'story';
  const allowedVisibilites = useMemo(() => visibilitesPour(plateforme) as Visibilite[], [plateforme]);

  useEffect(() => {
    if (editingPublication) {
      setCompteId(editingPublication.compteId);
      setType(editingPublication.type);
      setTitre(editingPublication.titre);
      setDescription(editingPublication.description);
      setHashtags(editingPublication.hashtags);
      setVideoPath(editingPublication.videoPath || null);
      setThumbnailPath(editingPublication.thumbnailPath);
      setVisibilite(editingPublication.visibilite);
      setPhotos(
        editingPublication.photoPaths.map((mediaPath) => ({
          kind: 'photo' as const,
          mediaPath,
          originalName: mediaPath.split(/[\\/]/).pop() ?? mediaPath,
          thumbnailPath: null,
          sizeBytes: 0,
          width: null,
          height: null,
          durationSeconds: null,
        }))
      );
      setDate(toDateInputValue(editingPublication.scheduledAt));
      setTime(toTimeInputValue(editingPublication.scheduledAt));
      setReminderLeadMinutes(
        editingPublication.reminderLeadMinutes != null ? String(editingPublication.reminderLeadMinutes) : ''
      );
    } else if (accounts.length > 0 && !compteId) {
      setCompteId(accounts[0].id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editingPublication, accounts]);

  useEffect(() => {
    if (!allowedVisibilites.includes(visibilite as Visibilite)) {
      setVisibilite(allowedVisibilites[0] ?? null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [plateforme]);

  useEffect(() => {
    if (selectedAccount && !availableTypes.includes(type)) {
      setType(availableTypes[0] ?? 'video');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [compteId, accounts]);

  const applyImportResults = (results: ImportMediaResult[]) => {
    if (isPhotoType) {
      setPhotos((prev) => {
        const merged = [...prev];
        for (const result of results) {
          if (result.kind !== 'photo') continue;
          if (merged.some((p) => p.mediaPath === result.mediaPath)) continue;
          if (merged.length >= MAX_PHOTOS) break;
          merged.push(result);
        }
        return merged;
      });
    } else {
      const video = results.find((r) => r.kind === 'video');
      if (video) {
        setVideoPath(video.mediaPath);
        setThumbnailPath(video.thumbnailPath);
        setValidation({
          width: video.width,
          height: video.height,
          durationSeconds: video.durationSeconds,
          sizeBytes: video.sizeBytes,
          hasAudio: null,
          ready: true,
          warnings: [],
        });
        if (!titre) setTitre(video.originalName.replace(/\.[^/.]+$/, ''));
      }
    }
  };

  const handleImport = async () => {
    try {
      setImporting(true);
      setError(null);
      if (isPhotoType) {
        const results = await unwrap(api.files.importMedia());
        applyImportResults(results);
      } else {
        const result = await unwrap(api.files.importVideo());
        if (result) {
          setVideoPath(result.videoPath);
          setThumbnailPath(result.thumbnailPath);
          setValidation(result.validation);
          if (!titre) setTitre(result.originalName.replace(/\.[^/.]+$/, ''));
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setImporting(false);
    }
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const files = Array.from(e.dataTransfer.files ?? []);
    if (files.length === 0) return;
    try {
      setImporting(true);
      setError(null);
      const paths = files.map((file) => api.getFilePath(file)).filter(Boolean);
      const results = await unwrap(api.files.importFromPaths(paths));
      applyImportResults(results);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setImporting(false);
    }
  };

  const buildInput = () => ({
    compteId,
    type,
    titre: titre.trim(),
    description,
    hashtags,
    videoPath: videoPath ?? '',
    photoPaths: photos.map((p) => p.mediaPath),
    thumbnailPath,
    visibilite,
    scheduledAt: combineDateAndTime(date, time),
    reminderLeadMinutes: reminderLeadMinutes ? Number(reminderLeadMinutes) : null,
  });

  const persistAndMaybePublish = async () => {
    const input = buildInput();
    try {
      setSaving(true);
      setError(null);
      let savedId = id;
      if (isEditing && id) {
        await update(id, input);
      } else {
        const created = await create(input);
        savedId = created.id;
      }
      if (publishNowChecked && savedId) {
        try {
          await publishNow(savedId);
        } catch (err) {
          setError(`${t('planning.publishFailed')} : ${err instanceof Error ? err.message : String(err)}`);
          navigate('/historique');
          return;
        }
      }
      navigate(publishNowChecked ? '/historique' : '/');
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSaving(false);
      setConfirmOpen(false);
    }
  };

  const handleSave = () => {
    if (!compteId) {
      setError(t('planning.selectAccount'));
      return;
    }
    if (isPhotoType && photos.length === 0) {
      setError(t('planning.addMedia'));
      return;
    }
    if (needsVideo && !videoPath) {
      setError(t('planning.importRequired'));
      return;
    }
    if (!titre.trim()) {
      setError(t('planning.titleRequired'));
      return;
    }
    if (publishNowChecked) {
      setConfirmOpen(true);
      return;
    }
    void persistAndMaybePublish();
  };

  const handleCancelPublication = async () => {
    if (!id) return;
    await cancel(id);
    navigate('/historique');
  };

  const videoUrl = toAppMediaUrl(videoPath);

  const suggestedHashtagSets: Record<string, string[]> = {
    tiktok: ['tiktok', 'tips', 'foryou'],
    youtube: ['youtube', 'shorts', 'tips'],
  };
  const suggestedHashtags = suggestedHashtagSets[plateforme];

  const suggestions = [
    t('planning.suggestion1', { title: titre || t('planning.suggestionFallback') }),
    t('planning.suggestion2', { title: titre || t('planning.suggestionContent') }),
    t('planning.suggestion3', { title: titre || t('planning.suggestionMethod') }),
  ];

  if (accounts.length === 0) {
    return (
      <div>
        <div className="page-header">
          <h1 className="page-title">{t('planning.titleNew')}</h1>
        </div>
        <div className="empty-state card">
          <div className="icon">👤</div>
          <p>{t('planning.noAccount')}</p><Button onClick={() => navigate('/comptes')}>{t('planning.goAccounts')}</Button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">{isEditing ? t('planning.titleEdit') : t('planning.titleNew')}</h1><p className="page-subtitle">{t('planning.subtitle')}</p>
        </div>
      </div>

      <div className="card" style={{ maxWidth: 720 }}>
        {error && <p style={{ color: 'var(--color-danger)' }}>{error}</p>}

        {type === 'story' && (
          <div className="notice notice-warning">{t('planning.storyUnavailable')}</div>
        )}
        {plateforme === 'tiktok' && type !== 'story' && (
          <div className="notice notice-info">{t('planning.tiktokUnauditedWarning')}</div>
        )}

        <div className="form-row">
          <div className="field">
            <label htmlFor="type">{t('planning.contentType')}</label>
            <select id="type" className="select" value={type} onChange={(e) => setType(e.target.value as TypeContenu)}>
              {availableTypes.map((typeValue) => (
                <option key={typeValue} value={typeValue}>{t(TYPE_KEYS[typeValue])}</option>
              ))}
            </select>
          </div>
          <div className="field">
            <label htmlFor="compte">{t('planning.account')}</label>
            <select id="compte" className="select" value={compteId} onChange={(e) => setCompteId(e.target.value)}>
              {accounts.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.nom} — {t(PLATEFORME_LABELS[a.plateforme])} ({handleFor(a)})
                </option>
              ))}
            </select>
          </div>
        </div>

        {isPhotoType ? (
          <div className="field">
            <label>{t('planning.media')} ({photos.length}/{MAX_PHOTOS})</label>
            <div
              ref={dropRef}
              className={`drop-zone${dragOver ? ' is-dragover' : ''}`}
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
            >
              <p>{t('planning.dropHint')}</p>
              <Button variant="secondary" onClick={handleImport} disabled={importing}>
                {importing ? t('planning.importing') : t('planning.addMedia')}
              </Button>
            </div>
            {photos.length > 0 && (
              <div className="media-grid">
                {photos.map((photo) => (
                  <figure key={photo.mediaPath} className="media-card">
                    <img src={toAppMediaUrl(photo.thumbnailPath ?? photo.mediaPath) || undefined} alt={photo.originalName} />
                    <figcaption>
                      <span className="media-name" title={photo.originalName}>{photo.originalName}</span>
                      <span className="media-meta">
                        JPG/PNG/WEBP · {formatBytes(photo.sizeBytes)}
                        {photo.width && photo.height ? ` · ${photo.width}×${photo.height}` : ''}
                      </span>
                    </figcaption>
                    <button
                      type="button"
                      className="media-remove"
                      title={t('planning.removeMedia')}
                      onClick={() => setPhotos((prev) => prev.filter((p) => p.mediaPath !== photo.mediaPath))}
                    >
                      ×
                    </button>
                  </figure>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className="field">
            <label>{needsVideo ? t('planning.video') : t('planning.media')}</label>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              {videoUrl ? (
                <video src={videoUrl} style={{ width: 120, height: 160, objectFit: 'cover', borderRadius: 8, background: '#000' }} muted />
              ) : (
                <VideoThumbnail thumbnailPath={null} alt={t('planning.noVideo')} className="thumb-sm" />
              )}
              <Button variant="secondary" onClick={handleImport} disabled={importing}>
                {importing ? t('planning.importing') : videoPath ? t('planning.changeVideo') : t('planning.import')}
              </Button>
            </div>
          </div>
        )}

        {validation && !isPhotoType && (
          <div className={`video-readiness ${validation.ready ? 'is-ready' : 'has-warnings'}`}>
            <strong>{validation.ready ? t('planning.ready') : t('planning.checks')}</strong>
            <span>{validation.width ?? '?'} × {validation.height ?? '?'} · {validation.durationSeconds?.toFixed(1) ?? '?'} s · {(validation.sizeBytes / 1048576).toFixed(1)} MB</span>
            {validation.warnings.map((warning) => <span key={warning}>• {warning}</span>)}
          </div>
        )}

        {!isPhotoType && (
          <div className="field">
            <label htmlFor="titre">{t('planning.title')}</label><input id="titre" className="input" value={titre} onChange={(e) => setTitre(e.target.value)} placeholder={t('planning.titlePlaceholder')} />
          </div>
        )}
        {isPhotoType && (
          <div className="field">
            <label htmlFor="titre-photo">{t('planning.title')}</label><input id="titre-photo" className="input" value={titre} onChange={(e) => setTitre(e.target.value)} placeholder={t('planning.titlePlaceholder')} />
          </div>
        )}

        <div className="field">
          <label htmlFor="description">{t('planning.description')}</label>
          <textarea
            id="description"
            className="textarea"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder={t('planning.descriptionPlaceholder')}
          />
          <div className="content-assistant">
            <strong>{t('planning.assistant')}</strong>
            {suggestions.map((suggestion) => (
              <button key={suggestion} type="button" onClick={() => setDescription(suggestion)}>{suggestion}</button>
            ))}
            <button type="button" onClick={() => setHashtags(Array.from(new Set([...hashtags, ...suggestedHashtags])))}>{t('planning.suggestHashtags')}</button>
          </div>
        </div>

        <div className="field">
          <label>{t('planning.hashtags')}</label>
          <TagInput value={hashtags} onChange={setHashtags} />
        </div>

        <div className="field">
          <label htmlFor="visibilite">{t('planning.visibility')}</label>
          <select
            id="visibilite"
            className="select"
            value={visibilite ?? ''}
            onChange={(e) => setVisibilite((e.target.value || null) as Visibilite | null)}
          >
            {allowedVisibilites.map((v) => (
              <option key={v} value={v}>{t(`visibility.${v}` as TranslationKey)}</option>
            ))}
          </select>
        </div>

        <div className="field">
          <label>{t('planning.schedule')}</label>
          <div className="radio-row">
            <label className="radio-option">
              <input
                type="radio"
                name="publish-mode"
                checked={!publishNowChecked}
                onChange={() => setPublishNowChecked(false)}
              />
              <span>{t('planning.schedule')}</span>
            </label>
            <label className="radio-option">
              <input
                type="radio"
                name="publish-mode"
                checked={publishNowChecked}
                onChange={() => setPublishNowChecked(true)}
              />
              <span>{t('planning.publishNow')}</span>
            </label>
          </div>
        </div>

        <div className="form-row">
          <div className="field">
            <label htmlFor="date">{t('planning.date')}</label>
            <input id="date" type="date" className="input" value={date} onChange={(e) => setDate(e.target.value)} />
          </div>
          <div className="field">
            <label htmlFor="time">{t('planning.time')}</label>
            <input id="time" type="time" className="input" value={time} onChange={(e) => setTime(e.target.value)} />
          </div>
        </div>

        <div className="field">
          <label htmlFor="reminder">{t('planning.customReminder')}</label>
          <input
            id="reminder"
            type="number"
            min={0}
            className="input"
            value={reminderLeadMinutes}
            onChange={(e) => setReminderLeadMinutes(e.target.value)}
            placeholder={t('planning.reminderPlaceholder')}
          />
        </div>

        <div className="modal-actions" style={{ marginTop: 8 }}>
          {isEditing && (
            <Button variant="danger" onClick={handleCancelPublication} disabled={saving}>
              {t('planning.cancelPublication')}
            </Button>
          )}
          <Button variant="secondary" onClick={() => navigate(-1)} disabled={saving}>
            {t('common.back')}
          </Button>
          <Button variant="primary" onClick={handleSave} disabled={saving}>
            {saving ? t('common.saving') : publishNowChecked ? t('planning.publishNow') : t('common.save')}
          </Button>
        </div>
      </div>

      {confirmOpen && selectedAccount && (
        <ConfirmDialog
          title={t('planning.confirmUploadTitle')}
          message={t('planning.confirmUploadBody', { platform: t(PLATEFORME_LABELS[selectedAccount.plateforme]) })}
          confirmLabel={t('planning.publishNow')}
          onConfirm={() => void persistAndMaybePublish()}
          onCancel={() => setConfirmOpen(false)}
        />
      )}
    </div>
  );
}
