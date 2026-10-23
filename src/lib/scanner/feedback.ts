let audio: AudioContext | null = null;

/**
 * A short beep and (on Android) a short vibration when a barcode is read.
 * iPhones don't allow web apps to vibrate, so the beep matters there.
 * Any failure is ignored: feedback is nice to have, never required.
 */
export function scanFeedback() {
  try {
    navigator.vibrate?.(60);
  } catch {
    // Not supported.
  }
  try {
    audio ??= new AudioContext();
    if (audio.state === 'suspended') void audio.resume();
    const oscillator = audio.createOscillator();
    const volume = audio.createGain();
    oscillator.type = 'sine';
    oscillator.frequency.value = 1800;
    volume.gain.setValueAtTime(0.15, audio.currentTime);
    volume.gain.exponentialRampToValueAtTime(0.001, audio.currentTime + 0.12);
    oscillator.connect(volume).connect(audio.destination);
    oscillator.start();
    oscillator.stop(audio.currentTime + 0.12);
  } catch {
    // Sound not available.
  }
}
