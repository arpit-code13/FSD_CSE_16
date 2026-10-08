import { useId, useState } from 'react';
import { X } from 'lucide-react';
import { LIMITS } from '../../data/constants';
import { normalizeTag } from '../../utils/noteUtils';

export default function TagInput({ tags, onChange }) {
  const [text, setText] = useState('');
  const inputId = useId();

  const addFrom = (raw) => {
    const incoming = raw.split(/[,\s]+/).map(normalizeTag).filter(Boolean);
    if (incoming.length) onChange([...new Set([...tags, ...incoming])].slice(0, LIMITS.tags));
    setText('');
  };

  const onKeyDown = (event) => {
    if (event.key === 'Enter' || event.key === ',' || event.key === ' ') {
      if (text.trim()) {
        event.preventDefault();
        addFrom(text);
      }
    } else if (event.key === 'Backspace' && !text && tags.length) {
      onChange(tags.slice(0, -1));
    }
  };

  return (
    <div>
      <label htmlFor={inputId} className="mb-1.5 block text-sm font-medium">Tags</label>
      <div className="field flex flex-wrap items-center gap-1.5 !py-1.5 focus-within:border-accent focus-within:ring-2 focus-within:ring-accent/25">
        {tags.map((tag) => (
          <span key={tag} className="chip !py-1">
            #{tag}
            <button type="button" onClick={() => onChange(tags.filter((t) => t !== tag))} aria-label={`Remove tag ${tag}`} className="rounded hover:text-ink">
              <X className="h-3 w-3" />
            </button>
          </span>
        ))}
        <input
          id={inputId}
          value={text}
          onChange={(event) => setText(event.target.value)}
          onKeyDown={onKeyDown}
          onBlur={() => text.trim() && addFrom(text)}
          maxLength={LIMITS.tag}
          disabled={tags.length >= LIMITS.tags}
          placeholder={tags.length ? '' : 'Add a tag and press Enter'}
          className="min-w-[8rem] flex-1 bg-transparent py-1 text-sm outline-none placeholder:text-muted/80"
        />
      </div>
    </div>
  );
}
