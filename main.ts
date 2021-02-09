import { app, BrowserWindow, screen } from 'electron';
import * as path from 'path';
import * as url from 'url';

import {RadioNetworkService} from './radio.network.service';

let browserWindow: BrowserWindow = null;
const args = process.argv.slice(1),
  serve = args.some(val => val === '--serve');

let radio: RadioNetworkService;
let notifierTimeout: NodeJS.Timeout;


function createWindow(): BrowserWindow {

  const electronScreen = screen;
  const size = electronScreen.getPrimaryDisplay().workAreaSize;
  const channelName = 'radio';

  console.log('size = ', size);
  console.log('width / 2 = ', size.width / 2);
  console.log('height / 2 = ', size.height / 2);

  // Create the browser window.
  browserWindow = new BrowserWindow({
    x: Math.round(size.width / 4),
    y: Math.round(size.height / 4),
    width: Math.round(size.width / 2),
    height: Math.round(size.height / 2.2),

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

  radio = new RadioNetworkService();
  radio.start('192.168.1.114', 4532, (msg: string) => {
    if(browserWindow && browserWindow.webContents && msg) {
      browserWindow.webContents.send(channelName, msg);
    }
  });

  // 300 msec is the fastest that 3 commands can possibly be processed
  notifierTimeout = setInterval(() => radio.update(), 300);
  return browserWindow;
}

try {
  // This method will be called when Electron has finished
  // initialization and is ready to create browser windows.
  // Some APIs can only be used after this event occurs.
  // Added 400 ms to fix the black background issue while using transparent window. More detais at https://github.com/electron/electron/issues/15947
  app.on('ready', () => setTimeout(createWindow, 400));

  // Quit when all windows are closed.
  app.on('window-all-closed', () => {
    // On OS X it is common for applications and their menu bar
    // to stay active until the user quits explicitly with Cmd + Q
    // if (process.platform !== 'darwin') {
    app.quit();
    // }
  });

  app.on('activate', () => {
    // On OS X it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (browserWindow === null) {
      app.setName("RigClient");
      createWindow();
    }
  });

} catch (e) {
  // Catch Error
  // throw e;
}
