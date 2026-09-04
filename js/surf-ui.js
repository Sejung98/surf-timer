/**
 * surf-ui.js - Surf Timer Horizontal Widget UI Controller
 */

class SurfUIController {
  constructor(timer, storage, sound) {
    this.timer = timer;
    this.storage = storage;
    this.sound = sound;

    this.isCompact = false;
    this.isPinned = true;

    this.initDOMElements();
    this.initEventListeners();
    this.initSettingsValues();
    this.applyTheme();
    this.renderDailyDots();
  }

  initDOMElements() {
    this.dom = {
      card: document.getElementById('surf-card'),
      btnPin: document.getElementById('btn-pin'),
      btnCompact: document.getElementById('btn-compact'),
      btnSettings: document.getElementById('btn-settings'),
      btnClose: document.getElementById('btn-close'),

      // 모드 선택
      sessionTitleTrigger: document.getElementById('session-title-trigger'),
      sessionLabel: document.getElementById('session-label'),
      sessionPopover: document.getElementById('session-popover'),
      popoverItems: document.querySelectorAll('.popover-item'),

      // 타이머 디스플레이
      timerDisplay: document.getElementById('timer-display'),

      // 하단 컨트롤
      btnPlayPause: document.getElementById('btn-play-pause'),
      iconPlay: document.getElementById('icon-play'),
      iconPause: document.getElementById('icon-pause'),
      btnSkip: document.getElementById('btn-skip'),
      btnAddTime: document.getElementById('btn-add-time'),
      btnResetSession: document.getElementById('btn-reset-session'),

      // 사이클 도트
      dotsContainer: document.getElementById('cycle-dots-container'),
      btnResetDaily: document.getElementById('btn-reset-daily'),

      // 컴팩트 모드
      compactView: document.getElementById('compact-view'),
      compactTime: document.getElementById('compact-time'),
      compactBtnPlay: document.getElementById('compact-btn-play'),
      compactBtnExpand: document.getElementById('compact-btn-expand'),

      // 설정 모달
      settingsModal: document.getElementById('settings-modal'),
      btnCloseSettings: document.getElementById('btn-close-settings'),
      inputFocusTime: document.getElementById('setting-focus-time'),
      valFocusTime: document.getElementById('val-focus-time'),
      inputBreakTime: document.getElementById('setting-break-time'),
      valBreakTime: document.getElementById('val-break-time'),
      inputLongBreakTime: document.getElementById('setting-long-break-time'),
      valLongBreakTime: document.getElementById('val-long-break-time'),
      inputLongInterval: document.getElementById('setting-long-interval'),
      valLongInterval: document.getElementById('val-long-interval'),
      toggleAutoBreak: document.getElementById('setting-auto-break'),
      toggleAutoFocus: document.getElementById('setting-auto-focus'),
      toggleSound: document.getElementById('setting-sound-enabled'),
      sliderSoundVolume: document.getElementById('setting-sound-volume'),
      btnTestSound: document.getElementById('btn-test-sound'),
      themeDark: document.getElementById('theme-dark'),
      themeLight: document.getElementById('theme-light'),
      btnSettingsResetCycles: document.getElementById('btn-settings-reset-cycles')
    };
  }

  initEventListeners() {
    // 1. 재생 / 일시정지
    this.dom.btnPlayPause.addEventListener('click', () => {
      this.sound.playClick();
      this.timer.togglePlayPause();
    });

    this.dom.compactBtnPlay.addEventListener('click', () => {
      this.sound.playClick();
      this.timer.togglePlayPause();
    });

    // 2. 건너뛰기 및 시간 연장
    this.dom.btnSkip.addEventListener('click', () => {
      this.timer.skip();
    });

    this.dom.btnAddTime.addEventListener('click', () => {
      this.sound.playClick();
      this.timer.addTime(5);
    });

    this.dom.btnResetSession.addEventListener('click', () => {
      this.timer.resetCurrentSession();
    });

    // 3. 일일 사이클 리셋 버튼 (우측 상단 ↺ 및 설정 창 내부)
    this.dom.btnResetDaily.addEventListener('click', () => {
      this.handleDailyReset();
    });

    this.dom.dotsContainer.addEventListener('click', () => {
      this.handleDailyReset();
    });

    if (this.dom.btnSettingsResetCycles) {
      this.dom.btnSettingsResetCycles.addEventListener('click', () => {
        this.handleDailyReset();
      });
    }

    // 4. 모드 드롭다운 토글
    this.dom.sessionTitleTrigger.addEventListener('click', (e) => {
      e.stopPropagation();
      this.dom.sessionPopover.classList.toggle('hidden');
    });

    document.addEventListener('click', (e) => {
      if (!this.dom.sessionPopover.contains(e.target) && e.target !== this.dom.sessionTitleTrigger) {
        this.dom.sessionPopover.classList.add('hidden');
      }
    });

    this.dom.popoverItems.forEach(item => {
      item.addEventListener('click', () => {
        const mode = item.dataset.mode;
        this.timer.setMode(mode, false);
        this.dom.sessionPopover.classList.add('hidden');
      });
    });

    // 5. 윈도우 컨트롤러
    this.dom.btnPin.addEventListener('click', () => {
      this.sound.playClick();
      if (window.electronAPI) {
        window.electronAPI.togglePin();
      } else {
        this.isPinned = !this.isPinned;
        this.updatePinUI(this.isPinned);
      }
    });

    this.dom.btnCompact.addEventListener('click', () => {
      this.sound.playClick();
      this.toggleCompactMode(true);
    });

    this.dom.compactBtnExpand.addEventListener('click', () => {
      this.sound.playClick();
      this.toggleCompactMode(false);
    });

    this.dom.btnClose.addEventListener('click', () => {
      this.sound.playClick();
      if (window.electronAPI) {
        window.electronAPI.closeWindow();
      }
    });

    // 6. 설정 창 열기/닫기
    this.dom.btnSettings.addEventListener('click', () => {
      this.sound.playClick();
      this.dom.settingsModal.classList.remove('hidden');
    });

    this.dom.btnCloseSettings.addEventListener('click', () => {
      this.sound.playClick();
      this.dom.settingsModal.classList.add('hidden');
    });

    this.setupSettingsInputListeners();

    // 7. Electron 통신 리스너
    if (window.electronAPI) {
      window.electronAPI.onPinChanged((pinned) => this.updatePinUI(pinned));
      window.electronAPI.onCompactChanged((compact) => this.updateCompactUI(compact));
      window.electronAPI.getWindowState().then((state) => {
        if (state) {
          this.updatePinUI(state.isPinned);
          this.updateCompactUI(state.isCompact);
        }
      });
    }

    // 8. 타이머 엔진 이벤트 연결
    this.timer.on('tick', (data) => this.handleTimerTick(data));
    this.timer.on('stateChange', (data) => this.handleTimerStateChange(data));
    this.timer.on('sessionComplete', () => this.renderDailyDots());
    this.timer.on('cycleReset', () => this.renderDailyDots());
  }

  handleDailyReset() {
    this.sound.playClick();
    const stats = this.storage.getDailyStats();
    if (confirm(`Reset today's completed Surf cycles (${stats.completedCycles})?`)) {
      this.timer.resetDailyCount();
    }
  }

  handleTimerTick({ remainingSeconds }) {
    const timeStr = this.formatTime(remainingSeconds);
    this.dom.timerDisplay.textContent = timeStr;
    this.dom.compactTime.textContent = timeStr;
  }

  handleTimerStateChange({ mode, state }) {
    const isRunning = (state === 'running');
    if (isRunning) {
      this.dom.iconPlay.classList.add('hidden');
      this.dom.iconPause.classList.remove('hidden');
      this.dom.compactBtnPlay.innerHTML = `
        <svg viewBox="0 0 24 24" style="width:12px;height:12px;fill:currentColor;">
          <rect x="6" y="5" width="4" height="14" rx="1"/>
          <rect x="14" y="5" width="4" height="14" rx="1"/>
        </svg>
      `;
    } else {
      this.dom.iconPlay.classList.remove('hidden');
      this.dom.iconPause.classList.add('hidden');
      this.dom.compactBtnPlay.innerHTML = `
        <svg viewBox="0 0 24 24" style="width:12px;height:12px;fill:currentColor;">
          <polygon points="8,5 18,12 8,19"/>
        </svg>
      `;
    }

    // 레이블 변경
    let label = 'Surf';
    if (mode === 'shortBreak') label = 'Break';
    if (mode === 'longBreak') label = 'Long Break';

    this.dom.sessionLabel.textContent = label;
    this.dom.card.setAttribute('data-mode', mode);

    this.dom.popoverItems.forEach(item => {
      if (item.dataset.mode === mode) {
        item.classList.add('active');
      } else {
        item.classList.remove('active');
      }
    });

    this.renderDailyDots();
  }

  /**
   * Surf 스타일의 세션 도트 렌더링
   */
  renderDailyDots() {
    const stats = this.storage.getDailyStats();
    const completed = stats.completedCycles || 0;
    const interval = this.storage.settings.longBreakInterval || 4;
    const totalDots = Math.max(interval, completed + (this.timer.mode === 'focus' ? 1 : 0));

    this.dom.dotsContainer.innerHTML = '';
    this.dom.dotsContainer.title = `Today's Surf: ${completed} completed (Click to reset)`;

    for (let i = 0; i < totalDots; i++) {
      const dot = document.createElement('div');
      dot.className = 'surf-dot';

      if (i < completed) {
        dot.classList.add('completed');
      } else if (i === completed && this.timer.mode === 'focus' && this.timer.state === 'running') {
        dot.classList.add('in-progress');
      }

      this.dom.dotsContainer.appendChild(dot);
    }
  }

  formatTime(seconds) {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  }

  toggleCompactMode(forceMode) {
    const target = (typeof forceMode === 'boolean') ? forceMode : !this.isCompact;
    if (window.electronAPI) {
      window.electronAPI.toggleCompactMode(target);
    } else {
      this.updateCompactUI(target);
    }
  }

  updateCompactUI(isCompact) {
    this.isCompact = isCompact;
    if (isCompact) {
      this.dom.card.classList.add('compact-mode');
    } else {
      this.dom.card.classList.remove('compact-mode');
    }
  }

  updatePinUI(isPinned) {
    this.isPinned = isPinned;
    if (isPinned) {
      this.dom.btnPin.classList.add('pinned');
      this.dom.btnPin.title = 'Always on Top (Pinned)';
    } else {
      this.dom.btnPin.classList.remove('pinned');
      this.dom.btnPin.title = 'Always on Top';
    }
  }

  initSettingsValues() {
    const s = this.storage.settings;
    this.dom.inputFocusTime.value = s.focusTime;
    this.dom.valFocusTime.textContent = `${s.focusTime}m`;

    this.dom.inputBreakTime.value = s.breakTime;
    this.dom.valBreakTime.textContent = `${s.breakTime}m`;

    this.dom.inputLongBreakTime.value = s.longBreakTime;
    this.dom.valLongBreakTime.textContent = `${s.longBreakTime}m`;

    this.dom.inputLongInterval.value = s.longBreakInterval;
    this.dom.valLongInterval.textContent = `${s.longBreakInterval} cycles`;

    this.dom.toggleAutoBreak.checked = s.autoStartBreaks;
    this.dom.toggleAutoFocus.checked = s.autoStartFocus;

    this.dom.toggleSound.checked = s.soundEnabled;
    this.dom.sliderSoundVolume.value = s.soundVolume;
    this.sound.setEnabled(s.soundEnabled);
    this.sound.setVolume(s.soundVolume / 100);

    if (s.theme === 'dark') {
      this.dom.themeDark.checked = true;
    } else {
      this.dom.themeLight.checked = true;
    }
  }

  setupSettingsInputListeners() {
    // Focus Steppers (-5m, +5m)
    const btnDecFocus = document.getElementById('btn-dec-focus');
    const btnIncFocus = document.getElementById('btn-inc-focus');
    if (btnDecFocus) {
      btnDecFocus.addEventListener('click', () => {
        this.sound.playClick();
        const current = parseInt(this.dom.inputFocusTime.value, 10);
        const next = Math.max(5, current - 5);
        this.updateFocusTime(next);
      });
    }
    if (btnIncFocus) {
      btnIncFocus.addEventListener('click', () => {
        this.sound.playClick();
        const current = parseInt(this.dom.inputFocusTime.value, 10);
        const next = Math.min(90, current + 5);
        this.updateFocusTime(next);
      });
    }

    // Break Steppers (-1m, +1m)
    const btnDecBreak = document.getElementById('btn-dec-break');
    const btnIncBreak = document.getElementById('btn-inc-break');
    if (btnDecBreak) {
      btnDecBreak.addEventListener('click', () => {
        this.sound.playClick();
        const current = parseInt(this.dom.inputBreakTime.value, 10);
        const next = Math.max(1, current - 1);
        this.updateBreakTime(next);
      });
    }
    if (btnIncBreak) {
      btnIncBreak.addEventListener('click', () => {
        this.sound.playClick();
        const current = parseInt(this.dom.inputBreakTime.value, 10);
        const next = Math.min(30, current + 1);
        this.updateBreakTime(next);
      });
    }

    // 슬라이더 이벤트 (input & change 둘 다 바인딩하여 실시간 즉시 반영)
    ['input', 'change'].forEach(evt => {
      this.dom.inputFocusTime.addEventListener(evt, (e) => {
        const val = parseInt(e.target.value, 10);
        this.updateFocusTime(val);
      });

      this.dom.inputBreakTime.addEventListener(evt, (e) => {
        const val = parseInt(e.target.value, 10);
        this.updateBreakTime(val);
      });

      this.dom.inputLongBreakTime.addEventListener(evt, (e) => {
        const val = parseInt(e.target.value, 10);
        this.dom.valLongBreakTime.textContent = `${val}m`;
        this.storage.saveSettings({ longBreakTime: val });
        this.timer.syncFromSettings();
      });

      this.dom.inputLongInterval.addEventListener(evt, (e) => {
        const val = parseInt(e.target.value, 10);
        this.dom.valLongInterval.textContent = `${val} cycles`;
        this.storage.saveSettings({ longBreakInterval: val });
        this.renderDailyDots();
      });
    });

    document.querySelectorAll('.preset-btn-focus').forEach(btn => {
      btn.addEventListener('click', () => {
        this.sound.playClick();
        const mins = parseInt(btn.dataset.mins, 10);
        this.updateFocusTime(mins);
      });
    });

    document.querySelectorAll('.preset-btn-break').forEach(btn => {
      btn.addEventListener('click', () => {
        this.sound.playClick();
        const mins = parseInt(btn.dataset.mins, 10);
        this.updateBreakTime(mins);
      });
    });

    this.dom.toggleAutoBreak.addEventListener('change', (e) => {
      this.storage.saveSettings({ autoStartBreaks: e.target.checked });
    });

    this.dom.toggleAutoFocus.addEventListener('change', (e) => {
      this.storage.saveSettings({ autoStartFocus: e.target.checked });
    });

    this.dom.toggleSound.addEventListener('change', (e) => {
      const enabled = e.target.checked;
      this.storage.saveSettings({ soundEnabled: enabled });
      this.sound.setEnabled(enabled);
    });

    this.dom.sliderSoundVolume.addEventListener('input', (e) => {
      const vol = parseInt(e.target.value, 10);
      this.storage.saveSettings({ soundVolume: vol });
      this.sound.setVolume(vol / 100);
    });

    this.dom.btnTestSound.addEventListener('click', () => {
      this.sound.playFocusComplete();
    });

    document.querySelectorAll('input[name="theme-mode"]').forEach(radio => {
      radio.addEventListener('change', (e) => {
        const theme = e.target.value;
        this.storage.saveSettings({ theme });
        this.applyTheme();
      });
    });
  }

  updateFocusTime(mins) {
    mins = Math.max(1, Math.min(180, mins));
    this.dom.inputFocusTime.value = mins;
    this.dom.valFocusTime.textContent = `${mins}m`;
    this.storage.saveSettings({ focusTime: mins });
    this.timer.syncFromSettings();
  }

  updateBreakTime(mins) {
    mins = Math.max(1, Math.min(60, mins));
    this.dom.inputBreakTime.value = mins;
    this.dom.valBreakTime.textContent = `${mins}m`;
    this.storage.saveSettings({ breakTime: mins });
    this.timer.syncFromSettings();
  }

  applyTheme() {
    const { theme } = this.storage.settings;
    document.documentElement.setAttribute('data-theme', theme || 'light');
  }

  closeSettings() {
    this.dom.settingsModal.classList.add('hidden');
  }
}

window.SurfUIController = SurfUIController;
