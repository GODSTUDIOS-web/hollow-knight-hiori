import React, { useState } from 'react';
import { UI_ART } from '../../assets/uiArt';
import { getMenuStrings, LanguageCode } from '../../game/SettingsStore';
import {
  GothicBanner,
  GothicCornerOrnaments,
  GothicDivider,
  GothicMenuItem,
  HioriMaskCrest,
} from './GothicFrame';

interface SaveBenchModalProps {
  language: LanguageCode;
  areaName: string;
  onConfirmSave: () => void;
  onClose: () => void;
}

export const SaveBenchModal: React.FC<SaveBenchModalProps> = ({
  language,
  areaName,
  onConfirmSave,
  onClose,
}) => {
  const s = getMenuStrings(language);
  const [saved, setSaved] = useState(false);

  return (
    <div
      data-testid="save-bench-modal"
      role="dialog"
      aria-modal="true"
      aria-label={s.saveSystemTitle}
      className="fixed inset-0 z-40 bg-[#07050c]/88 flex items-center justify-center p-4 md:p-8"
    >
      <div className="relative w-full max-w-4xl min-h-[440px] bg-[#090611] border border-[#c4b5fd]/50 shadow-[0_0_55px_rgba(124,58,237,0.32)] overflow-hidden flex items-center justify-end">
        <img
          src={UI_ART.benchSaveBg}
          alt="Hiori descansando no banco de salvamento"
          referrerPolicy="no-referrer"
          className="absolute inset-0 w-full h-full object-cover object-left"
        />
        <div
          aria-hidden="true"
          className="absolute inset-0 bg-gradient-to-r from-[#07050c]/15 via-[#090611]/75 to-[#07050c]/95"
        />
        <GothicCornerOrnaments />

        <div className="relative z-10 w-full md:w-[54%] p-8 md:p-10 flex flex-col items-center text-center gap-4">
          <GothicBanner title={s.saveSystemTitle} />

          <div className="mt-2 flex flex-col items-center gap-2 w-full max-w-xs">
            <HioriMaskCrest className="w-6 h-8" glow={saved} />
            <h3 className="font-gothic text-lg md:text-xl text-[#f5f3ff]">
              {s.savePointHeading}
            </h3>
            <p className="text-sm text-[#d8d1e8]">
              {saved ? s.saveSuccess : s.saveQuestion}
            </p>
            <span className="text-[11px] text-[#a69cc2]">{areaName}</span>
            <GothicDivider className="w-full my-1" />
          </div>

          {!saved ? (
            <div className="w-full flex flex-col items-center gap-2">
              <GothicMenuItem
                label={s.yes}
                active
                onClick={() => {
                  onConfirmSave();
                  setSaved(true);
                }}
              />
              <GothicMenuItem label={s.no} onClick={onClose} />
            </div>
          ) : (
            <div className="w-full flex flex-col items-center gap-2">
              <GothicMenuItem label={s.back} active onClick={onClose} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
