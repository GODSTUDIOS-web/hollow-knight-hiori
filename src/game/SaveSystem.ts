import { AreaId, PlayerSkinId } from './SettingsStore';

export interface SaveSlotData {
  version: 1;
  savedAt: string;
  areaId: AreaId;
  areaName: string;
  coins: number;
  playerHp: number;
  playerMaxHp: number;
  energy: number;
  maxEnergy: number;
  dummyKills: number;
  totalDamage: number;
  selectedSkin: PlayerSkinId;
}

export const SAVE_STORAGE_KEY = 'hk_hiori_save_slot_v1';

function getSafeStorage(
  storage?: Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>
): Pick<Storage, 'getItem' | 'setItem' | 'removeItem'> | null {
  if (storage) return storage;
  if (typeof window !== 'undefined' && window.localStorage) {
    return window.localStorage;
  }
  return null;
}

export function readSaveData(
  storage?: Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>
): SaveSlotData | null {
  const store = getSafeStorage(storage);
  if (!store) return null;

  try {
    const raw = store.getItem(SAVE_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<SaveSlotData>;
    if (typeof parsed.coins !== 'number' || typeof parsed.playerHp !== 'number') {
      return null;
    }

    const maxHp = Math.max(1, Math.round(parsed.playerMaxHp ?? 5));
    const maxEnergy = Math.max(10, Math.round(parsed.maxEnergy ?? 100));
    return {
      version: 1,
      savedAt: typeof parsed.savedAt === 'string' ? parsed.savedAt : new Date().toISOString(),
      areaId: parsed.areaId === 'cathedral' ? 'cathedral' : 'ruins',
      areaName:
        typeof parsed.areaName === 'string' && parsed.areaName.length > 0
          ? parsed.areaName
          : 'Cidade das Ruínas',
      coins: Math.max(0, Math.round(parsed.coins)),
      playerHp: Math.max(1, Math.min(maxHp, Math.round(parsed.playerHp))),
      playerMaxHp: maxHp,
      energy: Math.max(0, Math.min(maxEnergy, Math.round(parsed.energy ?? 45))),
      maxEnergy,
      dummyKills: Math.max(0, Math.round(parsed.dummyKills ?? 0)),
      totalDamage: Math.max(0, Math.round(parsed.totalDamage ?? 0)),
      selectedSkin:
        parsed.selectedSkin === 'shadow_violet' || parsed.selectedSkin === 'pale_knight'
          ? parsed.selectedSkin
          : 'classic',
    };
  } catch {
    return null;
  }
}

export function writeSaveData(
  data: SaveSlotData,
  storage?: Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>
): SaveSlotData {
  const store = getSafeStorage(storage);
  const normalized: SaveSlotData = {
    ...data,
    version: 1,
    coins: Math.max(0, Math.round(data.coins)),
    playerMaxHp: Math.max(1, Math.round(data.playerMaxHp)),
    playerHp: Math.max(1, Math.min(Math.max(1, Math.round(data.playerMaxHp)), Math.round(data.playerHp))),
    maxEnergy: Math.max(10, Math.round(data.maxEnergy)),
    energy: Math.max(0, Math.min(Math.max(10, Math.round(data.maxEnergy)), Math.round(data.energy))),
  };

  if (store) {
    try {
      store.setItem(SAVE_STORAGE_KEY, JSON.stringify(normalized));
    } catch {
      // Ignore storage quota errors
    }
  }
  return normalized;
}

export function hasSaveData(
  storage?: Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>
): boolean {
  return readSaveData(storage) !== null;
}

export function clearSaveData(
  storage?: Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>
): void {
  const store = getSafeStorage(storage);
  if (!store) return;
  try {
    store.removeItem(SAVE_STORAGE_KEY);
  } catch {
    // Ignore storage errors
  }
}
