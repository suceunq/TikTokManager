import { useEffect, useState } from 'react';
import type { Publication, StatutPublication } from '@shared/types';
import { useAccounts } from '../context/AccountsContext';
import { usePublications } from '../context/PublicationsContext';
import Badge from '../components/Badge';
import VideoThumbnail from '../components/VideoThumbnail';
import PhoneFramePreview from '../components/PhoneFramePreview';
import { formatDateShort } from '../lib/dateUtils';
import { STATUT_COLORS, STATUT_LABELS, TYPE_LABELS } from '../lib/statusLabels';
import { api } from '../lib/ipc';

export default function HistoriquePage() {
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
          <h1 className="page-title">Historique</h1>
          <p className="page-subtitle">Retrouvez toutes vos publications passées.</p>
        </div>
      </div>

      <div className="card">
        <div className="filters-bar">
          <div className="field" style={{ marginBottom: 0 }}>
            <label>Compte</label>
            <select className="select" value={compteId} onChange={(e) => setCompteId(e.target.value)}>
              <option value="">Tous les comptes</option>
              {accounts.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.nom}
                </option>
              ))}
            </select>
          </div>
          <div className="field" style={{ marginBottom: 0 }}>
            <label>Statut</label>
            <select className="select" value={statut} onChange={(e) => setStatut(e.target.value as StatutPublication | '')}>
              <option value="">Publié / Manqué / Annulé</option>
              <option value="publie">Publié</option>
              <option value="manque">Manqué</option>
              <option value="annule">Annulé</option>
              <option value="planifie">Planifié</option>
              <option value="rappel_envoye">Rappel envoyé</option>
            </select>
          </div>
          <div className="field" style={{ marginBottom: 0 }}>
            <label>Du</label>
            <input type="date" className="input" value={dateDebut} onChange={(e) => setDateDebut(e.target.value)} />
          </div>
          <div className="field" style={{ marginBottom: 0 }}>
            <label>Au</label>
            <input type="date" className="input" value={dateFin} onChange={(e) => setDateFin(e.target.value)} />
          </div>
        </div>

        {loading && <div className="loading-state">Chargement...</div>}
        {error && <p style={{ color: 'var(--color-danger)' }}>{error}</p>}

        {!loading && rows.length === 0 && (
          <div className="empty-state">
            <div className="icon">🕓</div>
            <p>Aucune publication ne correspond à ces filtres.</p>
          </div>
        )}

        {!loading && rows.length > 0 && (
          <table className="data-table">
            <thead>
              <tr>
                <th></th>
                <th>Titre</th>
                <th>Compte</th>
                <th>Type</th>
                <th>Date planifiée</th>
                <th>Date publiée</th>
                <th>Statut</th>
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
                    <td>{TYPE_LABELS[p.type]}</td>
                    <td>{formatDateShort(p.scheduledAt)}</td>
                    <td>{p.publishedAt ? formatDateShort(p.publishedAt) : '—'}</td>
                    <td>
                      <Badge label={STATUT_LABELS[p.statut]} color={STATUT_COLORS[p.statut]} />
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
