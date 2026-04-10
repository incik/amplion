type ServiceType = "youtube" | "youtubeMusic";

interface ServiceSwitchProps {
  currentService: ServiceType;
  onSwitch: (service: ServiceType) => void;
}

export function ServiceSwitch({ currentService, onSwitch }: ServiceSwitchProps) {
  return (
    <div className="service-switch" role="group" aria-label="Switch between YouTube and YouTube Music">
      <button
        type="button"
        className={`service-switch-btn ${currentService === "youtube" ? "active" : ""}`}
        onClick={() => onSwitch("youtube")}
        title="Switch to YouTube"
      >
        YouTube
      </button>
      <button
        type="button"
        className={`service-switch-btn ${currentService === "youtubeMusic" ? "active" : ""}`}
        onClick={() => onSwitch("youtubeMusic")}
        title="Switch to YouTube Music"
      >
        YouTube Music
      </button>
    </div>
  );
}
