let audioCtxSingleton: AudioContext | null = null;

export function getAudioContext() {
  if (!audioCtxSingleton) {
    audioCtxSingleton = new (
      window.AudioContext || window.webkitAudioContext
    )();
  }
  return audioCtxSingleton;
}
