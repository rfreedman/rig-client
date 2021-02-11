import * as path from 'path';
import * as url from 'url';
import * as os from 'os';
import * as fs from 'fs';

import {app, BrowserWindow, screen} from 'electron';
const { dialog } = require('electron');
import {RadioNetworkService} from './radio.network.service';

const channelName = 'radio';

let browserWindow: BrowserWindow = null;
const args = process.argv.slice(1);
const serve = args.some(val => val === '--serve');

let radio: RadioNetworkService;
let notifierTimeout: NodeJS.Timeout;

interface RigClientConfig {
  x: number,
  y: number,
  width: number,
  height: number
}

function getConfigPath(): string {
  return path.resolve(os.homedir(), '.rig-client.json');
}

function readConfig(): RigClientConfig | null {
  const configPath = getConfigPath();
  if (fs.existsSync(configPath)) {
    const rawData = fs.readFileSync(configPath);
    return JSON.parse(rawData.toString()) as RigClientConfig;
  }

  return null;
}

function writeConfig(): void {
  const configPath = getConfigPath();

  if(browserWindow) {
    const bounds = browserWindow.getBounds();
    const config: RigClientConfig = {
      x: bounds.x,
      y: bounds.y,
      width: bounds.width,
      height: bounds.height
    };
    const configJson = JSON.stringify(config);
    fs.writeFileSync(configPath, configJson);
  }
}

function startRadio(): void {
  const host = app.commandLine.getSwitchValue("host") || '127.0.0.1';
  const portStr = app.commandLine.getSwitchValue("port") || '4532';
  const port = Number(portStr);

  radio = new RadioNetworkService();
  radio.start(host, port, (msg: string) => {
    if(msg === 'CONNECTED') {
      notifierTimeout = setInterval(() => radio.update(), 500);
      return;
    }

    if(msg === 'CONNECT_ERROR') {
      if(browserWindow) {
        browserWindow.close();
      }
      dialog.showErrorBox('RigClient Error', `Failed to connect to rigctl instance at ${host}:${port}`);
      app.quit();
      return;
    }

    if (browserWindow && browserWindow.webContents && msg) {
      browserWindow.webContents.send(channelName, msg);
    }
  });
}

function createWindow(): BrowserWindow {
  startRadio();

  let config: RigClientConfig = readConfig();
  if (!config) {
    const workAreaSize = screen.getPrimaryDisplay().workAreaSize;
    config = {
      x: Math.round(workAreaSize.width / 4),
      y: Math.round(workAreaSize.height / 4),
      width: Math.round(workAreaSize.width / 2),
      height: Math.round(workAreaSize.height / 2.2),
    };
  }

  // Create the browser window.
  browserWindow = new BrowserWindow({
    x: config.x,
    y: config.y,
    width: config.width,
    height: config.height,

    webPreferences: {
      nodeIntegration: true,
      allowRunningInsecureContent: true, // (serve) ? true : false,
      contextIsolation: false,  // false if you want to run 2e2 test with Spectron
      enableRemoteModule : true, // true if you want to run 2e2 test  with Spectron or use remote module in renderer context (ie. Angular)
      webSecurity: false
    },
  });

  browserWindow.setTitle("RigClient");
  browserWindow.on('page-title-updated', function(e) {
    e.preventDefault();
  });

  if (serve) {
    browserWindow.webContents.openDevTools();

    require('electron-reload')(__dirname, {
      electron: require(`${__dirname}/node_modules/electron`)
    });
    browserWindow.loadURL('http://localhost:4200');

  } else {
    browserWindow.loadURL(url.format({
      pathname: path.join(__dirname, 'dist/index.html'),
      protocol: 'file:',
      slashes: true
    }));
  }

  // Emitted when the window is about to be closed.
  browserWindow.on('close', () => {
    writeConfig();
  });

  // Emitted when the window is closed.
  browserWindow.on('closed', () => {

    if(notifierTimeout) {
      clearInterval(notifierTimeout);
      notifierTimeout = null;
    }

    if(radio) {
      radio.stop();
      radio = null;
    }

    // Dereference the window object, usually you would store window
    // in an array if your app supports multi windows, this is the time
    // when you should delete the corresponding element.
    browserWindow = null;
  });

  return browserWindow;
}

try {
  // This method will be called when Electron has finished
  // initialization and is ready to create browser windows.
  // Some APIs can only be used after this event occurs.
  // Added 400 ms to fix the black background issue while using transparent window. More detais at https://github.com/electron/electron/issues/15947
  app.on('ready', () => {
    setTimeout(createWindow, 400);
  });

  // Quit when all windows are closed.
  app.on('window-all-closed', () => {
    app.quit();
  });
} catch (e) {
  console.error(e);
}
