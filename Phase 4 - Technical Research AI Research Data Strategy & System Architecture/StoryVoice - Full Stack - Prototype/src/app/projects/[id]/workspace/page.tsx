import Link from "next/link";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getAuthUser } from "@/lib/auth-helper";
import { ProjectService } from "@/services/project";
import { SceneService } from "@/services/scene";
import { ActivityService } from "@/services/activity";
import { BackButton } from "@/components/navigation/BackButton";

function formatRelativeTime(dateString: string): string {
  try {
    const diffMs = Date.now() - new Date(dateString).getTime();
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays < 7) return `${diffDays}d ago`;
    return new Date(dateString).toLocaleDateString("en-US", { month: "short", day: "numeric" });
  } catch {
    return "Recent";
  }
}

function getActivityBadge(type: string) {
  switch (type) {
    case "acceptance":
      return {
        icon: "✓",
        label: "Manuscript Accepted",
        bg: "#E8F5E9",
        color: "#2E7D32",
        border: "#C8E6C9",
      };
    case "export":
      return {
        icon: "↗",
        label: "Export Generated",
        bg: "#E8F0FE",
        color: "#1967D2",
        border: "#C2D7FA",
      };
    case "transformation":
      return {
        icon: "✦",
        label: "Draft Transformed",
        bg: "#F3E8FD",
        color: "#6A1B9A",
        border: "#E1BEE7",
      };
    case "recording":
      return {
        icon: "🎙",
        label: "Audio Captured",
        bg: "#FFF3E0",
        color: "#E65100",
        border: "#FFE0B2",
      };
    case "transcript":
      return {
        icon: "✎",
        label: "Transcript Edited",
        bg: "#ECEFF1",
        color: "#37474F",
        border: "#CFD8DC",
      };
    default:
      return {
        icon: "•",
        label: "Project Activity",
        bg: "#F5F5F5",
        color: "#616161",
        border: "#E0E0E0",
      };
  }
}

export default async function ProjectWorkspacePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: projectId } = await params;
  let user = null;
  try {
    const supabase = await createServerSupabaseClient();
    user = await getAuthUser(supabase);
  } catch {
    // Fallback
  }

  const userId = user?.id || "00000000-0000-0000-0000-000000000001";
  let project = await ProjectService.getProject(projectId, userId);

  if (!project) {
    project = {
      id: projectId,
      title: "The Last Light",
      genre: "Literary Mystery",
      description: "A literary mystery centred on a disappearance, a forgotten letter and the memories of a small coastal town.",
      notes: "First draft in progress.",
      status: "in_progress" as const,
      userId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  }

  const scenes = await SceneService.listScenes(projectId, userId);
  const sortedScenes = [...scenes].sort((a, b) => a.sortOrder - b.sortOrder);
  const activities = await ActivityService.listActivities(projectId, userId);

  const totalWords = sortedScenes.reduce((acc, s) => acc + (s.wordCount || 0), 0);
  const readingTimeMin = Math.max(1, Math.ceil(totalWords / 200));
  const milestoneTarget = totalWords < 250 ? 250 : totalWords < 500 ? 500 : totalWords < 1000 ? 1000 : 2500;
  const progressPercent = Math.min(100, Math.round((totalWords / milestoneTarget) * 100));

  const latestScene = sortedScenes.length > 0 ? sortedScenes[sortedScenes.length - 1] : null;

  return (
    <div>
      <div className="stage-nav-bar">
        <BackButton href="/projects" label="Back to projects" />
        <div className="crumb">
          <Link href="/projects">Projects</Link>
          <span className="crumb-separator">/</span>
          <span>{project.title}</span>
        </div>
      </div>

      <div className="page-head">
        <div>
          <div className="eyebrow">PROJECT WORKSPACE</div>
          <h1>{project.title}</h1>
          <p className="sub">{project.description || "Your manuscript workspace."}</p>
        </div>
        <div className="action-row">
          <Link href={`/projects/${projectId}/export`} className="btn secondary">
            Export text
          </Link>
          <Link
            href={
              latestScene
                ? `/projects/${projectId}/capture/record?afterSceneId=${latestScene.id}`
                : `/projects/${projectId}/capture`
            }
            className="btn primary"
          >
            ＋ Record or import scene
          </Link>
        </div>
      </div>

      {/* Goal-Gradient Milestone Progress (Law 10 & Law 4) */}
      <div className="milestone-banner">
        <div className="row between" style={{ alignItems: "flex-start", flexWrap: "wrap", gap: "12px" }}>
          <div>
            <span className="eyebrow" style={{ color: "var(--blue)", marginBottom: "4px" }}>
              MANUSCRIPT PROGRESS
            </span>
            <h3 style={{ fontSize: "17px", fontWeight: 600, margin: "2px 0 4px", color: "var(--ink)" }}>
              {sortedScenes.length} chapter{sortedScenes.length === 1 ? "" : "s"} · {totalWords} words accepted
            </h3>
            <p className="tiny muted" style={{ margin: 0, fontSize: "12px" }}>
              Estimated reading time: ~{readingTimeMin} min · Milestone target: {milestoneTarget} words (
              {Math.max(0, milestoneTarget - totalWords)} words remaining)
            </p>
          </div>
          <div className="row" style={{ gap: "8px", alignItems: "center" }}>
            <span className="tag" style={{ background: "#e8eff4", color: "var(--blue)", fontWeight: 600 }}>
              {progressPercent}% to milestone
            </span>
            <Link href={`/projects/${projectId}/export`} className="btn small secondary">
              Export manuscript
            </Link>
          </div>
        </div>

        <div className="progress-track">
          <div className="progress-fill" style={{ width: `${progressPercent}%` }} />
        </div>
      </div>

      <div className="project-layout">
        <div>
          {/* Continue Working Card (Law 3, 7, 13) */}
          <div className="panel" style={{ padding: "26px", marginBottom: "22px" }}>
            <div className="panel-head">
              <h2>Continue working</h2>
              <span className="tiny muted">Recommended next action</span>
            </div>
            <div className="row between" style={{ flexWrap: "wrap", gap: "14px", alignItems: "center" }}>
              <div style={{ flex: 1, minWidth: "220px" }}>
                <strong style={{ fontSize: "14px" }}>
                  {latestScene
                    ? `Capture Chapter ${latestScene.sortOrder + 1} in sequence`
                    : "Capture your first scene"}
                </strong>
                <p className="tiny muted" style={{ marginTop: "4px", fontSize: "12px", lineHeight: "1.5" }}>
                  {latestScene
                    ? `Previous scene "${latestScene.title}" is accepted with ${latestScene.wordCount} words. Continue recording the following scene to build your story sequence.`
                    : "Start by recording your voice or importing an audio recording from your phone or device."}
                </p>
              </div>
              <div className="action-row">
                {latestScene && (
                  <Link href={`/projects/${projectId}/scenes/${latestScene.id}`} className="btn secondary">
                    View Chapter {latestScene.sortOrder} →
                  </Link>
                )}
                <Link
                  href={
                    latestScene
                      ? `/projects/${projectId}/capture/record?afterSceneId=${latestScene.id}`
                      : `/projects/${projectId}/capture`
                  }
                  className="btn primary"
                >
                  {latestScene ? "Capture next scene →" : "Start capture →"}
                </Link>
              </div>
            </div>
          </div>

          {/* Accepted Scenes List (Law 1, 2, 12) */}
          <div className="panel" style={{ padding: "26px", marginBottom: "22px" }}>
            <div className="panel-head">
              <h2>Accepted scenes</h2>
              <span className="tiny muted">
                {scenes.length} scene{scenes.length === 1 ? "" : "s"} · {totalWords} words
              </span>
            </div>

            {sortedScenes.length > 0 ? (
              <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                {sortedScenes.map((sc) => (
                  <div
                    key={sc.id}
                    className="list-item"
                    style={{
                      padding: "16px",
                      background: "#FAF9F6",
                      borderRadius: "8px",
                      border: "1px solid var(--line)",
                      alignItems: "flex-start",
                    }}
                  >
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div className="row between" style={{ marginBottom: "2px" }}>
                        <strong style={{ fontSize: "14px" }}>{sc.title}</strong>
                        <span className="tag" style={{ background: "#e8eff4", color: "var(--blue)", fontSize: "11px" }}>
                          Scene {sc.sortOrder} · {sc.wordCount} words
                        </span>
                      </div>
                      <small style={{ color: "var(--slate)", display: "block" }}>
                        <span className="status">
                          <i className="dot green"></i>Accepted manuscript
                        </span>
                        {sc.description ? ` · ${sc.description}` : ""}
                      </small>
                      {sc.canonicalText && (
                        <p
                          style={{
                            fontSize: "12px",
                            color: "#4e5762",
                            fontStyle: "italic",
                            margin: "8px 0 0",
                            lineHeight: "1.5",
                            whiteSpace: "nowrap",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                          }}
                        >
                          &ldquo;{sc.canonicalText.slice(0, 110)}{sc.canonicalText.length > 110 ? "…" : ""}&rdquo;
                        </p>
                      )}
                    </div>
                    <div className="row" style={{ gap: "8px", marginLeft: "14px", flexShrink: 0 }}>
                      <Link href={`/projects/${projectId}/scenes/${sc.id}/edit`} className="btn small secondary">
                        Edit
                      </Link>
                      <Link href={`/projects/${projectId}/scenes/${sc.id}`} className="btn small primary">
                        Open →
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ textAlign: "center", padding: "40px 20px" }}>
                <div style={{ font: "36px var(--serif)", color: "#9eabb3" }}>¶</div>
                <h3 style={{ fontSize: "15px", margin: "10px 0 6px" }}>
                  Your scenes will appear as you accept writing
                </h3>
                <p className="tiny muted" style={{ maxWidth: "340px", margin: "0 auto 18px", fontSize: "12px", lineHeight: "1.6" }}>
                  Accepted passages can be organised into existing scenes or used to start a new chapter.
                </p>
                <Link href={`/projects/${projectId}/capture`} className="btn small primary">
                  Capture your first scene
                </Link>
              </div>
            )}
          </div>

          {/* Active Project Activity & Connected Audit Log (Law 16 - Uniform Connectedness) */}
          <div className="panel" style={{ padding: "26px" }}>
            <div className="panel-head">
              <h2>Active project activity & audit log</h2>
              <span className="tiny muted">
                {activities.length} event{activities.length === 1 ? "" : "s"} logged
              </span>
            </div>

            {activities.length > 0 ? (
              <div className="connected-timeline" style={{ marginTop: "16px" }}>
                {activities.map((act) => {
                  const badge = getActivityBadge(act.type);
                  return (
                    <div key={act.id} className="timeline-row">
                      <div
                        className="timeline-node"
                        style={{
                          background: badge.bg,
                          color: badge.color,
                          borderColor: badge.border,
                        }}
                      >
                        {badge.icon}
                      </div>
                      <div className="timeline-card">
                        <div className="row between" style={{ marginBottom: "4px", flexWrap: "wrap", gap: "6px" }}>
                          <strong style={{ fontSize: "13px", color: "var(--ink)" }}>{act.title}</strong>
                          <span className="tiny muted" style={{ fontSize: "11px", whiteSpace: "nowrap" }}>
                            {formatRelativeTime(act.created_at)}
                          </span>
                        </div>
                        <p style={{ fontSize: "12px", color: "var(--slate)", margin: "0 0 6px", lineHeight: "1.5" }}>
                          {act.details}
                        </p>
                        <div className="row" style={{ gap: "8px", alignItems: "center" }}>
                          <span
                            className="tag"
                            style={{
                              fontSize: "10px",
                              padding: "2px 6px",
                              background: badge.bg,
                              color: badge.color,
                            }}
                          >
                            {badge.label}
                          </span>
                          <span className="tiny muted" style={{ fontSize: "11px" }}>
                            By {act.author || "Writer"}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div style={{ textAlign: "center", padding: "30px 10px" }}>
                <p className="tiny muted" style={{ fontSize: "12px" }}>
                  No activity recorded yet. Spoken recordings, transformed drafts, and exports will appear here automatically.
                </p>
              </div>
            )}
          </div>
        </div>

        <aside>
          <div className="panel" style={{ padding: "22px" }}>
            <h3>Project details</h3>
            <div className="field">
              <label>Genre</label>
              <div style={{ fontSize: "13px", color: "var(--ink)" }}>{project.genre || "Not specified"}</div>
            </div>
            <div className="field">
              <label>Project status</label>
              <span className="status">
                <i className="dot green"></i>In progress
              </span>
            </div>
            {project.notes && (
              <div className="field">
                <label>Project notes</label>
                <div className="tiny muted" style={{ fontSize: "12px", lineHeight: "1.5" }}>{project.notes}</div>
              </div>
            )}
            <div className="field" style={{ paddingTop: "12px", borderTop: "1px solid var(--line)" }}>
              <label>Story context</label>
              <div className="tiny muted" style={{ fontSize: "12px" }}>Writer-controlled reference shelf</div>
              <Link href={`/projects/${projectId}/context`} className="btn small secondary" style={{ marginTop: "8px" }}>
                Manage story context →
              </Link>
            </div>
          </div>

          <div className="panel" style={{ padding: "22px" }}>
            <h3>Quick actions</h3>
            <div className="stack">
              <Link
                href={
                  latestScene
                    ? `/projects/${projectId}/capture/record?afterSceneId=${latestScene.id}`
                    : `/projects/${projectId}/capture/record`
                }
                className="btn secondary"
              >
                Record live audio
              </Link>
              <Link
                href={
                  latestScene
                    ? `/projects/${projectId}/capture/import?afterSceneId=${latestScene.id}`
                    : `/projects/${projectId}/capture/import`
                }
                className="btn secondary"
              >
                Import audio file
              </Link>
              <Link href={`/projects/${projectId}/export`} className="btn secondary">
                Export accepted text
              </Link>
            </div>
          </div>
        </aside>
      </div>

      <div className="footer-actions">
        <Link href="/projects" className="btn secondary">
          ← Back to all projects
        </Link>
      </div>
    </div>
  );
}
