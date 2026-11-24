import { SpeechToTextAdapter, TranscribeAudioParams, TranscriptionResult, CanonicalTranscriptWord } from "../types";
import { logger } from "@/lib/logger";

export class OpenAIWhisperAdapter implements SpeechToTextAdapter {
  name = "whisper";
  private apiKey: string;

  constructor(apiKey?: string) {
    this.apiKey = apiKey || process.env.OPENAI_API_KEY || "";
  }

  async transcribe(params: TranscribeAudioParams): Promise<TranscriptionResult> {
    if (!this.apiKey) {
      throw new Error("OPENAI_API_KEY is not configured");
    }

    const { audioBuffer, mimeType, vocabulary } = params;

    if (!audioBuffer) {
      throw new Error("OpenAI Whisper requires a local audio buffer");
    }

    // Prepare multipart form data
    const formData = new FormData();
    const uint8Array = new Uint8Array(audioBuffer);
    const blob = new Blob([uint8Array], { type: mimeType || "audio/webm" });
    formData.append("file", blob, "recording.webm");
    formData.append("model", "whisper-1");
    formData.append("response_format", "verbose_json");

    // Bias with fiction vocabulary in prompt if provided
    if (vocabulary.length > 0) {
      formData.append("prompt", `Fiction terms: ${vocabulary.join(", ")}`);
    }

    logger.info("Calling OpenAI Whisper-1 API");

    const response = await fetch("https://api.openai.com/v1/audio/transcriptions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: formData,
    });

    if (!response.ok) {
      const errText = await response.text();
      logger.error("Whisper API error", { status: response.status, error: errText });
      throw new Error(`OpenAI Whisper failed (${response.status}): ${errText}`);
    }

    const data = await response.json();
    const words: CanonicalTranscriptWord[] = (data.words || []).map((w: any) => ({
      word: w.word,
      start: w.start,
      end: w.end,
      confidence: 1.0,
    }));

    return {
      text: data.text || "",
      words,
      provider: "openai",
      model: "whisper-1",
      durationSeconds: data.duration,
      rawResponse: data,
    };
  }
}
