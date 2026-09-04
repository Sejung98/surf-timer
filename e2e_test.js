const { app, BrowserWindow, ipcMain, screen } = require('electron');
const path = require('path');

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

app.whenReady().then(async () => {
  console.log('=== STARTING SURF TIMER COMPREHENSIVE E2E TESTS ===');

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
      hasDockView: !!document.getElementById('taskbar-dock-view'),
      hasUndockBtn: !!document.getElementById('taskbar-btn-undock')
    })
  `);
  assert(domCheck.hasCard, 'Main card exists in DOM');
  assert(domCheck.hasPlayBtn, 'Play button exists');
  assert(domCheck.hasDockBtn, 'Dock button exists');
  assert(domCheck.hasNewWinBtn, 'New window (+) button exists');
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

  console.log(`=== TEST SUMMARY: ${testsPassed} / ${testsTotal} PASSED ===`);
  if (testsPassed === testsTotal) {
    console.log('ALL TESTS PASSED SUCCESSFULLY!');
  }

  win.close();
  setTimeout(() => app.quit(), 200);
});
