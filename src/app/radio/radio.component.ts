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

  mode = "init mode";
  freq = "init freq";
  signalStrength = 5;

  destroyed: Subject<boolean> = new Subject();

  gaugeOptions /*: CanvasGauges.RadialGaugeOptions */ = {
    width: 350,
    height: 300,
    units: "S-Units",
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
  }

  ngOnDestroy() {
    this.destroyed.next(true);
  }

  private handleNotification(notification: string) : void {
    const jsonObj = JSON.parse(notification);

    switch(jsonObj['op']) {
      case 'get_mode':
        // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
        this.mode = `${jsonObj['value']}`;
        break;

      case 'get_signal_strength':
        // this.signalStrength = jsonObj['value'];
        this.signalStrength = this.signalStrengthConverter.strengthToSLevel(jsonObj['value']);
        break;

      case 'get_freq':
        // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
        this.freq = `${jsonObj['value']}`;
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
