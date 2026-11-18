/** Plays the buzzer frequencies reported by the simulation. */
export class BuzzerAudio {
  private context: AudioContext | null = null;
  private oscillator: OscillatorNode | null = null;
  private gain: GainNode | null = null;

  play(frequency: number): void {
    if (frequency <= 0) {
      this.silence();
      return;
    }
    if (!this.context) {
      this.context = new AudioContext();
      this.gain = this.context.createGain();
      // Square waves are loud; a low volume keeps the classroom bearable.
      this.gain.gain.value = 0.05;
      this.gain.connect(this.context.destination);
    }
    if (!this.oscillator) {
      this.oscillator = this.context.createOscillator();
      this.oscillator.type = 'square';
      this.oscillator.connect(this.gain!);
      this.oscillator.start();
    }
    this.oscillator.frequency.setValueAtTime(frequency, this.context.currentTime);
  }

  silence(): void {
    this.oscillator?.stop();
    this.oscillator?.disconnect();
    this.oscillator = null;
  }

  dispose(): void {
    this.silence();
    void this.context?.close();
    this.context = null;
  }
}
