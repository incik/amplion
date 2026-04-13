import { useState, useEffect } from "react";
import { MiniPlayer } from "./components/MiniPlayer";
import { ServiceSwitch } from "./components/ServiceSwitch";
import { ToggleButton } from "./components/ToggleButton";
import { useDisplayMode } from "./hooks/useDisplayMode";
import "./styles/MiniPlayer.css";

const isYouTubeMusic = () =>
  typeof window !== "undefined" &&
  window.location.hostname === "music.youtube.com";

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

  useEffect(() => {
    if (isYouTubeMusic()) {
      // YouTube Music: no ytd-app; consider ready once body exists and give the page a moment
      if (document.body) {
        const t = setTimeout(() => setIsReady(true), 500);
        return () => clearTimeout(t);
      }
    } else {
      // YouTube: wait for ytd-app
      const checkYouTube = () => {
        if (window.electronAPI.isYouTubeReady()) {
          setIsReady(true);
        } else {
          setTimeout(checkYouTube, 500);
        }
      };
      checkYouTube();
    }
  }, []);

  if (!isReady) return null;

  const onYouTubeMusic = isYouTubeMusic();
  const currentService = onYouTubeMusic ? "youtubeMusic" : "youtube";

  const handleSwitchService = (service: "youtube" | "youtubeMusic") => {
    if (service !== currentService) {
      window.electronAPI.switchService(service);
    }
  };

  if (onYouTubeMusic) {
    return (
      <>
        <ServiceSwitch
          currentService={currentService}
          onSwitch={handleSwitchService}
        />
        <style>{`ytmusic-player-bar { bottom: 44px !important; }`}</style>
      </>
    );
  }

  return (
    <>
      <MiniPlayer visible={mode === "mini"} />
      <ToggleButton mode={mode} onToggle={toggle} />
      <ServiceSwitch
        currentService={currentService}
        onSwitch={handleSwitchService}
      />
      <style>{hiddenYouTubeStyles}</style>
    </>
  );
}
