import React from 'react';

interface CurrencyDisplayProps {
  coins: number;
  coinFlash: boolean;
}

/**
 * Renders Hiori's official top-right crystal icon and numeric counter
 * with a fully transparent background matching the reference layout.
 */
export const CurrencyDisplay: React.FC<CurrencyDisplayProps> = ({ coins, coinFlash }) => {
  return (
    <div
      data-testid="hud-currency-display"
      aria-label={`Moedas: ${coins}`}
      className={`inline-flex items-center gap-2.5 select-none pointer-events-none ${
        coinFlash ? 'hud-coin-animate' : ''
      }`}
    >
      <img
        src="/assets/ui/hud/currency/crystal_icon.png"
        alt=""
        aria-hidden="true"
        draggable={false}
        className="w-[clamp(22px,2.2vw,34px)] h-auto object-contain drop-shadow-[0_2px_6px_rgba(0,0,0,0.65)]"
      />
      <span
        data-testid="hud-currency-value"
        className="font-mono-tabular font-semibold text-[#f1f5f9] leading-none tracking-tight drop-shadow-[0_2px_6px_rgba(0,0,0,0.8)]"
        style={{ fontSize: 'clamp(1.25rem, 2.2vw, 2.1rem)' }}
      >
        {coins}
      </span>
    </div>
  );
};
