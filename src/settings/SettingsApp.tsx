import { useCallback, useEffect, useState } from "react";
import { eventToAccelerator } from "./utils/eventToAccelerator";

type MessageType = "success" | "error" | "warning";

export function SettingsApp() {
  const [currentShortcut, setCurrentShortcut] = useState("");
  const [recordedShortcut, setRecordedShortcut] = useState("");
  const [invalidAttempt, setInvalidAttempt] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: MessageType } | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isResetting, setIsResetting] = useState(false);

  const showMessage = useCallback((text: string, type: MessageType = "success") => {
    setMessage({ text, type });
  }, []);

  useEffect(() => {
    const timer = message ? setTimeout(() => setMessage(null), 3000) : undefined;
    return () => clearTimeout(timer);
  }, [message]);

  useEffect(() => {
    async function load() {
      try {
        const shortcut = await window.settingsAPI.getCurrentShortcut();
        setCurrentShortcut(shortcut);
      } catch (error) {
        console.error("Failed to load shortcut:", error);
        showMessage("Failed to load current shortcut", "error");
      }
    }
    load();
  }, [showMessage]);

  const handleInputFocus = useCallback(() => {
    setIsRecording(true);
    setRecordedShortcut("");
    setInvalidAttempt(false);
  }, []);

  const handleInputBlur = useCallback(() => {
    setIsRecording(false);
    setInvalidAttempt(false);
    if (!recordedShortcut) {
      setRecordedShortcut("");
    }
  }, [recordedShortcut]);

  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent) => {
      if (!isRecording) return;

      event.preventDefault();
      event.stopPropagation();

      const accelerator = eventToAccelerator(event.nativeEvent);

      if (accelerator) {
        setRecordedShortcut(accelerator);
        setInvalidAttempt(false);
      } else {
        setRecordedShortcut("");
        setInvalidAttempt(true);
      }
    },
    [isRecording]
  );

  const handleSave = useCallback(async () => {
    if (!recordedShortcut) {
      showMessage("Please record a shortcut first", "warning");
      return;
    }

    if (recordedShortcut === currentShortcut) {
      showMessage("This is already your current shortcut", "warning");
      return;
    }

    try {
      setIsSaving(true);

      const result = await window.settingsAPI.setCustomShortcut(recordedShortcut);

      if (result.success) {
        setCurrentShortcut(recordedShortcut);
        setRecordedShortcut("");
        showMessage("Shortcut saved successfully!", "success");
      } else {
        showMessage(result.error ?? "Failed to save shortcut", "error");
      }
    } catch (error) {
      console.error("Save error:", error);
      showMessage("Failed to save shortcut", "error");
    } finally {
      setIsSaving(false);
    }
  }, [recordedShortcut, currentShortcut, showMessage]);

  const handleReset = useCallback(async () => {
    if (!window.confirm("Reset to default shortcut (CommandOrControl+Shift+Z)?")) {
      return;
    }

    try {
      setIsResetting(true);

      const result = await window.settingsAPI.resetToDefault();

      if (result.success && result.shortcut) {
        setCurrentShortcut(result.shortcut);
        setRecordedShortcut("");
        showMessage("Reset to default shortcut", "success");
      } else {
        showMessage("Failed to reset shortcut", "error");
      }
    } catch (error) {
      console.error("Reset error:", error);
      showMessage("Failed to reset shortcut", "error");
    } finally {
      setIsResetting(false);
    }
  }, [showMessage]);

  const handleCancel = useCallback(() => {
    window.settingsAPI.closeWindow();
  }, []);

  const inputDisplayValue = invalidAttempt
    ? "Invalid combination"
    : recordedShortcut;

  const inputStatus = isRecording ? (
    recordedShortcut ? (
      <span className="input-status" style={{ color: "#34C759" }}>
        ✓
      </span>
    ) : invalidAttempt ? (
      <span className="input-status" style={{ color: "#FF3B30" }}>
        ✗
      </span>
    ) : (
      <span className="input-status">Recording...</span>
    )
  ) : recordedShortcut ? (
    <span className="input-status" style={{ color: "#34C759" }}>
      ✓
    </span>
  ) : null;

  return (
    <div className="settings-container">
      <h1>Settings</h1>

      <div className="setting-group">
        <h2>Window Toggle Shortcut</h2>
        <p className="description">
          Click on the input below and press your desired keyboard shortcut
          combination.
        </p>

        <div className="info-box">
          <strong>⚠️ Keyboard Layout Note:</strong> Shortcuts use US keyboard
          layout positions. If you&apos;re using a non-US layout (like Czech),
          the physical key position matters, not the character shown on your
          keyboard.
        </div>

        <div className="shortcut-input-wrapper">
          <input
            type="text"
            value={inputDisplayValue}
            readOnly
            placeholder={`Current: ${currentShortcut}`}
            className={`shortcut-input ${isRecording ? "recording" : ""}`}
            onFocus={handleInputFocus}
            onBlur={handleInputBlur}
            onKeyDown={handleKeyDown}
          />
          {inputStatus}
        </div>

        <div className="current-shortcut">
          <span className="label">Current shortcut:</span>
          <code>{currentShortcut || "Loading..."}</code>
        </div>
      </div>

      <div className="button-group">
        <button
          type="button"
          className="btn btn-secondary"
          onClick={handleCancel}
        >
          Cancel
        </button>
        <button
          type="button"
          className="btn btn-secondary"
          onClick={handleReset}
          disabled={isResetting}
        >
          {isResetting ? "Resetting..." : "Reset to Default"}
        </button>
        <button
          type="button"
          className="btn btn-primary"
          onClick={handleSave}
          disabled={isSaving}
        >
          {isSaving ? "Saving..." : "Save"}
        </button>
      </div>

      {message && (
        <div className={`info-message show ${message.type}`}>{message.text}</div>
      )}
    </div>
  );
}
