"use client";

import { useState, useEffect, use } from "react";
import Link from "next/link";
import { BackButton } from "@/components/navigation/BackButton";

interface ContextItem {
  id: string;
  type: "Character" | "Location" | "Terminology" | "Approved story fact" | "Suggestion";
  name: string;
  detail: string;
  approved: boolean;
}

export default function StoryContextPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: projectId } = use(params);
  const [items, setItems] = useState<ContextItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<ContextItem | null>(null);

  const [formType, setFormType] = useState<ContextItem["type"]>("Character");
  const [formName, setFormName] = useState("");
  const [formDetail, setFormDetail] = useState("");
  const [formApproved, setFormApproved] = useState(true);

  useEffect(() => {
    async function loadContext() {
      try {
        const res = await fetch(`/api/projects/${projectId}/context`);
        if (res.ok) {
          const data = await res.json();
          setItems(data.items || []);
        } else {
          // Sample fallback
          setItems([
            { id: "1", type: "Character", name: "Mara Ellison", detail: "Protagonist and investigator", approved: true },
            { id: "2", type: "Location", name: "Greyhaven Lighthouse", detail: "Located on the northern rocky coast", approved: true },
            { id: "3", type: "Approved story fact", name: "The lighthouse has been abandoned for eleven years.", detail: "Writer-approved canon", approved: true },
            { id: "4", type: "Approved story fact", name: "Mara's father disappeared before the lighthouse was abandoned.", detail: "Writer-approved canon", approved: true },
            { id: "5", type: "Suggestion", name: "A mysterious journal was found in the car.", detail: "Unapproved idea", approved: false },
          ]);
        }
      } catch {
        setItems([
          { id: "1", type: "Character", name: "Mara Ellison", detail: "Protagonist and investigator", approved: true },
          { id: "2", type: "Location", name: "Greyhaven Lighthouse", detail: "Located on the northern rocky coast", approved: true },
        ]);
      } finally {
        setLoading(false);
      }
    }
    loadContext();
  }, [projectId]);

  const openAddModal = () => {
    setEditingItem(null);
    setFormType("Character");
    setFormName("");
    setFormDetail("");
    setFormApproved(true);
    setModalOpen(true);
  };

  const openEditModal = (item: ContextItem) => {
    setEditingItem(item);
    setFormType(item.type);
    setFormName(item.name);
    setFormDetail(item.detail);
    setFormApproved(item.approved);
    setModalOpen(true);
  };

  const handleSaveModal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) return;

    if (editingItem) {
      try {
        await fetch(`/api/projects/${projectId}/context/${editingItem.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            type: formType,
            name: formName.trim(),
            detail: formDetail.trim(),
            approved: formApproved,
          }),
        });
      } catch {}

      setItems((prev) =>
        prev.map((x) =>
          x.id === editingItem.id
            ? { ...x, type: formType, name: formName.trim(), detail: formDetail.trim(), approved: formApproved }
            : x
        )
      );
    } else {
      const newItem: ContextItem = {
        id: crypto.randomUUID(),
        type: formType,
        name: formName.trim(),
        detail: formDetail.trim(),
        approved: formApproved,
      };

      try {
        await fetch(`/api/projects/${projectId}/context`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(newItem),
        });
      } catch {}

      setItems((prev) => [...prev, newItem]);
    }

    setModalOpen(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this story context item?")) return;

    try {
      await fetch(`/api/projects/${projectId}/context/${id}`, {
        method: "DELETE",
      });
    } catch {}

    setItems((prev) => prev.filter((x) => x.id !== id));
  };

  return (
    <div>
      <div className="stage-nav-bar">
        <BackButton href={`/projects/${projectId}/workspace`} label="Back to workspace" />
        <div className="crumb">
          <Link href={`/projects/${projectId}/workspace`}>Project</Link>
          <span className="crumb-separator">/</span>
          <span>Story context</span>
        </div>
      </div>

      <div className="page-head">
        <div>
          <div className="eyebrow">STORY CONTEXT</div>
          <h1>Your project, in your words</h1>
          <p className="sub">A small, writer-controlled reference shelf for characters, locations, vocabulary, and approved story facts.</p>
        </div>
        <button type="button" className="btn primary" onClick={openAddModal}>
          ＋ Add context item
        </button>
      </div>

      <div className="notice" style={{ marginBottom: "20px" }}>
        Context informs transcription and transformation. It never dictates story events. Only items marked as <strong>Writer-approved</strong> are eligible to be passed as reference to language models.
      </div>

      <div className="panel" style={{ padding: "18px 24px" }}>
        {items.length > 0 ? (
          items.map((x) => (
            <div key={x.id} className="list-item" style={{ alignItems: "flex-start", padding: "16px 0", flexWrap: "wrap", gap: "12px" }}>
              <div style={{ display: "flex", gap: "14px", alignItems: "flex-start", flex: "1 1 280px" }}>
                <div
                  style={{
                    width: "36px",
                    height: "36px",
                    background: "#edf3f7",
                    borderRadius: "9px",
                    display: "grid",
                    placeItems: "center",
                    color: "var(--blue)",
                    flexShrink: 0,
                    fontSize: "16px",
                  }}
                >
                  {x.type === "Character" ? "♙" : x.type === "Location" ? "⌖" : "✳"}
                </div>
                <div>
                  <div className="row" style={{ flexWrap: "wrap", gap: "8px" }}>
                    <strong style={{ fontSize: "14px" }}>{x.name}</strong>
                    <span className={`tag ${x.approved ? "approved" : ""}`}>
                      {x.approved ? "✓ Writer-approved" : "Suggestion"}
                    </span>
                    <span className="tag">{x.type}</span>
                  </div>
                  {x.detail && <p className="tiny muted" style={{ margin: "5px 0 0", fontSize: "12px", lineHeight: "1.5" }}>{x.detail}</p>}
                </div>
              </div>

              <div className="action-row" style={{ flexShrink: 0 }}>
                <button type="button" className="btn small secondary" onClick={() => openEditModal(x)}>
                  Edit
                </button>
                <button type="button" className="btn small danger" onClick={() => handleDelete(x.id)}>
                  Delete
                </button>
              </div>
            </div>
          ))
        ) : (
          <div style={{ textAlign: "center", padding: "48px 20px" }}>
            <div style={{ font: "36px var(--serif)", color: "#9eabb3" }}>✳</div>
            <h3 style={{ fontSize: "15px", margin: "10px 0 6px" }}>No context items yet</h3>
            <p className="tiny muted" style={{ fontSize: "12px", maxWidth: "360px", margin: "0 auto" }}>
              Add names, locations, and facts when they become useful. This is completely optional.
            </p>
            <button type="button" className="btn small primary" onClick={openAddModal} style={{ marginTop: "16px" }}>
              Add first context item
            </button>
          </div>
        )}
      </div>

      <div className="panel" style={{ padding: "24px" }}>
        <div className="panel-head">
          <h3 style={{ fontSize: "14px" }}>Using context in candidate drafts</h3>
          <span className="tag approved">Writer-controlled</span>
        </div>
        <p className="tiny muted" style={{ lineHeight: "1.6", fontSize: "13px" }}>
          When enabled during transformation, approved items help preserve proper spelling and canonical references. Context is shown during review. No AI-inferred facts are ever automatically approved into your manuscript.
        </p>
      </div>

      <div className="footer-actions">
        <Link href={`/projects/${projectId}/workspace`} className="btn secondary">
          ← Back to project workspace
        </Link>
        <button type="button" className="btn primary" onClick={openAddModal}>
          ＋ Add another context item
        </button>
      </div>

      {modalOpen && (
        <div className="modal-backdrop">
          <div className="modal-content">
            <h2 style={{ fontSize: "18px", margin: "0 0 16px" }}>{editingItem ? "Edit story context" : "Add story context item"}</h2>
            <form onSubmit={handleSaveModal}>
              <div className="field">
                <label htmlFor="contextType">Type</label>
                <select
                  id="contextType"
                  value={formType}
                  onChange={(e) => setFormType(e.target.value as any)}
                >
                  <option value="Character">Character</option>
                  <option value="Location">Location</option>
                  <option value="Terminology">Terminology</option>
                  <option value="Approved story fact">Approved story fact</option>
                  <option value="Suggestion">Suggestion</option>
                </select>
              </div>

              <div className="field">
                <label htmlFor="contextName">Name or statement</label>
                <input
                  id="contextName"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="e.g. Mara Ellison or North Tower"
                  required
                  autoFocus
                />
              </div>

              <div className="field">
                <label htmlFor="contextDetail">Description / Notes (optional)</label>
                <textarea
                  id="contextDetail"
                  value={formDetail}
                  onChange={(e) => setFormDetail(e.target.value)}
                  placeholder="Details to help preserve continuity…"
                  rows={3}
                />
              </div>

              <label style={{ display: "flex", gap: "9px", alignItems: "center", fontSize: "12px", margin: "16px 0", cursor: "pointer" }}>
                <input
                  type="checkbox"
                  checked={formApproved}
                  onChange={(e) => setFormApproved(e.target.checked)}
                  style={{ accentColor: "var(--blue)", width: "16px", height: "16px" }}
                />
                <span>Mark as writer-approved (eligible for LLM reference)</span>
              </label>

              <div className="modal-actions">
                <button type="button" className="btn secondary" onClick={() => setModalOpen(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn primary" style={{ minWidth: "120px" }}>
                  {editingItem ? "Save changes" : "Add item"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
