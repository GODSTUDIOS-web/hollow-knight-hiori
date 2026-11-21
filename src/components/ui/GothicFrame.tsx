import React from 'react';

interface GothicCornerOrnamentsProps {
  className?: string;
}

export const GothicCornerOrnaments: React.FC<GothicCornerOrnamentsProps> = ({ className = '' }) => {
  const cornerSvg = (
    <svg viewBox="0 0 64 64" className="w-12 h-12 md:w-16 md:h-16 text-[#d8cfe8]/75" fill="none">
      <path
        d="M4 58 L4 14 Q4 4 14 4 L58 4"
        stroke="currentColor"
        strokeWidth="1.5"
      />
      <path
        d="M9 44 L9 15 Q9 9 15 9 L44 9"
        stroke="currentColor"
        strokeWidth="0.9"
        strokeOpacity="0.6"
      />
      <path
        d="M4 18 C14 18 18 14 18 4"
        stroke="currentColor"
        strokeWidth="1.2"
      />
      <circle cx="14" cy="14" r="2.2" fill="#e9d5ff" />
      <path d="M22 4 L26 8 L22 10 Z" fill="currentColor" fillOpacity="0.65" />
      <path d="M4 22 L8 26 L10 22 Z" fill="currentColor" fillOpacity="0.65" />
    </svg>
  );

  return (
    <div className={`pointer-events-none absolute inset-2 md:inset-3 border border-[#a89bc7]/35 rounded-sm ${className}`}>
      <div className="absolute -top-0.5 -left-0.5">{cornerSvg}</div>
      <div className="absolute -top-0.5 -right-0.5 -scale-x-100">{cornerSvg}</div>
      <div className="absolute -bottom-0.5 -left-0.5 -scale-y-100">{cornerSvg}</div>
      <div className="absolute -bottom-0.5 -right-0.5 -scale-x-100 -scale-y-100">{cornerSvg}</div>
    </div>
  );
};

export const HioriMaskCrest: React.FC<{ className?: string; glow?: boolean }> = ({
  className = 'w-8 h-8',
  glow = false,
}) => (
  <svg
    viewBox="0 0 64 80"
    className={`${className} ${glow ? 'drop-shadow-[0_0_18px_rgba(168,85,247,0.85)]' : ''}`}
    fill="none"
    aria-hidden="true"
  >
    <path
      d="M14 10 C10 20 12 30 16 36 C12 44 14 58 32 68 C50 58 52 44 48 36 C52 30 54 20 50 10 C45 20 42 26 39 30 C35 28 29 28 25 30 C22 26 19 20 14 10 Z"
      fill="#f3eefc"
      stroke="#c4b5fd"
      strokeWidth="1.4"
    />
    <ellipse cx="24" cy="46" rx="4.2" ry="6.4" fill="#0d0a16" />
    <ellipse cx="40" cy="46" rx="4.2" ry="6.4" fill="#0d0a16" />
  </svg>
);

export const GothicBanner: React.FC<{ title: string; className?: string }> = ({
  title,
  className = '',
}) => (
  <div
    className={`relative inline-flex items-center justify-center px-6 py-2 bg-[#0d0a16]/90 border border-[#c4b5fd]/55 shadow-[0_0_24px_rgba(139,92,246,0.28)] ${className}`}
  >
    <span className="absolute -left-1.5 w-2.5 h-2.5 rotate-45 bg-[#e9d5ff] border border-[#7c3aed]" />
    <span className="font-gothic text-base md:text-xl font-semibold tracking-wider text-[#f5f3ff]">
      {title}
    </span>
    <span className="absolute -right-1.5 w-2.5 h-2.5 rotate-45 bg-[#e9d5ff] border border-[#7c3aed]" />
  </div>
);

export const GothicDivider: React.FC<{ className?: string }> = ({ className = '' }) => (
  <div className={`flex items-center justify-center gap-2 ${className}`} aria-hidden="true">
    <span className="w-2 h-2 rotate-45 border border-[#c4b5fd]/80 bg-[#e9d5ff]/75" />
    <span className="h-[1px] flex-1 bg-gradient-to-r from-[#c4b5fd]/80 via-[#e9d5ff]/55 to-[#c4b5fd]/80" />
    <span className="w-2 h-2 rotate-45 border border-[#c4b5fd]/80 bg-[#e9d5ff]/75" />
  </div>
);

interface GothicMenuItemProps {
  label: string;
  active?: boolean;
  disabled?: boolean;
  hint?: string;
  dataStart?: boolean;
  onClick: () => void;
  onMouseEnter?: () => void;
}

export const GothicMenuItem: React.FC<GothicMenuItemProps> = ({
  label,
  active = false,
  disabled = false,
  hint,
  dataStart,
  onClick,
  onMouseEnter,
}) => (
  <button
    type="button"
    disabled={disabled}
    data-start={dataStart ? 'true' : undefined}
    onMouseEnter={onMouseEnter}
    onClick={(e) => {
      e.currentTarget.blur();
      onClick();
    }}
    className={`group relative w-full max-w-[280px] py-2 px-4 flex flex-col items-center justify-center transition-all duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#d8b4fe] ${
      disabled
        ? 'opacity-40 cursor-not-allowed text-[#948da8]'
        : active
          ? 'text-white cursor-pointer'
          : 'text-[#d8d1e8] hover:text-white cursor-pointer'
    }`}
  >
    {/* Top & bottom diamond-tipped glow frame on active item matching reference */}
    <span
      className={`pointer-events-none absolute inset-x-0 top-0 h-[1px] transition-opacity duration-150 bg-gradient-to-r from-transparent via-[#e9d5ff] to-transparent ${
        active && !disabled ? 'opacity-95' : 'opacity-0 group-hover:opacity-60'
      }`}
    />
    <span
      className={`pointer-events-none absolute inset-x-0 bottom-0 h-[1px] transition-opacity duration-150 bg-gradient-to-r from-transparent via-[#e9d5ff] to-transparent ${
        active && !disabled ? 'opacity-95' : 'opacity-0 group-hover:opacity-60'
      }`}
    />
    {active && !disabled && (
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-gradient-to-r from-transparent via-[#7c3aed]/25 to-transparent"
      />
    )}
    <div className="relative z-10 flex items-center gap-3">
      <span
        aria-hidden="true"
        className={`w-1.5 h-1.5 rotate-45 transition-all duration-150 ${
          active && !disabled
            ? 'bg-[#f5f3ff] shadow-[0_0_8px_#d8b4fe] scale-110'
            : 'bg-transparent group-hover:bg-[#c4b5fd]/60'
        }`}
      />
      <span className="font-gothic text-base md:text-lg tracking-wide whitespace-nowrap">
        {label}
      </span>
      <span
        aria-hidden="true"
        className={`w-1.5 h-1.5 rotate-45 transition-all duration-150 ${
          active && !disabled
            ? 'bg-[#f5f3ff] shadow-[0_0_8px_#d8b4fe] scale-110'
            : 'bg-transparent group-hover:bg-[#c4b5fd]/60'
        }`}
      />
    </div>
    {hint && (
      <span className="relative z-10 text-[10px] tracking-wider text-[#9d94b6] mt-0.5 whitespace-nowrap">
        {hint}
      </span>
    )}
  </button>
);

export const GothicProgressBar: React.FC<{ progress: number }> = ({ progress }) => {
  const clamped = Math.max(0, Math.min(100, progress));
  return (
    <div className="relative w-full flex items-center gap-2">
      <span className="w-2.5 h-2.5 rotate-45 border border-[#e9d5ff]/85 bg-[#120d1d] shrink-0" />
      <div className="relative flex-1 h-3 border border-[#c4b5fd]/75 bg-[#0b0813]/90 p-[2px]">
        <div
          className="h-full bg-gradient-to-r from-[#c4b5fd] via-[#f5f3ff] to-[#ffffff] shadow-[0_0_12px_rgba(233,213,255,0.75)] transition-[width] duration-100 ease-out"
          style={{ width: `${clamped}%` }}
        />
      </div>
      <span className="w-2.5 h-2.5 rotate-45 border border-[#e9d5ff]/85 bg-[#120d1d] shrink-0" />
    </div>
  );
};
