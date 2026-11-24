"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { CustomAudioPlayer } from "./CustomAudioPlayer";

interface AudioRecorderProps {
  projectId: string;
  initialTitle?: string;
  afterSceneId?: string;
  fallbackSpokenText?: string;
  sequenceOrder?: number;
  previousSceneTitle?: string;
  onUploaded?: (assetId: string, jobId: string) => void;
}

export function AudioRecorder({
  projectId,
  initialTitle,
  afterSceneId,
  fallbackSpokenText,
  sequenceOrder,
  previousSceneTitle,
  onUploaded,
}: AudioRecorderProps) {
  const router = useRouter();
  const [title, setTitle] = useState(initialTitle || "The Lighthouse at Midnight — first pass");

  useEffect(() => {
    if (initialTitle) {
      setTitle(initialTitle);
    }
  }, [initialTitle]);
  const [status, setStatus] = useState<"ready" | "recording" | "paused" | "saving" | "saved" | "failed">("ready");
  const [seconds, setSeconds] = useState(0);
  const [recordedDuration, setRecordedDuration] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [uploading, setUploading] = useState(false);

  // Real-time speech recognition state
  const [liveTranscript, setLiveTranscript] = useState("");
  const spokenTranscriptRef = useRef("");
  const recognitionRef = useRef<any>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  const stopTimer = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  };

  const getSupportedMimeType = (): string => {
    const types = [
      "audio/webm;codecs=opus",
      "audio/webm",
      "audio/mp4",
      "audio/wav",
      "audio/ogg",
    ];
    for (const t of types) {
      if (typeof MediaRecorder !== "undefined" && MediaRecorder.isTypeSupported(t)) {
        return t;
      }
    }
    return "audio/webm";
  };

  const drawWaveform = useCallback(() => {
    if (!analyserRef.current || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const bufferLength = analyserRef.current.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    analyserRef.current.getByteFrequencyData(dataArray);

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const barWidth = (canvas.width / 35) - 2;
    let x = 0;

    for (let i = 0; i < 35; i++) {
      const value = dataArray[i * 2] || 0;
      const percent = value / 255;
      const height = Math.max(4, percent * canvas.height * 0.9);
      const y = (canvas.height - height) / 2;

      ctx.fillStyle = status === "recording" ? "#456B8A" : "#9bb0bf";
      ctx.beginPath();
      ctx.roundRect(x, y, barWidth, height, 3);
      ctx.fill();

      x += barWidth + 2;
    }

    if (status === "recording") {
      animationFrameRef.current = requestAnimationFrame(drawWaveform);
    }
  }, [status]);

  useEffect(() => {
    if (status === "recording") {
      animationFrameRef.current = requestAnimationFrame(drawWaveform);
    } else if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }
    return () => {
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    };
  }, [status, drawWaveform]);

  // Clean up speech recognition and media recorder on unmount
  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch {}
      }
      stopTimer();
      if (audioUrl) URL.revokeObjectURL(audioUrl);
    };
  }, [audioUrl]);

  const startRecording = async () => {
    try {
      setError(null);
      audioChunksRef.current = [];
      spokenTranscriptRef.current = "";
      setLiveTranscript("");
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

      // Audio analyser setup
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const source = audioCtx.createMediaStreamSource(stream);
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 128;
      source.connect(analyser);

      audioContextRef.current = audioCtx;
      analyserRef.current = analyser;

      const mimeType = getSupportedMimeType();
      const recorder = new MediaRecorder(stream, { mimeType });

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };

      recorder.onstop = () => {
        const blob = new Blob(audioChunksRef.current, { type: mimeType });
        setAudioBlob(blob);
        const url = URL.createObjectURL(blob);
        setAudioUrl(url);
        stream.getTracks().forEach((track) => track.stop());
        if (audioContextRef.current) audioContextRef.current.close();
      };

      // Real Speech Recognition initialization
      const SpeechRecognition =
        typeof window !== "undefined"
          ? (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
          : null;

      if (SpeechRecognition) {
        try {
          const recognition = new SpeechRecognition();
          recognition.continuous = true;
          recognition.interimResults = true;
          recognition.lang = "en-US";

          recognition.onresult = (event: any) => {
            let finalTranscript = "";
            let interimTranscript = "";

            for (let i = 0; i < event.results.length; ++i) {
              if (event.results[i].isFinal) {
                finalTranscript += event.results[i][0].transcript + " ";
              } else {
                interimTranscript += event.results[i][0].transcript;
              }
            }

            const current = (finalTranscript + interimTranscript).trim();
            spokenTranscriptRef.current = current;
            setLiveTranscript(current);
          };

          recognition.onerror = () => {
            // Non-fatal: audio blob is still recorded
          };

          recognition.start();
          recognitionRef.current = recognition;
        } catch {
          // SpeechRecognition could not be started; audio recording still proceeds
        }
      }

      recorder.start(250); // Collect chunks every 250ms
      mediaRecorderRef.current = recorder;
      setStatus("recording");

      setSeconds(0);
      timerRef.current = setInterval(() => {
        setSeconds((prev) => prev + 1);
      }, 1000);
    } catch (err: unknown) {
      setStatus("failed");
      const message = err instanceof Error ? err.message : "Microphone access denied or not available.";
      setError(`Microphone error: ${message}`);
    }
  };

  const pauseRecording = () => {
    if (mediaRecorderRef.current && status === "recording") {
      mediaRecorderRef.current.pause();
      stopTimer();
      setStatus("paused");
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch {}
      }
    }
  };

  const resumeRecording = () => {
    if (mediaRecorderRef.current && status === "paused") {
      mediaRecorderRef.current.resume();
      timerRef.current = setInterval(() => {
        setSeconds((prev) => prev + 1);
      }, 1000);
      setStatus("recording");
      if (recognitionRef.current) {
        try {
          recognitionRef.current.start();
        } catch {}
      }
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current) {
      setStatus("saving");
      stopTimer();
      const finalSecs = Math.max(seconds, 1);
      setRecordedDuration(finalSecs);
      mediaRecorderRef.current.stop();

      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch {}
      }

      setTimeout(() => setStatus("saved"), 300);
    }
  };

  const discardRecording = () => {
    stopTimer();
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
    }
    if (recognitionRef.current) {
      try {
        recognitionRef.current.abort();
      } catch {}
    }
    if (audioUrl) URL.revokeObjectURL(audioUrl);
    setAudioUrl(null);
    setAudioBlob(null);
    setSeconds(0);
    setRecordedDuration(0);
    setLiveTranscript("");
    spokenTranscriptRef.current = "";
    setStatus("ready");
  };

  const handleUploadAndTranscribe = async () => {
    if (!audioBlob) {
      setError("No recording available to upload.");
      return;
    }

    setUploading(true);
    setError(null);

    try {
      // 1. Request upload permission
      const reqRes = await fetch("/api/audio/request-upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId,
          title: title.trim() || "Untitled Recording",
          mimeType: audioBlob.type || "audio/webm",
          fileSizeBytes: audioBlob.size,
          sourceType: "browser_recording",
          afterSceneId: afterSceneId || null,
        }),
      });

      const reqData = await reqRes.json();
      if (!reqRes.ok) throw new Error(reqData.error || "Failed to initiate audio upload");

      const { audioAssetId, signedUploadUrl } = reqData;

      // 2. Direct upload to storage bucket if signed URL available
      if (signedUploadUrl) {
        const uploadRes = await fetch(signedUploadUrl, {
          method: "PUT",
          headers: { "Content-Type": audioBlob.type },
          body: audioBlob,
        });
        if (!uploadRes.ok) throw new Error("Failed streaming audio to storage bucket");
      }

      // 3. Confirm upload on server with real speech transcript
      const effectiveClientTranscript =
        liveTranscript.trim() || spokenTranscriptRef.current.trim() || fallbackSpokenText || "";

      const confirmRes = await fetch("/api/audio/confirm-upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          audioAssetId,
          clientTranscript: effectiveClientTranscript,
          durationSeconds: recordedDuration || seconds,
          afterSceneId: afterSceneId || null,
        }),
      });

      const confirmData = await confirmRes.json();
      if (!confirmRes.ok) throw new Error(confirmData.error || "Failed verifying uploaded audio asset");

      const targetId = confirmData.transcriptId || audioAssetId;
      if (onUploaded) {
        onUploaded(audioAssetId, confirmData.jobId);
      } else {
        const query = afterSceneId ? `?afterSceneId=${afterSceneId}` : "";
        router.push(`/projects/${projectId}/transcript/${targetId}${query}`);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Audio upload failed";
      setError(msg);
      setUploading(false);
    }
  };

  const formatTime = (s: number) => {
    const mins = Math.floor(s / 60);
    const secs = s % 60;
    return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
  };

  return (
    <div className="panel" style={{ maxWidth: "720px", margin: "0 auto", padding: "28px" }}>
      <div className="row between" style={{ flexWrap: "wrap", gap: "16px", paddingBottom: "16px", borderBottom: "1px solid var(--line)" }}>
        <div>
          <span className="eyebrow" style={{ margin: 0 }}>LIVE AUDIO CAPTURE</span>
          <div style={{ fontSize: "14px", fontWeight: 600, marginTop: "4px" }}>
            Browser MediaRecorder & Speech-to-Text
          </div>
          {previousSceneTitle && (
            <span className="tag" style={{ marginTop: "6px", display: "inline-block" }}>
              Following: {previousSceneTitle} · Sequence #{sequenceOrder}
            </span>
          )}
        </div>
        <div className="field" style={{ margin: 0, minWidth: "260px", flex: "1 1 auto" }}>
          <label htmlFor="recordingTitle">Recording title</label>
          <input
            id="recordingTitle"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            disabled={status === "recording"}
            placeholder="Title this recording pass…"
          />
        </div>
      </div>

      {error && (
        <div className="notice error" style={{ marginTop: "18px" }}>
          {error}
        </div>
      )}

      <div style={{ textAlign: "center", padding: "32px 0 16px" }}>
        <div
          className={`record-circle ${status === "recording" ? "live" : ""}`}
          style={{
            width: "98px",
            height: "98px",
            borderRadius: "50%",
            border: "1.5px solid #d8e2e8",
            background: status === "recording" ? "#fbefee" : "#f0f5f8",
            color: status === "recording" ? "var(--error)" : "var(--blue)",
            fontSize: "28px",
            display: "grid",
            placeItems: "center",
            margin: "0 auto 18px",
            transition: "all 0.2s ease",
          }}
        >
          {status === "recording" ? "●" : "◉"}
        </div>

        <div style={{ font: "500 38px/1 var(--sans)", fontVariantNumeric: "tabular-nums", letterSpacing: "-0.03em" }}>
          {formatTime(seconds)}
        </div>

        <p className="tiny muted" style={{ marginTop: "8px", fontSize: "12px" }}>
          {status === "ready" && "Ready to record with your microphone"}
          {status === "recording" && "Recording in progress · Speak naturally"}
          {status === "paused" && "Recording paused"}
          {status === "saving" && "Finishing audio stream…"}
          {status === "saved" && "Audio captured and ready to upload"}
          {status === "failed" && "Recording could not be started"}
        </p>

        <div style={{ height: "46px", display: "flex", justifyContent: "center", margin: "16px 0" }}>
          <canvas ref={canvasRef} width={280} height={46} style={{ display: "block" }} />
        </div>

        {/* Live speech feedback during recording */}
        {status === "recording" && liveTranscript && (
          <div
            style={{
              margin: "12px auto",
              padding: "10px 16px",
              background: "#edf4f8",
              borderRadius: "8px",
              maxWidth: "520px",
              fontSize: "13px",
              color: "#284457",
              fontStyle: "italic",
              lineHeight: "1.5",
              textAlign: "left",
            }}
          >
            <span style={{ fontWeight: 600, fontStyle: "normal" }}>🎙️ Live speech: </span>
            &ldquo;{liveTranscript}&rdquo;
          </div>
        )}

        {/* Custom Audio Player with synchronized seeker bar */}
        {audioUrl && (
          <CustomAudioPlayer
            src={audioUrl}
            durationSeconds={recordedDuration || seconds || 1}
          />
        )}

        {/* Recognized Speech Text Preview after stopping */}
        {status === "saved" && (
          <div
            style={{
              margin: "16px auto",
              padding: "14px 18px",
              background: "#ffffff",
              border: "1px solid #dbe2e8",
              borderRadius: "10px",
              maxWidth: "540px",
              textAlign: "left",
            }}
          >
            <div className="row between" style={{ marginBottom: "6px" }}>
              <span className="eyebrow" style={{ margin: 0, color: "var(--blue)" }}>
                RECOGNIZED SPEECH TRANSCRIPT
              </span>
              <span className="tag" style={{ background: "#eef3f6", color: "#36576f" }}>
                {liveTranscript ? "Live captured" : "Awaiting STT"}
              </span>
            </div>
            <textarea
              className="field"
              style={{
                width: "100%",
                minHeight: "72px",
                fontSize: "13px",
                fontFamily: "var(--serif)",
                lineHeight: "1.7",
                padding: "8px 10px",
                borderRadius: "6px",
                border: "1px solid #d4dbe0",
                background: "#fafbfb",
                resize: "vertical",
              }}
              value={liveTranscript}
              onChange={(e) => setLiveTranscript(e.target.value)}
              placeholder="Your recognized spoken speech will appear here. You can also type or tweak your thoughts before saving..."
            />
          </div>
        )}

        <div
          className="action-row"
          style={{
            justifyContent: "center",
            marginTop: "22px",
            gap: "14px",
            flexWrap: "wrap",
          }}
        >
          {status === "ready" && (
            <button type="button" className="btn primary" onClick={startRecording} style={{ minWidth: "160px" }}>
              Start recording
            </button>
          )}

          {status === "recording" && (
            <>
              <button type="button" className="btn secondary" onClick={pauseRecording}>
                Pause
              </button>
              <button type="button" className="btn primary" onClick={stopRecording}>
                Stop recording
              </button>
            </>
          )}

          {status === "paused" && (
            <>
              <button type="button" className="btn primary" onClick={resumeRecording}>
                Resume
              </button>
              <button type="button" className="btn secondary" onClick={stopRecording}>
                Stop
              </button>
            </>
          )}

          {status === "saved" && (
            <div style={{ display: "flex", gap: "12px", flexWrap: "wrap", justifyContent: "center" }}>
              <button
                type="button"
                className="btn secondary"
                onClick={discardRecording}
                disabled={uploading}
              >
                Record again
              </button>
              <button
                type="button"
                className="btn primary"
                onClick={handleUploadAndTranscribe}
                disabled={uploading}
                style={{ minWidth: "180px" }}
              >
                {uploading ? "Uploading & Enqueuing…" : "Save & Transcribe →"}
              </button>
            </div>
          )}

          {status === "failed" && (
            <button type="button" className="btn primary" onClick={startRecording}>
              Try again
            </button>
          )}
        </div>
      </div>

      <div className="notice" style={{ marginTop: "24px" }}>
        Your spoken audio is captured locally using your browser&apos;s MediaRecorder, preserved in private storage, and processed with faithful speech-to-text.
      </div>
    </div>
  );
}
