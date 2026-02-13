import { useVideoState } from "../hooks/useVideoState";
import { MiniPlayerButton } from "./MiniPlayerButton";

export function MiniPlayerControls() {
  const { isPlaying, togglePlayPause } = useVideoState();

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
