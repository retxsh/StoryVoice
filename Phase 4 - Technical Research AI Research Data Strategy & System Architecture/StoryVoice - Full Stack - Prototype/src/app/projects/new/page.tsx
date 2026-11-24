"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { BackButton } from "@/components/navigation/BackButton";

export default function CreateProjectPage() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [genre, setGenre] = useState("");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setError("Add a title to continue.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim() || null,
          genre: genre || null,
          notes: notes.trim() || null,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to create project");

      router.push(`/projects/${data.project.id}/workspace`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to create project";
      setError(msg);
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: "700px", margin: "0 auto" }}>
      <div className="stage-nav-bar">
        <BackButton href="/projects" label="Back to projects" />
        <div className="crumb">
          <Link href="/projects">Projects</Link>
          <span className="crumb-separator">/</span>
          <span>New</span>
        </div>
      </div>

      <div className="page-head">
        <div>
          <div className="eyebrow">START SOMETHING NEW</div>
          <h1>Create project</h1>
          <p className="sub">Every great book starts with a single spoken line.</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="panel" style={{ padding: "28px" }}>
        {error && (
          <div className="notice error" style={{ marginBottom: "18px" }}>
            {error}
          </div>
        )}

        <div className="field">
          <label htmlFor="title">
            Project title <span style={{ color: "var(--blue)" }}>*</span>
          </label>
          <input
            id="title"
            type="text"
            placeholder="e.g. The Lighthouse at Midnight"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            disabled={loading}
            autoFocus
          />
          <div className="hint">
            You can always change the title later as your manuscript develops.
          </div>
        </div>

        <div className="field">
          <label htmlFor="genre">Genre</label>
          <select
            id="genre"
            value={genre}
            onChange={(e) => setGenre(e.target.value)}
            disabled={loading}
          >
            <option value="">Select a genre (optional)</option>
            <option value="Literary Fiction">Literary Fiction</option>
            <option value="Literary Mystery">Literary Mystery</option>
            <option value="Historical Fiction">Historical Fiction</option>
            <option value="Science Fiction">Science Fiction</option>
            <option value="Fantasy">Fantasy</option>
            <option value="Thriller / Suspense">Thriller / Suspense</option>
            <option value="Memoir / Personal Essay">Memoir / Personal Essay</option>
            <option value="Speculative Fiction">Speculative Fiction</option>
          </select>
        </div>

        <div className="field">
          <label htmlFor="description">Premise / Description</label>
          <textarea
            id="description"
            rows={3}
            placeholder="A brief overview of your story's core conflict, world, or protagonist..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            disabled={loading}
          />
          <div className="hint">
            StoryVoice will reference this premise to provide grounded, voice-aligned AI transformations.
          </div>
        </div>

        <div className="field">
          <label htmlFor="notes">Initial notes or working ideas</label>
          <textarea
            id="notes"
            rows={2}
            placeholder="Themes, character names, or opening spoken lines..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            disabled={loading}
          />
        </div>

        <div className="footer-actions" style={{ marginTop: "28px", paddingTop: "18px" }}>
          <Link href="/projects" className="btn secondary">
            ← Cancel
          </Link>
          <button type="submit" className="btn primary" disabled={loading} style={{ minWidth: "160px" }}>
            {loading ? "Creating project..." : "Create project →"}
          </button>
        </div>
      </form>
    </div>
  );
}
