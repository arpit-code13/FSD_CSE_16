import { Inbox, NotebookPen, Pin, SearchX } from 'lucide-react';
import EmptyState from '../common/EmptyState';
import NoteCard from './NoteCard';

const GRID = 'grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4';

function NoteGroup({ label, notes, showLabel, cardProps }) {
  return (
    <section aria-label={label}>
      {showLabel && <h2 className="mb-3 text-sm font-semibold text-muted">{label}</h2>}
      <ul className={GRID}>
        {notes.map((note) => (
          <li key={note.id} className="flex">
            <NoteCard note={note} {...cardProps} />
          </li>
        ))}
      </ul>
    </section>
  );
}

function EmptyResults({ totalCount, pinnedViewOnly, hasActiveFilters, onClearFilters, onNew }) {
  if (totalCount === 0) {
    return (
      <EmptyState
        icon={NotebookPen}
        title="Your ideas deserve a place."
        description="Create your first note and start building your personal knowledge space."
        action={<button type="button" className="btn btn-primary" onClick={onNew}>Create your first note</button>}
      />
    );
  }
  if (pinnedViewOnly) {
    return (
      <EmptyState
        icon={Pin}
        title="Nothing pinned yet."
        description="Pin important notes so you can find them quickly."
        action={<button type="button" className="btn btn-secondary" onClick={onClearFilters}>Show all notes</button>}
      />
    );
  }
  return (
    <EmptyState
      icon={hasActiveFilters ? SearchX : Inbox}
      title="No notes match your search."
      description="Try another keyword or clear your filters."
      action={<button type="button" className="btn btn-secondary" onClick={onClearFilters}>Clear filters</button>}
    />
  );
}

/**
 * `pinnedViewOnly` means the Pinned view is on with no other filter or search,
 * which is the only case where "Nothing pinned yet" is the honest message.
 */
export default function NoteGrid({ notes, totalCount, pinnedViewOnly, hasActiveFilters, onClearFilters, onNew, cardProps }) {
  if (notes.length === 0) {
    return <EmptyResults {...{ totalCount, pinnedViewOnly, hasActiveFilters, onClearFilters, onNew }} />;
  }
  const pinned = notes.filter((n) => n.pinned);
  const others = notes.filter((n) => !n.pinned);
  const showLabels = pinned.length > 0 && others.length > 0;

  return (
    <div className="space-y-8">
      {pinned.length > 0 && <NoteGroup label="Pinned" notes={pinned} showLabel={showLabels} cardProps={cardProps} />}
      {others.length > 0 && <NoteGroup label="Other notes" notes={others} showLabel={showLabels} cardProps={cardProps} />}
    </div>
  );
}
