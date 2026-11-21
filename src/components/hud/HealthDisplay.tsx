import React from 'react';

interface HealthDisplayProps {
  currentHp: number;
  maxHp: number;
  healFlash: boolean;
  hurtFlash: boolean;
}

/**
 * Renders Hiori's official skull/mask health indicators strung along the upper thread
 * of the ornamental HUD frame (`728 x 213` reference space).
 * Supports dynamic `maxHp` expansion beyond 5 masks.
 */
export const HealthDisplay: React.FC<HealthDisplayProps> = ({
  currentHp,
  maxHp,
  healFlash,
  hurtFlash,
}) => {
  const count = Math.max(1, maxHp);
  // Reference coordinates inside 728x213 frame:
  // First skull at x=255, y=26, spacing=72.8, skull width=57, skull height=69
  const baseLeftPx = 255;
  const maxTrackSpan = 364;
  const stepPx = count <= 5 ? 72.8 : maxTrackSpan / count;
  const scaleFactor = count <= 5 ? 1 : Math.max(0.65, 5 / count);
  const skullW = 57 * scaleFactor;
  const skullH = 69 * scaleFactor;
  const topPx = 26 + (69 - skullH) * 0.5;

  return (
    <div
      data-testid="hud-health-display"
      aria-label={`Vida do Jogador: ${currentHp} de ${maxHp}`}
      className={`absolute inset-0 pointer-events-none ${hurtFlash ? 'hud-hurt-animate' : ''}`}
    >
      {Array.from({ length: count }, (_, idx) => {
        const filled = idx < currentHp;
        const leftPct = ((baseLeftPx + idx * stepPx) / 728) * 100;
        const topPct = (topPx / 213) * 100;
        const widthPct = (skullW / 728) * 100;
        const heightPct = (skullH / 213) * 100;

        return (
          <div
            key={idx}
            data-mask-index={idx}
            data-filled={filled ? 'true' : 'false'}
            className={`absolute transition-all duration-150 ${
              filled && healFlash ? 'hud-heal-animate' : ''
            }`}
            style={{
              left: `${leftPct.toFixed(3)}%`,
              top: `${topPct.toFixed(3)}%`,
              width: `${widthPct.toFixed(3)}%`,
              height: `${heightPct.toFixed(3)}%`,
            }}
          >
            {filled && healFlash && (
              <img
                src="/assets/ui/hud/effects/soul_glow.png"
                alt=""
                aria-hidden="true"
                className="absolute -inset-2 w-[calc(100%+16px)] h-[calc(100%+16px)] object-contain opacity-65 pointer-events-none"
              />
            )}
            <img
              src={
                filled
                  ? '/assets/ui/hud/health/mask_full.png'
                  : '/assets/ui/hud/health/mask_empty.png'
              }
              alt=""
              aria-hidden="true"
              draggable={false}
              className={`w-full h-full object-contain select-none transition-transform duration-150 ${
                filled ? 'opacity-100 scale-100' : 'opacity-90 scale-[0.95]'
              } ${!filled && hurtFlash && idx === currentHp ? 'brightness-125 drop-shadow-[0_0_6px_rgba(239,68,68,0.65)]' : ''}`}
            />
          </div>
        );
      })}
    </div>
  );
};
