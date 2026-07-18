import { useState, type KeyboardEvent } from 'react';
import { useI18n } from '../context/I18nContext';

interface TagInputProps {
  value: string[];
  onChange: (tags: string[]) => void;
  placeholder?: string;
}

function normalizeHashtag(raw: string): string {
  const trimmed = raw.trim().replace(/\s+/g, '');
  if (!trimmed) return '';
  return trimmed.startsWith('#') ? trimmed : `#${trimmed}`;
}

export default function TagInput({ value, onChange, placeholder }: TagInputProps) {
  const { t } = useI18n();
  const [draft, setDraft] = useState('');

  const addTag = () => {
    const tag = normalizeHashtag(draft);
    if (tag && !value.includes(tag)) {
      onChange([...value, tag]);
    }
    setDraft('');
  };

  const removeTag = (tag: string) => {
    onChange(value.filter((t) => t !== tag));
  };

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      addTag();
    } else if (e.key === 'Backspace' && draft === '' && value.length > 0) {
      removeTag(value[value.length - 1]);
    }
  };

  return (
    <div className="tag-input">
      {value.map((tag) => (
        <span className="tag-chip" key={tag}>
          {tag}
          <button type="button" onClick={() => removeTag(tag)} aria-label={t('tag.remove', { tag })}>
            ✕
          </button>
        </span>
      ))}
      <input
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={onKeyDown}
        onBlur={addTag}
        placeholder={placeholder ?? t('tag.placeholder')}
      />
    </div>
  );
}
