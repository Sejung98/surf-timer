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

  // 기본 위치: 화면 우측 상단 근처 (윈도우 위젯에 최적)
  const defaultX = screenWidth - SIZES.normal.width - 24;
  const defaultY = 48;

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
    backgroundColor: '#00000000',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
      backgroundThrottling: false // 백그라운드에서도 타이머가 멈추지 않도록 설정
    }
  });

  mainWindow.loadFile('index.html');

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
    mainWindow.focus();
  });

  // 디버깅 필요 시 활성화 가능
  // mainWindow.webContents.openDevTools({ mode: 'detach' });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  createTray();
}

function createTray() {
  // 16x16 투명 트레이 아이콘 생성 (인라인 SVG/Canvas 대응용 빈 이미지 또는 도트)
  // 윈도우에서 트레이가 정상 작동하도록 16x16 빈 비트맵 아이콘 생성
  const icon = nativeImage.createFromBuffer(
    Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAAZElEQVQ4T2NkIBIwEqmOgTpg1ADG' +
      '////f0TjYxgG5P+DCk7AwMDABqEZYGJA5uPDpBgGQj5Athmku4kBM0FkNyh0QfP/GAYE1DEwNDCh' +
      'hT5u46hhGJDhBhj/oBhKzBiE4eGPhv4YGAyEwA8A5n0/U7450UoAAAAASUVORK5CYII=',
      'base64'
    )
  );

  tray = new Tray(icon);
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
