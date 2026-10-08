import { useMemo } from 'react';
import { getGreeting } from '../../utils/noteUtils';

const WEEK = 7 * 24 * 3600 * 1000;

export default function PageHeader({ notes, categoriesInUse }) {
  const greeting = useMemo(getGreeting, []);
  const stats = useMemo(() => {
    const cutoff = Date.now() - WEEK;
    return [
      ['Total notes', notes.length],
      ['Pinned', notes.filter((n) => n.pinned).length],
      ['Categories', categoriesInUse],
      ['Updated this week', notes.filter((n) => Date.parse(n.updatedAt) >= cutoff).length],
    ];
  }, [notes, categoriesInUse]);

  return (
    <div>
      <h1 className="font-display text-3xl font-semibold tracking-tight sm:text-4xl">{greeting} <span aria-hidden>👋</span></h1>
      <p className="mt-1.5 text-muted">Capture your thoughts and keep your ideas organized.</p>
      <dl className="mt-5 grid grid-cols-2 gap-x-6 gap-y-3 sm:flex sm:flex-wrap sm:gap-x-8">
        {stats.map(([label, value]) => (
          <div key={label} className="flex items-baseline gap-2">
            <dd className="order-1 text-lg font-semibold tabular-nums">{value}</dd>
            <dt className="order-2 text-sm text-muted">{label}</dt>
          </div>
        ))}
      </dl>
    </div>
  );
}
