import {AfterViewInit, ChangeDetectorRef, Component, ElementRef, OnDestroy, OnInit, ViewChild} from '@angular/core';
import {ElectronService} from '../core/services';
import {Subject} from 'rxjs';
import {takeUntil} from 'rxjs/operators';
import {SignalStrengthConverterService} from './signal-strength-converter.service';
import {RadialGauge} from '@biacsics/ng-canvas-gauges';

@Component({
  selector: 'app-radio',
  templateUrl: './radio.component.html',
  styleUrls: ['./radio.component.scss']
})
export class RadioComponent implements OnInit, OnDestroy, AfterViewInit {

  @ViewChild('meterContainer') meterContainer: ElementRef<HTMLDivElement>;
  @ViewChild('meterCanvas') meterCanvas: ElementRef<HTMLCanvasElement>;
  @ViewChild('gauge') gauge: RadialGauge;

  showGauge = false;
  utcTime: string;
  localTime: string;

  mode = "";
  freq = "";
  sValue = 0;
  signalStrength = "";

  destroyed: Subject<boolean> = new Subject();

  interval: NodeJS.Timeout;

  gaugeOptions /*: CanvasGauges.RadialGaugeOptions */ = {
    // width: 175,
    // height: 150,
    // renderTo: this.meterCanvas.nativeElement,
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

  ngAfterViewInit(): void {
    this.gaugeOptions['renderTo'] = this.meterCanvas.nativeElement;
    this.showGauge = true;

    window.addEventListener('resize', () => {
      this.resizeGauge();
    });
  }

  resizeGauge(): void {
    const containerWidth: number = this.meterContainer.nativeElement.clientWidth;
    const containerHeight: number = this.meterContainer.nativeElement.clientHeight;
    const canvasElement = this.meterCanvas.nativeElement;
    canvasElement.width = containerWidth;
    canvasElement.height = containerHeight;
    this.gauge.update({width: containerWidth, height: containerHeight});
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

  ngOnDestroy(): void {
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

  private static numberWithThousandsSeparator(n: string, separator): string {
    return n.replace(/\B(?=(\d{3})+(?!\d))/g, separator);
  }

  private handleNotification(notification: string) : void {
    const jsonObj = JSON.parse(notification);
    const status: boolean = jsonObj['status'];
    const op: string = jsonObj['op'];
    const value: string = jsonObj['value'];

    if(!status) {
      console.log(`failed command: ${op}`);
      return;
    }

    switch(op) {
      case 'get_mode':
        this.mode = value;
        break;

      case 'get_signal_strength':
        this.sValue = this.signalStrengthConverter.strengthToSLevel(jsonObj['value']);
        if (this.sValue <= 9) {
          this.signalStrength = `s${this.sValue.toFixed(2)}`;
        } else {
          this.signalStrength = `${((this.sValue - 9) * 10).toFixed(2)} over s9`;
        }
        break;

      case 'get_freq':
        this.freq = RadioComponent.numberWithThousandsSeparator(jsonObj['value'], '.');
        this.freq = this.freq.substr(0, this.freq.length - 1);
        break;

      default:
        break;
    }

    // not sure why we need to force change detection here....
    this.changeDetector.detectChanges();
  }
}
