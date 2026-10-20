/** Small black-and-white logo: three connected nodes. Colours follow the theme. */
export function Logo({ className = "size-9" }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" className={className} aria-hidden="true">
      <rect width="64" height="64" rx="12" className="fill-foreground" />
      <path d="M20 20L46 24L32 46Z" strokeWidth="3" strokeLinejoin="round" className="fill-none stroke-background" />
      <circle cx="20" cy="20" r="6" className="fill-background" />
      <circle cx="46" cy="24" r="6" className="fill-background" />
      <circle cx="32" cy="46" r="6" className="fill-background" />
    </svg>
  );
}
