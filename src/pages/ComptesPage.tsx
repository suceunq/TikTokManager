import { useState } from 'react';
import type { Compte, NouveauCompte } from '@shared/types';
import { useAccounts } from '../context/AccountsContext';
import { usePublications } from '../context/PublicationsContext';
import Button from '../components/Button';
import Modal from '../components/Modal';
import ConfirmDialog from '../components/ConfirmDialog';

const PRESET_COLORS = ['#FE2C55', '#25F4EE', '#3B82F6', '#22C55E', '#F59E0B', '#A855F7', '#EC4899', '#6B7280'];

function AccountForm({
  initial,
  onSubmit,
  onCancel,
}: {
  initial?: Compte;
  onSubmit: (input: NouveauCompte) => Promise<void>;
  onCancel: () => void;
}) {
  const [nom, setNom] = useState(initial?.nom ?? '');
  const [pseudoTiktok, setPseudoTiktok] = useState(initial?.pseudoTiktok ?? '');
  const [couleur, setCouleur] = useState(initial?.couleur ?? PRESET_COLORS[0]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    if (!nom.trim() || !pseudoTiktok.trim()) {
      setError('Le nom et le pseudo TikTok sont obligatoires.');
      return;
    }
    try {
      setSaving(true);
      setError(null);
      await onSubmit({ nom: nom.trim(), pseudoTiktok: pseudoTiktok.trim(), couleur });
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      title={initial ? 'Modifier le compte' : 'Nouveau compte'}
      onClose={onCancel}
      actions={
        <>
          <Button variant="secondary" onClick={onCancel} disabled={saving}>
            Annuler
          </Button>
          <Button variant="primary" onClick={handleSubmit} disabled={saving}>
            {saving ? 'Enregistrement...' : 'Enregistrer'}
          </Button>
        </>
      }
    >
      {error && <p style={{ color: 'var(--color-danger)', marginTop: 0 }}>{error}</p>}
      <div className="field">
        <label htmlFor="nom">Nom du compte</label>
        <input id="nom" className="input" value={nom} onChange={(e) => setNom(e.target.value)} placeholder="Ex. Compte principal" />
      </div>
      <div className="field">
        <label htmlFor="pseudo">Pseudo TikTok</label>
        <input
          id="pseudo"
          className="input"
          value={pseudoTiktok}
          onChange={(e) => setPseudoTiktok(e.target.value)}
          placeholder="@monpseudo"
        />
      </div>
      <div className="field">
        <label>Couleur</label>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          {PRESET_COLORS.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setCouleur(c)}
              style={{
                width: 28,
                height: 28,
                borderRadius: '50%',
                background: c,
                border: couleur === c ? '3px solid var(--color-text)' : '1px solid var(--color-border)',
                cursor: 'pointer',
              }}
              aria-label={`Choisir la couleur ${c}`}
            />
          ))}
          <input type="color" value={couleur} onChange={(e) => setCouleur(e.target.value)} style={{ width: 36, height: 28 }} />
        </div>
      </div>
    </Modal>
  );
}

export default function ComptesPage() {
  const { accounts, loading, error, create, update, remove } = useAccounts();
  const { publications } = usePublications();
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Compte | null>(null);
  const [deleting, setDeleting] = useState<Compte | null>(null);

  const publicationCountFor = (compteId: string) =>
    publications.filter((p) => p.compteId === compteId).length;

  const handleCreate = async (input: NouveauCompte) => {
    await create(input);
    setShowForm(false);
  };

  const handleUpdate = async (input: NouveauCompte) => {
    if (!editing) return;
    await update(editing.id, input);
    setEditing(null);
  };

  const handleDelete = async () => {
    if (!deleting) return;
    await remove(deleting.id);
    setDeleting(null);
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Comptes</h1>
          <p className="page-subtitle">Gérez vos profils TikTok pour organiser vos publications.</p>
        </div>
        <Button onClick={() => setShowForm(true)}>+ Nouveau compte</Button>
      </div>

      {loading && <div className="loading-state">Chargement des comptes...</div>}
      {error && <p style={{ color: 'var(--color-danger)' }}>{error}</p>}

      {!loading && accounts.length === 0 && (
        <div className="empty-state card">
          <div className="icon">👤</div>
          <p>Aucun compte pour le moment. Créez votre premier compte pour commencer à planifier.</p>
        </div>
      )}

      <div className="accounts-grid">
        {accounts.map((compte) => (
          <div className="card account-card" key={compte.id}>
            <div className="account-card-top">
              <div className="account-swatch" style={{ background: compte.couleur }}>
                {compte.nom.charAt(0).toUpperCase()}
              </div>
              <div className="account-info">
                <div className="account-name">{compte.nom}</div>
                <div className="account-handle">{compte.pseudoTiktok}</div>
              </div>
            </div>
            <div className="account-meta-row">
              <span className="account-handle">{publicationCountFor(compte.id)} publication(s)</span>
              <div className="account-actions">
                <Button variant="ghost" size="sm" onClick={() => setEditing(compte)}>
                  Modifier
                </Button>
                <Button variant="danger" size="sm" onClick={() => setDeleting(compte)}>
                  Supprimer
                </Button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {showForm && <AccountForm onSubmit={handleCreate} onCancel={() => setShowForm(false)} />}
      {editing && (
        <AccountForm initial={editing} onSubmit={handleUpdate} onCancel={() => setEditing(null)} />
      )}
      {deleting && (
        <ConfirmDialog
          title="Supprimer le compte"
          message={
            publicationCountFor(deleting.id) > 0
              ? `Ce compte a ${publicationCountFor(deleting.id)} publication(s) associée(s). Elles seront également supprimées. Continuer ?`
              : `Voulez-vous vraiment supprimer le compte "${deleting.nom}" ?`
          }
          confirmLabel="Supprimer"
          danger
          onConfirm={handleDelete}
          onCancel={() => setDeleting(null)}
        />
      )}
    </div>
  );
}
