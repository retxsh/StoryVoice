import Link from "next/link";
import { StageNav } from "@/components/navigation/StageNav";
import { SceneService } from "@/services/scene";
import { getNextSequenceDetails } from "@/lib/story-sequence";

export default async function CaptureChoicePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams?: Promise<{ afterSceneId?: string }>;
}) {
  const { id: projectId } = await params;
  const sParams = searchParams ? await searchParams : {};
  const afterSceneId = sParams.afterSceneId;

  const scenes = await SceneService.listScenes(projectId, "00000000-0000-0000-0000-000000000001");
  const nextInfo = getNextSequenceDetails(afterSceneId, scenes);
  const querySuffix = afterSceneId ? `?afterSceneId=${afterSceneId}` : "";

  return (
    <div>
      <StageNav
        currentStep={1}
        backHref={afterSceneId ? `/projects/${projectId}/scenes/${afterSceneId}` : `/projects/${projectId}/workspace`}
        backLabel={afterSceneId ? "Back to scene" : "Back to project"}
        projectId={projectId}
        crumbCurrent="Capture"
      />

      <div className="page-head">
        <div>
          <div className="eyebrow">{afterSceneId ? "CAPTURE NEXT SCENE" : "CAPTURE"}</div>
          <h1>{afterSceneId ? "Continue your manuscript" : "Bring a scene into StoryVoice"}</h1>
          <p className="sub">
            {afterSceneId && nextInfo.previousSceneTitle
              ? `Capturing next scene in sequence following "${nextInfo.previousSceneTitle}" (Scene ${nextInfo.order}).`
              : "Choose how you want to capture this piece of your story."}
          </p>
        </div>
      </div>

      <div className="two">
        <Link
          href={`/projects/${projectId}/capture/record${querySuffix}`}
          className="panel"
          style={{ textDecoration: "none", color: "inherit", padding: "28px", cursor: "pointer", display: "flex", flexDirection: "column" }}
        >
          <div style={{ fontSize: "32px", color: "var(--blue)" }}>◉</div>
          <h2 style={{ marginTop: "14px", fontSize: "17px" }}>Record audio</h2>
          <p className="muted tiny" style={{ margin: "6px 0 20px", fontSize: "12px", lineHeight: "1.6", flex: 1 }}>
            Capture a new spoken thought, scene or dialogue passage directly with your browser recorder.
          </p>
          <div>
            <span className="btn primary small">Start recording →</span>
          </div>
        </Link>

        <Link
          href={`/projects/${projectId}/capture/import${querySuffix}`}
          className="panel"
          style={{ textDecoration: "none", color: "inherit", padding: "28px", cursor: "pointer", display: "flex", flexDirection: "column" }}
        >
          <div style={{ fontSize: "32px", color: "var(--blue)" }}>↥</div>
          <h2 style={{ marginTop: "14px", fontSize: "17px" }}>Import audio</h2>
          <p className="muted tiny" style={{ margin: "6px 0 20px", fontSize: "12px", lineHeight: "1.6", flex: 1 }}>
            Bring in an existing recording made with your phone, field recorder, or external application.
          </p>
          <div>
            <span className="btn secondary small">Choose a file →</span>
          </div>
        </Link>
      </div>

      <div className="footer-actions">
        <Link href={afterSceneId ? `/projects/${projectId}/scenes/${afterSceneId}` : `/projects/${projectId}/workspace`} className="btn secondary">
          ← {afterSceneId ? "Back to scene" : "Back to project workspace"}
        </Link>
      </div>
    </div>
  );
}
