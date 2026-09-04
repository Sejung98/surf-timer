const { app, BrowserWindow, ipcMain, screen, Tray, Menu, nativeImage } = require('electron');
const path = require('path');

let mainWindow = null;
let tray = null;
let isCompact = false;
let isPinned = true; // 기본적으로 위젯이므로 항상 위 고정

// 윈도우 표준 크기 및 컴팩트 크기 정의 (가로는 길고 세로는 짧은 Flow 카드 비율)
const SIZES = {
  normal: { width: 390, height: 245 },
  compact: { width: 170, height: 48 }
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
  const targetSize = isCompact ? SIZES.compact : SIZES.normal;

  mainWindow.setSize(targetSize.width, targetSize.height, true);
  event.reply('compact-mode-changed', isCompact);
});

ipcMain.handle('get-window-state', () => {
  return {
    isPinned,
    isCompact
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
