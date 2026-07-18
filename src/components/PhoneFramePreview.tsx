import type { Compte, Publication } from '@shared/types';
import Modal from './Modal';
import Button from './Button';
import Badge from './Badge';
import { toAppMediaUrl } from '../lib/mediaUrl';
import { formatDateLong } from '../lib/dateUtils';
import { STATUT_COLORS, STATUT_KEYS, TYPE_KEYS } from '../lib/statusLabels';
import { useI18n } from '../context/I18nContext';

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
  const { t, locale } = useI18n();
  const videoUrl = toAppMediaUrl(publication.videoPath);
  const canPublish = publication.statut === 'planifie' || publication.statut === 'rappel_envoye';

  return (
    <Modal title={t('preview.title')} onClose={onClose} wide>
      <div className="phone-frame-wrapper">
        <div className="phone-frame">
          <div className="phone-frame-screen">
            {videoUrl ? (
              <video src={videoUrl} controls />
            ) : (
              <div style={{ color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
                {t('preview.videoUnavailable')}
              </div>
            )}
            <div className="phone-overlay-top">{t(TYPE_KEYS[publication.type])}</div>
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
                {compte ? compte.pseudoTiktok : t('preview.unknownAccount')}
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
            <Badge label={t(STATUT_KEYS[publication.statut])} color={STATUT_COLORS[publication.statut]} />
            <span className="page-subtitle" style={{ marginTop: 0 }}>
              {formatDateLong(publication.scheduledAt, locale)}
            </span>
          </div>

          <div>
            <strong>{t('preview.description')}</strong>
            <p style={{ marginTop: 4, color: 'var(--color-text-muted)' }}>
              {publication.description || t('preview.noDescription')}
            </p>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {canPublish && (
              <Button variant="primary" onClick={onPublish}>
                {t('preview.publish')}
              </Button>
            )}
            {canPublish && (
              <Button variant="secondary" onClick={onMarkPublished}>
                {t('preview.markPublished')}
              </Button>
            )}
            {canPublish && onCancel && (
              <Button variant="danger" onClick={onCancel}>
                {t('preview.cancel')}
              </Button>
            )}
          </div>
        </div>
      </div>
    </Modal>
  );
}
