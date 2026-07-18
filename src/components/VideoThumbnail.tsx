import { toAppMediaUrl } from '../lib/mediaUrl';
import { useI18n } from '../context/I18nContext';

interface VideoThumbnailProps {
  thumbnailPath: string | null;
  alt: string;
  className?: string;
}

export default function VideoThumbnail({ thumbnailPath, alt, className }: VideoThumbnailProps) {
  const { t } = useI18n();
  const url = toAppMediaUrl(thumbnailPath);
  const classes = ['thumb-sm', className].filter(Boolean).join(' ');

  if (!url) {
    return (
      <div className={classes} title={t('thumbnail.unavailable')}>
        🎬
      </div>
    );
  }

  return <img src={url} alt={alt} className={classes} />;
}
