import Link from "next/link";
import { AudioRecorder } from "@/components/audio/AudioRecorder";
import { StageNav } from "@/components/navigation/StageNav";
import { SceneService } from "@/services/scene";
import { getNextSequenceDetails } from "@/lib/story-sequence";

export default async function RecordAudioPage({
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
  const backHref = afterSceneId
    ? `/projects/${projectId}/scenes/${afterSceneId}`
    : `/projects/${projectId}/capture`;

  return (
    <div>
      <StageNav
        currentStep={1}
        backHref={backHref}
        backLabel={afterSceneId ? "Back to scene" : "Back to capture options"}
        projectId={projectId}
        crumbCurrent={afterSceneId ? `Next scene (${nextInfo.title})` : "Live record"}
      />

      <div className="page-head">
        <div>
          <div className="eyebrow">
            {afterSceneId ? `SEQUENCE · SCENE ${nextInfo.order}` : "RECORD AUDIO"}
          </div>
          <h1>{afterSceneId ? nextInfo.title : "Capture the moment"}</h1>
          <p className="sub">
            {afterSceneId && nextInfo.previousSceneTitle
              ? `Recording next passage in manuscript sequence, following "${nextInfo.previousSceneTitle}".`
              : "A quiet space to speak your scene as it comes to you."}
          </p>
        </div>
      </div>

      <AudioRecorder
        projectId={projectId}
        initialTitle={nextInfo.recordingTitle}
        afterSceneId={afterSceneId}
        fallbackSpokenText={nextInfo.spokenPassage}
        sequenceOrder={nextInfo.order}
        previousSceneTitle={nextInfo.previousSceneTitle}
      />

      <div className="footer-actions">
        <Link href={backHref} className="btn secondary">
          ← {afterSceneId ? "Back to scene" : "Back to capture options"}
        </Link>
      </div>
    </div>
  );
}
