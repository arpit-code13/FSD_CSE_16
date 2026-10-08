import { ArrowUpDown, Search, X } from 'lucide-react';
import { SORT_OPTIONS } from '../../data/constants';

export default function Toolbar({ query, onQuery, sort, onSort, searchRef, categories, categoryCounts, category, onCategory, tags, tag, onTag, hasActiveFilters, onClear }) {
  const onSearchKeyDown = (event) => {
    if (event.key === 'Escape') {
      onQuery('');
      event.currentTarget.blur();
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" aria-hidden />
          <input
            ref={searchRef}
            type="search"
            value={query}
            onChange={(event) => onQuery(event.target.value)}
            onKeyDown={onSearchKeyDown}
            aria-label="Search notes by title, content, tag or category"
            placeholder="Search notes, tags, categories   ( / )"
            className="field min-h-[44px] pl-9 pr-9 [&::-webkit-search-cancel-button]:hidden"
          />
          {query && (
            <button type="button" onClick={() => onQuery('')} aria-label="Clear search" className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-muted hover:text-ink">
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
        <label className="relative sm:w-56">
          <span className="sr-only">Sort notes</span>
          <ArrowUpDown className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" aria-hidden />
          <select value={sort} onChange={(event) => onSort(event.target.value)} className="field min-h-[44px] appearance-none pl-9">
            {SORT_OPTIONS.map(({ id, label }) => (
              <option key={id} value={id}>{label}</option>
            ))}
          </select>
        </label>
      </div>

      <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Filter by category">
        <button type="button" onClick={() => onCategory('all')} aria-pressed={category === 'all'} className={pill(category === 'all')}>All</button>
        {categories.map((name) => (
          <button key={name} type="button" onClick={() => onCategory(name)} aria-pressed={category === name} className={pill(category === name)}>
            {name} <span className="opacity-60">{categoryCounts.get(name) ?? 0}</span>
          </button>
        ))}
      </div>

      {tags.length > 0 && (
        <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Filter by tag">
          <span className="text-sm text-muted">Tags</span>
          {tags.map(([name, count]) => (
            <button key={name} type="button" onClick={() => onTag(tag === name ? null : name)} aria-pressed={tag === name} className={pill(tag === name)}>
              #{name} <span className="opacity-60">{count}</span>
            </button>
          ))}
        </div>
      )}

      {hasActiveFilters && (
        <button type="button" onClick={onClear} className="text-sm font-medium text-accent hover:underline">
          Clear all filters
        </button>
      )}
    </div>
  );
}

const pill = (active) =>
  `inline-flex min-h-[32px] items-center gap-1.5 rounded-full border px-3 text-sm transition-colors ${
    active ? 'border-accent bg-accent text-accent-ink' : 'border-line bg-surface text-muted hover:border-muted/60 hover:text-ink'
  }`;
