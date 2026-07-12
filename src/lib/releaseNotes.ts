export function formatReleaseNotes(notes: string): string {
  if (!notes.includes('<')) return notes.trim();
  const htmlDocument = new DOMParser().parseFromString(notes, 'text/html');
  const lines: string[] = [];
  htmlDocument.querySelectorAll('p, h1, h2, h3').forEach((element) => {
    const text = element.textContent?.trim();
    if (text) lines.push(text);
  });
  htmlDocument.querySelectorAll('li').forEach((element) => {
    const text = element.textContent?.trim();
    if (text) lines.push(`• ${text}`);
  });
  return (lines.length ? lines.join('\n') : htmlDocument.body.textContent ?? '').trim();
}
