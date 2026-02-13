/**
 * Convert KeyboardEvent to Electron accelerator format.
 * Uses physical key positions for layout-independent shortcuts.
 */
export function eventToAccelerator(event: KeyboardEvent): string | null {
  const modifiers: string[] = [];
  const key = event.key;
  const code = event.code;

  // Ignore modifier-only presses
  if (["Control", "Alt", "Shift", "Meta", "Command"].includes(key)) {
    return null;
  }

  // Build modifiers
  if (event.metaKey || event.ctrlKey) {
    modifiers.push("CommandOrControl");
  }
  if (event.altKey) {
    modifiers.push("Alt");
  }
  if (event.shiftKey) {
    modifiers.push("Shift");
  }

  // Require at least one modifier for global shortcuts
  if (modifiers.length === 0) {
    return null;
  }

  // Map special keys
  const keyMap: Record<string, string> = {
    " ": "Space",
    ArrowUp: "Up",
    ArrowDown: "Down",
    ArrowLeft: "Left",
    ArrowRight: "Right",
    Escape: "Esc",
    Delete: "Delete",
    Backspace: "Backspace",
    Enter: "Return",
    Tab: "Tab",
  };

  if (keyMap[key]) {
    return [...modifiers, keyMap[key]].join("+");
  }

  // Handle function keys (F1-F24) using code
  if (code && /^F\d+$/.test(code)) {
    return [...modifiers, code].join("+");
  }

  // For letter keys, use the physical key code (KeyA, KeyB, etc.)
  if (code?.startsWith("Key")) {
    const letter = code.replace("Key", "");
    return [...modifiers, letter].join("+");
  }

  // For digit keys (Digit0-Digit9)
  if (code?.startsWith("Digit")) {
    const digit = code.replace("Digit", "");
    return [...modifiers, digit].join("+");
  }

  // For numpad keys
  if (code?.startsWith("Numpad")) {
    const num = code.replace("Numpad", "num");
    return [...modifiers, num].join("+");
  }

  // Fallback to key character for other cases
  const mappedKey = key.toUpperCase();
  return [...modifiers, mappedKey].join("+");
}
