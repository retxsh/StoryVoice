"use client";

import { useState, useEffect, use } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { StageNav } from "@/components/navigation/StageNav";

export default function DraftEditorPage({
  params,
}: {
  params: Promise<{ id: string; draftId: string }>;
}) {
  const { id: projectId, draftId } = use(params);
  const router = useRouter();
  const searchParams = useSearchParams();
  const mode = searchParams.get("mode") || "clean";

  const [text, setText] = useState("");
  const [initialText, setInitialText] = useState("");
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [currentRevId, setCurrentRevId] = useState("rev-1");
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    async function loadData() {
      try {
        const res = await fetch(`/api/drafts/${draftId}?mode=${mode}`);
        if (res.ok) {
          const data = await res.json();
          const t = data.currentRevision?.text || "";
          setText(t);
          setInitialText(t);
          setCurrentRevId(data.currentRevision?.id || "rev-1");
        } else {
          const sampleSource =
            "I went back to the lighthouse that night. I mean, I hadn't been there in years. The road was almost gone, and the wind was making it difficult to hear anything. I remember seeing a light in the upper window, which didn't make sense because the place had been abandoned. I stopped the car. I wasn't sure if I should go inside. Then I heard something, maybe a door, or something hitting the wall. I don't know. I just stood there for a while.";

          const sampleClean =
            "I went back to the lighthouse that night. I hadn't been there in years. The road was almost gone, and the wind made it difficult to hear anything. I remember seeing a light in the upper window, which didn't make sense because the place had been abandoned. I stopped the car. I wasn't sure whether I should go inside. Then I heard something, perhaps a door or something hitting the wall. I don't know. I stood there for a while.";

          const sampleReadable =
            "I returned to the lighthouse that night, a place I hadn't visited in years. The road leading to it was almost gone, and the wind swallowed nearly every sound. Then I saw a light in the upper window.\n\nIt made no sense. The lighthouse had been abandoned.\n\nI stopped the car and sat there, unsure whether to go inside. A sound came from somewhere within the building. A door, perhaps. Or something striking the wall.\n\nI remained still for a while, listening.";

          const sample = mode === "faithful" ? sampleSource : mode === "readable" ? sampleReadable : sampleClean;
          setText(sample);
          setInitialText(sample);
        }
      } catch {
        const sampleSource =
          "I went back to the lighthouse that night. I mean, I hadn't been there in years. The road was almost gone, and the wind was making it difficult to hear anything. I remember seeing a light in the upper window, which didn't make sense because the place had been abandoned. I stopped the car. I wasn't sure if I should go inside. Then I heard something, maybe a door, or something hitting the wall. I don't know. I just stood there for a while.";

        const sampleClean =
          "I went back to the lighthouse that night. I hadn't been there in years. The road was almost gone, and the wind made it difficult to hear anything. I remember seeing a light in the upper window, which didn't make sense because the place had been abandoned. I stopped the car. I wasn't sure whether I should go inside. Then I heard something, perhaps a door or something hitting the wall. I don't know. I stood there for a while.";

        const sampleReadable =
          "I returned to the lighthouse that night, a place I hadn't visited in years. The road leading to it was almost gone, and the wind swallowed nearly every sound. Then I saw a light in the upper window.\n\nIt made no sense. The lighthouse had been abandoned.\n\nI stopped the car and sat there, unsure whether to go inside. A sound came from somewhere within the building. A door, perhaps. Or something striking the wall.\n\nI remained still for a while, listening.";

        const sample = mode === "faithful" ? sampleSource : mode === "readable" ? sampleReadable : sampleClean;
        setText(sample);
        setInitialText(sample);
      }
    }
    loadData();
  }, [draftId, mode]);

  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (dirty) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [dirty]);

  const handleSaveDraft = async () => {
    setSaving(true);
    setNotice(null);

    try {
      const res = await fetch(`/api/drafts/${draftId}/revisions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text,
          authorType: "writer_edit",
          editSummary: "Writer edited draft text",
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setCurrentRevId(data.revision.id);
        setDirty(false);
        setNotice("Draft edits saved as a new revision.");
      } else {
        setDirty(false);
        setNotice("Draft edits updated in active session.");
      }
    } catch {
      setDirty(false);
      setNotice("Draft edits updated in active session.");
    } finally {
      setSaving(false);
    }
  };

  const wordCount = text.trim() ? text.trim().split(/\s+/).length : 0;
  const backUrl = `/projects/${projectId}/review/${draftId}`;

  return (
    <div>
      <StageNav
        currentStep={4}
        backHref={backUrl}
        backLabel="Back to draft comparison"
        projectId={projectId}
        crumbCurrent="Edit candidate draft"
      />

      <div className="page-head">
        <div>
          <div className="eyebrow">DRAFT EDITOR</div>
          <h1>Make the passage yours</h1>
          <p className="sub">This is an unaccepted candidate draft. Your original source transcript remains completely unchanged.</p>
        </div>
      </div>

      {notice && <div className="notice success" style={{ marginBottom: "18px" }}>{notice}</div>}

      <div className="row between" style={{ marginBottom: "12px", flexWrap: "wrap", gap: "8px" }}>
        <span className="tag">UNACCEPTED CANDIDATE · {mode.toUpperCase()}</span>
        <span className="tiny muted">
          {dirty ? "Unsaved edits · save before leaving" : "No unsaved changes"}
        </span>
      </div>

      <div className="field" style={{ margin: "8px 0" }}>
        <label htmlFor="draftTextarea" className="eyebrow" style={{ display: "block", marginBottom: "6px" }}>
          Draft text
        </label>
        <textarea
          id="draftTextarea"
          className="editor"
          style={{ minHeight: "400px" }}
          value={text}
          onChange={(e) => {
            setText(e.target.value);
            setDirty(true);
          }}
          placeholder="Refine sentence structure, pacing, or character voice…"
        />
      </div>

      <div className="row between" style={{ marginTop: "12px", color: "var(--slate)", fontSize: "12px" }}>
        <span>
          Long-form writing surface · {wordCount} words
        </span>
        <Link href={backUrl} className="btn small secondary">
          Compare with source
        </Link>
      </div>

      <div className="footer-actions">
        <Link href={backUrl} className="btn secondary">
          ← Back to comparison
        </Link>
        <div className="action-row">
          <button
            type="button"
            className="btn secondary"
            onClick={() => {
              setText(initialText);
              setDirty(false);
            }}
          >
            Reset to original
          </button>
          <button
            type="button"
            className="btn secondary"
            onClick={handleSaveDraft}
            disabled={!dirty || saving}
          >
            {saving ? "Saving…" : "Save draft changes"}
          </button>
          <Link
            href={`/projects/${projectId}/organise/${draftId}?revId=${currentRevId}&mode=${mode}`}
            className="btn primary"
            style={{ minWidth: "160px" }}
          >
            Accept draft →
          </Link>
        </div>
      </div>
    </div>
  );
}
