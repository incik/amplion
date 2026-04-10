export function isYouTubeMusicUrl(url: string): boolean {
  try {
    return new URL(url).hostname === "music.youtube.com";
  } catch {
    return false;
  }
}

export function isYouTubeUrl(url: string): boolean {
  try {
    const host = new URL(url).hostname;
    return host === "www.youtube.com" || host === "youtube.com";
  } catch {
    return false;
  }
}
