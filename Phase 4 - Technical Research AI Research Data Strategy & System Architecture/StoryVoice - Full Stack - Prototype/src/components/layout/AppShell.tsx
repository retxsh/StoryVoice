"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

interface AppShellProps {
  children: React.ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const pathname = usePathname();

  const toggleSidebar = () => setSidebarOpen((prev) => !prev);
  const closeSidebar = () => setSidebarOpen(false);

  // Extract projectId if current route is within a project
  const projectMatch = pathname.match(/\/projects\/([^/]+)/);
  const currentProjectId = projectMatch && projectMatch[1] !== "new" ? projectMatch[1] : null;

  return (
    <div className="app">
      <header className="topbar">
        <div className="row" style={{ gap: "14px" }}>
          <button
            type="button"
            className="mobile-nav-toggle"
            onClick={toggleSidebar}
            aria-label="Toggle navigation menu"
            aria-expanded={sidebarOpen}
          >
            ☰
          </button>
          <Link href="/projects" className="brand" onClick={closeSidebar}>
            <span className="brandmark">s</span>
            <span>storyvoice</span>
            <span className="tagline">Your voice. Your story.</span>
          </Link>
        </div>
        <div className="top-right">
          <span className="auth-badge desk-only">PERSISTENT WORKSPACE</span>
          <div className="avatar" aria-label="Writer profile" title="Writer Profile">
            W
          </div>
        </div>
      </header>

      {sidebarOpen && (
        <div
          className="sidebar-backdrop"
          onClick={closeSidebar}
          aria-hidden="true"
        />
      )}

      <div className="shell">
        <aside className={`sidebar ${sidebarOpen ? "open" : ""}`} id="sidebar">
          <div className="row between mobile-close-row">
            <span className="nav-label" style={{ padding: 0 }}>MENU</span>
            <button
              type="button"
              className="btn small quiet"
              onClick={closeSidebar}
              aria-label="Close menu"
            >
              ✕ Close
            </button>
          </div>

          <div className="nav-label">Workspace</div>
          <Link
            href="/projects"
            className={`nav-item ${pathname === "/projects" ? "active" : ""}`}
            onClick={closeSidebar}
          >
            <span className="ico">▦</span>Projects
          </Link>

          {(() => {
            const activeId = currentProjectId || "demo-project-1";
            return (
              <>
                <Link
                  href={`/projects/${activeId}/workspace`}
                  className={`nav-item ${pathname.includes("/workspace") ? "active" : ""}`}
                  onClick={closeSidebar}
                >
                  <span className="ico">▤</span>Project workspace
                </Link>
                <Link
                  href={`/projects/${activeId}/capture`}
                  className={`nav-item ${pathname.includes("/capture") ? "active" : ""}`}
                  onClick={closeSidebar}
                >
                  <span className="ico">◉</span>Capture
                </Link>
                <Link
                  href={`/projects/${activeId}/context`}
                  className={`nav-item ${pathname.includes("/context") ? "active" : ""}`}
                  onClick={closeSidebar}
                >
                  <span className="ico">✳</span>Story context
                </Link>
                <Link
                  href={`/projects/${activeId}/export`}
                  className={`nav-item ${pathname.includes("/export") ? "active" : ""}`}
                  onClick={closeSidebar}
                >
                  <span className="ico">↗</span>Export
                </Link>
                <Link
                  href="/projects/new"
                  className={`nav-item ${pathname === "/projects/new" ? "active" : ""}`}
                  onClick={closeSidebar}
                >
                  <span className="ico">＋</span>New project
                </Link>
              </>
            );
          })()}

          <div className="nav-label" style={{ marginTop: "17px" }}>
            Preferences
          </div>
          <Link
            href="/settings"
            className={`nav-item ${pathname === "/settings" ? "active" : ""}`}
            onClick={closeSidebar}
          >
            <span className="ico">⚙</span>Settings
          </Link>

          <div className="sidebar-bottom">
            A quieter way from spoken thought to manuscript.
            <br />
            <span style={{ color: "#9a9ea2" }}>Protected with Supabase RLS.</span>
          </div>
        </aside>

        <main className="main" id="main" tabIndex={-1}>
          {children}
        </main>
      </div>
    </div>
  );
}
