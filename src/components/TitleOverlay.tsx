import React, { useEffect, useState } from 'react';
import { UI_ART } from '../assets/uiArt';
import { getMenuStrings, LanguageCode } from '../game/SettingsStore';
import { GothicCornerOrnaments, GothicMenuItem, HioriMaskCrest } from './ui/GothicFrame';

interface TitleOverlayProps {
  hasSave: boolean;
  savedAreaName?: string;
  language: LanguageCode;
  modalOpen: boolean;
  onPlay: () => void;
  onContinue: () => void;
  onOpenExtras: () => void;
  onOpenSettings: () => void;
  onOpenCredits: () => void;
  onExit: () => void;
}

type TitleItemKey = 'play' | 'continue' | 'extras' | 'settings' | 'credits' | 'exit';

export const TitleOverlay: React.FC<TitleOverlayProps> = ({
  hasSave,
  savedAreaName,
  language,
  modalOpen,
  onPlay,
  onContinue,
  onOpenExtras,
  onOpenSettings,
  onOpenCredits,
  onExit,
}) => {
  const s = getMenuStrings(language);
  const [activeKey, setActiveKey] = useState<TitleItemKey>('play');
  const [exitMessage, setExitMessage] = useState(false);

  const items: {
    key: TitleItemKey;
    label: string;
    disabled?: boolean;
    hint?: string;
    action: () => void;
  }[] = [
    { key: 'play', label: s.play, action: onPlay },
    {
      key: 'continue',
      label: s.continueGame,
      disabled: !hasSave,
      hint: hasSave ? savedAreaName : s.noSaveHint,
      action: onContinue,
    },
    { key: 'extras', label: s.extras, action: onOpenExtras },
    { key: 'settings', label: s.settings, action: onOpenSettings },
    { key: 'credits', label: s.credits, action: onOpenCredits },
    {
      key: 'exit',
      label: s.exit,
      action: () => {
        setExitMessage(true);
        onExit();
      },
    },
  ];

  // Keyboard navigation on Title Screen while preserving Enter/Space immediate start on 'play'
  useEffect(() => {
    if (modalOpen) return;

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'ArrowDown' || e.code === 'KeyS') {
        e.preventDefault();
        setActiveKey((prev) => {
          const enabled = items.filter((it) => !it.disabled);
          const idx = enabled.findIndex((it) => it.key === prev);
          return enabled[(idx + 1) % enabled.length]?.key ?? 'play';
        });
      } else if (e.code === 'ArrowUp' || e.code === 'KeyW') {
        e.preventDefault();
        setActiveKey((prev) => {
          const enabled = items.filter((it) => !it.disabled);
          const idx = enabled.findIndex((it) => it.key === prev);
          return enabled[(idx - 1 + enabled.length) % enabled.length]?.key ?? 'play';
        });
      } else if (e.code === 'Enter' || e.code === 'Space') {
        e.preventDefault();
        const current = items.find((it) => it.key === activeKey && !it.disabled) ?? items[0];
        current.action();
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  });

  return (
    <div
      data-testid="title-screen"
      className="fixed inset-0 z-20 bg-[#08060d] overflow-hidden flex items-center justify-end"
    >
      {/* Full-bleed Gothic Key-Art Backdrop matching reference */}
      <img
        src={UI_ART.titleRuinsBg}
        alt="Hiori nas ruínas sob a lua crescente"
        referrerPolicy="no-referrer"
        draggable={false}
        className="absolute inset-0 w-full h-full object-cover object-left select-none"
      />

      {/* Atmospheric right-side dark scrim ensuring high WCAG contrast for title & menu */}
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-gradient-to-r from-[#07050c]/20 via-[#090611]/70 to-[#07050c]/95"
      />
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-gradient-to-t from-[#07050c]/85 via-transparent to-[#07050c]/55"
      />

      {/* Ornamental Gothic Border Frame */}
      <GothicCornerOrnaments />

      {/* Right-side Title Lockup & Menu Column */}
      <div className="relative z-10 w-full md:w-[50%] lg:w-[44%] h-full flex flex-col items-center justify-center px-6 md:px-12 py-10">
        {/* Bespoke Ornate Title Crest */}
        <div className="flex flex-col items-center text-center mb-6 md:mb-8">
          <span className="font-gothic text-xs md:text-sm tracking-[0.38em] text-[#e2dbf3] uppercase">
            HOLLOW KNIGHT
          </span>
          <div className="relative mt-1 flex items-center gap-4">
            <svg viewBox="0 0 80 34" className="w-12 md:w-16 h-auto text-[#d8cfe8]/75" fill="none" aria-hidden="true">
              <path d="M78 14 C56 14 40 28 18 28 C10 28 4 22 4 14 C12 20 26 18 38 10" stroke="currentColor" strokeWidth="1.4" />
              <circle cx="8" cy="14" r="2" fill="#e9d5ff" />
            </svg>
            <h1 className="font-gothic text-4xl sm:text-5xl md:text-6xl font-bold tracking-[0.14em] text-[#faf8ff] drop-shadow-[0_4px_20px_rgba(168,85,247,0.45)]">
              HIORI
            </h1>
            <svg viewBox="0 0 80 34" className="w-12 md:w-16 h-auto -scale-x-100 text-[#d8cfe8]/75" fill="none" aria-hidden="true">
              <path d="M78 14 C56 14 40 28 18 28 C10 28 4 22 4 14 C12 20 26 18 38 10" stroke="currentColor" strokeWidth="1.4" />
              <circle cx="8" cy="14" r="2" fill="#e9d5ff" />
            </svg>
          </div>
          <div className="mt-1 flex items-center gap-3 w-48">
            <span className="h-[1px] flex-1 bg-gradient-to-r from-transparent to-[#c4b5fd]/75" />
            <HioriMaskCrest className="w-7 h-9" />
            <span className="h-[1px] flex-1 bg-gradient-to-l from-transparent to-[#c4b5fd]/75" />
          </div>
        </div>

        {/* Interactive Menu Stack */}
        <nav aria-label="Menu Principal" className="w-full flex flex-col items-center gap-1.5">
          {items.map((item) => (
            <GothicMenuItem
              key={item.key}
              label={item.label}
              active={activeKey === item.key}
              disabled={item.disabled}
              hint={item.hint}
              dataStart={item.key === 'play'}
              onMouseEnter={() => {
                if (!item.disabled) setActiveKey(item.key);
              }}
              onClick={item.action}
            />
          ))}
        </nav>

        {exitMessage && (
          <p className="mt-4 text-xs text-[#c4b5fd] text-center">
            {language === 'en'
              ? 'Session reset. Press Play whenever you wish to enter the ruins.'
              : 'Sessão encerrada com segurança. Pressione Play para retornar às ruínas.'}
          </p>
        )}
      </div>

      {/* Bottom Safe Control Hint Line */}
      <div className="absolute bottom-4 inset-x-6 text-center pointer-events-none">
        <p className="text-[11px] text-[#9b92b5] font-mono-tabular tracking-tight">
          A / D Mover · Shift Correr · Espaço Saltar (2x) · J / W+J / K / D+K Ataques · L Dash · I Transf. · O Projétil · E Interagir · Esc Pausar
        </p>
      </div>
    </div>
  );
};
