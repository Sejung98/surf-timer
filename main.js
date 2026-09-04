const { app, BrowserWindow, ipcMain, screen, Tray, Menu, nativeImage } = require('electron');
const path = require('path');

let mainWindow = null;
let tray = null;
let isCompact = false;
let isPinned = true;
let isTaskbarDocked = false;
let savedNormalBounds = null;

// 윈도우 표준 크기 및 컴팩트 크기 정의
const SIZES = {
  normal: { width: 390, height: 245 },
  compact: { width: 170, height: 48 },
  taskbar: { width: 180, height: 38 }
};

function createWindow() {
  const primaryDisplay = screen.getPrimaryDisplay();
  const { width: screenWidth, height: screenHeight } = primaryDisplay.workAreaSize;

  const defaultX = screenWidth - SIZES.normal.width - 24;
  const defaultY = 48;

  const iconIco = path.join(__dirname, 'assets', 'icon.ico');

  mainWindow = new BrowserWindow({
    width: SIZES.normal.width,
    height: SIZES.normal.height,
    x: defaultX,
    y: defaultY,
    frame: false,
    transparent: true,
    alwaysOnTop: isPinned,
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

  mainWindow.loadFile('index.html');

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
    mainWindow.focus();
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  createTray();
}

function createTray() {
  const iconPath = path.join(__dirname, 'assets', 'icon.png');
  const trayIcon = nativeImage.createFromPath(iconPath).resize({ width: 16, height: 16 });

  tray = new Tray(trayIcon);
  tray.setToolTip('Surf Timer');

  const contextMenu = Menu.buildFromTemplate([
    {
      label: 'Surf Timer 표시/숨기기',
      click: () => {
        if (mainWindow) {
          if (mainWindow.isVisible()) {
            mainWindow.hide();
          } else {
            mainWindow.show();
            mainWindow.focus();
          }
        }
      }
    },
    {
      label: '항상 위에 고정',
      type: 'checkbox',
      checked: isPinned,
      click: (menuItem) => {
        isPinned = menuItem.checked;
        if (mainWindow) {
          mainWindow.setAlwaysOnTop(isPinned);
          mainWindow.webContents.send('pin-status-changed', isPinned);
        }
      }
    },
    {
      label: '작업표시줄에 도킹',
      type: 'checkbox',
      checked: isTaskbarDocked,
      click: (menuItem) => {
        isTaskbarDocked = !isTaskbarDocked;
        const primaryDisplay = screen.getPrimaryDisplay();
        const { width: screenWidth, height: screenHeight } = primaryDisplay.bounds;
        const workArea = primaryDisplay.workArea;

        if (isTaskbarDocked) {
          if (!savedNormalBounds) savedNormalBounds = mainWindow.getBounds();
          mainWindow.setSize(SIZES.taskbar.width, SIZES.taskbar.height, false);
          const taskbarHeight = screenHeight - workArea.height;
          const dockX = 10;
          const dockY = (taskbarHeight > 0)
            ? workArea.height + Math.max(2, Math.floor((taskbarHeight - SIZES.taskbar.height) / 2))
            : screenHeight - SIZES.taskbar.height - 4;
          mainWindow.setPosition(dockX, dockY, false);
          mainWindow.setAlwaysOnTop(true, 'screen-saver');
          mainWindow.webContents.send('taskbar-dock-changed', true);
        } else {
          mainWindow.setSize(SIZES.normal.width, SIZES.normal.height, false);
          if (savedNormalBounds) {
            mainWindow.setPosition(savedNormalBounds.x, savedNormalBounds.y, false);
          } else {
            mainWindow.setPosition(screenWidth - SIZES.normal.width - 24, 48, false);
          }
          mainWindow.setAlwaysOnTop(isPinned);
          mainWindow.webContents.send('taskbar-dock-changed', false);
        }
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
    if (mainWindow) {
      if (mainWindow.isVisible()) {
        mainWindow.focus();
      } else {
        mainWindow.show();
      }
    }
  });
}

// IPC 통신 핸들러 등록
ipcMain.on('window-minimize', () => {
  if (mainWindow) mainWindow.minimize();
});

ipcMain.on('window-close', () => {
  if (mainWindow) mainWindow.close();
});

ipcMain.on('toggle-pin', (event, forceValue) => {
  if (mainWindow) {
    isPinned = typeof forceValue === 'boolean' ? forceValue : !isPinned;
    mainWindow.setAlwaysOnTop(isPinned);
    event.reply('pin-status-changed', isPinned);
  }
});

ipcMain.on('toggle-compact-mode', (event, forceMode) => {
  if (!mainWindow) return;
  isCompact = typeof forceMode === 'boolean' ? forceMode : !isCompact;

  if (isCompact) {
    if (!isTaskbarDocked && !isCompact) savedNormalBounds = mainWindow.getBounds();
    mainWindow.setSize(SIZES.compact.width, SIZES.compact.height, false);
    event.reply('compact-mode-changed', true);
  } else {
    mainWindow.setSize(SIZES.normal.width, SIZES.normal.height, false);
    if (savedNormalBounds) {
      mainWindow.setPosition(savedNormalBounds.x, savedNormalBounds.y, false);
    }
    event.reply('compact-mode-changed', false);
  }
});

ipcMain.on('toggle-taskbar-dock', (event, forceMode) => {
  if (!mainWindow) return;
  const primaryDisplay = screen.getPrimaryDisplay();
  const { width: screenWidth, height: screenHeight } = primaryDisplay.bounds;
  const workArea = primaryDisplay.workArea;

  isTaskbarDocked = typeof forceMode === 'boolean' ? forceMode : !isTaskbarDocked;

  if (isTaskbarDocked) {
    if (!isTaskbarDocked) savedNormalBounds = mainWindow.getBounds();
    else if (!savedNormalBounds) savedNormalBounds = mainWindow.getBounds();

    mainWindow.setSize(SIZES.taskbar.width, SIZES.taskbar.height, false);
    
    // Windows 작업표시줄 좌측 하단 (스크린샷에 표시된 빨간 박스 영역)
    const taskbarHeight = screenHeight - workArea.height;
    const dockX = 10;
    const dockY = (taskbarHeight > 0)
      ? workArea.height + Math.max(2, Math.floor((taskbarHeight - SIZES.taskbar.height) / 2))
      : screenHeight - SIZES.taskbar.height - 4;

    mainWindow.setPosition(dockX, dockY, false);
    mainWindow.setAlwaysOnTop(true, 'screen-saver');
    event.reply('taskbar-dock-changed', true);
  } else {
    mainWindow.setSize(SIZES.normal.width, SIZES.normal.height, false);
    if (savedNormalBounds) {
      mainWindow.setPosition(savedNormalBounds.x, savedNormalBounds.y, false);
    } else {
      mainWindow.setPosition(screenWidth - SIZES.normal.width - 24, 48, false);
    }
    mainWindow.setAlwaysOnTop(isPinned);
    event.reply('taskbar-dock-changed', false);
  }
});

ipcMain.handle('get-window-state', () => {
  return {
    isPinned,
    isCompact,
    isTaskbarDocked
  };
});

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
