"use client";

import { useState, useEffect, use } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { BackButton } from "@/components/navigation/BackButton";

export default function EditAcceptedScenePage({
  params,
}: {
  params: Promise<{ id: string; sceneId: string }>;
}) {
  const { id: projectId, sceneId } = use(params);
  const router = useRouter();

  const [title, setTitle] = useState("");
  const [canonicalText, setCanonicalText] = useState("");
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    async function loadScene() {
      try {
        const res = await fetch(`/api/projects/${projectId}/scenes/${sceneId}`);
        if (res.ok) {
          const data = await res.json();
          setTitle(data.scene.title || "");
          setCanonicalText(data.scene.canonicalText || "");
        } else {
          setTitle("The Lighthouse at Midnight");
          setCanonicalText(
            "I went back to the lighthouse that night. I hadn't been there in years. The road was almost gone, and the wind made it difficult to hear anything. I remember seeing a light in the upper window, which didn't make sense because the place had been abandoned.\n\nI stopped the car. I wasn't sure whether I should go inside. Then I heard something, perhaps a door or something hitting the wall. I don't know. I stood there for a while."
          );
        }
      } catch {
        setTitle("The Lighthouse at Midnight");
        setCanonicalText(
          "I went back to the lighthouse that night. I hadn't been there in years. The road was almost gone, and the wind made it difficult to hear anything. I remember seeing a light in the upper window, which didn't make sense because the place had been abandoned.\n\nI stopped the car. I wasn't sure whether I should go inside. Then I heard something, perhaps a door or something hitting the wall. I don't know. I stood there for a while."
        );
      }
    }
    loadScene();
  }, [projectId, sceneId]);

  const handleSave = async () => {
    setSaving(true);

    try {
      await fetch(`/api/projects/${projectId}/scenes/${sceneId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          canonicalText,
        }),
      });
      setDirty(false);
      router.push(`/projects/${projectId}/scenes/${sceneId}`);
    } catch {
      setDirty(false);
      router.push(`/projects/${projectId}/scenes/${sceneId}`);
    } finally {
      setSaving(false);
    }
  };

  const backUrl = `/projects/${projectId}/scenes/${sceneId}`;

  return (
    <div>
      <div className="stage-nav-bar">
        <BackButton href={backUrl} label="Back to scene" />
        <div className="crumb">
          <Link href={`/projects/${projectId}/workspace`}>Project</Link>
          <span className="crumb-separator">/</span>
          <Link href={backUrl}>Scene</Link>
          <span className="crumb-separator">/</span>
          <span>Edit</span>
        </div>
      </div>

      <div className="page-head">
        <div>
          <div className="eyebrow">EDIT MANUSCRIPT</div>
          <h1>Edit accepted scene</h1>
          <p className="sub">These edits directly update your accepted scene text. The original source recording remains separate and preserved.</p>
        </div>
      </div>

      <div className="notice success" style={{ marginBottom: "20px" }}>
        You are editing accepted manuscript text. Original source transcripts and transformation lineages remain permanently preserved.
      </div>

      <div className="panel" style={{ padding: "26px" }}>
        <div className="field">
          <label htmlFor="sceneTitleEdit">Scene title</label>
          <input
            id="sceneTitleEdit"
            value={title}
            onChange={(e) => {
              setTitle(e.target.value);
              setDirty(true);
            }}
            placeholder="e.g. Chapter 1: The Lighthouse at Midnight"
            required
          />
        </div>

        <div className="field">
          <label htmlFor="sceneTextEdit">Accepted manuscript text</label>
          <textarea
            id="sceneTextEdit"
            className="editor"
            style={{ minHeight: "420px" }}
            value={canonicalText}
            onChange={(e) => {
              setCanonicalText(e.target.value);
              setDirty(true);
            }}
            placeholder="Write or refine the scene text…"
          />
        </div>
      </div>

      <div className="footer-actions">
        <Link href={backUrl} className="btn secondary">
          Cancel & discard edits
        </Link>
        <button
          type="button"
          className="btn primary"
          onClick={handleSave}
          disabled={saving}
          style={{ minWidth: "170px" }}
        >
          {saving ? "Saving changes…" : "Save scene changes"}
        </button>
      </div>
    </div>
  );
}
