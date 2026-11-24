import { SpeechToTextAdapter, TranscribeAudioParams, TranscriptionResult, CanonicalTranscriptWord } from "../types";

export class MockTranscriptionAdapter implements SpeechToTextAdapter {
  name = "mock";

  async transcribe(params: TranscribeAudioParams): Promise<TranscriptionResult> {
    const defaultFictionSource =
      "I went back to the lighthouse that night. I mean, I hadn't been there in years. The road was almost gone, and the wind was making it difficult to hear anything. I remember seeing a light in the upper window, which didn't make sense because the place had been abandoned. I stopped the car. I wasn't sure if I should go inside. Then I heard something, maybe a door, or something hitting the wall. I don't know. I just stood there for a while.";

    const wordsList = defaultFictionSource.split(/\s+/);
    const words: CanonicalTranscriptWord[] = wordsList.map((w, i) => ({
      word: w,
      start: i * 0.45,
      end: (i + 1) * 0.45,
      confidence: 0.98,
    }));

    return {
      text: defaultFictionSource,
      words,
      provider: "mock",
      model: "mock-fiction-v1",
      durationSeconds: 42.0,
      rawResponse: { simulated: true, sampleWordsCount: wordsList.length },
    };
  }
}
