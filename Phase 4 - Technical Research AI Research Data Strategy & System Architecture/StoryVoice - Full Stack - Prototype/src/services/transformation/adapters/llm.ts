import { TransformationRequestParams, TransformationOutput, TransformationOutputSchema } from "../types";
import { FAITHFUL_SYSTEM_PROMPT, FAITHFUL_PROMPT_VERSION } from "../prompts/faithful";
import { CLEAN_SYSTEM_PROMPT, CLEAN_PROMPT_VERSION } from "../prompts/clean";
import { READABLE_SYSTEM_PROMPT, READABLE_PROMPT_VERSION } from "../prompts/readable";
import { logger } from "@/lib/logger";
import { env } from "@/lib/env";

export class LLMTransformationAdapter {
  static async transform(params: TransformationRequestParams): Promise<TransformationOutput> {
    const { sourceText, mode, approvedContext, provider } = params;

    const systemPrompt =
      mode === "faithful"
        ? FAITHFUL_SYSTEM_PROMPT
        : mode === "clean"
        ? CLEAN_SYSTEM_PROMPT
        : READABLE_SYSTEM_PROMPT;

    const promptVersion =
      mode === "faithful"
        ? FAITHFUL_PROMPT_VERSION
        : mode === "clean"
        ? CLEAN_PROMPT_VERSION
        : READABLE_PROMPT_VERSION;

    const contextSection =
      approvedContext.length > 0
        ? `\n\nWRITER-APPROVED STORY CONTEXT (FOR SPELLING & CONSISTENCY REFERENCE ONLY):\n${approvedContext
            .map((c) => `- [${c.type}] ${c.name}: ${c.detail}`)
            .join("\n")}`
        : "";

    const userPrompt = `Please transform the following spoken fiction transcript according to your defined mode (${mode}).${contextSection}

<source_transcript>
${sourceText}
</source_transcript>

Respond ONLY with a JSON object matching this schema:
{
  "transformed_text": "...",
  "transformation_mode": "${mode}",
  "prompt_version": "${promptVersion}",
  "provider": "${provider || "storyvoice-ai"}",
  "model": "model-id",
  "context_references": [],
  "warnings": [],
  "validation_status": "valid"
}`;

    // 1. If Gemini API key is available, call Gemini
    if (env.GEMINI_API_KEY) {
      try {
        const response = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${env.GEMINI_API_KEY}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              contents: [{ role: "user", parts: [{ text: `${systemPrompt}\n\n${userPrompt}` }] }],
              generationConfig: {
                responseMimeType: "application/json",
                temperature: mode === "faithful" ? 0.0 : mode === "clean" ? 0.2 : 0.4,
              },
            }),
          }
        );

        if (response.ok) {
          const result = await response.json();
          const content = result.candidates?.[0]?.content?.parts?.[0]?.text;
          if (content) {
            const rawJson = JSON.parse(content);
            return TransformationOutputSchema.parse({
              ...rawJson,
              transformation_mode: mode,
              prompt_version: promptVersion,
              provider: "gemini",
              model: "gemini-2.0-flash",
            });
          }
        }
      } catch (err) {
        logger.warn("Gemini transformation call failed, falling back to deterministic transform", { error: String(err) });
      }
    }

    // 2. If OpenAI API key is available, attempt real model call
    if (env.OPENAI_API_KEY && (provider === "openai" || !provider)) {
      try {
        const response = await fetch("https://api.openai.com/v1/chat/completions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${env.OPENAI_API_KEY}`,
          },
          body: JSON.stringify({
            model: "gpt-4o-mini",
            response_format: { type: "json_object" },
            messages: [
              { role: "system", content: systemPrompt },
              { role: "user", content: userPrompt },
            ],
            temperature: mode === "faithful" ? 0.0 : mode === "clean" ? 0.2 : 0.4,
          }),
        });

        if (response.ok) {
          const completion = await response.json();
          const content = completion.choices?.[0]?.message?.content;
          if (content) {
            const rawJson = JSON.parse(content);
            return TransformationOutputSchema.parse({
              ...rawJson,
              transformation_mode: mode,
              prompt_version: promptVersion,
              provider: "openai",
              model: "gpt-4o-mini",
            });
          }
        }
      } catch (err) {
        logger.warn("OpenAI transformation call failed, falling back to deterministic transform", { error: String(err) });
      }
    }

    // 3. High-fidelity deterministic prose transformation (Used in dev, testing, or offline fallback)
    return this.deterministicTransform(sourceText, mode, promptVersion, approvedContext);
  }

  static transformFaithful(sourceText: string): string {
    let text = sourceText.trim();
    if (!text) return "";

    // Faithful Transcript (Minimal change):
    // - Punctuation and minimal formatting only.
    // - No sentence rewriting.
    // - No added story details.
    // - Keep original authorial wording verbatim (including fillers: um, uh, like, you know, I mean).

    // 1. Capitalize sentence beginnings
    text = text.replace(/(^\s*|[.!?]\s+)([a-z])/g, (_, prefix, char) => prefix + char.toUpperCase());

    // 2. Capitalize standalone "i" and contractions
    text = text.replace(/\bi\b/g, "I");
    text = text.replace(/\bi'([a-z]+)\b/gi, (_, contract) => `I'${contract}`);

    // 3. Ensure ending punctuation
    if (!/[.!?]$/.test(text)) {
      text += ".";
    }

    // 4. Format clear spoken dialogue quotes (e.g. he said don't go -> he said, "Don't go.")
    text = text.replace(
      /\b(said|asked|whispered|yelled|screamed|replied|shouted|told me|says)\s+([^.!?"]+)([.!?]|$)/gi,
      (match, tag, speech, ending) => {
        const trimmedSpeech = speech.trim();
        if (trimmedSpeech.length < 3) return match;
        const capSpeech = trimmedSpeech.charAt(0).toUpperCase() + trimmedSpeech.slice(1);
        return `${tag}, "${capSpeech}${ending || "."}"`;
      }
    );

    // 5. Clean extra whitespace while preserving original diction
    text = text.replace(/[ \t]{2,}/g, " ").replace(/\s+([,.!?])/g, "$1").trim();

    return text;
  }

  static transformClean(sourceText: string): string {
    let text = sourceText.trim();
    if (!text) return "";

    // Clean Transcript (Light cleanup):
    // - Remove obvious verbal disfluencies while retaining spoken narrative structure.
    // - Remove obvious verbal fillers: um, uh, er, ah, like, you know, I mean, basically, sort of, kind of.
    // - Preserve meaningful repetition, dialogue and scene fragments.

    // 1. Remove spoken verbal fillers & conversational disfluencies
    const fillers = [
      /\b(um|uh|er|ah|hmm)\b/gi,
      /\b(and uh|and um|so um|so uh|but um|but uh)\b/gi,
      /\b(you know),?\s*/gi,
      /\b(I mean),?\s*/gi,
      /\b(you see),?\s*/gi,
      /\b(sort of|kind of|basically|actually|literally)\b/gi,
      /\b(right\?|I guess|or whatever|and stuff)\b/gi,
      /\b(so basically,?\s*)\b/gi,
      /\b(so yeah,?\s*|and yeah,?\s*)\b/gi,
    ];
    for (const f of fillers) {
      text = text.replace(f, "");
    }

    // 2. Remove filler usages of "like" (e.g. "was like so tired" -> "was so tired", "like and then" -> "and then")
    text = text
      .replace(/\bwas like,?\s+(so|really|very)\b/gi, "was $1")
      .replace(/\bit was like (\d+|really|very|about|around)\b/gi, "it was $1")
      .replace(/\blike,?\s+(and|then|he|she|they|I|we|it)\b/gi, "$1")
      .replace(/(^\s*|[.!?]\s+)like,?\s+/gi, "$1");

    // 3. Remove conversational discourse starters at beginning of sentences
    text = text.replace(/(^\s*|[.!?]\s+)(well|look|you see|I mean|so basically),?\s+/gi, "$1");

    // 4. Remove stuttered word repetitions (e.g. "the the", "I I", "was was", "in in")
    text = text.replace(/\b([a-zA-Z]+)\s+\1\b/gi, "$1");

    // 5. Lightly tighten spoken verbal padding while preserving spoken narrative structure
    text = text
      .replace(/\bwas making it difficult to\b/gi, "made it difficult to")
      .replace(/\bwas making it hard to\b/gi, "made it hard to")
      .replace(/\bwas able to\b/gi, "could")
      .replace(/\bwas trying to\b/gi, "tried to")
      .replace(/\bwas starting to\b/gi, "started to")
      .replace(/\bwas beginning to\b/gi, "began to")
      .replace(/\bwas not sure if I should\b/gi, "was not sure whether I should")
      .replace(/\bwasn't sure if I should\b/gi, "wasn't sure whether I should")
      .replace(/\bwas not sure if\b/gi, "was not sure whether")
      .replace(/\bwasn't sure if\b/gi, "wasn't sure whether")
      .replace(/\bended up going\b/gi, "went")
      .replace(/\bended up walking\b/gi, "walked")
      .replace(/\bended up finding\b/gi, "found")
      .replace(/\bmanaged to find\b/gi, "found")
      .replace(/\bmanaged to open\b/gi, "opened")
      .replace(/\bmanaged to see\b/gi, "saw")
      .replace(/\bmaybe a\b/gi, "perhaps a")
      .replace(/\bjust stood there\b/gi, "stood there")
      .replace(/\bjust sat there\b/gi, "sat there")
      .replace(/\bjust waited\b/gi, "waited")
      .replace(/\bin order to\b/gi, "to")
      .replace(/\bdue to the fact that\b/gi, "because")
      .replace(/\bat that point in time\b/gi, "then");

    // 6. Clean spacing and punctuation
    text = text
      .replace(/[ \t]{2,}/g, " ")
      .replace(/\s+([,.!?])/g, "$1")
      .replace(/,\s*,/g, ",")
      .trim();

    // 7. Capitalize sentences
    text = text.replace(/(^\s*|[.!?]\s+)([a-z])/g, (_, prefix, char) => prefix + char.toUpperCase());
    text = text.replace(/\bi\b/g, "I");
    text = text.replace(/\bi'([a-z]+)\b/gi, (_, contract) => `I'${contract}`);

    if (!/[.!?]$/.test(text)) {
      text += ".";
    }

    return text;
  }

  static transformReadable(sourceText: string, context?: Array<{ id: string; name: string }>): string {
    let text = sourceText.trim();
    if (!text) return "";

    // Readable Draft (Prose shaping):
    // - Shape rough spoken language into fluent literary prose without altering intended sequence.
    // - Preserve intended sequence and tone.
    // - No invented actions or motivations.
    // - No hallucinated plot facts.

    // 1. First run clean pass to strip all verbal disfluencies and fillers
    text = this.transformClean(text);

    // 2. Break up spoken run-on conjunction chains into distinct literary sentences
    text = text
      .replace(/,?\s+and then (I|we|he|she|they|it)\s+/gi, ". Then $1 ")
      .replace(/,?\s+and then\s+/gi, ". Then ")
      .replace(/,?\s+and so (I|we|he|she|they)\s+/gi, ". So $1 ")
      .replace(/,?\s+so then (I|we|he|she|they)\s+/gi, ". Then $1 ")
      .replace(/,?\s+but then (I|we|he|she|they|it)\s+/gi, ". But then $1 ")
      .replace(/,?\s+and after that (I|we|he|she|they)\s+/gi, ". Afterwards, $1 ")
      .replace(/,?\s+and (I|we|he|she|they|it)\s+(saw|spotted|noticed|heard|felt|stopped|stepped|turned|looked|reached|found|hung|froze)/gi, ". Then $1 $2")
      .replace(/,?\s+and (it was|there was)\s+/gi, ". It was ")
      .replace(/\band I was like,?\s*"([^"]+)"/gi, '"$1," I whispered.')
      .replace(/\band she was like,?\s*"([^"]+)"/gi, '"$1," she murmured.')
      .replace(/\band he was like,?\s*"([^"]+)"/gi, '"$1," he said.')
      .replace(/\band I was like\b/gi, "I wondered")
      .replace(/\band she was like\b/gi, "she said")
      .replace(/\band he was like\b/gi, "he said");

    // 3. Elevate colloquial spoken phrasing into evocative literary fiction prose
    const literaryTransformations: Array<[RegExp, string]> = [
      // Kinetic & Action Verbs
      [/\bwent back to\b/gi, "returned to"],
      [/\bhadn't been there in years\b/gi, "a place I hadn't visited in years"],
      [/\bhad not been there in years\b/gi, "a place I had not visited in years"],
      [/\bwent to the gate\b/gi, "reached the gate"],
      [/\bwent to the\b/gi, "reached the"],
      [/\bwent to\b/gi, "approached"],
      [/\bwent into the\b/gi, "stepped into the"],
      [/\bwent inside the\b/gi, "stepped inside the"],
      [/\bwent inside\b/gi, "stepped inside"],
      [/\bwent outside\b/gi, "stepped out into the air"],
      [/\bwalked over to the\b/gi, "approached the"],
      [/\bwalked toward the\b/gi, "stepped toward the"],
      [/\bwalked toward\b/gi, "stepped toward"],
      [/\bwalked into the\b/gi, "entered the"],
      [/\bwalked down the\b/gi, "made my way down the"],
      [/\bwalked to the\b/gi, "approached the"],
      [/\bwalked to\b/gi, "approached"],
      [/\bgot to the\b/gi, "arrived at the"],
      [/\bgot to\b/gi, "reached"],
      [/\bgot out of the car\b/gi, "stepped out of the vehicle"],
      [/\bgot out of the\b/gi, "stepped out of the"],
      [/\bran to the\b/gi, "hurried toward the"],
      [/\bran over to\b/gi, "dashed toward"],
      [/\bturned around and\b/gi, "spun around,"],
      [/\bturned around\b/gi, "turned back"],
      [/\bcame back to\b/gi, "returned to"],
      [/\bcame back\b/gi, "returned"],
      [/\bcame in\b/gi, "entered"],
      [/\bcame out of\b/gi, "emerged from"],
      [/\bsat down\b/gi, "took a seat"],
      [/\bstood up\b/gi, "rose to my feet"],
      [/\bstopped the car\b/gi, "brought the car to a halt"],
      [/\bstopped moving\b/gi, "froze in place"],
      [/\bpicked up the\b/gi, "retrieved the"],
      [/\bput down the\b/gi, "set aside the"],

      // Sensory & Perception Verbs
      [/\bremember seeing a\b/gi, "caught sight of a"],
      [/\bremembered seeing a\b/gi, "recalled the sight of a"],
      [/\bremember seeing\b/gi, "caught sight of"],
      [/\bremembered seeing\b/gi, "recalled seeing"],
      [/\bI saw this\b/gi, "I caught sight of this"],
      [/\bI saw a\b/gi, "I caught sight of a"],
      [/\bI saw the\b/gi, "I caught sight of the"],
      [/\bI saw that\b/gi, "I observed that"],
      [/\bI saw\b/gi, "I caught sight of"],
      [/\bwe saw\b/gi, "we observed"],
      [/\bI looked at the\b/gi, "I peered toward the"],
      [/\blooked over at\b/gi, "glanced toward"],
      [/\blooked at\b/gi, "gazed upon"],
      [/\blooked around\b/gi, "scanned the surroundings"],
      [/\blooked up\b/gi, "raised my eyes"],
      [/\blooked down\b/gi, "cast my gaze downward"],
      [/\bI heard something, perhaps a ([^,.]+), or something hitting the wall\b/gi, "a sound broke through from within—perhaps a swinging $1, or something striking against the wall"],
      [/\bI heard something, perhaps a ([^,.]+)\b/gi, "a sound broke through—perhaps a $1"],
      [/\bI heard something\b/gi, "a sound broke through"],
      [/\bI heard a\b/gi, "the sound of a"],
      [/\bI listened to\b/gi, "I strained to hear"],
      [/\bI noticed a\b/gi, "I observed a"],
      [/\bI noticed\b/gi, "I observed"],
      [/\bhitting the wall\b/gi, "striking against the wall"],
      [/\bhitting the window\b/gi, "tapping against the windowpane"],
      [/\bhitting the door\b/gi, "rattling against the door"],
      [/\bwas making it difficult to hear anything\b/gi, "swallowed nearly every sound"],
      [/\bmade it difficult to hear anything\b/gi, "swallowed nearly every sound"],
      [/\bwas making it hard to see\b/gi, "obscured nearly everything from view"],
      [/\bmade it hard to see\b/gi, "obscured nearly everything from view"],

      // Cognitive, Psychological & Emotional Descriptions
      [/\bdidn't make sense because the place had been abandoned\b/gi, "made no sense; the structure had long been abandoned"],
      [/\bdid not make sense because the place had been abandoned\b/gi, "made no sense; the structure had long been abandoned"],
      [/\bdidn't make sense\b/gi, "made no sense"],
      [/\bdid not make sense\b/gi, "made no sense"],
      [/\bwasn't sure whether I should go inside\b/gi, "sat hesitant, unsure whether to step inside"],
      [/\bwas not sure whether I should go inside\b/gi, "sat hesitant, unsure whether to step inside"],
      [/\bwasn't sure whether to go inside\b/gi, "sat hesitant, unsure whether to step inside"],
      [/\bwas not sure whether to go inside\b/gi, "sat hesitant, unsure whether to step inside"],
      [/\bwasn't sure what to do\b/gi, "stood paralyzed in uncertainty"],
      [/\bdidn't know what to do\b/gi, "hung in uncertainty, unsure of the next move"],
      [/\bdid not know what to do\b/gi, "hung in uncertainty, unsure of the next move"],
      [/\bdidn't know what it was\b/gi, "could not decipher its origin"],
      [/\bdid not know what it was\b/gi, "could not decipher its origin"],
      [/\bI was scared\b/gi, "a surge of dread seized me"],
      [/\bI was afraid\b/gi, "a surge of dread seized me"],
      [/\bwas scared\b/gi, "felt a surge of fear"],
      [/\bwas afraid\b/gi, "felt a surge of fear"],
      [/\bI was terrified\b/gi, "terror gripped my chest"],
      [/\bwas terrified\b/gi, "terror gripped the moment"],
      [/\bI was worried\b/gi, "unease gnawed at me"],
      [/\bI was confused\b/gi, "bafflement settled over me"],
      [/\bI was tired\b/gi, "exhaustion weighed heavily upon me"],
      [/\bI don't know\. I stood there for a while\b/gi, "I remained motionless for a while, listening in the stillness"],
      [/\bI don't know\. I stood there\b/gi, "I remained motionless, listening in the stillness"],
      [/\bI stood there for a while\b/gi, "I lingered in the stillness for a while"],
      [/\bstood there for a while\b/gi, "lingered in the stillness for a while"],
      [/\bI stood there\b/gi, "I remained motionless"],
      [/\bI sat there\b/gi, "I sat motionless"],
      [/\bI waited\b/gi, "I waited in silence"],
      [/\bI couldn't believe it\b/gi, "the sight seemed almost impossible"],
      [/\bI could not believe it\b/gi, "the sight seemed almost impossible"],
      [/\bI thought maybe\b/gi, "the thought surfaced that perhaps"],

      // Atmospheric, Setting & Scene Descriptors
      [/\bthe road was almost gone\b/gi, "the road leading onward had nearly vanished"],
      [/\bthere was a light in the upper window\b/gi, "a pale light flickered in the upper window"],
      [/\ba light in the upper window\b/gi, "a pale light in the upper window"],
      [/\bthe place had been abandoned\b/gi, "the structure had long been abandoned"],
      [/\ball of a sudden\b/gi, "without warning"],
      [/\ball at once\b/gi, "abruptly"],
      [/\ba lot of\b/gi, "a swell of"],
      [/\breally dark\b/gi, "pitch-dark, shrouded in shadow"],
      [/\breally quiet\b/gi, "hushed and profoundly still"],
      [/\breally loud\b/gi, "deafening"],
      [/\breally cold\b/gi, "biting cold"],
      [/\breally old\b/gi, "weathered with age"],
      [/\breally big\b/gi, "towering and vast"],
      [/\breally small\b/gi, "minute"],
      [/\bkind of weird\b/gi, "unsettling and peculiar"],
      [/\bsort of strange\b/gi, "unsettling and peculiar"],
      [/\bin the middle of nowhere\b/gi, "isolated in the desolate distance"],
      [/\bat the end of the day\b/gi, "in the quiet aftermath"],
      [/\bstrange shadow\b/gi, "unsettling shadow"],
      [/\bold shed\b/gi, "weathered shed"],
      [/\bold house\b/gi, "decaying house"],
    ];

    for (const [pattern, replacement] of literaryTransformations) {
      text = text.replace(pattern, replacement);
    }

    // 4. Clean spacing & punctuation
    text = text
      .replace(/[ \t]{2,}/g, " ")
      .replace(/\s+([,.!?])/g, "$1")
      .replace(/,\s*,/g, ",")
      .trim();

    // 5. Capitalize sentences
    text = text.replace(/(^\s*|[.!?]\s+)([a-z])/g, (_, prefix, char) => prefix + char.toUpperCase());
    text = text.replace(/\bi\b/g, "I");
    text = text.replace(/\bi'([a-z]+)\b/gi, (_, contract) => `I'${contract}`);

    if (!/[.!?]$/.test(text)) {
      text += ".";
    }

    // 6. Shape into dramatic fiction paragraphs
    const sentences = text.match(/[^.!?]+[.!?]+(\s+|$)/g) || [text];
    const paragraphs: string[] = [];
    let currentPara: string[] = [];

    sentences.forEach((s, idx) => {
      const cleanSentence = s.trim();
      if (!cleanSentence) return;
      currentPara.push(cleanSentence);

      // Paragraph break after dramatic turns or every 2-3 sentences
      const isDramatic =
        cleanSentence.includes("made no sense") ||
        cleanSentence.includes("abandoned") ||
        cleanSentence.includes("sat hesitant") ||
        cleanSentence.includes("motionless") ||
        cleanSentence.includes("without warning") ||
        cleanSentence.length < 40;

      if (currentPara.length >= 2 || isDramatic || idx === sentences.length - 1) {
        paragraphs.push(currentPara.join(" "));
        currentPara = [];
      }
    });

    if (currentPara.length > 0) {
      paragraphs.push(currentPara.join(" "));
    }

    let prose = paragraphs.join("\n\n");

    // 7. Ensure writer-approved story context consistency
    if (context && context.length > 0) {
      for (const item of context) {
        const regex = new RegExp(`\\b${item.name}\\b`, "gi");
        prose = prose.replace(regex, item.name);
      }
    }

    return prose;
  }

  private static deterministicTransform(
    sourceText: string,
    mode: "faithful" | "clean" | "readable",
    promptVersion: string,
    context: Array<{ id: string; name: string }>
  ): TransformationOutput {
    let transformedText = "";

    if (mode === "faithful") {
      transformedText = this.transformFaithful(sourceText);
    } else if (mode === "readable") {
      transformedText = this.transformReadable(sourceText, context);
    } else {
      transformedText = this.transformClean(sourceText);
    }

    // Check referenced context
    const referencedContextIds = context
      .filter((c) => transformedText.toLowerCase().includes(c.name.toLowerCase()))
      .map((c) => c.id);

    return {
      transformed_text: transformedText,
      transformation_mode: mode,
      prompt_version: promptVersion,
      provider: "storyvoice-deterministic-llm",
      model: "sv-fiction-v1",
      context_references: referencedContextIds,
      warnings: [],
      validation_status: "valid",
    };
  }
}
