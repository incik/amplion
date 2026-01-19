import { useState, useEffect } from 'react';

export function useDisplayMode() {
    const [mode, setMode] = useState('full'); // 'mini' or 'full'

    // Load initial mode
    useEffect(() => {
        const savedMode = window.store.get('lastMode', 'full');
        setMode(savedMode);

        if (savedMode === 'mini') {
            document.body.classList.add('mini-player-mode');
        } else {
            document.body.classList.remove('mini-player-mode');
        }
    }, []);

    const toggle = () => {
        const newMode = mode === 'mini' ? 'full' : 'mini';
        setMode(newMode);
        window.store.set('lastMode', newMode);

        if (newMode === 'mini') {
            document.body.classList.add('mini-player-mode');
            // Request resize handled by effect below (or here)
        } else {
            document.body.classList.remove('mini-player-mode');
            window.electronAPI.resizeWindow(500, 600);
        }
    };

    // Effect to handle dynamic resizing when in mini mode
    useEffect(() => {
        if (mode === 'mini') {
            // Calculate height based on mini player element
            const resize = () => {
                const miniPlayer = document.getElementById('custom-mini-player');
                if (miniPlayer) {
                    const rect = miniPlayer.getBoundingClientRect();
                    // 32px margins + 80px for eye button area = 112px padding
                    const height = Math.ceil(rect.height) + 112;
                    window.electronAPI.resizeWindow(500, height);
                }
            };

            // Initial resize
            setTimeout(resize, 100);

            // Re-measure periodically as title might wrap
            const interval = setInterval(resize, 2000);
            return () => clearInterval(interval);
        }
    }, [mode]);

    return { mode, toggle };
}
