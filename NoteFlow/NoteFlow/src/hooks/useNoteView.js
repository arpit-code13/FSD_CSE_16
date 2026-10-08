import { useDeferredValue, useMemo, useState } from 'react';
import { DEFAULT_CATEGORIES } from '../data/constants';
import { countBy, filterNotes, searchNotes, sortNotes } from '../utils/noteUtils';

/** Search + filter + sort state, and the notes that result from combining them. */
export function useNoteView(notes) {
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState('updated');
  const [view, setView] = useState('all');
  const [category, setCategory] = useState('all');
  const [tag, setTag] = useState(null);
  const deferredQuery = useDeferredValue(query);

  const categoryCounts = useMemo(() => countBy(notes, (n) => n.category), [notes]);
  const tagCounts = useMemo(() => countBy(notes, (n) => n.tags), [notes]);
  const categories = useMemo(
    () => [...DEFAULT_CATEGORIES, ...[...categoryCounts.keys()].filter((c) => !DEFAULT_CATEGORIES.includes(c)).sort()],
    [categoryCounts]
  );

  // A tag or custom category that no longer has notes silently stops filtering.
  const activeTag = tag && tagCounts.has(tag) ? tag : null;
  const activeCategory = category === 'all' || categories.includes(category) ? category : 'all';

  const results = useMemo(
    () =>
      sortNotes(
        filterNotes(searchNotes(notes, deferredQuery), { pinnedOnly: view === 'pinned', category: activeCategory, tag: activeTag }),
        sort
      ),
    [notes, deferredQuery, view, activeCategory, activeTag, sort]
  );

  const hasActiveFilters = Boolean(query.trim()) || view === 'pinned' || activeCategory !== 'all' || Boolean(activeTag);
  const clearFilters = () => {
    setQuery('');
    setView('all');
    setCategory('all');
    setTag(null);
  };

  return {
    query, setQuery, sort, setSort, view, setView, category: activeCategory, setCategory, tag: activeTag, setTag,
    results, categories, categoryCounts, tagCounts, hasActiveFilters, clearFilters,
  };
}
