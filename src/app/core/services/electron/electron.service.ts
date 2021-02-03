import { Injectable } from '@angular/core';

// If you import a module but never use any of the imported values other than as TypeScript types,
// the resulting javascript file will look as if you never imported the module at all.
import { ipcRenderer, webFrame, remote } from 'electron';
import * as childProcess from 'child_process';
import * as fs from 'fs';
import {Observable, fromEvent, Subject} from 'rxjs';
import {takeUntil} from 'rxjs/operators';

@Injectable({
  providedIn: 'root'
})
export class ElectronService {
  ipcRenderer: typeof ipcRenderer;
  webFrame: typeof webFrame;
  remote: typeof remote;
  childProcess: typeof childProcess;
  fs: typeof fs;

  private channelName = 'radio';
  private ipcObservable: Observable<string[]>;
  private destroy$: Subject<boolean> = new Subject<boolean>();
  public radioNotifications: Subject<string> = new Subject();

  get isElectron(): boolean {
    return !!(window && window.process && window.process.type);
  }

  constructor() {
    // Conditional imports
    if (this.isElectron) {
      this.ipcRenderer = window.require('electron').ipcRenderer;
      this.webFrame = window.require('electron').webFrame;

      // If you wan to use remote object, pleanse set enableRemoteModule to true in main.ts
      this.remote = window.require('electron').remote;
      this.childProcess = window.require('child_process');
      this.fs = window.require('fs');
    }

    this.ipcObservable = fromEvent(ipcRenderer, this.channelName);

    this.ipcObservable
      .pipe(takeUntil(this.destroy$))
      .subscribe(
        (event) => {
          // console.log(event[1])
          this.radioNotifications.next(event[1]);
        },
        (err) => console.log(`radio event subscription error: ${JSON.stringify(err)}`)
      );
  }

  cleanup(): void {
    console.log('electron service cleanup');
    this.destroy$.next(true);
    this.destroy$.unsubscribe();
  }
}
