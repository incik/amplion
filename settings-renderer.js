// Settings window renderer logic
let currentShortcut = '';
let recordedShortcut = '';
let isRecording = false;

const shortcutInput = document.getElementById('shortcut-input');
const currentShortcutDisplay = document.getElementById('current-shortcut');
const saveBtn = document.getElementById('save-btn');
const resetBtn = document.getElementById('reset-btn');
const cancelBtn = document.getElementById('cancel-btn');
const infoMessage = document.getElementById('info-message');
const inputStatus = document.getElementById('input-status');

// Load current shortcut on startup
async function loadCurrentShortcut() {
    try {
        currentShortcut = await window.settingsAPI.getCurrentShortcut();
        currentShortcutDisplay.textContent = currentShortcut;
        shortcutInput.placeholder = `Current: ${currentShortcut}`;
    } catch (error) {
        console.error('Failed to load shortcut:', error);
        showMessage('Failed to load current shortcut', 'error');
    }
}

// Show message to user
function showMessage(text, type = 'success') {
    infoMessage.textContent = text;
    infoMessage.className = 'info-message show ' + type;

    setTimeout(() => {
        infoMessage.classList.remove('show');
    }, 3000);
}

// Convert key event to Electron accelerator format
function eventToAccelerator(event) {
    const modifiers = [];
    const key = event.key;
    const code = event.code; // Physical key position (layout-independent)

    // Ignore modifier-only presses
    if (['Control', 'Alt', 'Shift', 'Meta', 'Command'].includes(key)) {
        return null;
    }

    // Build modifiers
    if (event.metaKey || event.ctrlKey) {
        modifiers.push('CommandOrControl');
    }
    if (event.altKey) {
        modifiers.push('Alt');
    }
    if (event.shiftKey) {
        modifiers.push('Shift');
    }

    // Require at least one modifier for global shortcuts
    if (modifiers.length === 0) {
        return null;
    }

    // Map special keys
    const keyMap = {
        ' ': 'Space',
        'ArrowUp': 'Up',
        'ArrowDown': 'Down',
        'ArrowLeft': 'Left',
        'ArrowRight': 'Right',
        'Escape': 'Esc',
        'Delete': 'Delete',
        'Backspace': 'Backspace',
        'Enter': 'Return',
        'Tab': 'Tab',
    };

    // Check special keys first
    if (keyMap[key]) {
        return [...modifiers, keyMap[key]].join('+');
    }

    // Handle function keys (F1-F24) using code
    if (code && code.match(/^F\d+$/)) {
        return [...modifiers, code].join('+');
    }

    // For letter keys, use the physical key code (KeyA, KeyB, etc.)
    // This ensures the shortcut works regardless of keyboard layout
    if (code && code.startsWith('Key')) {
        const letter = code.replace('Key', ''); // KeyY -> Y
        return [...modifiers, letter].join('+');
    }

    // For digit keys (Digit0-Digit9)
    if (code && code.startsWith('Digit')) {
        const digit = code.replace('Digit', ''); // Digit1 -> 1
        return [...modifiers, digit].join('+');
    }

    // For numpad keys
    if (code && code.startsWith('Numpad')) {
        const num = code.replace('Numpad', 'num'); // Numpad1 -> num1
        return [...modifiers, num].join('+');
    }

    // Fallback to key character for other cases
    let mappedKey = key.toUpperCase();

    return [...modifiers, mappedKey].join('+');
}

// Handle keyboard input for shortcut recording
shortcutInput.addEventListener('focus', () => {
    isRecording = true;
    shortcutInput.classList.add('recording');
    shortcutInput.value = '';
    inputStatus.textContent = 'Recording...';
});

shortcutInput.addEventListener('blur', () => {
    isRecording = false;
    shortcutInput.classList.remove('recording');
    inputStatus.textContent = '';

    // If no shortcut was recorded, clear the input
    if (!recordedShortcut) {
        shortcutInput.value = '';
    }
});

shortcutInput.addEventListener('keydown', (event) => {
    if (!isRecording) return;

    event.preventDefault();
    event.stopPropagation();

    const accelerator = eventToAccelerator(event);

    if (accelerator) {
        recordedShortcut = accelerator;
        shortcutInput.value = accelerator;
        inputStatus.textContent = '✓';
        inputStatus.style.color = '#34C759';
    } else {
        shortcutInput.value = 'Invalid combination';
        inputStatus.textContent = '✗';
        inputStatus.style.color = '#FF3B30';
        recordedShortcut = '';
    }
});

// Save button handler
saveBtn.addEventListener('click', async () => {
    console.log('Saving shortcut:', recordedShortcut);
    if (!recordedShortcut) {
        showMessage('Please record a shortcut first', 'warning');
        return;
    }

    if (recordedShortcut === currentShortcut) {
        showMessage('This is already your current shortcut', 'warning');
        return;
    }

    try {
        saveBtn.disabled = true;
        saveBtn.textContent = 'Saving...';

        const result = await window.settingsAPI.setCustomShortcut(recordedShortcut);

        if (result.success) {
            currentShortcut = recordedShortcut;
            currentShortcutDisplay.textContent = recordedShortcut;
            showMessage('Shortcut saved successfully!', 'success');

            // Clear the input
            shortcutInput.value = '';
            recordedShortcut = '';
            shortcutInput.placeholder = `Current: ${currentShortcut}`;
        } else {
            showMessage(result.error || 'Failed to save shortcut', 'error');
        }
    } catch (error) {
        console.error('Save error:', error);
        showMessage('Failed to save shortcut', 'error');
    } finally {
        saveBtn.disabled = false;
        saveBtn.textContent = 'Save';
    }
});

// Reset button handler
resetBtn.addEventListener('click', async () => {
    if (!confirm('Reset to default shortcut (CommandOrControl+Shift+~)?')) {
        return;
    }

    try {
        resetBtn.disabled = true;
        resetBtn.textContent = 'Resetting...';

        const result = await window.settingsAPI.resetToDefault();

        if (result.success) {
            currentShortcut = result.shortcut;
            currentShortcutDisplay.textContent = result.shortcut;
            shortcutInput.value = '';
            recordedShortcut = '';
            shortcutInput.placeholder = `Current: ${currentShortcut}`;
            showMessage('Reset to default shortcut', 'success');
        } else {
            showMessage('Failed to reset shortcut', 'error');
        }
    } catch (error) {
        console.error('Reset error:', error);
        showMessage('Failed to reset shortcut', 'error');
    } finally {
        resetBtn.disabled = false;
        resetBtn.textContent = 'Reset to Default';
    }
});

// Cancel button handler
cancelBtn.addEventListener('click', () => {
    window.settingsAPI.closeWindow();
});

// Initialize
loadCurrentShortcut();
