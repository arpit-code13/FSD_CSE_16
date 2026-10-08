import { FileText, Folder, Pin, Plus, Settings, X } from 'lucide-react';
import Logo from './Logo';

function NavItem({ icon: Icon, label, count, active, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-current={active ? 'page' : undefined}
      className={`flex min-h-[40px] w-full items-center gap-3 rounded-lg px-3 text-sm transition-colors ${
        active ? 'bg-accent/10 font-semibold text-accent' : 'text-muted hover:bg-sunken hover:text-ink'
      }`}
    >
      <Icon className="h-4 w-4 shrink-0" aria-hidden />
      <span className="flex-1 truncate text-left">{label}</span>
      <span className="text-xs tabular-nums opacity-80">{count}</span>
    </button>
  );
}

export default function Sidebar({ open, onClose, view, category, onSelectView, onSelectCategory, categories, categoryCounts, total, pinned, onNew, onOpenSettings }) {
  const go = (action) => () => {
    action();
    onClose();
  };

  return (
    <>
      {open && <div className="fixed inset-0 z-30 animate-fade bg-ink/40 lg:hidden" onClick={onClose} aria-hidden />}
      <aside
        aria-label="Sidebar"
        className={`fixed inset-y-0 left-0 z-40 flex w-72 flex-col border-r border-line bg-surface p-4 transition-[transform,visibility] duration-200 lg:visible lg:sticky lg:top-0 lg:h-screen lg:translate-x-0 ${
          open ? "translate-x-0" : "invisible -translate-x-full"
        }`}
      >
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-2.5">
            <Logo />
            <span className="font-display text-xl font-semibold tracking-tight">NoteFlow</span>
          </div>
          <button type="button" className="btn-icon lg:hidden" onClick={onClose} aria-label="Close menu">
            <X className="h-5 w-5" />
          </button>
        </div>

        <button type="button" className="btn btn-primary mt-6 w-full" onClick={go(onNew)}>
          <Plus className="h-4 w-4" aria-hidden /> New note
          <kbd className="ml-auto hidden rounded bg-accent-ink/20 px-1.5 text-xs lg:inline">N</kbd>
        </button>

        <nav aria-label="Notes" className="mt-6 flex-1 space-y-6 overflow-y-auto">
          <div className="space-y-1">
            <NavItem icon={FileText} label="All notes" count={total} active={view === 'all' && category === 'all'} onClick={go(() => { onSelectView('all'); onSelectCategory('all'); })} />
            <NavItem icon={Pin} label="Pinned" count={pinned} active={view === 'pinned'} onClick={go(() => { onSelectView('pinned'); onSelectCategory('all'); })} />
          </div>
          <div>
            <h2 className="mb-2 px-3 text-sm font-semibold text-ink">Categories</h2>
            <div className="space-y-1">
              {categories.map((name) => (
                <NavItem key={name} icon={Folder} label={name} count={categoryCounts.get(name) ?? 0} active={view === 'all' && category === name} onClick={go(() => { onSelectView('all'); onSelectCategory(name); })} />
              ))}
            </div>
          </div>
        </nav>

        <button type="button" className="btn btn-ghost mt-4 w-full justify-start" onClick={go(onOpenSettings)}>
          <Settings className="h-4 w-4" aria-hidden /> Settings
        </button>
      </aside>
    </>
  );
}
