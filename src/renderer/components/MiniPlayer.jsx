import React from "react";
import { useVideoTitle } from "../hooks/useVideoTitle";
import { MiniPlayerControls } from "./MiniPlayerControls";
import { AudioVisualizer } from "./AudioVisualizer";
import "../styles/MiniPlayer.css";
import { PlayTime } from "./PlayTime";

export function MiniPlayer({ visible }) {
  const title = useVideoTitle();

  return (
    <div id="custom-mini-player" className={visible ? "" : "hidden"}>
      <div className="mini-player-content">
        <div className="mini-player-title" id="mini-player-title">
          {title}
        </div>
        <PlayTime />
        <AudioVisualizer enabled={true} fps={30} bars={32} />
        <MiniPlayerControls />
      </div>
    </div>
  );
}
