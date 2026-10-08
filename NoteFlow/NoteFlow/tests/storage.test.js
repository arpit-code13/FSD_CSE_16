import { beforeEach, describe, test } from 'node:test';
import assert from 'node:assert/strict';

// Minimal in-memory localStorage so the real storage service can run under Node.
const makeStorage = () => {
  const data = new Map();
  return {
    getItem: (k) => (data.has(k) ? data.get(k) : null),
    setItem: (k, v) => data.set(k, String(v)),
    removeItem: (k) => data.delete(k),
    clear: () => data.clear(),
  };
};
globalThis.localStorage = makeStorage();

const storage = await import('../src/services/storageService.js');
const utils = await import('../src/utils/noteUtils.js');
const { STORAGE_KEYS } = await import('../src/data/constants.js');

const note = (over = {}) => utils.sanitizeNote({ title: 'Test Note', content: 'hello world', category: 'Study', tags: ['React'], ...over });

beforeEach(() => globalThis.localStorage.clear());

describe('first launch and persistence', () => {
  test('seeds demo notes once, then never again', () => {
    const first = storage.initializeNotes();
    assert.ok(first.notes.length >= 4);
    const reload = storage.initializeNotes();
    assert.deepEqual(reload.notes.map((n) => n.id), first.notes.map((n) => n.id));
  });

  test('deleted demo notes do not come back after clearing everything', () => {
    storage.initializeNotes();
    storage.clearNotes();
    globalThis.localStorage.removeItem(STORAGE_KEYS.notes);
    assert.equal(storage.initializeNotes().notes.length, 0);
  });

  test('existing user notes are never overwritten', () => {
    storage.saveNotes([note({ id: 'mine' })]);
    const { notes } = storage.initializeNotes();
    assert.deepEqual(notes.map((n) => n.id), ['mine']);
  });

  test('create -> edit -> pin -> delete survive a "refresh"', () => {
    const n = note({ id: 'a' });
    storage.addNote(n);
    assert.equal(storage.getNotes().notes[0].title, 'Test Note');
    storage.updateNote('a', { title: 'Edited', updatedAt: new Date().toISOString() });
    assert.equal(storage.getNotes().notes[0].title, 'Edited');
    storage.updateNote('a', { pinned: true });
    assert.equal(storage.getNotes().notes[0].pinned, true);
    storage.deleteNote('a');
    assert.equal(storage.getNotes().notes.length, 0);
  });
});

describe('corrupted data', () => {
  test('invalid JSON is recovered from, with a backup', () => {
    globalThis.localStorage.setItem(STORAGE_KEYS.notes, '{not json');
    const result = storage.getNotes();
    assert.deepEqual(result.notes, []);
    assert.ok(result.warning);
    assert.equal(globalThis.localStorage.getItem(`${STORAGE_KEYS.notes}_corrupted_backup`), '{not json');
  });

  test('non-array JSON is rejected', () => {
    globalThis.localStorage.setItem(STORAGE_KEYS.notes, '"hello"');
    assert.deepEqual(storage.getNotes().notes, []);
  });

  test('malformed entries are skipped and defaults applied', () => {
    globalThis.localStorage.setItem(
      STORAGE_KEYS.notes,
      JSON.stringify([null, 5, { title: 'Ok', content: 'x' }, { title: '', content: '' }, { content: 'only body', tags: 'bad', color: 'neon', pinned: 'yes' }])
    );
    const { notes, warning } = storage.getNotes();
    assert.equal(notes.length, 2);
    assert.ok(warning);
    assert.equal(notes[1].title, 'Untitled note');
    assert.deepEqual(notes[1].tags, []);
    assert.equal(notes[1].color, 'none');
    assert.equal(notes[1].pinned, false);
  });

  test('quota errors return a friendly message instead of throwing', () => {
    const real = globalThis.localStorage;
    globalThis.localStorage = { ...makeStorage(), setItem: (k) => { if (k === STORAGE_KEYS.notes) { const e = new Error('full'); e.name = 'QuotaExceededError'; throw e; } } };
    const result = storage.saveNotes([note()]);
    assert.equal(result.ok, false);
    assert.match(result.error, /full/i);
    globalThis.localStorage = real;
  });

  test('missing storage does not crash', () => {
    const real = globalThis.localStorage;
    globalThis.localStorage = undefined;
    assert.deepEqual(storage.getNotes().notes, []);
    assert.equal(storage.saveNotes([]).ok, false);
    globalThis.localStorage = real;
  });
});

describe('import / export', () => {
  test('export payload round-trips through parseImport', () => {
    const list = [note({ id: 'x' }), note({ id: 'y', title: 'Other' })];
    const parsed = storage.parseImport(storage.buildExportPayload(list));
    assert.equal(parsed.ok, true);
    assert.equal(parsed.notes.length, 2);
  });

  test('rejects invalid files and merges without overwriting', () => {
    assert.equal(storage.parseImport('nope').ok, false);
    assert.equal(storage.parseImport('[]').ok, false);
    const existing = [note({ id: 'x', title: 'Mine' })];
    const { merged, added, duplicates } = storage.mergeImported(existing, [note({ id: 'x', title: 'Theirs' }), note({ id: 'z' })]);
    assert.equal(added, 1);
    assert.equal(duplicates, 1);
    assert.equal(merged.find((n) => n.id === 'x').title, 'Mine');
  });

  test('theme persists and falls back to system', () => {
    assert.equal(storage.getTheme(), 'system');
    storage.saveTheme('dark');
    assert.equal(storage.getTheme(), 'dark');
    globalThis.localStorage.setItem(STORAGE_KEYS.theme, 'purple');
    assert.equal(storage.getTheme(), 'system');
  });
});

describe('search, filter, sort', () => {
  const day = (n) => new Date(Date.UTC(2026, 0, n)).toISOString();
  const notes = [
    note({ id: '1', title: 'React hooks', content: 'useState', category: 'Study', tags: ['react'], pinned: true, createdAt: day(1), updatedAt: day(5) }),
    note({ id: '2', title: 'Groceries', content: 'milk & eggs <b>', category: 'Personal', tags: ['home'], createdAt: day(2), updatedAt: day(3) }),
    note({ id: '3', title: 'apple pie', content: 'react later', category: 'Study', tags: ['food'], createdAt: day(3), updatedAt: day(4) }),
  ];

  test('search covers title, content, tags and category, case-insensitively', () => {
    assert.deepEqual(utils.searchNotes(notes, '  REACT ').map((n) => n.id), ['1', '3']);
    assert.deepEqual(utils.searchNotes(notes, '#home').map((n) => n.id), ['2']);
    assert.deepEqual(utils.searchNotes(notes, 'personal').map((n) => n.id), ['2']);
    assert.deepEqual(utils.searchNotes(notes, '<b>').map((n) => n.id), ['2']);
    assert.equal(utils.searchNotes(notes, '').length, 3);
    assert.equal(utils.searchNotes(notes, 'zzz').length, 0);
  });

  test('search + category + pinned combine', () => {
    const result = utils.filterNotes(utils.searchNotes(notes, 'react'), { category: 'Study', pinnedOnly: true });
    assert.deepEqual(result.map((n) => n.id), ['1']);
    assert.deepEqual(utils.filterNotes(notes, { tag: 'food' }).map((n) => n.id), ['3']);
  });

  test('sorting modes keep pinned notes first', () => {
    const ids = (mode) => utils.sortNotes(notes, mode).map((n) => n.id);
    assert.deepEqual(ids('updated'), ['1', '3', '2']);
    assert.deepEqual(ids('created'), ['1', '3', '2']);
    assert.deepEqual(ids('oldest'), ['1', '2', '3']);
    assert.deepEqual(ids('alpha'), ['1', '3', '2']);
  });

  test('validation and tag normalisation', () => {
    assert.ok(utils.validateDraft({ title: ' ', content: 'x' }).title);
    assert.ok(utils.validateDraft({ title: 'x', content: '  ' }).content);
    assert.deepEqual(utils.validateDraft({ title: 'x', content: 'y' }), {});
    assert.deepEqual(utils.normalizeTags(['#React', 'react', ' My Tag ', '']), ['react', 'my-tag']);
  });
});
