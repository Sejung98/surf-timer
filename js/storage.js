/**
 * storage.js - 로컬 스토리지 데이터 및 설정 관리
 * 오늘의 사이클 카운트, 세션 시간 설정, 테마, 사운드 옵션을 관리합니다.
 */

const STORAGE_KEYS = {
  SETTINGS: 'flow_timer_settings',
  DAILY_STATS: 'flow_timer_daily_stats'
};

const DEFAULT_SETTINGS = {
  focusTime: 25,         // 집중 시간 (분)
  breakTime: 5,          // 짧은 휴식 (분)
  longBreakTime: 15,     // 긴 휴식 (분)
  longBreakInterval: 4,  // 긴 휴식 주기 (사이클)
  dailyGoal: 8,          // 하루 목표 사이클 수 (기본 도트 개수 가이드)
  autoStartBreaks: true, // 집중 끝나면 자동으로 휴식 시작
  autoStartFocus: false, // 휴식 끝나면 자동으로 다음 집중 시작
  soundEnabled: true,    // 사운드 알림 켜기
  soundVolume: 70,       // 볼륨 (0~100)
  theme: 'dark',         // 'dark' | 'light'
  accentColor: 'blue'    // 'blue' | 'amber' | 'emerald' | 'rose' | 'purple'
};

class StorageManager {
  constructor() {
    this.settings = this.loadSettings();
    this.checkAndInitDailyStats();
  }

  getTodayDateString() {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  loadSettings() {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.SETTINGS);
      if (data) {
        return { ...DEFAULT_SETTINGS, ...JSON.parse(data) };
      }
    } catch (e) {
      console.warn('Failed to load settings from localStorage:', e);
    }
    return { ...DEFAULT_SETTINGS };
  }

  saveSettings(newSettings) {
    this.settings = { ...this.settings, ...newSettings };
    try {
      localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(this.settings));
    } catch (e) {
      console.error('Failed to save settings:', e);
    }
    return this.settings;
  }

  getDailyStats() {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.DAILY_STATS);
      if (data) {
        return JSON.parse(data);
      }
    } catch (e) {
      console.warn('Failed to parse daily stats:', e);
    }
    return {
      date: this.getTodayDateString(),
      completedCycles: 0,
      totalFocusMinutes: 0
    };
  }

  checkAndInitDailyStats() {
    const today = this.getTodayDateString();
    const stats = this.getDailyStats();
    if (stats.date !== today) {
      // 날짜가 바뀌었으므로 새 날짜로 0회 리셋
      const newStats = {
        date: today,
        completedCycles: 0,
        totalFocusMinutes: 0
      };
      this.saveDailyStats(newStats);
      return newStats;
    }
    return stats;
  }

  saveDailyStats(stats) {
    try {
      localStorage.setItem(STORAGE_KEYS.DAILY_STATS, JSON.stringify(stats));
    } catch (e) {
      console.error('Failed to save daily stats:', e);
    }
  }

  /**
   * 사이클 1회 완료 누적
   */
  incrementCycle(sessionMinutes) {
    const stats = this.checkAndInitDailyStats();
    stats.completedCycles += 1;
    stats.totalFocusMinutes += sessionMinutes || this.settings.focusTime;
    this.saveDailyStats(stats);
    return stats;
  }

  /**
   * 오늘 사이클 수 리셋 (사용자 요청 기능)
   */
  resetTodayCycles() {
    const stats = {
      date: this.getTodayDateString(),
      completedCycles: 0,
      totalFocusMinutes: 0
    };
    this.saveDailyStats(stats);
    return stats;
  }
}

window.storageManager = new StorageManager();
