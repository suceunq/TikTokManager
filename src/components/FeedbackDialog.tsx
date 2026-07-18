import { useState } from 'react';
import { useI18n } from '../context/I18nContext';
const EMAIL = 'bob62138@gmail.com';
export default function FeedbackDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { t } = useI18n();
  const [subject, setSubject] = useState(() => t('feedback.defaultSubject'));
  const [message, setMessage] = useState('');
  const [copied, setCopied] = useState(false);
  if (!open) return null;
  const body = `${message}\n\n${t('feedback.app')}`;
  const copy = async () => { await navigator.clipboard.writeText(`${t('feedback.to')} : ${EMAIL}\n${t('feedback.subject')} : ${subject}\n\n${body}`); setCopied(true); };
  const send = () => window.open(`https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(EMAIL)}&su=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`, '_blank');
  return <div className="modal-backdrop" onClick={onClose}><div className="modal-card feedback-modal" onClick={(e) => e.stopPropagation()}>
    <div className="modal-title-row"><div><h2>{t('feedback.title')}</h2><p>{t('feedback.subtitle')}</p></div><button onClick={onClose}>✕</button></div>
    <label className="feedback-field">{t('feedback.subject')}<input value={subject} onChange={(e) => setSubject(e.target.value)} /></label>
    <label className="feedback-field">{t('feedback.message')}<textarea rows={7} value={message} onChange={(e) => setMessage(e.target.value)} placeholder={t('feedback.placeholder')} /></label>
    {copied && <p className="feedback-copied">{t('feedback.copied')}</p>}
    <div className="modal-actions"><button className="button secondary" onClick={() => void copy()}>{t('common.copy')}</button><button className="button primary" disabled={!message.trim()} onClick={send}>{t('common.send')}</button></div>
  </div></div>;
}
