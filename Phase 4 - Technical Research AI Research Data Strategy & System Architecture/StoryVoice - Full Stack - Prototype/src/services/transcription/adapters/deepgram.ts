import { SpeechToTextAdapter, TranscribeAudioParams, TranscriptionResult, CanonicalTranscriptWord } from "../types";
import { logger } from "@/lib/logger";

export class DeepgramAdapter implements SpeechToTextAdapter {
  name = "deepgram";
  private apiKey: string;

  constructor(apiKey?: string) {
    this.apiKey = apiKey || process.env.DEEPGRAM_API_KEY || "";
  }

  async transcribe(params: TranscribeAudioParams): Promise<TranscriptionResult> {
    if (!this.apiKey) {
      throw new Error("DEEPGRAM_API_KEY is not configured");
    }

    const { audioBuffer, audioUrl, mimeType, vocabulary } = params;

    const url = new URL("https://api.deepgram.com/v1/listen");
    url.searchParams.set("model", "nova-3");
    url.searchParams.set("smart_format", "true");
    url.searchParams.set("punctuate", "true");
    url.searchParams.set("paragraphs", "true");

    // Fiction vocabulary keyword biasing
    vocabulary.forEach((term) => {
      url.searchParams.append("keywords", `${term.trim()}:2.0`);
    });

    let headers: Record<string, string> = {
      Authorization: `Token ${this.apiKey}`,
    };

    let body: any;

    if (audioBuffer) {
      headers["Content-Type"] = mimeType || "audio/webm";
      body = audioBuffer;
    } else if (audioUrl) {
      headers["Content-Type"] = "application/json";
      body = JSON.stringify({ url: audioUrl });
    } else {
      throw new Error("Either audioBuffer or audioUrl must be provided to DeepgramAdapter");
    }

    logger.info("Calling Deepgram Nova-3 API", { keywordsCount: vocabulary.length });

    const response = await fetch(url.toString(), {
      method: "POST",
      headers,
      body,
    });

    if (!response.ok) {
      const errText = await response.text();
      logger.error("Deepgram API request failed", { status: response.status, error: errText });
      throw new Error(`Deepgram transcription failed (${response.status}): ${errText}`);
    }

    const data = await response.json();
    const channel = data.results?.channels?.[0];
    const alternative = channel?.alternatives?.[0];

    const transcriptText = alternative?.transcript || "";
    const words: CanonicalTranscriptWord[] = (alternative?.words || []).map((w: any) => ({
      word: w.word,
      start: w.start,
      end: w.end,
      confidence: w.confidence,
    }));

    return {
      text: transcriptText,
      words,
      provider: "deepgram",
      model: "nova-3",
      durationSeconds: data.metadata?.duration,
      rawResponse: data,
    };
  }
}
