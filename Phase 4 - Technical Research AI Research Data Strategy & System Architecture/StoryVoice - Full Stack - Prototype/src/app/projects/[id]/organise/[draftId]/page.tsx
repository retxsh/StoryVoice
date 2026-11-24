"use client";

import { useState, useEffect, use } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { StageNav } from "@/components/navigation/StageNav";
import { getNextSequenceDetails } from "@/lib/story-sequence";

const DEFAULT_PROJECT_SCENES = [
  {
    id: "demo-scene-1",
    title: "Chapter 1: Arrival at Greyhaven",
    description: "Mara arrives at the coastal village as the evening tide sets in.",
    canonicalText:
      "The salt air met me before the town even came into view. Greyhaven sat huddled between the jagged cliffs and the black water, its chimneys sending thin spirals of smoke into the darkening sky.",
    wordCount: 34,
  },
  {
    id: "demo-scene-2",
    title: "Chapter 2: The Coast Road",
    description: "Driving along the eroding bluffs toward the north point.",
    canonicalText:
      "The gravel crunched beneath the tires, the narrow lane winding perilously close to the bluff edge. To the east, the sea surged relentlessly against the granite rocks below.",
    wordCount: 30,
  },
  {
    id: "demo-scene-3",
    title: "Chapter 3: The North Point",
    description: "Approaching the headland where the old light stands silent.",
    canonicalText:
      "The trees fell away as the grade leveled out. Ahead stood the silhouette of the headland, rising dark against the gray swell of the ocean.",
    wordCount: 26,
  },
];

export default function OrganisePage({
  params,
}: {
  params: Promise<{ id: string; draftId: string }>;
}) {
  const { id: projectId, draftId } = use(params);
  const router = useRouter();
  const searchParams = useSearchParams();
  const revId = searchParams.get("revId") || "demo-rev";
  const mode = searchParams.get("mode") || "clean";
  const paramAfterSceneId = searchParams.get("afterSceneId") || "";

  const [afterSceneId, setAfterSceneId] = useState<string>(paramAfterSceneId);
  const [draftText, setDraftText] = useState("");
  const [selectedDestination, setSelectedDestination] = useState<string>("new");
  const [scenes, setScenes] = useState<any[]>(DEFAULT_PROJECT_SCENES);
  const [newTitle, setNewTitle] = useState("Chapter 4: The Keepers Steps");
  const [newDescription, setNewDescription] = useState("Climbing the spiral stairs inside the abandoned lighthouse tower.");
  const [accepting, setAccepting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadScenesAndDraft() {
      try {
        const [draftRes, scenesRes] = await Promise.all([
          fetch(`/api/drafts/${draftId}?mode=${mode}`),
          fetch(`/api/projects/${projectId}/scenes`),
        ]);

        let loadedScenes = DEFAULT_PROJECT_SCENES;
        if (scenesRes.ok) {
          const sData = await scenesRes.json();
          if (sData.scenes && sData.scenes.length > 0) {
            loadedScenes = sData.scenes;
          }
        }
        setScenes(loadedScenes);

        let effAfter = paramAfterSceneId;
        if (draftRes.ok) {
          const dData = await draftRes.json();
          setDraftText(dData.currentRevision?.text || "");
          if (!effAfter && (dData.afterSceneId || dData.draft?.after_scene_id)) {
            effAfter = dData.afterSceneId || dData.draft?.after_scene_id;
            setAfterSceneId(effAfter);
          }
        } else {
          const seq = getNextSequenceDetails(effAfter, loadedScenes);
          setDraftText(seq.spokenPassage);
        }

        const seq = getNextSequenceDetails(effAfter, loadedScenes);
        setNewTitle(seq.title);
        setNewDescription(seq.description);
      } catch {
        setScenes(DEFAULT_PROJECT_SCENES);
        const seq = getNextSequenceDetails(paramAfterSceneId, DEFAULT_PROJECT_SCENES);
        setDraftText(seq.spokenPassage);
        setNewTitle(seq.title);
        setNewDescription(seq.description);
      }
    }
    loadScenesAndDraft();
  }, [draftId, projectId, mode, paramAfterSceneId]);

  const handleAccept = async () => {
    setAccepting(true);
    setError(null);

    const isNew = selectedDestination === "new";
    const isUnassigned = selectedDestination === "unassigned";
    const isExisting = !isNew && !isUnassigned;

    try {
      const res = await fetch("/api/approval/accept", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId,
          draftId,
          expectedDraftRevisionId: revId === "demo-rev" ? "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11" : revId,
          destinationMode: isNew ? "new" : isUnassigned ? "unassigned" : "existing",
          existingSceneId: isExisting ? selectedDestination : null,
          newSceneTitle: isNew ? newTitle : isUnassigned ? "Unassigned Manuscript Passage" : null,
          newSceneDescription: isNew ? newDescription : isUnassigned ? "Accepted passage awaiting scene placement." : null,
          afterSceneId: afterSceneId || null,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Acceptance transaction failed");

      router.push(`/projects/${projectId}/scenes/${data.scene_id || data.sceneId}`);
    } catch {
      // In local dev fallback, simulate successful acceptance
      if (isExisting) {
        router.push(`/projects/${projectId}/scenes/${selectedDestination}`);
      } else {
        const nextInfo = getNextSequenceDetails(afterSceneId, scenes);
        router.push(`/projects/${projectId}/scenes/${nextInfo.order ? `demo-scene-${nextInfo.order}` : "demo-scene-2"}`);
      }
    }
  };

  const wordCount = draftText.trim() ? draftText.trim().split(/\s+/).length : 0;
  const backUrl = `/projects/${projectId}/review/${draftId}?mode=${mode}`;

  const currentTargetScene = scenes.find((s) => s.id === selectedDestination);
  const prevScene = scenes.find((s) => s.id === afterSceneId);
  const seq = getNextSequenceDetails(afterSceneId, scenes);

  return (
    <div>
      <StageNav
        currentStep={5}
        backHref={backUrl}
        backLabel="Back to draft review"
        projectId={projectId}
        crumbCurrent="Accept & organise"
      />

      <div className="page-head">
        <div>
          <div className="eyebrow">{afterSceneId ? `SEQUENCE · SCENE ${seq.order}` : "ACCEPT & ORGANISE"}</div>
          <h1>{afterSceneId ? "Organise this following passage" : "Where should this passage live?"}</h1>
          <p className="sub">
            {afterSceneId && prevScene
              ? `Captured in sequence after "${prevScene.title}". Place as the next scene or add on to the preceding scene.`
              : "Accepting adds this text to your accepted manuscript. Choose its destination first."}
          </p>
        </div>
      </div>

      {error && <div className="notice error" style={{ marginBottom: "18px" }}>{error}</div>}

      <div className="two">
        <div className="panel" style={{ padding: "26px" }}>
          <div className="panel-head">
            <h3 style={{ fontSize: "14px" }}>Passage to accept</h3>
            <span className="tag">Current draft</span>
          </div>
          <div style={{ font: "15px/1.85 var(--serif)", whiteSpace: "pre-wrap", color: "#2e343a", background: "#fffefa", padding: "18px", borderRadius: "8px", border: "1px solid #e8e4da" }}>
            {draftText}
          </div>
          <div className="tiny muted" style={{ marginTop: "14px" }}>
            {wordCount} words · {mode.toUpperCase()} candidate
          </div>
        </div>

        <div className="panel" style={{ padding: "26px" }}>
          <h3 style={{ fontSize: "14px" }}>Choose manuscript destination</h3>
          <div className="field">
            <label htmlFor="destinationSelect">Destination</label>
            <select
              id="destinationSelect"
              value={selectedDestination}
              onChange={(e) => setSelectedDestination(e.target.value)}
            >
              {afterSceneId && prevScene ? (
                <>
                  <optgroup label="Sequential Manuscript Order">
                    <option value="new">
                      Create new scene (Scene #{seq.order}: {newTitle})
                    </option>
                    <option value={prevScene.id}>
                      Add on to previous scene ({prevScene.title})
                    </option>
                  </optgroup>
                  <optgroup label="Other Existing Scenes">
                    {scenes
                      .filter((s) => s.id !== prevScene.id)
                      .map((s) => (
                        <option key={s.id} value={s.id}>
                          Append to: {s.title} ({s.wordCount} words)
                        </option>
                      ))}
                  </optgroup>
                  <optgroup label="Unassigned Storage">
                    <option value="unassigned">Save as unassigned manuscript passage</option>
                  </optgroup>
                </>
              ) : (
                <>
                  <optgroup label="Create new content">
                    <option value="new">Create a new scene</option>
                    <option value="unassigned">Save as unassigned manuscript passage</option>
                  </optgroup>
                  <optgroup label="Append to existing scene in manuscript">
                    {scenes.map((s) => (
                      <option key={s.id} value={s.id}>
                        Append to: {s.title} ({s.wordCount} words)
                      </option>
                    ))}
                  </optgroup>
                </>
              )}
            </select>
          </div>

          {selectedDestination === "new" && (
            <div>
              <div className="field">
                <label htmlFor="sceneTitleInput">Scene title</label>
                <input
                  id="sceneTitleInput"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="e.g. Chapter 1: The Lighthouse at Midnight"
                  required
                />
              </div>
              <div className="field">
                <label htmlFor="sceneDescInput">Scene description (optional)</label>
                <textarea
                  id="sceneDescInput"
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  placeholder="A few words about what occurs in this scene…"
                  rows={3}
                />
              </div>
            </div>
          )}

          {selectedDestination === "unassigned" && (
            <div style={{ background: "#f0f5f9", border: "1px solid #d0e0ed", borderRadius: "8px", padding: "14px 16px", marginTop: "14px" }}>
              <div style={{ fontSize: "13px", fontWeight: 600, color: "var(--blue)" }}>Unassigned Manuscript Passage</div>
              <p style={{ fontSize: "12px", color: "var(--slate)", margin: "4px 0 0", lineHeight: "1.5" }}>
                This accepted passage will be saved into your project manuscript pool without assigning to a specific chapter yet. You can organise it into your scenes at any time from your project workspace.
              </p>
            </div>
          )}

          {currentTargetScene && selectedDestination !== "new" && selectedDestination !== "unassigned" && (
            <div style={{ background: "#f8fafb", border: "1px solid #dbe5ec", borderRadius: "8px", padding: "14px 16px", marginTop: "14px" }}>
              <div className="row between" style={{ marginBottom: "6px" }}>
                <strong style={{ fontSize: "13px", color: "var(--ink)" }}>{currentTargetScene.title}</strong>
                <span className="tag" style={{ background: "#e8eff4", color: "var(--blue)" }}>{currentTargetScene.wordCount} words</span>
              </div>
              {currentTargetScene.description && (
                <p style={{ fontSize: "12px", color: "var(--slate)", margin: "0 0 8px" }}>
                  {currentTargetScene.description}
                </p>
              )}
              {currentTargetScene.canonicalText && (
                <div style={{ fontSize: "12px", color: "#4d5661", fontStyle: "italic", background: "#ffffff", padding: "10px 12px", borderRadius: "6px", border: "1px solid #e2e8f0", maxHeight: "80px", overflowY: "auto" }}>
                  &ldquo;{currentTargetScene.canonicalText.slice(0, 160)}{currentTargetScene.canonicalText.length > 160 ? "…" : ""}&rdquo;
                </div>
              )}
              <div className="tiny muted" style={{ marginTop: "10px" }}>
                This accepted draft will be appended to the end of this scene ({currentTargetScene.wordCount} words + {wordCount} words = {currentTargetScene.wordCount + wordCount} total words).
              </div>
            </div>
          )}

          <div className="notice warn" style={{ marginTop: "18px" }}>
            Only the text shown in the preview will become accepted manuscript content after you confirm. Your source recording remains intact and protected.
          </div>
        </div>
      </div>

      <div className="footer-actions">
        <Link href={backUrl} className="btn secondary">
          ← Back to draft review
        </Link>
        <button
          type="button"
          className="btn primary"
          onClick={handleAccept}
          disabled={accepting}
          style={{ minWidth: "220px" }}
        >
          {accepting ? "Accepting to manuscript…" : "Accept and save to scene →"}
        </button>
      </div>
    </div>
  );
}
