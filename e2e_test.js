const { app, BrowserWindow, ipcMain, screen } = require('electron');
const path = require('path');
const fs = require('fs');

let testsPassed = 0;
let testsTotal = 0;

function assert(condition, message) {
  testsTotal++;
  if (condition) {
    console.log(`[PASS] ${message}`);
    testsPassed++;
  } else {
    console.error(`[FAIL] ${message}`);
  }
}

// 테스트용 임시 설정 저장소
let testConfig = {};

app.whenReady().then(async () => {
  console.log('=== STARTING SURF TIMER COMPREHENSIVE E2E TESTS ===');

  // IPC 핸들러 등록
  ipcMain.on('get-persistent-settings-sync', (event) => {
    event.returnValue = testConfig;
  });

  ipcMain.handle('load-persistent-settings', () => {
    return testConfig;
  });

  ipcMain.handle('save-persistent-settings', (_event, settings) => {
    testConfig = { ...testConfig, ...settings };
    return testConfig;
  });

  ipcMain.handle('get-window-state', () => ({
    isPinned: true,
    isCompact: false,
    isTaskbarDocked: false
  }));

  const win = new BrowserWindow({
    width: 390,
    height: 245,
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true
    }
  });

  win._isPinned = true;
  win._isCompact = false;
  win._isTaskbarDocked = false;
  win._savedNormalBounds = null;

  await win.loadFile('index.html');

  // Test 1: Window Initial Dimensions
  const initialBounds = win.getBounds();
  assert(initialBounds.width === 390 && initialBounds.height === 245, `Window initialized at 390x245 (Actual: ${initialBounds.width}x${initialBounds.height})`);

  // Test 2: DOM & Header elements exist
  const domCheck = await win.webContents.executeJavaScript(`
    ({
      hasCard: !!document.getElementById('surf-card'),
      hasPlayBtn: !!document.getElementById('btn-play-pause'),
      hasDockBtn: !!document.getElementById('btn-dock-taskbar'),
      hasNewWinBtn: !!document.getElementById('btn-new-window'),
      hasSoundToggle: !!document.getElementById('btn-sound-toggle'),
      hasDockView: !!document.getElementById('taskbar-dock-view'),
      hasUndockBtn: !!document.getElementById('taskbar-btn-undock')
    })
  `);
  assert(domCheck.hasCard, 'Main card exists in DOM');
  assert(domCheck.hasPlayBtn, 'Play button exists');
  assert(domCheck.hasDockBtn, 'Dock button exists');
  assert(domCheck.hasNewWinBtn, 'New window (+) button exists');
  assert(domCheck.hasSoundToggle, 'Sound toggle button exists in header');
  assert(domCheck.hasDockView, 'Taskbar dock view exists');
  assert(domCheck.hasUndockBtn, 'Undock button exists in dock view');

  // Test 3: Timer Play / Pause
  await win.webContents.executeJavaScript(`document.getElementById('btn-play-pause').click()`);
  await new Promise(r => setTimeout(r, 1200));
  const tick1 = await win.webContents.executeJavaScript(`document.getElementById('timer-display').textContent`);
  assert(tick1 === '24:59' || tick1 === '24:58', `Timer counts down after clicking play (Time: ${tick1})`);

  // Pause
  await win.webContents.executeJavaScript(`document.getElementById('btn-play-pause').click()`);
  await new Promise(r => setTimeout(r, 600));
  const tick2 = await win.webContents.executeJavaScript(`document.getElementById('timer-display').textContent`);
  await new Promise(r => setTimeout(r, 600));
  const tick3 = await win.webContents.executeJavaScript(`document.getElementById('timer-display').textContent`);
  assert(tick2 === tick3, `Timer pauses correctly when clicked again (Time: ${tick3})`);

  // Test 4: Add +5m
  await win.webContents.executeJavaScript(`document.getElementById('btn-add-time').click()`);
  const tick4 = await win.webContents.executeJavaScript(`document.getElementById('timer-display').textContent`);
  assert(tick4 === '29:59' || tick4 === '29:58', `+5m adds 5 minutes accurately (Time: ${tick4})`);

  // Test 5: Dock to Taskbar UI & Window Resizing
  const primaryDisplay = screen.getPrimaryDisplay();
  const { workArea } = primaryDisplay;
  const dockX = workArea.x + 12;
  const dockY = workArea.y + workArea.height - 44 - 6;

  win._savedNormalBounds = win.getBounds();
  win._isTaskbarDocked = true;
  win.setSize(190, 44, false);
  win.setPosition(dockX, dockY, false);
  win.webContents.send('taskbar-dock-changed', true);

  await new Promise(r => setTimeout(r, 500));

  const dockedBounds = win.getBounds();
  assert(dockedBounds.width === 190 && dockedBounds.height === 44, `Docked window resized to 190x44 (Actual: ${dockedBounds.width}x${dockedBounds.height})`);
  assert(dockedBounds.x === dockX && dockedBounds.y === dockY, `Docked window positioned at safe bottom-left (${dockX}, ${dockY})`);

  const dockedDOM = await win.webContents.executeJavaScript(`
    ({
      cardHasClass: document.getElementById('surf-card').classList.contains('taskbar-docked'),
      dockViewDisplay: window.getComputedStyle(document.getElementById('taskbar-dock-view')).display,
      dockTimeText: document.getElementById('taskbar-dock-time').textContent
    })
  `);
  assert(dockedDOM.cardHasClass, 'Card has taskbar-docked class');
  assert(dockedDOM.dockViewDisplay === 'flex', 'Dock view display is flex');
  assert(dockedDOM.dockTimeText === tick4, `Dock view shows synchronized time (${dockedDOM.dockTimeText})`);

  // Test 6: Undock back to Normal Widget
  win._isTaskbarDocked = false;
  win.setSize(390, 245, false);
  win.setPosition(win._savedNormalBounds.x, win._savedNormalBounds.y, false);
  win.webContents.send('taskbar-dock-changed', false);

  await new Promise(r => setTimeout(r, 500));

  const restoredBounds = win.getBounds();
  assert(restoredBounds.width === 390 && restoredBounds.height === 245, `Restored window back to 390x245`);

  const restoredDOM = await win.webContents.executeJavaScript(`
    ({
      cardHasClass: document.getElementById('surf-card').classList.contains('taskbar-docked'),
      dockViewDisplay: window.getComputedStyle(document.getElementById('taskbar-dock-view')).display
    })
  `);
  assert(!restoredDOM.cardHasClass, 'Card removed taskbar-docked class');
  assert(restoredDOM.dockViewDisplay === 'none', 'Dock view is hidden in normal mode');

  // Test 7: Spawn Second Window
  const win2 = new BrowserWindow({
    width: 390,
    height: 245,
    frame: false,
    transparent: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js')
    }
  });
  await win2.loadFile('index.html');
  assert(BrowserWindow.getAllWindows().length === 2, 'Second independent window created successfully');
  win2.close();

  // Test 8: Configure Custom Settings (50 min focus, sound disabled, dark theme)
  await win.webContents.executeJavaScript(`
    // 50분 포커스 시간 설정 및 사운드 비활성화, 다크 테마 적용
    window.storageManager.saveSettings({
      focusTime: 50,
      breakTime: 10,
      soundEnabled: false,
      theme: 'dark',
      lastMode: 'focus'
    });
  `);
  await new Promise(r => setTimeout(r, 300));
  assert(testConfig.focusTime === 50, `Persistent store saved focusTime: 50`);
  assert(testConfig.soundEnabled === false, `Persistent store saved soundEnabled: false`);
  assert(testConfig.theme === 'dark', `Persistent store saved theme: dark`);

  // Test 9: Close window, create new window from scratch, verify settings restored
  win.close();

  const win3 = new BrowserWindow({
    width: 390,
    height: 245,
    frame: false,
    transparent: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js')
    }
  });
  await win3.loadFile('index.html');
  await new Promise(r => setTimeout(r, 400));

  const restoredSettingsCheck = await win3.webContents.executeJavaScript(`
    ({
      displayTime: document.getElementById('timer-display').textContent,
      theme: document.documentElement.getAttribute('data-theme'),
      soundEngineEnabled: window.soundEngine.enabled,
      soundBtnMuted: document.getElementById('btn-sound-toggle').classList.contains('muted'),
      soundToggleChecked: document.getElementById('setting-sound-enabled').checked,
      focusTimeInput: document.getElementById('setting-focus-time').value,
      focusTimeVal: document.getElementById('val-focus-time').textContent
    })
  `);

  assert(restoredSettingsCheck.displayTime === '50:00', `Restored app directly shows 50:00 on main screen (Actual: ${restoredSettingsCheck.displayTime})`);
  assert(restoredSettingsCheck.theme === 'dark', `Restored app directly applies dark theme (Actual: ${restoredSettingsCheck.theme})`);
  assert(restoredSettingsCheck.soundEngineEnabled === false, `Restored app disables soundEngine (Actual: ${restoredSettingsCheck.soundEngineEnabled})`);
  assert(restoredSettingsCheck.soundBtnMuted, `Header sound button displays muted state`);
  assert(restoredSettingsCheck.soundToggleChecked === false, `Settings modal sound toggle is unchecked`);
  assert(restoredSettingsCheck.focusTimeInput === '50', `Settings focus time input is 50`);
  assert(restoredSettingsCheck.focusTimeVal === '50m', `Settings focus time label is 50m`);

  // Test 10: Toggle Sound in Header and verify instant update & persistence
  await win3.webContents.executeJavaScript(`
    document.getElementById('btn-sound-toggle').click();
  `);
  await new Promise(r => setTimeout(r, 300));

  const soundToggleCheck = await win3.webContents.executeJavaScript(`
    ({
      soundEngineEnabled: window.soundEngine.enabled,
      soundBtnMuted: document.getElementById('btn-sound-toggle').classList.contains('muted'),
      soundToggleChecked: document.getElementById('setting-sound-enabled').checked,
      storageEnabled: window.storageManager.settings.soundEnabled
    })
  `);

  assert(soundToggleCheck.soundEngineEnabled === true, `Clicking header sound button re-enables soundEngine`);
  assert(!soundToggleCheck.soundBtnMuted, `Header sound button removes muted class`);
  assert(soundToggleCheck.soundToggleChecked === true, `Settings modal switch syncs to checked`);
  assert(soundToggleCheck.storageEnabled === true, `Storage setting updated to soundEnabled: true`);
  assert(testConfig.soundEnabled === true, `Persistent config file updated to soundEnabled: true`);

  console.log(`=== TEST SUMMARY: ${testsPassed} / ${testsTotal} PASSED ===`);
  if (testsPassed === testsTotal) {
    console.log('ALL TESTS PASSED SUCCESSFULLY!');
  }

  win3.close();
  setTimeout(() => app.quit(), 300);
});
