import React from 'react';
import { HudSnapshot } from '../game/types';
import { GothicBanner, GothicCornerOrnaments, GothicDivider } from './ui/GothicFrame';

interface PauseModalProps {
  snapshot: HudSnapshot;
  onResume: () => void;
  onOpenSaveBench: () => void;
  onOpenSettings: () => void;
  onRestart: () => void;
  onReturnToTitle: () => void;
}

export const PauseModal: React.FC<PauseModalProps> = ({
  snapshot,
  onResume,
  onOpenSaveBench,
  onOpenSettings,
  onRestart,
  onReturnToTitle,
}) => {
  return (
    <div
      data-testid="pause-modal"
      className="fixed inset-0 z-30 flex items-center justify-center bg-[#07050c]/82 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="pause-title"
    >
      <div className="relative w-full max-w-sm border border-[#c4b5fd]/45 bg-[#0b0813] p-7 shadow-[0_0_50px_rgba(124,58,237,0.3)]">
        <GothicCornerOrnaments />

        <div className="relative z-10 flex flex-col items-center text-center">
          <GothicBanner title="Jogo Pausado" />
          <p id="pause-title" className="mt-2.5 text-xs text-[#a69cc2]">
            Hollow Knight: Hiori · {snapshot.currentAreaName}
          </p>
        </div>

        <div className="relative z-10 mt-4 grid grid-cols-3 gap-3 border-y border-[#c4b5fd]/20 py-3.5 text-center">
          <div>
            <div className="text-[11px] text-[#a69cc2]">Dano Total</div>
            <div className="mt-0.5 font-mono-tabular text-base font-semibold text-[#f5f3ff]">
              {snapshot.totalDamage}
            </div>
          </div>
          <div>
            <div className="text-[11px] text-[#a69cc2]">Cristais</div>
            <div className="mt-0.5 font-mono-tabular text-base font-semibold text-[#f5f3ff]">
              {snapshot.coins}
            </div>
          </div>
          <div>
            <div className="text-[11px] text-[#a69cc2]">Vida</div>
            <div className="mt-0.5 font-mono-tabular text-base font-semibold text-[#f5f3ff]">
              {snapshot.playerHp}/{snapshot.playerMaxHp}
            </div>
          </div>
        </div>

        <GothicDivider className="relative z-10 my-3" />

        <div className="relative z-10 flex flex-col gap-2">
          <button
            type="button"
            onClick={(e) => {
              e.currentTarget.blur();
              onResume();
            }}
            className="w-full py-2.5 px-4 border border-[#e9d5ff]/75 bg-[#2a1c47] hover:bg-[#3a2861] text-white font-gothic font-semibold text-sm tracking-wide transition-colors cursor-pointer whitespace-nowrap"
          >
            Continuar
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.currentTarget.blur();
              onOpenSaveBench();
            }}
            className="w-full py-2 px-4 border border-[#c4b5fd]/30 bg-[#140e24] hover:bg-[#201638] text-[#e9d5ff] font-gothic text-sm transition-colors cursor-pointer whitespace-nowrap"
          >
            Salvar no Banco
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.currentTarget.blur();
              onOpenSettings();
            }}
            className="w-full py-2 px-4 border border-[#c4b5fd]/30 bg-[#140e24] hover:bg-[#201638] text-[#e9d5ff] font-gothic text-sm transition-colors cursor-pointer whitespace-nowrap"
          >
            Configurações e Áudio
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.currentTarget.blur();
              onRestart();
            }}
            className="w-full py-2 px-4 border border-[#c4b5fd]/25 bg-[#110c1c] hover:bg-[#1c142e] text-[#cbd5e1] text-sm font-medium transition-colors cursor-pointer whitespace-nowrap"
          >
            Reiniciar Arena
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.currentTarget.blur();
              onReturnToTitle();
            }}
            className="w-full py-1.5 px-4 text-[#a69cc2] text-sm font-medium hover:text-[#f5f3ff] transition-colors cursor-pointer whitespace-nowrap"
          >
            Tela Inicial
          </button>
        </div>
      </div>
    </div>
  );
};
