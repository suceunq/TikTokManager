import path from 'node:path';

export function isTrustedRendererUrl(urlValue: string, packaged: boolean, appPath: string): boolean {
  try {
    const url = new URL(urlValue);
    if (!packaged) return url.origin === 'http://localhost:5173';
    if (url.protocol !== 'file:') return false;
    const rendererRoot = path.resolve(appPath, 'dist');
    const filePath = path.resolve(decodeURIComponent(url.pathname.replace(/^\/([A-Za-z]:)/, '$1')));
    const relative = path.relative(rendererRoot, filePath);
    return Boolean(relative) && !relative.startsWith('..') && !path.isAbsolute(relative);
  } catch {
    return false;
  }
}

export function isAllowedExternalWindow(urlValue: string): boolean {
  try {
    const url = new URL(urlValue);
    return (
      url.protocol === 'https:'
      && url.hostname === 'mail.google.com'
      && url.pathname === '/mail/'
      && url.searchParams.get('view') === 'cm'
      && url.searchParams.get('fs') === '1'
    );
  } catch {
    return false;
  }
}
