import { createId } from '../utils/noteUtils.js';

const HOUR = 3600 * 1000;

const make = (hoursAgo, note) => {
  const stamp = new Date(Date.now() - hoursAgo * HOUR).toISOString();
  return { id: createId(), color: 'none', pinned: false, createdAt: stamp, updatedAt: stamp, ...note };
};

/** Example notes shown on the very first launch only. */
export const createSeedNotes = () => [
  make(2, {
    title: 'React learning roadmap',
    category: 'Study',
    tags: ['react', 'frontend'],
    color: 'sky',
    pinned: true,
    content:
      '## Roadmap\n\n1. **Fundamentals** - components, props, state\n2. **Hooks** - `useState`, `useEffect`, `useMemo`\n3. **Architecture** - context, custom hooks, services\n4. **Ship it** - build, deploy, iterate\n\n> Build one small project per concept.',
  }),
  make(26, {
    title: 'Project ideas',
    category: 'Ideas',
    tags: ['ideas', 'projects'],
    color: 'violet',
    content:
      '- Habit tracker with weekly streaks\n- Recipe box with ingredient search\n- Expense splitter for trips\n\nPick the one that teaches the most.',
  }),
  make(50, {
    title: 'Meeting notes - sprint planning',
    category: 'Work',
    tags: ['meeting'],
    color: 'amber',
    content:
      '### Decisions\n- Ship search before the next demo\n- Freeze the design tokens\n\n### Action items\n- Write the README\n- Review the storage layer',
  }),
  make(75, {
    title: 'Study plan - this week',
    category: 'Important',
    tags: ['college', 'planning'],
    color: 'rose',
    content:
      'Mon: algorithms revision\n\nTue: database notes\n\nWed: mock test\n\nSee [MDN](https://developer.mozilla.org) for web references.',
  }),
];
