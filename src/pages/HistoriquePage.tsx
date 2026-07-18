import { useEffect, useState } from 'react';
import type { Publication, StatutPublication } from '@shared/types';
import { useAccounts } from '../context/AccountsContext';
import { usePublications } from '../context/PublicationsContext';
import Badge from '../components/Badge';
import VideoThumbnail from '../components/VideoThumbnail';
import PhoneFramePreview from '../components/PhoneFramePreview';
import { formatDateShort } from '../lib/dateUtils';
import { STATUT_COLORS, STATUT_KEYS, TYPE_KEYS } from '../lib/statusLabels';
import { api } from '../lib/ipc';
import { useI18n } from '../context/I18nContext';

export default function HistoriquePage() {
  const { t, locale } = useI18n();
  const { accounts, getById: getAccountById } = useAccounts();
  const { listHistorique, markPublished, cancel } = usePublications();
  const [compteId, setCompteId] = useState('');
  const [statut, setStatut] = useState<StatutPublication | ''>('');
  const [dateDebut, setDateDebut] = useState('');
  const [dateFin, setDateFin] = useState('');
  const [rows, setRows] = useState<Publication[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [previewing, setPreviewing] = useState<Publication | null>(null);

  const load = async () => {
    try {
      setLoading(true);
      setError(null);
      const endExclusive = dateFin ? new Date(`${dateFin}T00:00:00`) : null;
      if (endExclusive) endExclusive.setDate(endExclusive.getDate() + 1);
      const data = await listHistorique({
        compteId: compteId || undefined,
        statut: statut || undefined,
        dateDebut: dateDebut ? new Date(`${dateDebut}T00:00:00`).toISOString() : undefined,
        dateFin: endExclusive?.toISOString(),
      });
      setRows(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setRows([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [compteId, statut, dateDebut, dateFin]);

  const handlePublish = async () => {
    await api.shell.openTiktokUpload();
  };

  const handleMarkPublished = async () => {
    if (!previewing) return;
    await markPublished(previewing.id);
    setPreviewing(null);
    load();
  };

  const handleCancel = async () => {
    if (!previewing) return;
    await cancel(previewing.id);
    setPreviewing(null);
    load();
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">{t('history.title')}</h1>
          <p className="page-subtitle">{t('history.subtitle')}</p>
        </div>
      </div>

      <div className="card">
        <div className="filters-bar">
          <div className="field" style={{ marginBottom: 0 }}>
            <label>{t('planning.account')}</label>
            <select className="select" value={compteId} onChange={(e) => setCompteId(e.target.value)}>
              <option value="">{t('history.allAccounts')}</option>
              {accounts.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.nom}
                </option>
              ))}
            </select>
          </div>
          <div className="field" style={{ marginBottom: 0 }}>
            <label>{t('history.status')}</label>
            <select className="select" value={statut} onChange={(e) => setStatut(e.target.value as StatutPublication | '')}>
              <option value="">{t('history.defaultStatuses')}</option>
              <option value="publie">{t('status.published')}</option><option value="manque">{t('status.missed')}</option><option value="annule">{t('status.cancelled')}</option><option value="planifie">{t('status.scheduled')}</option><option value="rappel_envoye">{t('status.reminderSent')}</option>
            </select>
          </div>
          <div className="field" style={{ marginBottom: 0 }}>
            <label>{t('history.from')}</label>
            <input type="date" className="input" value={dateDebut} onChange={(e) => setDateDebut(e.target.value)} />
          </div>
          <div className="field" style={{ marginBottom: 0 }}>
            <label>{t('history.to')}</label>
            <input type="date" className="input" value={dateFin} onChange={(e) => setDateFin(e.target.value)} />
          </div>
        </div>

        {loading && <div className="loading-state">{t('common.loading')}</div>}
        {error && <p style={{ color: 'var(--color-danger)' }}>{error}</p>}

        {!loading && rows.length === 0 && (
          <div className="empty-state">
            <div className="icon">🕓</div>
            <p>{t('history.empty')}</p>
          </div>
        )}

        {!loading && rows.length > 0 && (
          <table className="data-table">
            <thead>
              <tr>
                <th></th>
                <th>{t('history.titleColumn')}</th><th>{t('planning.account')}</th><th>{t('history.type')}</th><th>{t('history.scheduledDate')}</th><th>{t('history.publishedDate')}</th><th>{t('history.status')}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((p) => {
                const compte = getAccountById(p.compteId);
                return (
                  <tr key={p.id} onClick={() => setPreviewing(p)} style={{ cursor: 'pointer' }}>
                    <td>
                      <VideoThumbnail thumbnailPath={p.thumbnailPath} alt={p.titre} />
                    </td>
                    <td>{p.titre}</td>
                    <td>{compte ? compte.nom : '—'}</td>
                    <td>{t(TYPE_KEYS[p.type])}</td>
                    <td>{formatDateShort(p.scheduledAt, locale)}</td>
                    <td>{p.publishedAt ? formatDateShort(p.publishedAt, locale) : t('common.none')}</td>
                    <td>
                      <Badge label={t(STATUT_KEYS[p.statut])} color={STATUT_COLORS[p.statut]} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {previewing && (
        <PhoneFramePreview
          publication={previewing}
          compte={getAccountById(previewing.compteId)}
          onClose={() => setPreviewing(null)}
          onPublish={handlePublish}
          onMarkPublished={handleMarkPublished}
          onCancel={handleCancel}
        />
      )}
    </div>
  );
}
