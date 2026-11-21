import React, { useState } from 'react';
import { Crown, Disc, Gamepad2, Music, RefreshCw, Sparkles, X } from 'lucide-react';
import { UI_ART } from '../../assets/uiArt';
import {
  getMenuStrings,
  LanguageCode,
  PLAYER_SKINS,
  PlayerSkinId,
} from '../../game/SettingsStore';
import { GothicBanner, GothicCornerOrnaments } from './GothicFrame';

interface ExtrasModalProps {
  language: LanguageCode;
  selectedSkin: PlayerSkinId;
  unlockedSkins: PlayerSkinId[];
  availableCoins: number;
  soundtrackPlaying: boolean;
  onSelectSkin: (skin: PlayerSkinId) => void;
  onUnlockSkin: (skin: PlayerSkinId, cost: number) => boolean;
  onToggleSoundtrack: () => void;
  onClose: () => void;
}

type ExtrasSection = 'dlcs' | 'skins' | 'soundtrack' | 'unlocks';

export const ExtrasModal: React.FC<ExtrasModalProps> = ({
  language,
  selectedSkin,
  unlockedSkins,
  availableCoins,
  soundtrackPlaying,
  onSelectSkin,
  onUnlockSkin,
  onToggleSoundtrack,
  onClose,
}) => {
  const s = getMenuStrings(language);
  const [section, setSection] = useState<ExtrasSection>('dlcs');
  const [feedback, setFeedback] = useState<string | null>(null);

  const navItems: {
    id: ExtrasSection | 'multiplayer';
    label: string;
    icon: React.ReactNode;
    disabled?: boolean;
  }[] = [
    { id: 'dlcs', label: s.availableDlcs, icon: <Crown className="w-4 h-4" /> },
    { id: 'skins', label: s.changeSkin, icon: <RefreshCw className="w-4 h-4" /> },
    { id: 'soundtrack', label: s.soundtrack, icon: <Music className="w-4 h-4" /> },
    { id: 'unlocks', label: s.unlockableSkins, icon: <Sparkles className="w-4 h-4" /> },
    {
      id: 'multiplayer',
      label: s.multiplayerSoon,
      icon: <Gamepad2 className="w-4 h-4" />,
      disabled: true,
    },
  ];

  return (
    <div
      data-testid="extras-modal"
      role="dialog"
      aria-modal="true"
      aria-label={s.extrasTitle}
      className="fixed inset-0 z-40 bg-[#07050c]/92 flex items-center justify-center p-4 md:p-8"
    >
      <div className="relative w-full max-w-5xl min-h-[520px] max-h-[90vh] bg-[#0b0813] border border-[#c4b5fd]/45 shadow-[0_0_60px_rgba(124,58,237,0.3)] overflow-hidden grid grid-cols-1 md:grid-cols-12">
        <GothicCornerOrnaments />

        {/* Left Portrait Panel matching reference */}
        <div className="relative hidden md:block md:col-span-5 bg-[#090611] overflow-hidden">
          <img
            src={UI_ART.extrasHioriPortrait}
            alt="Retrato de Hiori nas ruínas"
            referrerPolicy="no-referrer"
            className="w-full h-full object-cover object-center"
          />
          <div
            aria-hidden="true"
            className="absolute inset-0 bg-gradient-to-r from-transparent via-transparent to-[#0b0813]"
          />
        </div>

        {/* Right Interactive Column */}
        <div className="relative z-10 md:col-span-7 flex flex-col justify-between p-6 md:p-10 overflow-y-auto">
          <div>
            <div className="flex items-center justify-between gap-4 mb-6">
              <GothicBanner title={s.extrasTitle} />
              <button
                type="button"
                onClick={onClose}
                aria-label={s.back}
                className="w-9 h-9 rounded-sm border border-[#c4b5fd]/40 bg-[#140e24] hover:bg-[#22173d] text-[#e9d5ff] flex items-center justify-center cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Category Selector Row */}
            <div className="flex flex-col gap-2 mb-6">
              {navItems.map((item) => {
                const isActive = item.id === section;
                return (
                  <button
                    key={item.id}
                    type="button"
                    disabled={item.disabled}
                    onClick={() => {
                      if (!item.disabled && item.id !== 'multiplayer') {
                        setSection(item.id);
                        setFeedback(null);
                      }
                    }}
                    className={`relative w-full px-4 py-2.5 flex items-center gap-3 text-left border transition-all ${
                      item.disabled
                        ? 'opacity-45 cursor-not-allowed border-transparent text-[#8b81a6]'
                        : isActive
                          ? 'border-[#e9d5ff]/70 bg-gradient-to-r from-[#2e1e54]/80 via-[#1b1233]/75 to-transparent text-white cursor-pointer shadow-[0_0_16px_rgba(168,85,247,0.22)]'
                          : 'border-[#c4b5fd]/15 bg-[#120d1f]/60 hover:border-[#c4b5fd]/45 text-[#d8d1e8] cursor-pointer'
                    }`}
                  >
                    <span className="text-[#d8b4fe] shrink-0">{item.icon}</span>
                    <span className="font-gothic text-sm md:text-base tracking-wide">
                      {item.label}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Detail Panel for Active Option */}
            <div className="border-t border-[#c4b5fd]/20 pt-4">
              {section === 'dlcs' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="p-3.5 border border-[#c4b5fd]/25 bg-[#140f22]/75">
                    <div className="font-gothic text-sm text-[#f5f3ff]">Catedral Sombria</div>
                    <p className="mt-1 text-xs text-[#b5acd0] leading-relaxed">
                      {language === 'en'
                        ? 'Accessible via the far-right sanctuary portal in the Ruins arena.'
                        : 'Acessível pelo portal à direita na arena da Cidade das Ruínas.'}
                    </p>
                  </div>
                  <div className="p-3.5 border border-[#c4b5fd]/25 bg-[#140f22]/75">
                    <div className="font-gothic text-sm text-[#f5f3ff]">Câmara das Máscaras</div>
                    <p className="mt-1 text-xs text-[#b5acd0] leading-relaxed">
                      {language === 'en'
                        ? 'Arena challenge & vessel resonance expansion · Included in Prototype.'
                        : 'Expansão de ressonância de energia e combate · Integrada ao protótipo.'}
                    </p>
                  </div>
                </div>
              )}

              {(section === 'skins' || section === 'unlocks') && (
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between text-xs text-[#b5acd0]">
                    <span>
                      {language === 'en' ? 'Active Attire' : 'Aparência Ativa'}
                    </span>
                    <span className="font-mono-tabular text-[#e9d5ff]">
                      {language === 'en' ? 'Crystals:' : 'Cristais:'} {availableCoins}
                    </span>
                  </div>
                  {PLAYER_SKINS.map((skin) => {
                    const isUnlocked = unlockedSkins.includes(skin.id);
                    const isEquipped = selectedSkin === skin.id;
                    return (
                      <div
                        key={skin.id}
                        className="flex items-center justify-between gap-3 p-3 border border-[#c4b5fd]/25 bg-[#140f22]/80"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <span
                            className="w-3.5 h-3.5 rounded-full shrink-0 border border-white/50"
                            style={{ backgroundColor: skin.auraColor }}
                          />
                          <div className="min-w-0">
                            <div className="font-gothic text-sm text-[#f5f3ff] truncate">
                              {language === 'en' ? skin.nameEn : skin.namePt}
                            </div>
                            <div className="text-[11px] text-[#9f95bc] truncate">
                              {language === 'en' ? skin.descEn : skin.descPt}
                            </div>
                          </div>
                        </div>

                        {isUnlocked ? (
                          <button
                            type="button"
                            onClick={() => {
                              onSelectSkin(skin.id);
                              setFeedback(
                                language === 'en' ? 'Skin equipped.' : 'Aparência equipada.'
                              );
                            }}
                            className={`px-3 py-1.5 text-xs font-medium border shrink-0 cursor-pointer ${
                              isEquipped
                                ? 'border-[#e9d5ff] bg-[#7c3aed]/40 text-white'
                                : 'border-[#c4b5fd]/35 bg-[#1d1532] hover:bg-[#2a1e47] text-[#e9d5ff]'
                            }`}
                          >
                            {isEquipped
                              ? language === 'en'
                                ? 'Equipped'
                                : 'Equipada'
                              : language === 'en'
                                ? 'Equip'
                                : 'Equipar'}
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => {
                              const ok = onUnlockSkin(skin.id, skin.costCoins);
                              setFeedback(
                                ok
                                  ? language === 'en'
                                    ? 'Skin unlocked!'
                                    : 'Skin desbloqueada!'
                                  : language === 'en'
                                    ? `Need ${skin.costCoins} crystals.`
                                    : `Necessário ${skin.costCoins} cristais.`
                              );
                            }}
                            className="px-3 py-1.5 text-xs font-mono-tabular border border-[#c4b5fd]/45 bg-[#23183d] hover:bg-[#35245b] text-[#f5f3ff] shrink-0 cursor-pointer"
                          >
                            {skin.costCoins} {language === 'en' ? 'Crystals' : 'Cristais'}
                          </button>
                        )}
                      </div>
                    );
                  })}
                  {feedback && <p className="text-xs text-[#d8b4fe] pt-1">{feedback}</p>}
                </div>
              )}

              {section === 'soundtrack' && (
                <div className="flex items-center justify-between gap-4 p-4 border border-[#c4b5fd]/25 bg-[#140f22]/80">
                  <div className="flex items-center gap-3">
                    <Disc className={`w-6 h-6 text-[#c4b5fd] ${soundtrackPlaying ? 'animate-spin' : ''}`} />
                    <div>
                      <div className="font-gothic text-sm text-[#f5f3ff]">
                        Ruínas Sob a Lua (Tema Ambiente)
                      </div>
                      <div className="text-xs text-[#9f95bc]">
                        Synth Gótico · {soundtrackPlaying ? 'Reproduzindo' : 'Pausado'}
                      </div>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={onToggleSoundtrack}
                    className="px-4 py-2 text-xs font-medium border border-[#c4b5fd]/55 bg-[#2a1c47] hover:bg-[#3b2863] text-white cursor-pointer whitespace-nowrap"
                  >
                    {soundtrackPlaying
                      ? language === 'en'
                        ? 'Stop'
                        : 'Parar'
                      : language === 'en'
                        ? 'Play Theme'
                        : 'Tocar Tema'}
                  </button>
                </div>
              )}
            </div>
          </div>

          <div className="pt-5 flex justify-end">
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
    </div>
  );
};
