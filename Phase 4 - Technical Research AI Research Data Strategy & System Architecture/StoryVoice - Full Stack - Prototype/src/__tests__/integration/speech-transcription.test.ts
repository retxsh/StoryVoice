import { describe, it, expect, beforeEach } from "vitest";
import { AudioService } from "@/services/audio";
import { TranscriptionService } from "@/services/transcription";
import { TransformationService } from "@/services/transformation";
import { localStore } from "@/lib/local-store";

describe("Real Speech Capture & Transcription Flow", () => {
  const userId = "00000000-0000-0000-0000-000000000001";
  const projectId = "demo-project-1";

  beforeEach(() => {
    localStore.audioAssets.clear();
    localStore.transcripts.clear();
    localStore.transcriptRevisions.clear();
    localStore.drafts.clear();
    localStore.draftRevisions.clear();
  });

  it("captures real spoken text and stores it as the source transcript", async () => {
    // 1. Request upload
    const uploadReq = await AudioService.requestUpload({
      userId,
      projectId,
      title: "Chapter 1 Spoken Scene",
      mimeType: "audio/webm",
      fileSizeBytes: 65536,
      sourceType: "browser_recording",
    });

    expect(uploadReq.audioAssetId).toBeDefined();

    // 2. Confirm upload with REAL spoken transcript
    const spokenText = "The heavy iron door swung open with a slow creak, revealing a corridor lined with dusty portraits.";
    const durationSeconds = 6;

    const confirmResult = await AudioService.confirmUpload(uploadReq.audioAssetId, userId, {
      clientTranscript: spokenText,
      durationSeconds,
    });

    expect(confirmResult.success).toBe(true);
    expect(confirmResult.transcriptId).toBeDefined();

    // 3. Verify retrieved transcript has the REAL spoken text and duration
    const retrieved = await TranscriptionService.getTranscript(confirmResult.transcriptId, userId);
    expect(retrieved).not.toBeNull();
    expect(retrieved?.currentRevision?.text).toBe(spokenText);
    expect(retrieved?.currentRevision?.word_count).toBe(spokenText.split(/\s+/).length);
    expect(retrieved?.transcript.provider).toBe("browser_speech_recognition");

    // 4. Transform candidate draft from the real spoken transcript
    const transformResult = await TransformationService.processDraftTransformation({
      userId,
      projectId,
      transcriptId: confirmResult.transcriptId,
      sourceRevisionId: confirmResult.revisionId,
      mode: "readable",
      useContext: false,
    });

    expect(transformResult.text).toContain("iron door");
    expect(transformResult.text).toContain("dusty portraits");

    // Verify draft retrieval preserves the real spoken text as sourceRevision
    const draft = await TransformationService.getDraft(transformResult.draftId, userId);
    expect(draft?.sourceRevision?.text).toBe(spokenText);
    expect(draft?.currentRevision?.text).toBe(transformResult.text);
  });
});
