export type LanguageCode = 'pt-BR' | 'en';
export type DisplayMode = 'windowed' | 'fullscreen';
export type PlayerSkinId = 'classic' | 'shadow_violet' | 'pale_knight';
export type AreaId = 'ruins' | 'cathedral';

export interface GameSettings {
  musicVolume: number;
  sfxVolume: number;
  language: LanguageCode;
  displayMode: DisplayMode;
  selectedSkin: PlayerSkinId;
  unlockedSkins: PlayerSkinId[];
}

export const SETTINGS_STORAGE_KEY = 'hk_hiori_settings_v1';

export const DEFAULT_SETTINGS: GameSettings = {
  musicVolume: 0.7,
  sfxVolume: 0.85,
  language: 'pt-BR',
  displayMode: 'windowed',
  selectedSkin: 'classic',
  unlockedSkins: ['classic'],
};

export interface SkinMetadata {
  id: PlayerSkinId;
  namePt: string;
  nameEn: string;
  descPt: string;
  descEn: string;
  costCoins: number;
  auraColor: string;
}

export const PLAYER_SKINS: SkinMetadata[] = [
  {
    id: 'classic',
    namePt: 'Manto Clássico',
    nameEn: 'Classic Cloak',
    descPt: 'Aparência original do cavaleiro errante das ruínas.',
    descEn: 'Original wandering knight attire of the ruins.',
    costCoins: 0,
    auraColor: '#cbd5e1',
  },
  {
    id: 'shadow_violet',
    namePt: 'Eco da Catedral',
    nameEn: 'Cathedral Echo',
    descPt: 'Aura violeta sutil irradiando energia sombria.',
    descEn: 'Subtle violet aura pulsing with shadow energy.',
    costCoins: 5,
    auraColor: '#a855f7',
  },
  {
    id: 'pale_knight',
    namePt: 'Vazio Pálido',
    nameEn: 'Pale Vessel',
    descPt: 'Brilho lunar prateado ao redor do manto e da foice.',
    descEn: 'Silvery lunar shimmer surrounding cloak and scythe.',
    costCoins: 10,
    auraColor: '#f8fafc',
  },
];

export function clampVolume(v: number): number {
  if (!Number.isFinite(v)) return 0.7;
  return Math.max(0, Math.min(1, Number(v.toFixed(2))));
}

function getSafeStorage(storage?: Pick<Storage, 'getItem' | 'setItem'>): Pick<Storage, 'getItem' | 'setItem'> | null {
  if (storage) return storage;
  if (typeof window !== 'undefined' && window.localStorage) {
    return window.localStorage;
  }
  return null;
}

export function loadSettings(storage?: Pick<Storage, 'getItem' | 'setItem'>): GameSettings {
  const store = getSafeStorage(storage);
  if (!store) return { ...DEFAULT_SETTINGS, unlockedSkins: [...DEFAULT_SETTINGS.unlockedSkins] };

  try {
    const raw = store.getItem(SETTINGS_STORAGE_KEY);
    if (!raw) return { ...DEFAULT_SETTINGS, unlockedSkins: [...DEFAULT_SETTINGS.unlockedSkins] };
    const parsed = JSON.parse(raw) as Partial<GameSettings>;
    const unlocked: PlayerSkinId[] = Array.isArray(parsed.unlockedSkins)
      ? parsed.unlockedSkins.filter(
          (s): s is PlayerSkinId => s === 'classic' || s === 'shadow_violet' || s === 'pale_knight'
        )
      : ['classic'];
    if (!unlocked.includes('classic')) unlocked.unshift('classic');

    const selected: PlayerSkinId =
      parsed.selectedSkin && unlocked.includes(parsed.selectedSkin)
        ? parsed.selectedSkin
        : 'classic';

    return {
      musicVolume:
        typeof parsed.musicVolume === 'number'
          ? clampVolume(parsed.musicVolume)
          : DEFAULT_SETTINGS.musicVolume,
      sfxVolume:
        typeof parsed.sfxVolume === 'number'
          ? clampVolume(parsed.sfxVolume)
          : DEFAULT_SETTINGS.sfxVolume,
      language: parsed.language === 'en' ? 'en' : 'pt-BR',
      displayMode: parsed.displayMode === 'fullscreen' ? 'fullscreen' : 'windowed',
      selectedSkin: selected,
      unlockedSkins: unlocked,
    };
  } catch {
    return { ...DEFAULT_SETTINGS, unlockedSkins: [...DEFAULT_SETTINGS.unlockedSkins] };
  }
}

export function saveSettings(
  settings: GameSettings,
  storage?: Pick<Storage, 'getItem' | 'setItem'>
): GameSettings {
  const normalized: GameSettings = {
    musicVolume: clampVolume(settings.musicVolume),
    sfxVolume: clampVolume(settings.sfxVolume),
    language: settings.language === 'en' ? 'en' : 'pt-BR',
    displayMode: settings.displayMode === 'fullscreen' ? 'fullscreen' : 'windowed',
    selectedSkin: settings.unlockedSkins.includes(settings.selectedSkin)
      ? settings.selectedSkin
      : 'classic',
    unlockedSkins: Array.from(new Set<PlayerSkinId>(['classic', ...settings.unlockedSkins])),
  };

  const store = getSafeStorage(storage);
  if (store) {
    try {
      store.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(normalized));
    } catch {
      // Ignore storage quota errors
    }
  }
  return normalized;
}

export function getMenuStrings(lang: LanguageCode) {
  if (lang === 'en') {
    return {
      play: 'Play',
      continueGame: 'Continue',
      noSaveHint: 'No saved progress',
      extras: 'Extras / DLCs',
      settings: 'Settings',
      credits: 'Credits',
      exit: 'Exit',
      back: 'Back',
      loadingTitle: 'Loading...',
      areaLoadingTitle: 'Area Transition',
      loadingTipLabel: 'Tip:',
      loadingTipText: 'Use benches to save your progress and restore your health.',
      loadingRuins: 'Loading: City of Ruins...',
      enteringCathedral: 'Entering Shadow Cathedral...',
      enteringRuins: 'Returning to City of Ruins...',
      saveSystemTitle: 'Save System',
      savePointHeading: 'Save Point',
      saveQuestion: 'Save progress?',
      saveSuccess: 'Progress saved and health restored.',
      yes: 'Yes',
      no: 'No',
      settingsTitle: 'Settings & Audio',
      music: 'Music',
      sfx: 'Effects',
      language: 'Language',
      languageName: 'English',
      screen: 'Display',
      windowed: 'Windowed',
      fullscreen: 'Fullscreen',
      extrasTitle: 'Extras / DLCs',
      availableDlcs: 'Available DLCs',
      changeSkin: 'Change Skin / Character',
      soundtrack: 'Soundtrack',
      unlockableSkins: 'Unlockable Skins',
      multiplayerSoon: 'Multiplayer — Coming Soon',
      creditsTitle: 'Credits',
    };
  }

  return {
    play: 'Play',
    continueGame: 'Continue',
    noSaveHint: 'Nenhum progresso salvo',
    extras: 'Extras / DLCs',
    settings: 'Settings',
    credits: 'Credits',
    exit: 'Exit',
    back: 'Voltar',
    loadingTitle: 'Carregando...',
    areaLoadingTitle: 'Carregamento por Área',
    loadingTipLabel: 'Dica:',
    loadingTipText: 'Use os bancos para salvar seu progresso e recuperar sua vida.',
    loadingRuins: 'Carregando: Cidade das Ruínas...',
    enteringCathedral: 'Entrando na Catedral Sombria...',
    enteringRuins: 'Retornando à Cidade das Ruínas...',
    saveSystemTitle: 'Sistema de Salvamento',
    savePointHeading: 'Ponto de Salvamento',
    saveQuestion: 'Salvar progresso?',
    saveSuccess: 'Progresso salvo e vida restaurada.',
    yes: 'Sim',
    no: 'Não',
    settingsTitle: 'Configurações e Áudio',
    music: 'Música',
    sfx: 'Efeitos',
    language: 'Idioma',
    languageName: 'Português',
    screen: 'Tela',
    windowed: 'Janela',
    fullscreen: 'Tela Cheia',
    extrasTitle: 'Extras / DLCs',
    availableDlcs: 'DLCs Disponíveis',
    changeSkin: 'Trocar Skin/Personagem',
    soundtrack: 'Trilha Sonora',
    unlockableSkins: 'Skins Desbloqueáveis',
    multiplayerSoon: 'Multiplayer — Coming Soon',
    creditsTitle: 'Créditos',
  };
}
