import { DEFAULT_CATEGORY, LIMITS, NOTE_COLORS } from '../data/constants.js';

const COLOR_IDS = NOTE_COLORS.map((c) => c.id);

export const createId = () =>
  globalThis.crypto?.randomUUID?.() ?? `n_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;

export const normalizeTag = (tag) =>
  String(tag).trim().replace(/^#+/, '').toLowerCase().replace(/\s+/g, '-').slice(0, LIMITS.tag);

export const normalizeTags = (tags) => {
  const list = Array.isArray(tags) ? tags : [];
  return [...new Set(list.map(normalizeTag).filter(Boolean))].slice(0, LIMITS.tags);
};

const validDate = (value, fallback) => {
  const time = Date.parse(value);
  return Number.isNaN(time) ? fallback : new Date(time).toISOString();
};

/**
 * Turns unknown data into a valid note, applying safe defaults to optional fields.
 * Returns null when the data cannot be a note (no usable title/content).
 */
export const sanitizeNote = (raw) => {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
  const title = typeof raw.title === 'string' ? raw.title.trim().slice(0, LIMITS.title) : '';
  const content = typeof raw.content === 'string' ? raw.content.slice(0, LIMITS.content) : '';
  if (!title && !content.trim()) return null;
  const now = new Date().toISOString();
  const createdAt = validDate(raw.createdAt, now);
  const category =
    typeof raw.category === 'string' && raw.category.trim() ? raw.category.trim().slice(0, 30) : DEFAULT_CATEGORY;
  return {
    id: typeof raw.id === 'string' && raw.id ? raw.id : createId(),
    title: title || 'Untitled note',
    content,
    category,
    tags: normalizeTags(raw.tags),
    pinned: raw.pinned === true,
    color: COLOR_IDS.includes(raw.color) ? raw.color : 'none',
    createdAt,
    updatedAt: validDate(raw.updatedAt, createdAt),
  };
};

/** Form validation used by the editor. Returns { field: message }. */
export const validateDraft = ({ title, content }) => {
  const errors = {};
  if (!title.trim()) errors.title = 'Give your note a title.';
  else if (title.trim().length > LIMITS.title) errors.title = `Keep the title under ${LIMITS.title} characters.`;
  if (!content.trim()) errors.content = 'Write something in the note before saving.';
  else if (content.length > LIMITS.content) errors.content = 'This note is too long to save.';
  return errors;
};

export const searchNotes = (notes, query) => {
  const q = query.trim().toLowerCase();
  if (!q) return notes;
  const tagQuery = q.replace(/^#/, '');
  return notes.filter(
    (n) =>
      n.title.toLowerCase().includes(q) ||
      n.content.toLowerCase().includes(q) ||
      n.category.toLowerCase().includes(q) ||
      n.tags.some((t) => t.includes(tagQuery))
  );
};

export const filterNotes = (notes, { pinnedOnly = false, category = 'all', tag = null } = {}) =>
  notes.filter(
    (n) => (!pinnedOnly || n.pinned) && (category === 'all' || n.category === category) && (!tag || n.tags.includes(tag))
  );

const COMPARERS = {
  updated: (a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt),
  created: (a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt),
  oldest: (a, b) => Date.parse(a.createdAt) - Date.parse(b.createdAt),
  alpha: (a, b) => a.title.localeCompare(b.title, undefined, { sensitivity: 'base' }),
};

/** Sorts a copy of the list; pinned notes always come first. */
export const sortNotes = (notes, sortId = 'updated') => {
  const compare = COMPARERS[sortId] ?? COMPARERS.updated;
  return [...notes].sort((a, b) => Number(b.pinned) - Number(a.pinned) || compare(a, b));
};

export const countBy = (notes, pick) => {
  const counts = new Map();
  notes.forEach((n) => [].concat(pick(n)).forEach((key) => counts.set(key, (counts.get(key) ?? 0) + 1)));
  return counts;
};

const rtf = new Intl.RelativeTimeFormat(undefined, { numeric: 'auto' });
const UNITS = [
  ['year', 31536000],
  ['month', 2592000],
  ['week', 604800],
  ['day', 86400],
  ['hour', 3600],
  ['minute', 60],
];

export const timeAgo = (iso) => {
  const seconds = Math.round((Date.parse(iso) - Date.now()) / 1000);
  if (Math.abs(seconds) < 45) return 'just now';
  const [unit, size] = UNITS.find(([, s]) => Math.abs(seconds) >= s) ?? ['minute', 60];
  return rtf.format(Math.round(seconds / size), unit);
};

export const fullDate = (iso) => new Date(iso).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });

export const getGreeting = (date = new Date()) => {
  const h = date.getHours();
  if (h < 5) return 'Still up';
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
};

/** Plain-text preview for cards: strips common Markdown syntax. */
export const previewText = (markdown, max = 180) => {
  const text = markdown
    .replace(/```[\s\S]*?```/g, ' code ')
    .replace(/!\[[^\]]*\]\([^)]*\)/g, '')
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    .replace(/^\s{0,3}(#{1,6}|>|[-*+]|\d+\.)\s+/gm, '')
    .replace(/[*_`~]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  return text.length > max ? `${text.slice(0, max).trimEnd()}...` : text;
};

export const countWords = (text) => (text.trim() ? text.trim().split(/\s+/).length : 0);
