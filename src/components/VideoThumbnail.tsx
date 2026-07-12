import { toAppMediaUrl } from '../lib/mediaUrl';

interface VideoThumbnailProps {
  thumbnailPath: string | null;
  alt: string;
  className?: string;
}

export default function VideoThumbnail({ thumbnailPath, alt, className }: VideoThumbnailProps) {
  const url = toAppMediaUrl(thumbnailPath);
  const classes = ['thumb-sm', className].filter(Boolean).join(' ');

  if (!url) {
    return (
      <div className={classes} title="Miniature indisponible">
        🎬
      </div>
    );
  }

  return <img src={url} alt={alt} className={classes} />;
}
