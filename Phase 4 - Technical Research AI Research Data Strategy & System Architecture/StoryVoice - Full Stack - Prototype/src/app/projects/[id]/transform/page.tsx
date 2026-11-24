"use client";

import { useState, useEffect, use } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { StageNav } from "@/components/navigation/StageNav";

export default function TransformPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: projectId } = use(params);
  const router = useRouter();
  const searchParams = useSearchParams();

  const transcriptId = searchParams.get("transcriptId") || "demo-transcript";
  const revisionId = searchParams.get("revisionId") || "demo-revision";
  const afterSceneId = searchParams.get("afterSceneId") || "";

  const [selectedMode, setSelectedMode] = useState<"faithful" | "clean" | "readable">("clean");
  const [useContext, setUseContext] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sourcePreview, setSourcePreview] = useState<string>("");
  const [showSource, setShowSource] = useState(false);

  useEffect(() => {
    async function fetchTranscript() {
      try {
        const res = await fetch(`/api/transcripts/${transcriptId}`);
        if (res.ok) {
          const data = await res.json();
          if (data.currentRevision?.text) {
            setSourcePreview(data.currentRevision.text);
          }
        }
      } catch {
        // Fallback sample preview
        setSourcePreview(
          "I went back to the lighthouse that night. Um, the road was almost gone and the wind was making it difficult to hear anything."
        );
      }
    }
    fetchTranscript();
  }, [transcriptId]);

  const MODES = [
    {
      id: "faithful" as const,
      name: "Faithful Transcript",
      tag: "Minimal change",
      tagBg: "#f1f0eb",
      tagColor: "#575e67",
      icon: "❝",
      desc: "Punctuation and minimal formatting only. Exact spoken diction is preserved.",
      bullets: ["No sentence rewriting", "No added story details", "Keep original authorial wording"],
    },
    {
      id: "clean" as const,
      name: "Clean Transcript",
      tag: "Light cleanup · Recommended",
      tagBg: "#e8eff4",
      tagColor: "var(--blue)",
      icon: "✦",
      desc: "Remove obvious verbal disfluencies while retaining natural spoken narrative structure.",
      bullets: ["Remove obvious verbal fillers", "Preserve meaningful repetition", "Keep dialogue and scene fragments"],
    },
    {
      id: "readable" as const,
      name: "Readable Draft",
      tag: "Prose shaping",
      tagBg: "#f3e8fd",
      tagColor: "#6a1b9a",
      icon: "📖",
      desc: "Shape rough spoken language into fluent literary prose without altering intended sequence.",
      bullets: ["Preserve intended sequence and tone", "No invented actions or motivations", "No hallucinated plot facts"],
    },
  ];

  const handlePrepareDraft = async () => {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/transformation/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId,
          transcriptId,
          sourceRevisionId: revisionId,
          mode: selectedMode,
          useContext,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed starting draft transformation");

      const targetDraftId = data.draftId || data.jobId;
      const querySuffix = afterSceneId ? `&afterSceneId=${afterSceneId}` : "";
      router.push(`/projects/${projectId}/review/${targetDraftId}?mode=${selectedMode}${querySuffix}`);
    } catch {
      // In local dev fallback, navigate to review directly with sample draft
      const querySuffix = afterSceneId ? `&afterSceneId=${afterSceneId}` : "";
      router.push(`/projects/${projectId}/review/demo-draft?mode=${selectedMode}${querySuffix}`);
    }
  };

  const selectedModeObj = MODES.find((m) => m.id === selectedMode) || MODES[1];
  const backUrl = `/projects/${projectId}/transcript/${transcriptId}`;

  return (
    <div>
      <StageNav
        currentStep={3}
        backHref={backUrl}
        backLabel="Back to transcript"
        projectId={projectId}
        crumbCurrent="Transformation"
      />

      <div className="page-head">
        <div>
          <div className="eyebrow">STAGE 3 · VOICE TRANSFORMATION</div>
          <h1>Choose how much to shape the text</h1>
          <p className="sub">
            Each mode creates an isolated candidate draft. Your original recording and transcript remain permanently intact.
          </p>
        </div>
      </div>

      {error && <div className="notice error" style={{ marginBottom: "18px" }}>{error}</div>}

      {/* Source Transcript Preview Drawer (Law 12 - Recognition Over Recall & Law 8 - Progressive Disclosure) */}
      {sourcePreview && (
        <div
          style={{
            background: "#FAF9F6",
            border: "1px solid var(--line)",
            borderRadius: "10px",
            padding: "14px 18px",
            marginBottom: "20px",
          }}
        >
          <div className="row between" style={{ alignItems: "center" }}>
            <div className="row" style={{ gap: "8px", alignItems: "center" }}>
              <span className="tiny" style={{ fontWeight: 600, color: "var(--ink)", textTransform: "uppercase", letterSpacing: "0.08em" }}>
                Source spoken passage
              </span>
              <span className="tag" style={{ fontSize: "10px", padding: "1px 6px" }}>
                {sourcePreview.split(/\s+/).filter(Boolean).length} words
              </span>
            </div>
            <button
              type="button"
              className="btn quiet small"
              onClick={() => setShowSource(!showSource)}
              style={{ fontSize: "12px", padding: "4px 8px" }}
            >
              {showSource ? "Hide passage ▲" : "Inspect source passage ▼"}
            </button>
          </div>
          {showSource && (
            <div
              style={{
                font: "14px/1.8 var(--serif)",
                color: "#373e46",
                background: "#ffffff",
                padding: "14px",
                borderRadius: "6px",
                border: "1px solid #ebe8e0",
                marginTop: "10px",
                whiteSpace: "pre-wrap",
                maxHeight: "160px",
                overflowY: "auto",
              }}
            >
              &ldquo;{sourcePreview}&rdquo;
            </div>
          )}
        </div>
      )}

      <div className="notice" style={{ marginBottom: "20px" }}>
        You are preparing a separate draft. Choose one transformation mode to generate candidate text. The writer remains the authority over all accepted content.
      </div>

      {/* 3 Distinct Voice Cards (Law 1, 6, 11, 19) */}
      <div className="three" style={{ gap: "16px" }}>
        {MODES.map((m) => {
          const isSelected = selectedMode === m.id;
          return (
            <div
              key={m.id}
              className={`panel ${isSelected ? "selected" : ""}`}
              style={{
                border: isSelected ? "2px solid var(--blue)" : "1px solid var(--line)",
                background: isSelected ? "linear-gradient(180deg, #f7fafc 0%, #ffffff 100%)" : "white",
                cursor: "pointer",
                padding: "24px 20px",
                borderRadius: "var(--radius)",
                boxShadow: isSelected ? "var(--shadow-card)" : "none",
                transition: "all 0.18s var(--ease-spring)",
                display: "flex",
                flexDirection: "column",
              }}
              onClick={() => setSelectedMode(m.id)}
            >
              <div className="row between" style={{ marginBottom: "14px", alignItems: "center" }}>
                <div className="row" style={{ gap: "8px", alignItems: "center" }}>
                  <span
                    style={{
                      width: "20px",
                      height: "20px",
                      borderRadius: "50%",
                      border: isSelected ? "6px solid var(--blue)" : "1.5px solid var(--slate)",
                      display: "inline-block",
                      background: "white",
                      boxShadow: isSelected ? "0 0 0 2px rgba(69, 107, 138, 0.2)" : "none",
                    }}
                  />
                  <span style={{ fontSize: "16px", color: isSelected ? "var(--blue)" : "var(--slate)" }}>
                    {m.icon}
                  </span>
                </div>
                <span
                  className="tag"
                  style={{
                    background: m.tagBg,
                    color: m.tagColor,
                    fontSize: "10px",
                    fontWeight: 600,
                  }}
                >
                  {m.tag}
                </span>
              </div>

              <h3 style={{ margin: "2px 0 8px", fontSize: "16px", color: isSelected ? "var(--blue)" : "var(--ink)" }}>
                {m.name}
              </h3>

              <p className="tiny muted" style={{ margin: "0 0 16px", lineHeight: "1.6", fontSize: "12px", flex: 1 }}>
                {m.desc}
              </p>

              <div style={{ paddingTop: "12px", borderTop: "1px solid #f0ede6" }}>
                <ul style={{ paddingLeft: "18px", margin: 0, color: "#515b66", fontSize: "11px", lineHeight: "1.7" }}>
                  {m.bullets.map((b, i) => (
                    <li key={i}>{b}</li>
                  ))}
                </ul>
              </div>
            </div>
          );
        })}
      </div>

      {/* Project Context Reference Shelf (Law 8 - Progressive Disclosure) */}
      <div className="panel" style={{ marginTop: "22px", padding: "22px" }}>
        <div className="panel-head">
          <h3 style={{ fontSize: "14px" }}>Project context reference</h3>
          <span className="tag approved">Writer-approved items only</span>
        </div>
        <label style={{ display: "flex", gap: "10px", alignItems: "flex-start", fontSize: "13px", cursor: "pointer" }}>
          <input
            type="checkbox"
            checked={useContext}
            onChange={(e) => setUseContext(e.target.checked)}
            style={{ accentColor: "var(--blue)", marginTop: "2px", width: "16px", height: "16px" }}
          />
          <span>Use approved project vocabulary and story facts as reference during transformation.</span>
        </label>
        <p className="tiny muted" style={{ margin: "8px 0 0 26px", fontSize: "12px" }}>
          Context informs the candidate draft; it does not override your spoken events or create new facts without your explicit review.
        </p>
      </div>

      {/* Action Footer (Law 3 - Von Restorff & Law 7 - Serial Position) */}
      <div className="footer-actions">
        <Link href={backUrl} className="btn secondary">
          ← Back to source transcript
        </Link>
        <button
          type="button"
          className="btn primary"
          onClick={handlePrepareDraft}
          disabled={loading}
          style={{ minWidth: "200px" }}
        >
          {loading ? "Preparing candidate draft…" : `Shape with ${selectedModeObj.name} →`}
        </button>
      </div>
    </div>
  );
}
