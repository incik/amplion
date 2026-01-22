import React from "react";
import { useVideoState } from "../hooks/useVideoState";
import { MiniPlayerButton } from "./MiniPlayerButton";
import { useDisplayMode } from "../hooks/useDisplayMode";

export function MiniPlayerControls() {
  const { isPlaying, togglePlayPause } = useVideoState();
  const { mode, toggle } = useDisplayMode();

  const handlePrev = () => {
    window.electronAPI.clickYouTubeButton(".ytp-prev-button");
  };

  const handleNext = () => {
    window.electronAPI.clickYouTubeButton(".ytp-next-button");
  };

  return (
    <div className="mini-player-controls">
      <MiniPlayerButton onClick={handlePrev} id="mp-prev" title="Previous">
        ⏮
      </MiniPlayerButton>
      <MiniPlayerButton
        onClick={togglePlayPause}
        id="mp-play-pause"
        title="Play/Pause"
      >
        {isPlaying ? "⏸" : "▶"}
      </MiniPlayerButton>
      <MiniPlayerButton onClick={handleNext} id="mp-next" title="Next">
        ⏭
      </MiniPlayerButton>
    </div>
  );
}
