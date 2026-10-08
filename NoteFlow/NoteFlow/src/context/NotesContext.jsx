import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { STORAGE_KEYS } from '../data/constants';
import { useToast } from './ToastContext';
import * as storage from '../services/storageService';
import { createId, normalizeTags } from '../utils/noteUtils';

const NotesContext = createContext(null);

/**
 * Owns the notes list. The UI state is the working copy and every change is written
 * through storageService, so a refresh always restores exactly what the user saw.
 */
export function NotesProvider({ children }) {
  const toast = useToast();
  const [initial] = useState(storage.initializeNotes);
  const [notes, setNotes] = useState(initial.notes);
  const notesRef = useRef(notes);
  const loadWarning = initial.warning;

  const commit = useCallback(
    (result) => {
      notesRef.current = result.notes;
      setNotes(result.notes);
      if (!result.ok) toast.error(result.error);
      return result.ok;
    },
    [toast]
  );

  // Keep several open tabs in sync.
  useEffect(() => {
    const onStorage = (event) => {
      if (event.key !== STORAGE_KEYS.notes && event.key !== null) return;
      const { notes: fresh } = storage.getNotes();
      notesRef.current = fresh;
      setNotes(fresh);
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  const createNote = useCallback(
    (draft) => {
      const now = new Date().toISOString();
      const note = {
        id: createId(),
        title: draft.title.trim(),
        content: draft.content,
        category: draft.category,
        tags: normalizeTags(draft.tags),
        color: draft.color,
        pinned: false,
        createdAt: now,
        updatedAt: now,
      };
      const ok = commit(storage.addNote(note, notesRef.current));
      if (ok) toast.success('Note created successfully');
      return ok;
    },
    [commit, toast]
  );

  const editNote = useCallback(
    (id, draft) => {
      const updates = {
        title: draft.title.trim(),
        content: draft.content,
        category: draft.category,
        tags: normalizeTags(draft.tags),
        color: draft.color,
        updatedAt: new Date().toISOString(),
      };
      const ok = commit(storage.updateNote(id, updates, notesRef.current));
      if (ok) toast.success('Note updated successfully');
      return ok;
    },
    [commit, toast]
  );

  const removeNote = useCallback(
    (id) => {
      const ok = commit(storage.deleteNote(id, notesRef.current));
      if (ok) toast.success('Note deleted');
      return ok;
    },
    [commit, toast]
  );

  const togglePin = useCallback(
    (id) => {
      const note = notesRef.current.find((n) => n.id === id);
      if (!note) return;
      const pinned = !note.pinned;
      if (commit(storage.updateNote(id, { pinned }, notesRef.current))) toast.success(pinned ? 'Note pinned' : 'Note unpinned');
    },
    [commit, toast]
  );

  const clearAll = useCallback(() => {
    if (commit(storage.clearNotes())) toast.success('All notes deleted');
  }, [commit, toast]);

  const importNotes = useCallback(
    (imported) => {
      const { merged, added, duplicates } = storage.mergeImported(notesRef.current, imported);
      const result = { ok: true, added, duplicates };
      if (added && !commit({ ...storage.saveNotes(merged), notes: merged })) return { ...result, ok: false };
      return result;
    },
    [commit]
  );

  const value = useMemo(
    () => ({ notes, loadWarning, createNote, editNote, removeNote, togglePin, clearAll, importNotes }),
    [notes, loadWarning, createNote, editNote, removeNote, togglePin, clearAll, importNotes]
  );
  return <NotesContext.Provider value={value}>{children}</NotesContext.Provider>;
}

export const useNotesContext = () => {
  const ctx = useContext(NotesContext);
  if (!ctx) throw new Error('useNotes must be used inside NotesProvider');
  return ctx;
};
