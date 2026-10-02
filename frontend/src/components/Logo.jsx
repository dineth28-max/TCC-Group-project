export default function Logo({ size = "md", showText = true, className = "" }) {
  // Size mappings
  const dimensions = {
    xs: { icon: 24, text: "text-xs", gap: "gap-1.5" },
    sm: { icon: 32, text: "text-sm", gap: "gap-2" },
    md: { icon: 40, text: "text-base", gap: "gap-2.5" },
    lg: { icon: 48, text: "text-lg", gap: "gap-3" },
    xl: { icon: 56, text: "text-xl", gap: "gap-3.5" },
  };

  const config = dimensions[size] || dimensions.md;

  return (
    <div className={`inline-flex items-center select-none ${config.gap} ${className}`}>
      {/* Precision Geometric Vector Mark */}
      <div
        className="relative shrink-0 flex items-center justify-center rounded-2xl p-2 bg-gradient-to-br from-[#2457FF] via-[#1a44d8] to-[#0d2a99] shadow-md shadow-blue-600/25 border border-blue-400/30"
        style={{ width: config.icon, height: config.icon }}
      >
        <svg
          viewBox="0 0 48 48"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="w-full h-full"
        >
          {/* Subtle Backglow grid */}
          <path
            d="M24 6L40 15.5V32.5L24 42L8 32.5V15.5L24 6Z"
            stroke="rgba(200, 255, 61, 0.25)"
            strokeWidth="1.5"
            strokeDasharray="2 2"
          />

          {/* Education Diamond Cap / Hexagon Nexus in Cobalt */}
          <path
            d="M24 10L36 17V31L24 38L12 31V17L24 10Z"
            fill="url(#logoGradient)"
            stroke="#ffffff"
            strokeWidth="1.5"
            strokeLinejoin="round"
          />

          {/* Dynamic Electric Lime Analytics Growth Lines */}
          <path
            d="M18 29V25M24 29V20M30 29V16"
            stroke="#C8FF3D"
            strokeWidth="3"
            strokeLinecap="round"
          />

          {/* Upward Growth Surge Arc */}
          <path
            d="M16 26L23 19L27 22L33 15"
            stroke="#ffffff"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Neon Apex Pulse Node */}
          <circle cx="33" cy="15" r="3" fill="#C8FF3D" />

          <defs>
            <linearGradient id="logoGradient" x1="12" y1="10" x2="36" y2="38" gradientUnits="userSpaceOnUse">
              <stop stopColor="#2457FF" />
              <stop offset="1" stopColor="#0B1A54" />
            </linearGradient>
          </defs>
        </svg>

        {/* Ambient Lime Pulse Indicator */}
        <span className="absolute -top-1 -right-1 h-3 w-3 rounded-full bg-[#C8FF3D] border-2 border-white shadow-xs" />
      </div>

      {/* Brand Wordmark */}
      {showText && (
        <div className="flex flex-col">
          <div className="flex items-center tracking-tight leading-none">
            <span className="font-extrabold text-slate-900 tracking-tight">tutora</span>
            <span className="font-extrabold text-[#2457FF]">test</span>
            <span className="h-1.5 w-1.5 rounded-full bg-[#C8FF3D] ml-0.5 inline-block" />
          </div>
          <span className="text-[10px] uppercase font-bold tracking-widest text-slate-400 mt-1">
            Enterprise OS
          </span>
        </div>
      )}
    </div>
  );
}
