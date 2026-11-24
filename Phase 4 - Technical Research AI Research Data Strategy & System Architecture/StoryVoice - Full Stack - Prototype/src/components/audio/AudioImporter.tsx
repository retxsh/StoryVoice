"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface AudioImporterProps {
  projectId: string;
  onUploaded?: (assetId: string, jobId: string) => void;
}

export function AudioImporter({ projectId, onUploaded }: AudioImporterProps) {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (!selected) return;

    if (!selected.type.startsWith("audio/") && !selected.name.match(/\.(mp3|wav|m4a|aac|ogg|webm)$/i)) {
      setError("Please select a valid audio file (e.g. MP3, M4A, WAV, WebM).");
      setFile(null);
      return;
    }

    if (selected.size > 250 * 1024 * 1024) {
      setError("Audio file exceeds the 250 MB limit.");
      setFile(null);
      return;
    }

    setFile(selected);
    setError(null);
  };

  const handleUpload = async () => {
    if (!file) {
      setError("Select an audio file first.");
      return;
    }

    setUploading(true);
    setError(null);

    try {
      const title = file.name.replace(/\.[^/.]+$/, "");

      // 1. Request upload
      const reqRes = await fetch("/api/audio/request-upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId,
          title,
          mimeType: file.type || "audio/mpeg",
          fileSizeBytes: file.size,
          sourceType: "file_upload",
        }),
      });

      const reqData = await reqRes.json();
      if (!reqRes.ok) throw new Error(reqData.error || "Failed initiating file upload");

      const { audioAssetId, signedUploadUrl } = reqData;

      // 2. Direct upload if signed URL available
      if (signedUploadUrl) {
        const uploadRes = await fetch(signedUploadUrl, {
          method: "PUT",
          headers: { "Content-Type": file.type },
          body: file,
        });
        if (!uploadRes.ok) throw new Error("Failed transferring audio file to storage");
      }

      // 3. Confirm upload
      const confirmRes = await fetch("/api/audio/confirm-upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ audioAssetId }),
      });

      const confirmData = await confirmRes.json();
      if (!confirmRes.ok) throw new Error(confirmData.error || "Failed verifying audio storage");

      if (onUploaded) {
        onUploaded(audioAssetId, confirmData.jobId);
      } else {
        router.push(`/projects/${projectId}/transcript/${audioAssetId}`);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Audio import failed";
      setError(msg);
      setUploading(false);
    }
  };

  return (
    <div className="panel" style={{ maxWidth: "720px", margin: "0 auto", padding: "28px" }}>
      {error && <div className="notice error" style={{ marginBottom: "18px" }}>{error}</div>}

      <label
        htmlFor="audioFileInput"
        className="dropzone"
        style={{
          display: "block",
          cursor: "pointer",
          border: "1.5px dashed #bfcbd2",
          borderRadius: "12px",
          background: "#fbfcfc",
          padding: "42px 24px",
          textAlign: "center",
          transition: "all 0.15s ease",
        }}
      >
        <div style={{ fontSize: "32px", color: "var(--blue)" }}>↥</div>
        <h3 style={{ margin: "12px 0 6px", fontSize: "16px" }}>Choose an audio recording</h3>
        <p className="tiny muted" style={{ fontSize: "12px", maxWidth: "440px", margin: "0 auto" }}>
          Select a recording from your computer or dictation device (MP3, WAV, M4A, WebM up to 250MB).
        </p>
        <span className="btn secondary small" style={{ marginTop: "14px" }}>
          Browse files
        </span>
        <input
          id="audioFileInput"
          type="file"
          accept="audio/*"
          style={{ display: "none" }}
          onChange={handleFileChange}
        />
      </label>

      {file && (
        <div style={{ marginTop: "20px" }}>
          <div className="list-item" style={{ background: "#f8fafd", padding: "14px 16px", borderRadius: "8px", border: "1px solid #e1e9ef" }}>
            <div>
              <strong style={{ fontSize: "13px" }}>{file.name}</strong>
              <small>
                {(file.size / 1024 / 1024).toFixed(2)} MB · {file.type || "Audio"}
              </small>
            </div>
            <button
              type="button"
              className="btn small danger"
              onClick={() => setFile(null)}
              disabled={uploading}
            >
              Remove
            </button>
          </div>
        </div>
      )}

      <div className="action-row" style={{ justifyContent: "flex-end", marginTop: "24px" }}>
        <button
          type="button"
          className="btn primary"
          onClick={handleUpload}
          disabled={!file || uploading}
          style={{ minWidth: "180px" }}
        >
          {uploading ? "Uploading & Enqueuing…" : "Import & Transcribe →"}
        </button>
      </div>
    </div>
  );
}
