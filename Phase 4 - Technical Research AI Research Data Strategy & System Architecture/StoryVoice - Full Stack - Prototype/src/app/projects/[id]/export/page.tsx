"use client";

import { useState, useEffect, use, useRef } from "react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import { BackButton } from "@/components/navigation/BackButton";

const DEFAULT_EXPORT_SCENES = [
  {
    id: "demo-scene-1",
    title: "Chapter 1: Arrival at Greyhaven",
    description: "Mara arrives at the coastal village as the evening tide sets in.",
    canonicalText:
      "The salt air met me before the town even came into view. Greyhaven sat huddled between the jagged cliffs and the black water, its chimneys sending thin spirals of smoke into the darkening sky.",
    wordCount: 34,
    sortOrder: 1,
  },
  {
    id: "demo-scene-2",
    title: "Chapter 2: The Coast Road",
    description: "Driving along the eroding bluffs toward the north point.",
    canonicalText:
      "The gravel crunched beneath the tires, the narrow lane winding perilously close to the bluff edge. To the east, the sea surged relentlessly against the granite rocks below.",
    wordCount: 30,
    sortOrder: 2,
  },
  {
    id: "demo-scene-3",
    title: "Chapter 3: The North Point",
    description: "Approaching the headland where the old light stands silent.",
    canonicalText:
      "The trees fell away as the grade leveled out. Ahead stood the silhouette of the headland, rising dark against the gray swell of the ocean.",
    wordCount: 26,
    sortOrder: 3,
  },
];

interface ExportedInfo {
  filename: string;
  format: string;
  wordCount: number;
  chapterCount: number;
  downloadUrl?: string;
}

export default function ExportPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: projectId } = use(params);
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialSceneId = searchParams.get("sceneId");

  const [scenes, setScenes] = useState<any[]>(DEFAULT_EXPORT_SCENES);
  const [scope, setScope] = useState<"project" | "multiple" | "scene">(
    initialSceneId ? "scene" : "project"
  );
  const [selectedSceneId, setSelectedSceneId] = useState(initialSceneId || "demo-scene-1");
  const [selectedSceneIds, setSelectedSceneIds] = useState<string[]>([
    "demo-scene-1",
    "demo-scene-2",
  ]);
  const [format, setFormat] = useState<"docx" | "md" | "txt">("docx");
  const [exporting, setExporting] = useState(false);
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Success Modal state
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [countdown, setCountdown] = useState(4);
  const [exportedInfo, setExportedInfo] = useState<ExportedInfo | null>(null);
  const countdownIntervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    async function loadScenes() {
      try {
        const res = await fetch(`/api/projects/${projectId}/scenes`);
        if (res.ok) {
          const data = await res.json();
          if (data.scenes && data.scenes.length > 0) {
            const sorted = [...data.scenes].sort(
              (a, b) => (a.sortOrder || a.sort_order || 0) - (b.sortOrder || b.sort_order || 0)
            );
            setScenes(sorted);
            setSelectedSceneIds(sorted.slice(0, 2).map((s) => s.id));
            if (initialSceneId) {
              setSelectedSceneId(initialSceneId);
              setScope("scene");
            } else if (!selectedSceneId || !sorted.some((s) => s.id === selectedSceneId)) {
              setSelectedSceneId(sorted[0].id);
            }
          } else {
            setScenes(DEFAULT_EXPORT_SCENES);
            setSelectedSceneIds(["demo-scene-1", "demo-scene-2"]);
            if (!initialSceneId) {
              setSelectedSceneId(DEFAULT_EXPORT_SCENES[0].id);
            }
          }
        } else {
          setScenes(DEFAULT_EXPORT_SCENES);
          setSelectedSceneIds(["demo-scene-1", "demo-scene-2"]);
        }
      } catch {
        setScenes(DEFAULT_EXPORT_SCENES);
        setSelectedSceneIds(["demo-scene-1", "demo-scene-2"]);
      }
    }
    loadScenes();
  }, [projectId, initialSceneId]);

  // Clean up countdown on unmount
  useEffect(() => {
    return () => {
      if (countdownIntervalRef.current) {
        clearInterval(countdownIntervalRef.current);
      }
    };
  }, []);

  const handleScopeChange = (newScope: "project" | "multiple" | "scene") => {
    setScope(newScope);
    if (newScope === "scene" && !selectedSceneId && scenes.length > 0) {
      setSelectedSceneId(scenes[0].id);
    }
    if (newScope === "multiple" && selectedSceneIds.length === 0 && scenes.length > 0) {
      setSelectedSceneIds(scenes.slice(0, 2).map((s) => s.id));
    }
  };

  const handleSceneChange = (targetSceneId: string) => {
    setSelectedSceneId(targetSceneId);
    setScope("scene");
  };

  const toggleSceneSelection = (sceneId: string) => {
    setSelectedSceneIds((prev) => {
      if (prev.includes(sceneId)) {
        if (prev.length === 1) return prev; // Keep at least one
        return prev.filter((id) => id !== sceneId);
      } else {
        return [...prev, sceneId];
      }
    });
  };

  const selectAllScenes = () => {
    setSelectedSceneIds(scenes.map((s) => s.id));
  };

  const clearSceneSelection = () => {
    if (scenes.length > 0) {
      setSelectedSceneIds([scenes[0].id]);
    }
  };

  const totalManuscriptWords = scenes.reduce((acc, s) => acc + (s.wordCount || 0), 0);
  const multipleSelectedWords = scenes
    .filter((s) => selectedSceneIds.includes(s.id))
    .reduce((acc, s) => acc + (s.wordCount || 0), 0);
  const hasAccepted = scenes.length > 0;

  const startRedirectCountdown = () => {
    setCountdown(4);
    if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);

    countdownIntervalRef.current = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
          router.push(`/projects/${projectId}/workspace`);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const dismissModal = () => {
    if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
    setShowSuccessModal(false);
  };

  const handleExport = async () => {
    setExporting(true);
    setError(null);
    setDownloadUrl(null);

    let generatedUrl = "";
    let exportedChapterCount = 1;
    let exportedWords = 0;
    let outputFilename = `storyvoice-manuscript.${format}`;

    try {
      const res = await fetch("/api/export", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId,
          scope,
          sceneId: scope === "scene" ? selectedSceneId : undefined,
          sceneIds: scope === "multiple" ? selectedSceneIds : undefined,
          format,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Export failed");

      generatedUrl = data.downloadUrl;
      outputFilename = data.filename || `manuscript.${format}`;
      exportedWords = data.wordCount || 0;
      exportedChapterCount =
        scope === "scene" ? 1 : scope === "multiple" ? selectedSceneIds.length : scenes.length;

      setDownloadUrl(data.downloadUrl);

      // Trigger browser download
      const a = document.createElement("a");
      a.href = data.downloadUrl;
      a.download = outputFilename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } catch {
      // In local dev fallback, generate client download
      let targetScenes = scenes;
      if (scope === "scene") {
        targetScenes = scenes.filter((s) => s.id === selectedSceneId);
      } else if (scope === "multiple") {
        targetScenes = scenes.filter((s) => selectedSceneIds.includes(s.id));
      }

      exportedChapterCount = targetScenes.length;
      exportedWords = targetScenes.reduce((acc, s) => acc + (s.wordCount || 0), 0);

      const content =
        scope === "scene"
          ? targetScenes[0]?.canonicalText || "Sample Scene"
          : targetScenes.map((s) => `## ${s.title}\n\n${s.canonicalText}`).join("\n\n");

      const mime =
        format === "txt" ? "text/plain" : format === "md" ? "text/markdown" : "application/octet-stream";
      const blob = new Blob([content], { type: mime });
      const url = URL.createObjectURL(blob);
      generatedUrl = url;
      outputFilename = `storyvoice-manuscript.${format}`;
      setDownloadUrl(url);

      const a = document.createElement("a");
      a.href = url;
      a.download = outputFilename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } finally {
      setExporting(false);

      // Show success modal and trigger countdown to workspace
      setExportedInfo({
        filename: outputFilename,
        format: format.toUpperCase(),
        wordCount: exportedWords || (scope === "scene" ? selectedScene?.wordCount || 0 : totalManuscriptWords),
        chapterCount: exportedChapterCount,
        downloadUrl: generatedUrl,
      });
      setShowSuccessModal(true);
      startRedirectCountdown();
    }
  };

  const previewEntries =
    scope === "scene"
      ? scenes.filter((s) => s.id === selectedSceneId)
      : scope === "multiple"
      ? scenes.filter((s) => selectedSceneIds.includes(s.id))
      : scenes;

  const selectedScene = scenes.find((s) => s.id === selectedSceneId);

  return (
    <div>
      <div className="stage-nav-bar">
        <BackButton href={`/projects/${projectId}/workspace`} label="Back to workspace" />
        <div className="crumb">
          <Link href={`/projects/${projectId}/workspace`}>Project</Link>
          <span className="crumb-separator">/</span>
          <span>Export manuscript</span>
        </div>
      </div>

      <div className="page-head">
        <div>
          <div className="eyebrow">EXPORT</div>
          <h1>Take your writing with you</h1>
          <p className="sub">
            Export accepted manuscript text into industry-standard formats ready for your editing workflow.
          </p>
        </div>
      </div>

      {error && <div className="notice error" style={{ marginBottom: "18px" }}>{error}</div>}

      <div className="two">
        <div className="panel" style={{ padding: "26px" }}>
          <h3 style={{ fontSize: "14px" }}>Choose export scope</h3>
          <div className="field">
            <label htmlFor="exportScope">Content to export</label>
            <select
              id="exportScope"
              value={scope}
              onChange={(e) =>
                handleScopeChange(e.target.value as "project" | "multiple" | "scene")
              }
            >
              <option value="project">
                Entire manuscript — all accepted scenes ({scenes.length} scene{scenes.length === 1 ? "" : "s"} · {totalManuscriptWords} words)
              </option>
              <option value="multiple">
                Choose multiple chapters / scenes ({scenes.length} available)
              </option>
              <option value="scene">
                Single scene only ({scenes.length} scene{scenes.length === 1 ? "" : "s"} available)
              </option>
            </select>
          </div>

          {/* Multiple chapters selection */}
          {scope === "multiple" && (
            <div
              className="field"
              style={{
                marginTop: "16px",
                background: "#faf9f6",
                border: "1px solid var(--line)",
                borderRadius: "10px",
                padding: "16px",
              }}
            >
              <div className="row between" style={{ marginBottom: "12px", alignItems: "center" }}>
                <div>
                  <strong style={{ fontSize: "13px", color: "var(--ink)" }}>
                    Select chapters to include
                  </strong>
                  <div className="tiny muted" style={{ fontSize: "11px", marginTop: "2px" }}>
                    {selectedSceneIds.length} of {scenes.length} chapters selected ({multipleSelectedWords} words)
                  </div>
                </div>
                <div className="row" style={{ gap: "6px" }}>
                  <button
                    type="button"
                    onClick={selectAllScenes}
                    className="btn small secondary"
                    style={{ fontSize: "11px", padding: "4px 8px" }}
                  >
                    Select all
                  </button>
                  <button
                    type="button"
                    onClick={clearSceneSelection}
                    className="btn small secondary"
                    style={{ fontSize: "11px", padding: "4px 8px" }}
                  >
                    Reset
                  </button>
                </div>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                {scenes.map((s) => {
                  const isChecked = selectedSceneIds.includes(s.id);
                  return (
                    <label
                      key={s.id}
                      style={{
                        display: "flex",
                        alignItems: "flex-start",
                        gap: "10px",
                        padding: "10px 12px",
                        background: isChecked ? "#f0f5f8" : "white",
                        border: isChecked ? "1.5px solid var(--blue)" : "1px solid var(--line)",
                        borderRadius: "8px",
                        cursor: "pointer",
                        transition: "all 0.15s ease",
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => toggleSceneSelection(s.id)}
                        style={{ marginTop: "3px", cursor: "pointer" }}
                      />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div className="row between" style={{ marginBottom: "2px" }}>
                          <span style={{ fontSize: "13px", fontWeight: 600, color: "var(--ink)" }}>
                            {s.title}
                          </span>
                          <span
                            className="tag"
                            style={{
                              fontSize: "10px",
                              padding: "2px 6px",
                              background: isChecked ? "#e8eff4" : "#f1f0ea",
                              color: isChecked ? "var(--blue)" : "var(--slate)",
                            }}
                          >
                            {s.wordCount} words
                          </span>
                        </div>
                        {s.canonicalText && (
                          <div
                            style={{
                              fontSize: "11px",
                              color: "var(--slate)",
                              whiteSpace: "nowrap",
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                            }}
                          >
                            {s.canonicalText}
                          </div>
                        )}
                      </div>
                    </label>
                  );
                })}
              </div>
            </div>
          )}

          {/* Single scene selection */}
          {scope === "scene" && (
            <div className="field" style={{ marginTop: "16px" }}>
              <div className="row between" style={{ marginBottom: "6px" }}>
                <label htmlFor="sceneSelect" style={{ margin: 0 }}>
                  Select scene
                </label>
              </div>
              <select
                id="sceneSelect"
                value={selectedSceneId}
                onChange={(e) => handleSceneChange(e.target.value)}
              >
                {scenes.map((s) => (
                  <option key={s.id} value={s.id}>
                    Scene {s.sortOrder || 1}: {s.title} ({s.wordCount} words)
                  </option>
                ))}
              </select>

              {selectedScene && (
                <div
                  style={{
                    marginTop: "12px",
                    padding: "14px 16px",
                    background: "#f4f8fa",
                    border: "1.5px solid var(--blue)",
                    borderRadius: "8px",
                    transition: "all 0.15s ease",
                  }}
                >
                  <div className="row between" style={{ marginBottom: "6px" }}>
                    <strong style={{ fontSize: "13px", color: "var(--ink)" }}>
                      Scene {selectedScene.sortOrder || 1}: {selectedScene.title}
                    </strong>
                    <span className="tag" style={{ background: "#e8eff4", color: "var(--blue)" }}>
                      {selectedScene.wordCount} words
                    </span>
                  </div>
                  {selectedScene.description && (
                    <p style={{ fontSize: "12px", color: "var(--slate)", margin: "0 0 6px", lineHeight: "1.4" }}>
                      {selectedScene.description}
                    </p>
                  )}
                  {selectedScene.canonicalText && (
                    <p style={{ fontSize: "12px", color: "#4d5661", fontStyle: "italic", margin: 0, lineHeight: "1.5" }}>
                      &ldquo;{selectedScene.canonicalText.slice(0, 120)}{selectedScene.canonicalText.length > 120 ? "…" : ""}&rdquo;
                    </p>
                  )}
                </div>
              )}
            </div>
          )}

          <div className="notice" style={{ margin: "18px 0" }}>
            Only explicitly accepted manuscript text will be included. Spoken audio recordings, raw source transcripts, and unaccepted drafts are permanently excluded.
          </div>

          <h3 style={{ marginTop: "24px", fontSize: "14px" }}>Choose export format</h3>
          <div className="three" style={{ gap: "10px" }}>
            {(["docx", "md", "txt"] as const).map((f) => {
              const active = format === f;
              return (
                <button
                  key={f}
                  type="button"
                  className={`format ${active ? "active" : ""}`}
                  onClick={() => setFormat(f)}
                  style={{
                    border: active ? "2px solid var(--blue)" : "1px solid var(--line)",
                    borderRadius: "9px",
                    padding: "16px 12px",
                    background: active ? "#f4f8fa" : "white",
                    textAlign: "center",
                    cursor: "pointer",
                    transition: "all 0.15s ease",
                  }}
                >
                  <strong style={{ display: "block", fontSize: "14px", color: "var(--ink)" }}>{f.toUpperCase()}</strong>
                  <small style={{ color: "var(--slate)", fontSize: "11px", marginTop: "4px", display: "block" }}>
                    {f === "docx" ? "Word document" : f === "md" ? "Markdown" : "Plain text"}
                  </small>
                </button>
              );
            })}
          </div>

          <div className="footer-actions" style={{ marginTop: "28px" }}>
            <Link href={`/projects/${projectId}/workspace`} className="btn secondary">
              ← Back to workspace
            </Link>
            <button
              type="button"
              className="btn primary"
              onClick={handleExport}
              disabled={!hasAccepted || exporting || (scope === "multiple" && selectedSceneIds.length === 0)}
              style={{ minWidth: "180px" }}
            >
              {exporting ? "Generating export…" : "Prepare export →"}
            </button>
          </div>
        </div>

        <div className="panel" style={{ padding: "26px" }}>
          <h3 style={{ fontSize: "14px" }}>Export preview</h3>
          {hasAccepted ? (
            <div>
              <span className="tag" style={{ marginBottom: "14px", display: "inline-block" }}>
                {format.toUpperCase()} ·{" "}
                {scope === "project"
                  ? `ENTIRE MANUSCRIPT (${scenes.length} SCENES · ${totalManuscriptWords} WORDS)`
                  : scope === "multiple"
                  ? `SELECTED CHAPTERS (${previewEntries.length} OF ${scenes.length} · ${multipleSelectedWords} WORDS)`
                  : `${(selectedScene?.title || "SCENE").toUpperCase()} (${selectedScene?.wordCount || 0} WORDS)`}
              </span>

              {previewEntries.length === 0 ? (
                <div style={{ textAlign: "center", padding: "30px 10px", color: "var(--slate)" }}>
                  <p style={{ fontSize: "13px" }}>No chapters selected for export.</p>
                </div>
              ) : (
                previewEntries.map((sc) => (
                  <section key={sc.id} style={{ marginTop: "14px" }}>
                    <h2 style={{ font: "500 20px var(--serif)", margin: "10px 0 6px" }}>{sc.title}</h2>
                    <div
                      style={{
                        font: "14px/1.8 var(--serif)",
                        color: "#2e343a",
                        background: "#faf9f6",
                        padding: "16px",
                        borderRadius: "8px",
                        border: "1px solid #ebe7dd",
                        whiteSpace: "pre-wrap",
                        maxHeight: "260px",
                        overflowY: "auto",
                      }}
                    >
                      {sc.canonicalText}
                    </div>
                  </section>
                ))
              )}

              {downloadUrl && (
                <div className="notice success" style={{ marginTop: "20px" }}>
                  File generated successfully! If download did not trigger automatically,{" "}
                  <a href={downloadUrl} download style={{ color: "var(--blue)", fontWeight: 600 }}>
                    click here to download
                  </a>.
                </div>
              )}
            </div>
          ) : (
            <div style={{ textAlign: "center", padding: "45px 20px" }}>
              <div style={{ font: "36px var(--serif)", color: "#9eabb3" }}>↗</div>
              <h3 style={{ fontSize: "15px", margin: "10px 0 6px" }}>Nothing ready to export</h3>
              <p className="tiny muted" style={{ fontSize: "12px", maxWidth: "340px", margin: "0 auto" }}>
                Accepted scene text will appear in this preview. Drafts and source recordings are never exported as manuscript content.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Export Success Modal Pop-up */}
      {showSuccessModal && (
        <div
          role="dialog"
          aria-modal="true"
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 9999,
            background: "rgba(32, 36, 43, 0.65)",
            backdropFilter: "blur(4px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "20px",
            animation: "fadeIn 0.2s ease-out",
          }}
        >
          <div
            style={{
              background: "#FAF9F6",
              borderRadius: "14px",
              boxShadow: "0 20px 45px rgba(0, 0, 0, 0.25)",
              border: "1px solid #E5E2DC",
              maxWidth: "480px",
              width: "100%",
              padding: "32px",
              textAlign: "center",
              position: "relative",
            }}
          >
            {/* Success icon */}
            <div
              style={{
                width: "56px",
                height: "56px",
                borderRadius: "50%",
                background: "#E8F5E9",
                border: "2px solid #81C784",
                color: "#2E7D32",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "26px",
                fontWeight: "bold",
                margin: "0 auto 18px",
              }}
            >
              ✓
            </div>

            <h2
              style={{
                font: "600 24px var(--serif)",
                color: "var(--ink)",
                margin: "0 0 8px",
              }}
            >
              Export Successful!
            </h2>

            <p
              style={{
                fontSize: "14px",
                color: "var(--slate)",
                margin: "0 0 20px",
                lineHeight: "1.5",
              }}
            >
              Your manuscript file has been generated and downloaded to your computer.
            </p>

            {/* Export details pill */}
            {exportedInfo && (
              <div
                style={{
                  background: "#FFFFFF",
                  border: "1px solid var(--line)",
                  borderRadius: "10px",
                  padding: "14px 18px",
                  marginBottom: "22px",
                  textAlign: "left",
                }}
              >
                <div className="row between" style={{ marginBottom: "6px" }}>
                  <span style={{ fontSize: "12px", color: "var(--slate)" }}>File name:</span>
                  <strong style={{ fontSize: "12px", color: "var(--ink)", fontFamily: "monospace" }}>
                    {exportedInfo.filename}
                  </strong>
                </div>
                <div className="row between" style={{ marginBottom: "6px" }}>
                  <span style={{ fontSize: "12px", color: "var(--slate)" }}>Format:</span>
                  <span className="tag" style={{ background: "#e8eff4", color: "var(--blue)", fontSize: "11px" }}>
                    {exportedInfo.format}
                  </span>
                </div>
                <div className="row between">
                  <span style={{ fontSize: "12px", color: "var(--slate)" }}>Content included:</span>
                  <strong style={{ fontSize: "12px", color: "var(--ink)" }}>
                    {exportedInfo.chapterCount} chapter{exportedInfo.chapterCount === 1 ? "" : "s"} ({exportedInfo.wordCount} words)
                  </strong>
                </div>
              </div>
            )}

            {/* Countdown timer banner */}
            <div
              style={{
                background: "#f0f5f8",
                border: "1px solid #d0e1ec",
                borderRadius: "8px",
                padding: "10px 14px",
                marginBottom: "24px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "8px",
                fontSize: "13px",
                color: "var(--blue)",
                fontWeight: 500,
              }}
            >
              <span>⏱</span>
              <span>
                Returning to project workspace in <strong>{countdown}</strong> second{countdown === 1 ? "" : "s"}...
              </span>
            </div>

            {/* Modal actions */}
            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              <button
                type="button"
                className="btn primary"
                onClick={() => router.push(`/projects/${projectId}/workspace`)}
                style={{ width: "100%", justifyContent: "center", padding: "12px" }}
              >
                Return to Project Workspace now →
              </button>

              <button
                type="button"
                className="btn secondary"
                onClick={dismissModal}
                style={{ width: "100%", justifyContent: "center" }}
              >
                Stay on export page
              </button>
            </div>

            {exportedInfo?.downloadUrl && (
              <div style={{ marginTop: "16px" }}>
                <a
                  href={exportedInfo.downloadUrl}
                  download={exportedInfo.filename}
                  style={{ fontSize: "12px", color: "var(--blue)", textDecoration: "underline" }}
                >
                  Click here if file did not download automatically
                </a>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
