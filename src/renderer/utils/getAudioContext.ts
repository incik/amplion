let audioCtxSingleton: AudioContext | null = null;

const AudioContextClass =
  window.AudioContext ||
  (window as Window & { webkitAudioContext?: typeof AudioContext })
    .webkitAudioContext!;

export function getAudioContext(): AudioContext {
  if (!audioCtxSingleton) {
    audioCtxSingleton = new AudioContextClass();
  }
  return audioCtxSingleton;
}
