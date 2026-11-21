import React from 'react';
import { Lightbulb } from 'lucide-react';
import { UI_ART } from '../../assets/uiArt';
import { AreaId, getMenuStrings, LanguageCode } from '../../game/SettingsStore';
import { GothicBanner, GothicCornerOrnaments, GothicProgressBar } from './GothicFrame';

interface LoadingScreenProps {
  variant: 'initial' | 'area';
  targetArea: AreaId;
  progress: number;
  language: LanguageCode;
}

export const LoadingScreen: React.FC<LoadingScreenProps> = ({
  variant,
  targetArea,
  progress,
  language,
}) => {
  const s = getMenuStrings(language);
  const roundedPct = Math.round(Math.max(0, Math.min(100, progress)));

  if (variant === 'area') {
    const areaCaption = targetArea === 'cathedral' ? s.enteringCathedral : s.enteringRuins;
    return (
      <div
        data-testid="area-loading-screen"
        className="fixed inset-0 z-50 bg-[#06040b] flex flex-col items-center justify-center overflow-hidden p-6"
      >
        <img
          src={UI_ART.cathedralAreaBg}
          alt={areaCaption}
          referrerPolicy="no-referrer"
          className="absolute inset-0 w-full h-full object-cover opacity-80"
        />
        <div
          aria-hidden="true"
          className="absolute inset-0 bg-gradient-to-b from-[#07050c]/80 via-[#0b0714]/55 to-[#07050c]/90"
        />
        <GothicCornerOrnaments />

        <div className="relative z-10 w-full max-w-xl flex flex-col items-center text-center gap-6">
          <GothicBanner title={s.areaLoadingTitle} />
          <p className="font-gothic text-2xl md:text-3xl text-[#f5f3ff] drop-shadow-[0_2px_12px_rgba(168,85,247,0.5)]">
            {areaCaption}
          </p>
          <div className="w-full max-w-md flex flex-col items-center gap-2.5">
            <GothicProgressBar progress={roundedPct} />
            <span className="font-gothic text-lg text-[#e9d5ff] font-mono-tabular">
              {roundedPct}%
            </span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      data-testid="initial-loading-screen"
      className="fixed inset-0 z-50 bg-[#06040b] flex items-center justify-end overflow-hidden p-6 md:p-12"
    >
      <img
        src={UI_ART.titleRuinsBg}
        alt="Carregando Cidade das Ruínas"
        referrerPolicy="no-referrer"
        className="absolute inset-0 w-full h-full object-cover object-left"
      />
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-gradient-to-r from-[#07050c]/30 via-[#090611]/75 to-[#07050c]/95"
      />
      <GothicCornerOrnaments />

      <div className="relative z-10 w-full md:w-[54%] flex flex-col items-center justify-between h-full py-6">
        <div className="self-start md:self-center">
          <GothicBanner title={s.loadingTitle} />
        </div>

        <div className="max-w-md flex items-start gap-3.5 text-left px-4">
          <Lightbulb className="w-7 h-7 text-[#e9d5ff] shrink-0 mt-0.5 drop-shadow-[0_0_10px_rgba(196,181,253,0.65)]" />
          <div>
            <div className="font-gothic text-base md:text-lg text-[#f5f3ff]">{s.loadingTipLabel}</div>
            <p className="mt-1 text-sm md:text-base text-[#d8d1e8] leading-relaxed">
              {s.loadingTipText}
            </p>
          </div>
        </div>

        <div className="w-full max-w-lg flex flex-col items-center gap-2">
          <div className="w-full flex items-center gap-3">
            <div className="flex-1">
              <GothicProgressBar progress={roundedPct} />
            </div>
            <span className="font-gothic text-base text-[#f5f3ff] font-mono-tabular w-12 text-right">
              {roundedPct}%
            </span>
          </div>
          <p className="font-gothic text-xs md:text-sm tracking-wide text-[#c4b5fd]">
            {s.loadingRuins}
          </p>
        </div>
      </div>
    </div>
  );
};
