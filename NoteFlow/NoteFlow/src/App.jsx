import { useEffect, useRef, useState } from 'react';
import { Plus } from 'lucide-react';
import ConfirmDialog from './components/common/ConfirmDialog';
import MobileTopBar from './components/layout/MobileTopBar';
import PageHeader from './components/layout/PageHeader';
import Sidebar from './components/layout/Sidebar';
import NoteEditor from './components/notes/NoteEditor';
import NoteGrid from './components/notes/NoteGrid';
import Toolbar from './components/notes/Toolbar';
import SettingsDialog from './components/settings/SettingsDialog';
import { useToast } from './context/ToastContext';
import { useNotes } from './hooks/useNotes';
import { useNoteView } from './hooks/useNoteView';
import { useShortcuts } from './hooks/useShortcuts';

export default function App() {
  const { notes, loadWarning, createNote, editNote, removeNote, togglePin } = useNotes();
  const toast = useToast();
  const filters = useNoteView(notes);
  const searchRef = useRef(null);

  const [editor, setEditor] = useState(null); // null | { note?: Note }
  const [pendingDelete, setPendingDelete] = useState(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    if (loadWarning) toast.error(loadWarning);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- show the load warning once
  }, []);

  const modalOpen = Boolean(editor || pendingDelete || settingsOpen);
  const openNew = () => setEditor({});
  useShortcuts({ n: openNew, '/': () => searchRef.current?.focus(), '?': () => setSettingsOpen(true) }, !modalOpen && !menuOpen);

  // Keep the open editor pointed at the latest saved version of its note.
  const editingNote = editor?.note && notes.find((n) => n.id === editor.note.id);

  const saveDraft = (draft) => (editingNote ? editNote(editingNote.id, draft) : createNote(draft));

  const confirmDelete = () => {
    if (removeNote(pendingDelete.id)) {
      if (editor?.note?.id === pendingDelete.id) setEditor(null);
    }
    setPendingDelete(null);
  };

  const { view, category, tag, query, hasActiveFilters } = filters;
  const pinnedViewOnly = view === 'pinned' && category === 'all' && !tag && !query.trim();
  const heading = view === 'pinned' ? 'Pinned notes' : category !== 'all' ? category : 'All notes';
  const categoriesInUse = [...filters.categoryCounts.values()].filter(Boolean).length;
  const topTags = [...filters.tagCounts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).slice(0, 12);

  const cardProps = { onOpen: (note) => setEditor({ note }), onTogglePin: togglePin, onDelete: setPendingDelete, onSelectTag: filters.setTag };

  return (
    <div className="min-h-screen lg:flex">
      <Sidebar
        open={menuOpen}
        onClose={() => setMenuOpen(false)}
        view={view}
        category={category}
        onSelectView={filters.setView}
        onSelectCategory={filters.setCategory}
        categories={filters.categories}
        categoryCounts={filters.categoryCounts}
        total={notes.length}
        pinned={notes.filter((n) => n.pinned).length}
        onNew={openNew}
        onOpenSettings={() => setSettingsOpen(true)}
      />

      <div className="min-w-0 flex-1">
        <MobileTopBar onMenu={() => setMenuOpen(true)} onNew={openNew} />
        <main className="mx-auto w-full max-w-7xl space-y-8 px-4 py-6 sm:px-8 lg:py-10">
          <PageHeader notes={notes} categoriesInUse={categoriesInUse} />
          <Toolbar
            query={query}
            onQuery={filters.setQuery}
            sort={filters.sort}
            onSort={filters.setSort}
            searchRef={searchRef}
            categories={filters.categories}
            categoryCounts={filters.categoryCounts}
            category={category}
            onCategory={(name) => { filters.setCategory(name); filters.setView('all'); }}
            tags={topTags}
            tag={tag}
            onTag={filters.setTag}
            hasActiveFilters={hasActiveFilters}
            onClear={filters.clearFilters}
          />
          <section aria-labelledby="results-heading">
            <div className="mb-4 flex items-baseline justify-between">
              <h2 id="results-heading" className="font-display text-xl font-semibold">{heading}</h2>
              <p className="text-sm text-muted" aria-live="polite">
                {filters.results.length} {filters.results.length === 1 ? 'note' : 'notes'}
              </p>
            </div>
            <NoteGrid
              notes={filters.results}
              totalCount={notes.length}
              pinnedViewOnly={pinnedViewOnly}
              hasActiveFilters={hasActiveFilters}
              onClearFilters={filters.clearFilters}
              onNew={openNew}
              cardProps={cardProps}
            />
          </section>
        </main>
      </div>

      <button type="button" onClick={openNew} aria-label="New note" className="fixed bottom-5 right-5 z-20 hidden h-14 w-14 items-center justify-center rounded-full bg-accent text-accent-ink shadow-lift transition-transform hover:scale-105 sm:flex lg:hidden">
        <Plus className="h-6 w-6" />
      </button>

      {editor && (
        <NoteEditor
          key={editingNote?.id ?? 'new'}
          note={editingNote}
          categories={filters.categories}
          onSave={saveDraft}
          onDelete={setPendingDelete}
          onClose={() => setEditor(null)}
        />
      )}
      {pendingDelete && (
        <ConfirmDialog
          title="Delete this note?"
          message={`"${pendingDelete.title}" will be permanently deleted. This can't be undone.`}
          confirmLabel="Delete note"
          danger
          onCancel={() => setPendingDelete(null)}
          onConfirm={confirmDelete}
        />
      )}
      {settingsOpen && <SettingsDialog onClose={() => setSettingsOpen(false)} />}
    </div>
  );
}
