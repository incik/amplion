import React, { useState, useEffect } from 'react';
import { MiniPlayer } from './components/MiniPlayer';
import { ToggleButton } from './components/ToggleButton';
import { useDisplayMode } from './hooks/useDisplayMode';
import './styles/MiniPlayer.css';

// Styles to inject for hiding YouTube when in mini mode
const hiddenYouTubeStyles = `
  body.mini-player-mode ytd-app {
    visibility: hidden !important;
    height: 0 !important;
  }
`;

export default function App() {
    const [isReady, setIsReady] = useState(false);
    const { mode, toggle } = useDisplayMode();

    // Retry logic to wait for YouTube to load
    useEffect(() => {
        // Only mount UI once YouTube is largely ready
        const checkYouTube = () => {
            // Use the preload bridge to check
            if (window.electronAPI.isYouTubeReady()) {
                console.log('YouTube app detected, mounting React UI...');
                setIsReady(true);
            } else {
                // console.log('Waiting for YouTube...');
                setTimeout(checkYouTube, 500);
            }
        };
        checkYouTube();
    }, []);

    // Also inject the style tag for hiding YouTube
    useEffect(() => {
        // We already toggle the class on body in useDisplayMode
        // But we need the CSS rules present in the page.
        // They are in MiniPlayer.css but scoped to what?
        // ytd-app is outside our root.
        // So we need a global style or <style> tag.
        // Since MiniPlayer.css is imported, if we put the rule there, 
        // it should apply globally if the build system outputs it.
        // However, depending on Vite setup, CSS might be scoped or not.
        // Standard CSS import is global.
    }, []);

    if (!isReady) return null;

    return (
        <>
            <MiniPlayer visible={mode === 'mini'} />
            <ToggleButton mode={mode} onToggle={toggle} />
            {/* Explicit style injection into React tree to ensure it's present */}
            <style>{hiddenYouTubeStyles}</style>
        </>
    );
}
