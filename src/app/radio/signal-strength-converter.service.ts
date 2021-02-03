export class SignalStrengthConverterService {

  strengthToSLevel(strength) {

    if(strength < -48) {
      return 0;
    }

    if(strength >= -48 && strength < -42) {
      return 1;
    }

    if(strength >= -42 && strength < -36) {
      return 2;
    }

    if(strength >= -36 && strength < -30) {
      return 3;
    }

    if(strength >= -30 && strength < -24) {
      return 4;
    }

    if(strength >= -24 && strength < -18) {
      return 6;
    }

    if(strength >= -18 && strength < -12) {
      return 7;
    }

    if(strength >= -12 && strength < -6) {
      return 8;
    }

    if(strength >= -6 && strength < 0) {
      return 9;
    }

    if(strength >= 0 && strength < 10) {
      return 10;
    }

    if(strength >= 10 && strength < 20) {
      return 11;
    }

    if(strength >= 20 && strength < 30) {
      return 12;
    }

    if(strength >= 30 && strength < 40) {
      return 13;
    }

    if(strength >= 40 && strength < 50) {
      return 13;
    }

    if(strength >= 50 && strength < 60) {
      return 14;
    }
    if(strength >= 60) {
      return 15;
    }
  }
}
