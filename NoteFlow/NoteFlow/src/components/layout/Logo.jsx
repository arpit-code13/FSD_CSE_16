export default function Logo({ className = 'h-8 w-8' }) {
  return (
    <svg viewBox="0 0 64 64" className={className} aria-hidden>
      <rect width="64" height="64" rx="16" className="fill-accent" />
      <path d="M20 18h18l8 8v20a2 2 0 0 1-2 2H20a2 2 0 0 1-2-2V20a2 2 0 0 1 2-2z" className="fill-accent-ink" />
      <path d="M24 33h16M24 40h10" className="stroke-accent" strokeWidth="3" strokeLinecap="round" fill="none" />
    </svg>
  );
}
