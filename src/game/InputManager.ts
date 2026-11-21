import { ActionBindings, InputAction } from './types';

export const DEFAULT_KEY_BINDINGS: ActionBindings = {
  moveLeft: ['KeyA', 'ArrowLeft'],
  moveRight: ['KeyD', 'ArrowRight'],
  up: ['KeyW', 'ArrowUp'],
  down: ['KeyS', 'ArrowDown'],
  run: ['ShiftLeft', 'ShiftRight'],
  jump: ['Space'],
  attack: ['KeyJ'],
  special: ['KeyK'],
  dash: ['KeyL'],
  transformation: ['KeyI'],
  shadowProjectile: ['KeyO'],
  pause: ['Escape', 'KeyP'],
  mute: ['KeyM'],
  reset: ['KeyR'],
  toggleDebug: ['KeyT'],
};

const STORAGE_KEY = 'hiori_key_bindings_v2';

export class InputManager {
  private bindings: ActionBindings;
  private heldCodes = new Set<string>();
  private justPressedCodes = new Set<string>();
  private justReleasedCodes = new Set<string>();
  private listeningForRebind: InputAction | null = null;
  private onRebindComplete: ((action: InputAction, code: string) => void) | null = null;
  private attached = false;

  constructor(initialBindings?: Partial<ActionBindings>) {
    this.bindings = this.loadBindings(initialBindings);
  }

  private loadBindings(overrides?: Partial<ActionBindings>): ActionBindings {
    const base: ActionBindings = structuredClone(DEFAULT_KEY_BINDINGS);
    if (typeof window !== 'undefined' && window.localStorage) {
      try {
        const raw = window.localStorage.getItem(STORAGE_KEY);
        if (raw) {
          const parsed = JSON.parse(raw) as Partial<ActionBindings>;
          for (const key of Object.keys(base) as InputAction[]) {
            if (Array.isArray(parsed[key]) && parsed[key]!.length > 0) {
              base[key] = parsed[key]!;
            }
          }
        }
      } catch {
        // Ignore storage read errors
      }
    }
    if (overrides) {
      for (const key of Object.keys(overrides) as InputAction[]) {
        if (overrides[key]) {
          base[key] = overrides[key]!;
        }
      }
    }
    return base;
  }

  public attach(): void {
    if (this.attached || typeof window === 'undefined') return;
    this.attached = true;
    window.addEventListener('keydown', this.handleKeyDown);
    window.addEventListener('keyup', this.handleKeyUp);
    window.addEventListener('blur', this.clearAll);
    document.addEventListener('visibilitychange', this.handleVisibilityChange);
  }

  public detach(): void {
    if (!this.attached || typeof window === 'undefined') return;
    this.attached = false;
    window.removeEventListener('keydown', this.handleKeyDown);
    window.removeEventListener('keyup', this.handleKeyUp);
    window.removeEventListener('blur', this.clearAll);
    document.removeEventListener('visibilitychange', this.handleVisibilityChange);
  }

  private handleVisibilityChange = (): void => {
    if (document.hidden) {
      this.clearAll();
    }
  };

  public clearAll = (): void => {
    this.heldCodes.clear();
    this.justPressedCodes.clear();
    this.justReleasedCodes.clear();
  };

  private handleKeyDown = (e: KeyboardEvent): void => {
    if (this.listeningForRebind) {
      e.preventDefault();
      const action = this.listeningForRebind;
      this.listeningForRebind = null;
      if (e.code !== 'Escape') {
        this.rebindAction(action, e.code);
        this.onRebindComplete?.(action, e.code);
      } else {
        this.onRebindComplete?.(action, this.bindings[action][0]);
      }
      this.onRebindComplete = null;
      return;
    }

    // Ignore inputs while typing in form inputs
    const target = e.target as HTMLElement | null;
    if (
      target &&
      (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT')
    ) {
      return;
    }

    if (this.isBoundCode(e.code)) {
      e.preventDefault();
    }

    if (!this.heldCodes.has(e.code)) {
      this.justPressedCodes.add(e.code);
    }
    this.heldCodes.add(e.code);
  };

  private handleKeyUp = (e: KeyboardEvent): void => {
    this.heldCodes.delete(e.code);
    this.justReleasedCodes.add(e.code);
  };

  private isBoundCode(code: string): boolean {
    for (const action of Object.keys(this.bindings) as InputAction[]) {
      if (this.bindings[action].includes(code)) return true;
    }
    return false;
  }

  public isHeld(action: InputAction): boolean {
    const codes = this.bindings[action];
    for (let i = 0; i < codes.length; i++) {
      if (this.heldCodes.has(codes[i])) return true;
    }
    return false;
  }

  public justPressed(action: InputAction): boolean {
    const codes = this.bindings[action];
    for (let i = 0; i < codes.length; i++) {
      if (this.justPressedCodes.has(codes[i])) return true;
    }
    return false;
  }

  public justReleased(action: InputAction): boolean {
    const codes = this.bindings[action];
    for (let i = 0; i < codes.length; i++) {
      if (this.justReleasedCodes.has(codes[i])) return true;
    }
    return false;
  }

  /** Programmatic key injection for automated tests or virtual controls */
  public pressCode(code: string): void {
    if (!this.heldCodes.has(code)) {
      this.justPressedCodes.add(code);
    }
    this.heldCodes.add(code);
  }

  public releaseCode(code: string): void {
    this.heldCodes.delete(code);
    this.justReleasedCodes.add(code);
  }

  public endFrame(): void {
    this.justPressedCodes.clear();
    this.justReleasedCodes.clear();
  }

  public getBindings(): ActionBindings {
    return structuredClone(this.bindings);
  }

  public startRebind(
    action: InputAction,
    callback: (action: InputAction, code: string) => void
  ): void {
    this.listeningForRebind = action;
    this.onRebindComplete = callback;
  }

  public rebindAction(action: InputAction, primaryCode: string): void {
    const secondary = this.bindings[action].slice(1).filter((c) => c !== primaryCode);
    this.bindings[action] = [primaryCode, ...secondary];
    this.saveBindings();
  }

  public resetBindings(): void {
    this.bindings = structuredClone(DEFAULT_KEY_BINDINGS);
    this.saveBindings();
  }

  private saveBindings(): void {
    if (typeof window !== 'undefined' && window.localStorage) {
      try {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(this.bindings));
      } catch {
        // Ignore storage write errors
      }
    }
  }

  public static formatKeyCode(code: string): string {
    if (code.startsWith('Key')) return code.slice(3);
    if (code === 'Space') return 'Espaço';
    if (code === 'ShiftLeft' || code === 'ShiftRight') return 'Shift';
    if (code === 'ArrowLeft') return '←';
    if (code === 'ArrowRight') return '→';
    if (code === 'ArrowUp') return '↑';
    if (code === 'ArrowDown') return '↓';
    if (code === 'Escape') return 'Esc';
    return code;
  }
}
