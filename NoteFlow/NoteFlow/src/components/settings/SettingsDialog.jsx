import { useRef, useState } from 'react';
import { Download, Monitor, Moon, Sun, Trash2, Upload, X } from 'lucide-react';
import { useNotes } from '../../hooks/useNotes';
import { useTheme } from '../../context/ThemeContext';
import { useToast } from '../../context/ToastContext';
import { buildExportPayload, exportNotes, parseImport } from '../../services/storageService';
import ConfirmDialog from '../common/ConfirmDialog';
import Modal from '../common/Modal';

const THEME_OPTIONS = [
  ['light', 'Light', Sun],
  ['dark', 'Dark', Moon],
  ['system', 'System', Monitor],
];
const SHORTCUTS = [
  ['N', 'New note'],
  ['/', 'Focus search'],
  ['Esc', 'Close dialog or clear search'],
  ['Ctrl/⌘ + Enter', 'Save note in the editor'],
];
const MAX_IMPORT_BYTES = 5 * 1024 * 1024;

const Section = ({ title, children }) => (
  <section className="border-t border-line py-5 first:border-0 first:pt-0">
    <h3 className="mb-3 text-sm font-semibold">{title}</h3>
    {children}
  </section>
);

export default function SettingsDialog({ onClose }) {
  const { notes, importNotes, clearAll } = useNotes();
  const { theme, setTheme } = useTheme();
  const toast = useToast();
  const fileInput = useRef(null);
  const [confirmClear, setConfirmClear] = useState(false);

  const sizeKb = (new Blob([buildExportPayload(notes)]).size / 1024).toFixed(1);

  const changeTheme = (next) => {
    if (next === theme) return;
    setTheme(next);
    toast.success('Theme changed');
  };

  const onExport = () => {
    if (!notes.length) return toast.error('There are no notes to export yet.');
    const result = exportNotes(notes);
    if (result.ok) toast.success('Notes exported');
    else toast.error(result.error);
  };

  const onFile = async (event) => {
    const [file] = event.target.files;
    event.target.value = '';
    if (!file) return;
    if (file.size > MAX_IMPORT_BYTES) return toast.error('That file is too large to import (5 MB max).');
    let text;
    try {
      text = await file.text();
    } catch {
      return toast.error('Could not read that file.');
    }
    const parsed = parseImport(text);
    if (!parsed.ok) return toast.error(parsed.error);
    const result = importNotes(parsed.notes);
    if (!result.ok) return undefined;
    const skipped = parsed.skipped + result.duplicates;
    toast.success(`Imported ${result.added} note${result.added === 1 ? '' : 's'}${skipped ? ` (${skipped} skipped)` : ''}`);
    return undefined;
  };

  return (
    <>
      <Modal title="Settings" hideTitle onClose={onClose} className="max-h-[90vh] max-w-lg rounded-2xl border border-line">
        <header className="flex items-center justify-between border-b border-line px-5 py-3">
          <h2 className="text-base font-semibold">Settings</h2>
          <button type="button" className="btn-icon" onClick={onClose} aria-label="Close settings" data-autofocus>
            <X className="h-5 w-5" />
          </button>
        </header>
        <div className="overflow-y-auto px-5 py-5">
          <Section title="Theme">
            <div role="radiogroup" aria-label="Theme" className="grid grid-cols-3 gap-2">
              {THEME_OPTIONS.map(([id, label, Icon]) => (
                <button key={id} type="button" role="radio" aria-checked={theme === id} onClick={() => changeTheme(id)} className={`btn flex-col gap-1 !py-3 border ${theme === id ? 'border-accent bg-accent/10 text-accent' : 'border-line text-muted hover:text-ink'}`}>
                  <Icon className="h-5 w-5" aria-hidden /> {label}
                </button>
              ))}
            </div>
          </Section>

          <Section title="Storage">
            <p className="text-sm text-muted">
              <span className="font-semibold text-ink">{notes.length}</span> {notes.length === 1 ? 'note' : 'notes'} saved in this browser (about {sizeKb} KB). Notes stay on this device only.
            </p>
          </Section>

          <Section title="Data">
            <div className="flex flex-wrap gap-2">
              <button type="button" className="btn btn-secondary" onClick={onExport}><Download className="h-4 w-4" aria-hidden /> Export notes</button>
              <button type="button" className="btn btn-secondary" onClick={() => fileInput.current.click()}><Upload className="h-4 w-4" aria-hidden /> Import notes</button>
              <button type="button" className="btn btn-secondary !text-danger" onClick={() => setConfirmClear(true)} disabled={!notes.length}><Trash2 className="h-4 w-4" aria-hidden /> Clear all notes</button>
              <input ref={fileInput} type="file" accept="application/json,.json" className="hidden" onChange={onFile} aria-label="Choose a NoteFlow JSON file to import" />
            </div>
            <p className="mt-2 text-xs text-muted">Import adds notes from a NoteFlow export and never overwrites existing notes.</p>
          </Section>

          <Section title="Keyboard shortcuts">
            <dl className="space-y-2 text-sm">
              {SHORTCUTS.map(([keys, label]) => (
                <div key={keys} className="flex items-center justify-between gap-4">
                  <dt className="text-muted">{label}</dt>
                  <dd><kbd className="rounded-md border border-line bg-sunken px-2 py-0.5 text-xs">{keys}</kbd></dd>
                </div>
              ))}
            </dl>
          </Section>
        </div>
      </Modal>

      {confirmClear && (
        <ConfirmDialog
          title="Delete all notes?"
          message={`This permanently deletes all ${notes.length} notes from this browser. Export a backup first if you might need them.`}
          confirmLabel="Delete everything"
          danger
          onCancel={() => setConfirmClear(false)}
          onConfirm={() => {
            clearAll();
            setConfirmClear(false);
          }}
        />
      )}
    </>
  );
}
