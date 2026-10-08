export const STORAGE_KEYS = {
  notes: 'noteflow_notes_v1',
  theme: 'noteflow_theme',
  seeded: 'noteflow_seeded_v1',
};

// Add a name here to add a category everywhere in the app.
export const DEFAULT_CATEGORIES = ['Personal', 'Work', 'Study', 'Ideas', 'Projects', 'Important'];
export const DEFAULT_CATEGORY = 'Personal';

export const NOTE_COLORS = [
  { id: 'none', label: 'No color' },
  { id: 'rose', label: 'Rose' },
  { id: 'amber', label: 'Amber' },
  { id: 'emerald', label: 'Emerald' },
  { id: 'sky', label: 'Sky' },
  { id: 'violet', label: 'Violet' },
];

export const SORT_OPTIONS = [
  { id: 'updated', label: 'Recently updated' },
  { id: 'created', label: 'Recently created' },
  { id: 'alpha', label: 'Alphabetical' },
  { id: 'oldest', label: 'Oldest first' },
];

export const LIMITS = { title: 120, content: 50000, tag: 24, tags: 12 };
export const THEMES = ['light', 'dark', 'system'];
