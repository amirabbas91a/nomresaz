export function LogoMark({ size = 40 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" aria-hidden="true">
      <defs>
        <linearGradient id="lg1" x1="6" y1="4" x2="42" y2="44" gradientUnits="userSpaceOnUse">
          <stop stopColor="#7db4ff" />
          <stop offset="0.55" stopColor="#2358e8" />
          <stop offset="1" stopColor="#0a1a3f" />
        </linearGradient>
        <linearGradient id="lg2" x1="0" y1="0" x2="0" y2="1">
          <stop stopColor="#fff" stopOpacity="0.7" />
          <stop offset="1" stopColor="#fff" stopOpacity="0" />
        </linearGradient>
      </defs>
      <rect x="2" y="2" width="44" height="44" rx="14" fill="url(#lg1)" />
      <rect x="2.5" y="2.5" width="43" height="22" rx="13" fill="url(#lg2)" opacity="0.5" />
      <path d="M14 25.5l7 7 13-15" fill="none" stroke="#fff" strokeWidth="4.2" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="35.5" cy="12.5" r="3.2" fill="#3fe0cf">
        <animate attributeName="r" values="3.2;4.4;3.2" dur="2.6s" repeatCount="indefinite" />
        <animate attributeName="opacity" values="1;0.6;1" dur="2.6s" repeatCount="indefinite" />
      </circle>
    </svg>
  );
}

export function Logo({ name = "نمره‌ساز", compact = false }: { name?: string; compact?: boolean }) {
  return (
    <span className="inline-flex items-center gap-3">
      <LogoMark size={compact ? 34 : 40} />
      {!compact && <span className="logo-name text-xl font-extrabold tracking-tight transition-colors hover:text-[var(--brand-2)]">{name}</span>}
    </span>
  );
}
