import { useEffect, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import type { TypeContenu } from '@shared/types';
import { useAccounts } from '../context/AccountsContext';
import { usePublications } from '../context/PublicationsContext';
import { api, unwrap } from '../lib/ipc';
import { toAppMediaUrl } from '../lib/mediaUrl';
import { toDateInputValue, toTimeInputValue, combineDateAndTime } from '../lib/dateUtils';
import Button from '../components/Button';
import TagInput from '../components/TagInput';
import VideoThumbnail from '../components/VideoThumbnail';

function nowPlusMinutes(minutes: number): { date: string; time: string } {
  const d = new Date(Date.now() + minutes * 60_000);
  const iso = d.toISOString();
  return { date: toDateInputValue(iso), time: toTimeInputValue(iso) };
}

export default function PlanificationFormPage() {
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
      setError('Sélectionnez un compte.');
      return;
    }
    if (!videoPath) {
      setError('Importez une vidéo.');
      return;
    }
    if (!titre.trim()) {
      setError('Le titre est obligatoire.');
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

  if (accounts.length === 0) {
    return (
      <div>
        <div className="page-header">
          <h1 className="page-title">Planifier une publication</h1>
        </div>
        <div className="empty-state card">
          <div className="icon">👤</div>
          <p>Créez d'abord un compte dans la page "Comptes" avant de planifier une publication.</p>
          <Button onClick={() => navigate('/comptes')}>Aller aux comptes</Button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">{isEditing ? 'Modifier la publication' : 'Nouvelle publication'}</h1>
          <p className="page-subtitle">Importez une vidéo, complétez les informations et planifiez la date de publication.</p>
        </div>
      </div>

      <div className="card" style={{ maxWidth: 720 }}>
        {error && <p style={{ color: 'var(--color-danger)' }}>{error}</p>}

        <div className="field">
          <label>Vidéo</label>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            {videoUrl ? (
              <video src={videoUrl} style={{ width: 120, height: 160, objectFit: 'cover', borderRadius: 8, background: '#000' }} muted />
            ) : (
              <VideoThumbnail thumbnailPath={null} alt="Aucune vidéo" className="thumb-sm" />
            )}
            <Button variant="secondary" onClick={handleImport} disabled={importing}>
              {importing ? 'Import en cours...' : videoPath ? 'Changer la vidéo' : 'Importer une vidéo'}
            </Button>
          </div>
        </div>

        <div className="form-row">
          <div className="field">
            <label htmlFor="type">Type de contenu</label>
            <select id="type" className="select" value={type} onChange={(e) => setType(e.target.value as TypeContenu)}>
              <option value="video">Vidéo</option>
              <option value="story">Story</option>
            </select>
          </div>
          <div className="field">
            <label htmlFor="compte">Compte</label>
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
          <label htmlFor="titre">Titre</label>
          <input id="titre" className="input" value={titre} onChange={(e) => setTitre(e.target.value)} placeholder="Titre de la vidéo" />
        </div>

        <div className="field">
          <label htmlFor="description">Description / légende</label>
          <textarea
            id="description"
            className="textarea"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Décrivez votre contenu..."
          />
        </div>

        <div className="field">
          <label>Hashtags</label>
          <TagInput value={hashtags} onChange={setHashtags} />
        </div>

        <div className="form-row">
          <div className="field">
            <label htmlFor="date">Date de publication</label>
            <input id="date" type="date" className="input" value={date} onChange={(e) => setDate(e.target.value)} />
          </div>
          <div className="field">
            <label htmlFor="time">Heure de publication</label>
            <input id="time" type="time" className="input" value={time} onChange={(e) => setTime(e.target.value)} />
          </div>
        </div>

        <div className="field">
          <label htmlFor="reminder">Rappel personnalisé (minutes avant, optionnel)</label>
          <input
            id="reminder"
            type="number"
            min={0}
            className="input"
            value={reminderLeadMinutes}
            onChange={(e) => setReminderLeadMinutes(e.target.value)}
            placeholder="Utiliser le délai par défaut des paramètres"
          />
        </div>

        <div className="modal-actions" style={{ marginTop: 8 }}>
          {isEditing && (
            <Button variant="danger" onClick={handleCancelPublication} disabled={saving}>
              Annuler la publication
            </Button>
          )}
          <Button variant="secondary" onClick={() => navigate(-1)} disabled={saving}>
            Retour
          </Button>
          <Button variant="primary" onClick={handleSave} disabled={saving}>
            {saving ? 'Enregistrement...' : 'Enregistrer'}
          </Button>
        </div>
      </div>
    </div>
  );
}
