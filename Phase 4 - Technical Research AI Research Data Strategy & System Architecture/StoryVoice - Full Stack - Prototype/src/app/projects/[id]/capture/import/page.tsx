import Link from "next/link";
import { AudioImporter } from "@/components/audio/AudioImporter";
import { StageNav } from "@/components/navigation/StageNav";

export default async function ImportAudioPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: projectId } = await params;

  return (
    <div>
      <StageNav
        currentStep={1}
        backHref={`/projects/${projectId}/capture`}
        backLabel="Back to capture options"
        projectId={projectId}
        crumbCurrent="Import audio"
      />

      <div className="page-head">
        <div>
          <div className="eyebrow">IMPORT AUDIO</div>
          <h1>Bring in a recording</h1>
          <p className="sub">Select a local audio recording to ingest and transcribe into StoryVoice.</p>
        </div>
      </div>

      <AudioImporter projectId={projectId} />

      <div className="footer-actions">
        <Link href={`/projects/${projectId}/capture`} className="btn secondary">
          ← Back to capture options
        </Link>
      </div>
    </div>
  );
}
