export function Logo({ className = "size-9" }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" className={className} aria-hidden="true">
      <defs>
        <linearGradient id="logo-g" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#22e6ff" />
          <stop offset="1" stopColor="#ff3df0" />
        </linearGradient>
      </defs>
      <rect width="64" height="64" rx="16" fill="hsl(235 45% 7%)" stroke="url(#logo-g)" strokeOpacity="0.5" />
      <path d="M20 20L46 24L32 46Z" fill="none" stroke="url(#logo-g)" strokeWidth="3" strokeLinejoin="round" />
      <circle cx="20" cy="20" r="6" fill="url(#logo-g)" />
      <circle cx="46" cy="24" r="6" fill="url(#logo-g)" />
      <circle cx="32" cy="46" r="6" fill="url(#logo-g)" />
    </svg>
  );
}
