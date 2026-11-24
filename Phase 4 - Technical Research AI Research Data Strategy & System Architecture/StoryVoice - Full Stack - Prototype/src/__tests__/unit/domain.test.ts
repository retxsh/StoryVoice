import { describe, it, expect } from "vitest";
import {
  ProjectSchema,
  SceneSchema,
  StoryContextItemSchema,
  TransformationModeSchema,
  DraftAcceptanceSchema,
} from "@/types/domain";

describe("Domain Models & Validation", () => {
  it("validates a compliant project entity", () => {
    const validProject = {
      id: "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11",
      userId: "b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22",
      title: "The Lighthouse at Midnight",
      genre: "Literary Mystery",
      description: "A coastal mystery.",
      notes: "First draft",
      status: "in_progress" as const,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const parsed = ProjectSchema.safeParse(validProject);
    expect(parsed.success).toBe(true);
  });

  it("rejects a project missing a required title", () => {
    const invalidProject = {
      id: "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11",
      userId: "b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22",
      title: "",
      genre: null,
      description: null,
      notes: null,
      status: "in_progress",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const parsed = ProjectSchema.safeParse(invalidProject);
    expect(parsed.success).toBe(false);
  });

  it("validates the three scoped transformation modes", () => {
    expect(TransformationModeSchema.safeParse("faithful").success).toBe(true);
    expect(TransformationModeSchema.safeParse("clean").success).toBe(true);
    expect(TransformationModeSchema.safeParse("readable").success).toBe(true);
    expect(TransformationModeSchema.safeParse("creative_rewrite").success).toBe(false);
  });

  it("validates story context items and enforces approval flag", () => {
    const item = {
      id: "c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a33",
      projectId: "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11",
      userId: "b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22",
      type: "Character" as const,
      name: "Mara Ellison",
      detail: "Protagonist and lighthouse investigator",
      approved: true,
      origin: "writer_created" as const,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const parsed = StoryContextItemSchema.safeParse(item);
    expect(parsed.success).toBe(true);
  });

  it("validates draft acceptance schema parameters", () => {
    const validAcceptance = {
      projectId: "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11",
      draftId: "d0eebc99-9c0b-4ef8-bb6d-6bb9bd380a44",
      expectedDraftRevisionId: "e0eebc99-9c0b-4ef8-bb6d-6bb9bd380a55",
      destinationMode: "new" as const,
      newSceneTitle: "Chapter 1: The Return",
      newSceneDescription: "Mara arrives at the coast.",
    };

    const parsed = DraftAcceptanceSchema.safeParse(validAcceptance);
    expect(parsed.success).toBe(true);
  });
});
