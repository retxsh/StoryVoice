export interface CanonicalTranscriptWord {
  word: string;
  start: number; // in seconds
  end: number;   // in seconds
  confidence: number;
}

export interface TranscriptionResult {
  text: string;
  words: CanonicalTranscriptWord[];
  provider: string;
  model: string;
  durationSeconds?: number;
  rawResponse?: Record<string, unknown>;
}

export interface TranscribeAudioParams {
  audioBuffer?: Buffer;
  audioUrl?: string;
  mimeType: string;
  vocabulary: string[]; // Approved fictional terms to bias
  language?: string;
}

export interface SpeechToTextAdapter {
  name: string;
  transcribe(params: TranscribeAudioParams): Promise<TranscriptionResult>;
}
