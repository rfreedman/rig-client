import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RadioComponent } from './radio.component';

import {GaugesModule} from '@biacsics/ng-canvas-gauges';
import {SignalStrengthConverterService} from './signal-strength-converter.service';


@NgModule({
  imports: [
    CommonModule,
    GaugesModule
  ],
  declarations: [
    RadioComponent
  ],
  providers: [
    SignalStrengthConverterService
  ],
  exports: [
    RadioComponent
  ]
})
export class RadioModule { }
