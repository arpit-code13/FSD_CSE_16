import { STORAGE_KEYS, THEMES } from '../data/constants.js';
import { createSeedNotes } from '../data/seedNotes.js';
import { sanitizeNote } from '../utils/noteUtils.js';

const EXPORT_VERSION = 1;

const SAVE_ERROR = 'Unable to save your changes locally. Please try again.';
const QUOTA_ERROR = 'Browser storage is full. Delete or export some notes, then try again.';
const UNAVAILABLE_ERROR = 'Storage is unavailable in this browser, so notes will not be kept after you close the tab.';

/* Nothing in this file throws into the UI: functions return data or { ok, error }. */
const getStorage = () => {
  try {
    const storage = globalThis.localStorage;
    if (!storage) return null;
    const probe = '__noteflow_probe__';
    storage.setItem(probe, '1');
    storage.removeItem(probe);
    return storage;
  } catch {
    return null;
  }
};

const isQuotaError = (error) =>
  error?.name === 'QuotaExceededError' || error?.name === 'NS_ERROR_DOM_QUOTA_REACHED' || error?.code === 22;

/** Parses JSON text into valid notes, skipping malformed entries. Throws if it is not a notes list. */
const parseNotes = (raw) => {
  const parsed = JSON.parse(raw);
  const list = Array.isArray(parsed) ? parsed : Array.isArray(parsed?.notes) ? parsed.notes : null;
  if (!list) throw new Error('Not a notes list');
  const seen = new Set();
  const notes = [];
  list.forEach((item) => {
    const note = sanitizeNote(item);
    if (!note) return;
    if (seen.has(note.id)) note.id = `${note.id}_${seen.size}`;
    seen.add(note.id);
    notes.push(note);
  });
  return { notes, dropped: list.length - notes.length };
};

/** Reads and validates saved notes. Corrupted data is backed up and never crashes the app. */
export const getNotes = () => {
  const storage = getStorage();
  if (!storage) return { notes: [], warning: UNAVAILABLE_ERROR };
  const raw = storage.getItem(STORAGE_KEYS.notes);
  if (raw === null) return { notes: [] };
  try {
    const { notes, dropped } = parseNotes(raw);
    return { notes, warning: dropped ? `${dropped} damaged note(s) could not be loaded and were skipped.` : undefined };
  } catch {
    try {
      storage.setItem(`${STORAGE_KEYS.notes}_corrupted_backup`, raw);
    } catch {
      /* the backup is best-effort */
    }
    return { notes: [], warning: 'Saved data was unreadable and has been reset. A backup copy was kept in your browser.' };
  }
};

export const saveNotes = (notes) => {
  const storage = getStorage();
  if (!storage) return { ok: false, error: UNAVAILABLE_ERROR };
  try {
    storage.setItem(STORAGE_KEYS.notes, JSON.stringify(notes));
    return { ok: true };
  } catch (error) {
    return { ok: false, error: isQuotaError(error) ? QUOTA_ERROR : SAVE_ERROR };
  }
};

/** Applies a change to `base` (defaults to what is stored), saves it, and returns { ok, error?, notes }. */
const mutate = (base, change) => {
  const next = change(base ?? getNotes().notes);
  return { ...saveNotes(next), notes: next };
};

export const addNote = (note, base) => mutate(base, (notes) => [note, ...notes]);
export const updateNote = (id, updates, base) =>
  mutate(base, (notes) => notes.map((n) => (n.id === id ? { ...n, ...updates, id } : n)));
export const deleteNote = (id, base) => mutate(base, (notes) => notes.filter((n) => n.id !== id));
export const clearNotes = () => mutate([], () => []);

/**
 * First launch: demo notes are created only when no notes key exists AND seeding never happened.
 * Existing data is never overwritten, and deleted demo notes never come back.
 */
export const initializeNotes = () => {
  const storage = getStorage();
  if (!storage) return getNotes();
  const hasNotes = storage.getItem(STORAGE_KEYS.notes) !== null;
  const wasSeeded = storage.getItem(STORAGE_KEYS.seeded) !== null;
  if (hasNotes || wasSeeded) return getNotes();
  const seed = createSeedNotes();
  const result = saveNotes(seed);
  if (result.ok) {
    try {
      storage.setItem(STORAGE_KEYS.seeded, new Date().toISOString());
    } catch {
      /* the flag is best-effort */
    }
  }
  return { notes: seed, warning: result.ok ? undefined : result.error };
};

export const buildExportPayload = (notes) =>
  JSON.stringify({ app: 'NoteFlow', version: EXPORT_VERSION, exportedAt: new Date().toISOString(), notes }, null, 2);

export const exportNotes = (notes) => {
  try {
    const blob = new Blob([buildExportPayload(notes)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `noteflow-backup-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    return { ok: true };
  } catch {
    return { ok: false, error: 'Could not create the export file. Please try again.' };
  }
};

/** Validates imported JSON text without saving it. */
export const parseImport = (text) => {
  try {
    const { notes, dropped } = parseNotes(text);
    if (!notes.length) return { ok: false, error: 'No valid notes were found in that file.' };
    return { ok: true, notes, skipped: dropped };
  } catch {
    return { ok: false, error: 'That file is not a valid NoteFlow export.' };
  }
};

/** Merges imported notes into existing ones; notes already present (same id) are kept as they are. */
export const mergeImported = (existing, imported) => {
  const ids = new Set(existing.map((n) => n.id));
  const fresh = imported.filter((n) => !ids.has(n.id));
  return { merged: [...fresh, ...existing], added: fresh.length, duplicates: imported.length - fresh.length };
};

export const getTheme = () => {
  const value = getStorage()?.getItem(STORAGE_KEYS.theme);
  return THEMES.includes(value) ? value : 'system';
};

export const saveTheme = (theme) => {
  try {
    getStorage()?.setItem(STORAGE_KEYS.theme, theme);
  } catch {
    /* the theme still applies for this session */
  }
};
