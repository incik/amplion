// This component displays the current play and total time of the video

import { useState, useEffect } from "react";

export function PlayTime() {
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  useEffect(() => {
    setCurrentTime(window.electronAPI.getVideoCurrentTime());
    setDuration(window.electronAPI.getVideoDuration());

    const interval = setInterval(() => {
      setCurrentTime(window.electronAPI.getVideoCurrentTime());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const formatTime = (time: number) => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, "0")}`;
  };

  return (
    <div className="mp-play-time">
      {formatTime(currentTime)} / {formatTime(duration)}
    </div>
  );
}
