import React from 'react';

interface EnergyDisplayProps {
  energy: number;
  maxEnergy: number;
  energyRatio: number;
  energyFull: boolean;
  gainFlash: boolean;
  spendFlash: boolean;
  children?: React.ReactNode;
}

/**
 * Renders Hiori's official ornamental Energy Vessel (circular orb + connected horizontal bar)
 * from a single shared energy resource inside the `728 x 213` reference layout.
 */
export const EnergyDisplay: React.FC<EnergyDisplayProps> = ({
  energy,
  maxEnergy,
  energyRatio,
  energyFull,
  gainFlash,
  spendFlash,
  children,
}) => {
  const clampedRatio = Math.max(0, Math.min(1, energyRatio));
  // Liquid top position inside the 100x100 SVG viewBox:
  // 0% -> y = 104 (empty), 100% -> y = -4 (completely full)
  const liquidTopY = 104 - clampedRatio * 108;

  // Exact pixel positions inside 728x213 reference hud_frame.png:
  // Orb inner circle: center (144, 106), radius 62 -> box (82, 44, 124, 124)
  // Horizontal bar inner slot: x=240..648 (w=408), y=115..129 (h=14)
  return (
    <div
      data-testid="hud-energy-display"
      aria-label={`Energia Especial: ${energy} de ${maxEnergy}`}
      data-energy={energy}
      data-max-energy={maxEnergy}
      className="relative w-full h-full select-none pointer-events-none"
    >
      {/* 1. Ambient full/gain glow behind orb */}
      {(energyFull || gainFlash) && (
        <img
          src="/assets/ui/hud/effects/soul_glow.png"
          alt=""
          aria-hidden="true"
          className={`absolute pointer-events-none ${energyFull ? 'hud-full-glow' : 'opacity-80'}`}
          style={{
            left: '6.8%',
            top: '9.5%',
            width: '26%',
            height: '81%',
          }}
        />
      )}

      {/* 2. Circular Energy Orb Liquid Interior (clipped to exact inner circle behind hud_frame.png) */}
      <div
        className="absolute rounded-full overflow-hidden"
        style={{
          left: `${(82 / 728) * 100}%`,
          top: `${(44 / 213) * 100}%`,
          width: `${(124 / 728) * 100}%`,
          height: `${(124 / 213) * 100}%`,
          background:
            'radial-gradient(circle at 50% 35%, #2c303a 0%, #171920 70%, #0d0f14 100%)',
          boxShadow: energyFull
            ? 'inset 0 0 14px rgba(248, 250, 252, 0.55)'
            : spendFlash
              ? 'inset 0 0 12px rgba(168, 85, 247, 0.45)'
              : 'inset 0 0 10px rgba(0, 0, 0, 0.75)',
        }}
      >
        {/* Subtle misty motes inside vessel matching reference */}
        <div
          className="absolute inset-0 opacity-40"
          style={{
            backgroundImage:
              'radial-gradient(circle at 32% 30%, rgba(255,255,255,0.45) 1px, transparent 1.5px), radial-gradient(circle at 68% 42%, rgba(255,255,255,0.35) 1px, transparent 1.5px), radial-gradient(circle at 54% 22%, rgba(255,255,255,0.25) 1px, transparent 2px)',
          }}
        />

        {/* Dynamic Wavy Soul/Energy Liquid Fill */}
        <svg
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
          className="absolute inset-0 w-full h-full"
        >
          <defs>
            <linearGradient id="hioriOrbLiquidGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={spendFlash ? '#e9d5ff' : '#ffffff'} stopOpacity="0.96" />
              <stop offset="38%" stopColor={energyFull ? '#f8fafc' : '#e2e6ee'} stopOpacity="0.92" />
              <stop offset="100%" stopColor="#cfd5e0" stopOpacity="0.98" />
            </linearGradient>
          </defs>

          <g
            style={{
              transform: `translateY(${liquidTopY.toFixed(2)}px)`,
              transition: 'transform 260ms ease-out',
            }}
          >
            {/* Double-width looping wave path */}
            <path
              className="hud-wave-animate"
              d="M 0 0 Q 12.5 -5 25 0 T 50 0 T 75 0 T 100 0 T 125 0 T 150 0 T 175 0 T 200 0 L 200 120 L 0 120 Z"
              fill="url(#hioriOrbLiquidGrad)"
            />
            {/* Crisp bright surface crest */}
            <path
              className="hud-wave-animate"
              d="M 0 0 Q 12.5 -5 25 0 T 50 0 T 75 0 T 100 0 T 125 0 T 150 0 T 175 0 T 200 0"
              fill="none"
              stroke="#ffffff"
              strokeWidth="2.2"
              opacity="0.9"
            />
          </g>
        </svg>

        {/* Gain / Spend transient overlay inside orb */}
        {gainFlash && (
          <div className="absolute inset-0 bg-white/25 transition-opacity duration-200" />
        )}
        {spendFlash && (
          <div className="absolute inset-0 bg-purple-400/20 transition-opacity duration-200" />
        )}
      </div>

      {/* 3. Horizontal Ornamental Energy Bar Interior (same unified energy ratio) */}
      <div
        className="absolute overflow-hidden"
        style={{
          left: `${(240 / 728) * 100}%`,
          top: `${(115 / 213) * 100}%`,
          width: `${(408 / 728) * 100}%`,
          height: `${(14 / 213) * 100}%`,
          background: 'rgba(15, 17, 22, 0.82)',
        }}
      >
        <div
          data-testid="hud-energy-bar-fill"
          className="h-full w-full origin-left transition-transform duration-250 ease-out"
          style={{
            transform: `scaleX(${clampedRatio})`,
            background: spendFlash
              ? 'linear-gradient(90deg, #9333ea 0%, #d8b4fe 55%, #f8fafc 100%)'
              : energyFull
                ? 'linear-gradient(90deg, #cbd5e1 0%, #f1f5f9 45%, #ffffff 100%)'
                : 'linear-gradient(90deg, #6b7280 0%, #cbd5e1 45%, #f1f5f9 100%)',
            boxShadow: energyFull ? '0 0 10px rgba(255, 255, 255, 0.65)' : 'none',
          }}
        />
      </div>

      {/* 4. Official Ornamental Frame PNG Layer (from reference image) */}
      <img
        src="/assets/ui/hud/energy/hud_frame.png"
        alt=""
        aria-hidden="true"
        draggable={false}
        className="relative z-10 w-full h-full object-contain block pointer-events-none"
      />

      {/* 5. Health Skull Masks Layer seated on the upper ornamental thread */}
      <div className="absolute inset-0 z-20">{children}</div>
    </div>
  );
};
