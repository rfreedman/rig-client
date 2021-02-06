export class SignalStrengthConverterService {

  // returns a number in the range 0 to 15
  strengthToSLevel(strengthArg: string): number {
    const strength = Number(strengthArg);

    if (strength < -54) {
      console.log(`under--range: strength ${strength} is < -54, returning 0 (s0)`);
      return 0;
    }

    // S0 (<= -54dB to S9 (0dB)
    if(strength <= 0) {
      return ((strength + 54) / 6);
    }

    // S9+ (10dB = S9+10) , up to S9+60 (60dB)
    if (strength > 0 && strength <= 60) {
      return (strength / 10) + 9;
    }

    console.log(`over-range: strength ${strength} is > 60, returning 15 (s9+60)`);
    return 15; // don't go beyond full scale at S9+60
  }
}
