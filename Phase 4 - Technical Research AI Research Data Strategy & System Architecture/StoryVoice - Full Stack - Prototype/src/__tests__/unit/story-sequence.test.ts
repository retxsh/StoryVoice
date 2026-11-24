import { describe, it, expect } from "vitest";
import { getNextSequenceDetails, SEQUENTIAL_STORY_TEMPLATES } from "@/lib/story-sequence";
import { ApprovalService } from "@/services/approval";
import { localStore } from "@/lib/local-store";

describe("Sequential Story & Add-on Capture", () => {
  const projectId = "test-sequence-proj";
  const userId = "00000000-0000-0000-0000-000000000001";

  it("calculates next scene title, sequence order, and narrative passage after demo-scene-1", () => {
    const scenes = [
      { id: "demo-scene-1", title: "Chapter 1: Arrival at Greyhaven", sort_order: 1 },
      { id: "demo-scene-2", title: "Chapter 2: The Coast Road", sort_order: 2 },
      { id: "demo-scene-3", title: "Chapter 3: The North Point", sort_order: 3 },
    ];

    const nextAfter1 = getNextSequenceDetails("demo-scene-1", scenes);
    expect(nextAfter1.order).toBe(2);
    expect(nextAfter1.title).toBe("Chapter 2: The Coast Road");
    expect(nextAfter1.spokenPassage).toContain("The gravel crunched beneath the tires");
    expect(nextAfter1.previousSceneTitle).toBe("Chapter 1: Arrival at Greyhaven");
  });

  it("calculates next scene in order after demo-scene-3 as Chapter 4", () => {
    const scenes = [
      { id: "demo-scene-1", title: "Chapter 1: Arrival at Greyhaven", sort_order: 1 },
      { id: "demo-scene-2", title: "Chapter 2: The Coast Road", sort_order: 2 },
      { id: "demo-scene-3", title: "Chapter 3: The North Point", sort_order: 3 },
    ];

    const nextAfter3 = getNextSequenceDetails("demo-scene-3", scenes);
    expect(nextAfter3.order).toBe(4);
    expect(nextAfter3.title).toBe("Chapter 4: The Keepers Steps");
    expect(nextAfter3.spokenPassage).toContain("A narrow stone staircase curved up into the dark interior");
  });

  it("appends to previous scene as an add-on when destinationMode is existing", async () => {
    localStore.seedDefaultScenes(projectId, userId);

    const prevScene = localStore.scenes.get("demo-scene-1")!;
    const originalText = prevScene.canonical_text;
    const addOnPassage = "The lantern on the porch flickered as Mara stepped onto the wooden deck.";

    const draftId = "draft-addon-1";
    const revId = "rev-addon-1";
    localStore.drafts.set(draftId, {
      id: draftId,
      project_id: projectId,
      user_id: userId,
      source_transcript_id: "trans-1",
      source_revision_id: "rev-src-1",
      mode: "readable",
      current_revision_id: revId,
      status: "candidate",
      accepted_scene_id: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });
    localStore.draftRevisions.set(revId, {
      id: revId,
      draft_id: draftId,
      user_id: userId,
      revision_number: 1,
      text: addOnPassage,
      word_count: addOnPassage.split(/\s+/).length,
      is_initial_llm_output: false,
      author_type: "writer_edit",
      edit_summary: "Add-on draft",
      created_at: new Date().toISOString(),
    });

    const result = await ApprovalService.acceptDraft(userId, {
      projectId,
      draftId,
      expectedDraftRevisionId: revId,
      destinationMode: "existing",
      existingSceneId: "demo-scene-1",
    });

    expect(result.success).toBe(true);
    expect(result.scene_id).toBe("demo-scene-1");

    const updatedScene = localStore.scenes.get("demo-scene-1")!;
    expect(updatedScene.canonical_text).toContain(originalText);
    expect(updatedScene.canonical_text).toContain(addOnPassage);
  });

  it("creates a new scene in exact sequential order after afterSceneId", async () => {
    localStore.seedDefaultScenes(projectId, userId);

    const draftId = "draft-new-seq-1";
    const revId = "rev-new-seq-1";
    const newPassage = "A narrow stone staircase curved up into the dark interior of the tower.";

    localStore.drafts.set(draftId, {
      id: draftId,
      project_id: projectId,
      user_id: userId,
      source_transcript_id: "trans-seq-1",
      source_revision_id: "rev-seq-src-1",
      mode: "readable",
      current_revision_id: revId,
      status: "candidate",
      accepted_scene_id: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });
    localStore.draftRevisions.set(revId, {
      id: revId,
      draft_id: draftId,
      user_id: userId,
      revision_number: 1,
      text: newPassage,
      word_count: newPassage.split(/\s+/).length,
      is_initial_llm_output: false,
      author_type: "writer_edit",
      edit_summary: "Sequence draft",
      created_at: new Date().toISOString(),
    });

    const result = await ApprovalService.acceptDraft(userId, {
      projectId,
      draftId,
      expectedDraftRevisionId: revId,
      destinationMode: "new",
      newSceneTitle: "Chapter 4: The Keepers Steps",
      newSceneDescription: "Climbing the spiral stairs inside the abandoned lighthouse tower.",
      afterSceneId: "demo-scene-3",
    });

    expect(result.success).toBe(true);
    const createdScene = localStore.scenes.get(result.scene_id)!;
    expect(createdScene.title).toBe("Chapter 4: The Keepers Steps");
    expect(createdScene.sort_order).toBe(4);
    expect(createdScene.canonical_text).toBe(newPassage);
  });
});
