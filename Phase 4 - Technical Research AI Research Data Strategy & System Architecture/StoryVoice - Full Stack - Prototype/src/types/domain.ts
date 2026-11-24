import { z } from "zod";

export const ProjectSchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  title: z.string().min(1, "Title is required").max(120),
  genre: z.string().max(80).nullable(),
  description: z.string().max(1000).nullable(),
  notes: z.string().max(4000).nullable(),
  status: z.enum(["in_progress", "completed", "archived"]),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export type Project = z.infer<typeof ProjectSchema>;

export const SceneSchema = z.object({
  id: z.string().uuid(),
  projectId: z.string().uuid(),
  userId: z.string().uuid(),
  title: z.string().min(1, "Scene title is required"),
  description: z.string().nullable(),
  canonicalText: z.string(),
  wordCount: z.number().int().nonnegative(),
  sortOrder: z.number().int(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export type Scene = z.infer<typeof SceneSchema>;

export const StoryContextItemSchema = z.object({
  id: z.string().uuid(),
  projectId: z.string().uuid(),
  userId: z.string().uuid(),
  type: z.enum(["Character", "Location", "Terminology", "Approved story fact", "Suggestion"]),
  name: z.string().min(1, "Name or fact is required").max(240),
  detail: z.string().max(500).default(""),
  approved: z.boolean().default(false),
  origin: z.enum(["writer_created", "ai_suggested", "imported"]).default("writer_created"),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export type StoryContextItem = z.infer<typeof StoryContextItemSchema>;

export const TransformationModeSchema = z.enum(["faithful", "clean", "readable"]);
export type TransformationMode = z.infer<typeof TransformationModeSchema>;

export const DraftAcceptanceSchema = z.object({
  projectId: z.string().min(1),
  draftId: z.string().min(1),
  expectedDraftRevisionId: z.string().min(1),
  destinationMode: z.enum(["new", "existing", "unassigned"]),
  existingSceneId: z.string().nullable().optional(),
  newSceneTitle: z.string().max(120).nullable().optional(),
  newSceneDescription: z.string().max(500).nullable().optional(),
  afterSceneId: z.string().nullable().optional(),
});

export type DraftAcceptanceRequest = z.infer<typeof DraftAcceptanceSchema>;
