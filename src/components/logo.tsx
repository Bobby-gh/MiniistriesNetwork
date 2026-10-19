// Diocese Network brand mark — white cross on a blue shield, blue & white only.

export function LogoMark({ className = "h-9 w-9" }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" fill="none" className={className} role="img" aria-label="Diocese Network logo">
      <defs>
        <linearGradient id="dn-shield" x1="8" y1="2" x2="42" y2="46" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#3b82f6" />
          <stop offset="55%" stopColor="#1d4ed8" />
          <stop offset="100%" stopColor="#172554" />
        </linearGradient>
        <linearGradient id="dn-glow" x1="24" y1="8" x2="24" y2="40" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.28" />
          <stop offset="60%" stopColor="#ffffff" stopOpacity="0" />
        </linearGradient>
      </defs>
      {/* Shield */}
      <path
        d="M24 2.5 43 8.7v14.6c0 11.6-8 19.7-19 22.4C13 43 5 34.9 5 23.3V8.7L24 2.5Z"
        fill="url(#dn-shield)"
      />
      <path
        d="M24 2.5 43 8.7v14.6c0 11.6-8 19.7-19 22.4C13 43 5 34.9 5 23.3V8.7L24 2.5Z"
        stroke="#ffffff"
        strokeOpacity="0.85"
        strokeWidth="1.6"
      />
      {/* Gloss */}
      <path
        d="M24 2.5 43 8.7v6.1L24 9.4 5 15.1V8.7L24 2.5Z"
        fill="url(#dn-glow)"
      />
      {/* Cross */}
      <path
        d="M20.8 11h6.4v8.9h8.9v6.4h-8.9v11.7h-6.4V26.3h-8.9v-6.4h8.9V11Z"
        fill="#ffffff"
      />
      {/* Base bar (open book hint) */}
      <rect x="13" y="39.2" width="22" height="2.6" rx="1.3" fill="#ffffff" fillOpacity="0.9" />
    </svg>
  );
}

export function Logo({
  compact = false,
  className = "",
}: {
  compact?: boolean;
  className?: string;
}) {
  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <LogoMark className={compact ? "h-8 w-8" : "h-10 w-10"} />
      <div className="min-w-0">
        <p className={`truncate font-bold leading-tight text-white ${compact ? "text-sm" : "text-[15px]"}`}>
          Diocese Network
        </p>
        {!compact && (
          <p className="truncate text-[11px] font-medium tracking-wide text-brand-200">
            Register · Attendance · Finance
          </p>
        )}
      </div>
    </div>
  );
}
