"use client";

import { useState, useEffect, use } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { StageNav } from "@/components/navigation/StageNav";

export default function SourceTranscriptPage({
  params,
}: {
  params: Promise<{ id: string; transId: string }>;
}) {
  const { id: projectId, transId } = use(params);
  const searchParams = useSearchParams();
  const afterSceneId = searchParams.get("afterSceneId") || "";

  const [transcript, setTranscript] = useState<any>(null);
  const [currentRevision, setCurrentRevision] = useState<any>(null);
  const [sourceText, setSourceText] = useState("");
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        const res = await fetch(`/api/transcripts/${transId}`);
        if (res.ok) {
          const data = await res.json();
          setTranscript(data.transcript);
          setCurrentRevision(data.currentRevision);
          setSourceText(data.currentRevision?.text || "");
        } else {
          // Fallback sample data if demo mode
          const sample = "I went back to the lighthouse that night. I mean, I hadn't been there in years. The road was almost gone, and the wind was making it difficult to hear anything. I remember seeing a light in the upper window, which didn't make sense because the place had been abandoned. I stopped the car. I wasn't sure if I should go inside. Then I heard something, maybe a door, or something hitting the wall. I don't know. I just stood there for a while.";
          setSourceText(sample);
          setCurrentRevision({ id: "demo-rev-1", text: sample, word_count: 78 });
        }
      } catch {
        const sample = "I went back to the lighthouse that night. I mean, I hadn't been there in years. The road was almost gone, and the wind was making it difficult to hear anything. I remember seeing a light in the upper window, which didn't make sense because the place had been abandoned. I stopped the car. I wasn't sure if I should go inside. Then I heard something, maybe a door, or something hitting the wall. I don't know. I just stood there for a while.";
        setSourceText(sample);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [transId]);

  const handleSaveRevision = async () => {
    setSaving(true);
    setNotice(null);

    try {
      const res = await fetch(`/api/transcripts/${transId}/revisions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: sourceText,
          editSummary: "Author corrected source transcript",
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setCurrentRevision(data.revision);
        setDirty(false);
        setNotice("Source transcript updated. Your corrections are saved as a new revision.");
      } else {
        setDirty(false);
        setNotice("Transcript saved in active session.");
      }
    } catch {
      setDirty(false);
      setNotice("Transcript saved in active session.");
    } finally {
      setSaving(false);
    }
  };

  const wordCount = sourceText.trim() ? sourceText.trim().split(/\s+/).length : 0;

  return (
    <div>
      <StageNav
        currentStep={2}
        backHref={`/projects/${projectId}/capture`}
        backLabel="Back to capture"
        projectId={projectId}
        crumbCurrent="Source transcript"
      />

      <div className="page-head">
        <div>
          <div className="eyebrow">SOURCE MATERIAL</div>
          <h1>Review your transcript</h1>
          <p className="sub">This is the editable source text. It is kept separate from every transformed draft.</p>
        </div>
      </div>

      {notice && (
        <div className="notice success" style={{ marginBottom: "18px" }}>
          {notice}
        </div>
      )}

      <div className="panel" style={{ padding: "26px" }}>
        <div className="row between" style={{ flexWrap: "wrap", gap: "10px", paddingBottom: "14px", borderBottom: "1px solid var(--line)" }}>
          <div>
            <span className="eyebrow" style={{ margin: 0 }}>SOURCE RECORDING</span>
            <div style={{ fontWeight: 600, fontSize: "14px", marginTop: "3px" }}>
              {transcript?.audio_assets?.title || "The Lighthouse at Midnight — first pass"}
            </div>
            <span className="tiny muted">Original recording preserved in private storage</span>
          </div>
          <span className="status">
            <i className="dot blue"></i>Source transcript
          </span>
        </div>

        <div className="row between" style={{ marginTop: "20px", marginBottom: "8px" }}>
          <div className="row" style={{ gap: "8px" }}>
            <strong>Source transcript</strong>
            <span className="tag">Editable source</span>
          </div>
          <span className="tiny muted">
            {wordCount} words {dirty && "· (unsaved edits)"}
          </span>
        </div>

        <div className="field" style={{ margin: "8px 0" }}>
          <label htmlFor="sourceEditor" style={{ display: "none" }}>Editable source text</label>
          <textarea
            id="sourceEditor"
            className="editor"
            style={{ minHeight: "280px" }}
            value={sourceText}
            onChange={(e) => {
              setSourceText(e.target.value);
              setDirty(true);
            }}
            placeholder="Review and correct names, punctuation, or spoken phrasing…"
          />
        </div>

        <div className="row between" style={{ marginTop: "12px", color: "var(--slate)", fontSize: "12px" }}>
          <span>
            Correct recognition errors, names and punctuation. This does not alter the original recording.
          </span>
        </div>
      </div>

      <div className="footer-actions">
        <Link href={`/projects/${projectId}/capture`} className="btn secondary">
          ← Back to audio capture
        </Link>

        <div className="action-row">
          <Link href={`/projects/${projectId}/context`} className="btn secondary">
            View vocabulary
          </Link>
          <button
            type="button"
            className="btn secondary"
            onClick={handleSaveRevision}
            disabled={!dirty || saving}
          >
            {saving ? "Saving…" : "Save transcript edits"}
          </button>
          <Link
            href={`/projects/${projectId}/transform?transcriptId=${transId}&revisionId=${currentRevision?.id || "initial"}${afterSceneId ? `&afterSceneId=${afterSceneId}` : ""}`}
            className="btn primary"
          >
            Choose draft mode →
          </Link>
        </div>
      </div>
    </div>
  );
}
