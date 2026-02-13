type DisplayMode = "mini" | "full";

interface ToggleButtonProps {
  mode: DisplayMode;
  onToggle: () => void;
}

export function ToggleButton({ mode, onToggle }: ToggleButtonProps) {
  return (
    <button
      id="mp-toggle-view"
      className={`mp-floating-toggle ${mode === "full" ? "showing-youtube" : ""}`}
      onClick={onToggle}
      title={mode === "mini" ? "Show YouTube Interface" : "Show Mini Player"}
    >
      👁️
    </button>
  );
}
