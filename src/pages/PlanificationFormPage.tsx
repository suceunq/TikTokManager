import { useEffect, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import type { TypeContenu, ValidationVideo } from '@shared/types';
import { useAccounts } from '../context/AccountsContext';
import { usePublications } from '../context/PublicationsContext';
import { api, unwrap } from '../lib/ipc';
import { toAppMediaUrl } from '../lib/mediaUrl';
import { toDateInputValue, toTimeInputValue, combineDateAndTime } from '../lib/dateUtils';
import Button from '../components/Button';
import TagInput from '../components/TagInput';
import VideoThumbnail from '../components/VideoThumbnail';
import { useI18n } from '../context/I18nContext';

function nowPlusMinutes(minutes: number): { date: string; time: string } {
  const d = new Date(Date.now() + minutes * 60_000);
  const iso = d.toISOString();
  return { date: toDateInputValue(iso), time: toTimeInputValue(iso) };
}

export default function PlanificationFormPage() {
  const { t } = useI18n();
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { accounts } = useAccounts();
  const { getById, create, update, cancel } = usePublications();

  const editingPublication = id ? getById(id) : undefined;
  const isEditing = Boolean(id);

  const prefillIso = (location.state as { date?: string } | null)?.date;
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
  const [date, setDate] = useState(defaultDateTime.date);
  const [time, setTime] = useState(defaultDateTime.time);
  const [reminderLeadMinutes, setReminderLeadMinutes] = useState<string>('');
  const [importing, setImporting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (editingPublication) {
      setCompteId(editingPublication.compteId);
      setType(editingPublication.type);
      setTitre(editingPublication.titre);
      setDescription(editingPublication.description);
      setHashtags(editingPublication.hashtags);
      setVideoPath(editingPublication.videoPath);
      setThumbnailPath(editingPublication.thumbnailPath);
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

  const handleImport = async () => {
    try {
      setImporting(true);
      setError(null);
      const result = await unwrap(api.files.importVideo());
      if (result) {
        setVideoPath(result.videoPath);
        setThumbnailPath(result.thumbnailPath);
        setValidation(result.validation);
        if (!titre) setTitre(result.originalName.replace(/\.[^/.]+$/, ''));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setImporting(false);
    }
  };

  const handleSave = async () => {
    if (!compteId) {
      setError(t('planning.selectAccount'));
      return;
    }
    if (!videoPath) {
      setError(t('planning.importRequired'));
      return;
    }
    if (!titre.trim()) {
      setError(t('planning.titleRequired'));
      return;
    }

    const scheduledAt = combineDateAndTime(date, time);
    const input = {
      compteId,
      type,
      titre: titre.trim(),
      description,
      hashtags,
      videoPath,
      thumbnailPath,
      scheduledAt,
      reminderLeadMinutes: reminderLeadMinutes ? Number(reminderLeadMinutes) : null,
    };

    try {
      setSaving(true);
      setError(null);
      if (isEditing && id) {
        await update(id, input);
      } else {
        await create(input);
      }
      navigate('/');
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSaving(false);
    }
  };

  const handleCancelPublication = async () => {
    if (!id) return;
    await cancel(id);
    navigate('/historique');
  };

  const videoUrl = toAppMediaUrl(videoPath);
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

        <div className="field">
          <label>{t('planning.video')}</label>
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

        {validation && (
          <div className={`video-readiness ${validation.ready ? 'is-ready' : 'has-warnings'}`}>
            <strong>{validation.ready ? t('planning.ready') : t('planning.checks')}</strong>
            <span>{validation.width ?? '?'} × {validation.height ?? '?'} · {validation.durationSeconds?.toFixed(1) ?? '?'} s · {(validation.sizeBytes / 1048576).toFixed(1)} MB</span>
            {validation.warnings.map((warning) => <span key={warning}>• {warning}</span>)}
          </div>
        )}

        <div className="form-row">
          <div className="field">
            <label htmlFor="type">{t('planning.contentType')}</label>
            <select id="type" className="select" value={type} onChange={(e) => setType(e.target.value as TypeContenu)}>
              <option value="video">{t('type.video')}</option><option value="story">{t('type.story')}</option>
            </select>
          </div>
          <div className="field">
            <label htmlFor="compte">{t('planning.account')}</label>
            <select id="compte" className="select" value={compteId} onChange={(e) => setCompteId(e.target.value)}>
              {accounts.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.nom} ({a.pseudoTiktok})
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="field">
          <label htmlFor="titre">{t('planning.title')}</label><input id="titre" className="input" value={titre} onChange={(e) => setTitre(e.target.value)} placeholder={t('planning.titlePlaceholder')} />
        </div>

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
            <button type="button" onClick={() => setHashtags(Array.from(new Set([...hashtags, 'tiktok', 'tips', 'foryou'])))}>{t('planning.suggestHashtags')}</button>
          </div>
        </div>

        <div className="field">
          <label>{t('planning.hashtags')}</label>
          <TagInput value={hashtags} onChange={setHashtags} />
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
            {saving ? t('common.saving') : t('common.save')}
          </Button>
        </div>
      </div>
    </div>
  );
}
