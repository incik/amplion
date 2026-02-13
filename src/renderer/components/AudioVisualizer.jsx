import React, { useEffect, useMemo, useRef } from "react";
import { getAudioContext } from "../utils/getAudioContext";

const sourceNodeCache = new WeakMap();

export function AudioVisualizer({ enabled, fps = 30, bars = 32, height = 28 }) {
  const canvasRef = useRef(null);

  const analyser = useMemo(() => {
    const ctx = getAudioContext();
    const a = ctx.createAnalyser();
    a.fftSize = 256;
    a.smoothingTimeConstant = 0.3;
    return a;
  }, []);

  useEffect(() => {
    let rafId = null;
    let lastDraw = 0;
    let videoEl = null;
    let data = null;

    const audioCtx = getAudioContext();

    const resumeAudioContext = () => {
      if (audioCtx.state === "running") return;
      // Resume can fail if the browser requires a user gesture.
      // We'll retry on subsequent play/user events.
      audioCtx.resume().catch((err) => {
        // Avoid throwing from animation/event loops.
        console.debug("AudioContext resume failed:", err);
      });
    };

    const handleVideoPlay = () => {
      resumeAudioContext();

      // Defensive: if the RAF loop was stopped for any reason,
      // restart it on play.
      if (!rafId) {
        lastDraw = 0;
        rafId = requestAnimationFrame(draw);
      }
    };

    const ensureConnected = () => {
      // When playback resumes, the AudioContext may be suspended.
      // If we never resume it, the analyser will stay silent.
      if (enabled) resumeAudioContext();

      const ctx = audioCtx;
      const nextVideo = document.querySelector("video");
      if (!nextVideo) return;

      if (videoEl !== nextVideo) {
        if (videoEl) {
          videoEl.removeEventListener("play", handleVideoPlay);
        }

        videoEl = nextVideo;

        // Resume the context on playback start, including when playback
        // is toggled via media keys (no direct pointerdown in the page).
        videoEl.addEventListener("play", handleVideoPlay);

        let source = sourceNodeCache.get(videoEl);
        if (!source) {
          source = ctx.createMediaElementSource(videoEl);
          sourceNodeCache.set(videoEl, source);

          source.connect(analyser);
          analyser.connect(ctx.destination);
        }
      }

      if (!data) data = new Uint8Array(analyser.frequencyBinCount);
    };

    const resizeCanvas = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const dpr = window.devicePixelRatio || 1;
      const cssWidth = canvas.clientWidth || 300;
      const cssHeight = height;
      canvas.width = Math.floor(cssWidth * dpr);
      canvas.height = Math.floor(cssHeight * dpr);
    };

    const draw = (ts) => {
      if (!enabled) return;

      const minDelta = 1000 / fps;
      if (ts - lastDraw < minDelta) {
        rafId = requestAnimationFrame(draw);
        return;
      }
      lastDraw = ts;

      ensureConnected();

      const canvas = canvasRef.current;
      if (!canvas || !data) {
        rafId = requestAnimationFrame(draw);
        return;
      }

      const ctx2d = canvas.getContext("2d");
      if (!ctx2d) {
        rafId = requestAnimationFrame(draw);
        return;
      }

      analyser.getByteFrequencyData(data);

      ctx2d.clearRect(0, 0, canvas.width, canvas.height);

      const w = canvas.width;
      const h = canvas.height;

      const barCount = bars;
      const barWidth = w / barCount;
      const binsPerBar = Math.floor(data.length / barCount) || 1;

      // WinAmp-style gradient
      const gradient = ctx2d.createLinearGradient(0, 0, 0, 20);

      gradient.addColorStop(0, "red");
      gradient.addColorStop(0.6, "orange");
      gradient.addColorStop(0.7, "yellow");
      gradient.addColorStop(1, "green");

      ctx2d.fillStyle = gradient;

      for (let i = 0; i < barCount; i++) {
        let sum = 0;
        const start = i * binsPerBar;
        const end = Math.min(start + binsPerBar, data.length);
        for (let j = start; j < end; j++) sum += data[j];
        const avg = sum / (end - start);

        const barH = (avg / 255) * h;
        const x = i * barWidth;
        const y = h - barH;

        ctx2d.fillRect(x + 1, y, Math.max(1, barWidth - 2), barH);
      }

      rafId = requestAnimationFrame(draw);
    };

    const tick = () => {
      if (!enabled) {
        const canvas = canvasRef.current;
        if (canvas) {
          const ctx2d = canvas.getContext("2d");
          if (ctx2d) ctx2d.clearRect(0, 0, canvas.width, canvas.height);
        }
        return;
      }

      resizeCanvas();
      rafId = requestAnimationFrame(draw);
    };

    tick();

    const onResize = () => enabled && resizeCanvas();
    window.addEventListener("resize", onResize);

    const videoPoll = setInterval(() => {
      if (enabled) ensureConnected();
    }, 1000);

    return () => {
      window.removeEventListener("resize", onResize);
      clearInterval(videoPoll);
      if (rafId) cancelAnimationFrame(rafId);

      if (videoEl) {
        videoEl.removeEventListener("play", handleVideoPlay);
      }
    };
  }, [enabled, fps, bars, height, analyser]);

  console.log("Rendering AudioVisualizer, enabled=", enabled);

  return (
    <div className="mini-player-visualizer" style={{ height }}>
      <canvas ref={canvasRef} className="mini-player-visualizer-canvas" />
    </div>
  );
}
