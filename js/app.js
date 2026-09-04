/**
 * app.js - Surf Timer Application Entry Point
 */

document.addEventListener('DOMContentLoaded', () => {
  const sound = window.soundEngine;
  const storage = window.storageManager;
  const timer = new PomodoroTimer(storage, sound);
  const ui = new SurfUIController(timer, storage, sound);

  // Request notification permissions
  if ('Notification' in window && Notification.permission === 'default') {
    Notification.requestPermission();
  }

  // Session completion notifications (clean text without emojis)
  timer.on('sessionComplete', ({ prevMode }) => {
    if ('Notification' in window && Notification.permission === 'granted') {
      const title = prevMode === 'focus' ? 'Focus Session Completed' : 'Break Time Ended';
      const body = prevMode === 'focus' 
        ? 'Great job. Take a moment to rest.' 
        : 'Break is over. Ready to surf into focus?';
      try {
        new Notification(title, { body, silent: true });
      } catch (e) {
        console.log('Notification error:', e);
      }
    }
  });

  // Global keyboard shortcuts
  document.addEventListener('keydown', (e) => {
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
      return;
    }

    if (e.code === 'Space') {
      e.preventDefault();
      timer.togglePlayPause();
    } else if (e.key === 'Escape') {
      ui.closeSettings();
    }
  });

  console.log('Surf Timer initialized.');
});
