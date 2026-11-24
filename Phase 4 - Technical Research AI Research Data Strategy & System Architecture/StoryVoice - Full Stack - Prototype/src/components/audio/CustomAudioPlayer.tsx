"use client";

import { useState, useRef, useEffect, useCallback } from "react";

interface CustomAudioPlayerProps {
  src: string;
  durationSeconds: number;
}

export function CustomAudioPlayer({ src, durationSeconds }: CustomAudioPlayerProps) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const progressBarRef = useRef<HTMLDivElement | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [isSeeking, setIsSeeking] = useState(false);

  // Guarantee valid non-zero duration
  const totalDuration = Math.max(durationSeconds || 1, 1);

  const formatTime = (timeInSeconds: number) => {
    const s = Math.floor(timeInSeconds);
    const mins = Math.floor(s / 60);
    const secs = s % 60;
    return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
  };

  const updateProgress = useCallback(() => {
    if (audioRef.current && !isSeeking) {
      const cur = audioRef.current.currentTime;
      setCurrentTime(cur);

      // WebM duration fallback: if audio reached or passed totalDuration
      if (cur >= totalDuration || audioRef.current.ended) {
        setIsPlaying(false);
        setCurrentTime(0);
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
        return;
      }
    }
    if (isPlaying) {
      animationFrameRef.current = requestAnimationFrame(updateProgress);
    }
  }, [isPlaying, isSeeking, totalDuration]);

  useEffect(() => {
    if (isPlaying) {
      animationFrameRef.current = requestAnimationFrame(updateProgress);
    } else if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }
    return () => {
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    };
  }, [isPlaying, updateProgress]);

  const togglePlay = () => {
    const audio = audioRef.current;
    if (!audio) return;

    if (isPlaying) {
      audio.pause();
      setIsPlaying(false);
    } else {
      // If at end, restart
      if (currentTime >= totalDuration - 0.2) {
        audio.currentTime = 0;
        setCurrentTime(0);
      }
      audio.play().then(() => {
        setIsPlaying(true);
      }).catch((e) => {
        console.error("Playback error", e);
        setIsPlaying(false);
      });
    }
  };

  const handleSeek = (clientX: number) => {
    if (!progressBarRef.current || !audioRef.current) return;
    const rect = progressBarRef.current.getBoundingClientRect();
    const pos = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    const targetTime = pos * totalDuration;

    setCurrentTime(targetTime);
    audioRef.current.currentTime = targetTime;
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsSeeking(true);
    handleSeek(e.clientX);

    const onMouseMove = (moveEvent: MouseEvent) => {
      handleSeek(moveEvent.clientX);
    };

    const onMouseUp = () => {
      setIsSeeking(false);
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
    };

    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    setIsSeeking(true);
    handleSeek(e.touches[0].clientX);

    const onTouchMove = (moveEvent: TouchEvent) => {
      handleSeek(moveEvent.touches[0].clientX);
    };

    const onTouchEnd = () => {
      setIsSeeking(false);
      window.removeEventListener("touchmove", onTouchMove);
      window.removeEventListener("touchend", onTouchEnd);
    };

    window.addEventListener("touchmove", onTouchMove);
    window.addEventListener("touchend", onTouchEnd);
  };

  const progressPercent = Math.min(100, Math.max(0, (currentTime / totalDuration) * 100));

  return (
    <div
      style={{
        background: "#f0f4f7",
        border: "1px solid #d5e0e7",
        borderRadius: "28px",
        padding: "8px 16px",
        display: "flex",
        alignItems: "center",
        gap: "12px",
        maxWidth: "460px",
        margin: "18px auto",
        boxShadow: "0 2px 8px rgba(32, 36, 43, 0.04)",
      }}
    >
      <audio
        ref={audioRef}
        src={src}
        preload="metadata"
        onEnded={() => {
          setIsPlaying(false);
          setCurrentTime(0);
          if (audioRef.current) audioRef.current.currentTime = 0;
        }}
        onPause={() => setIsPlaying(false)}
        onPlay={() => setIsPlaying(true)}
      />

      <button
        type="button"
        onClick={togglePlay}
        style={{
          width: "34px",
          height: "34px",
          borderRadius: "50%",
          background: "var(--blue)",
          color: "white",
          border: "none",
          display: "grid",
          placeItems: "center",
          fontSize: "13px",
          paddingLeft: isPlaying ? "0" : "2px",
          cursor: "pointer",
          flexShrink: 0,
          transition: "all 0.15s ease",
        }}
        aria-label={isPlaying ? "Pause audio playback" : "Play audio playback"}
      >
        {isPlaying ? "❚❚" : "▶"}
      </button>

      <span
        style={{
          font: "500 12px/1 var(--sans)",
          fontVariantNumeric: "tabular-nums",
          color: "#46535f",
          minWidth: "35px",
        }}
      >
        {formatTime(currentTime)}
      </span>

      <div
        ref={progressBarRef}
        onMouseDown={handleMouseDown}
        onTouchStart={handleTouchStart}
        style={{
          flex: 1,
          height: "24px",
          display: "flex",
          alignItems: "center",
          cursor: "pointer",
          position: "relative",
          userSelect: "none",
        }}
        role="slider"
        aria-valuemin={0}
        aria-valuemax={totalDuration}
        aria-valuenow={currentTime}
        aria-label="Audio scrubber"
      >
        {/* Track background */}
        <div
          style={{
            width: "100%",
            height: "6px",
            background: "#d6e0e6",
            borderRadius: "3px",
            position: "relative",
            overflow: "hidden",
          }}
        >
          {/* Progress fill */}
          <div
            style={{
              height: "100%",
              width: `${progressPercent}%`,
              background: "var(--blue)",
              borderRadius: "3px",
              transition: isSeeking ? "none" : "width 0.05s linear",
            }}
          />
        </div>

        {/* Scrubber thumb */}
        <div
          style={{
            position: "absolute",
            left: `calc(${progressPercent}% - 6px)`,
            width: "12px",
            height: "12px",
            borderRadius: "50%",
            background: "var(--blue)",
            boxShadow: "0 1px 3px rgba(0,0,0,0.25)",
            pointerEvents: "none",
            transition: isSeeking ? "none" : "left 0.05s linear",
          }}
        />
      </div>

      <span
        style={{
          font: "500 12px/1 var(--sans)",
          fontVariantNumeric: "tabular-nums",
          color: "#72808e",
          minWidth: "35px",
          textAlign: "right",
        }}
      >
        {formatTime(totalDuration)}
      </span>
    </div>
  );
}
