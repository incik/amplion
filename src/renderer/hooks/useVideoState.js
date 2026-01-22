import { useState, useEffect } from "react";

export function useVideoState() {
  const [isPlaying, setIsPlaying] = useState(false);

  useEffect(() => {
    // Helper to update state from DOM
    const checkState = () => {
      const isPaused = window.electronAPI.isVideoPaused();
      setIsPlaying(!isPaused);
    };

    // Initial check
    checkState();

    // Listen to media key events from main process
    const removePlayPauseListener = window.electronAPI.onMediaPlayPause(() => {
      // Small delay to allow play/pause to process if it came from external source
      setTimeout(checkState, 100);
    });

    // Poll for state changes since we can't easily observe the video object directly
    const intervalId = setInterval(checkState, 500);

    return () => {
      removePlayPauseListener();
      clearInterval(intervalId);
    };
  }, []);

  const togglePlayPause = () => {
    // Use the safe bridge method to toggle
    const newState = window.electronAPI.togglePlayback();
    setIsPlaying(newState);
  };

  return { isPlaying, togglePlayPause };
}
