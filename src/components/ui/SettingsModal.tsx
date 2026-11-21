import React from 'react';
import { ChevronLeft, ChevronRight, Globe, Monitor, Volume2, X } from 'lucide-react';
import {
  DisplayMode,
  GameSettings,
  getMenuStrings,
  LanguageCode,
} from '../../game/SettingsStore';
import { GothicBanner, GothicCornerOrnaments, HioriMaskCrest } from './GothicFrame';

interface SettingsModalProps {
  settings: GameSettings;
  onUpdateSettings: (partial: Partial<GameSettings>) => void;
  onToggleDisplayMode: (mode: DisplayMode) => void;
  onClose: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  settings,
  onUpdateSettings,
  onToggleDisplayMode,
  onClose,
}) => {
  const s = getMenuStrings(settings.language);
  const musicPct = Math.round(settings.musicVolume * 100);
  const sfxPct = Math.round(settings.sfxVolume * 100);

  const cycleLanguage = () => {
    const next: LanguageCode = settings.language === 'pt-BR' ? 'en' : 'pt-BR';
    onUpdateSettings({ language: next });
  };

  const cycleDisplay = () => {
    const next: DisplayMode = settings.displayMode === 'windowed' ? 'fullscreen' : 'windowed';
    onToggleDisplayMode(next);
  };

  return (
    <div
      data-testid="settings-modal"
      role="dialog"
      aria-modal="true"
      aria-label={s.settingsTitle}
      className="fixed inset-0 z-40 bg-[#07050c]/90 flex items-center justify-center p-4 md:p-8"
    >
      <div className="relative w-full max-w-4xl bg-[#0a0712] border border-[#c4b5fd]/50 shadow-[0_0_55px_rgba(124,58,237,0.3)] overflow-hidden p-6 md:p-10">
        {/* Subtle violet ambient backdrop matching bottom-right panel */}
        <div
          aria-hidden="true"
          className="absolute inset-0 bg-[radial-gradient(circle_at_82%_55%,rgba(124,58,237,0.22),transparent_58%)] pointer-events-none"
        />
        <GothicCornerOrnaments />

        <div className="relative z-10 flex items-center justify-between gap-4 mb-8">
          <GothicBanner title={s.settingsTitle} />
          <button
            type="button"
            onClick={onClose}
            aria-label={s.back}
            className="w-9 h-9 rounded-sm border border-[#c4b5fd]/40 bg-[#140e24] hover:bg-[#22173d] text-[#e9d5ff] flex items-center justify-center cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="relative z-10 grid grid-cols-1 md:grid-cols-12 gap-8 items-center">
          {/* Controls Column */}
          <div className="md:col-span-8 flex flex-col gap-5">
            {/* Música Slider */}
            <label className="grid grid-cols-12 items-center gap-3">
              <span className="col-span-5 flex items-center gap-3 font-gothic text-sm md:text-base text-[#f5f3ff]">
                <Volume2 className="w-4 h-4 text-[#d8b4fe] shrink-0" />
                {s.music}
              </span>
              <div className="col-span-5 flex items-center">
                <input
                  type="range"
                  aria-label={s.music}
                  min={0}
                  max={100}
                  value={musicPct}
                  onChange={(e) =>
                    onUpdateSettings({ musicVolume: Number(e.target.value) / 100 })
                  }
                  className="gothic-range w-full cursor-pointer"
                />
              </div>
              <span className="col-span-2 text-right font-mono-tabular text-xs text-[#d8b4fe]">
                {musicPct}%
              </span>
            </label>

            {/* Efeitos Slider */}
            <label className="grid grid-cols-12 items-center gap-3">
              <span className="col-span-5 flex items-center gap-3 font-gothic text-sm md:text-base text-[#f5f3ff]">
                <Volume2 className="w-4 h-4 text-[#d8b4fe] shrink-0" />
                {s.sfx}
              </span>
              <div className="col-span-5 flex items-center">
                <input
                  type="range"
                  aria-label={s.sfx}
                  min={0}
                  max={100}
                  value={sfxPct}
                  onChange={(e) =>
                    onUpdateSettings({ sfxVolume: Number(e.target.value) / 100 })
                  }
                  className="gothic-range w-full cursor-pointer"
                />
              </div>
              <span className="col-span-2 text-right font-mono-tabular text-xs text-[#d8b4fe]">
                {sfxPct}%
              </span>
            </label>

            {/* Idioma Selector */}
            <div className="grid grid-cols-12 items-center gap-3">
              <span className="col-span-5 flex items-center gap-3 font-gothic text-sm md:text-base text-[#f5f3ff]">
                <Globe className="w-4 h-4 text-[#d8b4fe] shrink-0" />
                {s.language}
              </span>
              <div className="col-span-7 flex items-center justify-between max-w-[240px] border border-[#c4b5fd]/30 bg-[#140e24]/80 px-2 py-1.5">
                <button
                  type="button"
                  onClick={cycleLanguage}
                  aria-label="Idioma anterior"
                  className="p-1 text-[#c4b5fd] hover:text-white cursor-pointer"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="font-gothic text-sm text-[#f5f3ff] whitespace-nowrap">
                  {s.languageName}
                </span>
                <button
                  type="button"
                  onClick={cycleLanguage}
                  aria-label="Próximo idioma"
                  className="p-1 text-[#c4b5fd] hover:text-white cursor-pointer"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Tela Selector */}
            <div className="grid grid-cols-12 items-center gap-3">
              <span className="col-span-5 flex items-center gap-3 font-gothic text-sm md:text-base text-[#f5f3ff]">
                <Monitor className="w-4 h-4 text-[#d8b4fe] shrink-0" />
                {s.screen}
              </span>
              <div className="col-span-7 flex items-center justify-between max-w-[240px] border border-[#c4b5fd]/30 bg-[#140e24]/80 px-2 py-1.5">
                <button
                  type="button"
                  onClick={cycleDisplay}
                  aria-label="Alternar modo de tela"
                  className="p-1 text-[#c4b5fd] hover:text-white cursor-pointer"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="font-gothic text-sm text-[#f5f3ff] whitespace-nowrap">
                  {settings.displayMode === 'fullscreen' ? s.fullscreen : s.windowed}
                </span>
                <button
                  type="button"
                  onClick={cycleDisplay}
                  aria-label="Alternar modo de tela"
                  className="p-1 text-[#c4b5fd] hover:text-white cursor-pointer"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>

          {/* Right Glowing Hiori Emblem matching reference */}
          <div className="md:col-span-4 flex flex-col items-center justify-center py-4">
            <div className="relative p-6">
              <div
                aria-hidden="true"
                className="absolute inset-0 rounded-full bg-[radial-gradient(circle,rgba(168,85,247,0.45)_0%,rgba(124,58,237,0.12)_55%,transparent_75%)]"
              />
              <HioriMaskCrest className="relative z-10 w-24 h-28" glow />
            </div>
          </div>
        </div>

        <div className="relative z-10 mt-8 flex justify-end">
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
