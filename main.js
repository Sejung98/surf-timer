const { app, BrowserWindow, ipcMain, screen, Tray, Menu, nativeImage } = require('electron');
const path = require('path');

const windows = new Set();
let tray = null;
let windowCounter = 0;

// 윈도우 표준 크기 및 모드별 크기 정의
const SIZES = {
  normal: { width: 390, height: 245 },
  compact: { width: 170, height: 48 },
  taskbar: { width: 190, height: 44 }
};

// 1. 단일 인스턴스 락 (Single Instance Lock)
// 사용자가 바탕화면 아이콘을 다시 누를 때 새 프로세스가 중복 실행되지 않고 기존 창을 복원 및 포커스
const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (windows.size === 0) {
      createWindow();
      return;
    }
    // 기존 창이 작업표시줄에 도킹되어 있거나 최소화되어 있다면 즉시 원래 크기로 복원하고 맨 앞으로 표시
    for (const win of windows) {
      if (win.isDestroyed()) continue;
      if (win.isMinimized()) win.restore();
      if (win._isTaskbarDocked) {
        setTaskbarDock(win, false);
      }
      win.show();
      win.focus();
    }
  });

  initApp();
}

function initApp() {
  app.whenReady().then(() => {
    createWindow();
    createTray();

    app.on('activate', () => {
      if (windows.size === 0) createWindow();
    });
  });

  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
      app.quit();
    }
  });
}

function createWindow() {
  const primaryDisplay = screen.getPrimaryDisplay();
  const { width: screenWidth, height: screenHeight } = primaryDisplay.workAreaSize;

  // 새 창을 띄울 때 이전 창과 살짝 겹치지 않게 오프셋 적용
  const offset = (windowCounter % 8) * 32;
  windowCounter++;

  const defaultX = Math.max(50, screenWidth - SIZES.normal.width - 24 - offset);
  const defaultY = Math.min(screenHeight - SIZES.normal.height - 50, 48 + offset);

  const iconIco = path.join(__dirname, 'assets', 'icon.ico');

  const win = new BrowserWindow({
    width: SIZES.normal.width,
    height: SIZES.normal.height,
    x: defaultX,
    y: defaultY,
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    resizable: false,
    maximizable: false,
    fullscreenable: false,
    skipTaskbar: false,
    hasShadow: true,
    icon: iconIco,
    backgroundColor: '#00000000',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
      backgroundThrottling: false
    }
  });

  // 창별 개별 상태 저장
  win._isPinned = true;
  win._isCompact = false;
  win._isTaskbarDocked = false;
  win._savedNormalBounds = null;

  windows.add(win);

  win.loadFile('index.html');

  win.once('ready-to-show', () => {
    win.show();
    win.focus();
  });

  win.on('closed', () => {
    windows.delete(win);
  });

  return win;
}

function setTaskbarDock(win, docked) {
  if (!win || win.isDestroyed()) return;
  win._isTaskbarDocked = (typeof docked === 'boolean') ? docked : !win._isTaskbarDocked;

  const currentDisplay = screen.getDisplayMatching(win.getBounds()) || screen.getPrimaryDisplay();
  const { workArea } = currentDisplay;

  if (win._isTaskbarDocked) {
    if (!win._savedNormalBounds) {
      win._savedNormalBounds = win.getBounds();
    }

    // 도킹된 여러 창이 있을 경우 가로로 나란히 배치
    let dockIndex = 0;
    for (const w of windows) {
      if (w === win) break;
      if (w._isTaskbarDocked) dockIndex++;
    }

    const dockX = workArea.x + 12 + (dockIndex * (SIZES.taskbar.width + 10));
    const dockY = workArea.y + workArea.height - SIZES.taskbar.height - 6;

    win.setSize(SIZES.taskbar.width, SIZES.taskbar.height, false);
    win.setPosition(dockX, dockY, false);
    win.setAlwaysOnTop(true);
    win.show();
    win.focus();
    win.webContents.send('taskbar-dock-changed', true);
  } else {
    win.setSize(SIZES.normal.width, SIZES.normal.height, false);
    if (win._savedNormalBounds) {
      win.setPosition(win._savedNormalBounds.x, win._savedNormalBounds.y, false);
    } else {
      win.setPosition(workArea.x + workArea.width - SIZES.normal.width - 24, workArea.y + 48, false);
    }
    win.setAlwaysOnTop(win._isPinned !== false);
    win.show();
    win.focus();
    win.webContents.send('taskbar-dock-changed', false);
  }
}

function createTray() {
  const iconPath = path.join(__dirname, 'assets', 'icon.png');
  const trayIcon = nativeImage.createFromPath(iconPath).resize({ width: 16, height: 16 });

  tray = new Tray(trayIcon);
  tray.setToolTip('Surf Timer');

  const contextMenu = Menu.buildFromTemplate([
    {
      label: '모든 타이머 표시 (복원)',
      click: () => {
        for (const win of windows) {
          if (win.isDestroyed()) continue;
          if (win._isTaskbarDocked) setTaskbarDock(win, false);
          win.show();
          win.focus();
        }
      }
    },
    {
      label: '새 타이머 창 열기 (+)',
      click: () => {
        createWindow();
      }
    },
    { type: 'separator' },
    {
      label: '종료',
      click: () => {
        app.quit();
      }
    }
  ]);

  tray.setContextMenu(contextMenu);

  tray.on('click', () => {
    // 트레이 클릭 시 도킹되거나 숨겨진 모든 창을 원래 크기로 복원하여 표시
    for (const win of windows) {
      if (win.isDestroyed()) continue;
      if (win._isTaskbarDocked) {
        setTaskbarDock(win, false);
      }
      win.show();
      win.focus();
    }
  });
}

// IPC 통신 핸들러 등록 (요청한 창에 대해 독립적으로 처리)
ipcMain.on('window-minimize', (event) => {
  const win = BrowserWindow.fromWebContents(event.sender);
  if (win) win.minimize();
});

ipcMain.on('window-close', (event) => {
  const win = BrowserWindow.fromWebContents(event.sender);
  if (win) win.close();
});

ipcMain.on('toggle-pin', (event, forceValue) => {
  const win = BrowserWindow.fromWebContents(event.sender);
  if (win) {
    win._isPinned = typeof forceValue === 'boolean' ? forceValue : !win._isPinned;
    win.setAlwaysOnTop(win._isPinned);
    event.reply('pin-status-changed', win._isPinned);
  }
});

ipcMain.on('toggle-compact-mode', (event, forceMode) => {
  const win = BrowserWindow.fromWebContents(event.sender);
  if (!win) return;

  win._isCompact = typeof forceMode === 'boolean' ? forceMode : !win._isCompact;

  if (win._isCompact) {
    if (!win._isTaskbarDocked && !win._isCompact) win._savedNormalBounds = win.getBounds();
    win.setSize(SIZES.compact.width, SIZES.compact.height, false);
    event.reply('compact-mode-changed', true);
  } else {
    win.setSize(SIZES.normal.width, SIZES.normal.height, false);
    if (win._savedNormalBounds) {
      win.setPosition(win._savedNormalBounds.x, win._savedNormalBounds.y, false);
    }
    event.reply('compact-mode-changed', false);
  }
});

ipcMain.on('toggle-taskbar-dock', (event, forceMode) => {
  const win = BrowserWindow.fromWebContents(event.sender);
  if (win) {
    setTaskbarDock(win, forceMode);
  }
});

ipcMain.on('create-new-window', () => {
  createWindow();
});

ipcMain.on('update-timer-progress', (event, progress) => {
  const win = BrowserWindow.fromWebContents(event.sender);
  if (win) {
    win.setProgressBar(typeof progress === 'number' ? progress : -1);
  }
});

ipcMain.handle('get-window-state', (event) => {
  const win = BrowserWindow.fromWebContents(event.sender);
  if (win) {
    return {
      isPinned: win._isPinned,
      isCompact: win._isCompact,
      isTaskbarDocked: win._isTaskbarDocked
    };
  }
  return { isPinned: true, isCompact: false, isTaskbarDocked: false };
});
