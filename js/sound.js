/**
 * sound.js - Web Audio API 기반의 오가닉 젠(Zen) 차임벨 및 알림 사운드 엔진
 * 외부 오디오 파일 다운로드 없이 맑고 풍부한 화음 합성 사운드를 생성합니다.
 */

class SoundEngine {
  constructor() {
    this.ctx = null;
    this.enabled = true;
    this.volume = 0.6;
  }

  init() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      this.ctx = new AudioCtx();
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  setVolume(vol) {
    this.volume = Math.max(0, Math.min(1, vol));
  }

  setEnabled(enabled) {
    this.enabled = enabled;
  }

  /**
   * 벨/차임 단일 톤 합성 (기본음 + 하모닉스 오버톤으로 풍부한 울림 형성)
   */
  playTone(freq, duration = 1.2, startOffset = 0, toneGain = 1.0) {
    if (!this.enabled || this.volume <= 0) return;
    this.init();

    const startTime = this.ctx.currentTime + startOffset;
    
    // 마스터 게인
    const masterGain = this.ctx.createGain();
    masterGain.gain.setValueAtTime(0, startTime);
    masterGain.gain.linearRampToValueAtTime(this.volume * toneGain * 0.35, startTime + 0.02);
    masterGain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);
    masterGain.connect(this.ctx.destination);

    // 1. 기본 사인파 (Fundamental)
    const osc1 = this.ctx.createOscillator();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(freq, startTime);
    osc1.connect(masterGain);
    osc1.start(startTime);
    osc1.stop(startTime + duration);

    // 2. 2차 하모닉스 (따뜻한 울림)
    const osc2 = this.ctx.createOscillator();
    osc2.type = 'triangle';
    osc2.frequency.setValueAtTime(freq * 2, startTime);
    const gain2 = this.ctx.createGain();
    gain2.gain.setValueAtTime(0.15, startTime);
    osc2.connect(gain2);
    gain2.connect(masterGain);
    osc2.start(startTime);
    osc2.stop(startTime + duration * 0.7);

    // 3. 3차 하모닉스 (맑은 틴 링잉 사운드)
    const osc3 = this.ctx.createOscillator();
    osc3.type = 'sine';
    osc3.frequency.setValueAtTime(freq * 3.01, startTime);
    const gain3 = this.ctx.createGain();
    gain3.gain.setValueAtTime(0.08, startTime);
    osc3.connect(gain3);
    gain3.connect(masterGain);
    osc3.start(startTime);
    osc3.stop(startTime + duration * 0.5);
  }

  /**
   * 집중 완료 차임벨 (Flow 스타일의 아름다운 마림바/싱잉볼 3음 코드)
   */
  playFocusComplete() {
    if (!this.enabled) return;
    // C5 (523.25Hz) -> E5 (659.25Hz) -> G5 (783.99Hz) -> C6 (1046.5Hz)
    this.playTone(523.25, 1.8, 0, 0.9);
    this.playTone(659.25, 1.8, 0.15, 0.95);
    this.playTone(783.99, 2.0, 0.3, 1.0);
    this.playTone(1046.50, 2.5, 0.48, 1.1);
  }

  /**
   * 휴식 완료 차임벨 (다시 집중으로 들어가는 부드러운 2음 코드)
   */
  playBreakComplete() {
    if (!this.enabled) return;
    // G4 (392.00Hz) -> C5 (523.25Hz) -> E5 (659.25Hz)
    this.playTone(392.00, 1.6, 0, 0.85);
    this.playTone(523.25, 1.8, 0.18, 0.95);
    this.playTone(659.25, 2.2, 0.36, 1.0);
  }

  /**
   * 타이머 시작 / 재개 틱
   */
  playStart() {
    if (!this.enabled) return;
    this.playTone(659.25, 0.6, 0, 0.4);
    this.playTone(880.00, 0.8, 0.08, 0.5);
  }

  /**
   * 버튼 클릭 마이크로 피드백
   */
  playClick() {
    if (!this.enabled || this.volume <= 0) return;
    this.init();
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(800, t);
    osc.frequency.exponentialRampToValueAtTime(400, t + 0.04);

    gain.gain.setValueAtTime(this.volume * 0.12, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.04);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(t);
    osc.stop(t + 0.04);
  }

  /**
   * 리셋 효과음
   */
  playReset() {
    if (!this.enabled) return;
    this.playTone(523.25, 0.5, 0, 0.4);
    this.playTone(392.00, 0.6, 0.1, 0.35);
  }
}

// 전역 싱글톤 노출
window.soundEngine = new SoundEngine();
