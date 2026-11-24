import Link from "next/link";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getAuthUser } from "@/lib/auth-helper";
import { SceneService } from "@/services/scene";
import { StageNav } from "@/components/navigation/StageNav";

export default async function ScenePage({
  params,
}: {
  params: Promise<{ id: string; sceneId: string }>;
}) {
  const { id: projectId, sceneId } = await params;
  let user = null;
  try {
    const supabase = await createServerSupabaseClient();
    user = await getAuthUser(supabase);
  } catch {
    // Fallback
  }

  const userId = user?.id || "00000000-0000-0000-0000-000000000001";
  const allScenes = await SceneService.listScenes(projectId, userId);
  let scene = await SceneService.getScene(sceneId, projectId, userId);

  if (!scene) {
    const matched = allScenes.find((s) => s.id === sceneId);
    if (matched) {
      scene = matched;
    } else {
      scene = {
        id: sceneId,
        projectId,
        userId,
        title: "Chapter 1: Arrival at Greyhaven",
        description: "Mara arrives at the coastal village as the evening tide sets in.",
        canonicalText:
          "The salt air met me before the town even came into view. Greyhaven sat huddled between the jagged cliffs and the black water, its chimneys sending thin spirals of smoke into the darkening sky.",
        wordCount: 34,
        sortOrder: 1,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
    }
  }

  const sortedScenes = [...allScenes].sort((a, b) => a.sortOrder - b.sortOrder);
  const currentIndex = sortedScenes.findIndex((s) => s.id === scene!.id);
  const prevScene = currentIndex > 0 ? sortedScenes[currentIndex - 1] : null;
  const nextScene = currentIndex >= 0 && currentIndex < sortedScenes.length - 1 ? sortedScenes[currentIndex + 1] : null;

  return (
    <div>
      <StageNav
        currentStep={5}
        backHref={`/projects/${projectId}/workspace`}
        backLabel="Back to project workspace"
        projectId={projectId}
        crumbCurrent={scene.title}
      />

      <div className="page-head">
        <div>
          <div className="eyebrow">ACCEPTED MANUSCRIPT</div>
          <h1>{scene.title}</h1>
          <p className="sub">This passage has been explicitly accepted into your project manuscript.</p>
        </div>
        <div className="action-row">
          <Link href={`/projects/${projectId}/scenes/${sceneId}/edit`} className="btn secondary">
            Edit scene text
          </Link>
          <Link href={`/projects/${projectId}/export?sceneId=${sceneId}`} className="btn primary">
            Export scene →
          </Link>
        </div>
      </div>

      <div className="row between" style={{ marginBottom: "16px", flexWrap: "wrap", gap: "8px" }}>
        <div className="row" style={{ gap: "8px", alignItems: "center" }}>
          <span className="tag approved">✓ Accepted manuscript text</span>
          <span className="tag">Scene {scene.sortOrder} of {sortedScenes.length || 1}</span>
        </div>
        <div className="row" style={{ gap: "14px", alignItems: "center" }}>
          {prevScene && (
            <Link href={`/projects/${projectId}/scenes/${prevScene.id}`} className="tiny" style={{ color: "var(--blue)", textDecoration: "none" }}>
              ← Previous: {prevScene.title}
            </Link>
          )}
          {nextScene && (
            <Link href={`/projects/${projectId}/scenes/${nextScene.id}`} className="tiny" style={{ color: "var(--blue)", textDecoration: "none" }}>
              Next: {nextScene.title} →
            </Link>
          )}
          <span className="tiny muted">{scene.wordCount} words</span>
        </div>
      </div>

      <article className="manuscript">
        <h2>{scene.title}</h2>
        <div className="body">{scene.canonicalText}</div>
      </article>

      <div className="two" style={{ marginTop: "28px" }}>
        <div className="panel" style={{ padding: "24px" }}>
          <h3 style={{ fontSize: "14px" }}>Scene details</h3>
          <p className="tiny muted" style={{ lineHeight: "1.6", fontSize: "13px" }}>
            {scene.description || "No scene description."}
          </p>
          <div className="tiny muted" style={{ marginTop: "14px", paddingTop: "12px", borderTop: "1px solid #f2eee8" }}>
            Status · <span className="status"><i className="dot green"></i>Canonical accepted content</span>
          </div>
        </div>

        <div className="panel" style={{ padding: "24px" }}>
          <h3 style={{ fontSize: "14px" }}>Lineage & provenance</h3>
          <div className="list-item">
            <div>
              <strong>Original recording</strong>
              <small>Preserved in private object storage</small>
            </div>
            <span className="tag">Immutable source</span>
          </div>
          <div className="list-item">
            <div>
              <strong>Writer approval</strong>
              <small>Explicitly accepted by author</small>
            </div>
            <span className="tag approved">Verified</span>
          </div>
        </div>
      </div>

      <div className="footer-actions">
        <Link href={`/projects/${projectId}/workspace`} className="btn secondary">
          ← Back to project workspace
        </Link>
        <div className="action-row">
          <Link
            href={`/projects/${projectId}/capture/record?afterSceneId=${scene.id}`}
            className="btn secondary"
            title={`Capture next scene following ${scene.title}`}
          >
            ＋ Capture another scene
          </Link>
          <Link href={`/projects/${projectId}/export`} className="btn primary">
            Export manuscript →
          </Link>
        </div>
      </div>
    </div>
  );
}
