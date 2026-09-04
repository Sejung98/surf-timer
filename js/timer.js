/**
 * timer.js - 포모도로 사이클 타이머 엔진
 * Focus, Short Break, Long Break 상태 머신 및 정밀 카운트다운 타이머
 */

class PomodoroTimer {
  constructor(storage, sound) {
    this.storage = storage;
    this.sound = sound;

    const initialMode = (storage && storage.settings && storage.settings.lastMode) || 'focus';
    this.mode = ['focus', 'shortBreak', 'longBreak'].includes(initialMode) ? initialMode : 'focus';
    this.state = 'idle'; // 'idle' | 'running' | 'paused'
    
    this.totalSeconds = 25 * 60;
    this.remainingSeconds = this.totalSeconds;
    this.sessionIntervalIndex = 1; // 1 to longBreakInterval

    this.intervalId = null;
    this.lastTimestamp = null;

    // 이벤트 리스너들
    this.listeners = {
      tick: [],
      stateChange: [],
      sessionComplete: [],
      cycleReset: []
    };

    this.syncFromSettings();
  }

  syncFromSettings() {
    const settings = this.storage.settings;
    if (this.mode === 'focus') {
      this.totalSeconds = settings.focusTime * 60;
    } else if (this.mode === 'shortBreak') {
      this.totalSeconds = settings.breakTime * 60;
    } else if (this.mode === 'longBreak') {
      this.totalSeconds = settings.longBreakTime * 60;
    }

    // 타이머가 작동 중이 아니면 남은 시간도 새 시간으로 즉시 동기화
    if (this.state !== 'running') {
      this.remainingSeconds = this.totalSeconds;
      this.emitTick();
    }
  }

  on(event, callback) {
    if (this.listeners[event]) {
      this.listeners[event].push(callback);
    }
  }

  emitTick() {
    const progress = this.totalSeconds > 0 ? (this.totalSeconds - this.remainingSeconds) / this.totalSeconds : 0;
    this.listeners.tick.forEach(cb => cb({
      remainingSeconds: this.remainingSeconds,
      totalSeconds: this.totalSeconds,
      progress: Math.min(1, Math.max(0, progress)),
      mode: this.mode,
      state: this.state
    }));
  }

  emitStateChange() {
    this.listeners.stateChange.forEach(cb => cb({
      mode: this.mode,
      state: this.state,
      sessionIntervalIndex: this.sessionIntervalIndex
    }));
  }

  start() {
    if (this.state === 'running') return;

    if (this.remainingSeconds <= 0) {
      this.resetCurrentSession();
    }

    this.state = 'running';
    this.lastTimestamp = Date.now();

    if (this.sound) {
      this.sound.playStart();
    }

    clearInterval(this.intervalId);
    this.intervalId = setInterval(() => {
      this.tick();
    }, 250); // 250ms로 주기 체크하여 부드럽고 정확한 시간 보정

    this.emitStateChange();
    this.emitTick();
  }

  pause() {
    if (this.state !== 'running') return;
    this.state = 'paused';
    clearInterval(this.intervalId);
    this.intervalId = null;
    this.emitStateChange();
  }

  togglePlayPause() {
    if (this.state === 'running') {
      this.pause();
    } else {
      this.start();
    }
  }

  tick() {
    const now = Date.now();
    const elapsedSeconds = (now - this.lastTimestamp) / 1000;

    if (elapsedSeconds >= 1) {
      const wholeSeconds = Math.floor(elapsedSeconds);
      this.remainingSeconds = Math.max(0, this.remainingSeconds - wholeSeconds);
      this.lastTimestamp += wholeSeconds * 1000;

      this.emitTick();

      if (this.remainingSeconds <= 0) {
        this.handleComplete();
      }
    }
  }

  handleComplete() {
    clearInterval(this.intervalId);
    this.intervalId = null;
    this.state = 'idle';

    const prevMode = this.mode;
    let nextMode = 'focus';
    let stats = null;

    if (prevMode === 'focus') {
      // 1. 사이클 완료 처리
      const focusMinutes = this.storage.settings.focusTime;
      stats = this.storage.incrementCycle(focusMinutes);

      // 소리 재생 (마림바 차임벨)
      if (this.sound) {
        this.sound.playFocusComplete();
      }

      // 긴 휴식 체크
      const interval = this.storage.settings.longBreakInterval || 4;
      if (this.sessionIntervalIndex % interval === 0) {
        nextMode = 'longBreak';
      } else {
        nextMode = 'shortBreak';
      }
      this.sessionIntervalIndex += 1;

      // 리스너 호출
      this.listeners.sessionComplete.forEach(cb => cb({
        prevMode,
        nextMode,
        stats
      }));

      // 다음 모드로 전환
      this.setMode(nextMode, this.storage.settings.autoStartBreaks);

    } else {
      // 휴식 완료 (shortBreak or longBreak)
      if (this.sound) {
        this.sound.playBreakComplete();
      }

      nextMode = 'focus';

      this.listeners.sessionComplete.forEach(cb => cb({
        prevMode,
        nextMode,
        stats: this.storage.getDailyStats()
      }));

      this.setMode('focus', this.storage.settings.autoStartFocus);
    }
  }

  setMode(mode, autoStart = false) {
    this.pause();
    this.mode = mode;
    this.state = 'idle';

    if (this.storage && this.storage.saveSettings) {
      this.storage.saveSettings({ lastMode: mode });
    }

    const settings = this.storage.settings;
    if (mode === 'focus') {
      this.totalSeconds = settings.focusTime * 60;
    } else if (mode === 'shortBreak') {
      this.totalSeconds = settings.breakTime * 60;
    } else if (mode === 'longBreak') {
      this.totalSeconds = settings.longBreakTime * 60;
    }

    this.remainingSeconds = this.totalSeconds;

    this.emitStateChange();
    this.emitTick();

    if (autoStart) {
      setTimeout(() => this.start(), 400);
    }
  }

  resetCurrentSession() {
    this.pause();
    this.setMode(this.mode, false);
    if (this.sound) {
      this.sound.playReset();
    }
  }

  skip() {
    this.pause();
    if (this.sound) {
      this.sound.playClick();
    }
    if (this.mode === 'focus') {
      // 긴 휴식 체크
      const interval = this.storage.settings.longBreakInterval || 4;
      const nextMode = (this.sessionIntervalIndex % interval === 0) ? 'longBreak' : 'shortBreak';
      this.sessionIntervalIndex += 1;
      this.setMode(nextMode, false);
    } else {
      this.setMode('focus', false);
    }
  }

  addTime(minutes) {
    const additional = minutes * 60;
    this.remainingSeconds += additional;
    this.totalSeconds += additional;
    this.emitTick();
  }

  resetDailyCount() {
    const stats = this.storage.resetTodayCycles();
    this.sessionIntervalIndex = 1;
    if (this.sound) {
      this.sound.playReset();
    }
    this.listeners.cycleReset.forEach(cb => cb(stats));
    return stats;
  }
}

window.PomodoroTimer = PomodoroTimer;
