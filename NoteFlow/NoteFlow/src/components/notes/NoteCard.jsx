import { memo } from 'react';
import { Pencil, Pin, PinOff, Trash2 } from 'lucide-react';
import { fullDate, previewText, timeAgo } from '../../utils/noteUtils';

const MAX_VISIBLE_TAGS = 4;

function NoteCard({ note, onOpen, onTogglePin, onDelete, onSelectTag }) {
  const { title, content, category, tags, pinned, color, createdAt, updatedAt } = note;
  const edited = updatedAt !== createdAt;
  const stamp = edited ? updatedAt : createdAt;

  return (
    <article
      data-color={color}
      className={`group relative flex min-h-[200px] w-full flex-col overflow-hidden rounded-2xl border bg-surface p-5 shadow-card transition duration-200 hover:-translate-y-0.5 hover:shadow-lift ${
        pinned ? 'border-accent/40' : 'border-line'
      }`}
    >
      {color !== 'none' && <span className="absolute inset-y-0 left-0 w-1 bg-[rgb(var(--note))]" aria-hidden />}

      <div className="flex items-start gap-2">
        <h3 className="min-w-0 flex-1 text-base font-semibold leading-snug">
          <button
            type="button"
            onClick={() => onOpen(note)}
            className="line-clamp-2 w-full break-words rounded text-left after:absolute after:inset-0 after:content-['']"
            aria-label={`Open note: ${title}`}
          >
            {title}
          </button>
        </h3>
        {pinned && <Pin key="pin" className="mt-0.5 h-4 w-4 shrink-0 animate-pin fill-accent text-accent" aria-label="Pinned" />}
      </div>

      <p className="mt-2 line-clamp-5 flex-1 break-words text-sm leading-6 text-muted">{previewText(content)}</p>

      <div className="relative z-10 mt-4 flex flex-wrap items-center gap-1.5">
        <span className="chip bg-accent/10 text-accent">{category}</span>
        {tags.slice(0, MAX_VISIBLE_TAGS).map((tag) => (
          <button key={tag} type="button" onClick={() => onSelectTag(tag)} className="chip hover:text-ink" aria-label={`Filter by tag ${tag}`}>
            #{tag}
          </button>
        ))}
        {tags.length > MAX_VISIBLE_TAGS && <span className="chip">+{tags.length - MAX_VISIBLE_TAGS}</span>}
      </div>

      <div className="mt-3 flex items-center justify-between gap-2">
        <time dateTime={stamp} title={`Created ${fullDate(createdAt)}${edited ? `\nUpdated ${fullDate(updatedAt)}` : ''}`} className="text-xs text-muted">
          {edited ? 'Updated' : 'Created'} {timeAgo(stamp)}
        </time>
        <div className="relative z-10 -mr-2 flex opacity-100 transition-opacity lg:opacity-0 lg:focus-within:opacity-100 lg:group-hover:opacity-100">
          <button type="button" className="btn-icon" onClick={() => onTogglePin(note.id)} aria-label={pinned ? `Unpin ${title}` : `Pin ${title}`} aria-pressed={pinned}>
            {pinned ? <PinOff className="h-4 w-4" /> : <Pin className="h-4 w-4" />}
          </button>
          <button type="button" className="btn-icon" onClick={() => onOpen(note)} aria-label={`Edit ${title}`}>
            <Pencil className="h-4 w-4" />
          </button>
          <button type="button" className="btn-icon hover:!text-danger" onClick={() => onDelete(note)} aria-label={`Delete ${title}`}>
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>
    </article>
  );
}

export default memo(NoteCard);
