// Brand identity: the ministries logo image, with the shield mark kept for
// places where a tiny inline graphic is needed (favicon is src/app/icon.svg).

import Image from "next/image";

export function LogoMark({ className = "h-9 w-9" }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" fill="none" className={className} role="img" aria-label="Diocese Network logo">
      <defs>
        <linearGradient id="dn-shield" x1="8" y1="2" x2="42" y2="46" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#3b82f6" />
          <stop offset="55%" stopColor="#1d4ed8" />
          <stop offset="100%" stopColor="#172554" />
        </linearGradient>
      </defs>
      <path
        d="M24 2.5 43 8.7v14.6c0 11.6-8 19.7-19 22.4C13 43 5 34.9 5 23.3V8.7L24 2.5Z"
        fill="url(#dn-shield)"
        stroke="#ffffff"
        strokeWidth="1.6"
      />
      <path d="M20.8 11h6.4v8.9h8.9v6.4h-8.9v11.7h-6.4V26.3h-8.9v-6.4h8.9V11Z" fill="#ffffff" />
      <rect x="13" y="39.2" width="22" height="2.6" rx="1.3" fill="#ffffff" fillOpacity="0.9" />
    </svg>
  );
}

/** The ministries logo, served from /public. Square artwork (640×640). */
export function BrandLogo({ className = "h-10 w-10" }: { className?: string }) {
  return (
    <Image
      src="/ministries_logo.jpeg"
      alt="Ministries logo"
      width={640}
      height={640}
      priority
      className={className}
    />
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
      <BrandLogo className={compact ? "h-9 w-9 rounded-full object-cover" : "h-11 w-11 rounded-full object-cover"} />
      <div className="min-w-0">
        <p className={`truncate font-semibold tracking-tight text-ink ${compact ? "text-sm" : "text-[15px]"}`}>
          Diocese Network
        </p>
        {!compact && <p className="truncate text-xs text-neutral-500">Church management</p>}
      </div>
    </div>
  );
}
