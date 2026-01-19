import React from 'react';

export function ToggleButton({ mode, onToggle }) {
    return (
        <button
            id="mp-toggle-view"
            className={`mp-floating-toggle ${mode === 'full' ? 'showing-youtube' : ''}`}
            onClick={onToggle}
            title={mode === 'mini' ? 'Show YouTube Interface' : 'Show Mini Player'}
        >
            👁️
        </button>
    );
}
