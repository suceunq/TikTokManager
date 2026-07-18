import type { ReactNode } from 'react';
import type { InstalledReleaseInfo } from '@shared/types';
import { formatReleaseNotes } from '../lib/releaseNotes';
import { useI18n } from '../context/I18nContext';

function inlineMarkdown(text: string): ReactNode[] {
  return text.split(/(\*\*[^*]+\*\*)/g).filter(Boolean).map((part, index) =>
    part.startsWith('**') && part.endsWith('**')
      ? <strong key={index}>{part.slice(2, -2)}</strong>
      : part,
  );
}

function MarkdownNotes({ notes }: { notes: string }) {
  const lines = formatReleaseNotes(notes).split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  return <div className="installed-release-notes">
    {lines.map((line, index) => {
      const heading = /^(#{1,3})\s+(.+)$/.exec(line);
      if (heading) return <h3 key={index}>{inlineMarkdown(heading[2])}</h3>;
      const bullet = /^(?:[-*•])\s+(.+)$/.exec(line);
      if (bullet) return <div className="installed-release-bullet" key={index}><span>✓</span><p>{inlineMarkdown(bullet[1])}</p></div>;
      return <p key={index}>{inlineMarkdown(line)}</p>;
    })}
  </div>;
}

export default function ReleaseNotesDialog({ release, onClose }: { release: InstalledReleaseInfo; onClose: () => void }) {
  const { t } = useI18n();
  return <aside className="installed-release" role="dialog" aria-labelledby="installed-release-title">
    <div className="installed-release-accent" />
    <header>
      <div className="installed-release-icon" aria-hidden="true">✓</div>
      <div><span className="installed-release-badge">{t('update.installedBadge')}</span><h2 id="installed-release-title">{t('update.installedTitle', { version: release.version })}</h2></div>
      <button className="installed-release-close" onClick={onClose} aria-label={t('common.close')}>✕</button>
    </header>
    <p className="installed-release-subtitle">{t('update.installedSubtitle')}</p>
    {release.releaseNotes ? <MarkdownNotes notes={release.releaseNotes} /> : <p className="installed-release-empty">{t('update.noNotes')}</p>}
    <button className="button primary installed-release-ok" onClick={onClose}>{t('common.close')}</button>
  </aside>;
}
