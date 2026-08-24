import { useCallback, useEffect, useState } from 'react';
import type { Compte, Connexion, NouveauCompte, Plateforme } from '@shared/types';
import { useAccounts } from '../context/AccountsContext';
import { usePublications } from '../context/PublicationsContext';
import { api, unwrap } from '../lib/ipc';
import Button from '../components/Button';
import Modal from '../components/Modal';
import ConfirmDialog from '../components/ConfirmDialog';
import Badge from '../components/Badge';
import { PLATEFORME_LABELS, PLATEFORME_COLORS } from '../lib/statusLabels';
import { handleFor } from '@shared/compte';
import { useI18n } from '../context/I18nContext';

const PRESET_COLORS = ['#FE2C55', '#25F4EE', '#FF0000', '#3B82F6', '#22C55E', '#F59E0B', '#A855F7', '#EC4899', '#6B7280'];

function AccountForm({
  initial,
  onSubmit,
  onCancel,
}: {
  initial?: Compte;
  onSubmit: (input: NouveauCompte) => Promise<void>;
  onCancel: () => void;
}) {
  const { t } = useI18n();
  const [nom, setNom] = useState(initial?.nom ?? '');
  const [plateforme, setPlateforme] = useState<'tiktok' | 'youtube'>(initial?.plateforme ?? 'tiktok');
  const [pseudoTiktok, setPseudoTiktok] = useState(initial?.pseudoTiktok ?? '');
  const [chaineYoutube, setChaineYoutube] = useState(initial?.chaineYoutube ?? '');
  const [couleur, setCouleur] = useState(initial?.couleur ?? PRESET_COLORS[0]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    if (!nom.trim()) {
      setError(t('accounts.required'));
      return;
    }
    if (plateforme === 'tiktok' && !pseudoTiktok.trim()) {
      setError(t('accounts.required'));
      return;
    }
    if (plateforme === 'youtube' && !chaineYoutube.trim()) {
      setError(t('accounts.requiredYoutube'));
      return;
    }
    try {
      setSaving(true);
      setError(null);
      await onSubmit({
        nom: nom.trim(),
        plateforme,
        pseudoTiktok: plateforme === 'tiktok' ? pseudoTiktok.trim() : '',
        chaineYoutube: plateforme === 'youtube' ? chaineYoutube.trim() : '',
        couleur,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      title={initial ? t('accounts.editTitle') : t('accounts.newTitle')}
      onClose={onCancel}
      actions={
        <>
          <Button variant="secondary" onClick={onCancel} disabled={saving}>
            {t('common.cancel')}
          </Button>
          <Button variant="primary" onClick={handleSubmit} disabled={saving}>
            {saving ? t('common.saving') : t('common.save')}
          </Button>
        </>
      }
    >
      {error && <p style={{ color: 'var(--color-danger)', marginTop: 0 }}>{error}</p>}
      <div className="field">
        <label htmlFor="nom">{t('accounts.name')}</label>
        <input id="nom" className="input" value={nom} onChange={(e) => setNom(e.target.value)} placeholder={t('accounts.namePlaceholder')} />
      </div>
      <div className="field">
        <label htmlFor="plateforme">{t('accounts.platform')}</label>
        <select
          id="plateforme"
          className="select"
          value={plateforme}
          onChange={(e) => setPlateforme(e.target.value as 'tiktok' | 'youtube')}
        >
          <option value="tiktok">{t('platform.tiktok')}</option>
          <option value="youtube">{t('platform.youtube')}</option>
        </select>
      </div>
      {plateforme === 'tiktok' ? (
        <div className="field">
          <label htmlFor="pseudo">{t('accounts.handle')}</label>
          <input
            id="pseudo"
            className="input"
            value={pseudoTiktok}
            onChange={(e) => setPseudoTiktok(e.target.value)}
            placeholder={t('accounts.handlePlaceholder')}
          />
        </div>
      ) : (
        <div className="field">
          <label htmlFor="chaine">{t('accounts.handleYoutube')}</label>
          <input
            id="chaine"
            className="input"
            value={chaineYoutube}
            onChange={(e) => setChaineYoutube(e.target.value)}
            placeholder={t('accounts.handleYoutubePlaceholder')}
          />
        </div>
      )}
      <div className="field">
        <label>{t('accounts.color')}</label>
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
              aria-label={t('accounts.chooseColor', { color: c })}
            />
          ))}
          <input type="color" value={couleur} onChange={(e) => setCouleur(e.target.value)} style={{ width: 36, height: 28 }} />
        </div>
      </div>
    </Modal>
  );
}

export default function ComptesPage() {
  const { t } = useI18n();
  const { accounts, loading, error, create, update, remove } = useAccounts();
  const { publications } = usePublications();
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Compte | null>(null);
  const [deleting, setDeleting] = useState<Compte | null>(null);
  const [connexions, setConnexions] = useState<Record<string, Connexion>>({});
  const [connectingId, setConnectingId] = useState<string | null>(null);
  const [connexionError, setConnexionError] = useState<string | null>(null);

  const refreshConnexions = useCallback(async () => {
    try {
      setConnexions(await unwrap(api.connexions.list()));
    } catch {
      setConnexions({});
    }
  }, []);

  useEffect(() => {
    refreshConnexions();
  }, [refreshConnexions]);

  const handleConnect = async (compte: Compte) => {
    try {
      setConnectingId(compte.id);
      setConnexionError(null);
      const result = await unwrap(api.connexions.connect(compte.id));
      if (!result.ok) {
        setConnexionError(
          result.errorKey === 'connexion.missingCredentials'
            ? t('settings.credentialsMissing')
            : t('connexion.failed')
        );
        return;
      }
      await refreshConnexions();
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setConnexionError(
        message === 'credentials_missing' ? t('settings.credentialsMissing') : t('connexion.failed')
      );
    } finally {
      setConnectingId(null);
    }
  };

  const handleDisconnect = async (compte: Compte) => {
    try {
      setConnexionError(null);
      await unwrap(api.connexions.disconnect(compte.id));
      await refreshConnexions();
    } catch {
      setConnexionError(t('connexion.failed'));
    }
  };

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
          <h1 className="page-title">{t('accounts.title')}</h1>
          <p className="page-subtitle">{t('accounts.subtitle')}</p>
        </div>
        <Button onClick={() => setShowForm(true)}>+ {t('accounts.new')}</Button>
      </div>

      {loading && <div className="loading-state">{t('accounts.loading')}</div>}
      {error && <p style={{ color: 'var(--color-danger)' }}>{error}</p>}

      {!loading && accounts.length === 0 && (
        <div className="empty-state card">
          <div className="icon">👤</div>
          <p>{t('accounts.empty')}</p>
        </div>
      )}

      {connexionError && <p style={{ color: 'var(--color-danger)' }}>{connexionError}</p>}
      <p className="page-subtitle">{t('accounts.connectHelp')}</p>

      <div className="accounts-grid">
        {accounts.map((compte) => {
          const connexion = connexions[compte.id];
          const connected = Boolean(connexion?.connecte);
          return (
          <div className="card account-card" key={compte.id}>
            <div className="account-card-top">
              <div className="account-swatch" style={{ background: compte.couleur }}>
                {compte.nom.charAt(0).toUpperCase()}
              </div>
              <div className="account-info">
                <div className="account-name">{compte.nom}</div>
                <div className="account-handle">{handleFor(compte)}</div>
              </div>
              <Badge label={t(PLATEFORME_LABELS[compte.plateforme])} color={PLATEFORME_COLORS[compte.plateforme]} />
            </div>
            <div className="account-meta-row">
              <span
                className={`connexion-state ${connected ? 'is-connected' : 'is-disconnected'}`}
                title={connected ? connexion?.titreCompte ?? '' : t('accounts.connexionRequired')}
              >
                ● {connected ? t('accounts.connected') : t('accounts.notConnected')}
              </span>
              <div className="account-actions">
                {connected ? (
                  <Button variant="ghost" size="sm" onClick={() => handleDisconnect(compte)}>
                    {t('accounts.disconnect')}
                  </Button>
                ) : (
                  <Button variant="secondary" size="sm" disabled={connectingId === compte.id} onClick={() => handleConnect(compte)}>
                    {connectingId === compte.id ? t('accounts.connecting') : t('accounts.connect')}
                  </Button>
                )}
                <Button variant="ghost" size="sm" onClick={() => setEditing(compte)}>
                  {t('common.edit')}
                </Button>
                <Button variant="danger" size="sm" onClick={() => setDeleting(compte)}>
                  {t('common.delete')}
                </Button>
              </div>
            </div>
            <div className="account-meta-row">
              <span className="account-handle">{t('accounts.count', { count: publicationCountFor(compte.id) })}</span>
            </div>
          </div>
          );
        })}
      </div>

      {showForm && <AccountForm onSubmit={handleCreate} onCancel={() => setShowForm(false)} />}
      {editing && (
        <AccountForm initial={editing} onSubmit={handleUpdate} onCancel={() => setEditing(null)} />
      )}
      {deleting && (
        <ConfirmDialog
          title={t('accounts.deleteTitle')}
          message={
            publicationCountFor(deleting.id) > 0
              ? t('accounts.deleteWithPublications', { count: publicationCountFor(deleting.id) })
              : t('accounts.deleteConfirm', { name: deleting.nom })
          }
          confirmLabel={t('common.delete')}
          danger
          onConfirm={handleDelete}
          onCancel={() => setDeleting(null)}
        />
      )}
    </div>
  );
}
