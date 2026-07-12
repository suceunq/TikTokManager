import type { Compte, Publication } from '@shared/types';
import Modal from './Modal';
import Button from './Button';
import Badge from './Badge';
import { toAppMediaUrl } from '../lib/mediaUrl';
import { formatDateLong } from '../lib/dateUtils';
import { STATUT_COLORS, STATUT_LABELS, TYPE_LABELS } from '../lib/statusLabels';

interface PhoneFramePreviewProps {
  publication: Publication;
  compte: Compte | undefined;
  onClose: () => void;
  onPublish: () => void;
  onMarkPublished: () => void;
  onCancel?: () => void;
}

export default function PhoneFramePreview({
  publication,
  compte,
  onClose,
  onPublish,
  onMarkPublished,
  onCancel,
}: PhoneFramePreviewProps) {
  const videoUrl = toAppMediaUrl(publication.videoPath);
  const canPublish = publication.statut === 'planifie' || publication.statut === 'rappel_envoye';

  return (
    <Modal title="Aperçu de la publication" onClose={onClose} wide>
      <div className="phone-frame-wrapper">
        <div className="phone-frame">
          <div className="phone-frame-screen">
            {videoUrl ? (
              <video src={videoUrl} controls />
            ) : (
              <div style={{ color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
                Vidéo indisponible
              </div>
            )}
            <div className="phone-overlay-top">{TYPE_LABELS[publication.type]}</div>
            <div className="phone-overlay-bottom">
              <div className="phone-account-row">
                <span
                  style={{
                    width: 22,
                    height: 22,
                    borderRadius: '50%',
                    background: compte?.couleur ?? '#888',
                    display: 'inline-block',
                  }}
                />
                {compte ? compte.pseudoTiktok : 'Compte inconnu'}
              </div>
              <div className="phone-caption">{publication.titre}</div>
              {publication.hashtags.length > 0 && (
                <div className="phone-hashtags">{publication.hashtags.join(' ')}</div>
              )}
            </div>
            <div className="phone-side-rail">
              <span className="phone-side-icon">❤️</span>
              <span className="phone-side-icon">💬</span>
              <span className="phone-side-icon">↗️</span>
            </div>
          </div>
        </div>

        <div className="preview-panel">
          <div className="preview-meta-row">
            <Badge label={STATUT_LABELS[publication.statut]} color={STATUT_COLORS[publication.statut]} />
            <span className="page-subtitle" style={{ marginTop: 0 }}>
              {formatDateLong(publication.scheduledAt)}
            </span>
          </div>

          <div>
            <strong>Description</strong>
            <p style={{ marginTop: 4, color: 'var(--color-text-muted)' }}>
              {publication.description || 'Aucune description.'}
            </p>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {canPublish && (
              <Button variant="primary" onClick={onPublish}>
                Publier sur TikTok
              </Button>
            )}
            {canPublish && (
              <Button variant="secondary" onClick={onMarkPublished}>
                Marquer comme publié
              </Button>
            )}
            {canPublish && onCancel && (
              <Button variant="danger" onClick={onCancel}>
                Annuler la publication
              </Button>
            )}
          </div>
        </div>
      </div>
    </Modal>
  );
}
