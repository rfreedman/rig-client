import {ChangeDetectorRef, Component, OnInit} from '@angular/core';
import {ElectronService} from '../core/services';
import {Subject} from 'rxjs';
import {takeUntil} from 'rxjs/operators';
import {SignalStrengthConverterService} from './signal-strength-converter.service';

@Component({
  selector: 'app-radio',
  templateUrl: './radio.component.html',
  styleUrls: ['./radio.component.scss']
})
export class RadioComponent implements OnInit {

  utcTime: string;
  localTime: string;

  mode = "init mode";
  freq = "init freq";
  sValue = 0;
  signalStrength = "";

  destroyed: Subject<boolean> = new Subject();

  interval: NodeJS.Timeout;

  gaugeOptions /*: CanvasGauges.RadialGaugeOptions */ = {
    width: 175,
    height: 150,
    units: false,
    "title": "Signal Strength",
    minValue: 0,
    maxValue: 15,
    value: this.signalStrength,
    startAngle: 90,
    ticksAngle: 180,
    valueBox: false,
    majorTicks: [
      "0",
      "1",
      " ",
      "3",
      " ",
      "5",
      " ",
      "7",
      " ",
      "9",
      "",
      "+20",
      "",
      "+40",
      "",
      "+60"
    ],
    minorTicks: 2,
    strokeTicks: true,
    highlights: [
      {
        "from": 9,
        "to": 15,
        "color": "rgba(200, 50, 50, .75)"
      }
    ],
    colorPlate: "#fff",
    borderShadowWidth: 0,
    borders: false,
    needleType: "arrow",
    needleWidth: 2,
    needleCircleSize: 7,
    needleCircleOuter: true,
    needleCircleInner: false,
    animationDuration: 200,
    animationRule: "linear"
  };

  constructor(
    private electron: ElectronService,
    private signalStrengthConverter: SignalStrengthConverterService,
    private changeDetector: ChangeDetectorRef) {
  }

  ngOnInit(): void {
    this.electron.radioNotifications
      .pipe(takeUntil(this.destroyed))
      .subscribe(
        (data) => this.handleNotification(data),
        (err) => console.error(err)
      );

    this.interval = setInterval(() => this.updateTimes(), 1000);
  }

  ngOnDestroy() {
    if(this.interval) {
      clearTimeout(this.interval);
    }
    this.destroyed.next(true);
  }

  private updateTimes() {
    const now = new Date();
    this.localTime = now.toTimeString().substr(0,8);
    this.utcTime = now.toUTCString().substr(17,8);
  }

  private numberWithThousandsSeparator(n, separator): string {
    const parts: string[] = n.toString().split(".");
    return parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, separator) + (parts[1] ? "." + parts[1] : "");
  }

  private handleNotification(notification: string) : void {
    const jsonObj = JSON.parse(notification);

    switch(jsonObj['op']) {
      case 'get_mode':
        // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
        this.mode = `${jsonObj['value']}`;
        break;

      case 'get_signal_strength': {
        this.sValue = this.signalStrengthConverter.strengthToSLevel(jsonObj['value']);
        if (this.sValue <= 9) {
          this.signalStrength = `s${this.sValue}`;
        } else {
          this.signalStrength = `${(this.sValue - 9) * 10} over s9`;
        }
      }
        break;

      case 'get_freq':
        // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
        // this.freq = `${jsonObj['value']}`;

        // todo - come up with a pipe for this, consider spacing
        this.freq = this.numberWithThousandsSeparator(jsonObj['value'], '');
        break;

      default:
        // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
        console.log(`no match for ${jsonObj}`);
        break;
    }

    // not sure why we need to force change detection here....
    this.changeDetector.detectChanges();
  }
}
