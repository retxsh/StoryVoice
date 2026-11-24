import { describe, it, expect } from "vitest";

interface SimulatedDraft {
  id: string;
  projectId: string;
  userId: string;
  currentRevisionId: string;
  sourceTranscriptId: string;
  sourceRevisionId: string;
  status: "candidate" | "accepted" | "rejected";
}

interface SimulatedRevision {
  id: string;
  draftId: string;
  revisionNumber: number;
  text: string;
  wordCount: number;
}

interface SimulatedScene {
  id: string;
  projectId: string;
  title: string;
  canonicalText: string;
  wordCount: number;
}

function simulateAcceptance(params: {
  draft: SimulatedDraft;
  latestRevision: SimulatedRevision;
  expectedRevisionId: string;
  destination: "new" | "existing";
  existingScene?: SimulatedScene;
  newSceneTitle?: string;
}) {
  const { draft, latestRevision, expectedRevisionId, destination, existingScene, newSceneTitle } = params;

  // Stale check
  if (latestRevision.id !== expectedRevisionId) {
    throw new Error("STALE_DRAFT_CONFLICT: The draft was modified since you last reviewed it.");
  }

  // Already accepted check
  if (draft.status === "accepted") {
    throw new Error("DRAFT_ALREADY_ACCEPTED: This draft has already been accepted.");
  }

  if (destination === "new") {
    const scene: SimulatedScene = {
      id: "scene-new-123",
      projectId: draft.projectId,
      title: newSceneTitle || "Untitled Scene",
      canonicalText: latestRevision.text,
      wordCount: latestRevision.wordCount,
    };
    draft.status = "accepted";
    return { success: true, scene, action: "created_new_scene" };
  } else {
    if (!existingScene) throw new Error("TARGET_SCENE_NOT_FOUND");
    const updatedText = existingScene.canonicalText
      ? `${existingScene.canonicalText}\n\n${latestRevision.text}`
      : latestRevision.text;
    const words = updatedText.trim().split(/\s+/).length;

    existingScene.canonicalText = updatedText;
    existingScene.wordCount = words;
    draft.status = "accepted";
    return { success: true, scene: existingScene, action: "appended_to_scene" };
  }
}

describe("Acceptance Integrity & Stale Draft Protection", () => {
  it("successfully creates a new scene upon valid writer acceptance", () => {
    const draft: SimulatedDraft = {
      id: "draft-1",
      projectId: "proj-1",
      userId: "user-1",
      currentRevisionId: "rev-1",
      sourceTranscriptId: "trans-1",
      sourceRevisionId: "trans-rev-1",
      status: "candidate",
    };

    const revision: SimulatedRevision = {
      id: "rev-1",
      draftId: "draft-1",
      revisionNumber: 1,
      text: "I returned to the lighthouse that night.",
      wordCount: 7,
    };

    const result = simulateAcceptance({
      draft,
      latestRevision: revision,
      expectedRevisionId: "rev-1",
      destination: "new",
      newSceneTitle: "The Lighthouse",
    });

    expect(result.success).toBe(true);
    expect(result.scene.canonicalText).toBe("I returned to the lighthouse that night.");
    expect(result.scene.title).toBe("The Lighthouse");
    expect(draft.status).toBe("accepted");
  });

  it("aborts acceptance when the draft is stale (revision ID mismatch)", () => {
    const draft: SimulatedDraft = {
      id: "draft-1",
      projectId: "proj-1",
      userId: "user-1",
      currentRevisionId: "rev-2", // Updated by writer on another device
      sourceTranscriptId: "trans-1",
      sourceRevisionId: "trans-rev-1",
      status: "candidate",
    };

    const latestRevision: SimulatedRevision = {
      id: "rev-2",
      draftId: "draft-1",
      revisionNumber: 2,
      text: "I returned to the abandoned lighthouse that windy night.",
      wordCount: 8,
    };

    // Client attempts to accept an older revision (rev-1)
    expect(() => {
      simulateAcceptance({
        draft,
        latestRevision,
        expectedRevisionId: "rev-1", // Stale!
        destination: "new",
      });
    }).toThrowError(/STALE_DRAFT_CONFLICT/);

    expect(draft.status).toBe("candidate");
  });

  it("appends to an existing scene without overwriting existing paragraphs", () => {
    const draft: SimulatedDraft = {
      id: "draft-2",
      projectId: "proj-1",
      userId: "user-1",
      currentRevisionId: "rev-10",
      sourceTranscriptId: "trans-2",
      sourceRevisionId: "trans-rev-2",
      status: "candidate",
    };

    const revision: SimulatedRevision = {
      id: "rev-10",
      draftId: "draft-2",
      revisionNumber: 1,
      text: "The wooden door creaked open.",
      wordCount: 5,
    };

    const existingScene: SimulatedScene = {
      id: "scene-99",
      projectId: "proj-1",
      title: "Arrival",
      canonicalText: "I parked by the rocky shore.",
      wordCount: 6,
    };

    const result = simulateAcceptance({
      draft,
      latestRevision: revision,
      expectedRevisionId: "rev-10",
      destination: "existing",
      existingScene,
    });

    expect(result.success).toBe(true);
    expect(result.scene.canonicalText).toBe("I parked by the rocky shore.\n\nThe wooden door creaked open.");
    expect(result.scene.wordCount).toBe(11);
    expect(draft.status).toBe("accepted");
  });
});
