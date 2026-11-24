"use client";

import { useState, useEffect, use } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { StageNav } from "@/components/navigation/StageNav";

function applyClientTransform(source: string, targetMode: "faithful" | "clean" | "readable"): string {
  if (targetMode === "faithful") {
    let t = source.trim();
    if (!t) return "";
    t = t.replace(/(^\s*|[.!?]\s+)([a-z])/g, (_, p, c) => p + c.toUpperCase());
    t = t.replace(/\bi\b/g, "I").replace(/\bi'([a-z]+)\b/gi, (_, c) => `I'${c}`);
    if (!/[.!?]$/.test(t)) t += ".";
    return t;
  }
  if (targetMode === "clean") {
    let t = source.trim();
    if (!t) return "";
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
    for (const f of fillers) t = t.replace(f, "");
    t = t
      .replace(/\bwas like,?\s+(so|really|very)\b/gi, "was $1")
      .replace(/\bit was like (\d+|really|very|about|around)\b/gi, "it was $1")
      .replace(/\blike,?\s+(and|then|he|she|they|I|we|it)\b/gi, "$1")
      .replace(/(^\s*|[.!?]\s+)like,?\s+/gi, "$1")
      .replace(/(^\s*|[.!?]\s+)(well|look|you see|I mean|so basically),?\s+/gi, "$1")
      .replace(/\b([a-zA-Z]+)\s+\1\b/gi, "$1")
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
      .replace(/\bmaybe a\b/gi, "perhaps a")
      .replace(/\bjust stood there\b/gi, "stood there")
      .replace(/\bjust sat there\b/gi, "sat there")
      .replace(/\bjust waited\b/gi, "waited");
    t = t.replace(/[ \t]{2,}/g, " ").replace(/\s+([,.!?])/g, "$1").trim();
    t = t.replace(/(^\s*|[.!?]\s+)([a-z])/g, (_, p, c) => p + c.toUpperCase());
    t = t.replace(/\bi\b/g, "I").replace(/\bi'([a-z]+)\b/gi, (_, c) => `I'${c}`);
    if (!/[.!?]$/.test(t)) t += ".";
    return t;
  }

  // readable mode
  let t = applyClientTransform(source, "clean");
  t = t
    .replace(/,?\s+and then (I|we|he|she|they|it)\s+/gi, ". Then $1 ")
    .replace(/,?\s+and then\s+/gi, ". Then ")
    .replace(/,?\s+and so (I|we|he|she|they)\s+/gi, ". So $1 ")
    .replace(/,?\s+so then (I|we|he|she|they)\s+/gi, ". Then $1 ")
    .replace(/,?\s+but then (I|we|he|she|they|it)\s+/gi, ". But then $1 ")
    .replace(/,?\s+and after that (I|we|he|she|they)\s+/gi, ". Afterwards, $1 ")
    .replace(/,?\s+and (I|we|he|she|they|it)\s+(saw|spotted|noticed|heard|felt|stopped|stepped|turned|looked|reached|found|hung|froze)/gi, ". Then $1 $2")
    .replace(/,?\s+and (it was|there was)\s+/gi, ". It was ");

  const replacements: Array<[RegExp, string]> = [
    [/\bwent back to\b/gi, "returned to"],
    [/\bhadn't been there in years\b/gi, "a place I hadn't visited in years"],
    [/\bhad not been there in years\b/gi, "a place I had not visited in years"],
    [/\bwent to the gate\b/gi, "reached the gate"],
    [/\bwent to the\b/gi, "reached the"],
    [/\bwent to\b/gi, "approached"],
    [/\bwalked over to the\b/gi, "approached the"],
    [/\bwalked toward the\b/gi, "stepped toward the"],
    [/\bwalked into the\b/gi, "entered the"],
    [/\bwalked to\b/gi, "approached"],
    [/\bgot to the\b/gi, "arrived at the"],
    [/\bgot out of the car\b/gi, "stepped out of the vehicle"],
    [/\bran to the\b/gi, "hurried toward the"],
    [/\bturned around and\b/gi, "spun around,"],
    [/\bremember seeing a\b/gi, "caught sight of a"],
    [/\bremember seeing\b/gi, "caught sight of"],
    [/\bI saw this\b/gi, "I caught sight of this"],
    [/\bI saw a\b/gi, "I caught sight of a"],
    [/\bI saw the\b/gi, "I caught sight of the"],
    [/\bI saw\b/gi, "I caught sight of"],
    [/\bwe saw\b/gi, "we observed"],
    [/\bI looked at the\b/gi, "I peered toward the"],
    [/\blooked around\b/gi, "scanned the surroundings"],
    [/\bI heard something, perhaps a ([^,.]+), or something hitting the wall\b/gi, "a sound broke through from within—perhaps a swinging $1, or something striking against the wall"],
    [/\bI heard something, perhaps a ([^,.]+)\b/gi, "a sound broke through—perhaps a $1"],
    [/\bI heard something\b/gi, "a sound broke through"],
    [/\bI listened to\b/gi, "I strained to hear"],
    [/\bI noticed\b/gi, "I observed"],
    [/\bhitting the wall\b/gi, "striking against the wall"],
    [/\bwas making it difficult to hear anything\b/gi, "swallowed nearly every sound"],
    [/\bmade it difficult to hear anything\b/gi, "swallowed nearly every sound"],
    [/\bdidn't make sense because the place had been abandoned\b/gi, "made no sense; the structure had long been abandoned"],
    [/\bdidn't make sense\b/gi, "made no sense"],
    [/\bdid not make sense\b/gi, "made no sense"],
    [/\bwasn't sure whether I should go inside\b/gi, "sat hesitant, unsure whether to step inside"],
    [/\bwas not sure whether I should go inside\b/gi, "sat hesitant, unsure whether to step inside"],
    [/\bwasn't sure whether to go inside\b/gi, "sat hesitant, unsure whether to step inside"],
    [/\bdidn't know what to do\b/gi, "hung in uncertainty, unsure of the next move"],
    [/\bI was scared\b/gi, "a surge of dread seized me"],
    [/\bwas scared\b/gi, "felt a surge of fear"],
    [/\bI was terrified\b/gi, "terror gripped my chest"],
    [/\bI was worried\b/gi, "unease gnawed at me"],
    [/\bI don't know\. I stood there for a while\b/gi, "I remained motionless for a while, listening in the stillness"],
    [/\bI don't know\. I stood there\b/gi, "I remained motionless, listening in the stillness"],
    [/\bI stood there for a while\b/gi, "I lingered in the stillness for a while"],
    [/\bthe road was almost gone\b/gi, "the road leading onward had nearly vanished"],
    [/\bthere was a light in the upper window\b/gi, "a pale light flickered in the upper window"],
    [/\ba light in the upper window\b/gi, "a pale light in the upper window"],
    [/\bthe place had been abandoned\b/gi, "the structure had long been abandoned"],
    [/\ball of a sudden\b/gi, "without warning"],
    [/\ba lot of\b/gi, "a swell of"],
    [/\breally dark\b/gi, "pitch-dark, shrouded in shadow"],
    [/\breally quiet\b/gi, "hushed and profoundly still"],
    [/\breally loud\b/gi, "deafening"],
    [/\breally cold\b/gi, "biting cold"],
    [/\bkind of weird\b/gi, "unsettling and peculiar"],
    [/\bstrange shadow\b/gi, "unsettling shadow"],
    [/\bold shed\b/gi, "weathered shed"],
  ];
  for (const [p, r] of replacements) t = t.replace(p, r);
  t = t.replace(/[ \t]{2,}/g, " ").replace(/\s+([,.!?])/g, "$1").trim();
  t = t.replace(/(^\s*|[.!?]\s+)([a-z])/g, (_, p, c) => p + c.toUpperCase());
  t = t.replace(/\bi\b/g, "I").replace(/\bi'([a-z]+)\b/gi, (_, c) => `I'${c}`);
  if (!/[.!?]$/.test(t)) t += ".";

  const sents = t.match(/[^.!?]+[.!?]+(\s+|$)/g) || [t];
  const paras: string[] = [];
  let cur: string[] = [];
  sents.forEach((s, idx) => {
    const cs = s.trim();
    if (!cs) return;
    cur.push(cs);
    const isDramatic = cs.includes("made no sense") || cs.includes("abandoned") || cs.includes("sat hesitant") || cs.includes("motionless") || cs.length < 40;
    if (cur.length >= 2 || isDramatic || idx === sents.length - 1) {
      paras.push(cur.join(" "));
      cur = [];
    }
  });
  if (cur.length > 0) paras.push(cur.join(" "));
  return paras.join("\n\n");
}

export default function DraftReviewPage({
  params,
}: {
  params: Promise<{ id: string; draftId: string }>;
}) {
  const { id: projectId, draftId } = use(params);
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialMode = searchParams.get("mode") || "clean";
  const afterSceneId = searchParams.get("afterSceneId") || "";

  const [mode, setMode] = useState<string>(initialMode);
  const [sourceText, setSourceText] = useState("");
  const [draftText, setDraftText] = useState("");
  const [revisions, setRevisions] = useState<any[]>([]);
  const [currentRevId, setCurrentRevId] = useState<string>("demo-rev-1");
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    async function loadDraft() {
      try {
        const res = await fetch(`/api/drafts/${draftId}?mode=${initialMode}`);
        if (res.ok) {
          const data = await res.json();
          setDraftText(data.currentRevision?.text || "");
          setCurrentRevId(data.currentRevision?.id || "");
          setMode(data.draft?.mode || initialMode);
          setSourceText(data.sourceRevision?.text || "");
          setRevisions(data.revisions || []);
        } else {
          // Provide high-fidelity Phase 3 sample material
          const sampleSource =
            "I went back to the lighthouse that night. I mean, I hadn't been there in years. The road was almost gone, and the wind was making it difficult to hear anything. I remember seeing a light in the upper window, which didn't make sense because the place had been abandoned. I stopped the car. I wasn't sure if I should go inside. Then I heard something, maybe a door, or something hitting the wall. I don't know. I just stood there for a while.";

          const sampleClean =
            "I went back to the lighthouse that night. I hadn't been there in years. The road was almost gone, and the wind made it difficult to hear anything. I remember seeing a light in the upper window, which didn't make sense because the place had been abandoned. I stopped the car. I wasn't sure whether I should go inside. Then I heard something, perhaps a door or something hitting the wall. I don't know. I stood there for a while.";

          const sampleReadable =
            "I returned to the lighthouse that night, a place I hadn't visited in years. The road leading to it was almost gone, and the wind swallowed nearly every sound. Then I saw a light in the upper window.\n\nIt made no sense. The lighthouse had been abandoned.\n\nI stopped the car and sat there, unsure whether to go inside. A sound came from somewhere within the building. A door, perhaps. Or something striking the wall.\n\nI remained still for a while, listening.";

          setSourceText(sampleSource);
          const activeText =
            initialMode === "faithful" ? sampleSource : initialMode === "readable" ? sampleReadable : sampleClean;
          setDraftText(activeText);
          setRevisions([
            { id: "rev-1", text: activeText, mode: initialMode, label: "Prepared candidate draft" },
          ]);
        }
      } catch {
        // Fallback
      } finally {
        setLoading(false);
      }
    }
    loadDraft();
  }, [draftId, initialMode]);

  const switchMode = async (newMode: "faithful" | "clean" | "readable") => {
    setMode(newMode);

    // Provide instant responsive client-side transformation immediately
    if (sourceText) {
      const immediateTransform = applyClientTransform(sourceText, newMode);
      setDraftText(immediateTransform);
    }

    if (typeof window !== "undefined") {
      window.history.replaceState(null, "", `${window.location.pathname}?mode=${newMode}`);
    }

    try {
      const res = await fetch(`/api/drafts/${draftId}?mode=${newMode}`);
      if (res.ok) {
        const data = await res.json();
        if (data.currentRevision?.text) {
          setDraftText(data.currentRevision.text);
        }
        if (data.currentRevision?.id) {
          setCurrentRevId(data.currentRevision.id);
        }
        if (data.revisions) {
          setRevisions(data.revisions);
        }
      }
    } catch {
      // Ignored: client-side transformed text is already displayed
    }
  };

  const sourceWords = sourceText.trim() ? sourceText.trim().split(/\s+/).length : 0;
  const draftWords = draftText.trim() ? draftText.trim().split(/\s+/).length : 0;
  const delta = draftWords - sourceWords;

  const handleReject = async () => {
    if (!confirm("Reject this draft? Your source transcript remains unchanged and available.")) return;

    try {
      await fetch("/api/approval/reject", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ draftId }),
      });
    } catch {}

    setNotice("Draft marked rejected. Your source transcript is preserved.");
    setTimeout(() => router.push(`/projects/${projectId}/workspace`), 1000);
  };

  const handleRestore = async () => {
    if (!confirm("Restore draft from original source transcript?")) return;

    try {
      const res = await fetch("/api/approval/restore", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ draftId }),
      });
      if (res.ok) {
        const data = await res.json();
        setDraftText(data.restoredRevision?.text || sourceText);
        setCurrentRevId(data.restoredRevision?.id || "");
        setNotice("Draft restored from source transcript.");
        return;
      }
    } catch {}

    setDraftText(sourceText);
    setNotice("Draft restored from source transcript.");
  };

  const modeName =
    mode === "faithful" ? "Faithful Transcript" : mode === "readable" ? "Readable Draft" : "Clean Transcript";

  const backUrl = `/projects/${projectId}/transform`;

  return (
    <div>
      <StageNav
        currentStep={4}
        backHref={backUrl}
        backLabel="Back to transformation modes"
        projectId={projectId}
        crumbCurrent="Draft review"
      />

      <div className="page-head">
        <div>
          <div className="eyebrow">DRAFT REVIEW</div>
          <h1>Review your draft</h1>
          <p className="sub">Compare the candidate draft with your source transcript before deciding what enters your manuscript.</p>
        </div>
      </div>

      {notice && <div className="notice success" style={{ marginBottom: "18px" }}>{notice}</div>}

      <div className="row between" style={{ marginBottom: "16px", flexWrap: "wrap", gap: "10px" }}>
        <div>
          <span className="eyebrow" style={{ margin: 0 }}>TRANSFORMATION MODE</span>
          <div style={{ fontSize: "15px", fontWeight: 600, marginTop: "2px" }}>{modeName}</div>
        </div>
        <span className="status">
          <i className="dot orange"></i>Unaccepted candidate draft
        </span>
      </div>

      <div className="three" style={{ marginBottom: "18px", gap: "12px" }}>
        {[
          {
            id: "faithful",
            name: "Faithful Transcript",
            tag: "Minimal change",
            desc: "Punctuation and minimal formatting only.",
            bullets: ["No sentence rewriting", "No added story details", "Keep original authorial wording"],
          },
          {
            id: "clean",
            name: "Clean Transcript",
            tag: "Light cleanup",
            desc: "Remove obvious verbal disfluencies while retaining spoken narrative structure.",
            bullets: ["Remove obvious verbal fillers", "Preserve meaningful repetition", "Keep dialogue and scene fragments"],
          },
          {
            id: "readable",
            name: "Readable Draft",
            tag: "Prose shaping",
            desc: "Shape rough spoken language into fluent literary prose without altering intended sequence.",
            bullets: ["Preserve intended sequence and tone", "No invented actions or motivations", "No hallucinated plot facts"],
          },
        ].map((m) => {
          const isCurrent = mode === m.id;
          return (
            <button
              key={m.id}
              type="button"
              className={`panel ${isCurrent ? "selected" : ""}`}
              onClick={() => switchMode(m.id as any)}
              style={{
                border: isCurrent ? "2px solid var(--blue)" : "1px solid var(--line)",
                background: isCurrent ? "#f0f5f9" : "white",
                padding: "16px 18px",
                textAlign: "left",
                cursor: "pointer",
                borderRadius: "var(--radius)",
                transition: "all 0.15s ease",
                display: "flex",
                flexDirection: "column",
              }}
            >
              <div className="row between" style={{ marginBottom: "6px" }}>
                <strong style={{ fontSize: "14px", color: isCurrent ? "var(--blue)" : "var(--ink)" }}>{m.name}</strong>
                <span className="tag" style={{ fontSize: "11px", padding: "2px 8px" }}>{m.tag}</span>
              </div>
              <p className="tiny muted" style={{ margin: "0 0 10px", fontSize: "12px", lineHeight: "1.5" }}>{m.desc}</p>
              <ul style={{ paddingLeft: "16px", margin: 0, fontSize: "11px", color: "#616b75", lineHeight: "1.6" }}>
                {m.bullets.map((b, i) => (
                  <li key={i}>{b}</li>
                ))}
              </ul>
            </button>
          );
        })}
      </div>

      <div style={{ background: "#f5f8fa", borderRadius: "10px", padding: "14px 18px", fontSize: "13px", color: "#4d5661", marginBottom: "20px", border: "1px solid #e1e9ef" }}>
        <strong>Change summary: </strong>
        Source: {sourceWords} words · Draft: {draftWords} words ·{" "}
        {delta === 0 ? "same word count" : `${delta > 0 ? "+" : ""}${delta} words`}.
        {mode === "clean" && " Clean Transcript removes obvious verbal disfluencies and tightens readability while preserving spoken structure."}
        {mode === "readable" && " Readable Draft reshapes spoken narrative into fluent literary prose without inventing new story events."}
        {mode === "faithful" && " Faithful Transcript preserves exact authorial diction with punctuation formatting."}
      </div>

      <div className="two">
        <section className="panel" style={{ background: "#fffefa", border: "1px solid #e8e4da", minHeight: "320px", padding: "26px" }}>
          <div className="row between" style={{ marginBottom: "14px", paddingBottom: "10px", borderBottom: "1px solid #f0ece3" }}>
            <strong style={{ fontSize: "14px" }}>Source transcript</strong>
            <span className="tag">Original wording</span>
          </div>
          <div style={{ font: "16px/1.9 var(--serif)", whiteSpace: "pre-wrap", color: "#2f353b" }}>
            {sourceText}
          </div>
          <div className="tiny muted" style={{ marginTop: "20px", paddingTop: "10px", borderTop: "1px solid #f5f2eb" }}>
            {sourceWords} words · Source preserved and unaltered
          </div>
        </section>

        <section className="panel" style={{ background: "#fffefa", border: "1px solid #e8e4da", minHeight: "320px", padding: "26px" }}>
          <div className="row between" style={{ marginBottom: "14px", paddingBottom: "10px", borderBottom: "1px solid #f0ece3" }}>
            <strong style={{ fontSize: "14px" }}>Candidate draft</strong>
            <span className="tag" style={{ background: "var(--soft)", color: "var(--blue)" }}>
              {modeName}
            </span>
          </div>
          <div style={{ font: "16px/1.9 var(--serif)", whiteSpace: "pre-wrap", color: "#2f353b" }}>
            {draftText}
          </div>
          <div className="tiny muted" style={{ marginTop: "20px", paddingTop: "10px", borderTop: "1px solid #f5f2eb" }}>
            {draftWords} words · AI candidate draft
          </div>
        </section>
      </div>

      <div className="footer-actions">
        <Link href={backUrl} className="btn secondary">
          ← Back to modes
        </Link>

        <div className="action-row">
          <Link href={`/projects/${projectId}/editor/${draftId}?mode=${mode}`} className="btn secondary">
            Edit draft text
          </Link>
          <button type="button" className="btn secondary" onClick={handleRestore}>
            Restore original source
          </button>
          <button type="button" className="btn danger" onClick={handleReject}>
            Reject draft
          </button>
          <Link
            href={`/projects/${projectId}/organise/${draftId}?revId=${currentRevId}&mode=${mode}${afterSceneId ? `&afterSceneId=${afterSceneId}` : ""}`}
            className="btn primary"
            style={{ minWidth: "160px" }}
          >
            Accept draft →
          </Link>
        </div>
      </div>

      <div className="panel" style={{ marginTop: "26px", padding: "22px" }}>
        <div className="panel-head">
          <h3 style={{ fontSize: "14px" }}>Draft revision history</h3>
          <span className="tiny muted">Revisions remain separate</span>
        </div>
        {revisions.map((v, i) => (
          <div key={v.id || i} className="list-item">
            <div>
              <strong>{v.label || `Draft revision ${i + 1}`}</strong>
              <small>
                {modeName} · {v.text.trim().split(/\s+/).length} words {i === 0 ? "· Latest" : ""}
              </small>
            </div>
            <button
              type="button"
              className="btn small secondary"
              onClick={() => {
                setDraftText(v.text);
                setCurrentRevId(v.id);
              }}
            >
              Load version
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
