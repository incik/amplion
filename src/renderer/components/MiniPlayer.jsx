import React from 'react';
import { useVideoTitle } from '../hooks/useVideoTitle';
import { MiniPlayerControls } from './MiniPlayerControls';
import '../styles/MiniPlayer.css';

export function MiniPlayer({ visible }) {
    const title = useVideoTitle();

    return (
        <div
            id="custom-mini-player"
            className={visible ? '' : 'hidden'}
        >
            <div className="mini-player-content">
                <div
                    className="mini-player-title"
                    id="mini-player-title" // ID kept for compatibility if needed (e.g. tests)
                >
                    {title}
                </div>
                <MiniPlayerControls />
            </div>
        </div>
    );
}
