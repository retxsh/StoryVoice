import Link from "next/link";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getAuthUser, DEMO_USER_ID } from "@/lib/auth-helper";
import { ProjectService } from "@/services/project";

export default async function ProjectsPage() {
  let user = null;
  try {
    const supabase = await createServerSupabaseClient();
    user = await getAuthUser(supabase);
  } catch {
    // Ignored in dev
  }

  const userId = user?.id || DEMO_USER_ID;
  const projectList = await ProjectService.listUserProjects(userId);

  // Fallback sample project if empty in local development to preserve Phase 3 exploration
  const displayProjects = projectList.length > 0 ? projectList : [
    {
      id: "demo-project-1",
      userId,
      title: "The Last Light",
      genre: "Literary Mystery",
      description: "A literary mystery centred on a disappearance, a forgotten letter and the memories of a small coastal town.",
      notes: null,
      status: "in_progress" as const,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }
  ];

  return (
    <div>
      <div className="page-head">
        <div>
          <div className="eyebrow">YOUR WRITING SPACE</div>
          <h1>Projects</h1>
          <p className="sub">Your voice-first fiction manuscripts, organized in one persistent workspace.</p>
        </div>
        <Link href="/projects/new" className="btn primary">
          ＋ New project
        </Link>
      </div>

      <div className="section" style={{ marginBottom: "36px" }}>
        <div className="panel-head">
          <h2 style={{ fontSize: "17px" }}>Continue writing</h2>
          <span className="tiny muted">Pick up where you left off</span>
        </div>

        <div className="grid">
          {displayProjects.map((p) => (
            <article key={p.id} className="project-card" style={{ position: "relative" }}>
              <div className="row between" style={{ marginBottom: "8px" }}>
                <span className="eyebrow" style={{ margin: 0 }}>
                  {p.genre || "Fiction project"}
                </span>
                <span className="status">
                  <i className="dot green"></i>
                  {p.status === "in_progress" ? "In progress" : "Completed"}
                </span>
              </div>
              <h3 style={{ margin: "4px 0 8px" }}>
                <Link
                  href={`/projects/${p.id}/workspace`}
                  style={{ textDecoration: "none", color: "inherit" }}
                >
                  {p.title}
                </Link>
              </h3>
              <p>{p.description || "A new voice-drafted writing project."}</p>
              <div className="card-foot">
                <span>Updated recently</span>
                <Link
                  href={`/projects/${p.id}/workspace`}
                  className="btn small primary"
                  style={{ zIndex: 2 }}
                >
                  Open workspace →
                </Link>
              </div>
            </article>
          ))}
        </div>
      </div>

      <div className="section">
        <div className="panel-head">
          <h2 style={{ fontSize: "17px" }}>All projects</h2>
          <span className="tiny muted">
            {displayProjects.length} manuscript{displayProjects.length === 1 ? "" : "s"}
          </span>
        </div>
        <div className="panel" style={{ padding: "8px 24px" }}>
          {displayProjects.map((p) => (
            <div key={p.id} className="list-item">
              <div>
                <strong style={{ display: "block" }}>
                  <Link
                    href={`/projects/${p.id}/workspace`}
                    style={{ textDecoration: "none", color: "inherit" }}
                  >
                    {p.title}
                  </Link>
                </strong>
                <small>
                  {p.genre || "Genre not set"} · Active manuscript
                </small>
              </div>
              <Link href={`/projects/${p.id}/workspace`} className="btn small secondary">
                Open workspace
              </Link>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
