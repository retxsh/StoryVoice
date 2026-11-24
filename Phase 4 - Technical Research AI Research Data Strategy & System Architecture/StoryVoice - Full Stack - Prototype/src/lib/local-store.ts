import { DEMO_USER_ID } from "./auth-helper";

export interface StoredProject {
  id: string;
  user_id: string;
  title: string;
  genre: string | null;
  description: string | null;
  notes: string | null;
  status: "in_progress" | "completed" | "archived";
  created_at: string;
  updated_at: string;
}

export interface StoredScene {
  id: string;
  project_id: string;
  user_id: string;
  title: string;
  description: string | null;
  canonical_text: string;
  word_count: number;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface StoredAudioAsset {
  id: string;
  project_id: string;
  user_id: string;
  title: string;
  storage_path: string;
  storage_bucket: string;
  mime_type: string;
  file_size_bytes: number;
  duration_seconds: number | null;
  source_type: "browser_recording" | "file_upload";
  status: "pending_verification" | "verified" | "transcribed" | "failed" | "deleted";
  created_at: string;
  updated_at: string;
}

export interface StoredTranscript {
  id: string;
  audio_asset_id: string;
  project_id: string;
  user_id: string;
  provider: string;
  model: string;
  current_revision_id: string;
  after_scene_id?: string | null;
  created_at: string;
  updated_at: string;
}

export interface StoredTranscriptRevision {
  id: string;
  transcript_id: string;
  user_id: string;
  revision_number: number;
  text: string;
  word_count: number;
  is_source: boolean;
  edit_summary: string | null;
  created_at: string;
}

export interface StoredDraft {
  id: string;
  project_id: string;
  user_id: string;
  source_transcript_id: string;
  source_revision_id: string;
  mode: "faithful" | "clean" | "readable";
  current_revision_id: string;
  status: "candidate" | "accepted" | "rejected" | "archived";
  accepted_scene_id: string | null;
  after_scene_id?: string | null;
  created_at: string;
  updated_at: string;
}

export interface StoredDraftRevision {
  id: string;
  draft_id: string;
  user_id: string;
  revision_number: number;
  text: string;
  word_count: number;
  is_initial_llm_output: boolean;
  author_type: "llm" | "writer_edit" | "restored_source";
  edit_summary: string | null;
  created_at: string;
}

export interface StoredContextItem {
  id: string;
  project_id: string;
  user_id: string;
  type: "Character" | "Location" | "Terminology" | "Approved story fact" | "Suggestion";
  name: string;
  detail: string;
  approved: boolean;
  origin: "writer_created" | "ai_suggested" | "imported";
  created_at: string;
  updated_at: string;
}

export interface StoredActivity {
  id: string;
  project_id: string;
  user_id: string;
  type: "recording" | "transcript" | "transformation" | "acceptance" | "export";
  title: string;
  details: string;
  author: string;
  created_at: string;
}

class MemoryStore {
  projects: Map<string, StoredProject> = new Map();
  scenes: Map<string, StoredScene> = new Map();
  audioAssets: Map<string, StoredAudioAsset> = new Map();
  transcripts: Map<string, StoredTranscript> = new Map();
  transcriptRevisions: Map<string, StoredTranscriptRevision> = new Map();
  drafts: Map<string, StoredDraft> = new Map();
  draftRevisions: Map<string, StoredDraftRevision> = new Map();
  contextItems: Map<string, StoredContextItem> = new Map();
  activities: Map<string, StoredActivity> = new Map();
  jobs: Map<string, any> = new Map();

  constructor() {
    this.seedDefaults();
  }

  private seedDefaults() {
    // Seed default demo project
    const defaultProjectId = "demo-project-1";
    this.projects.set(defaultProjectId, {
      id: defaultProjectId,
      user_id: DEMO_USER_ID,
      title: "The Last Light",
      genre: "Literary Mystery",
      description: "A literary mystery centred on a disappearance, a forgotten letter and the memories of a small coastal town.",
      notes: "First draft in progress.",
      status: "in_progress",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });

    // Seed default context items
    const sampleContext = [
      { id: "ctx-1", type: "Character" as const, name: "Mara Ellison", detail: "Protagonist and investigator", approved: true },
      { id: "ctx-2", type: "Location" as const, name: "Greyhaven Lighthouse", detail: "Located on the northern coast", approved: true },
      { id: "ctx-3", type: "Approved story fact" as const, name: "The lighthouse has been abandoned for eleven years.", detail: "Writer-approved", approved: true },
    ];

    sampleContext.forEach((c) => {
      this.contextItems.set(c.id, {
        id: c.id,
        project_id: defaultProjectId,
        user_id: DEMO_USER_ID,
        type: c.type,
        name: c.name,
        detail: c.detail,
        approved: c.approved,
        origin: "writer_created",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });
    });

    // Seed default scenes for the project
    this.seedDefaultScenes(defaultProjectId, DEMO_USER_ID);

    // Seed default activity log entries for the project
    this.seedDefaultActivities(defaultProjectId, DEMO_USER_ID);
  }

  seedDefaultActivities(projectId: string, userId: string) {
    const now = Date.now();
    const defaultActivities: StoredActivity[] = [
      {
        id: `act-1-${projectId}`,
        project_id: projectId,
        user_id: userId,
        type: "acceptance",
        title: "Accepted Chapter 3: The North Point to manuscript",
        details: "Promoted 26 words of accepted text into canonical manuscript.",
        author: "Writer",
        created_at: new Date(now - 1000 * 60 * 18).toISOString(),
      },
      {
        id: `act-2-${projectId}`,
        project_id: projectId,
        user_id: userId,
        type: "transformation",
        title: "Generated Readable Draft candidate",
        details: "Shaped spoken audio into literary prose structure without altering plot facts.",
        author: "Writer",
        created_at: new Date(now - 1000 * 60 * 25).toISOString(),
      },
      {
        id: `act-3-${projectId}`,
        project_id: projectId,
        user_id: userId,
        type: "recording",
        title: "Recorded audio pass for Chapter 3",
        details: "Captured browser audio recording via MediaRecorder (duration: 38s).",
        author: "Writer",
        created_at: new Date(now - 1000 * 60 * 30).toISOString(),
      },
      {
        id: `act-4-${projectId}`,
        project_id: projectId,
        user_id: userId,
        type: "acceptance",
        title: "Accepted Chapter 2: The Coast Road to manuscript",
        details: "Promoted 30 words of accepted text into canonical manuscript.",
        author: "Writer",
        created_at: new Date(now - 1000 * 60 * 60 * 2).toISOString(),
      },
      {
        id: `act-5-${projectId}`,
        project_id: projectId,
        user_id: userId,
        type: "acceptance",
        title: "Accepted Chapter 1: Arrival at Greyhaven to manuscript",
        details: "Initial chapter accepted with 34 words.",
        author: "Writer",
        created_at: new Date(now - 1000 * 60 * 60 * 5).toISOString(),
      },
    ];

    defaultActivities.forEach((a) => {
      if (!this.activities.has(a.id)) {
        this.activities.set(a.id, a);
      }
    });
  }

  logActivity(params: {
    projectId: string;
    userId: string;
    type: "recording" | "transcript" | "transformation" | "acceptance" | "export";
    title: string;
    details: string;
    author?: string;
  }) {
    if (!this.activities) {
      this.activities = new Map();
    }
    const id = crypto.randomUUID();
    const activity: StoredActivity = {
      id,
      project_id: params.projectId,
      user_id: params.userId,
      type: params.type,
      title: params.title,
      details: params.details,
      author: params.author || "Writer",
      created_at: new Date().toISOString(),
    };
    this.activities.set(id, activity);
    return activity;
  }

  seedDefaultScenes(projectId: string, userId: string) {
    const defaultScenes: StoredScene[] = [
      {
        id: "demo-scene-1",
        project_id: projectId,
        user_id: userId,
        title: "Chapter 1: Arrival at Greyhaven",
        description: "Mara arrives at the coastal village as the evening tide sets in.",
        canonical_text:
          "The salt air met me before the town even came into view. Greyhaven sat huddled between the jagged cliffs and the black water, its chimneys sending thin spirals of smoke into the darkening sky.",
        word_count: 34,
        sort_order: 1,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      {
        id: "demo-scene-2",
        project_id: projectId,
        user_id: userId,
        title: "Chapter 2: The Coast Road",
        description: "Driving along the eroding bluffs toward the north point.",
        canonical_text:
          "The gravel crunched beneath the tires, the narrow lane winding perilously close to the bluff edge. To the east, the sea surged relentlessly against the granite rocks below.",
        word_count: 30,
        sort_order: 2,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      {
        id: "demo-scene-3",
        project_id: projectId,
        user_id: userId,
        title: "Chapter 3: The North Point",
        description: "Approaching the headland where the old light stands silent.",
        canonical_text:
          "The trees fell away as the grade leveled out. Ahead stood the silhouette of the headland, rising dark against the gray swell of the ocean.",
        word_count: 26,
        sort_order: 3,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    ];

    defaultScenes.forEach((s) => {
      if (!this.scenes.has(s.id)) {
        this.scenes.set(s.id, s);
      }
    });
  }
}

// Global singleton to persist in Node process across hot reloads
const globalForStore = global as unknown as { localStore?: MemoryStore };
export const localStore = globalForStore.localStore || new MemoryStore();
if (process.env.NODE_ENV !== "production") globalForStore.localStore = localStore;
