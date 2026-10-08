import { lazy, Suspense, useEffect, useMemo, useState } from 'react';
import { Eye, Pencil, Trash2, X } from 'lucide-react';
import { DEFAULT_CATEGORY, LIMITS } from '../../data/constants';
import { countWords, fullDate, validateDraft } from '../../utils/noteUtils';
import ConfirmDialog from '../common/ConfirmDialog';
import Modal from '../common/Modal';
import ColorPicker from './ColorPicker';
import TagInput from './TagInput';

const MarkdownPreview = lazy(() => import('./MarkdownPreview'));

const draftFrom = (note) => ({
  title: note?.title ?? '',
  content: note?.content ?? '',
  category: note?.category ?? DEFAULT_CATEGORY,
  tags: note?.tags ?? [],
  color: note?.color ?? 'none',
});

const isSame = (a, b) =>
  a.title === b.title && a.content === b.content && a.category === b.category && a.color === b.color && a.tags.join() === b.tags.join();

/** Create/edit dialog. `note` is undefined when creating. onSave(draft) resolves true when persisted. */
export default function NoteEditor({ note, categories, onSave, onDelete, onClose }) {
  const initial = useMemo(() => draftFrom(note), [note]);
  const [draft, setDraft] = useState(initial);
  const [errors, setErrors] = useState({});
  const [tab, setTab] = useState('write');
  const [confirmDiscard, setConfirmDiscard] = useState(false);
  const dirty = !isSame(draft, initial);
  const set = (field) => (value) => {
    setDraft((d) => ({ ...d, [field]: value }));
    setErrors((e) => ({ ...e, [field]: undefined }));
  };

  useEffect(() => {
    if (!dirty) return undefined;
    const warn = (event) => event.preventDefault();
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [dirty]);

  const requestClose = () => (dirty ? setConfirmDiscard(true) : onClose());

  const save = () => {
    const found = validateDraft(draft);
    setErrors(found);
    if (Object.keys(found).length) {
      setTab('write');
      return;
    }
    if (onSave(draft)) onClose();
  };

  const onKeyDown = (event) => {
    if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') {
      event.preventDefault();
      save();
    }
  };

  const words = countWords(draft.content);
  const options = categories.includes(draft.category) ? categories : [...categories, draft.category];

  return (
    <>
      <Modal title={note ? 'Edit note' : 'New note'} hideTitle onClose={requestClose} align="stretch" className="h-full max-w-3xl sm:h-auto sm:max-h-[92vh] sm:rounded-2xl sm:border sm:border-line">
        <div onKeyDown={onKeyDown} className="flex min-h-0 flex-1 flex-col" data-color={draft.color}>
          <header className="flex items-center justify-between gap-3 border-b border-line px-5 py-3">
            <h2 className="text-sm font-semibold text-muted">{note ? 'Edit note' : 'New note'}</h2>
            <button type="button" className="btn-icon" onClick={requestClose} aria-label="Close editor">
              <X className="h-5 w-5" />
            </button>
          </header>

          <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-5 py-5">
            <div>
              <label htmlFor="note-title" className="sr-only">Title</label>
              <input
                id="note-title"
                data-autofocus
                value={draft.title}
                onChange={(event) => set('title')(event.target.value)}
                maxLength={LIMITS.title}
                placeholder="Note title"
                aria-invalid={Boolean(errors.title)}
                aria-describedby={errors.title ? 'title-error' : undefined}
                className="w-full bg-transparent font-display text-2xl font-semibold placeholder:text-muted/60 focus:outline-none sm:text-3xl"
              />
              {errors.title && <p id="title-error" role="alert" className="mt-1 text-sm text-danger">{errors.title}</p>}
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="note-category" className="mb-1.5 block text-sm font-medium">Category</label>
                <select id="note-category" className="field" value={draft.category} onChange={(event) => set('category')(event.target.value)}>
                  {options.map((name) => <option key={name}>{name}</option>)}
                </select>
              </div>
              <div>
                <span className="mb-1.5 block text-sm font-medium">Color</span>
                <div className="flex min-h-[38px] items-center"><ColorPicker value={draft.color} onChange={set('color')} /></div>
              </div>
            </div>

            <TagInput tags={draft.tags} onChange={set('tags')} />

            <div>
              <div className="mb-1.5 flex items-center justify-between">
                <label htmlFor="note-content" className="text-sm font-medium">Content</label>
                <div role="tablist" aria-label="Editor mode" className="flex rounded-lg bg-sunken p-0.5 text-sm">
                  {[['write', 'Write', Pencil], ['preview', 'Preview', Eye]].map(([id, label, Icon]) => (
                    <button key={id} type="button" role="tab" aria-selected={tab === id} onClick={() => setTab(id)} className={`flex items-center gap-1.5 rounded-md px-3 py-1 transition-colors ${tab === id ? 'bg-surface font-medium shadow-card' : 'text-muted hover:text-ink'}`}>
                      <Icon className="h-3.5 w-3.5" aria-hidden /> {label}
                    </button>
                  ))}
                </div>
              </div>
              {tab === 'write' ? (
                <textarea
                  id="note-content"
                  value={draft.content}
                  onChange={(event) => set('content')(event.target.value)}
                  maxLength={LIMITS.content}
                  rows={12}
                  placeholder="Start writing... Markdown is supported: # heading, **bold**, *italic*, - lists, `code`, [links](https://)"
                  aria-invalid={Boolean(errors.content)}
                  aria-describedby={errors.content ? 'content-error' : undefined}
                  className="field min-h-[260px] resize-y font-mono leading-6"
                />
              ) : (
                <div className="min-h-[260px] rounded-lg border border-line bg-sunken/40 p-4">
                  <Suspense fallback={<p className="text-sm text-muted">Loading preview...</p>}>
                    <MarkdownPreview content={draft.content} />
                  </Suspense>
                </div>
              )}
              {errors.content && <p id="content-error" role="alert" className="mt-1 text-sm text-danger">{errors.content}</p>}
              <p className="mt-1.5 text-xs text-muted">
                {words} {words === 1 ? 'word' : 'words'} · {draft.content.length.toLocaleString()} characters
                {note && ` · Updated ${fullDate(note.updatedAt)}`}
              </p>
            </div>
          </div>

          <footer className="flex flex-wrap items-center gap-2 border-t border-line px-5 py-3">
            {note && (
              <button type="button" className="btn btn-ghost !text-danger" onClick={() => onDelete(note)}>
                <Trash2 className="h-4 w-4" aria-hidden /> Delete
              </button>
            )}
            <span className="ml-auto hidden text-xs text-muted sm:inline">Ctrl/⌘ + Enter to save</span>
            <button type="button" className="btn btn-secondary" onClick={requestClose}>Cancel</button>
            <button type="button" className="btn btn-primary" onClick={save}>{note ? 'Save changes' : 'Save note'}</button>
          </footer>
        </div>
      </Modal>

      {confirmDiscard && (
        <ConfirmDialog
          title="Discard unsaved changes?"
          message="You have edits that haven't been saved. If you close now, they will be lost."
          confirmLabel="Discard changes"
          cancelLabel="Keep editing"
          danger
          onCancel={() => setConfirmDiscard(false)}
          onConfirm={onClose}
        />
      )}
    </>
  );
}
