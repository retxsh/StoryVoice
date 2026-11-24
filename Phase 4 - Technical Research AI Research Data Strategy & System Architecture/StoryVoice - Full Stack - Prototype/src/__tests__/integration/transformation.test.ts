import { describe, it, expect } from "vitest";
import { LLMTransformationAdapter } from "@/services/transformation/adapters/llm";

describe("AI Transformation Pipeline (3 Modes & Guardrails)", () => {
  const sourceText =
    "I went back to the lighthouse that night. I mean, I hadn't been there in years. The road was almost gone, and the wind was making it difficult to hear anything. I stopped the car. I wasn't sure if I should go inside. Then I heard something, maybe a door, or something hitting the wall.";

  const approvedContext = [
    {
      id: "c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11",
      name: "lighthouse",
      type: "Location",
      detail: "Greyhaven lighthouse on the northern coast",
    },
  ];

  it("Faithful Transcript mode preserves exact wording", async () => {
    const result = await LLMTransformationAdapter.transform({
      transcriptId: "trans-1",
      sourceRevisionId: "rev-1",
      sourceText,
      mode: "faithful",
      approvedContext,
    });

    expect(result.transformation_mode).toBe("faithful");
    expect(result.validation_status).toBe("valid");
    expect(result.transformed_text).toContain("I mean, I hadn't been there in years.");
  });

  it("Clean Transcript mode removes verbal fillers while preserving sentence structure", async () => {
    const result = await LLMTransformationAdapter.transform({
      transcriptId: "trans-1",
      sourceRevisionId: "rev-1",
      sourceText,
      mode: "clean",
      approvedContext,
    });

    expect(result.transformation_mode).toBe("clean");
    expect(result.validation_status).toBe("valid");
    // Filler "I mean," removed
    expect(result.transformed_text).not.toContain("I mean,");
    expect(result.transformed_text).toContain("I hadn't been there in years.");
  });

  it("Readable Draft mode formats rough speech into prose paragraphs", async () => {
    const result = await LLMTransformationAdapter.transform({
      transcriptId: "trans-1",
      sourceRevisionId: "rev-1",
      sourceText,
      mode: "readable",
      approvedContext,
    });

    expect(result.transformation_mode).toBe("readable");
    expect(result.validation_status).toBe("valid");
    // Contains paragraph breaks
    expect(result.transformed_text).toContain("\n\n");
    // Literary vocabulary elevation
    expect(result.transformed_text).toContain("returned to the lighthouse");
    expect(result.transformed_text).toContain("swallowed nearly every sound");
    // References approved context
    expect(result.context_references).toContain(approvedContext[0].id);
  });

  it("All three modes produce distinctly different text on custom spoken input", async () => {
    const customSpoken =
      "so um I went to the gate and you know I was making it difficult to find the key and then I heard something loud.";

    const faithful = await LLMTransformationAdapter.transform({
      transcriptId: "t-1",
      sourceRevisionId: "r-1",
      sourceText: customSpoken,
      mode: "faithful",
      approvedContext: [],
    });

    const clean = await LLMTransformationAdapter.transform({
      transcriptId: "t-1",
      sourceRevisionId: "r-1",
      sourceText: customSpoken,
      mode: "clean",
      approvedContext: [],
    });

    const readable = await LLMTransformationAdapter.transform({
      transcriptId: "t-1",
      sourceRevisionId: "r-1",
      sourceText: customSpoken,
      mode: "readable",
      approvedContext: [],
    });

    // Faithful keeps fillers
    expect(faithful.transformed_text).toContain("um");
    expect(faithful.transformed_text).toContain("you know");

    // Clean removes fillers and tightens
    expect(clean.transformed_text).not.toContain("um");
    expect(clean.transformed_text).not.toContain("you know");
    expect(clean.transformed_text).toContain("made it difficult to");

    // Readable elevates to literary fiction prose
    expect(readable.transformed_text).toContain("reached the gate");
    expect(readable.transformed_text).toContain("a sound broke through");

    // Crucially: all three outputs are distinctly different from each other
    expect(faithful.transformed_text).not.toEqual(clean.transformed_text);
    expect(clean.transformed_text).not.toEqual(readable.transformed_text);
    expect(faithful.transformed_text).not.toEqual(readable.transformed_text);
  });

  it("Rephrases arbitrary novel spoken passages into three distinctly different voices matching the criteria", async () => {
    const rawSpeech =
      "well you see I walked over to the shed and like I was trying to find my flashlight and basically I saw this strange shadow by the old fence and it was really dark and I was scared and I didn't know what to do";

    const faithful = await LLMTransformationAdapter.transform({
      transcriptId: "t-custom",
      sourceRevisionId: "r-custom",
      sourceText: rawSpeech,
      mode: "faithful",
      approvedContext: [],
    });

    const clean = await LLMTransformationAdapter.transform({
      transcriptId: "t-custom",
      sourceRevisionId: "r-custom",
      sourceText: rawSpeech,
      mode: "clean",
      approvedContext: [],
    });

    const readable = await LLMTransformationAdapter.transform({
      transcriptId: "t-custom",
      sourceRevisionId: "r-custom",
      sourceText: rawSpeech,
      mode: "readable",
      approvedContext: [],
    });

    // 1. Faithful Transcript:
    // - Punctuation and minimal formatting only.
    // - No sentence rewriting, original authorial wording preserved.
    // - Keeps verbal fillers verbatim: "you see", "like", "basically"
    expect(faithful.transformed_text).toContain("you see");
    expect(faithful.transformed_text).toContain("like");
    expect(faithful.transformed_text).toContain("basically");
    expect(faithful.transformed_text).toContain("I was scared and I didn't know what to do");

    // 2. Clean Transcript:
    // - Light cleanup.
    // - Removes verbal fillers.
    // - Preserves spoken structure: "I tried to find", but without literary reshaping.
    expect(clean.transformed_text).not.toContain("you see");
    expect(clean.transformed_text).not.toContain("basically");
    expect(clean.transformed_text).toContain("tried to find");

    // 3. Readable Draft:
    // - Prose shaping: Shapes rough spoken language into fluent literary prose.
    // - Vocabulary elevated: "walked over to" -> "approached", "I saw" -> "I caught sight of",
    //   "really dark" -> "pitch-dark", "was scared" -> "dread seized me"
    expect(readable.transformed_text).toContain("approached the shed");
    expect(readable.transformed_text).toContain("caught sight of");
    expect(readable.transformed_text).toContain("pitch-dark");
    expect(readable.transformed_text).toContain("dread seized me");

    // Verify all 3 modes produce 3 distinct outputs
    expect(faithful.transformed_text).not.toEqual(clean.transformed_text);
    expect(clean.transformed_text).not.toEqual(readable.transformed_text);
    expect(faithful.transformed_text).not.toEqual(readable.transformed_text);
  });
});
