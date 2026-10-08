import { Menu, Plus } from 'lucide-react';
import Logo from './Logo';

export default function MobileTopBar({ onMenu, onNew }) {
  return (
    <header className="sticky top-0 z-20 flex items-center justify-between border-b border-line bg-surface/95 px-4 py-2.5 backdrop-blur lg:hidden">
      <button type="button" className="btn-icon" onClick={onMenu} aria-label="Open menu">
        <Menu className="h-5 w-5" />
      </button>
      <div className="flex items-center gap-2">
        <Logo className="h-6 w-6" />
        <span className="font-display text-lg font-semibold">NoteFlow</span>
      </div>
      <button type="button" className="btn-icon bg-accent text-accent-ink hover:bg-accent/90 hover:text-accent-ink" onClick={onNew} aria-label="New note">
        <Plus className="h-5 w-5" />
      </button>
    </header>
  );
}
