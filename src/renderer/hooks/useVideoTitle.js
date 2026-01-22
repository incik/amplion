import { useState, useEffect } from "react";

export function useVideoTitle() {
  const [title, setTitle] = useState("Loading...");

  useEffect(() => {
    // Initial fetch
    setTitle(window.electronAPI.getYouTubeTitle());

    // Poll for title updates
    const intervalId = setInterval(() => {
      const newTitle = window.electronAPI.getYouTubeTitle();
      // Only update state if title changed to avoid unnecessary re-renders
      setTitle((prev) => (newTitle !== prev ? newTitle : prev));
    }, 2000);

    // Also observe DOM mutations for faster updates
    const observer = new MutationObserver(() => {
      const newTitle = window.electronAPI.getYouTubeTitle();
      setTitle((prev) => (newTitle !== prev ? newTitle : prev));
    });

    try {
      observer.observe(document.body, {
        childList: true,
        subtree: true,
      });
    } catch (e) {
      console.warn("Failed to observe document body:", e);
    }

    return () => {
      clearInterval(intervalId);
      observer.disconnect();
    };
  }, []);

  return title;
}
