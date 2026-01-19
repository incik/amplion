import React from 'react';
import { useVideoState } from '../hooks/useVideoState';

export function MiniPlayerControls() {
    const { isPlaying, togglePlayPause } = useVideoState();

    const handlePrev = () => {
        window.electronAPI.clickYouTubeButton('.ytp-prev-button');
    };

    const handleNext = () => {
        window.electronAPI.clickYouTubeButton('.ytp-next-button');
    };

    return (
        <div className="mini-player-controls">
            <button
                onClick={handlePrev}
                className="mp-btn"
                id="mp-prev"
                title="Previous"
            >
                ⏮
            </button>
            <button
                onClick={togglePlayPause}
                className="mp-btn mp-btn-main"
                id="mp-play-pause"
                title="Play/Pause"
            >
                {isPlaying ? '⏸' : '▶'}
            </button>
            <button
                onClick={handleNext}
                className="mp-btn"
                id="mp-next"
                title="Next"
            >
                ⏭
            </button>
        </div>
    );
}
