"use client";

import Link from "next/link";
import { useState } from "react";
import { BackButton } from "@/components/navigation/BackButton";

export default function SettingsPage() {
  const [typography, setTypography] = useState("serif");
  const [density, setDensity] = useState("comfortable");

  return (
    <div style={{ maxWidth: "740px", margin: "0 auto" }}>
      <div className="stage-nav-bar">
        <BackButton href="/projects" label="Back to projects" />
        <div className="crumb">
          <Link href="/projects">Projects</Link>
          <span className="crumb-separator">/</span>
          <span>Preferences & settings</span>
        </div>
      </div>

      <div className="page-head">
        <div>
          <div className="eyebrow">PREFERENCES</div>
          <h1>Settings</h1>
          <p className="sub">Personal writing choices and privacy guarantees for your manuscript workspace.</p>
        </div>
      </div>

      <div className="panel" style={{ padding: "28px" }}>
        <h3 style={{ fontSize: "15px" }}>Writer identity</h3>
        <div className="row between" style={{ padding: "12px 0 16px" }}>
          <div>
            <strong style={{ fontSize: "14px" }}>Local writer workspace</strong>
            <p className="tiny muted" style={{ fontSize: "12px", marginTop: "4px" }}>
              writer@storyvoice.dev · Supabase Row Level Security protected
            </p>
          </div>
          <div className="avatar" style={{ width: "36px", height: "36px", fontSize: "14px" }}>W</div>
        </div>

        <hr style={{ border: 0, borderTop: "1px solid var(--line)", margin: "20px 0" }} />

        <h3 style={{ fontSize: "15px" }}>Editorial typography & spacing</h3>
        <div className="field">
          <label htmlFor="typePreference">Manuscript typography</label>
          <select
            id="typePreference"
            value={typography}
            onChange={(e) => setTypography(e.target.value)}
          >
            <option value="serif">Literary serif (Newsreader / Georgia)</option>
            <option value="sans">Contemporary sans-serif (DM Sans)</option>
          </select>
          <span className="hint">Sets the reading and editing typography across your drafts and scenes.</span>
        </div>

        <div className="field">
          <label htmlFor="density">Interface density</label>
          <select
            id="density"
            value={density}
            onChange={(e) => setDensity(e.target.value)}
          >
            <option value="comfortable">Comfortable editorial spacing (Default)</option>
            <option value="compact">Compact layout for smaller displays</option>
          </select>
        </div>

        <hr style={{ border: 0, borderTop: "1px solid var(--line)", margin: "24px 0" }} />

        <h3 style={{ fontSize: "15px" }}>Privacy & Data Sovereignty</h3>
        <p className="tiny muted" style={{ lineHeight: "1.7", fontSize: "12px" }}>
          StoryVoice enforces Row Level Security on all audio assets, transcripts, candidate drafts, and scenes. Original spoken recordings are preserved in encrypted private storage and never used to train public language models.
        </p>

        <div className="footer-actions" style={{ marginTop: "28px", paddingTop: "18px" }}>
          <Link href="/projects" className="btn secondary">
            ← Return to projects
          </Link>
          <span className="tiny muted">Settings persist across sessions</span>
        </div>
      </div>
    </div>
  );
}
