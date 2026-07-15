import { useState } from 'react';
const EMAIL = 'bob62138@gmail.com';
export default function FeedbackDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [subject, setSubject] = useState('TikTok Manager - Suggestion / Correction');
  const [message, setMessage] = useState('');
  const [copied, setCopied] = useState(false);
  if (!open) return null;
  const body = `${message}\n\nApplication : TikTok Manager`;
  const copy = async () => { await navigator.clipboard.writeText(`À : ${EMAIL}\nSujet : ${subject}\n\n${body}`); setCopied(true); };
  const send = () => window.open(`https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(EMAIL)}&su=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`, '_blank');
  return <div className="modal-backdrop" onClick={onClose}><div className="modal-card feedback-modal" onClick={(e) => e.stopPropagation()}>
    <div className="modal-title-row"><div><h2>Suggestion / Correction</h2><p>Une idée ou un problème ? Écrivez-nous.</p></div><button onClick={onClose}>✕</button></div>
    <label className="feedback-field">Sujet<input value={subject} onChange={(e) => setSubject(e.target.value)} /></label>
    <label className="feedback-field">Message<textarea rows={7} value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Décrivez votre suggestion ou les étapes du problème…" /></label>
    {copied && <p className="feedback-copied">Adresse et message copiés.</p>}
    <div className="modal-actions"><button className="button secondary" onClick={() => void copy()}>Copier</button><button className="button primary" disabled={!message.trim()} onClick={send}>Envoyer</button></div>
  </div></div>;
}
