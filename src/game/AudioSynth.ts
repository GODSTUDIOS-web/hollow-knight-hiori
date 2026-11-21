export class AudioSynth {
  private ctx: AudioContext | null = null;
  private muted = false;
  private musicVolume = 0.7;
  private sfxVolume = 0.85;
  private soundtrackNodes: {
    oscs: OscillatorNode[];
    master: GainNode;
    lfo: OscillatorNode;
  } | null = null;

  public isMuted(): boolean {
    return this.muted;
  }

  public setMuted(muted: boolean): void {
    this.muted = muted;
    this.syncSoundtrackGain();
  }

  public toggleMute(): boolean {
    this.muted = !this.muted;
    this.syncSoundtrackGain();
    return this.muted;
  }

  public getMusicVolume(): number {
    return this.musicVolume;
  }

  public getSfxVolume(): number {
    return this.sfxVolume;
  }

  public setMusicVolume(volume: number): void {
    this.musicVolume = Math.max(0, Math.min(1, volume));
    this.syncSoundtrackGain();
  }

  public setSfxVolume(volume: number): void {
    this.sfxVolume = Math.max(0, Math.min(1, volume));
  }

  public isSoundtrackPlaying(): boolean {
    return this.soundtrackNodes !== null;
  }

  private syncSoundtrackGain(): void {
    if (!this.soundtrackNodes || !this.ctx) return;
    const target = this.muted ? 0 : this.musicVolume * 0.055;
    this.soundtrackNodes.master.gain.setTargetAtTime(target, this.ctx.currentTime, 0.08);
  }

  public startSoundtrackPreview(): boolean {
    if (this.soundtrackNodes) return true;
    const ctx = this.ensureContext(true);
    if (!ctx) return false;

    const now = ctx.currentTime;
    const master = ctx.createGain();
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(520, now);

    const targetGain = this.muted ? 0 : this.musicVolume * 0.055;
    master.gain.setValueAtTime(0.0001, now);
    master.gain.exponentialRampToValueAtTime(Math.max(0.0001, targetGain), now + 0.5);

    // Somber gothic minor chord drone (D3, A3, F4)
    const freqs = [146.83, 220.0, 349.23];
    const oscs = freqs.map((f, idx) => {
      const osc = ctx.createOscillator();
      osc.type = idx === 2 ? 'sine' : 'triangle';
      osc.frequency.setValueAtTime(f, now);
      const voiceGain = ctx.createGain();
      voiceGain.gain.setValueAtTime(idx === 0 ? 0.5 : 0.25, now);
      osc.connect(voiceGain);
      voiceGain.connect(filter);
      osc.start(now);
      return osc;
    });

    const lfo = ctx.createOscillator();
    const lfoGain = ctx.createGain();
    lfo.frequency.setValueAtTime(0.22, now);
    lfoGain.gain.setValueAtTime(140, now);
    lfo.connect(lfoGain);
    lfoGain.connect(filter.frequency);
    lfo.start(now);

    filter.connect(master);
    master.connect(ctx.destination);

    this.soundtrackNodes = { oscs, master, lfo };
    return true;
  }

  public stopSoundtrackPreview(): void {
    if (!this.soundtrackNodes) return;
    const { oscs, master, lfo } = this.soundtrackNodes;
    this.soundtrackNodes = null;
    try {
      lfo.stop();
      oscs.forEach((o) => o.stop());
      master.disconnect();
    } catch {
      // Ignore already-stopped nodes
    }
  }

  public toggleSoundtrackPreview(): boolean {
    if (this.soundtrackNodes) {
      this.stopSoundtrackPreview();
      return false;
    }
    return this.startSoundtrackPreview();
  }

  private ensureContext(allowWhenMuted = false): AudioContext | null {
    if ((!allowWhenMuted && (this.muted || this.sfxVolume <= 0.001)) || typeof window === 'undefined') {
      return null;
    }
    if (!this.ctx) {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return null;
      this.ctx = new AudioCtx();
    }
    if (this.ctx.state === 'suspended') {
      void this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  private sfxGain(base: number): number {
    return Math.max(0.0005, base * this.sfxVolume);
  }

  private pitchJitter(base: number): number {
    return base * (0.92 + Math.random() * 0.16);
  }

  public playJump(isDouble = false): void {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'triangle';
    const startFreq = this.pitchJitter(isDouble ? 340 : 240);
    osc.frequency.setValueAtTime(startFreq, now);
    osc.frequency.exponentialRampToValueAtTime(startFreq * 1.75, now + 0.11);
    gain.gain.setValueAtTime(this.sfxGain(0.09), now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.13);
  }

  public playDash(): void {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(this.pitchJitter(260), now);
    osc.frequency.exponentialRampToValueAtTime(95, now + 0.14);
    gain.gain.setValueAtTime(this.sfxGain(0.08), now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.16);
  }

  public playSlash(isSpecial = false): void {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = isSpecial ? 'sawtooth' : 'sine';
    const f0 = this.pitchJitter(isSpecial ? 520 : 660);
    osc.frequency.setValueAtTime(f0, now);
    osc.frequency.exponentialRampToValueAtTime(isSpecial ? 140 : 210, now + (isSpecial ? 0.18 : 0.09));
    gain.gain.setValueAtTime(this.sfxGain(isSpecial ? 0.1 : 0.07), now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + (isSpecial ? 0.19 : 0.1));
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + (isSpecial ? 0.2 : 0.11));
  }

  public playHit(isHeavy = false): void {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'square';
    const f0 = this.pitchJitter(isHeavy ? 170 : 220);
    osc.frequency.setValueAtTime(f0, now);
    osc.frequency.exponentialRampToValueAtTime(55, now + (isHeavy ? 0.14 : 0.09));
    gain.gain.setValueAtTime(this.sfxGain(isHeavy ? 0.14 : 0.09), now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + (isHeavy ? 0.15 : 0.1));
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + (isHeavy ? 0.16 : 0.11));
  }

  public playPlayerHurt(): void {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(190, now);
    osc.frequency.linearRampToValueAtTime(85, now + 0.18);
    gain.gain.setValueAtTime(this.sfxGain(0.14), now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.19);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.2);
  }

  public playRespawn(): void {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(280, now);
    osc.frequency.exponentialRampToValueAtTime(440, now + 0.15);
    gain.gain.setValueAtTime(this.sfxGain(0.08), now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.16);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.17);
  }

  public playShadowCast(isTransform = false): void {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = isTransform ? 'sawtooth' : 'triangle';
    const f0 = this.pitchJitter(isTransform ? 150 : 320);
    osc.frequency.setValueAtTime(f0, now);
    osc.frequency.exponentialRampToValueAtTime(isTransform ? 68 : 130, now + (isTransform ? 0.3 : 0.18));
    gain.gain.setValueAtTime(this.sfxGain(isTransform ? 0.12 : 0.08), now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + (isTransform ? 0.32 : 0.19));
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + (isTransform ? 0.33 : 0.2));
  }

  public playCoinPickup(): void {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    const f0 = this.pitchJitter(780);
    osc.frequency.setValueAtTime(f0, now);
    osc.frequency.setValueAtTime(f0 * 1.35, now + 0.055);
    gain.gain.setValueAtTime(this.sfxGain(0.08), now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.16);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.17);
  }

  public playHeal(): void {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(360, now);
    osc.frequency.exponentialRampToValueAtTime(640, now + 0.18);
    gain.gain.setValueAtTime(this.sfxGain(0.08), now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.21);
  }
}
