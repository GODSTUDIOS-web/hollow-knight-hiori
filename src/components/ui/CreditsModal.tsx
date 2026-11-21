import React from 'react';
import { X } from 'lucide-react';
import { getMenuStrings, LanguageCode } from '../../game/SettingsStore';
import { GothicBanner, GothicCornerOrnaments, GothicDivider, HioriMaskCrest } from './GothicFrame';

interface CreditsModalProps {
  language: LanguageCode;
  onClose: () => void;
}

export const CreditsModal: React.FC<CreditsModalProps> = ({ language, onClose }) => {
  const s = getMenuStrings(language);
  return (
    <div
      data-testid="credits-modal"
      role="dialog"
      aria-modal="true"
      aria-label={s.creditsTitle}
      className="fixed inset-0 z-40 bg-[#07050c]/90 flex items-center justify-center p-4"
    >
      <div className="relative w-full max-w-lg bg-[#0a0712] border border-[#c4b5fd]/50 shadow-[0_0_55px_rgba(124,58,237,0.3)] p-8 text-center">
        <GothicCornerOrnaments />

        <div className="relative z-10 flex items-center justify-between mb-6">
          <GothicBanner title={s.creditsTitle} />
          <button
            type="button"
            onClick={onClose}
            aria-label={s.back}
            className="w-9 h-9 rounded-sm border border-[#c4b5fd]/40 bg-[#140e24] hover:bg-[#22173d] text-[#e9d5ff] flex items-center justify-center cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="relative z-10 flex flex-col items-center gap-3 py-2">
          <HioriMaskCrest className="w-10 h-12" glow />
          <h3 className="font-gothic text-xl text-[#f5f3ff]">Hollow Knight: Hiori</h3>
          <p className="text-xs text-[#b5acd0]">
            {language === 'en'
              ? '2D Action-Platformer Prototype · Modular Combat, Sprites, Official HUD & Gothic UI'
              : 'Protótipo de Ação e Plataforma 2D · Combate Modular, Sprites, HUD Oficial e Interface Gótica'}
          </p>
          <GothicDivider className="w-full my-2" />
          <div className="space-y-1.5 text-sm text-[#e2dbf3]">
            <div>
              <span className="text-[#a69cc2]">Personagem & Direção Visual:</span> Hiori
            </div>
            <div>
              <span className="text-[#a69cc2]">Motor 2D:</span> HTML5 Canvas · Arquitetura Modular
            </div>
            <div>
              <span className="text-[#a69cc2]">Áudio Procedural:</span> Web Audio Synth
            </div>
          </div>
        </div>

        <div className="relative z-10 mt-6 flex justify-center">
          <button
            type="button"
            onClick={onClose}
            className="px-6 py-2 border border-[#c4b5fd]/50 bg-[#150f24] hover:bg-[#24193d] text-[#f5f3ff] font-gothic text-sm tracking-wide cursor-pointer"
          >
            {s.back}
          </button>
        </div>
      </div>
    </div>
  );
};
