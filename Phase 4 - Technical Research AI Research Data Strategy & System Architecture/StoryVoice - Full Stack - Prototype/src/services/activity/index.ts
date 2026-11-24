import { localStore, StoredActivity } from "@/lib/local-store";
import { logger } from "@/lib/logger";

export class ActivityService {
  static async listActivities(projectId: string, _userId?: string): Promise<StoredActivity[]> {
    if (!localStore.activities) {
      localStore.activities = new Map();
    }
    let all = Array.from(localStore.activities.values()).filter(
      (a) => a.project_id === projectId
    );

    if (all.length === 0) {
      localStore.seedDefaultActivities(
        projectId,
        _userId || "00000000-0000-0000-0000-000000000001"
      );
      all = Array.from(localStore.activities.values()).filter(
        (a) => a.project_id === projectId
      );
    }

    // Sort descending by timestamp (newest first)
    all.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    return all;
  }

  static async log(params: {
    projectId: string;
    userId: string;
    type: "recording" | "transcript" | "transformation" | "acceptance" | "export";
    title: string;
    details: string;
    author?: string;
  }): Promise<StoredActivity> {
    const act = localStore.logActivity(params);
    logger.info("Project activity logged", {
      projectId: params.projectId,
      type: params.type,
      title: params.title,
    });
    return act;
  }
}
